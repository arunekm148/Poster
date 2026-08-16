import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

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
/* CREATE WITHDRAWAL REQUEST                                                  */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const userId =
      cleanString(
        body.userId
      );

    const amount =
      Number(
        body.amount
      );

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
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

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Enter a valid withdrawal amount.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK AGENT                                                            */
    /* ---------------------------------------------------------------------- */

    const agent =
      await prisma.user.findFirst({
        where: {
          id:
            userId,

          role:
            "AGENT",

          isActive:
            true,
        },

        select: {
          id:
            true,

          name:
            true,
        },
      });

    if (!agent) {
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

    /* ---------------------------------------------------------------------- */
    /* LOAD WALLET                                                            */
    /* ---------------------------------------------------------------------- */

    const wallet =
      await prisma.agentCreditAccount.findUnique({
        where: {
          userId,
        },
      });

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Poster Wallet not found.",
        },
        {
          status: 404,
        }
      );
    }

    const availableBalance =
      decimalToNumber(
        wallet.availableBalance
      );

    /* ---------------------------------------------------------------------- */
    /* MINIMUM WITHDRAWAL                                                     */
    /* ---------------------------------------------------------------------- */

    const minimumSetting =
      await prisma.platformSetting.findUnique({
        where: {
          key:
            "POSTER_WALLET_MIN_WITHDRAWAL",
        },

        select: {
          value:
            true,
        },
      });

    let minimumWithdrawal =
      Number(
        minimumSetting?.value ||
          500
      );

    if (
      !Number.isFinite(
        minimumWithdrawal
      ) ||
      minimumWithdrawal <= 0
    ) {
      minimumWithdrawal =
        500;
    }

    if (
      amount <
      minimumWithdrawal
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Minimum withdrawal amount is ₹${minimumWithdrawal.toLocaleString(
              "en-IN"
            )}.`,
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK AVAILABLE BALANCE                                                */
    /* ---------------------------------------------------------------------- */

    if (
      amount >
      availableBalance
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Withdrawal amount exceeds available Poster Wallet balance.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK EXISTING PENDING REQUEST                                         */
    /* ---------------------------------------------------------------------- */

    const existingRequest =
      await prisma.withdrawalRequest.findFirst({
        where: {
          agentId:
            userId,

          status: {
            in: [
              "PENDING",
              "APPROVED",
            ],
          },
        },

        select: {
          id:
            true,

          status:
            true,
        },
      });

    if (
      existingRequest
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "You already have a pending withdrawal request.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* BANK ACCOUNT                                                           */
    /* ---------------------------------------------------------------------- */

    const bankAccount =
      await prisma.agentBankAccount.findFirst({
        where: {
          userId,

          isActive:
            true,
        },
      });

    if (!bankAccount) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please add bank details before requesting withdrawal.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE WITHDRAWAL                                                      */
    /* ---------------------------------------------------------------------- */

    const result =
      await prisma.$transaction(
        async (
          tx
        ) => {
          /* ---------------------------------------------------------------- */
          /* CREATE REQUEST                                                   */
          /* ---------------------------------------------------------------- */

          const withdrawal =
            await tx.withdrawalRequest.create({
              data: {
                agentId:
                  userId,

                amount,

                status:
                  "PENDING",

                accountHolderName:
                  bankAccount.accountHolderName,

                accountNumber:
                  bankAccount.accountNumber,

                bankName:
                  bankAccount.bankName,

                branch:
                  bankAccount.branch,

                ifscCode:
                  bankAccount.ifscCode,
              },
            });

          /* ---------------------------------------------------------------- */
          /* MOVE AVAILABLE -> PENDING                                        */
          /* ---------------------------------------------------------------- */

          await tx.agentCreditAccount.update({
            where: {
              userId,
            },

            data: {
              availableBalance: {
                decrement:
                  amount,
              },

              totalPending: {
                increment:
                  amount,
              },
            },
          });

          /* ---------------------------------------------------------------- */
          /* TRANSACTION                                                      */
          /* ---------------------------------------------------------------- */

          await tx.creditTransaction.create({
            data: {
              userId,

              type:
                "WITHDRAWAL_PENDING",

              amount,

              description:
                "Poster Wallet withdrawal requested.",

              referenceType:
                "WITHDRAWAL_REQUEST",

              referenceId:
                withdrawal.id,
            },
          });

          return withdrawal;
        }
      );

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          "Withdrawal request submitted successfully.",

        withdrawal: {
          ...result,

          amount:
            decimalToNumber(
              result.amount
            ),
        },
      },
      {
        status: 201,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "POSTER WALLET WITHDRAWAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to submit withdrawal request.",
      },
      {
        status: 500,
      }
    );
  }
}