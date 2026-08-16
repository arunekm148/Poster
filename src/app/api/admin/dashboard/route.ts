import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function startOfToday() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
}

function startOfMonth() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
}

function startOfFinancialYear() {
  const now = new Date();

  const year =
    now.getMonth() >= 3
      ? now.getFullYear()
      : now.getFullYear() - 1;

  return new Date(
    year,
    3,
    1,
    0,
    0,
    0,
    0
  );
}

export async function GET() {
  try {
    const today = startOfToday();
    const month = startOfMonth();
    const financialYear =
      startOfFinancialYear();

    /*
    |--------------------------------------------------------------------------
    | AGENTS
    |--------------------------------------------------------------------------
    */

    const totalAgents =
      await prisma.user.count({
        where: {
          role: "AGENT",
        },
      });

    const activeAgents =
      await prisma.user.count({
        where: {
          role: "AGENT",
          isActive: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | MEDIA
    |--------------------------------------------------------------------------
    */

    const totalPosters =
      await prisma.media.count({
        where: {
          isActive: true,
          type: "IMAGE",
        },
      });

    const totalVideos =
      await prisma.media.count({
        where: {
          isActive: true,
          type: "VIDEO",
        },
      });

    /*
    |--------------------------------------------------------------------------
    | DOWNLOAD COUNTS
    |--------------------------------------------------------------------------
    */

    const totalDownloads =
      await prisma.download.count();

    const todayDownloads =
      await prisma.download.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      });

    const monthDownloads =
      await prisma.download.count({
        where: {
          createdAt: {
            gte: month,
          },
        },
      });

    const fyDownloads =
      await prisma.download.count({
        where: {
          createdAt: {
            gte: financialYear,
          },
        },
      });

    /*
    |--------------------------------------------------------------------------
    | REGISTRATIONS
    |--------------------------------------------------------------------------
    */

    const todayRegistrations =
      await prisma.user.count({
        where: {
          role: "AGENT",

          createdAt: {
            gte: today,
          },
        },
      });

    const monthRegistrations =
      await prisma.user.count({
        where: {
          role: "AGENT",

          createdAt: {
            gte: month,
          },
        },
      });

    const fyRegistrations =
      await prisma.user.count({
        where: {
          role: "AGENT",

          createdAt: {
            gte: financialYear,
          },
        },
      });

    /*
    |--------------------------------------------------------------------------
    | VISITOR + LOGIN ANALYTICS
    |--------------------------------------------------------------------------
    |
    | We have NOT created visitor/login history tables yet.
    |
    | Therefore temporarily return 0.
    |
    | Later we will create:
    |
    | PageVisit
    | LoginHistory
    |
    |--------------------------------------------------------------------------
    */

    const todayVisitors = 0;
    const monthVisitors = 0;
    const fyVisitors = 0;

    const todayLogins = 0;
    const monthLogins = 0;
    const fyLogins = 0;

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        stats: {
          totalAgents,
          activeAgents,

          totalPosters,
          totalVideos,

          totalDownloads,

          todayDownloads,
          monthDownloads,
          fyDownloads,

          todayVisitors,
          monthVisitors,
          fyVisitors,

          todayLogins,
          monthLogins,
          fyLogins,

          todayRegistrations,
          monthRegistrations,
          fyRegistrations,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load admin dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}