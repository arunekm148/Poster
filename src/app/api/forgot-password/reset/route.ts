import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

import bcrypt from "bcryptjs";
import crypto from "crypto";

export const runtime =
  "nodejs";

function hashValue(
  value: string
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      value
    )
    .digest(
      "hex"
    );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const phone =
      String(
        body?.phone ||
          ""
      )
        .replace(
          /\D/g,
          ""
        )
        .slice(
          -10
        );

    const resetToken =
      String(
        body?.resetToken ||
          ""
      ).trim();

    const newPassword =
      String(
        body?.newPassword ||
          ""
      );

    const confirmPassword =
      String(
        body?.confirmPassword ||
          ""
      );

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Invalid mobile number.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !resetToken
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Password reset session is invalid.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      newPassword.length <
      6
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "New password must contain at least 6 characters.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "New Password and Confirm Password do not match.",
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
          phone,
        },

        select: {
          id:
            true,

          isActive:
            true,
        },
      });

    if (
      !user
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Account not found.",
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
            "This account is inactive. Please contact support.",
        },
        {
          status:
            403,
        }
      );
    }

    const resetTokenHash =
      hashValue(
        resetToken
      );

    const otpRecord =
      await prisma.passwordResetOtp.findFirst({
        where: {
          userId:
            user.id,

          resetTokenHash,

          verifiedAt: {
            not:
              null,
          },

          usedAt:
            null,

          resetTokenExpiresAt: {
            gt:
              new Date(),
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      });

    if (
      !otpRecord
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Password reset session has expired. Please request a new OTP.",
        },
        {
          status:
            400,
        }
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );

    /* ---------------------------------------------------------------------- */
    /* UPDATE PASSWORD                                                        */
    /* ---------------------------------------------------------------------- */

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id:
            user.id,
        },

        data: {
          password:
            hashedPassword,
        },
      }),

      prisma.passwordResetOtp.update({
        where: {
          id:
            otpRecord.id,
        },

        data: {
          usedAt:
            new Date(),
        },
      }),

      prisma.passwordResetOtp.updateMany({
        where: {
          userId:
            user.id,

          id: {
            not:
              otpRecord.id,
          },

          usedAt:
            null,
        },

        data: {
          usedAt:
            new Date(),
        },
      }),
    ]);

    console.log(
      "✅ PASSWORD RESET SUCCESS:",
      phone
    );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Password changed successfully.",
      },
      {
        status:
          200,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "PASSWORD RESET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to change password.",
      },
      {
        status:
          500,
      }
    );
  }
}