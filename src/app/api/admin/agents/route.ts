import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AccountMode =
  | "SELF"
  | "SELF_STAFF"
  | "SELF_STAFF_SUBAGENT";

const VALID_ACCOUNT_MODES: AccountMode[] = [
  "SELF",
  "SELF_STAFF",
  "SELF_STAFF_SUBAGENT",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function cleanPhone(value: unknown) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function cleanEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getAccountMode(
  value: unknown
): AccountMode {
  const requested =
    cleanString(value).toUpperCase();

  if (
    VALID_ACCOUNT_MODES.includes(
      requested as AccountMode
    )
  ) {
    return requested as AccountMode;
  }

  return "SELF";
}

function getAccountModeName(
  mode: AccountMode
) {
  if (mode === "SELF_STAFF") {
    return "Self + Staff";
  }

  if (
    mode ===
    "SELF_STAFF_SUBAGENT"
  ) {
    return "Self + Staff + Sub Agent";
  }

  return "Self";
}

/* -------------------------------------------------------------------------- */
/* VERIFY ADMIN                                                               */
/* -------------------------------------------------------------------------- */

async function verifyAdmin(
  adminId: string
) {
  if (!adminId) {
    return null;
  }

  const admin =
    await prisma.user.findUnique({
      where: {
        id: adminId,
      },

      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

  if (!admin) {
    return null;
  }

  if (admin.role !== "ADMIN") {
    return null;
  }

  if (!admin.isActive) {
    return null;
  }

  return admin;
}

/* -------------------------------------------------------------------------- */
/* GET REGISTERED USERS                                                       */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const adminId =
      searchParams
        .get("adminId")
        ?.trim() || "";

    /* ---------------------------------------------------------------------- */
    /* VERIFY ADMIN                                                           */
    /* ---------------------------------------------------------------------- */

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
          agents: [],
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* LOAD USERS                                                             */
    /* ---------------------------------------------------------------------- */

    const agents =
      await prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          name: true,
          phone: true,
          email: true,

          role: true,
          accountMode: true,

          logoUrl: true,

          address: true,
          district: true,
          state: true,
          pincode: true,

          isActive: true,

          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              customers: true,
              policies: true,
              downloads: true,
              staffs: true,
              subAgents: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        count: agents.length,
        agents,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ADMIN AGENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load registered agents.",
        agents: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE AGENT                                                               */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      cleanString(
        body.adminId
      );

    const name =
      cleanString(
        body.name
      );

    const phone =
      cleanPhone(
        body.phone
      );

    const email =
      cleanEmail(
        body.email
      );

    const state =
      cleanString(
        body.state
      );

    const district =
      cleanString(
        body.district
      );

    const address =
      cleanString(
        body.address
      );

    const pincode =
      cleanString(
        body.pincode
      );

    const password =
      String(
        body.password ?? ""
      );

    const confirmPassword =
      String(
        body.confirmPassword ?? ""
      );

    const accountMode =
      getAccountMode(
        body.accountMode
      );

    /* ---------------------------------------------------------------------- */
    /* VERIFY ADMIN                                                           */
    /* ---------------------------------------------------------------------- */

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
    /* ---------------------------------------------------------------------- */

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent name is required.",
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
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

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
    /* DUPLICATE MOBILE                                                       */
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
            "This mobile number is already registered.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE EMAIL                                                        */
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
            "This email address is already registered.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PASSWORD HASH                                                          */
    /* ---------------------------------------------------------------------- */

    const passwordHash =
      await bcrypt.hash(
        password,
        10
      );

    /* ---------------------------------------------------------------------- */
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const agent =
      await prisma.user.create({
        data: {
          name,
          phone,
          email,

          password:
            passwordHash,

          role: "AGENT",

          accountMode,

          state,
          district,

          address:
            address || null,

          pincode:
            pincode || null,

          isActive: true,
        },

        select: {
          id: true,
          name: true,
          phone: true,
          email: true,

          role: true,
          accountMode: true,

          state: true,
          district: true,

          address: true,
          pincode: true,

          isActive: true,

          createdAt: true,
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          `${agent.name} created successfully with ${getAccountModeName(
            accountMode
          )} access.`,

        agent,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE ADMIN AGENT ERROR:",
      error
    );

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

/* -------------------------------------------------------------------------- */
/* UPDATE AGENT                                                               */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      cleanString(
        body.adminId
      );

    const userId =
      cleanString(
        body.userId
      );

    const action =
      cleanString(
        body.action
      ).toUpperCase();

    /* ---------------------------------------------------------------------- */
    /* VERIFY ADMIN                                                           */
    /* ---------------------------------------------------------------------- */

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE USER                                                          */
    /* ---------------------------------------------------------------------- */

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

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          accountMode: true,
        },
      });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Registered user not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "STATUS"
    ) {
      if (
        existingUser.role ===
        "ADMIN"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Admin account cannot be activated or deactivated from this screen.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        typeof body.isActive !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Valid status is required.",
          },
          {
            status: 400,
          }
        );
      }

      const updatedUser =
        await prisma.user.update({
          where: {
            id: userId,
          },

          data: {
            isActive:
              body.isActive,
          },

          select: {
            id: true,
            name: true,
            phone: true,
            isActive: true,
            accountMode: true,
          },
        });

      return NextResponse.json(
        {
          success: true,

          message:
            updatedUser.isActive
              ? `${updatedUser.name} activated successfully.`
              : `${updatedUser.name} deactivated successfully.`,

          user:
            updatedUser,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* ACCOUNT MODE                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "ACCOUNT_MODE"
    ) {
      if (
        existingUser.role ===
        "ADMIN"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Admin account mode cannot be changed.",
          },
          {
            status: 400,
          }
        );
      }

      const requestedMode =
        cleanString(
          body.accountMode
        ).toUpperCase();

      if (
        !VALID_ACCOUNT_MODES.includes(
          requestedMode as AccountMode
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid account mode.",
          },
          {
            status: 400,
          }
        );
      }

      const accountMode =
        requestedMode as AccountMode;

      const updatedUser =
        await prisma.user.update({
          where: {
            id: userId,
          },

          data: {
            accountMode,
          },

          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            accountMode: true,
          },
        });

      return NextResponse.json(
        {
          success: true,

          message:
            `${updatedUser.name}'s account access changed to ${getAccountModeName(
              accountMode
            )}.`,

          user:
            updatedUser,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PASSWORD RESET                                                         */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "RESET_PASSWORD"
    ) {
      const password =
        String(
          body.password ??
            ""
        );

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

      const passwordHash =
        await bcrypt.hash(
          password,
          10
        );

      await prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          password:
            passwordHash,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message:
            `${existingUser.name}'s password reset successfully.`,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* INVALID ACTION                                                         */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid admin action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "PATCH ADMIN AGENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update registered user.",
      },
      {
        status: 500,
      }
    );
  }
}