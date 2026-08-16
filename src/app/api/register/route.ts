import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/* -------------------------------------------------------------------------- */
/* REGISTER AGENT                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  let savedLogoPath: string | null = null;

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
        formData.get("confirmPassword") || ""
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

      const uploadDirectory =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "agent-logos"
        );

      await fs.mkdir(
        uploadDirectory,
        {
          recursive: true,
        }
      );

      const filePath =
        path.join(
          uploadDirectory,
          fileName
        );

      const bytes =
        await logo.arrayBuffer();

      const buffer =
        Buffer.from(bytes);

      await fs.writeFile(
        filePath,
        buffer
      );

      savedLogoPath =
        filePath;

      logoUrl =
        `/uploads/agent-logos/${fileName}`;
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
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          "Agent registered successfully. You can now login.",

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
    /* REMOVE LOGO IF DATABASE CREATE FAILED                                  */
    /* ---------------------------------------------------------------------- */

    if (savedLogoPath) {
      try {
        await fs.unlink(
          savedLogoPath
        );
      } catch {
        // Ignore cleanup error
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