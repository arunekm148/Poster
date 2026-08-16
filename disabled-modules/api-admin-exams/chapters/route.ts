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
/* GET CHAPTERS                                                               */
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

    const moduleId =
      searchParams
        .get("moduleId")
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
          chapters: [],
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
          chapters: [],
        },
        {
          status: 400,
        }
      );
    }

    if (!moduleId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module ID is required.",
          chapters: [],
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
          chapters: [],
        },
        {
          status: 404,
        }
      );
    }

    const module =
      await prisma.examModule.findFirst({
        where: {
          id: moduleId,
          examId,
        },

        select: {
          id: true,
          examId: true,
          code: true,
          name: true,
          description: true,
          emoji: true,
          sortOrder: true,
          isActive: true,
          isPublished: true,
        },
      });

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module not found for this exam.",
          chapters: [],
        },
        {
          status: 404,
        }
      );
    }

    const chapters =
      await prisma.examChapter.findMany({
        where: {
          moduleId,
        },

        orderBy: [
          {
            sortOrder:
              "asc",
          },
          {
            createdAt:
              "asc",
          },
        ],

        include: {
          _count: {
            select: {
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
        module,
        chapters,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET EXAM CHAPTERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load chapters.",
        chapters: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE CHAPTER                                                             */
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

    const moduleId =
      typeof body.moduleId ===
      "string"
        ? body.moduleId.trim()
        : "";

    const code =
      typeof body.code ===
      "string"
        ? body.code
            .trim()
            .toUpperCase()
        : "";

    const title =
      typeof body.title ===
      "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const sortOrder =
      Number.isFinite(
        Number(
          body.sortOrder
        )
      )
        ? Number(
            body.sortOrder
          )
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

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chapter code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chapter title is required.",
        },
        {
          status: 400,
        }
      );
    }

    const module =
      await prisma.examModule.findFirst({
        where: {
          id: moduleId,
          examId,
        },

        select: {
          id: true,
          name: true,
        },
      });

    if (!module) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Module not found for this exam.",
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      await prisma.examChapter.findFirst({
        where: {
          moduleId,
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
            "A chapter with this code already exists in this module.",
        },
        {
          status: 409,
        }
      );
    }

    const chapter =
      await prisma.examChapter.create({
        data: {
          moduleId,
          code,
          title,
          description:
            description ||
            null,
          sortOrder,
        },

        include: {
          _count: {
            select: {
              questions: true,
              tests: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: `${chapter.title} created successfully.`,
        chapter,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE EXAM CHAPTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create chapter.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE CHAPTER                                                             */
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

    const chapterId =
      typeof body.chapterId ===
      "string"
        ? body.chapterId.trim()
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

    if (!chapterId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chapter ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await prisma.examChapter.findUnique({
        where: {
          id: chapterId,
        },

        select: {
          id: true,
          moduleId: true,
          code: true,
          title: true,
          isActive: true,
          isPublished: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chapter not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EDIT CHAPTER                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "UPDATE_CHAPTER"
    ) {
      const code =
        typeof body.code ===
        "string"
          ? body.code
              .trim()
              .toUpperCase()
          : "";

      const title =
        typeof body.title ===
        "string"
          ? body.title.trim()
          : "";

      const description =
        typeof body.description ===
        "string"
          ? body.description.trim()
          : "";

      const sortOrder =
        Number.isFinite(
          Number(
            body.sortOrder
          )
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
              "Chapter code is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (!title) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Chapter title is required.",
          },
          {
            status: 400,
          }
        );
      }

      const duplicate =
        await prisma.examChapter.findFirst({
          where: {
            moduleId:
              existing.moduleId,

            code,

            NOT: {
              id: chapterId,
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
              "Another chapter already uses this code.",
          },
          {
            status: 409,
          }
        );
      }

      const chapter =
        await prisma.examChapter.update({
          where: {
            id: chapterId,
          },

          data: {
            code,
            title,
            description:
              description ||
              null,
            sortOrder,
          },

          include: {
            _count: {
              select: {
                questions: true,
                tests: true,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Chapter updated successfully.",
        chapter,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "CHAPTER_STATUS"
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
              "No chapter status change supplied.",
          },
          {
            status: 400,
          }
        );
      }

      const chapter =
        await prisma.examChapter.update({
          where: {
            id: chapterId,
          },

          data,

          include: {
            _count: {
              select: {
                questions: true,
                tests: true,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Chapter status updated successfully.",
        chapter,
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
        Number(
          body.sortOrder
        );

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

      const chapter =
        await prisma.examChapter.update({
          where: {
            id: chapterId,
          },

          data: {
            sortOrder,
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Chapter order updated.",
        chapter,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid chapter action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "PATCH EXAM CHAPTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update chapter.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE CHAPTER                                                             */
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

    const chapterId =
      typeof body.chapterId ===
      "string"
        ? body.chapterId.trim()
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

    if (!chapterId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chapter ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const chapter =
      await prisma.examChapter.findUnique({
        where: {
          id: chapterId,
        },

        include: {
          _count: {
            select: {
              questions: true,
              tests: true,
            },
          },
        },
      });

    if (!chapter) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chapter not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      chapter._count.questions >
        0 ||
      chapter._count.tests >
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This chapter contains questions or tests. Remove that content before deleting the chapter.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.examChapter.delete({
      where: {
        id: chapterId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${chapter.title} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "DELETE EXAM CHAPTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete chapter.",
      },
      {
        status: 500,
      }
    );
  }
}