import {
  NextRequest,
  NextResponse,
} from "next/server";

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

    return NextResponse.json({
      success:
        true,

      report:
        "POLICIES",

      period: {
        from,
        to,
      },

      summary: {
        policies:
          0,

        premium:
          0,

        newBusiness:
          0,

        renewals:
          0,

        activePolicies:
          0,

        expiredPolicies:
          0,

        renewalDue:
          0,

        customers:
          0,
      },

      rows: [],
    });
  } catch (
    error
  ) {
    console.error(
      "POLICY REPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to load policy report.",
      },
      {
        status:
          500,
      }
    );
  }
}