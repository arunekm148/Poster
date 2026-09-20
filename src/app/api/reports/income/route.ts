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
      "INCOME",

    summary: {
      premium:
        0,

      customerPremium:
        0,

      commission:
        0,

      margin:
        0,

      payable:
        0,
    },

    rows: [],
  });
}