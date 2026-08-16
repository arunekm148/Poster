"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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

type PlatformSetting = {
  id?: string;
  key: string;
  value: string;
  description?: string | null;
};

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const EXAM_MODULE_SETTING_KEY =
  "EXAM_MODULE_ENABLED";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
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

function settingToBoolean(
  value?: string
) {
  return (
    String(
      value || ""
    )
      .trim()
      .toLowerCase() ===
    "true"
  );
}

/* -------------------------------------------------------------------------- */
/* ADMIN CARD                                                                 */
/* -------------------------------------------------------------------------- */

function AdminCard({
  href,
  icon,
  title,
  description,
  colorClass,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  colorClass: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${colorClass}`}
      >
        {icon}
      </div>

      <h2 className="mt-4 text-lg font-black text-slate-950">
        {title}
      </h2>

      <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-black text-blue-700">
        Open
        <span className="transition group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* MASTER ADMIN DASHBOARD                                                     */
/* -------------------------------------------------------------------------- */

export default function MasterAdminPage() {
  const router =
    useRouter();

  const [
    admin,
    setAdmin,
  ] =
    useState<AdminUser | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    accessError,
    setAccessError,
  ] =
    useState("");

  /* EXAM MODULE */

  const [
    examModuleEnabled,
    setExamModuleEnabled,
  ] =
    useState(false);

  const [
    examSettingLoading,
    setExamSettingLoading,
  ] =
    useState(true);

  const [
    examSettingSaving,
    setExamSettingSaving,
  ] =
    useState(false);

  const [
    examSettingMessage,
    setExamSettingMessage,
  ] =
    useState("");

  const [
    examSettingError,
    setExamSettingError,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD EXAM SETTING                                                        */
  /* ------------------------------------------------------------------------ */

  async function loadExamSetting() {
    try {
      setExamSettingLoading(
        true
      );

      setExamSettingError(
        ""
      );

    const response =
  await fetch(
    `/api/admin/platform-settings?key=${encodeURIComponent(
      EXAM_MODULE_SETTING_KEY
    )}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

      let data: {
        success?: boolean;
        message?: string;
        setting?: PlatformSetting;
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
            "Unable to load Exam Module setting."
        );
      }

      setExamModuleEnabled(
        settingToBoolean(
          data.setting?.value
        )
      );
    } catch (error) {
      console.error(
        "LOAD EXAM MODULE SETTING ERROR:",
        error
      );

      setExamSettingError(
        error instanceof Error
          ? error.message
          : "Unable to load Exam Module setting."
      );

      /*
       * Safety default:
       * If the setting cannot be loaded,
       * keep the agent-facing module OFF.
       */
      setExamModuleEnabled(
        false
      );
    } finally {
      setExamSettingLoading(
        false
      );
    }
  }

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
        setAccessError(
          "Please login before opening Master Admin."
        );

        setLoading(
          false
        );

        return;
      }

      const parsedUser:
        AdminUser =
        JSON.parse(
          savedUser
        );

      if (!parsedUser?.id) {
        setAccessError(
          "Admin session was not found."
        );

        setLoading(
          false
        );

        return;
      }

      if (
        !isAdminRole(
          parsedUser.role
        )
      ) {
        setAccessError(
          "This account does not have Master Admin access."
        );

        setLoading(
          false
        );

        return;
      }

      setAdmin(
        parsedUser
      );

      setLoading(
        false
      );

      void loadExamSetting();
    } catch (error) {
      console.error(
        "MASTER ADMIN SESSION ERROR:",
        error
      );

      setAccessError(
        "Unable to read Admin session."
      );

      setLoading(
        false
      );
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* CHANGE EXAM MODULE STATUS                                                */
  /* ------------------------------------------------------------------------ */

  async function changeExamModuleStatus(
    enabled: boolean
  ) {
    if (!admin?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        enabled
          ? "Turn ON Exam Preparation for agents?"
          : "Turn OFF Exam Preparation for agents?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setExamSettingSaving(
        true
      );

      setExamSettingError(
        ""
      );

      setExamSettingMessage(
        ""
      );

      const response =
  await fetch(
    "/api/admin/platform-settings",
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

                key:
                  EXAM_MODULE_SETTING_KEY,

                value:
                  enabled
                    ? "true"
                    : "false",

                description:
                  "Controls whether Exam Preparation is available to agents.",
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        setting?: PlatformSetting;
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
            "Unable to update Exam Module setting."
        );
      }

      const finalValue =
        settingToBoolean(
          data.setting?.value
        );

      setExamModuleEnabled(
        finalValue
      );

      setExamSettingMessage(
        finalValue
          ? "Exam Preparation is now ON for agents."
          : "Exam Preparation is now OFF for agents."
      );
    } catch (error) {
      console.error(
        "UPDATE EXAM MODULE SETTING ERROR:",
        error
      );

      setExamSettingError(
        error instanceof Error
          ? error.message
          : "Unable to update Exam Module setting."
      );
    } finally {
      setExamSettingSaving(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOGOUT                                                                   */
  /* ------------------------------------------------------------------------ */

  function handleLogout() {
    localStorage.removeItem(
      "agentUser"
    );

    localStorage.removeItem(
      "userId"
    );

    router.replace(
      "/login"
    );
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">

        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            🛡️
          </div>

          <p className="mt-4 font-black text-slate-700">
            Loading Master Admin...
          </p>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS DENIED                                                            */
  /* ------------------------------------------------------------------------ */

  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">

        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Master Admin Access Required
          </h1>

          <p className="mt-3 font-semibold text-slate-600">
            {accessError}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700"
            >
              ← Dashboard
            </Link>

            <Link
              href="/login"
              className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white"
            >
              Login
            </Link>

          </div>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-100 pb-12">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 text-white">

        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <Link
                href="/dashboard"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black transition hover:bg-white/20"
              >
                ←
              </Link>

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                  Master Admin
                </p>

                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  🛡️ Administration Centre
                </h1>

                <p className="mt-1 text-sm font-semibold text-blue-200">
                  Complete management and control panel
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Link
                href="/dashboard"
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black transition hover:bg-white/20"
              >
                Agent Dashboard
              </Link>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="rounded-xl bg-red-500/20 px-4 py-2.5 text-sm font-black text-red-100 transition hover:bg-red-500/30"
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      </header>

      {/* BODY */}

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* WELCOME */}

        <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-semibold text-blue-100">
                Welcome
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {admin.name ||
                  "Administrator"}
              </h2>

              <p className="mt-2 text-sm font-semibold text-blue-100">
                Manage agents, companies, announcements, exams, posters, wallet withdrawals and support.
              </p>

            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-4xl">
              👑
            </div>

          </div>

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* FEATURE CONTROL                                                    */}
        {/* ------------------------------------------------------------------ */}

        <div className="mt-7 rounded-3xl border border-orange-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-orange-700">
                Platform Feature Control
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                🎓 Exam Preparation Module
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                This switch controls the agent-facing Exam Preparation module.
                Exam administration remains available so development can continue
                even while the agent module is switched off.
              </p>

            </div>

            <div className="shrink-0">

              {examSettingLoading ? (
                <div className="rounded-2xl bg-slate-100 px-5 py-4 text-center font-black text-slate-500">
                  Loading...
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">

                  <div>

                    <p className="text-xs font-black uppercase text-slate-500">
                      Agent Access
                    </p>

                    <p
                      className={`mt-1 font-black ${
                        examModuleEnabled
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {examModuleEnabled
                        ? "ON"
                        : "OFF"}
                    </p>

                  </div>

                  <button
                    type="button"
                    disabled={
                      examSettingSaving
                    }
                    onClick={() =>
                      void changeExamModuleStatus(
                        !examModuleEnabled
                      )
                    }
                    className={`relative h-10 w-20 rounded-full transition disabled:opacity-50 ${
                      examModuleEnabled
                        ? "bg-emerald-600"
                        : "bg-slate-400"
                    }`}
                    aria-label="Toggle Exam Preparation Module"
                  >
                    <span
                      className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all ${
                        examModuleEnabled
                          ? "left-11"
                          : "left-1"
                      }`}
                    />
                  </button>

                </div>
              )}

            </div>

          </div>

          {examSettingMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              ✓ {examSettingMessage}
            </div>
          )}

          {examSettingError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              ⚠️ {examSettingError}
            </div>
          )}

        </div>

        {/* CORE ADMIN */}

        <div className="mt-7">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Administration
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Main Controls
            </h2>

          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <AdminCard
              href="/admin/agents"
              icon="👥"
              title="Agents"
              description="View and manage registered insurance agents and their accounts."
              colorClass="bg-blue-100 text-blue-700"
            />

            <AdminCard
              href="/admin/announcements"
              icon="📢"
              title="Announcements"
              description="Create and manage live announcements shown on agent dashboards."
              colorClass="bg-amber-100 text-amber-700"
            />

            <AdminCard
              href="/admin/companies"
              icon="🏢"
              title="Insurance Companies"
              description="Manage insurance company records used throughout the system."
              colorClass="bg-violet-100 text-violet-700"
            />

            <AdminCard
              href="/admin/exams"
              icon="🎓"
              title="Exam Management"
              description="Create exams, languages, modules, chapters, question banks, practice tests and mock exams."
              colorClass="bg-orange-100 text-orange-700"
            />

            <AdminCard
              href="/admin/support"
              icon="💬"
              title="Agent Support"
              description="Read and respond to support messages and feature requests."
              colorClass="bg-emerald-100 text-emerald-700"
            />

            <AdminCard
              href="/admin/media"
              icon="🖼️"
              title="Media"
              description="Manage media files and assets used by the platform."
              colorClass="bg-cyan-100 text-cyan-700"
            />

            <AdminCard
              href="/admin/poster"
              icon="🎨"
              title="Poster Admin"
              description="Manage posters and the poster contribution system."
              colorClass="bg-pink-100 text-pink-700"
            />

          </div>

        </div>

        {/* EXAM ADMIN */}

        <div className="mt-8">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-orange-700">
              Learning Centre
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Exam & Training Management
            </h2>

          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <AdminCard
              href="/admin/exams"
              icon="🎓"
              title="Exam Management"
              description="Manage IC-38 and future examinations, languages, modules, chapters and publishing."
              colorClass="bg-orange-100 text-orange-700"
            />

            {examModuleEnabled ? (
              <AdminCard
                href="/exam-preparation"
                icon="📚"
                title="Agent Exam Preview"
                description="Open the agent learning centre and preview the exam preparation experience."
                colorClass="bg-teal-100 text-teal-700"
              />
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-2xl">
                  🔒
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-700">
                  Agent Exam Preview
                </h2>

                <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
                  Agent-facing Exam Preparation is currently switched off.
                </p>

                <div className="mt-4 text-xs font-black text-red-600">
                  MODULE OFF
                </div>

              </div>
            )}

          </div>

        </div>

        {/* POSTER ADMIN */}

        <div className="mt-8">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-violet-700">
              Marketing & Wallet
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              Poster Management
            </h2>

          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <AdminCard
              href="/admin/poster"
              icon="🖼️"
              title="Poster Management"
              description="Open the complete poster administration and contribution centre."
              colorClass="bg-indigo-100 text-indigo-700"
            />

            <AdminCard
              href="/admin/poster/withdrawals"
              icon="💳"
              title="Poster Wallet Withdrawals"
              description="Approve, reject and complete contributor wallet withdrawal requests."
              colorClass="bg-emerald-100 text-emerald-700"
            />

          </div>

        </div>

        {/* QUICK LINKS */}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Quick Navigation
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Return to Agent CRM
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Open your normal agent dashboard without logging out.
              </p>

            </div>

            <Link
              href="/dashboard"
              className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white"
            >
              🏠 Agent Dashboard →
            </Link>

          </div>

        </div>

        {/* ADMIN DETAILS */}

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            Current Administrator
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="text-xs font-bold text-slate-400">
                Name
              </p>

              <p className="mt-1 font-black text-slate-900">
                {admin.name ||
                  "-"}
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="text-xs font-bold text-slate-400">
                Role
              </p>

              <p className="mt-1 font-black text-blue-700">
                {admin.role ||
                  "ADMIN"}
              </p>

            </div>

            <div className="rounded-2xl bg-slate-50 p-4">

              <p className="text-xs font-bold text-slate-400">
                Contact
              </p>

              <p className="mt-1 break-all font-black text-slate-900">
                {admin.email ||
                  admin.phone ||
                  "-"}
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}