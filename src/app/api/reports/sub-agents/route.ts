import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

function clean(value: unknown) {
  return String(
    value ?? ""
  ).trim();
}

function indiaToday() {
  return new Date().toLocaleDateString(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",
    }
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const userId =
      clean(
        searchParams.get(
          "userId"
        )
      );

    const from =
      clean(
        searchParams.get(
          "from"
        )
      ) ||
      indiaToday();

    const to =
      clean(
        searchParams.get(
          "to"
        )
      ) ||
      from;

    if (!userId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "User ID is required.",
        },
        {
          status:
            400,
        }
      );
    }

    const subAgents =
      await prisma.subAgent.findMany({
        where: {
          userId,
        },

        orderBy: {
          name:
            "asc",
        },

        select: {
          id:
            true,

          code:
            true,

          name:
            true,

          phone:
            true,

          email:
            true,

          district:
            true,

          state:
            true,

          isActive:
            true,
        },
      });

    const activeSubAgents =
      subAgents.filter(
        (
          item
        ) =>
          item.isActive !==
          false
      );

    return NextResponse.json({
      success:
        true,

      report:
        "SUB_AGENTS",

      period: {
        from,
        to,
      },

      summary: {
        subAgents:
          activeSubAgents.length,

        policies:
          0,

        premium:
          0,

        renewals:
          0,

        customers:
          0,

        newBusiness:
          0,

        activePolicies:
          0,

        renewalDue:
          0,
      },

      rows:
        activeSubAgents.map(
          (
            subAgent
          ) => ({
            subAgent,

            policies:
              0,

            premium:
              0,

            renewals:
              0,

            customers:
              0,

            newBusiness:
              0,
          })
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "SUB AGENT REPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to load Sub-Agent report.",
      },
      {
        status:
          500,
      }
    );
  }
}