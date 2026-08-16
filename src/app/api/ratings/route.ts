import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| GET POSTER RATINGS
|--------------------------------------------------------------------------
|
| Examples:
|
| /api/ratings?mediaId=MEDIA_ID
| /api/ratings?mediaId=MEDIA_ID&userId=USER_ID
|
|--------------------------------------------------------------------------
*/

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const mediaId =
      searchParams.get("mediaId")?.trim() || "";

    const userId =
      searchParams.get("userId")?.trim() || "";

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
    | GET ALL RATINGS FOR POSTER
    |--------------------------------------------------------------------------
    */

    const ratings = await prisma.mediaRating.findMany({
      where: {
        mediaId,
      },

      select: {
        id: true,
        rating: true,
        userId: true,
        createdAt: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    /*
    |--------------------------------------------------------------------------
    | CALCULATE AVERAGE
    |--------------------------------------------------------------------------
    */

    const ratingCount = ratings.length;

    const ratingTotal = ratings.reduce(
      (total, item) => total + item.rating,
      0
    );

    const averageRating =
      ratingCount > 0
        ? Number((ratingTotal / ratingCount).toFixed(1))
        : 0;

    /*
    |--------------------------------------------------------------------------
    | CURRENT USER RATING
    |--------------------------------------------------------------------------
    */

    const myRating = userId
      ? ratings.find((item) => item.userId === userId)?.rating ?? 0
      : 0;

    return NextResponse.json({
      success: true,
      mediaId,
      averageRating,
      ratingCount,
      myRating,
      ratings,
    });
  } catch (error) {
    console.error("GET RATINGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load poster ratings.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| ADD / UPDATE RATING
|--------------------------------------------------------------------------
|
| Body:
|
| {
|   userId: "...",
|   mediaId: "...",
|   rating: 5
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

    const rating = Number(body.rating);

    /*
    |--------------------------------------------------------------------------
    | VALIDATE
    |--------------------------------------------------------------------------
    */

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

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Rating must be between 1 and 5.",
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
    | CREATE OR UPDATE USER RATING
    |--------------------------------------------------------------------------
    |
    | One user = one rating per poster.
    |
    |--------------------------------------------------------------------------
    */

    const savedRating = await prisma.mediaRating.upsert({
      where: {
        userId_mediaId: {
          userId,
          mediaId,
        },
      },

      update: {
        rating,
      },

      create: {
        userId,
        mediaId,
        rating,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | GET NEW RATING SUMMARY
    |--------------------------------------------------------------------------
    */

    const summary = await prisma.mediaRating.aggregate({
      where: {
        mediaId,
      },

      _avg: {
        rating: true,
      },

      _count: {
        rating: true,
      },
    });

    const averageRating = Number(
      (summary._avg.rating ?? 0).toFixed(1)
    );

    const ratingCount = summary._count.rating;

    return NextResponse.json({
      success: true,
      message: "Rating saved successfully.",
      rating: savedRating.rating,
      averageRating,
      ratingCount,
    });
  } catch (error) {
    console.error("SAVE RATING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to save rating.",
      },
      {
        status: 500,
      }
    );
  }
}