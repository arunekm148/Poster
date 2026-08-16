import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;

function getTransporter() {
  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !SMTP_FROM
  ) {
    throw new Error(
      "Email configuration is missing."
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

type SendOtpEmailParams = {
  email: string;
  otp: string;
};

export async function sendOtpEmail({
  email,
  otp,
}: SendOtpEmailParams) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,

    subject:
      "Your Agent Platform Verification Code",

    text: `
Your Agent Platform verification code is:

${otp}

This OTP will expire shortly.

Do not share this OTP with anyone.

If you did not request this code, you can ignore this email.
    `.trim(),

    html: `
      <div
        style="
          font-family: Arial, sans-serif;
          max-width: 520px;
          margin: auto;
          padding: 30px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        "
      >
        <h2
          style="
            color: #0f172a;
            margin-bottom: 10px;
          "
        >
          Agent Platform
        </h2>

        <p style="color:#475569;">
          Your email verification code is:
        </p>

        <div
          style="
            font-size: 34px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #1d4ed8;
            padding: 20px 0;
          "
        >
          ${otp}
        </div>

        <p style="color:#475569;">
          This OTP will expire shortly.
        </p>

        <p
          style="
            color:#dc2626;
            font-weight:600;
          "
        >
          Never share this OTP with anyone.
        </p>

        <p
          style="
            margin-top:30px;
            font-size:12px;
            color:#64748b;
          "
        >
          If you did not request this code,
          you can safely ignore this email.
        </p>
      </div>
    `,
  });
}