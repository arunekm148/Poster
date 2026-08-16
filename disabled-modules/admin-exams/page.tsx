"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type AdminUser = {
  id?: string;
  name?: string;
  role?: string;
};

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

type CardProps = {
  href: string;
  icon: string;
  title: string;
  description: string;
  colorClass: string;
};

function ManagementCard({
  href,
  icon,
  title,
  description,
  colorClass,
}: CardProps) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
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
        Manage
        <span className="transition group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}

export default function AdminExamsPage() {
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

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        setAccessError(
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
        setAccessError(
          "Master Admin access is required."
        );

        setLoading(
          false
        );

        return;
      }

      setAdmin(parsed);
    } catch (error) {
      console.error(
        "ADMIN EXAMS SESSION ERROR:",
        error
      );

      setAccessError(
        "Unable to load Admin session."
      );
    } finally {
      setLoading(
        false
      );
    }
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            🎓
          </div>

          <p className="mt-4 font-black text-slate-700">
            Loading Exam Management...
          </p>

        </div>
      </main>
    );
  }

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

  return (
    <main className="min-h-screen bg-slate-100 pb-16 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-800 text-white">

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-4">

              <Link
                href="/admin"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-black hover:bg-white/20"
              >
                ←
              </Link>

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">
                  Master Admin
                </p>

                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  🎓 Exam Management
                </h1>

                <p className="mt-1 text-sm font-semibold text-blue-200">
                  Manage IC-38 and future training examinations.
                </p>

              </div>

            </div>

            <Link
              href="/exam-preparation"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-900"
            >
              Agent Preview →
            </Link>

          </div>

        </div>

      </header>

      {/* BODY */}

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* INFO */}

        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">

          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            Control Centre
          </p>

          <h2 className="mt-1 text-xl font-black text-blue-950">
            Select what you want to manage
          </h2>

          <p className="mt-2 text-sm font-semibold text-blue-800">
            Start with Exams and Languages. Modules, Chapters, Questions and Tests will use those master records.
          </p>

        </div>

        {/* MANAGEMENT CARDS */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <ManagementCard
            href="/admin/exams/manage"
            icon="📘"
            title="Exams"
            description="Add, edit, activate and publish IC-38 or future examinations."
            colorClass="bg-blue-100 text-blue-700"
          />

          <ManagementCard
            href="/admin/exams/languages"
            icon="🌐"
            title="Languages"
            description="Add and manage English, Malayalam, Hindi and other exam languages."
            colorClass="bg-cyan-100 text-cyan-700"
          />

          <ManagementCard
            href="/admin/exams/modules"
            icon="📚"
            title="Modules"
            description="Manage Life, General, Health and other examination modules."
            colorClass="bg-violet-100 text-violet-700"
          />

          <ManagementCard
            href="/admin/exams/chapters"
            icon="📖"
            title="Chapters"
            description="Organise each module into chapters for study and testing."
            colorClass="bg-amber-100 text-amber-700"
          />

          <ManagementCard
            href="/admin/exams/questions"
            icon="❓"
            title="Question Bank"
            description="Add, edit, import and manage multilingual questions and answers."
            colorClass="bg-red-100 text-red-700"
          />

          <ManagementCard
            href="/admin/exams/practice-tests"
            icon="⚡"
            title="Practice Tests"
            description="Build quick practice and chapter-based tests."
            colorClass="bg-orange-100 text-orange-700"
          />

          <ManagementCard
            href="/admin/exams/mock-exams"
            icon="🎯"
            title="Mock Exams"
            description="Create timed mock examinations with question count and pass percentage."
            colorClass="bg-emerald-100 text-emerald-700"
          />

          <ManagementCard
            href="/admin/exams/results"
            icon="📊"
            title="Results"
            description="Review attempts, scores, pass status and performance."
            colorClass="bg-indigo-100 text-indigo-700"
          />

        </div>

        {/* QUICK ACTIONS */}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">

          <Link
            href="/admin/exams/questions"
            className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
          >

            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
              Bulk Management
            </p>

            <h2 className="mt-1 text-xl font-black">
              📥 Excel / CSV Question Import
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Import large question banks and multilingual translations using the same QuestionCode.
            </p>

            <p className="mt-4 text-sm font-black text-emerald-700">
              Open Question Import →
            </p>

          </Link>

          <Link
            href="/exam-preparation"
            className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
          >

            <p className="text-xs font-black uppercase tracking-wider text-violet-700">
              Preview
            </p>

            <h2 className="mt-1 text-xl font-black">
              👨‍🎓 Agent Learning Centre
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Preview how published examinations will appear to agents.
            </p>

            <p className="mt-4 text-sm font-black text-violet-700">
              Open Agent Preview →
            </p>

          </Link>

        </div>

      </section>

    </main>
  );
}