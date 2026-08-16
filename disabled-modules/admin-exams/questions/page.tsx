"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AdminUser = {
  id?: string;
  name?: string;
  role?: string;
};

type Language = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isActive: boolean;
};

type Translation = {
  id: string;
  questionId: string;
  languageId: string;

  questionText: string;

  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;

  explanation?: string | null;

  language: Language;
};

type Question = {
  id: string;

  examId: string;
  moduleId: string;
  chapterId?: string | null;

  code: string;

  questionType: "MCQ";

  correctOption:
    | "A"
    | "B"
    | "C"
    | "D";

  difficulty:
    | "EASY"
    | "MEDIUM"
    | "HARD";

  sortOrder: number;

  isActive: boolean;
  isPublished: boolean;

  createdAt: string;
  updatedAt: string;

  translations: Translation[];

  _count?: {
    testLinks?: number;
    answers?: number;
    bookmarks?: number;
  };
};

type ExamInfo = {
  id: string;
  code: string;
  title: string;
};

type ModuleInfo = {
  id: string;
  code: string;
  name: string;
};

type ChapterInfo = {
  id: string;
  code: string;
  title: string;
};

type QuestionForm = {
  code: string;

  languageId: string;

  questionText: string;

  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;

  correctOption:
    | "A"
    | "B"
    | "C"
    | "D";

  explanation: string;

  difficulty:
    | "EASY"
    | "MEDIUM"
    | "HARD";

  sortOrder: string;
};

/* -------------------------------------------------------------------------- */
/* EMPTY FORM                                                                 */
/* -------------------------------------------------------------------------- */

