import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

async function verifyAdmin(adminId: string) {
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
/* GET SETTINGS                                                               */
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

    return NextResponse.json({
      success: true,

      setting: setting || {
        key,
        value: "false",
        description: null,
      },
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
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE SETTING                                                             */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      String(
        body.adminId || ""
      ).trim();

    const key =
      String(
        body.key || ""
      ).trim();

    const value =
      String(
        body.value || ""
      ).trim();

    const description =
      String(
        body.description || ""
      ).trim();

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
      "UPDATE PLATFORM SETTING ERROR:",
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