import {
  NextRequest,
  NextResponse,
} from "next/server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* CHANGE OWN PASSWORD                                                        */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      typeof body.userId ===
      "string"
        ? body.userId.trim()
        : "";

    const password =
      typeof body.password ===
      "string"
        ? body.password
        : "";

    /* USER */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User information is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* PASSWORD */

    if (
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must contain at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    /* FIND ACCOUNT */

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User account was not found.",
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
            "This account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    /* HASH */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /* UPDATE */

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        password:
          hashedPassword,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Password changed successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to change password.",
      },
      {
        status: 500,
      }
    );
  }
}