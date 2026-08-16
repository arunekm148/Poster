import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";
import crypto from "crypto";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function cleanPhone(
  value: unknown
): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function cleanPhonePrefix(
  value: unknown
): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

function cleanPincode(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const text = String(value)
    .replace(/\D/g, "")
    .slice(0, 6);

  return text || null;
}

function cleanOptionalText(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function parseDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  const date =
    new Date(
      `${text}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/*
|--------------------------------------------------------------------------
| CUSTOMER ID
|--------------------------------------------------------------------------
*/

function generateCustomerId() {
  const timePart =
    Date.now()
      .toString(36)
      .toUpperCase();

  const randomPart =
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

  return `CUST-${timePart}-${randomPart}`;
}

/*
|--------------------------------------------------------------------------
| GET CUSTOMERS
|--------------------------------------------------------------------------
|
| Normal:
|
| /api/customers?userId=USER_ID
|
| Search:
|
| /api/customers?userId=USER_ID&search=arun
|
| Mobile autocomplete:
|
| /api/customers?userId=USER_ID&phonePrefix=9876543
|
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const userId =
      searchParams
        .get("userId")
        ?.trim() || "";

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const phonePrefix =
      cleanPhonePrefix(
        searchParams.get(
          "phonePrefix"
        )
      );

    const sourceType =
      searchParams
        .get("sourceType")
        ?.trim()
        .toUpperCase() || "";

    const subAgentId =
      searchParams
        .get("subAgentId")
        ?.trim() || "";

    const rawPage =
      Number(
        searchParams.get(
          "page"
        ) || 1
      );

    const rawLimit =
      Number(
        searchParams.get(
          "limit"
        ) || 20
      );

    const page =
      Number.isInteger(
        rawPage
      ) &&
      rawPage > 0
        ? rawPage
        : 1;

    const limit =
      Number.isInteger(
        rawLimit
      ) &&
      rawLimit > 0
        ? Math.min(
            rawLimit,
            100
          )
        : 20;

    const skip =
      (page - 1) *
      limit;

    /*
    |--------------------------------------------------------------------------
    | USER REQUIRED
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK AGENT
    |--------------------------------------------------------------------------
    */

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | MOBILE AUTOCOMPLETE LOOKUP
    |--------------------------------------------------------------------------
    |
    | Start only from 7 digits.
    |
    | Maximum 10 results.
    |
    | This prevents large database responses.
    |
    |--------------------------------------------------------------------------
    */

    if (phonePrefix) {
      if (
        phonePrefix.length < 7
      ) {
        return NextResponse.json(
          {
            success: true,
            customers: [],
            exactMatch: false,
            count: 0,
          },
          {
            status: 200,
          }
        );
      }

      const customers =
        await prisma.customer.findMany({
          where: {
            userId,

            phone: {
              startsWith:
                phonePrefix,
            },
          },

          select: {
            id: true,
            customerId: true,

            name: true,
            phone: true,
            email: true,

            dateOfBirth: true,
            gender: true,

            isActive: true,

            sourceType: true,
            subAgentId: true,

            subAgent: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            createdAt: true,
          },

          orderBy: [
            {
              isActive:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          take: 10,
        });

      const exactMatch =
        phonePrefix.length ===
          10 &&
        customers.some(
          (customer) =>
            customer.phone ===
            phonePrefix
        );

      return NextResponse.json(
        {
          success: true,

          customers,

          exactMatch,

          count:
            customers.length,
        },
        {
          status: 200,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SOURCE TYPE
    |--------------------------------------------------------------------------
    */

    const validSourceType =
      sourceType === "SELF" ||
      sourceType ===
        "SUB_AGENT"
        ? sourceType
        : "";

    /*
    |--------------------------------------------------------------------------
    | NORMAL CUSTOMER FILTER
    |--------------------------------------------------------------------------
    */

    const where = {
      userId,

      ...(validSourceType
        ? {
            sourceType:
              validSourceType as
                | "SELF"
                | "SUB_AGENT",
          }
        : {}),

      ...(subAgentId
        ? {
            subAgentId,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                customerId: {
                  contains:
                    search,

                  mode:
                    "insensitive" as const,
                },
              },

              {
                name: {
                  contains:
                    search,

                  mode:
                    "insensitive" as const,
                },
              },

              {
                phone: {
                  contains:
                    search,
                },
              },

              {
                email: {
                  contains:
                    search,

                  mode:
                    "insensitive" as const,
                },
              },

              {
                subAgent: {
                  is: {
                    name: {
                      contains:
                        search,

                      mode:
                        "insensitive" as const,
                    },
                  },
                },
              },

              {
                subAgent: {
                  is: {
                    code: {
                      contains:
                        search,

                      mode:
                        "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    /*
    |--------------------------------------------------------------------------
    | LOAD CUSTOMERS
    |--------------------------------------------------------------------------
    */

    const [
      customers,
      total,
    ] =
      await prisma.$transaction([
        prisma.customer.findMany({
          where,

          select: {
            id: true,
            customerId: true,
            userId: true,

            name: true,
            phone: true,
            email: true,

            dateOfBirth: true,
            gender: true,

            address: true,
            district: true,
            state: true,
            pincode: true,

            notes: true,

            sourceType: true,
            subAgentId: true,

            subAgent: {
              select: {
                id: true,
                code: true,
                name: true,
                phone: true,
                whatsapp: true,
                email: true,
                isActive: true,
              },
            },

            isActive: true,

            inactiveReason: true,
            inactiveAt: true,

            createdAt: true,
            updatedAt: true,
          },

          orderBy: [
            {
              isActive:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          skip,
          take:
            limit,
        }),

        prisma.customer.count({
          where,
        }),
      ]);

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total / limit
          );

    return NextResponse.json(
      {
        success: true,

        customers,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasNextPage:
            page <
            totalPages,

          hasPreviousPage:
            page > 1,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET CUSTOMERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load customers.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| CREATE CUSTOMER
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    /*
    |--------------------------------------------------------------------------
    | CLEAN VALUES
    |--------------------------------------------------------------------------
    */

    const userId =
      String(
        body.userId || ""
      ).trim();

    const name =
      String(
        body.name || ""
      ).trim();

    const phone =
      cleanPhone(
        body.phone
      );

    const email =
      body.email
        ? String(
            body.email
          )
            .trim()
            .toLowerCase()
        : null;

    const gender =
      cleanOptionalText(
        body.gender
      );

    const address =
      cleanOptionalText(
        body.address
      );

    const district =
      cleanOptionalText(
        body.district
      );

    const state =
      cleanOptionalText(
        body.state
      );

    const pincode =
      cleanPincode(
        body.pincode
      );

    const notes =
      cleanOptionalText(
        body.notes
      );

    const rawSourceType =
      String(
        body.sourceType ||
          "SELF"
      )
        .trim()
        .toUpperCase();

    const requestedSubAgentId =
      String(
        body.subAgentId || ""
      ).trim();

    const confirmSharedPhone =
      body.confirmSharedPhone ===
      true;

    /*
    |--------------------------------------------------------------------------
    | USER
    |--------------------------------------------------------------------------
    */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | NAME
    |--------------------------------------------------------------------------
    */

    if (
      !name ||
      name.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid customer name.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PHONE
    |--------------------------------------------------------------------------
    */

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | EMAIL
    |--------------------------------------------------------------------------
    */

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PINCODE
    |--------------------------------------------------------------------------
    */

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SOURCE TYPE
    |--------------------------------------------------------------------------
    */

    if (
      rawSourceType !==
        "SELF" &&
      rawSourceType !==
        "SUB_AGENT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid customer source.",
        },
        {
          status: 400,
        }
      );
    }

    const sourceType =
      rawSourceType as
        | "SELF"
        | "SUB_AGENT";

    let validSubAgentId:
      | string
      | null = null;

    /*
    |--------------------------------------------------------------------------
    | SUB AGENT CHECK
    |--------------------------------------------------------------------------
    */

    if (
      sourceType ===
      "SUB_AGENT"
    ) {
      if (
        !requestedSubAgentId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a Sub-Agent.",
          },
          {
            status: 400,
          }
        );
      }

      const subAgent =
        await prisma.subAgent.findFirst({
          where: {
            id:
              requestedSubAgentId,

            userId,

            isActive:
              true,
          },

          select: {
            id: true,
          },
        });

      if (!subAgent) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected Sub-Agent was not found or is inactive.",
          },
          {
            status: 404,
          }
        );
      }

      validSubAgentId =
        subAgent.id;
    }

    /*
    |--------------------------------------------------------------------------
    | DOB
    |--------------------------------------------------------------------------
    */

    let parsedDateOfBirth:
      | Date
      | null = null;

    if (
      body.dateOfBirth
    ) {
      parsedDateOfBirth =
        parseDate(
          body.dateOfBirth
        );

      if (
        !parsedDateOfBirth
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter a valid date of birth.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        parsedDateOfBirth >
        new Date()
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Date of birth cannot be in the future.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | EXACT DUPLICATE
    |--------------------------------------------------------------------------
    |
    | Same:
    |
    | Agent
    | Mobile
    | Name
    | DOB
    |
    | is blocked.
    |
    |--------------------------------------------------------------------------
    */

    const exactDuplicate =
      await prisma.customer.findFirst({
        where: {
          userId,
          phone,

          isActive:
            true,

          name: {
            equals:
              name,

            mode:
              "insensitive",
          },

          ...(parsedDateOfBirth
            ? {
                dateOfBirth:
                  parsedDateOfBirth,
              }
            : {
                dateOfBirth:
                  null,
              }),
        },

        select: {
          id: true,
          customerId: true,
          name: true,
          phone: true,
          dateOfBirth: true,
        },
      });

    if (
      exactDuplicate
    ) {
      return NextResponse.json(
        {
          success: false,

          duplicate:
            true,

          message:
            "This customer already appears to exist with the same name and mobile number.",

          customer:
            exactDuplicate,
        },
        {
          status: 409,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | EXACT MOBILE ALREADY USED
    |--------------------------------------------------------------------------
    */

    const linkedCustomers =
      await prisma.customer.findMany({
        where: {
          userId,
          phone,
        },

        select: {
          id: true,
          customerId: true,

          name: true,
          phone: true,
          email: true,

          dateOfBirth: true,
          gender: true,

          isActive: true,

          sourceType: true,

          subAgent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },

          createdAt: true,
        },

        orderBy: [
          {
            isActive:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],

        take: 10,
      });

    /*
    |--------------------------------------------------------------------------
    | REQUIRE CONFIRMATION
    |--------------------------------------------------------------------------
    */

    if (
      linkedCustomers.length >
        0 &&
      !confirmSharedPhone
    ) {
      return NextResponse.json(
        {
          success: false,

          requiresConfirmation:
            true,

          sharedPhone:
            true,

          message:
            `This mobile number is already linked to ${linkedCustomers.length} customer${
              linkedCustomers.length ===
              1
                ? ""
                : "s"
            }. Please review before continuing.`,

          linkedCustomers,
        },
        {
          status: 409,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    const customerId =
      generateCustomerId();

    const customer =
      await prisma.customer.create({
        data: {
          customerId,
          userId,

          name,
          phone,
          email,

          dateOfBirth:
            parsedDateOfBirth,

          gender,

          address,
          district,
          state,
          pincode,

          notes,

          sourceType,

          subAgentId:
            validSubAgentId,

          isActive:
            true,
        },

        select: {
          id: true,
          customerId: true,
          userId: true,

          name: true,
          phone: true,
          email: true,

          dateOfBirth: true,
          gender: true,

          address: true,
          district: true,
          state: true,
          pincode: true,

          notes: true,

          sourceType: true,
          subAgentId: true,

          subAgent: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
              whatsapp: true,
              email: true,
            },
          },

          isActive: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        sharedPhoneUsed:
          linkedCustomers.length >
          0,

        message:
          linkedCustomers.length >
          0
            ? "Customer added successfully using the shared family mobile number."
            : sourceType ===
                "SUB_AGENT"
              ? "Customer added successfully under Sub-Agent."
              : "Customer added successfully.",

        customer,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE CUSTOMER ERROR:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to create customer.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}