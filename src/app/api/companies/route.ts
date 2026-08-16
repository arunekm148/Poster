import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const VALID_CATEGORIES = [
  "MOTOR",
  "HEALTH",
  "LIFE",
] as const;

type InsuranceCategory =
  (typeof VALID_CATEGORIES)[number];

function cleanCategories(
  value: unknown
): InsuranceCategory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) =>
          String(item)
            .trim()
            .toUpperCase()
        )
        .filter(
          (
            item
          ): item is InsuranceCategory =>
            VALID_CATEGORIES.includes(
              item as InsuranceCategory
            )
        )
    )
  );
}

/* -------------------------------------------------------------------------- */
/* GET COMPANIES                                                              */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const companies =
      await prisma.company.findMany({
        orderBy: [
          {
            isActive: "desc",
          },
          {
            name: "asc",
          },
        ],
      });

    return NextResponse.json(
      {
        success: true,
        companies,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET COMPANIES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load companies.",
        companies: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* ADD COMPANY                                                                */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const name =
      String(
        body.name || ""
      ).trim();

    const logoUrl =
      body.logoUrl
        ? String(
            body.logoUrl
          ).trim()
        : null;

    const categories =
      cleanCategories(
        body.categories
      );

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
    /* ---------------------------------------------------------------------- */

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      name.length >
      150
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company name is too long.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      categories.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Select at least one insurance category.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE CHECK                                                        */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.company.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },

        select: {
          id: true,
          name: true,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This company already exists.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const company =
      await prisma.company.create({
        data: {
          name,

          logoUrl,

          categories,

          isActive:
            true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Company added successfully.",
        company,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE COMPANY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to add company.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* EDIT / ENABLE / DISABLE COMPANY                                            */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      String(
        body.id || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK COMPANY                                                          */
    /* ---------------------------------------------------------------------- */

    const existingCompany =
      await prisma.company.findUnique({
        where: {
          id,
        },
      });

    if (!existingCompany) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* BUILD UPDATE DATA                                                      */
    /* ---------------------------------------------------------------------- */

    const updateData: {
      name?: string;
      logoUrl?: string | null;
      categories?: InsuranceCategory[];
      isActive?: boolean;
    } = {};

    /* COMPANY NAME */

    if (
      body.name !==
      undefined
    ) {
      const name =
        String(
          body.name || ""
        ).trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Company name is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        name.length >
        150
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Company name is too long.",
          },
          {
            status: 400,
          }
        );
      }

      const duplicate =
        await prisma.company.findFirst({
          where: {
            id: {
              not: id,
            },

            name: {
              equals: name,
              mode: "insensitive",
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
              "Another company already uses this name.",
          },
          {
            status: 409,
          }
        );
      }

      updateData.name =
        name;
    }

    /* LOGO */

    if (
      body.logoUrl !==
      undefined
    ) {
      const logo =
        body.logoUrl
          ? String(
              body.logoUrl
            ).trim()
          : "";

      updateData.logoUrl =
        logo || null;
    }

    /* CATEGORIES */

    if (
      body.categories !==
      undefined
    ) {
      const categories =
        cleanCategories(
          body.categories
        );

      if (
        categories.length ===
        0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Select at least one insurance category.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.categories =
        categories;
    }

    /* ACTIVE / DISABLED */

    if (
      body.isActive !==
      undefined
    ) {
      if (
        typeof body.isActive !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid company status.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.isActive =
        body.isActive;
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No company changes received.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE COMPANY                                                         */
    /* ---------------------------------------------------------------------- */

    const company =
      await prisma.company.update({
        where: {
          id,
        },

        data:
          updateData,
      });

    return NextResponse.json(
      {
        success: true,

        message:
          body.isActive !==
          undefined
            ? body.isActive
              ? "Company enabled successfully."
              : "Company disabled successfully."
            : "Company updated successfully.",

        company,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE COMPANY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update company.",
      },
      {
        status: 500,
      }
    );
  }
}