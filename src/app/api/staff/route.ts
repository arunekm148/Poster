import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanPhone(value: unknown): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function parseDate(value: unknown): Date | null {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  const date = new Date(`${text}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown server error";
}

/* -------------------------------------------------------------------------- */
/* GET STAFF                                                                  */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
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

    /* ---------------------------------------------------------------------- */
    /* CONFIRM OWNER EXISTS                                                   */
    /* ---------------------------------------------------------------------- */

    const owner =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account was not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* LOAD STAFF                                                             */
    /* ---------------------------------------------------------------------- */

    const staff =
      await prisma.staff.findMany({
        where: {
          userId,
        },

        orderBy: [
          {
            isActive: "desc",
          },
          {
            name: "asc",
          },
        ],

        select: {
          id: true,
          userId: true,

          staffCode: true,
          name: true,

          phone: true,
          whatsapp: true,
          email: true,

          staffRole: true,
          designation: true,
          department: true,

          supervisorId: true,

          address: true,
          district: true,
          state: true,
          pincode: true,

          joiningDate: true,
          notes: true,

          loginEnabled: true,
          isActive: true,

          inactiveReason: true,
          inactiveAt: true,

          createdAt: true,
          updatedAt: true,

          supervisor: {
            select: {
              id: true,
              staffCode: true,
              name: true,
              staffRole: true,
            },
          },

          _count: {
            select: {
              teamMembers: true,
              attendance: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        staff,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET STAFF FULL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          getErrorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE STAFF                                                               */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const body =
      await request.json();

    /* ---------------------------------------------------------------------- */
    /* CLEAN INPUT                                                            */
    /* ---------------------------------------------------------------------- */

    const userId =
      cleanString(
        body.userId
      );

    const staffCode =
      cleanString(
        body.staffCode
      ).toUpperCase();

    const name =
      cleanString(
        body.name
      );

    const phone =
      cleanPhone(
        body.phone
      );

    const password =
      String(
        body.password ?? ""
      );

    const whatsapp =
      cleanPhone(
        body.whatsapp
      );

    const email =
      cleanString(
        body.email
      ).toLowerCase();

    const staffRole =
      cleanString(
        body.staffRole
      ).toUpperCase() ===
      "SUPERVISOR"
        ? "SUPERVISOR"
        : "STAFF";

    const designation =
      cleanString(
        body.designation
      );

    const department =
      cleanString(
        body.department
      );

    const supervisorId =
      cleanString(
        body.supervisorId
      );

    const address =
      cleanString(
        body.address
      );

    const district =
      cleanString(
        body.district
      );

    const state =
      cleanString(
        body.state
      );

    const pincode =
      cleanString(
        body.pincode
      );

    const joiningDate =
      parseDate(
        body.joiningDate
      );

    const notes =
      cleanString(
        body.notes
      );

    const loginEnabled =
      body.loginEnabled !== false;

    /* ---------------------------------------------------------------------- */
    /* BASIC VALIDATION                                                       */
    /* ---------------------------------------------------------------------- */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent/User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!staffCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 10 digit staff mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      loginEnabled &&
      password.length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff password must contain at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      whatsapp &&
      !/^[6-9]\d{9}$/.test(
        whatsapp
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid WhatsApp number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK AGENT / OWNER                                                    */
    /* ---------------------------------------------------------------------- */

    const owner =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          isActive: true,
        },
      });

    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!owner.isActive) {
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

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE STAFF CODE                                                   */
    /* ---------------------------------------------------------------------- */

    const existingCode =
      await prisma.staff.findFirst({
        where: {
          userId,
          staffCode,
        },

        select: {
          id: true,
        },
      });

    if (existingCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This staff code already exists.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE STAFF PHONE                                                  */
    /* ---------------------------------------------------------------------- */

    const existingStaffPhone =
      await prisma.staff.findFirst({
        where: {
          phone,
        },

        select: {
          id: true,
        },
      });

    if (existingStaffPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This mobile number is already used by another staff account.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK PHONE AGAINST AGENT / ADMIN                                      */
    /* ---------------------------------------------------------------------- */

    const existingUserPhone =
      await prisma.user.findUnique({
        where: {
          phone,
        },

        select: {
          id: true,
        },
      });

    if (existingUserPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This mobile number is already registered as an Agent/Admin login.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EMAIL DUPLICATE                                                        */
    /* ---------------------------------------------------------------------- */

    if (email) {
      const existingStaffEmail =
        await prisma.staff.findFirst({
          where: {
            email,
          },

          select: {
            id: true,
          },
        });

      if (existingStaffEmail) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This email address is already used by another staff account.",
          },
          {
            status: 409,
          }
        );
      }

      const existingUserEmail =
        await prisma.user.findUnique({
          where: {
            email,
          },

          select: {
            id: true,
          },
        });

      if (existingUserEmail) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This email address is already registered as an Agent/Admin account.",
          },
          {
            status: 409,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* SUPERVISOR VALIDATION                                                  */
    /* ---------------------------------------------------------------------- */

    if (supervisorId) {
      const supervisor =
        await prisma.staff.findFirst({
          where: {
            id:
              supervisorId,

            userId,

            isActive:
              true,

            staffRole:
              "SUPERVISOR",
          },

          select: {
            id: true,
          },
        });

      if (!supervisor) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected supervisor is invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* PASSWORD HASH                                                          */
    /* ---------------------------------------------------------------------- */

    /*
     * Prisma requires Staff.password to always be a String.
     *
     * When staff login is enabled:
     *   - hash the password entered by the user.
     *
     * When staff login is disabled:
     *   - create a random unusable password and hash it.
     *
     * loginEnabled still controls whether the staff account can log in.
     */

    const passwordSource =
      loginEnabled
        ? password
        : `disabled-${crypto.randomUUID()}`;

    const passwordHash =
      await bcrypt.hash(
        passwordSource,
        10
      );

    /* ---------------------------------------------------------------------- */
    /* CREATE STAFF                                                           */
    /* ---------------------------------------------------------------------- */

    const staff =
      await prisma.staff.create({
        data: {
          userId,

          staffCode,
          name,

          phone,

          whatsapp:
            whatsapp || null,

          email:
            email || null,

          designation:
            designation || null,

          department:
            department || null,

          staffRole,

          supervisorId:
            supervisorId || null,

          address:
            address || null,

          district:
            district || null,

          state:
            state || null,

          pincode:
            pincode || null,

          joiningDate,

          notes:
            notes || null,

          loginEnabled,

          password:
            passwordHash,

          isActive:
            true,
        },

        select: {
          id: true,
          userId: true,

          staffCode: true,
          name: true,

          phone: true,
          whatsapp: true,
          email: true,

          staffRole: true,
          designation: true,
          department: true,

          supervisorId: true,

          address: true,
          district: true,
          state: true,
          pincode: true,

          joiningDate: true,
          notes: true,

          loginEnabled: true,
          isActive: true,

          createdAt: true,
          updatedAt: true,

          supervisor: {
            select: {
              id: true,
              staffCode: true,
              name: true,
              staffRole: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Staff created successfully.",
        staff,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE STAFF FULL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          getErrorMessage(error),
      },
      {
        status: 500,
      }
    );
  }
}