import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

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

    const otp =
      String(
        body?.otp ||
          ""
      ).replace(
        /\D/g,
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
      !/^\d{6}$/.test(
        otp
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please enter a valid 6-digit OTP.",
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

    const otpRecord =
      await prisma.passwordResetOtp.findFirst({
        where: {
          userId:
            user.id,

          usedAt:
            null,
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
            "OTP not found. Please request a new OTP.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      otpRecord.expiresAt.getTime() <
      Date.now()
    ) {
      await prisma.passwordResetOtp.update({
        where: {
          id:
            otpRecord.id,
        },

        data: {
          usedAt:
            new Date(),
        },
      });

      return NextResponse.json(
        {
          success:
            false,

          message:
            "OTP has expired. Please request a new OTP.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      otpRecord.attempts >=
      5
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Maximum OTP attempts exceeded. Please request a new OTP.",
        },
        {
          status:
            429,
        }
      );
    }

    const enteredOtpHash =
      hashValue(
        otp
      );

    if (
      enteredOtpHash !==
      otpRecord.otpHash
    ) {
      const newAttempts =
        otpRecord.attempts +
        1;

      await prisma.passwordResetOtp.update({
        where: {
          id:
            otpRecord.id,
        },

        data: {
          attempts:
            newAttempts,

          ...(newAttempts >=
          5
            ? {
                usedAt:
                  new Date(),
              }
            : {}),
        },
      });

      const attemptsLeft =
        Math.max(
          0,
          5 -
            newAttempts
        );

      return NextResponse.json(
        {
          success:
            false,

          message:
            attemptsLeft >
            0
              ? `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`
              : "Maximum OTP attempts exceeded. Please request a new OTP.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* OTP VERIFIED                                                           */
    /* ---------------------------------------------------------------------- */

    const resetToken =
      crypto
        .randomBytes(
          32
        )
        .toString(
          "hex"
        );

    const resetTokenHash =
      hashValue(
        resetToken
      );

    const resetTokenExpiresAt =
      new Date(
        Date.now() +
          15 *
            60 *
            1000
      );

    await prisma.passwordResetOtp.update({
      where: {
        id:
          otpRecord.id,
      },

      data: {
        verifiedAt:
          new Date(),

        resetTokenHash,

        resetTokenExpiresAt,
      },
    });

    console.log(
      "✅ PASSWORD RESET OTP VERIFIED:",
      phone
    );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "OTP verified successfully.",

        resetToken,
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
      "VERIFY PASSWORD RESET OTP ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to verify OTP.",
      },
      {
        status:
          500,
      }
    );
  }
}