import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type CorrectOption =
  | "A"
  | "B"
  | "C"
  | "D";

type Difficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

const VALID_OPTIONS: CorrectOption[] = [
  "A",
  "B",
  "C",
  "D",
];

const VALID_DIFFICULTIES: Difficulty[] = [
  "EASY",
  "MEDIUM",
  "HARD",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanString(value: unknown) {
  return String(
    value ?? ""
  ).trim();
}

function cleanInteger(
  value: unknown,
  fallback = 0
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return fallback;
  }

  return Math.max(
    0,
    Math.trunc(
      number
    )
  );
}

/* -------------------------------------------------------------------------- */
/* VERIFY ADMIN                                                               */
/* -------------------------------------------------------------------------- */

async function verifyAdmin(
  adminId: string
) {
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
/* GET QUESTIONS                                                              */
/* -------------------------------------------------------------------------- */

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

    const adminId =
      cleanString(
        searchParams.get(
          "adminId"
        )
      );

    const examId =
      cleanString(
        searchParams.get(
          "examId"
        )
      );

    const moduleId =
      cleanString(
        searchParams.get(
          "moduleId"
        )
      );

    const chapterId =
      cleanString(
        searchParams.get(
          "chapterId"
        )
      );

    /* ---------------------------------------------------------------------- */
    /* ADMIN                                                                  */
    /* ---------------------------------------------------------------------- */

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

          exam: null,
          module: null,
          chapter: null,
          languages: [],
          questions: [],
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* REQUIRED IDS                                                           */
    /* ---------------------------------------------------------------------- */

    if (!examId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Exam ID is required.",

          exam: null,
          module: null,
          chapter: null,
          languages: [],
          questions: [],
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

          exam: null,
          module: null,
          chapter: null,
          languages: [],
          questions: [],
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EXAM                                                                   */
    /* ---------------------------------------------------------------------- */

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

          exam: null,
          module: null,
          chapter: null,
          languages: [],
          questions: [],
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* MODULE                                                                 */
    /* ---------------------------------------------------------------------- */

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

          exam,
          module: null,
          chapter: null,
          languages: [],
          questions: [],
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHAPTER                                                                */
    /* ---------------------------------------------------------------------- */

    let chapter:
      | {
          id: string;
          moduleId: string;
          code: string;
          title: string;
          description:
            | string
            | null;
          sortOrder: number;
          isActive: boolean;
          isPublished: boolean;
        }
      | null = null;

    if (chapterId) {
      chapter =
        await prisma.examChapter.findFirst({
          where: {
            id: chapterId,
            moduleId,
          },

          select: {
            id: true,
            moduleId: true,
            code: true,
            title: true,
            description: true,
            sortOrder: true,
            isActive: true,
            isPublished: true,
          },
        });

      if (!chapter) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Chapter not found for this module.",

            exam,
            module,
            chapter: null,
            languages: [],
            questions: [],
          },
          {
            status: 404,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* LANGUAGES LINKED TO EXAM                                               */
    /* ---------------------------------------------------------------------- */

    const linkedLanguages =
      await prisma.examLanguageLink.findMany({
        where: {
          examId,
          isActive: true,

          language: {
            isActive: true,
          },
        },

        orderBy: [
          {
            isDefault:
              "desc",
          },
          {
            createdAt:
              "asc",
          },
        ],

        select: {
          language: {
            select: {
              id: true,
              code: true,
              name: true,
              nativeName: true,
              isActive: true,
            },
          },
        },
      });

    let languages =
      linkedLanguages.map(
        (item) =>
          item.language
      );

    /*
     * Important fallback:
     *
     * If this exam does not yet have language links,
     * return all active languages.
     *
     * This keeps the Add Question button usable while
     * you are setting up the exam.
     */

    if (
      languages.length ===
      0
    ) {
      languages =
        await prisma.examLanguage.findMany({
          where: {
            isActive: true,
          },

          orderBy: {
            name: "asc",
          },

          select: {
            id: true,
            code: true,
            name: true,
            nativeName: true,
            isActive: true,
          },
        });
    }

    /* ---------------------------------------------------------------------- */
    /* QUESTIONS                                                              */
    /* ---------------------------------------------------------------------- */

    const questions =
      await prisma.examQuestion.findMany({
        where: {
          examId,
          moduleId,

          ...(chapterId
            ? {
                chapterId,
              }
            : {}),
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

        select: {
          id: true,

          examId: true,
          moduleId: true,
          chapterId: true,

          code: true,

          questionType:
            true,

          correctOption:
            true,

          difficulty:
            true,

          sortOrder:
            true,

          isActive:
            true,

          isPublished:
            true,

          createdAt:
            true,

          updatedAt:
            true,

          translations: {
            orderBy: {
              language: {
                name: "asc",
              },
            },

            select: {
              id: true,
              questionId:
                true,
              languageId:
                true,

              questionText:
                true,

              optionA:
                true,

              optionB:
                true,

              optionC:
                true,

              optionD:
                true,

              explanation:
                true,

              language: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  nativeName:
                    true,
                  isActive:
                    true,
                },
              },
            },
          },

          _count: {
            select: {
              testLinks:
                true,

              answers:
                true,

              bookmarks:
                true,
            },
          },
        },
      });

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        exam,
        module,
        chapter,

        languages,
        questions,

        count:
          questions.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ADMIN QUESTIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to load questions.",

        exam: null,
        module: null,
        chapter: null,
        languages: [],
        questions: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE QUESTION                                                            */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      cleanString(
        body.adminId
      );

    const examId =
      cleanString(
        body.examId
      );

    const moduleId =
      cleanString(
        body.moduleId
      );

    const chapterId =
      cleanString(
        body.chapterId
      );

    const code =
      cleanString(
        body.code
      ).toUpperCase();

    const correctOption =
      cleanString(
        body.correctOption
      ).toUpperCase();

    const difficulty =
      cleanString(
        body.difficulty
      ).toUpperCase();

    const sortOrder =
      cleanInteger(
        body.sortOrder,
        0
      );

    /* ---------------------------------------------------------------------- */
    /* ADMIN                                                                  */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
    /* ---------------------------------------------------------------------- */

    if (
      !examId ||
      !moduleId
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Exam ID and Module ID are required.",
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
            "Question code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !VALID_OPTIONS.includes(
        correctOption as CorrectOption
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Correct option must be A, B, C or D.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !VALID_DIFFICULTIES.includes(
        difficulty as Difficulty
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Difficulty must be EASY, MEDIUM or HARD.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE MODULE                                                        */
    /* ---------------------------------------------------------------------- */

    const module =
      await prisma.examModule.findFirst({
        where: {
          id: moduleId,
          examId,
        },

        select: {
          id: true,
        },
      });

    if (!module) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Module does not belong to this exam.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* VALIDATE CHAPTER                                                       */
    /* ---------------------------------------------------------------------- */

    if (chapterId) {
      const chapter =
        await prisma.examChapter.findFirst({
          where: {
            id: chapterId,
            moduleId,
          },

          select: {
            id: true,
          },
        });

      if (!chapter) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Chapter does not belong to this module.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE CODE                                                         */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.examQuestion.findFirst({
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
            `Question code ${code} already exists in this exam.`,
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const question =
      await prisma.examQuestion.create({
        data: {
          examId,
          moduleId,

          chapterId:
            chapterId ||
            null,

          code,

          questionType:
            "MCQ",

          correctOption:
            correctOption as CorrectOption,

          difficulty:
            difficulty as Difficulty,

          sortOrder,

          isActive:
            true,

          isPublished:
            false,
        },

        select: {
          id: true,

          examId: true,
          moduleId: true,
          chapterId: true,

          code: true,

          questionType:
            true,

          correctOption:
            true,

          difficulty:
            true,

          sortOrder:
            true,

          isActive:
            true,

          isPublished:
            true,

          createdAt:
            true,

          updatedAt:
            true,
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          `${question.code} created successfully.`,

        question,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE QUESTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to create question.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE QUESTION                                                            */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      cleanString(
        body.adminId
      );

    const questionId =
      cleanString(
        body.questionId
      );

    const action =
      cleanString(
        body.action
      ).toUpperCase();

    /* ---------------------------------------------------------------------- */
    /* ADMIN                                                                  */
    /* ---------------------------------------------------------------------- */

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

    if (!questionId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Question ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await prisma.examQuestion.findUnique({
        where: {
          id: questionId,
        },

        select: {
          id: true,
          examId: true,
          moduleId: true,
          chapterId: true,
          code: true,
          isActive: true,
          isPublished: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Question not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE MAIN QUESTION                                                   */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "UPDATE_QUESTION"
    ) {
      const code =
        cleanString(
          body.code
        ).toUpperCase();

      const chapterId =
        cleanString(
          body.chapterId
        );

      const correctOption =
        cleanString(
          body.correctOption
        ).toUpperCase();

      const difficulty =
        cleanString(
          body.difficulty
        ).toUpperCase();

      const sortOrder =
        cleanInteger(
          body.sortOrder,
          0
        );

      if (!code) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Question code is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !VALID_OPTIONS.includes(
          correctOption as CorrectOption
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Correct option must be A, B, C or D.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !VALID_DIFFICULTIES.includes(
          difficulty as Difficulty
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Difficulty must be EASY, MEDIUM or HARD.",
          },
          {
            status: 400,
          }
        );
      }

      /* -------------------------------------------------------------------- */
      /* CHAPTER CHECK                                                        */
      /* -------------------------------------------------------------------- */

      if (chapterId) {
        const chapter =
          await prisma.examChapter.findFirst({
            where: {
              id: chapterId,

              moduleId:
                existing.moduleId,
            },

            select: {
              id: true,
            },
          });

        if (!chapter) {
          return NextResponse.json(
            {
              success: false,

              message:
                "Chapter does not belong to this module.",
            },
            {
              status: 400,
            }
          );
        }
      }

      /* -------------------------------------------------------------------- */
      /* DUPLICATE CODE                                                       */
      /* -------------------------------------------------------------------- */

      const duplicate =
        await prisma.examQuestion.findFirst({
          where: {
            examId:
              existing.examId,

            code,

            NOT: {
              id: questionId,
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
              `Another question already uses code ${code}.`,
          },
          {
            status: 409,
          }
        );
      }

      const question =
        await prisma.examQuestion.update({
          where: {
            id: questionId,
          },

          data: {
            code,

            chapterId:
              chapterId ||
              null,

            correctOption:
              correctOption as CorrectOption,

            difficulty:
              difficulty as Difficulty,

            sortOrder,
          },
        });

      return NextResponse.json({
        success: true,

        message:
          "Question updated successfully.",

        question,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "QUESTION_STATUS"
    ) {
      const data: {
        isActive?:
          boolean;

        isPublished?:
          boolean;
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
        Object.keys(
          data
        ).length === 0
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "No status change was supplied.",
          },
          {
            status: 400,
          }
        );
      }

      const question =
        await prisma.examQuestion.update({
          where: {
            id: questionId,
          },

          data,
        });

      return NextResponse.json({
        success: true,

        message:
          "Question status updated successfully.",

        question,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* INVALID ACTION                                                         */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: false,

        message:
          "Invalid question action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE QUESTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to update question.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE QUESTION                                                            */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const adminId =
      cleanString(
        body.adminId
      );

    const questionId =
      cleanString(
        body.questionId
      );

    /* ---------------------------------------------------------------------- */
    /* ADMIN                                                                  */
    /* ---------------------------------------------------------------------- */

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

    if (!questionId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Question ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FIND                                                                   */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.examQuestion.findUnique({
        where: {
          id: questionId,
        },

        select: {
          id: true,
          code: true,

          _count: {
            select: {
              testLinks:
                true,

              answers:
                true,

              bookmarks:
                true,
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Question not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DELETE                                                                 */
    /* ---------------------------------------------------------------------- */

    await prisma.examQuestion.delete({
      where: {
        id: questionId,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        `${existing.code} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "DELETE QUESTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to delete question.",
      },
      {
        status: 500,
      }
    );
  }
}