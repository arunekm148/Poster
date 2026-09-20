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
      "ENQUIRIES",

    summary: {
      enquiries:
        0,

      new:
        0,

      followUp:
        0,

      converted:
        0,

      closed:
        0,
    },

    rows: [],
  });
}