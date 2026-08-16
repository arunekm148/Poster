import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* ADMIN VERIFY                                                               */
/* -------------------------------------------------------------------------- */

async function verifyAdmin(adminId: string) {
  if (!adminId) {
    return null;
  }

  const admin = await prisma.user.findUnique({
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

  if (
    !admin ||
    admin.role !== "ADMIN" ||
    !admin.isActive
  ) {
    return null;
  }

  return admin;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const adminId =
      searchParams.get("adminId")?.trim() || "";

    const admin = await verifyAdmin(adminId);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authorization failed.",
          exams: [],
          languages: [],
        },
        {
          status: 403,
        }
      );
    }

    const [exams, languages] = await Promise.all([
      prisma.exam.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          _count: {
            select: {
              modules: true,
              questions: true,
              tests: true,
            },
          },

          languages: {
            include: {
              language: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),

      prisma.examLanguage.findMany({
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      exams,
      languages,
    });
  } catch (error) {
    console.error(
      "GET ADMIN EXAMS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load exam management data.",
        exams: [],
        languages: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const adminId =
      typeof body.adminId === "string"
        ? body.adminId.trim()
        : "";

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    const admin = await verifyAdmin(adminId);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE EXAM                                                            */
    /* ---------------------------------------------------------------------- */

    if (action === "CREATE_EXAM") {
      const code = String(body.code || "")
        .trim()
        .toUpperCase();

      const title = String(
        body.title || ""
      ).trim();

      const description = String(
        body.description || ""
      ).trim();

      if (!code) {
        return NextResponse.json(
          {
            success: false,
            message: "Exam code is required.",
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
            message: "Exam title is required.",
          },
          {
            status: 400,
          }
        );
      }

      const existing =
        await prisma.exam.findUnique({
          where: {
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
              "An exam with this code already exists.",
          },
          {
            status: 409,
          }
        );
      }

      const exam = await prisma.exam.create({
        data: {
          code,
          title,
          description: description || null,
          createdById: admin.id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: `${exam.title} created successfully.`,
          exam,
        },
        {
          status: 201,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE LANGUAGE                                                        */
    /* ---------------------------------------------------------------------- */

    if (action === "CREATE_LANGUAGE") {
      const code = String(body.code || "")
        .trim()
        .toLowerCase();

      const name = String(
        body.name || ""
      ).trim();

      const nativeName = String(
        body.nativeName || ""
      ).trim();

      if (!code || !name || !nativeName) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Language code, name and native name are required.",
          },
          {
            status: 400,
          }
        );
      }

      const existing =
        await prisma.examLanguage.findUnique({
          where: {
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
              "This language already exists.",
          },
          {
            status: 409,
          }
        );
      }

      const language =
        await prisma.examLanguage.create({
          data: {
            code,
            name,
            nativeName,
          },
        });

      return NextResponse.json(
        {
          success: true,
          message: `${language.name} added successfully.`,
          language,
        },
        {
          status: 201,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* LINK LANGUAGE                                                          */
    /* ---------------------------------------------------------------------- */

    if (action === "LINK_LANGUAGE") {
      const examId = String(
        body.examId || ""
      ).trim();

      const languageId = String(
        body.languageId || ""
      ).trim();

      if (!examId || !languageId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Exam and language are required.",
          },
          {
            status: 400,
          }
        );
      }

      const [exam, language] =
        await Promise.all([
          prisma.exam.findUnique({
            where: {
              id: examId,
            },
          }),

          prisma.examLanguage.findUnique({
            where: {
              id: languageId,
            },
          }),
        ]);

      if (!exam) {
        return NextResponse.json(
          {
            success: false,
            message: "Exam not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (!language) {
        return NextResponse.json(
          {
            success: false,
            message: "Language not found.",
          },
          {
            status: 404,
          }
        );
      }

      const isDefault =
        body.isDefault === true;

      if (isDefault) {
        await prisma.examLanguageLink.updateMany({
          where: {
            examId,
          },

          data: {
            isDefault: false,
          },
        });
      }

      const link =
        await prisma.examLanguageLink.upsert({
          where: {
            examId_languageId: {
              examId,
              languageId,
            },
          },

          update: {
            isActive: true,

            ...(isDefault
              ? {
                  isDefault: true,
                }
              : {}),
          },

          create: {
            examId,
            languageId,
            isDefault,
          },

          include: {
            language: true,
          },
        });

      return NextResponse.json({
        success: true,
        message: `${language.name} linked to ${exam.title}.`,
        link,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid exam management action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "POST ADMIN EXAMS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to save exam management data.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH                                                                      */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const adminId =
      typeof body.adminId === "string"
        ? body.adminId.trim()
        : "";

    const action =
      typeof body.action === "string"
        ? body.action.trim().toUpperCase()
        : "";

    const admin = await verifyAdmin(adminId);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE EXAM                                                            */
    /* ---------------------------------------------------------------------- */

    if (action === "UPDATE_EXAM") {
      const examId = String(
        body.examId || ""
      ).trim();

      const code = String(body.code || "")
        .trim()
        .toUpperCase();

      const title = String(
        body.title || ""
      ).trim();

      const description = String(
        body.description || ""
      ).trim();

      if (!examId || !code || !title) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Exam ID, code and title are required.",
          },
          {
            status: 400,
          }
        );
      }

      const current =
        await prisma.exam.findUnique({
          where: {
            id: examId,
          },
        });

      if (!current) {
        return NextResponse.json(
          {
            success: false,
            message: "Exam not found.",
          },
          {
            status: 404,
          }
        );
      }

      const duplicate =
        await prisma.exam.findFirst({
          where: {
            code,

            NOT: {
              id: examId,
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
              "Another exam already uses this code.",
          },
          {
            status: 409,
          }
        );
      }

      const exam = await prisma.exam.update({
        where: {
          id: examId,
        },

        data: {
          code,
          title,
          description: description || null,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Exam updated successfully.",
        exam,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* EXAM STATUS                                                            */
    /* ---------------------------------------------------------------------- */

    if (action === "EXAM_STATUS") {
      const examId = String(
        body.examId || ""
      ).trim();

      if (!examId) {
        return NextResponse.json(
          {
            success: false,
            message: "Exam ID is required.",
          },
          {
            status: 400,
          }
        );
      }

      const data: {
        isActive?: boolean;
        isPublished?: boolean;
      } = {};

      if (
        typeof body.isActive === "boolean"
      ) {
        data.isActive = body.isActive;
      }

      if (
        typeof body.isPublished === "boolean"
      ) {
        data.isPublished =
          body.isPublished;
      }

      if (
        Object.keys(data).length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No status change supplied.",
          },
          {
            status: 400,
          }
        );
      }

      const exam = await prisma.exam.update({
        where: {
          id: examId,
        },

        data,
      });

      return NextResponse.json({
        success: true,
        message:
          "Exam status updated successfully.",
        exam,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* LANGUAGE STATUS                                                        */
    /* ---------------------------------------------------------------------- */

    if (action === "LANGUAGE_STATUS") {
      const languageId = String(
        body.languageId || ""
      ).trim();

      if (
        !languageId ||
        typeof body.isActive !== "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Language and status are required.",
          },
          {
            status: 400,
          }
        );
      }

      const language =
        await prisma.examLanguage.update({
          where: {
            id: languageId,
          },

          data: {
            isActive: body.isActive,
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "Language status updated.",
        language,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid exam management action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "PATCH ADMIN EXAMS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update exam management data.",
      },
      {
        status: 500,
      }
    );
  }
}