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
      "CUSTOMERS",

    summary: {
      customers:
        0,

      newCustomers:
        0,

      activeCustomers:
        0,

      policies:
        0,
    },

    rows: [],
  });
}