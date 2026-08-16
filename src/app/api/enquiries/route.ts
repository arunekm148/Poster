import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const date = new Date(
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

/* -------------------------------------------------------------------------- */
/* GET ENQUIRIES / SINGLE ENQUIRY                                             */
/* -------------------------------------------------------------------------- */
/*
GET examples:

All enquiries:
/api/enquiries?userId=USER_ID

Customer enquiries:
/api/enquiries?userId=USER_ID&customerId=CUSTOMER_ID

Single enquiry:
/api/enquiries?userId=USER_ID&id=ENQUIRY_ID
*/

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams
        .get("userId")
        ?.trim() || "";

    const customerId =
      searchParams
        .get("customerId")
        ?.trim() || "";

    const enquiryId =
      searchParams
        .get("id")
        ?.trim() || "";

    /* VALIDATE USER ID */

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

    /* CHECK USER */

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

    /* ---------------------------------------------------------------------- */
    /* LOAD SINGLE ENQUIRY                                                    */
    /* ---------------------------------------------------------------------- */

    if (enquiryId) {
      const enquiry =
        await prisma.enquiry.findFirst({
          where: {
            id: enquiryId,
            userId,
            isActive: true,
          },

          include: {
            customer: {
              select: {
                id: true,
                customerId: true,
                name: true,
                phone: true,
                email: true,
              },
            },

            followUps: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        });

      if (!enquiry) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Enquiry not found.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          enquiry,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* LOAD ENQUIRY LIST                                                      */
    /* ---------------------------------------------------------------------- */

    const enquiries =
      await prisma.enquiry.findMany({
        where: {
          userId,
          isActive: true,

          ...(customerId
            ? {
                customerId,
              }
            : {}),
        },

        include: {
          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              phone: true,
              email: true,
            },
          },

          followUps: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json(
      {
        success: true,
        enquiries,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ENQUIRIES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load enquiries.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE ENQUIRY                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    /* BASIC VALUES */

    const userId =
      String(
        body.userId || ""
      ).trim();

    const customerId =
      String(
        body.customerId || ""
      ).trim();

    const businessType =
      String(
        body.businessType || ""
      )
        .trim()
        .toUpperCase();

    const requirement =
      body.requirement
        ? String(
            body.requirement
          ).trim()
        : null;

    const remarks =
      body.remarks
        ? String(
            body.remarks
          ).trim()
        : null;

    /* VALIDATE USER */

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

    /* VALIDATE CUSTOMER */

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* VALIDATE BUSINESS TYPE */

    const allowedBusinessTypes = [
      "HEALTH",
      "MOTOR",
      "LIFE",
      "OTHER",
    ] as const;

    if (
      !allowedBusinessTypes.includes(
        businessType as
          (typeof allowedBusinessTypes)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select Health, Motor, Life or Other.",
        },
        {
          status: 400,
        }
      );
    }

    const validBusinessType =
      businessType as
        (typeof allowedBusinessTypes)[number];

    /* CHECK USER */

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

    /* CHECK CUSTOMER OWNERSHIP */

    const customer =
      await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId,
          isActive: true,
        },

        select: {
          id: true,
          customerId: true,
          name: true,
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found for this agent.",
        },
        {
          status: 404,
        }
      );
    }

    /* NEXT FOLLOW-UP DATE */

    let nextFollowUpDate:
      | Date
      | null = null;

    if (body.nextFollowUpDate) {
      nextFollowUpDate =
        parseDate(
          body.nextFollowUpDate
        );

      if (!nextFollowUpDate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter a valid next follow-up date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ENQUIRY DATE */

    let enquiryDate =
      new Date();

    if (body.enquiryDate) {
      const parsedEnquiryDate =
        parseDate(
          body.enquiryDate
        );

      if (!parsedEnquiryDate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter a valid enquiry date.",
          },
          {
            status: 400,
          }
        );
      }

      enquiryDate =
        parsedEnquiryDate;
    }

    /* CREATE ENQUIRY */

    const enquiry =
      await prisma.enquiry.create({
        data: {
          userId,
          customerId,

          businessType:
            validBusinessType,

          requirement,
          remarks,

          status: "NEW",

          enquiryDate,

          nextFollowUpDate,

          isActive: true,
        },

        include: {
          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              phone: true,
              email: true,
            },
          },

          followUps: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Enquiry saved successfully.",
        enquiry,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE ENQUIRY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to save enquiry.",
      },
      {
        status: 500,
      }
    );
  }
}