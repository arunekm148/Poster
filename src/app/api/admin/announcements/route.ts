import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* GET ANNOUNCEMENTS                                                          */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const activeOnly =
      searchParams.get("activeOnly") !==
      "false";

    const announcements =
      await prisma.adminAnnouncement.findMany(
        {
          where: activeOnly
            ? {
                isActive: true,
              }
            : undefined,

          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        }
      );

    return NextResponse.json(
      {
        success: true,
        announcements,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ADMIN ANNOUNCEMENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load announcements.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE ANNOUNCEMENT                                                        */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      String(
        body.adminId || ""
      ).trim();

    const message =
      String(
        body.message || ""
      ).trim();

    /* ---------------------------------------------------------------------- */
    /* VALIDATE ADMIN ID                                                      */
    /* ---------------------------------------------------------------------- */

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE MESSAGE                                                       */
    /* ---------------------------------------------------------------------- */

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Announcement message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Announcement cannot exceed 1000 characters.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ADMIN                                                            */
    /* ---------------------------------------------------------------------- */

    const admin =
      await prisma.user.findFirst({
        where: {
          id: adminId,
          role: "ADMIN",
          isActive: true,
        },

        select: {
          id: true,
          name: true,
          role: true,
        },
      });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid active Admin account was not found.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const announcement =
      await prisma.adminAnnouncement.create(
        {
          data: {
            message,
            isActive: true,
            createdById:
              admin.id,
          },

          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Announcement published successfully.",
        announcement,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE ADMIN ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to publish announcement.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE / ACTIVATE / DEACTIVATE ANNOUNCEMENT                                */
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

    const announcementId =
      String(
        body.announcementId || ""
      ).trim();

    const hasMessage =
      Object.prototype.hasOwnProperty.call(
        body,
        "message"
      );

    const hasIsActive =
      Object.prototype.hasOwnProperty.call(
        body,
        "isActive"
      );

    /* ---------------------------------------------------------------------- */
    /* VALIDATE                                                               */
    /* ---------------------------------------------------------------------- */

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!announcementId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Announcement ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !hasMessage &&
      !hasIsActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nothing to update.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ADMIN                                                            */
    /* ---------------------------------------------------------------------- */

    const admin =
      await prisma.user.findFirst({
        where: {
          id: adminId,
          role: "ADMIN",
          isActive: true,
        },

        select: {
          id: true,
        },
      });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ANNOUNCEMENT                                                     */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.adminAnnouncement.findUnique(
        {
          where: {
            id: announcementId,
          },

          select: {
            id: true,
          },
        }
      );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Announcement not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* BUILD UPDATE                                                           */
    /* ---------------------------------------------------------------------- */

    const updateData: {
      message?: string;
      isActive?: boolean;
    } = {};

    if (hasMessage) {
      const message =
        String(
          body.message || ""
        ).trim();

      if (!message) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Announcement message cannot be empty.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        message.length >
        1000
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Announcement cannot exceed 1000 characters.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.message =
        message;
    }

    if (hasIsActive) {
      updateData.isActive =
        Boolean(
          body.isActive
        );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const announcement =
      await prisma.adminAnnouncement.update(
        {
          where: {
            id:
              announcementId,
          },

          data: updateData,

          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Announcement updated successfully.",
        announcement,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE ADMIN ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update announcement.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE ANNOUNCEMENT                                                        */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const adminId =
      searchParams
        .get("adminId")
        ?.trim() || "";

    const announcementId =
      searchParams
        .get("announcementId")
        ?.trim() || "";

    /* ---------------------------------------------------------------------- */
    /* VALIDATE                                                               */
    /* ---------------------------------------------------------------------- */

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!announcementId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Announcement ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ADMIN                                                            */
    /* ---------------------------------------------------------------------- */

    const admin =
      await prisma.user.findFirst({
        where: {
          id: adminId,
          role: "ADMIN",
          isActive: true,
        },

        select: {
          id: true,
        },
      });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin access required.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ANNOUNCEMENT                                                     */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.adminAnnouncement.findUnique(
        {
          where: {
            id:
              announcementId,
          },

          select: {
            id: true,
          },
        }
      );

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Announcement not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DELETE                                                                 */
    /* ---------------------------------------------------------------------- */

    await prisma.adminAnnouncement.delete(
      {
        where: {
          id:
            announcementId,
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Announcement deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE ADMIN ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete announcement.",
      },
      {
        status: 500,
      }
    );
  }
}