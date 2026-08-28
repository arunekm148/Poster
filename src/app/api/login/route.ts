import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanPhone(value: unknown) {
  return String(value || "")
    .replace(/\D/g, "")
    .trim();
}

function shouldShowDebugError(request: Request) {
  try {
    const host = new URL(request.url).hostname.toLowerCase();

    return (
      host === "arun.agentsindia.org" ||
      host === "test.agentsindia.org" ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* LOGIN                                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    /* ---------------------------------------------------------------------- */
    /* READ LOGIN DATA                                                        */
    /* ---------------------------------------------------------------------- */

    const body = await request.json();

    const phone = cleanPhone(body.phone);
    const password = String(body.password || "");

    /* ---------------------------------------------------------------------- */
    /* VALIDATE MOBILE                                                        */
    /* ---------------------------------------------------------------------- */

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Mobile number is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid 10 digit mobile number",
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
          message: "Password is required",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* 1. CHECK MAIN USER                                                     */
    /* AGENT / ADMIN                                                          */
    /* ---------------------------------------------------------------------- */

    const user = await prisma.user.findUnique({
      where: {
        phone,
      },

      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        password: true,
        role: true,
        logoUrl: true,
        state: true,
        district: true,
        isActive: true,
      },
    });

    if (user) {
      /* -------------------------------------------------------------------- */
      /* MAIN USER ACTIVE                                                     */
      /* -------------------------------------------------------------------- */

      if (!user.isActive) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Your account is inactive. Please contact administrator.",
          },
          {
            status: 403,
          }
        );
      }

      /* -------------------------------------------------------------------- */
      /* MAIN USER PASSWORD                                                   */
      /* -------------------------------------------------------------------- */

      const passwordCorrect = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordCorrect) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid mobile number or password",
          },
          {
            status: 401,
          }
        );
      }

      /* -------------------------------------------------------------------- */
      /* AGENT / ADMIN LOGIN SUCCESS                                          */
      /* -------------------------------------------------------------------- */

      return NextResponse.json(
        {
          success: true,
          message: "Login successful",

          accountType: "USER",

          user: {
            id: user.id,
            userId: user.id,
            staffId: null,

            name: user.name,
            phone: user.phone,
            email: user.email,

            role: user.role,
            accountType: "USER",

            logoUrl: user.logoUrl,

            state: user.state,
            district: user.district,
          },
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* 2. CHECK STAFF ACCOUNT                                                 */
    /* STAFF / SUPERVISOR                                                     */
    /* ---------------------------------------------------------------------- */

    const staff = await prisma.staff.findUnique({
      where: {
        phone,
      },

      select: {
        id: true,
        userId: true,

        staffCode: true,
        name: true,

        phone: true,
        whatsapp: true,
        email: true,

        password: true,

        loginEnabled: true,
        isActive: true,

        staffRole: true,

        designation: true,
        department: true,

        supervisorId: true,

        state: true,
        district: true,

        user: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            isActive: true,
          },
        },

        supervisor: {
          select: {
            id: true,
            staffCode: true,
            name: true,
          },
        },
      },
    });

    /* ---------------------------------------------------------------------- */
    /* ACCOUNT NOT FOUND                                                      */
    /* ---------------------------------------------------------------------- */

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid mobile number or password",
        },
        {
          status: 401,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK OWNER / AGENT                                                    */
    /* ---------------------------------------------------------------------- */

    if (!staff.user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The business account linked to this staff login is inactive. Please contact your agent.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STAFF ACTIVE                                                           */
    /* ---------------------------------------------------------------------- */

    if (!staff.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your staff account is inactive. Please contact your supervisor or agent.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STAFF LOGIN ENABLED                                                    */
    /* ---------------------------------------------------------------------- */

    if (!staff.loginEnabled) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Login access is disabled for this staff account. Please contact your agent.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STAFF PASSWORD                                                         */
    /* ---------------------------------------------------------------------- */

    const staffPasswordCorrect =
      await bcrypt.compare(
        password,
        staff.password
      );

    if (!staffPasswordCorrect) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid mobile number or password",
        },
        {
          status: 401,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STAFF / SUPERVISOR LOGIN SUCCESS                                       */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          staff.staffRole === "SUPERVISOR"
            ? "Supervisor login successful"
            : "Staff login successful",

        accountType: "STAFF",

        user: {
          id: staff.id,
          staffId: staff.id,
          userId: staff.userId,

          name: staff.name,

          staffCode: staff.staffCode,

          phone: staff.phone,
          whatsapp: staff.whatsapp,
          email: staff.email,

          role: staff.staffRole,
          accountType: "STAFF",

          designation: staff.designation,
          department: staff.department,

          supervisorId: staff.supervisorId,

          supervisor:
            staff.supervisor
              ? {
                  id: staff.supervisor.id,
                  staffCode:
                    staff.supervisor.staffCode,
                  name:
                    staff.supervisor.name,
                }
              : null,

          state: staff.state,
          district: staff.district,

          agent: {
            id: staff.user.id,
            name: staff.user.name,
            logoUrl: staff.user.logoUrl,
          },

          logoUrl: staff.user.logoUrl,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const showDebugError =
      shouldShowDebugError(request);

    return NextResponse.json(
      {
        success: false,

        message: showDebugError
          ? `Login failed: ${message}`
          : "Login failed. Please try again.",

        error: showDebugError
          ? message
          : undefined,
      },
      {
        status: 500,
      }
    );
  }
}