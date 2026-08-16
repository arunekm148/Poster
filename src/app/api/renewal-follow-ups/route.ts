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

function optionalText(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function optionalNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }

  return number;
}

/* -------------------------------------------------------------------------- */
/* GET RENEWAL FOLLOW-UPS                                                     */
/* -------------------------------------------------------------------------- */

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

    const customerId =
      searchParams
        .get("customerId")
        ?.trim() || "";

    const policyId =
      searchParams
        .get("policyId")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim()
        .toUpperCase() || "";

    /* ---------------------------------------------------------------------- */
    /* USER REQUIRED                                                          */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* CHECK USER                                                             */
    /* ---------------------------------------------------------------------- */

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
    /* ALLOWED STATUS                                                         */
    /* ---------------------------------------------------------------------- */

    const allowedStatuses = [
      "NOT_CONTACTED",
      "CONTACTED",
      "FOLLOW_UP",
      "INTERESTED",
      "PAYMENT_PENDING",
      "RENEWED",
      "CLOSED",
    ] as const;

    /* ---------------------------------------------------------------------- */
    /* LOAD FOLLOW-UPS                                                        */
    /* ---------------------------------------------------------------------- */

    const followUps =
      await prisma.renewalFollowUp.findMany({
        where: {
          userId,

          ...(customerId
            ? {
                customerId,
              }
            : {}),

          ...(policyId
            ? {
                policyId,
              }
            : {}),

          ...(allowedStatuses.includes(
            status as
              (typeof allowedStatuses)[number]
          )
            ? {
                status:
                  status as
                    (typeof allowedStatuses)[number],
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
              sourceType: true,
              subAgentId: true,

              subAgent: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },

          policy: {
            select: {
              id: true,
              policyNumber: true,
              companyName: true,
              productName: true,
              policyType: true,
              premium: true,
              customerPremium: true,
              expiryDate: true,
              startDate: true,
              isActive: true,
            },
          },
        },

        orderBy: [
          {
            nextFollowUpDate:
              "asc",
          },
          {
            followUpDate:
              "desc",
          },
          {
            createdAt:
              "desc",
          },
        ],
      });

    return NextResponse.json(
      {
        success: true,
        followUps,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET RENEWAL FOLLOW-UPS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load renewal follow-ups.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE RENEWAL FOLLOW-UP                                                   */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      String(
        body.userId || ""
      ).trim();

    const customerId =
      String(
        body.customerId || ""
      ).trim();

    const policyId =
      String(
        body.policyId || ""
      ).trim();

    const rawStatus =
      String(
        body.status ||
          "FOLLOW_UP"
      )
        .trim()
        .toUpperCase();

    const followUpDate =
      parseDate(
        body.followUpDate
      );

    const nextFollowUpDate =
      parseDate(
        body.nextFollowUpDate
      );

    const remarks =
      optionalText(
        body.remarks
      );

    const quotedPremium =
      optionalNumber(
        body.quotedPremium
      );

    /* ---------------------------------------------------------------------- */
    /* REQUIRED                                                               */
    /* ---------------------------------------------------------------------- */

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

    if (!policyId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Policy is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!followUpDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid follow-up date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!remarks) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent follow-up remark is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      quotedPremium !== null &&
      quotedPremium < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quoted premium cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS                                                                 */
    /* ---------------------------------------------------------------------- */

    const allowedStatuses = [
      "NOT_CONTACTED",
      "CONTACTED",
      "FOLLOW_UP",
      "INTERESTED",
      "PAYMENT_PENDING",
      "RENEWED",
      "CLOSED",
    ] as const;

    if (
      !allowedStatuses.includes(
        rawStatus as
          (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid renewal follow-up status.",
        },
        {
          status: 400,
        }
      );
    }

    const status =
      rawStatus as
        (typeof allowedStatuses)[number];

    /* ---------------------------------------------------------------------- */
    /* CHECK USER                                                             */
    /* ---------------------------------------------------------------------- */

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
    /* CHECK CUSTOMER                                                         */
    /* ---------------------------------------------------------------------- */

    const customer =
      await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId,
        },

        select: {
          id: true,
          name: true,
          isActive: true,
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

    /* ---------------------------------------------------------------------- */
    /* CHECK POLICY                                                           */
    /* ---------------------------------------------------------------------- */

    const policy =
      await prisma.policy.findFirst({
        where: {
          id: policyId,
          userId,
          customerId,
        },

        select: {
          id: true,
          policyNumber: true,
          expiryDate: true,
          isActive: true,
        },
      });

    if (!policy) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Policy not found for this customer.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const followUp =
      await prisma.renewalFollowUp.create({
        data: {
          userId,
          customerId,
          policyId,

          status,

          followUpDate,

          nextFollowUpDate,

          remarks,

          quotedPremium,
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

          policy: {
            select: {
              id: true,
              policyNumber: true,
              companyName: true,
              productName: true,
              policyType: true,
              premium: true,
              customerPremium: true,
              expiryDate: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Renewal follow-up saved successfully.",
        followUp,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE RENEWAL FOLLOW-UP ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create renewal follow-up.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE RENEWAL FOLLOW-UP                                                   */
/* -------------------------------------------------------------------------- */

export async function PUT(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      String(
        body.id || ""
      ).trim();

    const userId =
      String(
        body.userId || ""
      ).trim();

    const rawStatus =
      String(
        body.status || ""
      )
        .trim()
        .toUpperCase();

    const rawOutcome =
      String(
        body.outcome || ""
      )
        .trim()
        .toUpperCase();

    const remarks =
      optionalText(
        body.remarks
      );

    const followUpDate =
      parseDate(
        body.followUpDate
      );

    const nextFollowUpDate =
      parseDate(
        body.nextFollowUpDate
      );

    const quotedPremium =
      optionalNumber(
        body.quotedPremium
      );

    /* ---------------------------------------------------------------------- */
    /* REQUIRED                                                               */
    /* ---------------------------------------------------------------------- */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Renewal follow-up ID is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    /* ---------------------------------------------------------------------- */
    /* VALIDATE STATUS                                                        */
    /* ---------------------------------------------------------------------- */

    const allowedStatuses = [
      "NOT_CONTACTED",
      "CONTACTED",
      "FOLLOW_UP",
      "INTERESTED",
      "PAYMENT_PENDING",
      "RENEWED",
      "CLOSED",
    ] as const;

    if (
      rawStatus &&
      !allowedStatuses.includes(
        rawStatus as
          (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid renewal follow-up status.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE OUTCOME                                                       */
    /* ---------------------------------------------------------------------- */

    const allowedOutcomes = [
      "RENEWED",
      "NOT_INTERESTED",
      "RENEWED_ELSEWHERE",
      "UNABLE_TO_CONTACT",
      "LAPSED",
    ] as const;

    if (
      rawOutcome &&
      !allowedOutcomes.includes(
        rawOutcome as
          (typeof allowedOutcomes)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid renewal outcome.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      quotedPremium !== null &&
      quotedPremium < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Quoted premium cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK EXISTING                                                         */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.renewalFollowUp.findFirst({
        where: {
          id,
          userId,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Renewal follow-up not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DETERMINE COMPLETION                                                   */
    /* ---------------------------------------------------------------------- */

    const finalOutcome =
      rawOutcome
        ? rawOutcome as
            (typeof allowedOutcomes)[number]
        : undefined;

    const finalStatus =
      rawStatus
        ? rawStatus as
            (typeof allowedStatuses)[number]
        : undefined;

    const shouldComplete =
      finalStatus ===
        "RENEWED" ||
      finalStatus ===
        "CLOSED" ||
      Boolean(
        finalOutcome
      );

    /* ---------------------------------------------------------------------- */
    /* UPDATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const followUp =
      await prisma.renewalFollowUp.update({
        where: {
          id,
        },

        data: {
          ...(finalStatus
            ? {
                status:
                  finalStatus,
              }
            : {}),

          ...(finalOutcome
            ? {
                outcome:
                  finalOutcome,
              }
            : {}),

          ...(remarks !== null
            ? {
                remarks,
              }
            : {}),

          ...(followUpDate
            ? {
                followUpDate,
              }
            : {}),

          ...(body.nextFollowUpDate !==
          undefined
            ? {
                nextFollowUpDate,
              }
            : {}),

          ...(quotedPremium !== null
            ? {
                quotedPremium,
              }
            : {}),

          ...(shouldComplete
            ? {
                completedAt:
                  new Date(),
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

          policy: {
            select: {
              id: true,
              policyNumber: true,
              companyName: true,
              productName: true,
              policyType: true,
              expiryDate: true,
              premium: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Renewal follow-up updated successfully.",
        followUp,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE RENEWAL FOLLOW-UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update renewal follow-up.",
      },
      {
        status: 500,
      }
    );
  }
}