import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| GET DOWNLOADS
|--------------------------------------------------------------------------
|
| Examples:
|
| /api/downloads?userId=USER_ID
| /api/downloads?mediaId=MEDIA_ID
|
|--------------------------------------------------------------------------
*/

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId =
      searchParams.get("userId")?.trim() || "";

    const mediaId =
      searchParams.get("mediaId")?.trim() || "";

    const downloads = await prisma.download.findMany({
      where: {
        ...(userId
          ? {
              userId,
            }
          : {}),

        ...(mediaId
          ? {
              mediaId,
            }
          : {}),
      },

      include: {
        media: {
          include: {
            company: true,
            category: true,

            uploadedBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                logoUrl: true,
              },
            },
          },
        },

        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      count: downloads.length,
      downloads,
    });
  } catch (error) {
    console.error("GET DOWNLOADS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load download history.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| RECORD DOWNLOAD
|--------------------------------------------------------------------------
|
| Called whenever an agent downloads a poster.
|
| Body:
|
| {
|   userId: "...",
|   mediaId: "..."
| }
|
|--------------------------------------------------------------------------
*/

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const mediaId =
      typeof body.mediaId === "string"
        ? body.mediaId.trim()
        : "";

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

    if (!mediaId) {
      return NextResponse.json(
        {
          success: false,
          message: "Poster ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK USER
    |--------------------------------------------------------------------------
    */

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK POSTER
    |--------------------------------------------------------------------------
    */

    const media = await prisma.media.findFirst({
      where: {
        id: mediaId,
        isActive: true,
        approvalStatus: "APPROVED",
      },

      select: {
        id: true,
        title: true,
      },
    });

    if (!media) {
      return NextResponse.json(
        {
          success: false,
          message: "Poster not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE DOWNLOAD HISTORY
    |--------------------------------------------------------------------------
    |
    | Every download creates a new record.
    | If same agent downloads same poster twice = 2 downloads.
    |
    |--------------------------------------------------------------------------
    */

    const download = await prisma.download.create({
      data: {
        userId,
        mediaId,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | TOTAL DOWNLOADS FOR THIS USER
    |--------------------------------------------------------------------------
    */

    const totalDownloads = await prisma.download.count({
      where: {
        userId,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | TOTAL DOWNLOADS FOR THIS POSTER
    |--------------------------------------------------------------------------
    */

    const posterDownloads = await prisma.download.count({
      where: {
        mediaId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Download recorded successfully.",
        download,
        totalDownloads,
        posterDownloads,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("RECORD DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to record download.",
      },
      {
        status: 500,
      }
    );
  }
}