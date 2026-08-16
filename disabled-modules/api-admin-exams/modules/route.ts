import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* VERIFY ADMIN                                                               */
/* -------------------------------------------------------------------------- */

async function verifyAdmin(adminId: string) {
  if (!adminId) {
    return null;
  }

  const admin =
    await prisma.user.findUnique({
      where: {
        id: adminId,
      },

      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

  if (!admin) {
    return null;
  }

  if (admin.role !== "ADMIN") {
    return null;
  }

  if (!admin.isActive) {
    return null;
  }

  return admin;
}

/* -------------------------------------------------------------------------- */
/* GET MODULES                                                                */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const adminId =
      searchParams
        .get("adminId")
        ?.trim() || "";

    const examId =
      searchParams
        .get("examId")
        ?.trim() || "";

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
          modules: [],
        },
        {
          status: 403,
        }
      );
    }

    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Exam ID is required.",
          modules: [],
        },
        {
          status: 400,
        }
      );
    }

    const exam =
      await prisma.exam.findUnique({
        where: {
          id: examId,
        },

        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          isActive: true,
          isPublished: true,
        },
      });

    if (!exam) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Exam not found.",
          modules: [],
        },
        {
          status: 404,
        }
      );
    }

    const modules =
      await prisma.examModule.findMany({
        where: {
          examId,
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],

        include: {
          _count: {
            select: {
              chapters: true,
              questions: true,
              tests: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        exam,
        modules,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET EXAM MODULES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load exam modules.",
        modules: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE MODULE                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      typeof body.adminId ===
      "string"
        ? body.adminId.trim()
        : "";

    const examId =
      typeof body.examId ===
      "string"
        ? body.examId.trim()
        : "";

    const code =
      typeof body.code ===
      "string"
        ? body.code
            .trim()
            .toUpperCase()
        : "";

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const emoji =
      typeof body.emoji ===
      "string"
        ? body.emoji.trim()
        : "";

    const sortOrder =
      Number.isFinite(
        Number(body.sortOrder)
      )
        ? Number(body.sortOrder)
        : 0;

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    if (!examId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Exam ID is required.",
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
            "Module code is required.",
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
            "Module name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const exam =
      await prisma.exam.findUnique({
        where: {
          id: examId,
        },

        select: {
          id: true,
          title: true,
        },
      });

    if (!exam) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Exam not found.",
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      await prisma.examModule.findFirst({
        where: {
          examId,
          code,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A module with this code already exists for this exam.",
        },
        {
          status: 409,
        }
      );
    }

    const module =
      await prisma.examModule.create({
        data: {
          examId,
          code,
          name,
          description:
            description || null,
          emoji:
            emoji || null,
          sortOrder,
        },

        include: {
          _count: {
            select: {
              chapters: true,
              questions: true,
              tests: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: `${module.name} created successfully.`,
        module,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE EXAM MODULE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create module.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE MODULE                                                              */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      typeof body.adminId ===
      "string"
        ? body.adminId.trim()
        : "";

    const moduleId =
      typeof body.moduleId ===
      "string"
        ? body.moduleId.trim()
        : "";

    const action =
      typeof body.action ===
      "string"
        ? body.action
            .trim()
            .toUpperCase()
        : "";

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await prisma.examModule.findUnique({
        where: {
          id: moduleId,
        },

        select: {
          id: true,
          examId: true,
          code: true,
          name: true,
          isActive: true,
          isPublished: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EDIT MODULE                                                            */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "UPDATE_MODULE"
    ) {
      const code =
        typeof body.code ===
        "string"
          ? body.code
              .trim()
              .toUpperCase()
          : "";

      const name =
        typeof body.name ===
        "string"
          ? body.name.trim()
          : "";

      const description =
        typeof body.description ===
        "string"
          ? body.description.trim()
          : "";

      const emoji =
        typeof body.emoji ===
        "string"
          ? body.emoji.trim()
          : "";

      const sortOrder =
        Number.isFinite(
          Number(body.sortOrder)
        )
          ? Number(
              body.sortOrder
            )
          : 0;

      if (!code) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Module code is required.",
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
              "Module name is required.",
          },
          {
            status: 400,
          }
        );
      }

      const duplicate =
        await prisma.examModule.findFirst({
          where: {
            examId:
              existing.examId,

            code,

            NOT: {
              id: moduleId,
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
              "Another module already uses this code.",
          },
          {
            status: 409,
          }
        );
      }

      const module =
        await prisma.examModule.update({
          where: {
            id: moduleId,
          },

          data: {
            code,
            name,
            description:
              description || null,
            emoji:
              emoji || null,
            sortOrder,
          },

          include: {
            _count: {
              select: {
                chapters: true,
                questions: true,
                tests: true,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Module updated successfully.",
        module,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* MODULE STATUS                                                          */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "MODULE_STATUS"
    ) {
      const data: {
        isActive?: boolean;
        isPublished?: boolean;
      } = {};

      if (
        typeof body.isActive ===
        "boolean"
      ) {
        data.isActive =
          body.isActive;
      }

      if (
        typeof body.isPublished ===
        "boolean"
      ) {
        data.isPublished =
          body.isPublished;
      }

      if (
        Object.keys(data)
          .length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No module status change supplied.",
          },
          {
            status: 400,
          }
        );
      }

      const module =
        await prisma.examModule.update({
          where: {
            id: moduleId,
          },

          data,

          include: {
            _count: {
              select: {
                chapters: true,
                questions: true,
                tests: true,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Module status updated successfully.",
        module,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* SORT ORDER                                                             */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "SORT_ORDER"
    ) {
      const sortOrder =
        Number(body.sortOrder);

      if (
        !Number.isFinite(
          sortOrder
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Valid sort order is required.",
          },
          {
            status: 400,
          }
        );
      }

      const module =
        await prisma.examModule.update({
          where: {
            id: moduleId,
          },

          data: {
            sortOrder,
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Module order updated.",
        module,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid module action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "PATCH EXAM MODULE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update module.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE MODULE                                                              */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      typeof body.adminId ===
      "string"
        ? body.adminId.trim()
        : "";

    const moduleId =
      typeof body.moduleId ===
      "string"
        ? body.moduleId.trim()
        : "";

    const admin =
      await verifyAdmin(
        adminId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const module =
      await prisma.examModule.findUnique({
        where: {
          id: moduleId,
        },

        include: {
          _count: {
            select: {
              chapters: true,
              questions: true,
              tests: true,
            },
          },
        },
      });

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Protect existing content.
     * We should not accidentally delete
     * chapters, questions or tests.
     */

    if (
      module._count.chapters >
        0 ||
      module._count.questions >
        0 ||
      module._count.tests > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This module contains chapters, questions or tests. Remove that content before deleting the module.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.examModule.delete({
      where: {
        id: moduleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${module.name} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "DELETE EXAM MODULE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete module.",
      },
      {
        status: 500,
      }
    );
  }
}