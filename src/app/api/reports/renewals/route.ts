import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const {
    searchParams,
  } =
    new URL(
      request.url
    );

  const userId =
    String(
      searchParams.get(
        "userId"
      ) || ""
    ).trim();

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
      "RENEWALS",

    summary: {
      dueToday:
        0,

      due7Days:
        0,

      due30Days:
        0,

      overdue:
        0,

      renewed:
        0,

      renewalPremium:
        0,
    },

    rows: [],
  });
}