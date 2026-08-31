import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

import crypto from "crypto";
import nodemailer from "nodemailer";

export const runtime =
  "nodejs";

/* -------------------------------------------------------------------------- */
/* HASH                                                                       */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* MASK EMAIL                                                                 */
/* -------------------------------------------------------------------------- */

function maskEmail(
  email: string
) {
  const [
    local,
    domain,
  ] =
    email.split("@");

  if (
    !local ||
    !domain
  ) {
    return "your registered email";
  }

  if (
    local.length ===
    1
  ) {
    return `${local}***@${domain}`;
  }

  if (
    local.length ===
    2
  ) {
    return `${local[0]}***@${domain}`;
  }

  return `${local.slice(
    0,
    2
  )}***${local.slice(
    -1
  )}@${domain}`;
}

/* -------------------------------------------------------------------------- */
/* MAIL TRANSPORTER                                                           */
/* -------------------------------------------------------------------------- */

function createTransporter() {
  const host =
    process.env.SMTP_HOST;

  const port =
    Number(
      process.env.SMTP_PORT ||
        "465"
    );

  const user =
    process.env.SMTP_USER;

  const pass =
    process.env.SMTP_PASS;

  if (
    !host ||
    !user ||
    !pass
  ) {
    throw new Error(
      "SMTP environment variables are missing."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure:
      port ===
      465,

    auth: {
      user,
      pass,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

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
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FIND USER                                                              */
    /* ---------------------------------------------------------------------- */

    const user =
      await prisma.user.findUnique({
        where: {
          phone,
        },

        select: {
          id:
            true,

          name:
            true,

          email:
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
            "No registered account was found with this mobile number.",
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
            "This account is currently inactive. Please contact support.",
        },
        {
          status:
            403,
        }
      );
    }

    if (
      !user.email
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "No email address is registered with this account. Please contact support@agentsindia.org.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* RESEND PROTECTION                                                      */
    /* ---------------------------------------------------------------------- */

    const latestOtp =
      await prisma.passwordResetOtp.findFirst({
        where: {
          userId:
            user.id,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          createdAt:
            true,
        },
      });

    if (
      latestOtp
    ) {
      const secondsSinceLastOtp =
        Math.floor(
          (
            Date.now() -
            latestOtp.createdAt.getTime()
          ) /
            1000
        );

      if (
        secondsSinceLastOtp <
        60
      ) {
        const remaining =
          60 -
          secondsSinceLastOtp;

        return NextResponse.json(
          {
            success:
              false,

            message:
              `Please wait ${remaining} seconds before requesting another OTP.`,
          },
          {
            status:
              429,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* INVALIDATE OLD OTPS                                                    */
    /* ---------------------------------------------------------------------- */

    await prisma.passwordResetOtp.updateMany({
      where: {
        userId:
          user.id,

        usedAt:
          null,
      },

      data: {
        usedAt:
          new Date(),
      },
    });

    /* ---------------------------------------------------------------------- */
    /* CREATE OTP                                                             */
    /* ---------------------------------------------------------------------- */

    const otp =
      crypto
        .randomInt(
          100000,
          1000000
        )
        .toString();

    const otpHash =
      hashValue(
        otp
      );

    const expiresAt =
      new Date(
        Date.now() +
          10 *
            60 *
            1000
      );

    const otpRecord =
      await prisma.passwordResetOtp.create({
        data: {
          userId:
            user.id,

          otpHash,

          expiresAt,
        },
      });

    /* ---------------------------------------------------------------------- */
    /* SEND EMAIL                                                             */
    /* ---------------------------------------------------------------------- */

    try {
      const transporter =
        createTransporter();

      const smtpUser =
        process.env.SMTP_USER!;

      const fromName =
        process.env.SMTP_FROM_NAME ||
        "Agents India";

      const supportEmail =
        process.env.SUPPORT_EMAIL ||
        "support@agentsindia.org";

      await transporter.sendMail({
        from:
          `"${fromName}" <${smtpUser}>`,

        to:
          user.email,

        subject:
          "Password Reset OTP - Agents India",

        text: `
Dear ${user.name},

We received a request to reset your Agents India account password.

Your 6-digit OTP is:

${otp}

This OTP is valid for 10 minutes.

Do not share this OTP with anyone.

If you did not request a password reset, you can ignore this email.

For support:
${supportEmail}

Regards,
Agents India
agentsindia.org
        `.trim(),

        html: `
<!DOCTYPE html>
<html>
<body
  style="
    margin:0;
    padding:0;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      padding:30px 15px;
      background:#f4f7fb;
    "
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            max-width:600px;
            background:#ffffff;
            border-radius:14px;
            overflow:hidden;
          "
        >

          <tr>
            <td
              style="
                background:#0f172a;
                padding:28px;
                text-align:center;
                color:#ffffff;
              "
            >
              <div
                style="
                  font-size:26px;
                  font-weight:bold;
                "
              >
                Agents India
              </div>

              <div
                style="
                  margin-top:6px;
                  color:#cbd5e1;
                  font-size:14px;
                "
              >
                Password Reset
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:32px;
                color:#1e293b;
              "
            >

              <p>
                Dear
                <strong>
                  ${user.name}
                </strong>,
              </p>

              <p
                style="
                  line-height:1.6;
                "
              >
                We received a request to reset your
                Agents India account password.
              </p>

              <p
                style="
                  text-align:center;
                  margin-top:28px;
                  color:#64748b;
                  font-size:13px;
                  font-weight:bold;
                "
              >
                YOUR OTP
              </p>

              <div
                style="
                  margin:10px auto 25px;
                  padding:18px;
                  max-width:280px;
                  text-align:center;
                  background:#eff6ff;
                  border:1px solid #bfdbfe;
                  border-radius:12px;
                  font-size:34px;
                  font-weight:bold;
                  letter-spacing:8px;
                  color:#1e3a8a;
                "
              >
                ${otp}
              </div>

              <p
                style="
                  text-align:center;
                  font-weight:bold;
                "
              >
                This OTP is valid for 10 minutes.
              </p>

              <p
                style="
                  margin-top:24px;
                  line-height:1.6;
                  color:#64748b;
                "
              >
                Do not share this OTP with anyone.
              </p>

              <p
                style="
                  line-height:1.6;
                  color:#64748b;
                "
              >
                If you did not request a password reset,
                you can safely ignore this email.
              </p>

              <p
                style="
                  margin-top:25px;
                  line-height:1.6;
                "
              >
                Need help?<br />
                ${supportEmail}
              </p>

            </td>
          </tr>

          <tr>
            <td
              style="
                background:#f8fafc;
                padding:20px;
                text-align:center;
                color:#64748b;
                font-size:13px;
              "
            >
              Agents India<br />
              agentsindia.org
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
      });

      console.log(
        "✅ PASSWORD RESET OTP EMAIL SENT:",
        user.email
      );
    } catch (
      mailError
    ) {
      console.error(
        "❌ PASSWORD RESET OTP EMAIL ERROR:",
        mailError
      );

      await prisma.passwordResetOtp.delete({
        where: {
          id:
            otpRecord.id,
        },
      });

      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unable to send OTP email. Please try again.",
        },
        {
          status:
            500,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success:
          true,

        message:
          "OTP sent successfully.",

        maskedEmail:
          maskEmail(
            user.email
          ),
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
      "FORGOT PASSWORD REQUEST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to process password reset request.",
      },
      {
        status:
          500,
      }
    );
  }
}