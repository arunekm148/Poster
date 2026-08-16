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

/* -------------------------------------------------------------------------- */
/* GET FOLLOW-UPS                                                             */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } =
      new URL(
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

    const enquiryId =
      searchParams
        .get("enquiryId")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim()
        .toUpperCase() || "";

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

    const allowedStatuses = [
      "PENDING",
      "COMPLETED",
      "CANCELLED",
    ] as const;

    const statusFilter =
      allowedStatuses.includes(
        status as
          (typeof allowedStatuses)[number]
      )
        ? (
            status as
              (typeof allowedStatuses)[number]
          )
        : undefined;

    const followUps =
      await prisma.followUp.findMany({
        where: {
          userId,

          ...(customerId
            ? {
                customerId,
              }
            : {}),

          ...(enquiryId
            ? {
                enquiryId,
              }
            : {}),

          ...(statusFilter
            ? {
                status:
                  statusFilter,
              }
            : {}),
        },

        select: {
          id: true,
          userId: true,
          customerId: true,
          enquiryId: true,

          comment: true,

          followUpDate: true,
          nextFollowUpDate: true,

          status: true,
          outcome: true,

          lostReason: true,
          cancellationReason: true,

          completedAt: true,
          createdAt: true,
          updatedAt: true,

          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              phone: true,
              email: true,
            },
          },

          enquiry: {
            select: {
              id: true,
              businessType: true,
              requirement: true,
              remarks: true,
              status: true,
              enquiryDate: true,
              nextFollowUpDate: true,
            },
          },
        },

        orderBy: [
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
      "GET FOLLOW UPS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load follow-ups.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE FOLLOW-UP                                                           */
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

    const enquiryId =
      String(
        body.enquiryId || ""
      ).trim();

    const comment =
      String(
        body.comment || ""
      ).trim();

    /* REQUIRED */

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

    if (!enquiryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enquiry is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Follow-up remarks are required.",
        },
        {
          status: 400,
        }
      );
    }

    /* FOLLOW-UP DATE */

    const followUpDate =
      parseDate(
        body.followUpDate
      );

    if (!followUpDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a valid follow-up date.",
        },
        {
          status: 400,
        }
      );
    }

    /* NEXT FOLLOW-UP */

    let nextFollowUpDate:
      | Date
      | null = null;

    if (
      body.nextFollowUpDate
    ) {
      nextFollowUpDate =
        parseDate(
          body.nextFollowUpDate
        );

      if (!nextFollowUpDate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid next follow-up date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* USER */

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

    /* CUSTOMER */

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

    /* ENQUIRY */

    const enquiry =
      await prisma.enquiry.findFirst({
        where: {
          id: enquiryId,
          userId,
          customerId,
          isActive: true,
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (!enquiry) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enquiry not found for this customer.",
        },
        {
          status: 404,
        }
      );
    }

    /* CREATE */

    const followUp =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.followUp.create({
              data: {
                userId,
                customerId,
                enquiryId,

                comment,

                followUpDate,
                nextFollowUpDate,

                status:
                  "PENDING",

                outcome:
                  "CONTINUE",

                lostReason:
                  null,

                cancellationReason:
                  null,

                completedAt:
                  null,
              },
            });

          await tx.enquiry.update({
            where: {
              id: enquiryId,
            },

            data: {
              status:
                "FOLLOW_UP",

              nextFollowUpDate,
            },
          });

          return created;
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          nextFollowUpDate
            ? "Follow-up saved and next follow-up scheduled."
            : "Follow-up saved successfully.",

        followUp,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE FOLLOW UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to save follow-up.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE FOLLOW-UP RESULT                                                    */
/* -------------------------------------------------------------------------- */
/*
IMPORTANT:

READY_FOR_POLICY is a UI/business workflow value.

We DO NOT save READY_FOR_POLICY into Prisma FollowUpOutcome.

Instead:

READY_FOR_POLICY
    ↓
FollowUp outcome = CONTINUE
FollowUp status  = COMPLETED
Enquiry status   = FOLLOW_UP
Next follow-up   = NULL

Then UI shows:

+ Create Policy

This means NO Prisma migration is required.
*/

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

    const comment =
      String(
        body.comment || ""
      ).trim();

    const requestedOutcome =
      String(
        body.outcome ||
          "CONTINUE"
      )
        .trim()
        .toUpperCase();

    const lostReason =
      String(
        body.lostReason || ""
      ).trim();

    const cancellationReason =
      String(
        body.cancellationReason ||
          ""
      ).trim();

    /* REQUIRED */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Follow-up ID is required.",
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

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Follow-up remarks are required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* READY FOR POLICY                                                       */
    /* ---------------------------------------------------------------------- */

    const readyForPolicy =
      requestedOutcome ===
      "READY_FOR_POLICY";

    const allowedOutcomes = [
      "CONTINUE",
      "READY_FOR_POLICY",
      "BUSINESS_CLOSED",
      "CASE_LOST",
      "CANCELLED",
    ];

    if (
      !allowedOutcomes.includes(
        requestedOutcome
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid follow-up result.",
        },
        {
          status: 400,
        }
      );
    }

    /* REASONS */

    if (
      requestedOutcome ===
        "CASE_LOST" &&
      !lostReason
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter the lost reason.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      requestedOutcome ===
        "CANCELLED" &&
      !cancellationReason
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter the cancellation reason.",
        },
        {
          status: 400,
        }
      );
    }

    /* FOLLOW-UP DATE */

    let followUpDate:
      | Date
      | null = null;

    if (
      body.followUpDate
    ) {
      followUpDate =
        parseDate(
          body.followUpDate
        );

      if (!followUpDate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid follow-up date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* NEXT FOLLOW-UP */

    let nextFollowUpDate:
      | Date
      | null = null;

    if (
      body.nextFollowUpDate
    ) {
      nextFollowUpDate =
        parseDate(
          body.nextFollowUpDate
        );

      if (!nextFollowUpDate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid next follow-up date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      requestedOutcome ===
        "CONTINUE" &&
      !nextFollowUpDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select the next follow-up date.",
        },
        {
          status: 400,
        }
      );
    }

    /* USER */

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

    /* FOLLOW-UP */

    const existing =
      await prisma.followUp.findFirst({
        where: {
          id,
          userId,
        },

        select: {
          id: true,
          customerId: true,
          enquiryId: true,
          followUpDate: true,
          status: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Follow-up not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* TRANSACTION                                                            */
    /* ---------------------------------------------------------------------- */

    const updated =
      await prisma.$transaction(
        async (tx) => {
          /* ================================================================= */
          /* CONTINUE                                                         */
          /* ================================================================= */

          if (
            requestedOutcome ===
            "CONTINUE"
          ) {
            const followUp =
              await tx.followUp.update({
                where: {
                  id,
                },

                data: {
                  comment,

                  followUpDate:
                    followUpDate ??
                    existing.followUpDate,

                  nextFollowUpDate,

                  status:
                    "PENDING",

                  outcome:
                    "CONTINUE",

                  lostReason:
                    null,

                  cancellationReason:
                    null,

                  completedAt:
                    null,
                },
              });

            if (
              existing.enquiryId
            ) {
              await tx.enquiry.update({
                where: {
                  id:
                    existing.enquiryId,
                },

                data: {
                  status:
                    "FOLLOW_UP",

                  nextFollowUpDate,

                  convertedAt:
                    null,

                  closedAt:
                    null,
                },
              });
            }

            return followUp;
          }

          /* ================================================================= */
          /* READY FOR POLICY                                                  */
          /* ================================================================= */

          if (
            requestedOutcome ===
            "READY_FOR_POLICY"
          ) {
            const now =
              new Date();

            const followUp =
              await tx.followUp.update({
                where: {
                  id,
                },

                data: {
                  comment,

                  followUpDate:
                    followUpDate ??
                    existing.followUpDate,

                  nextFollowUpDate:
                    null,

                  /*
                   * We use existing Prisma values.
                   * No schema migration needed.
                   */

                  status:
                    "COMPLETED",

                  outcome:
                    "CONTINUE",

                  lostReason:
                    null,

                  cancellationReason:
                    null,

                  completedAt:
                    now,
                },
              });

            if (
              existing.enquiryId
            ) {
              await tx.enquiry.update({
                where: {
                  id:
                    existing.enquiryId,
                },

                data: {
                  /*
                   * IMPORTANT:
                   * Do NOT convert yet.
                   */

                  status:
                    "FOLLOW_UP",

                  nextFollowUpDate:
                    null,

                  convertedAt:
                    null,

                  closedAt:
                    null,
                },
              });
            }

            return followUp;
          }

          /* ================================================================= */
          /* POLICY ISSUED / CONVERTED                                         */
          /* ================================================================= */

          if (
            requestedOutcome ===
            "BUSINESS_CLOSED"
          ) {
            const now =
              new Date();

            const followUp =
              await tx.followUp.update({
                where: {
                  id,
                },

                data: {
                  comment,

                  followUpDate:
                    followUpDate ??
                    existing.followUpDate,

                  nextFollowUpDate:
                    null,

                  status:
                    "COMPLETED",

                  outcome:
                    "BUSINESS_CLOSED",

                  lostReason:
                    null,

                  cancellationReason:
                    null,

                  completedAt:
                    now,
                },
              });

            if (
              existing.enquiryId
            ) {
              await tx.enquiry.update({
                where: {
                  id:
                    existing.enquiryId,
                },

                data: {
                  status:
                    "CONVERTED",

                  nextFollowUpDate:
                    null,

                  convertedAt:
                    now,

                  closedAt:
                    now,
                },
              });
            }

            return followUp;
          }

          /* ================================================================= */
          /* CASE LOST                                                        */
          /* ================================================================= */

          if (
            requestedOutcome ===
            "CASE_LOST"
          ) {
            const now =
              new Date();

            const followUp =
              await tx.followUp.update({
                where: {
                  id,
                },

                data: {
                  comment,

                  followUpDate:
                    followUpDate ??
                    existing.followUpDate,

                  nextFollowUpDate:
                    null,

                  status:
                    "COMPLETED",

                  outcome:
                    "CASE_LOST",

                  lostReason,

                  cancellationReason:
                    null,

                  completedAt:
                    now,
                },
              });

            if (
              existing.enquiryId
            ) {
              await tx.enquiry.update({
                where: {
                  id:
                    existing.enquiryId,
                },

                data: {
                  status:
                    "LOST",

                  nextFollowUpDate:
                    null,

                  convertedAt:
                    null,

                  closedAt:
                    now,
                },
              });
            }

            return followUp;
          }

          /* ================================================================= */
          /* CANCELLED                                                        */
          /* ================================================================= */

          const now =
            new Date();

          const followUp =
            await tx.followUp.update({
              where: {
                id,
              },

              data: {
                comment,

                followUpDate:
                  followUpDate ??
                  existing.followUpDate,

                nextFollowUpDate:
                  null,

                status:
                  "CANCELLED",

                outcome:
                  "CANCELLED",

                lostReason:
                  null,

                cancellationReason,

                completedAt:
                  now,
              },
            });

          if (
            existing.enquiryId
          ) {
            await tx.enquiry.update({
              where: {
                id:
                  existing.enquiryId,
              },

              data: {
                status:
                  "CLOSED",

                nextFollowUpDate:
                  null,

                convertedAt:
                  null,

                closedAt:
                  now,
              },
            });
          }

          return followUp;
        }
      );

    /* ---------------------------------------------------------------------- */
    /* MESSAGE                                                                */
    /* ---------------------------------------------------------------------- */

    let message =
      "Follow-up updated successfully.";

    if (
      requestedOutcome ===
      "CONTINUE"
    ) {
      message =
        "Next follow-up scheduled successfully.";
    }

    if (
      requestedOutcome ===
      "READY_FOR_POLICY"
    ) {
      message =
        "Customer marked Ready for Policy. You can now create the policy.";
    }

    if (
      requestedOutcome ===
      "BUSINESS_CLOSED"
    ) {
      message =
        "Policy/business marked converted successfully.";
    }

    if (
      requestedOutcome ===
      "CASE_LOST"
    ) {
      message =
        "Case marked as lost successfully.";
    }

    if (
      requestedOutcome ===
      "CANCELLED"
    ) {
      message =
        "Enquiry cancelled successfully.";
    }

    return NextResponse.json(
      {
        success: true,

        message,

        followUp:
          updated,

        readyForPolicy,

        customerId:
          existing.customerId,

        enquiryId:
          existing.enquiryId,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE FOLLOW UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update follow-up.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE FOLLOW-UP                                                           */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const id =
      searchParams
        .get("id")
        ?.trim() || "";

    const userId =
      searchParams
        .get("userId")
        ?.trim() || "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Follow-up ID is required.",
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

    /* USER */

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

    /* FOLLOW-UP */

    const existing =
      await prisma.followUp.findFirst({
        where: {
          id,
          userId,
        },

        select: {
          id: true,
          enquiryId: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Follow-up not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* DELETE */

    await prisma.$transaction(
      async (tx) => {
        await tx.followUp.delete({
          where: {
            id,
          },
        });

        if (
          existing.enquiryId
        ) {
          const latest =
            await tx.followUp.findFirst({
              where: {
                enquiryId:
                  existing.enquiryId,

                userId,

                status:
                  "PENDING",
              },

              orderBy: [
                {
                  followUpDate:
                    "desc",
                },
                {
                  createdAt:
                    "desc",
                },
              ],

              select: {
                nextFollowUpDate:
                  true,
              },
            });

          await tx.enquiry.update({
            where: {
              id:
                existing.enquiryId,
            },

            data: {
              nextFollowUpDate:
                latest
                  ?.nextFollowUpDate ??
                null,
            },
          });
        }
      }
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Follow-up deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE FOLLOW UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete follow-up.",
      },
      {
        status: 500,
      }
    );
  }
}