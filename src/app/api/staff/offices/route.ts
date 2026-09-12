import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown server error";
}

function parseOptionalDecimal(
  value: unknown
): string | null {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  const number = Number(text);

  if (!Number.isFinite(number)) {
    return null;
  }

  return String(number);
}

function parseRadius(
  value: unknown
): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 100;
  }

  return Math.max(
    20,
    Math.min(
      5000,
      Math.round(number)
    )
  );
}

async function ensureOwner(
  userId: string
) {
  const owner =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!owner) {
    return {
      ok: false as const,
      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Agent account was not found.",
          },
          {
            status: 404,
          }
        ),
    };
  }

  if (!owner.isActive) {
    return {
      ok: false as const,
      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Agent account is inactive.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    ok: true as const,
    owner,
  };
}

/* -------------------------------------------------------------------------- */
/* GET OFFICES                                                                */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const userId =
      cleanString(
        searchParams.get(
          "userId"
        )
      );

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const ownerCheck =
      await ensureOwner(
        userId
      );

    if (!ownerCheck.ok) {
      return ownerCheck.response;
    }

    const offices =
      await prisma.office.findMany({
        where: {
          userId,
        },

        orderBy: [
          {
            isHeadOffice:
              "desc",
          },
          {
            isActive:
              "desc",
          },
          {
            name:
              "asc",
          },
        ],

        select: {
          id: true,
          userId: true,

          code: true,
          name: true,

          address: true,
          district: true,
          state: true,
          pincode: true,

          latitude: true,
          longitude: true,

          radiusMeters: true,

          isHeadOffice: true,
          isActive: true,

          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              staff: true,
              attendance: true,
            },
          },
        },
      });

    const serialized =
      offices.map(
        (office) => ({
          ...office,

          latitude:
            office.latitude ===
            null
              ? null
              : office.latitude.toString(),

          longitude:
            office.longitude ===
            null
              ? null
              : office.longitude.toString(),
        })
      );

    return NextResponse.json(
      {
        success: true,
        offices:
          serialized,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET OFFICES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          getErrorMessage(
            error
          ),
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE OFFICE                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const userId =
      cleanString(
        body.userId
      );

    const code =
      cleanString(
        body.code
      ).toUpperCase();

    const name =
      cleanString(
        body.name
      );

    const address =
      cleanString(
        body.address
      );

    const district =
      cleanString(
        body.district
      );

    const state =
      cleanString(
        body.state
      );

    const pincode =
      cleanString(
        body.pincode
      );

    const latitude =
      parseOptionalDecimal(
        body.latitude
      );

    const longitude =
      parseOptionalDecimal(
        body.longitude
      );

    const radiusMeters =
      parseRadius(
        body.radiusMeters
      );

    const isHeadOffice =
      body.isHeadOffice ===
      true;

    const isActive =
      body.isActive !==
      false;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent/User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      latitude !== null &&
      (
        Number(latitude) <
          -90 ||
        Number(latitude) >
          90
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Latitude must be between -90 and 90.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      longitude !== null &&
      (
        Number(longitude) <
          -180 ||
        Number(longitude) >
          180
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Longitude must be between -180 and 180.",
        },
        {
          status: 400,
        }
      );
    }

    const ownerCheck =
      await ensureOwner(
        userId
      );

    if (!ownerCheck.ok) {
      return ownerCheck.response;
    }

    const duplicate =
      await prisma.office.findFirst({
        where: {
          userId,
          code,
        },
        select: {
          id: true,
        },
      });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This office code already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const office =
      await prisma.$transaction(
        async (tx) => {
          if (
            isHeadOffice
          ) {
            await tx.office.updateMany({
              where: {
                userId,
                isHeadOffice:
                  true,
              },
              data: {
                isHeadOffice:
                  false,
              },
            });
          }

          return tx.office.create({
            data: {
              userId,

              code,
              name,

              address:
                address ||
                null,

              district:
                district ||
                null,

              state:
                state ||
                null,

              pincode:
                pincode ||
                null,

              latitude,
              longitude,

              radiusMeters,

              isHeadOffice,
              isActive,
            },

            select: {
              id: true,
              userId: true,

              code: true,
              name: true,

              address: true,
              district: true,
              state: true,
              pincode: true,

              latitude: true,
              longitude: true,

              radiusMeters: true,

              isHeadOffice: true,
              isActive: true,

              createdAt: true,
              updatedAt: true,

              _count: {
                select: {
                  staff: true,
                  attendance:
                    true,
                },
              },
            },
          });
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          isHeadOffice
            ? "Main Branch created successfully."
            : "Branch Office created successfully.",

        office: {
          ...office,

          latitude:
            office.latitude ===
            null
              ? null
              : office.latitude.toString(),

          longitude:
            office.longitude ===
            null
              ? null
              : office.longitude.toString(),
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE OFFICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          getErrorMessage(
            error
          ),
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE OFFICE                                                              */
/* -------------------------------------------------------------------------- */

export async function PUT(
  request: Request
) {
  try {
    const body =
      await request.json();

    const id =
      cleanString(
        body.id
      );

    const userId =
      cleanString(
        body.userId
      );

    const code =
      cleanString(
        body.code
      ).toUpperCase();

    const name =
      cleanString(
        body.name
      );

    const address =
      cleanString(
        body.address
      );

    const district =
      cleanString(
        body.district
      );

    const state =
      cleanString(
        body.state
      );

    const pincode =
      cleanString(
        body.pincode
      );

    const latitude =
      parseOptionalDecimal(
        body.latitude
      );

    const longitude =
      parseOptionalDecimal(
        body.longitude
      );

    const radiusMeters =
      parseRadius(
        body.radiusMeters
      );

    const isHeadOffice =
      body.isHeadOffice ===
      true;

    const isActive =
      body.isActive !==
      false;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent/User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    const ownerCheck =
      await ensureOwner(
        userId
      );

    if (!ownerCheck.ok) {
      return ownerCheck.response;
    }

    const existing =
      await prisma.office.findFirst({
        where: {
          id,
          userId,
        },
        select: {
          id: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const duplicate =
      await prisma.office.findFirst({
        where: {
          userId,
          code,

          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This office code already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const office =
      await prisma.$transaction(
        async (tx) => {
          if (
            isHeadOffice
          ) {
            await tx.office.updateMany({
              where: {
                userId,
                isHeadOffice:
                  true,

                NOT: {
                  id,
                },
              },
              data: {
                isHeadOffice:
                  false,
              },
            });
          }

          return tx.office.update({
            where: {
              id,
            },

            data: {
              code,
              name,

              address:
                address ||
                null,

              district:
                district ||
                null,

              state:
                state ||
                null,

              pincode:
                pincode ||
                null,

              latitude,
              longitude,

              radiusMeters,

              isHeadOffice,
              isActive,
            },

            select: {
              id: true,
              userId: true,

              code: true,
              name: true,

              address: true,
              district: true,
              state: true,
              pincode: true,

              latitude: true,
              longitude: true,

              radiusMeters: true,

              isHeadOffice: true,
              isActive: true,

              createdAt: true,
              updatedAt: true,

              _count: {
                select: {
                  staff: true,
                  attendance:
                    true,
                },
              },
            },
          });
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Office updated successfully.",

        office: {
          ...office,

          latitude:
            office.latitude ===
            null
              ? null
              : office.latitude.toString(),

          longitude:
            office.longitude ===
            null
              ? null
              : office.longitude.toString(),
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE OFFICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          getErrorMessage(
            error
          ),
      },
      {
        status: 500,
      }
    );
  }
}
