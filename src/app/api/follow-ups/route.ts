import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

import {
  getSessionFromRequest,
  isStaffSession,
} from "@/lib/session";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type ActorInfo = {
  type: "AGENT" | "STAFF";
  name: string;
  staffId: string | null;
};

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
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

  const normalized =
    /^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
      ? `${text}T00:00:00`
      : text;

  const date =
    new Date(
      normalized
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
/* ACTOR                                                                      */
/* -------------------------------------------------------------------------- */

async function getActor(
  request: NextRequest,
  userId: string
): Promise<ActorInfo> {
  try {
    const session =
      getSessionFromRequest(
        request
      );

    if (
      session &&
      isStaffSession(
        session
      ) &&
      session.userId ===
        userId &&
      session.staffId
    ) {
      const staff =
        await prisma.staff.findFirst({
          where: {
            id:
              session.staffId,

            userId,

            isActive:
              true,
          },

          select: {
            id: true,
            name: true,
          },
        });

      if (staff) {
        return {
          type:
            "STAFF",

          name:
            staff.name,

          staffId:
            staff.id,
        };
      }
    }
  } catch (error) {
    console.error(
      "FOLLOW-UP SESSION ACTOR ERROR:",
      error
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id:
          userId,
      },

      select: {
        id: true,
        name: true,
      },
    });

  return {
    type:
      "AGENT",

    name:
      user?.name ||
      "Agent",

    staffId:
      null,
  };
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
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
        .get(
          "userId"
        )
        ?.trim() ||
      "";

    const customerId =
      searchParams
        .get(
          "customerId"
        )
        ?.trim() ||
      "";

    const enquiryId =
      searchParams
        .get(
          "enquiryId"
        )
        ?.trim() ||
      "";

    const status =
      searchParams
        .get(
          "status"
        )
        ?.trim()
        .toUpperCase() ||
      "";

    if (!userId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "User ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id:
            userId,
        },

        select: {
          id: true,
          name: true,
          isActive:
            true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Agent account not found.",
        },
        {
          status:
            404,
        }
      );
    }

    if (
      !user.isActive
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Agent account is inactive.",
        },
        {
          status:
            403,
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
          id:
            true,

          userId:
            true,

          customerId:
            true,

          enquiryId:
            true,

          comment:
            true,

          followUpDate:
            true,

          nextFollowUpDate:
            true,

          status:
            true,

          outcome:
            true,

          actionType:
            true,

          lostReason:
            true,

          cancellationReason:
            true,

          createdByType:
            true,

          createdByStaffId:
            true,

          createdByName:
            true,

          completedAt:
            true,

          createdAt:
            true,

          updatedAt:
            true,

          createdByStaff: {
            select: {
              id: true,
              staffCode:
                true,
              name: true,
              staffRole:
                true,
            },
          },

          customer: {
            select: {
              id: true,
              customerId:
                true,
              name: true,
              phone: true,
              email: true,
              sourceType:
                true,
              subAgentId:
                true,

              subAgent: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },

          enquiry: {
            select: {
              id: true,
              businessType:
                true,
              requirement:
                true,
              remarks:
                true,
              status:
                true,
              enquiryDate:
                true,
              nextFollowUpDate:
                true,
              convertedAt:
                true,
              closedAt:
                true,
            },
          },
        },

        orderBy: [
          {
            createdAt:
              "desc",
          },
          {
            followUpDate:
              "desc",
          },
        ],
      });

    return NextResponse.json(
      {
        success:
          true,

        agent: {
          id:
            user.id,

          name:
            user.name,
        },

        followUps,
      },
      {
        status:
          200,
      }
    );
  } catch (error) {
    console.error(
      "GET FOLLOW UPS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to load follow-ups.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      String(
        body.userId ||
        ""
      ).trim();

    const customerId =
      String(
        body.customerId ||
        ""
      ).trim();

    const enquiryId =
      String(
        body.enquiryId ||
        ""
      ).trim();

    const comment =
      String(
        body.comment ||
        ""
      ).trim();

    if (!userId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "User ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Customer is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!enquiryId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Enquiry is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Follow-up remarks are required.",
        },
        {
          status:
            400,
        }
      );
    }

    const followUpDate =
      parseDate(
        body.followUpDate
      );

    if (!followUpDate) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please select a valid follow-up date.",
        },
        {
          status:
            400,
        }
      );
    }

    let nextFollowUpDate:
      | Date
      | null =
      null;

    if (
      body.nextFollowUpDate
    ) {
      nextFollowUpDate =
        parseDate(
          body.nextFollowUpDate
        );

      if (
        !nextFollowUpDate
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Please select a valid next follow-up date.",
          },
          {
            status:
              400,
          }
        );
      }
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id:
            userId,
        },

        select: {
          id: true,
          isActive:
            true,
        },
      });

    if (
      !user ||
      !user.isActive
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Agent account is not available.",
        },
        {
          status:
            403,
        }
      );
    }

    const customer =
      await prisma.customer.findFirst({
        where: {
          id:
            customerId,

          userId,

          isActive:
            true,
        },

        select: {
          id: true,
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Customer not found for this agent.",
        },
        {
          status:
            404,
        }
      );
    }

    const enquiry =
      await prisma.enquiry.findFirst({
        where: {
          id:
            enquiryId,

          userId,

          customerId,

          isActive:
            true,
        },

        select: {
          id: true,
        },
      });

    if (!enquiry) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Enquiry not found for this customer.",
        },
        {
          status:
            404,
        }
      );
    }

    const actor =
      await getActor(
        request,
        userId
      );

    const followUp =
      await prisma.$transaction(
        async (
          tx
        ) => {
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

                actionType:
                  "FOLLOW_UP",

                createdByType:
                  actor.type,

                createdByStaffId:
                  actor.staffId,

                createdByName:
                  actor.name,

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
              id:
                enquiryId,
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
        success:
          true,

        message:
          "Follow-up saved successfully.",

        followUp,
      },
      {
        status:
          201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE FOLLOW UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to save follow-up.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE / NEW HISTORY ENTRY                                                 */
/* -------------------------------------------------------------------------- */

export async function PUT(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      String(
        body.id ||
        ""
      ).trim();

    const userId =
      String(
        body.userId ||
        ""
      ).trim();

    const comment =
      String(
        body.comment ||
        ""
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
        body.lostReason ||
        ""
      ).trim();

    const cancellationReason =
      String(
        body.cancellationReason ||
        ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Follow-up ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "User ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please enter new follow-up remarks.",
        },
        {
          status:
            400,
        }
      );
    }

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
          success:
            false,

          message:
            "Invalid follow-up result.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      requestedOutcome ===
        "CASE_LOST" &&
      !lostReason
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please enter the lost reason.",
        },
        {
          status:
            400,
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
          success:
            false,

          message:
            "Please enter the cancellation reason.",
        },
        {
          status:
            400,
        }
      );
    }

    const actionDate =
      body.followUpDate
        ? parseDate(
            body.followUpDate
          )
        : new Date();

    if (!actionDate) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please select a valid follow-up date.",
        },
        {
          status:
            400,
        }
      );
    }

    let nextFollowUpDate:
      | Date
      | null =
      null;

    if (
      body.nextFollowUpDate
    ) {
      nextFollowUpDate =
        parseDate(
          body.nextFollowUpDate
        );

      if (
        !nextFollowUpDate
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Please select a valid next follow-up date.",
          },
          {
            status:
              400,
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
          success:
            false,

          message:
            "Please select the next follow-up date.",
        },
        {
          status:
            400,
        }
      );
    }

    const existing =
      await prisma.followUp.findFirst({
        where: {
          id,

          userId,
        },

        select: {
          id: true,
          customerId:
            true,
          enquiryId:
            true,
          status:
            true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Follow-up not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const actor =
      await getActor(
        request,
        userId
      );

    const now =
      new Date();

    /* ---------------------------------------------------------------------- */
    /* CONTINUE                                                               */
    /* ---------------------------------------------------------------------- */

    if (
      requestedOutcome ===
      "CONTINUE"
    ) {
      const created =
        await prisma.$transaction(
          async (
            tx
          ) => {
            /*
             * Complete previous pending row.
             *
             * IMPORTANT:
             * We NEVER overwrite its old comment.
             */

            await tx.followUp.update({
              where: {
                id:
                  existing.id,
              },

              data: {
                status:
                  "COMPLETED",

                completedAt:
                  now,
              },
            });

            /*
             * New discussion becomes a new row.
             */

            const newRow =
              await tx.followUp.create({
                data: {
                  userId,

                  customerId:
                    existing.customerId,

                  enquiryId:
                    existing.enquiryId,

                  comment,

                  followUpDate:
                    actionDate,

                  nextFollowUpDate,

                  status:
                    "PENDING",

                  outcome:
                    "CONTINUE",

                  actionType:
                    "CONTINUE",

                  createdByType:
                    actor.type,

                  createdByStaffId:
                    actor.staffId,

                  createdByName:
                    actor.name,

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

            return newRow;
          }
        );

      return NextResponse.json(
        {
          success:
            true,

          message:
            "Next follow-up saved. Previous history was preserved.",

          followUp:
            created,
        },
        {
          status:
            200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* READY FOR POLICY                                                       */
    /* ---------------------------------------------------------------------- */

    if (
      requestedOutcome ===
      "READY_FOR_POLICY"
    ) {
      const result =
        await prisma.$transaction(
          async (
            tx
          ) => {
            await tx.followUp.update({
              where: {
                id:
                  existing.id,
              },

              data: {
                status:
                  "COMPLETED",

                completedAt:
                  now,
              },
            });

            const history =
              await tx.followUp.create({
                data: {
                  userId,

                  customerId:
                    existing.customerId,

                  enquiryId:
                    existing.enquiryId,

                  comment,

                  followUpDate:
                    actionDate,

                  nextFollowUpDate:
                    null,

                  status:
                    "COMPLETED",

                  /*
                   * READY_FOR_POLICY is NOT
                   * saved into FollowUpOutcome.
                   */

                  outcome:
                    "CONTINUE",

                  actionType:
                    "READY_FOR_POLICY",

                  createdByType:
                    actor.type,

                  createdByStaffId:
                    actor.staffId,

                  createdByName:
                    actor.name,

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

            return history;
          }
        );

      return NextResponse.json(
        {
          success:
            true,

          message:
            "Customer marked Ready for Policy.",

          readyForPolicy:
            true,

          customerId:
            existing.customerId,

          enquiryId:
            existing.enquiryId,

          followUp:
            result,
        },
        {
          status:
            200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* BUSINESS CLOSED                                                        */
    /* ---------------------------------------------------------------------- */

    if (
      requestedOutcome ===
      "BUSINESS_CLOSED"
    ) {
      const result =
        await prisma.$transaction(
          async (
            tx
          ) => {
            await tx.followUp.update({
              where: {
                id:
                  existing.id,
              },

              data: {
                status:
                  "COMPLETED",

                completedAt:
                  now,
              },
            });

            const history =
              await tx.followUp.create({
                data: {
                  userId,

                  customerId:
                    existing.customerId,

                  enquiryId:
                    existing.enquiryId,

                  comment,

                  followUpDate:
                    actionDate,

                  nextFollowUpDate:
                    null,

                  status:
                    "COMPLETED",

                  outcome:
                    "BUSINESS_CLOSED",

                  actionType:
                    "BUSINESS_CLOSED",

                  createdByType:
                    actor.type,

                  createdByStaffId:
                    actor.staffId,

                  createdByName:
                    actor.name,

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

            return history;
          }
        );

      return NextResponse.json(
        {
          success:
            true,

          message:
            "Business converted successfully.",

          customerId:
            existing.customerId,

          enquiryId:
            existing.enquiryId,

          followUp:
            result,
        },
        {
          status:
            200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CASE LOST                                                              */
    /* ---------------------------------------------------------------------- */

    if (
      requestedOutcome ===
      "CASE_LOST"
    ) {
      const result =
        await prisma.$transaction(
          async (
            tx
          ) => {
            await tx.followUp.update({
              where: {
                id:
                  existing.id,
              },

              data: {
                status:
                  "COMPLETED",

                completedAt:
                  now,
              },
            });

            const history =
              await tx.followUp.create({
                data: {
                  userId,

                  customerId:
                    existing.customerId,

                  enquiryId:
                    existing.enquiryId,

                  comment,

                  followUpDate:
                    actionDate,

                  nextFollowUpDate:
                    null,

                  status:
                    "COMPLETED",

                  outcome:
                    "CASE_LOST",

                  actionType:
                    "CASE_LOST",

                  lostReason,

                  createdByType:
                    actor.type,

                  createdByStaffId:
                    actor.staffId,

                  createdByName:
                    actor.name,

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

            return history;
          }
        );

      return NextResponse.json(
        {
          success:
            true,

          message:
            "Case marked as lost.",

          followUp:
            result,
        },
        {
          status:
            200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CANCEL                                                                 */
    /* ---------------------------------------------------------------------- */

    const result =
      await prisma.$transaction(
        async (
          tx
        ) => {
          await tx.followUp.update({
            where: {
              id:
                existing.id,
            },

            data: {
              status:
                "COMPLETED",

              completedAt:
                now,
            },
          });

          const history =
            await tx.followUp.create({
              data: {
                userId,

                customerId:
                  existing.customerId,

                enquiryId:
                  existing.enquiryId,

                comment,

                followUpDate:
                  actionDate,

                nextFollowUpDate:
                  null,

                status:
                  "CANCELLED",

                outcome:
                  "CANCELLED",

                actionType:
                  "CANCELLED",

                cancellationReason,

                createdByType:
                  actor.type,

                createdByStaffId:
                  actor.staffId,

                createdByName:
                  actor.name,

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

          return history;
        }
      );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Enquiry cancelled successfully.",

        followUp:
          result,
      },
      {
        status:
          200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE FOLLOW UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to update follow-up.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
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
        .get(
          "id"
        )
        ?.trim() ||
      "";

    const userId =
      searchParams
        .get(
          "userId"
        )
        ?.trim() ||
      "";

    if (
      !id ||
      !userId
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Follow-up ID and User ID are required.",
        },
        {
          status:
            400,
        }
      );
    }

    const existing =
      await prisma.followUp.findFirst({
        where: {
          id,
          userId,
        },

        select: {
          id: true,
          enquiryId:
            true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Follow-up not found.",
        },
        {
          status:
            404,
        }
      );
    }

    await prisma.$transaction(
      async (
        tx
      ) => {
        await tx.followUp.delete({
          where: {
            id,
          },
        });

        if (
          existing.enquiryId
        ) {
          const latestPending =
            await tx.followUp.findFirst({
              where: {
                enquiryId:
                  existing.enquiryId,

                userId,

                status:
                  "PENDING",
              },

              orderBy: {
                createdAt:
                  "desc",
              },

              select: {
                nextFollowUpDate:
                  true,
              },
            });

          const remaining =
            await tx.followUp.count({
              where: {
                enquiryId:
                  existing.enquiryId,

                userId,
              },
            });

          await tx.enquiry.update({
            where: {
              id:
                existing.enquiryId,
            },

            data: {
              nextFollowUpDate:
                latestPending?.nextFollowUpDate ??
                null,

              ...(remaining ===
              0
                ? {
                    status:
                      "NEW",
                  }
                : {}),
            },
          });
        }
      }
    );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Follow-up deleted successfully.",
      },
      {
        status:
          200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE FOLLOW UP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to delete follow-up.",
      },
      {
        status:
          500,
      }
    );
  }
}