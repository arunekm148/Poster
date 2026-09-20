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

    const staff =
      await prisma.staff.findMany({
        where: {
          userId,
          isActive:
            true,
        },

        orderBy: {
          name:
            "asc",
        },

        select: {
          id:
            true,

          staffCode:
            true,

          name:
            true,

          designation:
            true,

          department:
            true,

          staffRole:
            true,

          workMode:
            true,

          loginEnabled:
            true,

          supervisor: {
            select: {
              id:
                true,

              staffCode:
                true,

              name:
                true,
            },
          },
        },
      });

    return NextResponse.json({
      success:
        true,

      report:
        "STAFF",

      period: {
        from,
        to,
      },

      summary: {
        activeStaff:
          staff.length,

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

        present:
          0,

        late:
          0,
      },

      rows:
        staff.map(
          (
            member
          ) => ({
            staff:
              member,

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
      "STAFF REPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to load Staff report.",
      },
      {
        status:
          500,
      }
    );
  }
}