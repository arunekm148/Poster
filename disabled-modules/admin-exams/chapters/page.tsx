"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AdminUser = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role?: string;
};

type ExamInfo = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isPublished: boolean;
};

type ModuleInfo = {
  id: string;
  examId: string;
  code: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  sortOrder: number;
  isActive: boolean;
  isPublished: boolean;
};

type Chapter = {
  id: string;
  moduleId: string;
  code: string;
  title: string;
  description?: string | null;

  sortOrder: number;

  isActive: boolean;
  isPublished: boolean;

  createdAt: string;
  updatedAt: string;

  _count?: {
    questions?: number;
    tests?: number;
  };
};

type ChapterForm = {
  code: string;
  title: string;
  description: string;
  sortOrder: string;
};

type ImportResult = {
  imported?: number;
  updated?: number;
  skipped?: number;
  errors?: Array<{
    row?: number;
    message?: string;
  }>;
};

/* -------------------------------------------------------------------------- */
/* EMPTY FORM                                                                 */
/* -------------------------------------------------------------------------- */

const EMPTY_FORM: ChapterForm = {
  code: "",
  title: "",
  description: "",
  sortOrder: "0",
};

/* -------------------------------------------------------------------------- */
/* ADMIN ROLE                                                                 */
/* -------------------------------------------------------------------------- */

function isAdminRole(
  role?: string
) {
  const normalized =
    String(
      role || ""
    )
      .trim()
      .toUpperCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  return [
    "ADMIN",
    "MASTER_ADMIN",
    "MASTERADMIN",
    "SUPER_ADMIN",
    "SUPERADMIN",
  ].includes(
    normalized
  );
}

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
/* -------------------------------------------------------------------------- */

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE WRAPPER                                                               */
/* -------------------------------------------------------------------------- */

export default function ChaptersPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              📖
            </div>

            <p className="mt-4 font-black text-slate-700">
              Loading Chapters...
            </p>

          </div>
        </main>
      }
    >
      <ChaptersContent />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

