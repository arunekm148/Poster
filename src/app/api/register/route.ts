import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/* RUNTIME                                                                    */
/* -------------------------------------------------------------------------- */

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/* SUPABASE                                                                   */
/* -------------------------------------------------------------------------- */

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL is missing from environment variables."
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY is missing from environment variables."
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

/* -------------------------------------------------------------------------- */
/* EMAIL TRANSPORTER                                                          */
/* -------------------------------------------------------------------------- */

function createMailTransporter() {
  const smtpHost =
    process.env.SMTP_HOST;

  const smtpPort =
    Number(
      process.env.SMTP_PORT || "465"
    );

  const smtpUser =
    process.env.SMTP_USER;

  const smtpPass =
    process.env.SMTP_PASS;

  if (!smtpHost) {
    throw new Error(
      "SMTP_HOST is missing."
    );
  }

  if (!smtpUser) {
    throw new Error(
      "SMTP_USER is missing."
    );
  }

  if (!smtpPass) {
    throw new Error(
      "SMTP_PASS is missing."
    );
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,

    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* SEND REGISTRATION EMAIL                                                    */
/* -------------------------------------------------------------------------- */

async function sendRegistrationEmail({
  name,
  email,
  phone,
  password,
}: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const smtpUser =
    process.env.SMTP_USER;

  const fromName =
    process.env.SMTP_FROM_NAME ||
    "Agents India";

  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    "support@agentsindia.org";

  if (!smtpUser) {
    throw new Error(
      "SMTP_USER is missing."
    );
  }

  const transporter =
    createMailTransporter();

  const subject =
    "Registration Confirmation - Agents India";

  const text = `
Dear ${name},

Your registration with AgentsIndia.org has been completed successfully.

User ID: ${phone}
Password: ${password}

You can use the above credentials to login to your account.

You can change your password anytime from your Profile section after login.

Please keep your login details confidential.

For support:
${supportEmail}

Regards,
Agents India
agentsindia.org
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
    color:#1e293b;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
      background:#f4f7fb;
      padding:30px 15px;
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
            border-radius:12px;
            overflow:hidden;
          "
        >

          <tr>
            <td
              style="
                background:#0f172a;
                padding:28px;
                text-align:center;
              "
            >
              <div
                style="
                  color:#ffffff;
                  font-size:26px;
                  font-weight:bold;
                "
              >
                Agents India
              </div>

              <div
                style="
                  color:#cbd5e1;
                  font-size:14px;
                  margin-top:6px;
                "
              >
                agentsindia.org
              </div>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:32px;
              "
            >

              <h2
                style="
                  margin-top:0;
                  color:#0f172a;
                "
              >
                Registration Successful
              </h2>

              <p>
                Dear <strong>${name}</strong>,
              </p>

              <p
                style="
                  line-height:1.6;
                "
              >
                Your registration with
                <strong>AgentsIndia.org</strong>
                has been completed successfully.
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  margin:24px 0;
                  background:#f8fafc;
                  border:1px solid #e2e8f0;
                  border-radius:8px;
                "
              >

                <tr>
                  <td
                    style="
                      padding:16px 18px 5px;
                      color:#64748b;
                      font-size:13px;
                    "
                  >
                    User ID
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:0 18px 16px;
                      font-size:18px;
                      font-weight:bold;
                    "
                  >
                    ${phone}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:0 18px 5px;
                      color:#64748b;
                      font-size:13px;
                    "
                  >
                    Password
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:0 18px 18px;
                      font-size:18px;
                      font-weight:bold;
                    "
                  >
                    ${password}
                  </td>
                </tr>

              </table>

              <p
                style="
                  line-height:1.6;
                "
              >
                You can use the above credentials
                to login to your account.
              </p>

              <p
                style="
                  line-height:1.6;
                "
              >
                You can change your password anytime
                from your
                <strong>Profile</strong>
                section after login.
              </p>

              <p
                style="
                  line-height:1.6;
                  color:#64748b;
                "
              >
                Please keep your login details confidential.
              </p>

              <p
                style="
                  margin-top:25px;
                  line-height:1.6;
                "
              >
                Need help?<br />
                Contact:
                <strong>
                  ${supportEmail}
                </strong>
              </p>

            </td>
          </tr>

          <tr>
            <td
              style="
                padding:20px;
                text-align:center;
                background:#f8fafc;
                border-top:1px solid #e2e8f0;
                font-size:13px;
                color:#64748b;
              "
            >
              Regards,<br />
              <strong>Agents India</strong><br />
              agentsindia.org
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const info =
    await transporter.sendMail({
      from:
        `"${fromName}" <${smtpUser}>`,

      to:
        email,

      subject,

      text,

      html,
    });

  console.log(
    "✅ REGISTRATION EMAIL SENT:",
    info.messageId
  );
}

/* -------------------------------------------------------------------------- */
/* REGISTER AGENT                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request
) {
  let uploadedLogoPath:
    | string
    | null = null;

  try {
    /* ---------------------------------------------------------------------- */
    /* READ FORM DATA                                                         */
    /* ---------------------------------------------------------------------- */

    const formData =
      await request.formData();

    const name =
      String(
        formData.get("name") || ""
      ).trim();

    const phone =
      String(
        formData.get("phone") || ""
      )
        .replace(/\D/g, "")
        .slice(-10);

    const email =
      String(
        formData.get("email") || ""
      )
        .trim()
        .toLowerCase();

    const state =
      String(
        formData.get("state") || ""
      ).trim();

    const district =
      String(
        formData.get("district") || ""
      ).trim();

    const password =
      String(
        formData.get("password") || ""
      );

    const confirmPassword =
      String(
        formData.get(
          "confirmPassword"
        ) || ""
      );

    const logo =
      formData.get("logo");

    /* ---------------------------------------------------------------------- */
    /* VALIDATE NAME                                                          */
    /* ---------------------------------------------------------------------- */

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Full name is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE MOBILE                                                        */
    /* ---------------------------------------------------------------------- */

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE EMAIL                                                         */
    /* ---------------------------------------------------------------------- */

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE LOCATION                                                      */
    /* ---------------------------------------------------------------------- */

    if (!state) {
      return NextResponse.json(
        {
          success: false,
          message:
            "State is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!district) {
      return NextResponse.json(
        {
          success: false,
          message:
            "District is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE PASSWORD                                                      */
    /* ---------------------------------------------------------------------- */

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    if (
      password !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password and Confirm Password do not match.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK MOBILE                                                           */
    /* ---------------------------------------------------------------------- */

    const existingPhone =
      await prisma.user.findUnique({
        where: {
          phone,
        },

        select: {
          id: true,
        },
      });

    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This mobile number is already registered. Please login or use Forgot Password.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK EMAIL                                                            */
    /* ---------------------------------------------------------------------- */

    const existingEmail =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This email address is already registered. Please login or use Forgot Password.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* OPTIONAL LOGO                                                          */
    /* ---------------------------------------------------------------------- */

    let logoUrl:
      | string
      | null = null;

    if (
      logo instanceof File &&
      logo.size > 0
    ) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          logo.type
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Logo must be JPG, PNG or WEBP.",
          },
          {
            status: 400,
          }
        );
      }

      const maxSize =
        5 * 1024 * 1024;

      if (
        logo.size > maxSize
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Logo size must be below 5 MB.",
          },
          {
            status: 400,
          }
        );
      }

      let extension =
        "jpg";

      if (
        logo.type ===
        "image/png"
      ) {
        extension =
          "png";
      }

      if (
        logo.type ===
        "image/webp"
      ) {
        extension =
          "webp";
      }

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const storagePath =
        `agents/${fileName}`;

      const bytes =
        await logo.arrayBuffer();

      const buffer =
        Buffer.from(bytes);

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "agent-logos"
          )
          .upload(
            storagePath,
            buffer,
            {
              contentType:
                logo.type,
              cacheControl:
                "3600",
              upsert:
                false,
            }
          );

      if (uploadError) {
        console.error(
          "SUPABASE LOGO UPLOAD ERROR:",
          uploadError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to upload agent logo.",
          },
          {
            status: 500,
          }
        );
      }

      uploadedLogoPath =
        storagePath;

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "agent-logos"
          )
          .getPublicUrl(
            storagePath
          );

      logoUrl =
        publicUrlData
          .publicUrl;
    }

    /* ---------------------------------------------------------------------- */
    /* HASH PASSWORD                                                          */
    /* ---------------------------------------------------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    /* ---------------------------------------------------------------------- */
    /* CREATE AGENT                                                           */
    /* ---------------------------------------------------------------------- */

    const user =
      await prisma.user.create({
        data: {
          name,
          phone,
          email,

          password:
            hashedPassword,

          state,
          district,

          logoUrl,

          role:
            "AGENT",

          isActive:
            true,
        },

        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          state: true,
          district: true,
          role: true,
          logoUrl: true,
          isActive: true,
          createdAt: true,
        },
      });

    /* ---------------------------------------------------------------------- */
    /* SEND REGISTRATION EMAIL                                                */
    /* ---------------------------------------------------------------------- */

    let emailSent =
      false;

    try {
      console.log(
        "📧 SENDING REGISTRATION EMAIL TO:",
        email
      );

      await sendRegistrationEmail({
        name,
        email,
        phone,
        password,
      });

      emailSent =
        true;
    } catch (mailError) {
      console.error(
        "❌ REGISTRATION EMAIL ERROR:",
        mailError
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          emailSent
            ? "Agent registered successfully. Registration details have been sent to your email."
            : "Agent registered successfully, but confirmation email could not be sent.",

        emailSent,

        user,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "SELF REGISTRATION ERROR:",
      error
    );

    /* ---------------------------------------------------------------------- */
    /* DELETE SUPABASE LOGO IF DATABASE CREATE FAILED                         */
    /* ---------------------------------------------------------------------- */

    if (
      uploadedLogoPath
    ) {
      try {
        await supabase.storage
          .from(
            "agent-logos"
          )
          .remove([
            uploadedLogoPath,
          ]);
      } catch (
        cleanupError
      ) {
        console.error(
          "LOGO CLEANUP ERROR:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create agent.",
      },
      {
        status: 500,
      }
    );
  }
}