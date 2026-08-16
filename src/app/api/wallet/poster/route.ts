import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* GET POSTER WALLET                                                          */
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

    const userId =
      searchParams
        .get("userId")
        ?.trim() ||
      "";

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

    /* ---------------------------------------------------------------------- */
    /* CHECK AGENT                                                            */
    /* ---------------------------------------------------------------------- */

    const user =
      await prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
        },

        select: {
          id: true,
          name: true,
          role: true,
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

    /* ---------------------------------------------------------------------- */
    /* CREATE WALLET AUTOMATICALLY IF NOT EXISTS                              */
    /* ---------------------------------------------------------------------- */

    const wallet =
      await prisma.agentCreditAccount.upsert({
        where: {
          userId,
        },

        update: {},

        create: {
          userId,

          availableBalance: 0,
          totalEarned: 0,
          totalPending: 0,
          totalWithdrawn: 0,
        },

        select: {
          id: true,
          userId: true,

          availableBalance: true,
          totalEarned: true,
          totalPending: true,
          totalWithdrawn: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    /* ---------------------------------------------------------------------- */
    /* BANK ACCOUNT                                                           */
    /* ---------------------------------------------------------------------- */

    const bankAccount =
      await prisma.agentBankAccount.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
          userId: true,

          accountHolderName: true,
          accountNumber: true,
          bankName: true,
          branch: true,
          ifscCode: true,

          isActive: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    /* ---------------------------------------------------------------------- */
    /* CREDIT TRANSACTIONS                                                    */
    /* ---------------------------------------------------------------------- */

    const rawTransactions =
      await prisma.creditTransaction.findMany({
        where: {
          userId,
        },

        include: {
          media: {
            select: {
              id: true,
              title: true,
              fileUrl: true,
              thumbnailUrl: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 100,
      });

    /* ---------------------------------------------------------------------- */
    /* WITHDRAWALS                                                            */
    /* ---------------------------------------------------------------------- */

    const rawWithdrawals =
      await prisma.withdrawalRequest.findMany({
        where: {
          agentId: userId,
        },

        orderBy: {
          requestedAt: "desc",
        },

        take: 100,

        select: {
          id: true,
          agentId: true,

          amount: true,
          status: true,

          accountHolderName: true,
          accountNumber: true,
          bankName: true,
          branch: true,
          ifscCode: true,

          requestedAt: true,

          approvedById: true,
          approvedAt: true,

          rejectedAt: true,
          rejectionReason: true,

          paidAt: true,

          transactionNumber: true,
          paymentRemarks: true,
          paymentProofUrl: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    /* ---------------------------------------------------------------------- */
    /* CONVERT PRISMA DECIMAL TO NORMAL NUMBER                                */
    /* ---------------------------------------------------------------------- */

    const transactions =
      rawTransactions.map(
        (
          transaction
        ) => ({
          ...transaction,

          amount:
            Number(
              transaction.amount
            ),
        })
      );

    const withdrawals =
      rawWithdrawals.map(
        (
          withdrawal
        ) => ({
          ...withdrawal,

          amount:
            Number(
              withdrawal.amount
            ),
        })
      );

    /* ---------------------------------------------------------------------- */
    /* RESPONSE                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },

      wallet: {
        id: wallet.id,

        availableBalance:
          Number(
            wallet.availableBalance
          ),

        totalEarned:
          Number(
            wallet.totalEarned
          ),

        totalPending:
          Number(
            wallet.totalPending
          ),

        totalWithdrawn:
          Number(
            wallet.totalWithdrawn
          ),

        createdAt:
          wallet.createdAt,

        updatedAt:
          wallet.updatedAt,
      },

      bankAccount,

      transactions,

      withdrawals,
    });
  } catch (error) {
    console.error(
      "GET POSTER WALLET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to load Poster Wallet.",
      },
      {
        status: 500,
      }
    );
  }
}