import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type WithdrawalAction =
  | "APPROVE"
  | "REJECT"
  | "MARK_PAID"
  | "PAID";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function decimalToNumber(
  value:
    | {
        toString(): string;
      }
    | number
    | string
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  const number =
    Number(
      value.toString()
    );

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

/* -------------------------------------------------------------------------- */
/* ADMIN ROLE CHECK                                                           */
/* -------------------------------------------------------------------------- */

function isAdminRole(
  role?: string | null
) {
  const normalized =
    String(
      role || ""
    )
      .trim()
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  return [
    "ADMIN",
    "MASTER_ADMIN",
    "MASTERADMIN",
    "SUPER_ADMIN",
    "SUPERADMIN",
  ].includes(
    normalized
  );
}

/* -------------------------------------------------------------------------- */
/* FIND ADMIN                                                                 */
/* -------------------------------------------------------------------------- */

async function findAdmin(
  userId?: string
) {
  if (!userId) {
    return null;
  }

  const user =
    await prisma.user.findFirst({
      where: {
        id:
          userId,

        isActive:
          true,
      },

      select: {
        id:
          true,

        name:
          true,

        phone:
          true,

        email:
          true,

        role:
          true,
      },
    });

  if (!user) {
    return null;
  }

  if (
    !isAdminRole(
      String(
        user.role || ""
      )
    )
  ) {
    return null;
  }

  return user;
}

/* -------------------------------------------------------------------------- */
/* GET ADMIN POSTER WITHDRAWALS                                               */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const adminUserId =
      searchParams
        .get(
          "adminUserId"
        )
        ?.trim() ||
      searchParams
        .get(
          "approvedByUserId"
        )
        ?.trim() ||
      "";

    const requestedStatus =
      searchParams
        .get(
          "status"
        )
        ?.trim()
        .toUpperCase() ||
      "";

    const agentId =
      searchParams
        .get(
          "agentId"
        )
        ?.trim() ||
      "";

    /* ---------------------------------------------------------------------- */
    /* ADMIN AUTHORIZATION                                                    */
    /* ---------------------------------------------------------------------- */

    const admin =
      await findAdmin(
        adminUserId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Admin authorization failed.",
        },
        {
          status:
            403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS FILTER                                                          */
    /* ---------------------------------------------------------------------- */

    const validStatus =
      requestedStatus ===
        "PENDING" ||
      requestedStatus ===
        "APPROVED" ||
      requestedStatus ===
        "PAID" ||
      requestedStatus ===
        "REJECTED" ||
      requestedStatus ===
        "CANCELLED"
        ? requestedStatus
        : "";

    /* ---------------------------------------------------------------------- */
    /* LOAD WITHDRAWALS                                                       */
    /* ---------------------------------------------------------------------- */

    const rawWithdrawals =
      await prisma.withdrawalRequest.findMany({
        where: {
          ...(validStatus
            ? {
                status:
                  validStatus as
                    | "PENDING"
                    | "APPROVED"
                    | "PAID"
                    | "REJECTED"
                    | "CANCELLED",
              }
            : {}),

          ...(agentId
            ? {
                agentId,
              }
            : {}),
        },

        include: {
          agent: {
            select: {
              id:
                true,

              name:
                true,

              phone:
                true,

              email:
                true,

              logoUrl:
                true,

              isActive:
                true,
            },
          },

          approvedBy: {
            select: {
              id:
                true,

              name:
                true,

              phone:
                true,

              email:
                true,
            },
          },
        },

        orderBy: {
          requestedAt:
            "desc",
        },

        take:
          250,
      });

    /* ---------------------------------------------------------------------- */
    /* COUNTS                                                                 */
    /* ---------------------------------------------------------------------- */

    const [
      pendingCount,
      approvedCount,
      paidCount,
      rejectedCount,
    ] =
      await Promise.all([
        prisma.withdrawalRequest.count({
          where: {
            status:
              "PENDING",
          },
        }),

        prisma.withdrawalRequest.count({
          where: {
            status:
              "APPROVED",
          },
        }),

        prisma.withdrawalRequest.count({
          where: {
            status:
              "PAID",
          },
        }),

        prisma.withdrawalRequest.count({
          where: {
            status:
              "REJECTED",
          },
        }),
      ]);

    /* ---------------------------------------------------------------------- */
    /* AMOUNT SUMMARY                                                         */
    /* ---------------------------------------------------------------------- */

    const [
      pendingAmountData,
      approvedAmountData,
      paidAmountData,
    ] =
      await Promise.all([
        prisma.withdrawalRequest.aggregate({
          where: {
            status:
              "PENDING",
          },

          _sum: {
            amount:
              true,
          },
        }),

        prisma.withdrawalRequest.aggregate({
          where: {
            status:
              "APPROVED",
          },

          _sum: {
            amount:
              true,
          },
        }),

        prisma.withdrawalRequest.aggregate({
          where: {
            status:
              "PAID",
          },

          _sum: {
            amount:
              true,
          },
        }),
      ]);

    /* ---------------------------------------------------------------------- */
    /* CONVERT DECIMALS                                                       */
    /* ---------------------------------------------------------------------- */

    const withdrawals =
      rawWithdrawals.map(
        (
          withdrawal
        ) => ({
          ...withdrawal,

          amount:
            decimalToNumber(
              withdrawal.amount
            ),
        })
      );

    /* ---------------------------------------------------------------------- */
    /* RESPONSE                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      success:
        true,

      admin: {
        id:
          admin.id,

        name:
          admin.name,
      },

      summary: {
        pendingCount,

        approvedCount,

        paidCount,

        rejectedCount,

        pendingAmount:
          decimalToNumber(
            pendingAmountData
              ._sum
              .amount
          ),

        approvedAmount:
          decimalToNumber(
            approvedAmountData
              ._sum
              .amount
          ),

        paidAmount:
          decimalToNumber(
            paidAmountData
              ._sum
              .amount
          ),
      },

      withdrawals,
    });
  } catch (
    error
  ) {
    console.error(
      "GET ADMIN POSTER WITHDRAWALS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to load Poster Wallet withdrawal requests.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH ADMIN POSTER WITHDRAWAL                                              */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id
      ) ||
      cleanString(
        body.withdrawalId
      );

    const action =
      cleanString(
        body.action
      ).toUpperCase() as
        WithdrawalAction;

    const adminUserId =
      cleanString(
        body.adminUserId
      ) ||
      cleanString(
        body.approvedByUserId
      );

    const rejectionReason =
      cleanString(
        body.rejectionReason
      );

    const transactionNumber =
      cleanString(
        body.transactionNumber
      );

    const paymentRemarks =
      cleanString(
        body.paymentRemarks
      );

    const paymentProofUrl =
      cleanString(
        body.paymentProofUrl
      );

    /* ---------------------------------------------------------------------- */
    /* BASIC VALIDATION                                                       */
    /* ---------------------------------------------------------------------- */

    if (!id) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Withdrawal request ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      action !==
        "APPROVE" &&
      action !==
        "REJECT" &&
      action !==
        "MARK_PAID" &&
      action !==
        "PAID"
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Valid withdrawal action is required.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* ADMIN AUTHORIZATION                                                    */
    /* ---------------------------------------------------------------------- */

    const admin =
      await findAdmin(
        adminUserId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Admin authorization failed.",
        },
        {
          status:
            403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EXISTING REQUEST                                                       */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.withdrawalRequest.findUnique({
        where: {
          id,
        },

        include: {
          agent: {
            select: {
              id:
                true,

              name:
                true,

              phone:
                true,

              email:
                true,

              isActive:
                true,
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Withdrawal request was not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const amount =
      decimalToNumber(
        existing.amount
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Withdrawal request has an invalid amount.",
        },
        {
          status:
            409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* APPROVE                                                                */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "APPROVE"
    ) {
      if (
        existing.status ===
        "APPROVED"
      ) {
        return NextResponse.json({
          success:
            true,

          message:
            "Withdrawal request is already approved.",

          withdrawal: {
            ...existing,

            amount,
          },
        });
      }

      if (
        existing.status !==
        "PENDING"
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `Only PENDING withdrawals can be approved. Current status: ${existing.status}.`,
          },
          {
            status:
              409,
          }
        );
      }

      const withdrawal =
        await prisma.withdrawalRequest.update({
          where: {
            id,
          },

          data: {
            status:
              "APPROVED",

            approvedById:
              admin.id,

            approvedAt:
              new Date(),

            rejectedAt:
              null,

            rejectionReason:
              null,
          },

          include: {
            agent: {
              select: {
                id:
                  true,

                name:
                  true,

                phone:
                  true,

                email:
                  true,

                logoUrl:
                  true,
              },
            },

            approvedBy: {
              select: {
                id:
                  true,

                name:
                  true,
              },
            },
          },
        });

      return NextResponse.json({
        success:
          true,

        message:
          "Withdrawal request approved successfully. Complete the bank payment and then mark it as paid.",

        withdrawal: {
          ...withdrawal,

          amount:
            decimalToNumber(
              withdrawal.amount
            ),
        },
      });
    }

    /* ---------------------------------------------------------------------- */
    /* REJECT                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "REJECT"
    ) {
      if (
        !rejectionReason
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Rejection reason is required.",
          },
          {
            status:
              400,
          }
        );
      }

      if (
        existing.status ===
        "REJECTED"
      ) {
        return NextResponse.json({
          success:
            true,

          message:
            "Withdrawal request is already rejected.",

          withdrawal: {
            ...existing,

            amount,
          },
        });
      }

      if (
        existing.status ===
          "PAID" ||
        existing.status ===
          "CANCELLED"
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `A ${existing.status} withdrawal cannot be rejected.`,
          },
          {
            status:
              409,
          }
        );
      }

      if (
        existing.status !==
          "PENDING" &&
        existing.status !==
          "APPROVED"
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `Withdrawal cannot be rejected from status ${existing.status}.`,
          },
          {
            status:
              409,
          }
        );
      }

      const result =
        await prisma.$transaction(
          async (
            tx
          ) => {
            const wallet =
              await tx.agentCreditAccount.findUnique({
                where: {
                  userId:
                    existing.agentId,
                },
              });

            if (!wallet) {
              throw new Error(
                "Poster Wallet account was not found for this agent."
              );
            }

            const totalPending =
              decimalToNumber(
                wallet.totalPending
              );

            if (
              totalPending <
              amount
            ) {
              throw new Error(
                "Poster Wallet pending balance is lower than this withdrawal amount. Please check wallet accounting before rejecting."
              );
            }

            const withdrawal =
              await tx.withdrawalRequest.update({
                where: {
                  id,
                },

                data: {
                  status:
                    "REJECTED",

                  approvedById:
                    admin.id,

                  rejectedAt:
                    new Date(),

                  rejectionReason,

                  paidAt:
                    null,

                  transactionNumber:
                    null,

                  paymentRemarks:
                    null,

                  paymentProofUrl:
                    null,
                },

                include: {
                  agent: {
                    select: {
                      id:
                        true,

                      name:
                        true,

                      phone:
                        true,

                      email:
                        true,

                      logoUrl:
                        true,
                    },
                  },

                  approvedBy: {
                    select: {
                      id:
                        true,

                      name:
                        true,
                    },
                  },
                },
              });

            await tx.agentCreditAccount.update({
              where: {
                userId:
                  existing.agentId,
              },

              data: {
                availableBalance: {
                  increment:
                    amount,
                },

                totalPending: {
                  decrement:
                    amount,
                },
              },
            });

            await tx.creditTransaction.create({
              data: {
                userId:
                  existing.agentId,

                type:
                  "WITHDRAWAL_REVERSED",

                amount,

                description:
                  `Poster Wallet withdrawal rejected and ₹${amount.toLocaleString(
                    "en-IN",
                    {
                      maximumFractionDigits:
                        2,
                    }
                  )} returned to available balance.`,

                referenceType:
                  "WITHDRAWAL_REQUEST",

                referenceId:
                  id,
              },
            });

            return withdrawal;
          }
        );

      return NextResponse.json({
        success:
          true,

        message:
          `Withdrawal rejected. ₹${amount.toLocaleString(
            "en-IN",
            {
              maximumFractionDigits:
                2,
            }
          )} returned to the agent's available Poster Wallet balance.`,

        withdrawal: {
          ...result,

          amount:
            decimalToNumber(
              result.amount
            ),
        },
      });
    }

    /* ---------------------------------------------------------------------- */
    /* MARK AS PAID                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
        "MARK_PAID" ||
      action ===
        "PAID"
    ) {
      if (
        existing.status ===
        "PAID"
      ) {
        return NextResponse.json({
          success:
            true,

          message:
            "Withdrawal is already marked as paid.",

          withdrawal: {
            ...existing,

            amount,
          },
        });
      }

      if (
        existing.status !==
        "APPROVED"
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              `Only APPROVED withdrawals can be marked as paid. Current status: ${existing.status}.`,
          },
          {
            status:
              409,
          }
        );
      }

      if (
        !transactionNumber
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Bank transaction / UTR number is required before marking the withdrawal as paid.",
          },
          {
            status:
              400,
          }
        );
      }

      const result =
        await prisma.$transaction(
          async (
            tx
          ) => {
            const wallet =
              await tx.agentCreditAccount.findUnique({
                where: {
                  userId:
                    existing.agentId,
                },
              });

            if (!wallet) {
              throw new Error(
                "Poster Wallet account was not found for this agent."
              );
            }

            const totalPending =
              decimalToNumber(
                wallet.totalPending
              );

            if (
              totalPending <
              amount
            ) {
              throw new Error(
                "Poster Wallet pending balance is lower than this withdrawal amount. Please check wallet accounting before marking payment."
              );
            }

            const withdrawal =
              await tx.withdrawalRequest.update({
                where: {
                  id,
                },

                data: {
                  status:
                    "PAID",

                  approvedById:
                    admin.id,

                  approvedAt:
                    existing.approvedAt ||
                    new Date(),

                  paidAt:
                    new Date(),

                  transactionNumber,

                  paymentRemarks:
                    paymentRemarks ||
                    null,

                  paymentProofUrl:
                    paymentProofUrl ||
                    null,

                  rejectedAt:
                    null,

                  rejectionReason:
                    null,
                },

                include: {
                  agent: {
                    select: {
                      id:
                        true,

                      name:
                        true,

                      phone:
                        true,

                      email:
                        true,

                      logoUrl:
                        true,
                    },
                  },

                  approvedBy: {
                    select: {
                      id:
                        true,

                      name:
                        true,
                    },
                  },
                },
              });

            await tx.agentCreditAccount.update({
              where: {
                userId:
                  existing.agentId,
              },

              data: {
                totalPending: {
                  decrement:
                    amount,
                },

                totalWithdrawn: {
                  increment:
                    amount,
                },
              },
            });

            await tx.creditTransaction.create({
              data: {
                userId:
                  existing.agentId,

                type:
                  "WITHDRAWAL_PAID",

                amount,

                description:
                  `Poster Wallet withdrawal paid. Transaction / UTR: ${transactionNumber}`,

                referenceType:
                  "WITHDRAWAL_REQUEST",

                referenceId:
                  id,
              },
            });

            return withdrawal;
          }
        );

      return NextResponse.json({
        success:
          true,

        message:
          `Withdrawal of ₹${amount.toLocaleString(
            "en-IN",
            {
              maximumFractionDigits:
                2,
            }
          )} marked as paid successfully.`,

        withdrawal: {
          ...result,

          amount:
            decimalToNumber(
              result.amount
            ),
        },
      });
    }

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to process withdrawal action.",
      },
      {
        status:
          400,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "ADMIN POSTER WITHDRAWAL PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to update Poster Wallet withdrawal.",
      },
      {
        status:
          500,
      }
    );
  }
}