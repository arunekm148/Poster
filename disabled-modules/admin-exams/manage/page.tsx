"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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

type ExamLanguageLink = {
  id: string;
  isDefault: boolean;
  isActive: boolean;
  language: Language;
};

type Exam = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;

  languages: ExamLanguageLink[];

  _count: {
    modules: number;
    questions: number;
    tests: number;
  };
};

type ExamForm = {
  code: string;
  title: string;
  description: string;
};

const EMPTY_FORM: ExamForm = {
  code: "",
  title: "",
  description: "",
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function isAdminRole(
  role?: string
) {
  const normalized =
    String(role || "")
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

function formatDate(
  value?: string
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

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
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function ManageExamsPage() {
  const [
    admin,
    setAdmin,
  ] =
    useState<AdminUser | null>(
      null
    );

  const [
    exams,
    setExams,
  ] =
    useState<Exam[]>([]);

  const [
    languages,
    setLanguages,
  ] =
    useState<Language[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingExam,
    setEditingExam,
  ] =
    useState<Exam | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<ExamForm>(
      EMPTY_FORM
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    actionExamId,
    setActionExamId,
  ] =
    useState<string | null>(
      null
    );

  const [
    languageExam,
    setLanguageExam,
  ] =
    useState<Exam | null>(
      null
    );

  const [
    selectedLanguageId,
    setSelectedLanguageId,
  ] =
    useState("");

  const [
    makeDefaultLanguage,
    setMakeDefaultLanguage,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  const loadData =
    useCallback(
      async (
        adminId: string
      ) => {
        try {
          setLoading(true);

          setError("");

          const response =
            await fetch(
              `/api/admin/exams?adminId=${encodeURIComponent(
                adminId
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          let data: {
            success?: boolean;
            message?: string;
            exams?: Exam[];
            languages?: Language[];
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
                "Unable to load exams."
            );
          }

          setExams(
            Array.isArray(
              data.exams
            )
              ? data.exams
              : []
          );

          setLanguages(
            Array.isArray(
              data.languages
            )
              ? data.languages
              : []
          );
        } catch (error) {
          console.error(
            "LOAD EXAMS ERROR:",
            error
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load exams."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD ADMIN                                                               */
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

        setLoading(false);

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

        setLoading(false);

        return;
      }

      setAdmin(parsed);

      void loadData(
        parsed.id
      );
    } catch (error) {
      console.error(
        "EXAM ADMIN SESSION ERROR:",
        error
      );

      setError(
        "Unable to read Admin session."
      );

      setLoading(false);
    }
  }, [
    loadData,
  ]);

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredExams =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return exams;
      }

      return exams.filter(
        (exam) =>
          [
            exam.code,
            exam.title,
            exam.description ||
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              query
            )
      );
    }, [
      exams,
      search,
    ]);

  /* ------------------------------------------------------------------------ */
  /* CREATE / EDIT FORM                                                       */
  /* ------------------------------------------------------------------------ */

  function openCreate() {
    setEditingExam(
      null
    );

    setForm(
      EMPTY_FORM
    );

    setError("");
    setMessage("");

    setFormOpen(
      true
    );
  }

  function openEdit(
    exam: Exam
  ) {
    setEditingExam(
      exam
    );

    setForm({
      code: exam.code,
      title:
        exam.title,
      description:
        exam.description ||
        "",
    });

    setError("");
    setMessage("");

    setFormOpen(
      true
    );
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(
      false
    );

    setEditingExam(
      null
    );

    setForm(
      EMPTY_FORM
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE EXAM                                                                */
  /* ------------------------------------------------------------------------ */

  async function submitExam(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!admin?.id) {
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
        "Exam code is required."
      );

      return;
    }

    if (!title) {
      setError(
        "Exam title is required."
      );

      return;
    }

    try {
      setSaving(true);

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/exams",
          {
            method:
              editingExam
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

                action:
                  editingExam
                    ? "UPDATE_EXAM"
                    : "CREATE_EXAM",

                examId:
                  editingExam?.id,

                code,
                title,

                description:
                  form.description.trim(),
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
            "Unable to save exam."
        );
      }

      setMessage(
        data.message ||
          "Exam saved successfully."
      );

      setFormOpen(
        false
      );

      setEditingExam(
        null
      );

      setForm(
        EMPTY_FORM
      );

      await loadData(
        admin.id
      );
    } catch (error) {
      console.error(
        "SAVE EXAM ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save exam."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* STATUS                                                                   */
  /* ------------------------------------------------------------------------ */

  async function changeStatus(
    exam: Exam,
    field:
      | "isActive"
      | "isPublished",
    value: boolean
  ) {
    if (!admin?.id) {
      return;
    }

    try {
      setActionExamId(
        exam.id
      );

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/exams",
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
                  "EXAM_STATUS",

                examId:
                  exam.id,

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
            "Unable to update exam."
        );
      }

      setMessage(
        field ===
        "isPublished"
          ? value
            ? "Exam published successfully."
            : "Exam unpublished successfully."
          : value
          ? "Exam activated successfully."
          : "Exam deactivated successfully."
      );

      await loadData(
        admin.id
      );
    } catch (error) {
      console.error(
        "CHANGE EXAM STATUS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update exam."
      );
    } finally {
      setActionExamId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LANGUAGE                                                                 */
  /* ------------------------------------------------------------------------ */

  function openLanguages(
    exam: Exam
  ) {
    setLanguageExam(
      exam
    );

    setSelectedLanguageId(
      ""
    );

    setMakeDefaultLanguage(
      false
    );

    setError("");
    setMessage("");
  }

  async function linkLanguage() {
    if (
      !admin?.id ||
      !languageExam ||
      !selectedLanguageId
    ) {
      return;
    }

    try {
      setSaving(true);

      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/exams",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                action:
                  "LINK_LANGUAGE",

                examId:
                  languageExam.id,

                languageId:
                  selectedLanguageId,

                isDefault:
                  makeDefaultLanguage,
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
            "Unable to link language."
        );
      }

      setMessage(
        data.message ||
          "Language linked successfully."
      );

      setLanguageExam(
        null
      );

      setSelectedLanguageId(
        ""
      );

      setMakeDefaultLanguage(
        false
      );

      await loadData(
        admin.id
      );
    } catch (error) {
      console.error(
        "LINK LANGUAGE ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to link language."
      );
    } finally {
      setSaving(false);
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

        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Master Admin Access Required
          </h1>

          <p className="mt-3 font-semibold text-slate-600">
            {error}
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
          >
            ← Back to Admin
          </Link>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-100 pb-16 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 text-white">

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <Link
                href="/admin/exams"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-black hover:bg-white/20"
              >
                ←
              </Link>

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                  Exam Management
                </p>

                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  📘 Manage Exams
                </h1>

                <p className="mt-1 text-sm font-semibold text-blue-200">
                  Create, edit, publish and control examinations.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                openCreate
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-900 shadow"
            >
              + Add Exam
            </button>

          </div>

        </div>

      </header>

      {/* BODY */}

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
            ✓ {message}
          </div>
        )}

        {/* SEARCH */}

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div className="w-full sm:max-w-lg">

              <label className="text-sm font-black text-slate-800">
                Search Exam
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
                placeholder="Search code, title or description"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
              />

            </div>

            <button
              type="button"
              onClick={() => {
                if (
                  admin?.id
                ) {
                  void loadData(
                    admin.id
                  );
                }
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-700"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

        {/* LIST */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center font-black text-slate-600">
              Loading exams...
            </div>
          ) : filteredExams.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                📘
              </div>

              <h2 className="mt-3 text-xl font-black">
                No Exams Created
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Create IC-38 or another examination using Add Exam.
              </p>

              <button
                type="button"
                onClick={
                  openCreate
                }
                className="mt-5 rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
              >
                + Add First Exam
              </button>

            </div>
          ) : (
            <div className="grid gap-4">

              {filteredExams.map(
                (exam) => (
                  <article
                    key={
                      exam.id
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                            {exam.code}
                          </span>

                          {exam.isPublished ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                              PUBLISHED
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                              DRAFT
                            </span>
                          )}

                          {exam.isActive ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                              INACTIVE
                            </span>
                          )}

                        </div>

                        <h2 className="mt-3 text-xl font-black text-slate-950">
                          {exam.title}
                        </h2>

                        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                          {exam.description ||
                            "No description added."}
                        </p>

                        <p className="mt-3 text-xs font-bold text-slate-400">
                          Created{" "}
                          {formatDate(
                            exam.createdAt
                          )}
                        </p>

                        {/* LANGUAGES */}

                        <div className="mt-4 flex flex-wrap gap-2">

                          {exam.languages.length >
                          0 ? (
                            exam.languages.map(
                              (
                                link
                              ) => (
                                <span
                                  key={
                                    link.id
                                  }
                                  className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800"
                                >
                                  {
                                    link.language
                                      .nativeName
                                  }

                                  {link.isDefault
                                    ? " • Default"
                                    : ""}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              No languages linked
                            </span>
                          )}

                        </div>

                      </div>

                      {/* COUNTS */}

                      <div className="grid min-w-full grid-cols-3 gap-2 sm:min-w-[360px] lg:min-w-[360px]">

                        <div className="rounded-xl bg-slate-50 p-3 text-center">

                          <p className="text-xl font-black">
                            {
                              exam._count
                                .modules
                            }
                          </p>

                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Modules
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 text-center">

                          <p className="text-xl font-black">
                            {
                              exam._count
                                .questions
                            }
                          </p>

                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Questions
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 text-center">

                          <p className="text-xl font-black">
                            {
                              exam._count
                                .tests
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
                          openEdit(
                            exam
                          )
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openLanguages(
                            exam
                          )
                        }
                        className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800"
                      >
                        🌐 Languages
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionExamId ===
                          exam.id
                        }
                        onClick={() =>
                          void changeStatus(
                            exam,
                            "isPublished",
                            !exam.isPublished
                          )
                        }
                        className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                          exam.isPublished
                            ? "border border-amber-200 bg-amber-50 text-amber-800"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {actionExamId ===
                        exam.id
                          ? "Saving..."
                          : exam.isPublished
                          ? "Unpublish"
                          : "✓ Publish"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionExamId ===
                          exam.id
                        }
                        onClick={() =>
                          void changeStatus(
                            exam,
                            "isActive",
                            !exam.isActive
                          )
                        }
                        className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                          exam.isActive
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : "border border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {actionExamId ===
                        exam.id
                          ? "Saving..."
                          : exam.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <Link
                        href={`/admin/exams/modules?examId=${encodeURIComponent(
                          exam.id
                        )}`}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
                      >
                        📚 Modules →
                      </Link>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </div>

      </section>

      {/* -------------------------------------------------------------------- */}
      {/* CREATE / EDIT MODAL                                                  */}
      {/* -------------------------------------------------------------------- */}

      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">

          <div className="mx-auto my-10 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Exam Management
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {editingExam
                    ? "Edit Exam"
                    : "Create Exam"}
                </h2>

              </div>

              <button
                type="button"
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
                submitExam
              }
              className="mt-6 space-y-5"
            >

              <div>

                <label className="text-sm font-black">
                  Exam Code *
                </label>

                <input
                  value={
                    form.code
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        code:
                          event.target.value
                            .toUpperCase()
                            .replace(
                              /\s+/g,
                              ""
                            ),
                      })
                    )
                  }
                  placeholder="Example: IC38"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-bold outline-none focus:border-blue-600"
                />

              </div>

              <div>

                <label className="text-sm font-black">
                  Exam Title *
                </label>

                <input
                  value={
                    form.title
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Example: IC-38 Insurance Agent Examination"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
                />

              </div>

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
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        description:
                          event.target.value,
                      })
                    )
                  }
                  rows={4}
                  placeholder="Enter examination description"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
                />

              </div>

              <div className="flex flex-wrap justify-end gap-3">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
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
                    : editingExam
                    ? "Save Changes"
                    : "Create Exam"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* LANGUAGE MODAL                                                       */}
      {/* -------------------------------------------------------------------- */}

      {languageExam && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">

          <div className="mx-auto my-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                  Exam Languages
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {languageExam.title}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setLanguageExam(
                    null
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>

            </div>

            {/* CURRENT LANGUAGES */}

            <div className="mt-5">

              <p className="text-sm font-black">
                Currently Linked
              </p>

              <div className="mt-2 flex flex-wrap gap-2">

                {languageExam.languages.length >
                0 ? (
                  languageExam.languages.map(
                    (
                      link
                    ) => (
                      <span
                        key={
                          link.id
                        }
                        className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-800"
                      >
                        {
                          link.language
                            .nativeName
                        }
                        {" — "}
                        {
                          link.language
                            .name
                        }

                        {link.isDefault
                          ? " • Default"
                          : ""}
                      </span>
                    )
                  )
                ) : (
                  <p className="text-sm font-semibold text-slate-500">
                    No language linked yet.
                  </p>
                )}

              </div>

            </div>

            {/* ADD LANGUAGE */}

            <div className="mt-6">

              <label className="text-sm font-black">
                Add Language
              </label>

              <select
                value={
                  selectedLanguageId
                }
                onChange={(
                  event
                ) =>
                  setSelectedLanguageId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-bold"
              >

                <option value="">
                  Select Language
                </option>

                {languages
                  .filter(
                    (
                      language
                    ) =>
                      language.isActive
                  )
                  .map(
                    (
                      language
                    ) => (
                      <option
                        key={
                          language.id
                        }
                        value={
                          language.id
                        }
                      >
                        {
                          language.nativeName
                        }
                        {" — "}
                        {
                          language.name
                        }
                        {" ("}
                        {
                          language.code
                        }
                        {")"}
                      </option>
                    )
                  )}

              </select>

            </div>

            {/* DEFAULT */}

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <input
                type="checkbox"
                checked={
                  makeDefaultLanguage
                }
                onChange={(
                  event
                ) =>
                  setMakeDefaultLanguage(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />

              <div>

                <p className="font-black">
                  Make Default Language
                </p>

                <p className="text-xs font-semibold text-slate-500">
                  This becomes the default language for this examination.
                </p>

              </div>

            </label>

            {/* ACTIONS */}

            <div className="mt-6 flex flex-wrap justify-end gap-3">

              <Link
                href="/admin/exams/languages"
                className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 font-black text-violet-800"
              >
                Manage Languages
              </Link>

              <button
                type="button"
                disabled={
                  saving ||
                  !selectedLanguageId
                }
                onClick={() =>
                  void linkLanguage()
                }
                className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white disabled:bg-slate-400"
              >
                {saving
                  ? "Saving..."
                  : "Link Language"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}