import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

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

  if (
    !admin ||
    admin.role !== "ADMIN" ||
    !admin.isActive
  ) {
    return null;
  }

  return admin;
}

/* -------------------------------------------------------------------------- */
/* GET SETTING                                                                */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const key =
      String(
        searchParams.get("key") || ""
      ).trim();

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Setting key is required.",
          setting: null,
        },
        {
          status: 400,
        }
      );
    }

    const setting =
      await prisma.platformSetting.findUnique({
        where: {
          key,
        },
      });

    /*
     * Safe default:
     * If setting does not exist yet,
     * treat feature as OFF.
     */

    if (!setting) {
      return NextResponse.json({
        success: true,

        setting: {
          key,
          value: "false",
          description: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      setting,
    });
  } catch (error) {
    console.error(
      "GET PLATFORM SETTING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load platform setting.",
        setting: null,
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH SETTING                                                              */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      typeof body.adminId === "string"
        ? body.adminId.trim()
        : "";

    const key =
      typeof body.key === "string"
        ? body.key.trim()
        : "";

    const value =
      typeof body.value === "string"
        ? body.value.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

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

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Setting key is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      value !== "true" &&
      value !== "false"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Setting value must be true or false.",
        },
        {
          status: 400,
        }
      );
    }

    const setting =
      await prisma.platformSetting.upsert({
        where: {
          key,
        },

        update: {
          value,
          description:
            description || null,
        },

        create: {
          key,
          value,
          description:
            description || null,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Platform setting updated successfully.",
      setting,
    });
  } catch (error) {
    console.error(
      "PATCH PLATFORM SETTING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update platform setting.",
      },
      {
        status: 500,
      }
    );
  }
}