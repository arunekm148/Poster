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
import {
  useSearchParams,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AdminUser = {
  id?: string;
  name?: string;
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

type ExamModule = {
  id: string;
  examId: string;
  code: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  sortOrder: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;

  _count: {
    chapters: number;
    questions: number;
    tests: number;
  };
};

type ModuleForm = {
  code: string;
  name: string;
  description: string;
  emoji: string;
  sortOrder: string;
};

const EMPTY_FORM: ModuleForm = {
  code: "",
  name: "",
  description: "",
  emoji: "",
  sortOrder: "0",
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
/* PAGE WRAPPER                                                               */
/* -------------------------------------------------------------------------- */

export default function ExamModulesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">
              📚
            </div>

            <p className="mt-4 font-black text-slate-700">
              Loading Modules...
            </p>
          </div>
        </main>
      }
    >
      <ExamModulesContent />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

function ExamModulesContent() {
  const searchParams =
    useSearchParams();

  const examId =
    String(
      searchParams.get(
        "examId"
      ) || ""
    ).trim();

  const [
    admin,
    setAdmin,
  ] =
    useState<AdminUser | null>(
      null
    );

  const [
    exam,
    setExam,
  ] =
    useState<ExamInfo | null>(
      null
    );

  const [
    modules,
    setModules,
  ] =
    useState<ExamModule[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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
    editingModule,
    setEditingModule,
  ] =
    useState<ExamModule | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<ModuleForm>(
      EMPTY_FORM
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    actionModuleId,
    setActionModuleId,
  ] =
    useState<string | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD MODULES                                                             */
  /* ------------------------------------------------------------------------ */

  const loadModules =
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

        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const response =
            await fetch(
              `/api/admin/exams/modules?adminId=${encodeURIComponent(
                adminId
              )}&examId=${encodeURIComponent(
                examId
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          let data: {
            success?: boolean;
            message?: string;
            exam?: ExamInfo;
            modules?: ExamModule[];
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
                "Unable to load modules."
            );
          }

          setExam(
            data.exam ||
              null
          );

          setModules(
            Array.isArray(
              data.modules
            )
              ? data.modules
              : []
          );
        } catch (
          error
        ) {
          console.error(
            "LOAD MODULES ERROR:",
            error
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to load modules."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        examId,
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

      void loadModules(
        parsed.id
      );
    } catch (
      error
    ) {
      console.error(
        "MODULE ADMIN SESSION ERROR:",
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
    loadModules,
  ]);

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredModules =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return modules;
      }

      return modules.filter(
        (
          module
        ) =>
          [
            module.code,
            module.name,
            module.description ||
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(
              query
            )
      );
    }, [
      modules,
      search,
    ]);

  /* ------------------------------------------------------------------------ */
  /* FORM OPEN                                                                */
  /* ------------------------------------------------------------------------ */

  function openCreate() {
    setEditingModule(
      null
    );

    setForm({
      ...EMPTY_FORM,
      sortOrder:
        String(
          modules.length
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

  function openEdit(
    module: ExamModule
  ) {
    setEditingModule(
      module
    );

    setForm({
      code:
        module.code,

      name:
        module.name,

      description:
        module.description ||
        "",

      emoji:
        module.emoji ||
        "",

      sortOrder:
        String(
          module.sortOrder
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

  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(
      false
    );

    setEditingModule(
      null
    );

    setForm(
      EMPTY_FORM
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE MODULE                                                              */
  /* ------------------------------------------------------------------------ */

  async function saveModule(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !admin?.id ||
      !examId
    ) {
      return;
    }

    const code =
      form.code
        .trim()
        .toUpperCase();

    const name =
      form.name.trim();

    if (!code) {
      setError(
        "Module code is required."
      );

      return;
    }

    if (!name) {
      setError(
        "Module name is required."
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
          "/api/admin/exams/modules",
          {
            method:
              editingModule
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

                action:
                  editingModule
                    ? "UPDATE_MODULE"
                    : undefined,

                moduleId:
                  editingModule?.id,

                code,

                name,

                description:
                  form.description.trim(),

                emoji:
                  form.emoji.trim(),

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
            "Unable to save module."
        );
      }

      setMessage(
        data.message ||
          "Module saved successfully."
      );

      setFormOpen(
        false
      );

      setEditingModule(
        null
      );

      setForm(
        EMPTY_FORM
      );

      await loadModules(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "SAVE MODULE ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save module."
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

  async function changeStatus(
    module: ExamModule,
    field:
      | "isActive"
      | "isPublished",
    value: boolean
  ) {
    if (!admin?.id) {
      return;
    }

    try {
      setActionModuleId(
        module.id
      );

      setError(
        ""
      );

      setMessage(
        ""
      );

      const response =
        await fetch(
          "/api/admin/exams/modules",
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
                  "MODULE_STATUS",

                moduleId:
                  module.id,

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
            "Unable to update module."
        );
      }

      setMessage(
        field ===
        "isPublished"
          ? value
            ? "Module published successfully."
            : "Module unpublished successfully."
          : value
          ? "Module activated successfully."
          : "Module deactivated successfully."
      );

      await loadModules(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "MODULE STATUS ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update module."
      );
    } finally {
      setActionModuleId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                   */
  /* ------------------------------------------------------------------------ */

  async function deleteModule(
    module: ExamModule
  ) {
    if (!admin?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete module "${module.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionModuleId(
        module.id
      );

      setError(
        ""
      );

      setMessage(
        ""
      );

      const response =
        await fetch(
          "/api/admin/exams/modules",
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

                moduleId:
                  module.id,
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
            "Unable to delete module."
        );
      }

      setMessage(
        data.message ||
          "Module deleted successfully."
      );

      await loadModules(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "DELETE MODULE ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete module."
      );
    } finally {
      setActionModuleId(
        null
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
            href="/admin/exams"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
          >
            ← Back to Exam Management
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

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-violet-800 text-white">

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <Link
                href="/admin/exams/manage"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-black hover:bg-white/20"
              >
                ←
              </Link>

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                  Exam Management
                </p>

                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  📚 Modules
                </h1>

                <p className="mt-1 text-sm font-semibold text-violet-200">
                  {exam
                    ? `${exam.code} — ${exam.title}`
                    : "Manage examination modules"}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                openCreate
              }
              className="rounded-xl bg-white px-5 py-3 text-sm font-black text-violet-900 shadow"
            >
              + Add Module
            </button>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* EXAM INFO */}

        {exam && (
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                  Selected Exam
                </p>

                <h2 className="mt-1 text-xl font-black text-violet-950">
                  {exam.code} —{" "}
                  {exam.title}
                </h2>

              </div>

              <div className="flex flex-wrap gap-2">

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    exam.isPublished
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {exam.isPublished
                    ? "PUBLISHED"
                    : "DRAFT"}
                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    exam.isActive
                      ? "bg-blue-100 text-blue-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {exam.isActive
                    ? "ACTIVE"
                    : "INACTIVE"}
                </span>

              </div>

            </div>

          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bold text-emerald-800">
            ✓ {message}
          </div>
        )}

        {/* SEARCH */}

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div className="w-full sm:max-w-lg">

              <label className="text-sm font-black text-slate-800">
                Search Module
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
                placeholder="Search code, name or description"
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-violet-600"
              />

            </div>

            <button
              type="button"
              onClick={() => {
                if (
                  admin?.id
                ) {
                  void loadModules(
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

        {/* MODULE LIST */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center font-black text-slate-600">
              Loading modules...
            </div>
          ) : filteredModules.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                📚
              </div>

              <h2 className="mt-3 text-xl font-black">
                No Modules Created
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Add Life, General, Health or another module.
              </p>

              <button
                type="button"
                onClick={
                  openCreate
                }
                className="mt-5 rounded-xl bg-violet-700 px-5 py-3 font-black text-white"
              >
                + Add First Module
              </button>

            </div>
          ) : (
            <div className="grid gap-4">

              {filteredModules.map(
                (
                  module
                ) => (
                  <article
                    key={
                      module.id
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0">

                        <div className="flex items-start gap-4">

                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-3xl">
                            {module.emoji ||
                              "📘"}
                          </div>

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-800">
                                {
                                  module.code
                                }
                              </span>

                              {module.isPublished ? (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                                  PUBLISHED
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                                  DRAFT
                                </span>
                              )}

                              {module.isActive ? (
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                                  INACTIVE
                                </span>
                              )}

                            </div>

                            <h2 className="mt-2 text-xl font-black">
                              {
                                module.name
                              }
                            </h2>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                              {module.description ||
                                "No description added."}
                            </p>

                            <p className="mt-3 text-xs font-bold text-slate-400">
                              Sort Order:{" "}
                              {
                                module.sortOrder
                              }
                              {" • "}
                              Created{" "}
                              {formatDate(
                                module.createdAt
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* COUNTS */}

                      <div className="grid min-w-full grid-cols-3 gap-2 sm:min-w-[360px] lg:min-w-[360px]">

                        <div className="rounded-xl bg-slate-50 p-3 text-center">

                          <p className="text-xl font-black">
                            {
                              module._count
                                .chapters
                            }
                          </p>

                          <p className="text-[10px] font-black uppercase text-slate-500">
                            Chapters
                          </p>

                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 text-center">

                          <p className="text-xl font-black">
                            {
                              module._count
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
                              module._count
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
                            module
                          )
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800"
                      >
                        ✏️ Edit
                      </button>

                      <Link
                        href={`/admin/exams/chapters?examId=${encodeURIComponent(
                          examId
                        )}&moduleId=${encodeURIComponent(
                          module.id
                        )}`}
                        className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-800"
                      >
                        📖 Chapters →
                      </Link>

                      <button
                        type="button"
                        disabled={
                          actionModuleId ===
                          module.id
                        }
                        onClick={() =>
                          void changeStatus(
                            module,
                            "isPublished",
                            !module.isPublished
                          )
                        }
                        className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                          module.isPublished
                            ? "border border-amber-200 bg-amber-50 text-amber-800"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {actionModuleId ===
                        module.id
                          ? "Saving..."
                          : module.isPublished
                          ? "Unpublish"
                          : "✓ Publish"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionModuleId ===
                          module.id
                        }
                        onClick={() =>
                          void changeStatus(
                            module,
                            "isActive",
                            !module.isActive
                          )
                        }
                        className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                          module.isActive
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : "border border-blue-200 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {actionModuleId ===
                        module.id
                          ? "Saving..."
                          : module.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          actionModuleId ===
                          module.id
                        }
                        onClick={() =>
                          void deleteModule(
                            module
                          )
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700"
                      >
                        🗑 Delete
                      </button>

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

                <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                  Module Management
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {editingModule
                    ? "Edit Module"
                    : "Create Module"}
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
                saveModule
              }
              className="mt-6 space-y-5"
            >

              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">

                <div>

                  <label className="text-sm font-black">
                    Module Code *
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
                                "_"
                              ),
                        })
                      )
                    }
                    placeholder="LIFE"
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-bold outline-none focus:border-violet-600"
                  />

                </div>

                <div>

                  <label className="text-sm font-black">
                    Emoji
                  </label>

                  <input
                    value={
                      form.emoji
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,

                          emoji:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="❤️"
                    className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-2xl outline-none focus:border-violet-600"
                  />

                </div>

              </div>

              <div>

                <label className="text-sm font-black">
                  Module Name *
                </label>

                <input
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        name:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Life Insurance"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-violet-600"
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
                  placeholder="Module description"
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-violet-600"
                />

              </div>

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
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,

                        sortOrder:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-violet-600"
                />

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Lower number appears first.
                </p>

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
                  className="rounded-xl bg-violet-700 px-6 py-3 font-black text-white disabled:bg-slate-400"
                >
                  {saving
                    ? "Saving..."
                    : editingModule
                    ? "Save Changes"
                    : "Create Module"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}