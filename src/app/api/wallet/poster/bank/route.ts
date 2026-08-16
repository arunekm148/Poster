import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

async function findActiveUser(userId: string) {
  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
    },

    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* GET BANK ACCOUNT                                                           */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId =
      searchParams.get("userId")?.trim() || "";

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* CHECK ACTIVE USER */

    const user =
      await findActiveUser(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Active user account was not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* GET BANK ACCOUNT */

    const bankAccount =
      await prisma.agentBankAccount.findUnique({
        where: {
          userId,
        },
      });

    return NextResponse.json({
      success: true,
      bankAccount,
    });
  } catch (error) {
    console.error(
      "GET POSTER WALLET BANK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load bank account.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* SAVE / UPDATE BANK ACCOUNT                                                 */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const accountHolderName =
      typeof body.accountHolderName === "string"
        ? body.accountHolderName.trim()
        : "";

    const accountNumber =
      typeof body.accountNumber === "string"
        ? body.accountNumber
            .replace(/\s+/g, "")
            .trim()
        : "";

    const bankName =
      typeof body.bankName === "string"
        ? body.bankName.trim()
        : "";

    const branch =
      typeof body.branch === "string"
        ? body.branch.trim()
        : "";

    const ifscCode =
      typeof body.ifscCode === "string"
        ? body.ifscCode
            .replace(/\s+/g, "")
            .trim()
            .toUpperCase()
        : "";

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
    /* ---------------------------------------------------------------------- */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!accountHolderName) {
      return NextResponse.json(
        {
          success: false,
          message: "Account holder name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!accountNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Bank account number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!bankName) {
      return NextResponse.json(
        {
          success: false,
          message: "Bank name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!ifscCode) {
      return NextResponse.json(
        {
          success: false,
          message: "IFSC code is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ACCOUNT NUMBER VALIDATION */

    if (!/^\d{6,20}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid bank account number.",
        },
        {
          status: 400,
        }
      );
    }

    /* IFSC VALIDATION */

    const validIfsc =
      /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode);

    if (!validIfsc) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid IFSC code.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ACTIVE USER                                                      */
    /* ---------------------------------------------------------------------- */

    const user =
      await findActiveUser(userId);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Active user account was not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE OR UPDATE BANK ACCOUNT                                          */
    /* ---------------------------------------------------------------------- */

    const bankAccount =
      await prisma.agentBankAccount.upsert({
        where: {
          userId,
        },

        update: {
          accountHolderName,
          accountNumber,
          bankName,
          branch: branch || null,
          ifscCode,
          isActive: true,
        },

        create: {
          userId,
          accountHolderName,
          accountNumber,
          bankName,
          branch: branch || null,
          ifscCode,
          isActive: true,
        },
      });

    return NextResponse.json({
      success: true,
      message: "Bank account saved successfully.",
      bankAccount,
    });
  } catch (error) {
    console.error(
      "SAVE POSTER WALLET BANK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save bank account.",
      },
      {
        status: 500,
      }
    );
  }
}