function ChaptersContent() {
  const searchParams =
    useSearchParams();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* URL                                                                      */
  /* ------------------------------------------------------------------------ */

  const examId =
    String(
      searchParams.get(
        "examId"
      ) || ""
    ).trim();

  const moduleId =
    String(
      searchParams.get(
        "moduleId"
      ) || ""
    ).trim();

  /* ------------------------------------------------------------------------ */
  /* ADMIN                                                                    */
  /* ------------------------------------------------------------------------ */

  const [
    admin,
    setAdmin,
  ] =
    useState<AdminUser | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* EXAM / MODULE                                                            */
  /* ------------------------------------------------------------------------ */

  const [
    exam,
    setExam,
  ] =
    useState<ExamInfo | null>(
      null
    );

  const [
    module,
    setModule,
  ] =
    useState<ModuleInfo | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* CHAPTERS                                                                 */
  /* ------------------------------------------------------------------------ */

  const [
    chapters,
    setChapters,
  ] =
    useState<Chapter[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* ------------------------------------------------------------------------ */
  /* MESSAGE                                                                  */
  /* ------------------------------------------------------------------------ */

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* SEARCH                                                                   */
  /* ------------------------------------------------------------------------ */

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "ALL" |
      "ACTIVE" |
      "INACTIVE" |
      "PUBLISHED" |
      "DRAFT"
    >("ALL");

  /* ------------------------------------------------------------------------ */
  /* CHAPTER FORM                                                             */
  /* ------------------------------------------------------------------------ */

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingChapter,
    setEditingChapter,
  ] =
    useState<Chapter | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<ChapterForm>(
      EMPTY_FORM
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* ACTION                                                                   */
  /* ------------------------------------------------------------------------ */

  const [
    actionChapterId,
    setActionChapterId,
  ] =
    useState<string | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* IMPORT                                                                   */
  /* ------------------------------------------------------------------------ */

  const [
    importFile,
    setImportFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    importing,
    setImporting,
  ] =
    useState(false);

  const [
    importResult,
    setImportResult,
  ] =
    useState<ImportResult | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD CHAPTERS                                                            */
  /* ------------------------------------------------------------------------ */

  const loadChapters =
    useCallback(
      async (
        adminId: string
      ) => {
        if (!examId) {
          setError(
            "Exam ID is missing."
          );

          setLoading(
            false
          );

          return;
        }

        if (!moduleId) {
          setError(
            "Module ID is missing."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const response =
            await fetch(
              `/api/admin/exams/chapters?adminId=${encodeURIComponent(
                adminId
              )}&examId=${encodeURIComponent(
                examId
              )}&moduleId=${encodeURIComponent(
                moduleId
              )}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          let data: {
            success?: boolean;
            message?: string;
            exam?: ExamInfo;
            module?: ModuleInfo;
            chapters?: Chapter[];
          } = {};

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
                "Unable to load chapters."
            );
          }

          setExam(
            data.exam ||
              null
          );

          setModule(
            data.module ||
              null
          );

          setChapters(
            Array.isArray(
              data.chapters
            )
              ? data.chapters
              : []
          );
        } catch (
          error
        ) {
          console.error(
            "LOAD CHAPTERS ERROR:",
            error
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load chapters."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        examId,
        moduleId,
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
          "Please login as Master Admin."
        );

        setLoading(
          false
        );

        return;
      }

      const parsed:
        AdminUser =
        JSON.parse(
          savedUser
        );

      if (
        !parsed?.id ||
        !isAdminRole(
          parsed.role
        )
      ) {
        setError(
          "Master Admin access is required."
        );

        setLoading(
          false
        );

        return;
      }

      setAdmin(
        parsed
      );

      void loadChapters(
        parsed.id
      );
    } catch (
      error
    ) {
      console.error(
        "CHAPTER ADMIN SESSION ERROR:",
        error
      );

      setError(
        "Unable to read Admin session."
      );

      setLoading(
        false
      );
    }
  }, [
    loadChapters,
  ]);

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredChapters =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return chapters.filter(
        (
          chapter
        ) => {
          if (
            statusFilter ===
              "ACTIVE" &&
            !chapter.isActive
          ) {
            return false;
          }

          if (
            statusFilter ===
              "INACTIVE" &&
            chapter.isActive
          ) {
            return false;
          }

          if (
            statusFilter ===
              "PUBLISHED" &&
            !chapter.isPublished
          ) {
            return false;
          }

          if (
            statusFilter ===
              "DRAFT" &&
            chapter.isPublished
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable =
            [
              chapter.code,
              chapter.title,
              chapter.description ||
                "",
            ]
              .join(
                " "
              )
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      chapters,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const activeCount =
    useMemo(
      () =>
        chapters.filter(
          (
            chapter
          ) =>
            chapter.isActive
        ).length,
      [
        chapters,
      ]
    );

  const publishedCount =
    useMemo(
      () =>
        chapters.filter(
          (
            chapter
          ) =>
            chapter.isPublished
        ).length,
      [
        chapters,
      ]
    );

  const totalQuestions =
    useMemo(
      () =>
        chapters.reduce(
          (
            total,
            chapter
          ) =>
            total +
            (
              chapter._count
                ?.questions ||
              0
            ),
          0
        ),
      [
        chapters,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* CREATE                                                                   */
  /* ------------------------------------------------------------------------ */

  function openCreateChapter() {
    setEditingChapter(
      null
    );

    const nextOrder =
      chapters.length > 0
        ? Math.max(
            ...chapters.map(
              (
                chapter
              ) =>
                Number(
                  chapter.sortOrder ||
                    0
                )
            )
          ) + 1
        : 1;

    setForm({
      ...EMPTY_FORM,

      sortOrder:
        String(
          nextOrder
        ),
    });

    setError(
      ""
    );

    setMessage(
      ""
    );

    setFormOpen(
      true
    );
  }

  /* ------------------------------------------------------------------------ */
  /* EDIT                                                                     */
  /* ------------------------------------------------------------------------ */

  function openEditChapter(
    chapter: Chapter
  ) {
    setEditingChapter(
      chapter
    );

    setForm({
      code:
        chapter.code,

      title:
        chapter.title,

      description:
        chapter.description ||
        "",

      sortOrder:
        String(
          chapter.sortOrder
        ),
    });

    setError(
      ""
    );

    setMessage(
      ""
    );

    setFormOpen(
      true
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CLOSE FORM                                                               */
  /* ------------------------------------------------------------------------ */

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(
      false
    );

    setEditingChapter(
      null
    );

    setForm(
      EMPTY_FORM
    );
  }

  /* ------------------------------------------------------------------------ */
  /* FORM FIELD                                                               */
  /* ------------------------------------------------------------------------ */

  function updateFormField(
    field:
      keyof ChapterForm,
    value: string
  ) {
    setForm(
      (
        previous
      ) => ({
        ...previous,

        [field]:
          value,
      })
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE CHAPTER                                                             */
  /* ------------------------------------------------------------------------ */

  async function saveChapter(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !admin?.id ||
      !examId ||
      !moduleId
    ) {
      return;
    }

    const code =
      form.code
        .trim()
        .toUpperCase();

    const title =
      form.title.trim();

    if (!code) {
      setError(
        "Chapter code is required."
      );

      return;
    }

    if (!title) {
      setError(
        "Chapter title is required."
      );

      return;
    }

    try {
      setSaving(
        true
      );

      setError(
        ""
      );

      setMessage(
        ""
      );

      const response =
        await fetch(
          "/api/admin/exams/chapters",
          {
            method:
              editingChapter
                ? "PATCH"
                : "POST",

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
                  editingChapter
                    ?.id,

                action:
                  editingChapter
                    ? "UPDATE_CHAPTER"
                    : undefined,

                code,

                title,

                description:
                  form.description.trim(),

                sortOrder:
                  Number(
                    form.sortOrder ||
                      0
                  ),
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

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
            "Unable to save chapter."
        );
      }

      setMessage(
        data.message ||
          (
            editingChapter
              ? "Chapter updated successfully."
              : "Chapter created successfully."
          )
      );

      setFormOpen(
        false
      );

      setEditingChapter(
        null
      );

      setForm(
        EMPTY_FORM
      );

      await loadChapters(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "SAVE CHAPTER ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save chapter."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* STATUS                                                                   */
  /* ------------------------------------------------------------------------ */

  async function changeChapterStatus(
    chapter: Chapter,
    field:
      | "isActive"
      | "isPublished",
    value: boolean
  ) {
    if (!admin?.id) {
      return;
    }

    try {
      setActionChapterId(
        chapter.id
      );

      setError(
        ""
      );

      setMessage(
        ""
      );

      const response =
        await fetch(
          "/api/admin/exams/chapters",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                action:
                  "CHAPTER_STATUS",

                chapterId:
                  chapter.id,

                [field]:
                  value,
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

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
            "Unable to update chapter."
        );
      }

      if (
        field ===
        "isPublished"
      ) {
        setMessage(
          value
            ? `${chapter.title} published successfully.`
            : `${chapter.title} changed to draft.`
        );
      } else {
        setMessage(
          value
            ? `${chapter.title} activated successfully.`
            : `${chapter.title} deactivated successfully.`
        );
      }

      await loadChapters(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "CHAPTER STATUS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update chapter."
      );
    } finally {
      setActionChapterId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                   */
  /* ------------------------------------------------------------------------ */

  async function deleteChapter(
    chapter: Chapter
  ) {
    if (!admin?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete chapter "${chapter.title}"?\n\nA chapter containing questions or tests cannot be deleted.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionChapterId(
        chapter.id
      );

      setError(
        ""
      );

      setMessage(
        ""
      );

      const response =
        await fetch(
          "/api/admin/exams/chapters",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                chapterId:
                  chapter.id,
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

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
            "Unable to delete chapter."
        );
      }

      setMessage(
        data.message ||
          "Chapter deleted successfully."
      );

      await loadChapters(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "DELETE CHAPTER ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete chapter."
      );
    } finally {
      setActionChapterId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DOWNLOAD CSV TEMPLATE                                                    */
  /* ------------------------------------------------------------------------ */

  function downloadTemplate() {
    const csv =
      [
        [
          "ChapterCode",
          "ChapterTitle",
          "Description",
          "SortOrder",
          "IsActive",
          "IsPublished",
        ].join(
          ","
        ),

        [
          "CH01",
          "\"Introduction to Insurance\"",
          "\"Introduction and basic principles\"",
          "1",
          "TRUE",
          "TRUE",
        ].join(
          ","
        ),

        [
          "CH02",
          "\"Insurance Principles\"",
          "\"Core principles of insurance\"",
          "2",
          "TRUE",
          "TRUE",
        ].join(
          ","
        ),
      ].join(
        "\r\n"
      );

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      module?.code
        ? `${module.code}-chapters-template.csv`
        : "chapters-template.csv";

    document.body.appendChild(
      anchor
    );

    anchor.click();

    document.body.removeChild(
      anchor
    );

    URL.revokeObjectURL(
      url
    );
  }

  /* ------------------------------------------------------------------------ */
  /* FILE CHANGE                                                              */
  /* ------------------------------------------------------------------------ */

  function handleImportFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ||
      null;

    setImportFile(
      file
    );

    setImportResult(
      null
    );

    setError(
      ""
    );

    setMessage(
      ""
    );
  }

  /* ------------------------------------------------------------------------ */
  /* IMPORT FILE                                                              */
  /* ------------------------------------------------------------------------ */

  async function importChapters() {
    if (
      !admin?.id ||
      !examId ||
      !moduleId
    ) {
      return;
    }

    if (!importFile) {
      setError(
        "Please select an Excel or CSV file first."
      );

      return;
    }

    try {
      setImporting(
        true
      );

      setError(
        ""
      );

      setMessage(
        ""
      );

      setImportResult(
        null
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        importFile
      );

      formData.append(
        "adminId",
        admin.id
      );

      formData.append(
        "examId",
        examId
      );

      formData.append(
        "moduleId",
        moduleId
      );

      const response =
        await fetch(
          "/api/admin/exams/chapters/import",
          {
            method:
              "POST",

            body:
              formData,
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        result?: ImportResult;
        imported?: number;
        updated?: number;
        skipped?: number;
        errors?: Array<{
          row?: number;
          message?: string;
        }>;
      } = {};

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
            "Unable to import chapters."
        );
      }

      const result:
        ImportResult =
        data.result ||
        {
          imported:
            data.imported,

          updated:
            data.updated,

          skipped:
            data.skipped,

          errors:
            data.errors,
        };

      setImportResult(
        result
      );

      setMessage(
        data.message ||
          "Chapter import completed successfully."
      );

      setImportFile(
        null
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      await loadChapters(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "IMPORT CHAPTER ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to import chapters."
      );
    } finally {
      setImporting(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS                                                                   */
  /* ------------------------------------------------------------------------ */

  if (
    !loading &&
    !admin
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">

        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Master Admin Access Required
          </h1>

          <p className="mt-3 font-semibold text-slate-600">
            {error ||
              "Please login as Master Admin."}
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

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-violet-800 text-white">

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">

              <Link
                href={`/admin/exams/modules?examId=${encodeURIComponent(
                  examId
                )}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black transition hover:bg-white/20"
              >
                ←
              </Link>

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                  Exam Management
                </p>

                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  📖 Chapter Management
                </h1>

                <p className="mt-1 text-sm font-semibold text-violet-200">
                  Create chapters and organise the question bank.
                </p>

              </div>

            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={
                  openCreateChapter
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-violet-900 shadow"
              >
                + Add Chapter
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    admin?.id
                  ) {
                    void loadChapters(
                      admin.id
                    );
                  }
                }}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/20"
              >
                ↻ Refresh
              </button>

            </div>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* BREADCRUMB */}

        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">

          <Link
            href="/admin/exams"
            className="hover:text-blue-700"
          >
            Exam Management
          </Link>

          <span>
            /
          </span>

          <Link
            href="/admin/exams/manage"
            className="hover:text-blue-700"
          >
            Exams
          </Link>

          <span>
            /
          </span>

          <Link
            href={`/admin/exams/modules?examId=${encodeURIComponent(
              examId
            )}`}
            className="hover:text-blue-700"
          >
            Modules
          </Link>

          <span>
            /
          </span>

          <span className="text-slate-900">
            Chapters
          </span>

        </div>

        {/* SELECTED EXAM / MODULE */}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">

          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">

            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Selected Exam
            </p>

            <h2 className="mt-2 text-xl font-black text-blue-950">
              {exam
                ? `${exam.code} — ${exam.title}`
                : "Loading Exam..."}
            </h2>

            {exam && (
              <div className="mt-3 flex flex-wrap gap-2">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    exam.isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {exam.isActive
                    ? "ACTIVE"
                    : "INACTIVE"}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    exam.isPublished
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {exam.isPublished
                    ? "PUBLISHED"
                    : "DRAFT"}
                </span>

              </div>
            )}

          </div>

          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">

            <p className="text-xs font-black uppercase tracking-wider text-violet-700">
              Selected Module
            </p>

            <div className="mt-2 flex items-center gap-3">

              <div className="text-3xl">
                {module?.emoji ||
                  "📚"}
              </div>

              <div>

                <h2 className="text-xl font-black text-violet-950">
                  {module
                    ? `${module.code} — ${module.name}`
                    : "Loading Module..."}
                </h2>

                {module?.description && (
                  <p className="mt-1 text-sm font-semibold text-violet-700">
                    {
                      module.description
                    }
                  </p>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <SummaryCard
            emoji="📖"
            label="Chapters"
            value={
              chapters.length
            }
          />

          <SummaryCard
            emoji="✅"
            label="Active"
            value={
              activeCount
            }
          />

          <SummaryCard
            emoji="🌐"
            label="Published"
            value={
              publishedCount
            }
          />

          <SummaryCard
            emoji="❓"
            label="Questions"
            value={
              totalQuestions
            }
          />

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
            ✓ {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* EXCEL IMPORT */}

        <div className="mt-5 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                Bulk Chapter Management
              </p>

              <h2 className="mt-1 text-xl font-black">
                📊 Excel / CSV Upload
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Create many chapters at one time. Download the template, enter
                the chapter details, then upload the completed file.
              </p>

            </div>

            <button
              type="button"
              onClick={
                downloadTemplate
              }
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800"
            >
              ↓ Download Template
            </button>

          </div>

          {/* REQUIRED COLUMNS */}

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Template Columns
            </p>

            <div className="mt-3 flex flex-wrap gap-2">

              {[
                "ChapterCode",
                "ChapterTitle",
                "Description",
                "SortOrder",
                "IsActive",
                "IsPublished",
              ].map(
                (
                  column
                ) => (
                  <span
                    key={
                      column
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
                  >
                    {
                      column
                    }
                  </span>
                )
              )}

            </div>

          </div>

          {/* UPLOAD */}

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">

            <div>

              <label className="block text-sm font-black text-slate-800">
                Select Excel / CSV File
              </label>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={
                  handleImportFileChange
                }
                className="mt-2 block w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:font-black file:text-white"
              />

              {importFile && (
                <p className="mt-2 text-xs font-bold text-blue-700">
                  Selected:{" "}
                  {
                    importFile.name
                  }
                </p>
              )}

            </div>

            <button
              type="button"
              disabled={
                importing ||
                !importFile
              }
              onClick={() =>
                void importChapters()
              }
              className="rounded-xl bg-emerald-700 px-6 py-3.5 font-black text-white disabled:bg-slate-400"
            >
              {importing
                ? "Importing..."
                : "↑ Upload Chapters"}
            </button>

          </div>

          {/* IMPORT RESULT */}

          {importResult && (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

              <p className="font-black text-blue-950">
                Import Result
              </p>

              <div className="mt-3 grid grid-cols-3 gap-3">

                <div className="rounded-xl bg-white p-3 text-center">

                  <p className="text-xl font-black text-emerald-700">
                    {
                      importResult.imported ??
                      0
                    }
                  </p>

                  <p className="text-[10px] font-black uppercase text-slate-500">
                    Imported
                  </p>

                </div>

                <div className="rounded-xl bg-white p-3 text-center">

                  <p className="text-xl font-black text-blue-700">
                    {
                      importResult.updated ??
                      0
                    }
                  </p>

                  <p className="text-[10px] font-black uppercase text-slate-500">
                    Updated
                  </p>

                </div>

                <div className="rounded-xl bg-white p-3 text-center">

                  <p className="text-xl font-black text-amber-700">
                    {
                      importResult.skipped ??
                      0
                    }
                  </p>

                  <p className="text-[10px] font-black uppercase text-slate-500">
                    Skipped
                  </p>

                </div>

              </div>

              {Array.isArray(
                importResult.errors
              ) &&
                importResult.errors.length >
                  0 && (
                  <div className="mt-4 rounded-xl bg-white p-4">

                    <p className="text-sm font-black text-red-700">
                      Rows needing attention
                    </p>

                    <div className="mt-2 space-y-1">

                      {importResult.errors
                        .slice(
                          0,
                          20
                        )
                        .map(
                          (
                            item,
                            index
                          ) => (
                            <p
                              key={
                                `${item.row}-${index}`
                              }
                              className="text-xs font-semibold text-red-700"
                            >
                              Row{" "}
                              {
                                item.row ??
                                "-"
                              }
                              :{" "}
                              {
                                item.message ||
                                "Invalid row"
                              }
                            </p>
                          )
                        )}

                    </div>

                  </div>
                )}

            </div>
          )}

        </div>

        {/* SEARCH */}

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid gap-4 lg:grid-cols-[1fr_240px_auto] lg:items-end">

            <div>

              <label className="block text-sm font-black text-slate-800">
                Search Chapters
              </label>

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Chapter code, title or description"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3.5 font-semibold outline-none focus:border-blue-700"
              />

            </div>

            <div>

              <label className="block text-sm font-black text-slate-800">
                Status
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target
                      .value as
                      | "ALL"
                      | "ACTIVE"
                      | "INACTIVE"
                      | "PUBLISHED"
                      | "DRAFT"
                  )
                }
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold"
              >

                <option value="ALL">
                  All Chapters
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>

                <option value="PUBLISHED">
                  Published
                </option>

                <option value="DRAFT">
                  Draft
                </option>

              </select>

            </div>

            <button
              type="button"
              onClick={
                openCreateChapter
              }
              className="rounded-xl bg-blue-700 px-5 py-3.5 font-black text-white"
            >
              + Add Chapter
            </button>

          </div>

        </div>

        {/* CHAPTERS */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                📖
              </div>

              <p className="mt-4 font-black text-slate-600">
                Loading Chapters...
              </p>

            </div>
          ) : filteredChapters.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                📖
              </div>

              <h2 className="mt-4 text-xl font-black">
                No Chapters Found
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Create the first chapter manually or upload chapters using the
                Excel/CSV section above.
              </p>

              <button
                type="button"
                onClick={
                  openCreateChapter
                }
                className="mt-5 rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
              >
                + Create First Chapter
              </button>

            </div>
          ) : (
            <div className="grid gap-4">

              {filteredChapters.map(
                (
                  chapter
                ) => {
                  const questionCount =
                    chapter._count
                      ?.questions ||
                    0;

                  const testCount =
                    chapter._count
                      ?.tests ||
                    0;

                  return (
                    <article
                      key={
                        chapter.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                        {/* INFO */}

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start gap-4">

                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                              📘
                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                                  {
                                    chapter.code
                                  }
                                </span>

                                {chapter.isPublished ? (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                                    PUBLISHED
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                                    DRAFT
                                  </span>
                                )}

                                {chapter.isActive ? (
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                                    ACTIVE
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                                    INACTIVE
                                  </span>
                                )}

                              </div>

                              <h2 className="mt-2 text-xl font-black text-slate-950">
                                {
                                  chapter.title
                                }
                              </h2>

                              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                                {chapter.description ||
                                  "No chapter description added."}
                              </p>

                              <p className="mt-3 text-xs font-bold text-slate-400">
                                Sort Order:{" "}
                                {
                                  chapter.sortOrder
                                }
                                {" • "}
                                Created{" "}
                                {formatDate(
                                  chapter.createdAt
                                )}
                              </p>

                            </div>

                          </div>

                        </div>

                        {/* COUNTS */}

                        <div className="grid grid-cols-2 gap-2 lg:min-w-[260px]">

                          <div className="rounded-xl bg-slate-50 p-3 text-center">

                            <p className="text-2xl font-black">
                              {
                                questionCount
                              }
                            </p>

                            <p className="text-[10px] font-black uppercase text-slate-500">
                              Questions
                            </p>

                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-center">

                            <p className="text-2xl font-black">
                              {
                                testCount
                              }
                            </p>

                            <p className="text-[10px] font-black uppercase text-slate-500">
                              Tests
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* ACTIONS */}

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">

                        <button
                          type="button"
                          onClick={() =>
                            openEditChapter(
                              chapter
                            )
                          }
                          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800"
                        >
                          ✏️ Edit
                        </button>

                        <Link
                          href={`/admin/exams/questions?examId=${encodeURIComponent(
                            examId
                          )}&moduleId=${encodeURIComponent(
                            moduleId
                          )}&chapterId=${encodeURIComponent(
                            chapter.id
                          )}`}
                          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800"
                        >
                          ❓ Questions →
                        </Link>

                        <button
                          type="button"
                          disabled={
                            actionChapterId ===
                            chapter.id
                          }
                          onClick={() =>
                            void changeChapterStatus(
                              chapter,
                              "isPublished",
                              !chapter.isPublished
                            )
                          }
                          className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                            chapter.isPublished
                              ? "border border-amber-200 bg-amber-50 text-amber-800"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {actionChapterId ===
                          chapter.id
                            ? "Saving..."
                            : chapter.isPublished
                            ? "Unpublish"
                            : "✓ Publish"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionChapterId ===
                            chapter.id
                          }
                          onClick={() =>
                            void changeChapterStatus(
                              chapter,
                              "isActive",
                              !chapter.isActive
                            )
                          }
                          className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                            chapter.isActive
                              ? "border border-red-200 bg-red-50 text-red-700"
                              : "border border-blue-200 bg-blue-50 text-blue-700"
                          }`}
                        >
                          {actionChapterId ===
                          chapter.id
                            ? "Saving..."
                            : chapter.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            actionChapterId ===
                            chapter.id
                          }
                          onClick={() =>
                            void deleteChapter(
                              chapter
                            )
                          }
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700"
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
      {/* CREATE / EDIT CHAPTER                                                */}
      {/* -------------------------------------------------------------------- */}

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">

          <div className="mx-auto my-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Chapter Management
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {editingChapter
                    ? "Edit Chapter"
                    : "Create Chapter"}
                </h2>

                {module && (
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {module.code} —{" "}
                    {module.name}
                  </p>
                )}

              </div>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  closeForm
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                saveChapter
              }
              className="mt-6 space-y-5"
            >

              {/* CODE */}

              <div>

                <label className="text-sm font-black">
                  Chapter Code *
                </label>

                <input
                  value={
                    form.code
                  }
                  onChange={(
                    event
                  ) =>
                    updateFormField(
                      "code",
                      event.target.value
                        .toUpperCase()
                        .replace(
                          /\s+/g,
                          "_"
                        )
                    )
                  }
                  placeholder="CH01"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-bold outline-none focus:border-blue-700"
                />

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Example: CH01, CH02, LIFE_01
                </p>

              </div>

              {/* TITLE */}

              <div>

                <label className="text-sm font-black">
                  Chapter Title *
                </label>

                <input
                  value={
                    form.title
                  }
                  onChange={(
                    event
                  ) =>
                    updateFormField(
                      "title",
                      event.target.value
                    )
                  }
                  placeholder="Introduction to Insurance"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-700"
                />

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="text-sm font-black">
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    updateFormField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Chapter description"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-700"
                />

              </div>

              {/* SORT */}

              <div>

                <label className="text-sm font-black">
                  Sort Order
                </label>

                <input
                  type="number"
                  min={0}
                  value={
                    form.sortOrder
                  }
                  onChange={(
                    event
                  ) =>
                    updateFormField(
                      "sortOrder",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-700"
                />

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Lower number appears first.
                </p>

              </div>

              {/* BUTTONS */}

              <div className="flex flex-wrap justify-end gap-3 pt-2">

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    closeForm
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 font-black text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:bg-slate-400"
                >
                  {saving
                    ? "Saving..."
                    : editingChapter
                    ? "Save Changes"
                    : "Create Chapter"}
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
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="text-2xl">
        {emoji}
      </div>

      <p className="mt-2 text-xs font-bold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>

    </div>
  );
}