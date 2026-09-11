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

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown server error";
}

function normalizeWorkMode(value: unknown) {
  const mode =
    cleanString(value).toUpperCase();

  if (
    mode === "WORK_FROM_HOME" ||
    mode === "HYBRID" ||
    mode === "FIELD"
  ) {
    return mode;
  }

  return "OFFICE";
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
          message: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

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
          message: "Agent account was not found.",
        },
        {
          status: 404,
        }
      );
    }

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

          officeId: true,

          staffCode: true,
          name: true,

          phone: true,
          whatsapp: true,
          email: true,

          staffRole: true,
          workMode: true,

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

          office: {
            select: {
              id: true,
              code: true,
              name: true,
              isHeadOffice: true,
              isActive: true,
            },
          },

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

    const userId =
      cleanString(body.userId);

    const officeId =
      cleanString(body.officeId) ||
      null;

    const staffCode =
      cleanString(
        body.staffCode
      ).toUpperCase();

    const name =
      cleanString(body.name);

    const phone =
      cleanPhone(body.phone);

    const password =
      String(
        body.password ?? ""
      );

    const whatsapp =
      cleanPhone(body.whatsapp);

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

    const workMode =
      normalizeWorkMode(
        body.workMode
      );

    const designation =
      cleanString(
        body.designation
      );

    const department =
      cleanString(
        body.department
      );

    const supervisorId =
      staffRole === "SUPERVISOR"
        ? null
        : cleanString(
            body.supervisorId
          ) || null;

    const address =
      cleanString(body.address);

    const district =
      cleanString(body.district);

    const state =
      cleanString(body.state);

    const pincode =
      cleanString(body.pincode);

    const joiningDate =
      parseDate(
        body.joiningDate
      );

    const notes =
      cleanString(body.notes);

    const loginEnabled =
      body.loginEnabled !== false;

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

    if (
      officeId
    ) {
      const office =
        await prisma.office.findFirst({
          where: {
            id: officeId,
            userId,
            isActive: true,
          },
          select: {
            id: true,
          },
        });

      if (!office) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected office is invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      (workMode === "OFFICE" ||
        workMode === "HYBRID") &&
      !officeId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please assign an office for Office or Hybrid staff.",
        },
        {
          status: 400,
        }
      );
    }

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

    if (supervisorId) {
      const supervisor =
        await prisma.staff.findFirst({
          where: {
            id: supervisorId,
            userId,
            isActive: true,
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

    const passwordSource =
      loginEnabled
        ? password
        : `disabled-${crypto.randomUUID()}`;

    const passwordHash =
      await bcrypt.hash(
        passwordSource,
        10
      );

    const staff =
      await prisma.staff.create({
        data: {
          userId,

          officeId,

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

          workMode:
            workMode as any,

          supervisorId,

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

          isActive: true,
        },

        select: {
          id: true,
          userId: true,
          officeId: true,

          staffCode: true,
          name: true,

          phone: true,
          whatsapp: true,
          email: true,

          staffRole: true,
          workMode: true,

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

          office: {
            select: {
              id: true,
              code: true,
              name: true,
              isHeadOffice: true,
            },
          },

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