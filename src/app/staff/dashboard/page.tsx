"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type StaffUser = {
  id?: string;
  userId?: string;
  staffCode?: string;
  name?: string;
  phone?: string;
  staffRole?: string;
  designation?: string | null;
  department?: string | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getLoggedInStaff(): StaffUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const keys = [
    "staffUser",
    "user",
    "agentUser",
  ];

  for (const key of keys) {
    const stored = localStorage.getItem(key);

    if (!stored) {
      continue;
    }

    try {
      const parsed = JSON.parse(stored);

      if (
        parsed &&
        (
          parsed.staffRole ||
          parsed.staffCode ||
          parsed.role === "STAFF" ||
          parsed.role === "SUPERVISOR"
        )
      ) {
        return parsed;
      }
    } catch {
      // Ignore invalid localStorage values.
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function StaffDashboardPage() {
  const [staff, setStaff] =
    useState<StaffUser | null>(null);

  useEffect(() => {
    setStaff(getLoggedInStaff());
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Staff Portal
            </p>

            <h1 className="text-2xl font-black">
              Staff Dashboard
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Welcome back
              {staff?.name
                ? `, ${staff.name}`
                : ""}
              .
            </p>
          </div>

          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
          >
            Logout
          </Link>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">

        {/* PROFILE */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Logged In Staff
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {staff?.name || "Staff Member"}
              </h2>

              <div className="mt-3 space-y-1 text-sm font-semibold text-slate-600">

                {staff?.staffCode && (
                  <p>
                    🪪 Staff Code:{" "}
                    <span className="font-black text-slate-900">
                      {staff.staffCode}
                    </span>
                  </p>
                )}

                {staff?.staffRole && (
                  <p>
                    👤 Role:{" "}
                    <span className="font-black text-slate-900">
                      {staff.staffRole}
                    </span>
                  </p>
                )}

                {staff?.designation && (
                  <p>
                    💼 {staff.designation}
                  </p>
                )}

                {staff?.department && (
                  <p>
                    🏢 {staff.department}
                  </p>
                )}

                {staff?.phone && (
                  <p>
                    📱 {staff.phone}
                  </p>
                )}

              </div>

            </div>

            <div className="rounded-2xl bg-blue-50 p-4 text-center">

              <div className="text-4xl">
                👨‍💼
              </div>

              <p className="mt-2 text-xs font-black uppercase tracking-wide text-blue-700">
                Active Session
              </p>

            </div>

          </div>

        </div>

        {/* QUICK ACTIONS */}

        <div className="mt-5">

          <h2 className="text-lg font-black">
            Work Dashboard
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Access your assigned work and daily activity.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <DashboardCard
              href="/customers"
              emoji="👥"
              title="Customers"
              description="View and manage customers."
            />

            <DashboardCard
              href="/enquiries"
              emoji="📞"
              title="Enquiries"
              description="Manage new enquiries."
            />

            <DashboardCard
              href="/follow-ups"
              emoji="📅"
              title="Follow-Ups"
              description="Check pending follow-ups."
            />

            <DashboardCard
              href="/renewals"
              emoji="🔄"
              title="Renewals"
              description="Review renewal work."
            />

            <DashboardCard
              href="/policies"
              emoji="📄"
              title="Policies"
              description="View policy records."
            />

            <DashboardCard
              href="/sub-agents"
              emoji="🤝"
              title="Sub Agents"
              description="Manage assigned sub-agents."
            />

            <DashboardCard
              href="/staff"
              emoji="👨‍💼"
              title="Staff Directory"
              description="View staff information."
            />

            <DashboardCard
              href="/profile"
              emoji="⚙️"
              title="Profile"
              description="View your account profile."
            />

          </div>

        </div>

        {/* TODAY */}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            label="Today's Enquiries"
            value="0"
            emoji="📞"
          />

          <StatCard
            label="Follow-Ups Due"
            value="0"
            emoji="📅"
          />

          <StatCard
            label="Renewals Due"
            value="0"
            emoji="🔄"
          />

          <StatCard
            label="Policies This Month"
            value="0"
            emoji="📄"
          />

        </div>

      </section>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function DashboardCard({
  href,
  emoji,
  title,
  description,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >

      <div className="text-3xl">
        {emoji}
      </div>

      <h3 className="mt-3 font-black">
        {title}
      </h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>

    </Link>
  );
}

function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-bold text-slate-600">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black">
            {value}
          </p>

        </div>

        <div className="text-2xl">
          {emoji}
        </div>

      </div>

    </div>
  );
}