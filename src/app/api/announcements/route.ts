import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* GET ACTIVE ADMIN ANNOUNCEMENTS                                             */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const announcements =
      await prisma.adminAnnouncement.findMany({
        where: {
          isActive: true,
        },

        select: {
          id: true,
          message: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,

          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 20,
      });

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
      "GET ACTIVE ANNOUNCEMENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load announcements.",
        announcements: [],
      },
      {
        status: 500,
      }
    );
  }
}