const EMPTY_FORM: QuestionForm = {
  code: "",

  languageId: "",

  questionText: "",

  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",

  correctOption: "A",

  explanation: "",

  difficulty: "MEDIUM",

  sortOrder: "0",
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function isAdminRole(role?: string) {
  return (
    String(role || "")
      .trim()
      .toUpperCase() === "ADMIN"
  );
}

function languageLabel(
  language?: Language | null
) {
  if (!language) {
    return "Language";
  }

  if (
    language.nativeName &&
    language.nativeName !==
      language.name
  ) {
    return `${language.nativeName} - ${language.name}`;
  }

  return language.name;
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function QuestionsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">

            <div className="text-4xl">
              ❓
            </div>

            <p className="mt-3 font-black text-slate-700">
              Loading Question Bank...
            </p>

          </div>
        </main>
      }
    >
      <QuestionsContent />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

function QuestionsContent() {
  const searchParams =
    useSearchParams();

  const examId =
    String(
      searchParams.get("examId") ||
        ""
    ).trim();

  const moduleId =
    String(
      searchParams.get("moduleId") ||
        ""
    ).trim();

  const chapterId =
    String(
      searchParams.get("chapterId") ||
        ""
    ).trim();

  /* ------------------------------------------------------------------------ */
  /* ADMIN                                                                    */
  /* ------------------------------------------------------------------------ */

  const [admin, setAdmin] =
    useState<AdminUser | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* DATA                                                                     */
  /* ------------------------------------------------------------------------ */

  const [exam, setExam] =
    useState<ExamInfo | null>(
      null
    );

  const [module, setModule] =
    useState<ModuleInfo | null>(
      null
    );

  const [chapter, setChapter] =
    useState<ChapterInfo | null>(
      null
    );

  const [
    languages,
    setLanguages,
  ] =
    useState<Language[]>([]);

  const [
    questions,
    setQuestions,
  ] =
    useState<Question[]>([]);

  /* ------------------------------------------------------------------------ */
  /* GENERAL                                                                  */
  /* ------------------------------------------------------------------------ */

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    selectedLanguageFilter,
    setSelectedLanguageFilter,
  ] =
    useState("ALL");

  /* ------------------------------------------------------------------------ */
  /* FORM                                                                     */
  /* ------------------------------------------------------------------------ */

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingQuestion,
    setEditingQuestion,
  ] =
    useState<Question | null>(
      null
    );

  const [form, setForm] =
    useState<QuestionForm>(
      EMPTY_FORM
    );

  const [saving, setSaving] =
    useState(false);

  const [
    actionQuestionId,
    setActionQuestionId,
  ] =
    useState<string | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD QUESTIONS                                                           */
  /* ------------------------------------------------------------------------ */

  const loadQuestions =
    useCallback(
      async (
        adminId: string
      ) => {
        if (!examId) {
          setError(
            "Exam ID is missing."
          );

          setLoading(false);

          return;
        }

        if (!moduleId) {
          setError(
            "Module ID is missing."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);

          setError("");

          const url =
            new URLSearchParams();

          url.set(
            "adminId",
            adminId
          );

          url.set(
            "examId",
            examId
          );

          url.set(
            "moduleId",
            moduleId
          );

          if (chapterId) {
            url.set(
              "chapterId",
              chapterId
            );
          }

          const response =
            await fetch(
              `/api/admin/exams/questions?${url.toString()}`,
              {
                method: "GET",
                cache: "no-store",
              }
            );

          let data: any = {};

          try {
            data =
              await response.json();
          } catch {
            data = {};
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Unable to load questions."
            );
          }

          setExam(
            data.exam || null
          );

          setModule(
            data.module || null
          );

          setChapter(
            data.chapter || null
          );

          setLanguages(
            Array.isArray(
              data.languages
            )
              ? data.languages
              : []
          );

          setQuestions(
            Array.isArray(
              data.questions
            )
              ? data.questions
              : []
          );
        } catch (error) {
          console.error(
            "LOAD QUESTIONS ERROR:",
            error
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load questions."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        examId,
        moduleId,
        chapterId,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* ADMIN SESSION                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        setError(
          "Please login as Admin."
        );

        setLoading(false);

        return;
      }

      const parsed: AdminUser =
        JSON.parse(savedUser);

      if (
        !parsed?.id ||
        !isAdminRole(
          parsed.role
        )
      ) {
        setError(
          "Admin access required."
        );

        setLoading(false);

        return;
      }

      setAdmin(parsed);

      void loadQuestions(
        parsed.id
      );
    } catch (error) {
      console.error(
        "ADMIN SESSION ERROR:",
        error
      );

      setError(
        "Unable to load Admin session."
      );

      setLoading(false);
    }
  }, [loadQuestions]);

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredQuestions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return questions.filter(
        (question) => {
          if (
            selectedLanguageFilter !==
            "ALL"
          ) {
            const hasLanguage =
              question.translations.some(
                (translation) =>
                  translation.languageId ===
                  selectedLanguageFilter
              );

            if (!hasLanguage) {
              return false;
            }
          }

          if (!query) {
            return true;
          }

          const translationText =
            question.translations
              .map(
                (translation) =>
                  [
                    translation.questionText,
                    translation.optionA,
                    translation.optionB,
                    translation.optionC,
                    translation.optionD,
                    translation.explanation ||
                      "",
                    translation.language
                      ?.name || "",
                    translation.language
                      ?.nativeName || "",
                  ].join(" ")
              )
              .join(" ");

          return [
            question.code,
            question.correctOption,
            question.difficulty,
            translationText,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      questions,
      search,
      selectedLanguageFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* FORM                                                                     */
  /* ------------------------------------------------------------------------ */

  function updateField(
    field: keyof QuestionForm,
    value: string
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* OPEN CREATE                                                              */
  /* ------------------------------------------------------------------------ */

  function openCreate() {
    const englishLanguage =
      languages.find(
        (language) =>
          language.code
            .trim()
            .toLowerCase() ===
          "en"
      );

    const defaultLanguage =
      englishLanguage ||
      languages[0];

    const nextOrder =
      questions.length > 0
        ? Math.max(
            ...questions.map(
              (item) =>
                Number(
                  item.sortOrder ||
                    0
                )
            )
          ) + 1
        : 1;

    const nextCode =
      `Q${String(
        questions.length + 1
      ).padStart(4, "0")}`;

    setEditingQuestion(
      null
    );

    setForm({
      ...EMPTY_FORM,

      code: nextCode,

      languageId:
        defaultLanguage?.id ||
        "",

      sortOrder:
        String(nextOrder),
    });

    setError("");
    setMessage("");

    setFormOpen(true);
  }

  /* ------------------------------------------------------------------------ */
  /* OPEN EDIT                                                                */
  /* ------------------------------------------------------------------------ */

  function openEdit(
    question: Question
  ) {
    const english =
      question.translations.find(
        (translation) =>
          translation.language?.code
            ?.trim()
            .toLowerCase() ===
          "en"
      );

    const translation =
      english ||
      question.translations[0];

    setEditingQuestion(
      question
    );

    setForm({
      code:
        question.code,

      languageId:
        translation?.languageId ||
        languages[0]?.id ||
        "",

      questionText:
        translation?.questionText ||
        "",

      optionA:
        translation?.optionA ||
        "",

      optionB:
        translation?.optionB ||
        "",

      optionC:
        translation?.optionC ||
        "",

      optionD:
        translation?.optionD ||
        "",

      correctOption:
        question.correctOption,

      explanation:
        translation?.explanation ||
        "",

      difficulty:
        question.difficulty,

      sortOrder:
        String(
          question.sortOrder
        ),
    });

    setError("");
    setMessage("");

    setFormOpen(true);
  }

  /* ------------------------------------------------------------------------ */
  /* CHANGE LANGUAGE INSIDE EDIT                                              */
  /* ------------------------------------------------------------------------ */

  function changeFormLanguage(
    languageId: string
  ) {
    if (!editingQuestion) {
      updateField(
        "languageId",
        languageId
      );

      return;
    }

    const translation =
      editingQuestion.translations.find(
        (item) =>
          item.languageId ===
          languageId
      );

    setForm(
      (previous) => ({
        ...previous,

        languageId,

        questionText:
          translation?.questionText ||
          "",

        optionA:
          translation?.optionA ||
          "",

        optionB:
          translation?.optionB ||
          "",

        optionC:
          translation?.optionC ||
          "",

        optionD:
          translation?.optionD ||
          "",

        explanation:
          translation?.explanation ||
          "",
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CLOSE FORM                                                               */
  /* ------------------------------------------------------------------------ */

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);

    setEditingQuestion(
      null
    );

    setForm(
      EMPTY_FORM
    );

    setError("");
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE QUESTION                                                            */
  /* ------------------------------------------------------------------------ */

  async function saveQuestion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!admin?.id) {
      setError(
        "Admin session not found."
      );

      return;
    }

    if (!form.code.trim()) {
      setError(
        "Question code is required."
      );

      return;
    }

    if (!form.languageId) {
      setError(
        "Please select a language."
      );

      return;
    }

    if (
      !form.questionText.trim()
    ) {
      setError(
        "Question text is required."
      );

      return;
    }

    if (
      !form.optionA.trim() ||
      !form.optionB.trim() ||
      !form.optionC.trim() ||
      !form.optionD.trim()
    ) {
      setError(
        "All four answer options are required."
      );

      return;
    }

    try {
      setSaving(true);

      setError("");
      setMessage("");

      let questionId =
        editingQuestion?.id ||
        "";

      /* -------------------------------------------------------------------- */
      /* CREATE MAIN QUESTION                                                 */
      /* -------------------------------------------------------------------- */

      if (!editingQuestion) {
        const response =
          await fetch(
            "/api/admin/exams/questions",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  adminId:
                    admin.id,

                  examId,

                  moduleId,

                  chapterId:
                    chapterId ||
                    null,

                  code:
                    form.code,

                  correctOption:
                    form.correctOption,

                  difficulty:
                    form.difficulty,

                  sortOrder:
                    Number(
                      form.sortOrder ||
                        0
                    ),
                }),
            }
          );

        let data: any = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to create question."
          );
        }

        questionId =
          String(
            data.question?.id ||
              ""
          ).trim();

        if (!questionId) {
          throw new Error(
            "Question was created but Question ID was not returned."
          );
        }
      }

      /* -------------------------------------------------------------------- */
      /* UPDATE MAIN QUESTION                                                 */
      /* -------------------------------------------------------------------- */

      if (editingQuestion) {
        const response =
          await fetch(
            "/api/admin/exams/questions",
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  adminId:
                    admin.id,

                  questionId:
                    editingQuestion.id,

                  action:
                    "UPDATE_QUESTION",

                  code:
                    form.code,

                  chapterId:
                    chapterId ||
                    null,

                  correctOption:
                    form.correctOption,

                  difficulty:
                    form.difficulty,

                  sortOrder:
                    Number(
                      form.sortOrder ||
                        0
                    ),
                }),
            }
          );

        let data: any = {};

        try {
          data =
            await response.json();
        } catch {
          data = {};
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to update question."
          );
        }
      }

      /* -------------------------------------------------------------------- */
      /* SAVE TRANSLATION                                                     */
      /* -------------------------------------------------------------------- */

      const translationResponse =
        await fetch(
          "/api/admin/exams/question-translations",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                questionId,

                languageId:
                  form.languageId,

                questionText:
                  form.questionText,

                optionA:
                  form.optionA,

                optionB:
                  form.optionB,

                optionC:
                  form.optionC,

                optionD:
                  form.optionD,

                explanation:
                  form.explanation,
              }),
          }
        );

      let translationData: any =
        {};

      try {
        translationData =
          await translationResponse.json();
      } catch {
        translationData = {};
      }

      if (
        !translationResponse.ok ||
        !translationData.success
      ) {
        throw new Error(
          translationData.message ||
            "Question saved, but language content could not be saved."
        );
      }

      setMessage(
        editingQuestion
          ? "Question updated successfully."
          : "Question created successfully."
      );

      setFormOpen(false);

      setEditingQuestion(
        null
      );

      setForm(
        EMPTY_FORM
      );

      await loadQuestions(
        admin.id
      );
    } catch (error) {
      console.error(
        "SAVE QUESTION ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save question."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* STATUS                                                                   */
  /* ------------------------------------------------------------------------ */

  async function changeStatus(
    question: Question,
    field:
      | "isActive"
      | "isPublished",
    value: boolean
  ) {
    if (!admin?.id) {
      return;
    }

    try {
      setActionQuestionId(
        question.id
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/exams/questions",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                questionId:
                  question.id,

                action:
                  "QUESTION_STATUS",

                [field]:
                  value,
              }),
          }
        );

      let data: any = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to update question."
        );
      }

      setMessage(
        field ===
          "isPublished"
          ? value
            ? "Question published."
            : "Question unpublished."
          : value
          ? "Question activated."
          : "Question deactivated."
      );

      await loadQuestions(
        admin.id
      );
    } catch (error) {
      console.error(
        "QUESTION STATUS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update question."
      );
    } finally {
      setActionQuestionId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                   */
  /* ------------------------------------------------------------------------ */

  async function deleteQuestion(
    question: Question
  ) {
    if (!admin?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete question ${question.code}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionQuestionId(
        question.id
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/exams/questions",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                questionId:
                  question.id,
              }),
          }
        );

      let data: any = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to delete question."
        );
      }

      setMessage(
        "Question deleted successfully."
      );

      await loadQuestions(
        admin.id
      );
    } catch (error) {
      console.error(
        "DELETE QUESTION ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete question."
      );
    } finally {
      setActionQuestionId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS ERROR                                                             */
  /* ------------------------------------------------------------------------ */

  if (
    !loading &&
    !admin
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">

        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Admin Access Required
          </h1>

          <p className="mt-3 font-semibold text-slate-600">
            {error ||
              "Please login as Admin."}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-black text-white"
          >
            Go to Login
          </Link>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-100 pb-20 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-800 text-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-4">

            <Link
              href={`/admin/exams/chapters?examId=${encodeURIComponent(
                examId
              )}&moduleId=${encodeURIComponent(
                moduleId
              )}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black hover:bg-white/20"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                Exam Management
              </p>

              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                ❓ Question Bank
              </h1>

              <p className="mt-1 text-sm font-semibold text-blue-200">
                {chapter
                  ? `${chapter.code} • ${chapter.title}`
                  : module
                  ? module.name
                  : "Questions & Answers"}
              </p>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() => {
                if (admin?.id) {
                  void loadQuestions(
                    admin.id
                  );
                }
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/20"
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              onClick={
                openCreate
              }
              disabled={
                languages.length ===
                0
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-900 disabled:opacity-50"
            >
              + Add Question
            </button>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* INFORMATION */}

        <div className="grid gap-3 md:grid-cols-3">

          <InfoCard
            label="Exam"
            value={
              exam
                ? `${exam.code} - ${exam.title}`
                : examId
            }
          />

          <InfoCard
            label="Module"
            value={
              module
                ? `${module.code} - ${module.name}`
                : moduleId
            }
          />

          <InfoCard
            label="Chapter"
            value={
              chapter
                ? `${chapter.code} - ${chapter.title}`
                : chapterId ||
                  "All Chapters"
            }
          />

        </div>

        {/* SUMMARY */}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <SummaryCard
            label="Questions"
            value={
              questions.length
            }
          />

          <SummaryCard
            label="Published"
            value={
              questions.filter(
                (question) =>
                  question.isPublished
              ).length
            }
          />

          <SummaryCard
            label="Active"
            value={
              questions.filter(
                (question) =>
                  question.isActive
              ).length
            }
          />

          <SummaryCard
            label="Languages"
            value={
              languages.length
            }
          />

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* SEARCH */}

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_260px]">

            <div>

              <label className="text-sm font-black text-slate-800">
                Search Question
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Question code, text, option or explanation..."
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
              />

            </div>

            <div>

              <label className="text-sm font-black text-slate-800">
                Language
              </label>

              <select
                value={
                  selectedLanguageFilter
                }
                onChange={(event) =>
                  setSelectedLanguageFilter(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold"
              >

                <option value="ALL">
                  All Languages
                </option>

                {languages.map(
                  (language) => (
                    <option
                      key={
                        language.id
                      }
                      value={
                        language.id
                      }
                    >
                      {languageLabel(
                        language
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

        </div>

        {/* QUESTIONS */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center font-black text-slate-600">
              Loading questions...
            </div>
          ) : filteredQuestions.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                ❓
              </div>

              <h2 className="mt-3 text-xl font-black">
                No Questions Found
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Add your first question for this chapter.
              </p>

              <button
                type="button"
                onClick={
                  openCreate
                }
                disabled={
                  languages.length ===
                    0
                }
                className="mt-5 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-50"
              >
                + Add First Question
              </button>

            </div>
          ) : (
            <div className="space-y-4">

              {filteredQuestions.map(
                (question) => {
                  const english =
                    question.translations.find(
                      (translation) =>
                        translation.language
                          ?.code ===
                        "en"
                    );

                  const translation =
                    english ||
                    question
                      .translations[0];

                  return (
                    <article
                      key={
                        question.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap gap-2">

                            <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                              {
                                question.code
                              }
                            </span>

                            <span className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
                              {
                                question.difficulty
                              }
                            </span>

                            <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                              Correct:{" "}
                              {
                                question.correctOption
                              }
                            </span>

                            <span
                              className={`rounded-lg px-3 py-1 text-xs font-black ${
                                question.isPublished
                                  ? "bg-cyan-100 text-cyan-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {question.isPublished
                                ? "PUBLISHED"
                                : "DRAFT"}
                            </span>

                            <span
                              className={`rounded-lg px-3 py-1 text-xs font-black ${
                                question.isActive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {question.isActive
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>

                          </div>

                          <h2 className="mt-4 text-lg font-black leading-7 text-slate-950">
                            {translation?.questionText ||
                              "Question text not added yet."}
                          </h2>

                          {translation?.language && (
                            <p className="mt-2 text-xs font-black text-blue-700">
                              🌐{" "}
                              {languageLabel(
                                translation.language
                              )}
                            </p>
                          )}

                        </div>

                        <div className="rounded-xl bg-slate-50 px-4 py-3 text-center">

                          <p className="text-xl font-black">
                            {
                              question
                                .translations
                                .length
                            }
                          </p>

                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Languages
                          </p>

                        </div>

                      </div>

                      {translation && (
                        <div className="mt-5 grid gap-2 sm:grid-cols-2">

                          <OptionBox
                            label="A"
                            text={
                              translation.optionA
                            }
                            correct={
                              question.correctOption ===
                              "A"
                            }
                          />

                          <OptionBox
                            label="B"
                            text={
                              translation.optionB
                            }
                            correct={
                              question.correctOption ===
                              "B"
                            }
                          />

                          <OptionBox
                            label="C"
                            text={
                              translation.optionC
                            }
                            correct={
                              question.correctOption ===
                              "C"
                            }
                          />

                          <OptionBox
                            label="D"
                            text={
                              translation.optionD
                            }
                            correct={
                              question.correctOption ===
                              "D"
                            }
                          />

                        </div>
                      )}

                      {translation?.explanation && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">

                          <p className="text-xs font-black uppercase text-amber-700">
                            Explanation
                          </p>

                          <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
                            {
                              translation.explanation
                            }
                          </p>

                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              question
                            )
                          }
                          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700"
                        >
                          ✏️ Edit / Languages
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionQuestionId ===
                            question.id
                          }
                          onClick={() =>
                            void changeStatus(
                              question,
                              "isPublished",
                              !question.isPublished
                            )
                          }
                          className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-700 disabled:opacity-50"
                        >
                          {question.isPublished
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionQuestionId ===
                            question.id
                          }
                          onClick={() =>
                            void changeStatus(
                              question,
                              "isActive",
                              !question.isActive
                            )
                          }
                          className={`rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-50 ${
                            question.isActive
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {question.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionQuestionId ===
                            question.id
                          }
                          onClick={() =>
                            void deleteQuestion(
                              question
                            )
                          }
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-50"
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </div>

      </section>

      {/* -------------------------------------------------------------------- */}
      {/* ADD / EDIT MODAL                                                     */}
      {/* -------------------------------------------------------------------- */}

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">

          <div className="mx-auto my-6 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Question Management
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {editingQuestion
                    ? "Edit Question"
                    : "Add Question"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Add question text, answer options and explanation.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                saveQuestion
              }
              className="mt-6 space-y-5"
            >

              {/* CODE */}

              <div>

                <label className="text-sm font-black">
                  Question Code *
                </label>

                <input
                  value={form.code}
                  onChange={(event) =>
                    updateField(
                      "code",
                      event.target.value
                        .toUpperCase()
                    )
                  }
                  placeholder="Example: Q0001"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
                />

              </div>

              {/* LANGUAGE */}

              <div>

                <label className="text-sm font-black">
                  Language *
                </label>

                <select
                  value={
                    form.languageId
                  }
                  onChange={(event) =>
                    changeFormLanguage(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold"
                >

                  <option value="">
                    Select Language
                  </option>

                  {languages.map(
                    (language) => (
                      <option
                        key={
                          language.id
                        }
                        value={
                          language.id
                        }
                      >
                        {languageLabel(
                          language
                        )}
                      </option>
                    )
                  )}

                </select>

                {editingQuestion && (
                  <p className="mt-2 text-xs font-semibold text-blue-700">
                    Choose another language to add or edit the same question translation.
                  </p>
                )}

              </div>

              {/* QUESTION */}

              <div>

                <label className="text-sm font-black">
                  Question *
                </label>

                <textarea
                  value={
                    form.questionText
                  }
                  onChange={(event) =>
                    updateField(
                      "questionText",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Enter the question..."
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
                />

              </div>

              {/* OPTIONS */}

              <div className="grid gap-4 sm:grid-cols-2">

                <AnswerInput
                  label="A"
                  value={
                    form.optionA
                  }
                  onChange={(value) =>
                    updateField(
                      "optionA",
                      value
                    )
                  }
                />

                <AnswerInput
                  label="B"
                  value={
                    form.optionB
                  }
                  onChange={(value) =>
                    updateField(
                      "optionB",
                      value
                    )
                  }
                />

                <AnswerInput
                  label="C"
                  value={
                    form.optionC
                  }
                  onChange={(value) =>
                    updateField(
                      "optionC",
                      value
                    )
                  }
                />

                <AnswerInput
                  label="D"
                  value={
                    form.optionD
                  }
                  onChange={(value) =>
                    updateField(
                      "optionD",
                      value
                    )
                  }
                />

              </div>

              {/* CORRECT + DIFFICULTY */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="text-sm font-black">
                    Correct Answer *
                  </label>

                  <select
                    value={
                      form.correctOption
                    }
                    onChange={(event) =>
                      updateField(
                        "correctOption",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold"
                  >
                    <option value="A">
                      Option A
                    </option>

                    <option value="B">
                      Option B
                    </option>

                    <option value="C">
                      Option C
                    </option>

                    <option value="D">
                      Option D
                    </option>
                  </select>

                </div>

                <div>

                  <label className="text-sm font-black">
                    Difficulty
                  </label>

                  <select
                    value={
                      form.difficulty
                    }
                    onChange={(event) =>
                      updateField(
                        "difficulty",
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-semibold"
                  >
                    <option value="EASY">
                      Easy
                    </option>

                    <option value="MEDIUM">
                      Medium
                    </option>

                    <option value="HARD">
                      Hard
                    </option>
                  </select>

                </div>

              </div>

              {/* EXPLANATION */}

              <div>

                <label className="text-sm font-black">
                  Explanation
                </label>

                <textarea
                  value={
                    form.explanation
                  }
                  onChange={(event) =>
                    updateField(
                      "explanation",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Explain why the answer is correct..."
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
                />

              </div>

              {/* SORT */}

              <div>

                <label className="text-sm font-black">
                  Sort Order
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.sortOrder
                  }
                  onChange={(event) =>
                    updateField(
                      "sortOrder",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold"
                />

              </div>

              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                  ⚠️ {error}
                </div>
              )}

              {/* BUTTONS */}

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-black text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:bg-slate-400"
                >
                  {saving
                    ? "Saving..."
                    : editingQuestion
                    ? "Save Changes"
                    : "Create Question"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* INFO CARD                                                                  */
/* -------------------------------------------------------------------------- */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all font-black text-slate-900">
        {value || "Missing"}
      </p>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ANSWER INPUT                                                               */
/* -------------------------------------------------------------------------- */

function AnswerInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>

      <label className="text-sm font-black">
        Option {label} *
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        rows={3}
        placeholder={`Enter Option ${label}`}
        className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
      />

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OPTION DISPLAY                                                             */
/* -------------------------------------------------------------------------- */

function OptionBox({
  label,
  text,
  correct,
}: {
  label: string;
  text: string;
  correct: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        correct
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >

      <div className="flex gap-2">

        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
            correct
              ? "bg-emerald-700 text-white"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {label}
        </span>

        <p className="font-semibold leading-6">
          {text}
        </p>

      </div>

      {correct && (
        <p className="mt-2 text-xs font-black text-emerald-700">
          ✓ Correct Answer
        </p>
      )}

    </div>
  );
}