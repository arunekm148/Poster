import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AccountMode =
  | "SELF"
  | "SELF_STAFF"
  | "SELF_STAFF_SUBAGENT";

const VALID_ACCOUNT_MODES: AccountMode[] = [
  "SELF",
  "SELF_STAFF",
  "SELF_STAFF_SUBAGENT",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

/* -------------------------------------------------------------------------- */
/* GET CURRENT ACCOUNT MODE                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const userId =
      cleanString(
        searchParams.get("userId")
      );

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
          name: true,
          role: true,
          isActive: true,
          accountMode: true,
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

    if (user.role !== "AGENT") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account mode is available for Agent accounts only.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        accountMode:
          user.accountMode,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ACCOUNT MODE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load account mode.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CHANGE ACCOUNT MODE                                                        */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      cleanString(
        body.userId
      );

    const requestedMode =
      cleanString(
        body.accountMode
      ).toUpperCase();

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
      !VALID_ACCOUNT_MODES.includes(
        requestedMode as AccountMode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid account mode.",
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
          name: true,
          role: true,
          isActive: true,
          accountMode: true,
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

    if (user.role !== "AGENT") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only Agent accounts can change working mode.",
        },
        {
          status: 403,
        }
      );
    }

    const accountMode =
      requestedMode as AccountMode;

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          accountMode,
        },

        select: {
          id: true,
          name: true,
          accountMode: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Account mode updated successfully.",
        accountMode:
          updatedUser.accountMode,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PATCH ACCOUNT MODE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to change account mode.",
      },
      {
        status: 500,
      }
    );
  }
}