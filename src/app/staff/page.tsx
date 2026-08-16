"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------------------------------- */

type StaffStatus = "ACTIVE" | "INACTIVE";

type StaffMember = {
  id: string;
  staffCode: string;
  name: string;
  phone?: string;
  email?: string;
  designation?: string;
  department?: string;
  supervisorName?: string | null;
  subAgentsManaged: number;
  policiesThisMonth: number;
  enquiriesThisMonth: number;
  renewalsHandled: number;
  attendancePercent: number;
  status: StaffStatus;
};

/* -------------------------------------------------------------------------- */
/* TEMPORARY STAFF DATA                                                       */
/* -------------------------------------------------------------------------- */

const demoStaff: StaffMember[] = [
  {
    id: "1",
    staffCode: "STF001",
    name: "Rahul",
    phone: "9876543210",
    email: "rahul@example.com",
    designation: "Supervisor",
    department: "Sales",
    supervisorName: null,
    subAgentsManaged: 8,
    policiesThisMonth: 6,
    enquiriesThisMonth: 19,
    renewalsHandled: 12,
    attendancePercent: 96,
    status: "ACTIVE",
  },
  {
    id: "2",
    staffCode: "STF002",
    name: "Anil",
    phone: "9876501234",
    email: "anil@example.com",
    designation: "Marketing Executive",
    department: "Marketing",
    supervisorName: "Rahul",
    subAgentsManaged: 4,
    policiesThisMonth: 3,
    enquiriesThisMonth: 27,
    renewalsHandled: 5,
    attendancePercent: 92,
    status: "ACTIVE",
  },
  {
    id: "3",
    staffCode: "STF003",
    name: "Meera",
    phone: "9895001122",
    email: "meera@example.com",
    designation: "Renewal Executive",
    department: "Renewal",
    supervisorName: "Rahul",
    subAgentsManaged: 2,
    policiesThisMonth: 2,
    enquiriesThisMonth: 8,
    renewalsHandled: 21,
    attendancePercent: 89,
    status: "ACTIVE",
  },
];

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | StaffStatus
  >("ALL");

  const staff = demoStaff;

  const filteredStaff = useMemo(() => {
    const value = search.trim().toLowerCase();

    return staff.filter((item) => {
      if (
        statusFilter !== "ALL" &&
        item.status !== statusFilter
      ) {
        return false;
      }

      if (!value) {
        return true;
      }

      return [
        item.staffCode,
        item.name,
        item.phone,
        item.email,
        item.designation,
        item.department,
        item.supervisorName,
      ].some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [search, staff, statusFilter]);

  const totalStaff = staff.length;

  const activeStaff = staff.filter(
    (item) => item.status === "ACTIVE"
  ).length;

  const supervisors = staff.filter(
    (item) =>
      String(item.designation || "")
        .toLowerCase()
        .includes("supervisor")
  ).length;

  const subAgentsManaged = staff.reduce(
    (total, item) =>
      total + item.subAgentsManaged,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">

          <div className="flex items-center gap-3">

            <Link
              href="/dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-black shadow-sm"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Team Management
              </p>

              <h1 className="text-2xl font-black">
                Staff Management
              </h1>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Manage staff, supervisors, assignments and performance.
              </p>
            </div>

          </div>

          <Link
            href="/staff/add"
            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800"
          >
            + Add Staff
          </Link>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6">

        {/* SUMMARY */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            label="Total Staff"
            value={totalStaff}
            emoji="👥"
          />

          <SummaryCard
            label="Active Staff"
            value={activeStaff}
            emoji="✅"
            valueClass="text-emerald-700"
            borderClass="border-emerald-200"
          />

          <SummaryCard
            label="Supervisors"
            value={supervisors}
            emoji="🧑‍💼"
            valueClass="text-violet-700"
            borderClass="border-violet-200"
          />

          <SummaryCard
            label="Sub Agents Managed"
            value={subAgentsManaged}
            emoji="🤝"
            valueClass="text-amber-700"
            borderClass="border-amber-200"
          />

        </div>

        {/* QUICK MANAGEMENT */}

        <div className="mt-5 grid gap-3 md:grid-cols-3">

          <QuickLink
            href="/staff/add"
            title="Add Staff"
            description="Create a new staff member."
            emoji="➕"
          />

          <QuickLink
            href="/sub-agents"
            title="Sub-Agent Management"
            description="Manage sub-agents and assignments."
            emoji="🤝"
          />

          <QuickLink
            href="/renewals"
            title="Renewal Work"
            description="Review renewal workload and follow-ups."
            emoji="🔄"
          />

        </div>

        {/* SEARCH + FILTER */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

            <div className="flex-1">

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search staff name, code, phone, department or supervisor..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            <div className="flex flex-wrap gap-2">

              <FilterButton
                active={statusFilter === "ALL"}
                onClick={() =>
                  setStatusFilter("ALL")
                }
              >
                All
              </FilterButton>

              <FilterButton
                active={statusFilter === "ACTIVE"}
                onClick={() =>
                  setStatusFilter("ACTIVE")
                }
              >
                Active
              </FilterButton>

              <FilterButton
                active={statusFilter === "INACTIVE"}
                onClick={() =>
                  setStatusFilter("INACTIVE")
                }
              >
                Inactive
              </FilterButton>

            </div>

          </div>

        </div>

        {/* STAFF LIST */}

        <div className="mt-5">

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

            <div>
              <h2 className="text-lg font-black">
                Staff Directory
              </h2>

              <p className="text-sm font-semibold text-slate-500">
                Staff hierarchy, work ownership and performance.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {filteredStaff.length} Record
              {filteredStaff.length === 1
                ? ""
                : "s"}
            </span>

          </div>

          {filteredStaff.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="text-5xl">
                👤
              </div>

              <h3 className="mt-3 text-lg font-black">
                No Staff Found
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Try another search or add a new staff member.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {filteredStaff.map(
                (member) => (
                  <StaffCard
                    key={member.id}
                    member={member}
                  />
                )
              )}

            </div>

          )}

        </div>

      </section>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* STAFF CARD                                                                 */
/* -------------------------------------------------------------------------- */

function StaffCard({
  member,
}: {
  member: StaffMember;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
              {member.staffCode}
            </span>

            <StatusBadge
              status={member.status}
            />

          </div>

          <h3 className="mt-2 text-xl font-black">
            {member.name}
          </h3>

          <div className="mt-2 space-y-1 text-sm font-semibold text-slate-600">

            {member.designation && (
              <p>
                💼 {member.designation}
              </p>
            )}

            {member.department && (
              <p>
                🏢 {member.department}
              </p>
            )}

            {member.supervisorName && (
              <p>
                👨‍💼 Supervisor:{" "}
                <span className="font-black text-slate-800">
                  {member.supervisorName}
                </span>
              </p>
            )}

            {member.phone && (
              <p>
                📱 {member.phone}
              </p>
            )}

            {member.email && (
              <p className="break-all">
                ✉️ {member.email}
              </p>
            )}

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          <Link
            href={`/staff/${member.id}`}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white"
          >
            View
          </Link>

          <Link
            href={`/staff/edit/${member.id}`}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"
          >
            Edit
          </Link>

        </div>

      </div>

      {/* PERFORMANCE */}

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-5">

        <MiniStat
          label="Sub Agents"
          value={member.subAgentsManaged}
        />

        <MiniStat
          label="Policies / Month"
          value={member.policiesThisMonth}
        />

        <MiniStat
          label="Enquiries"
          value={member.enquiriesThisMonth}
        />

        <MiniStat
          label="Renewals"
          value={member.renewalsHandled}
        />

        <MiniStat
          label="Attendance"
          value={`${member.attendancePercent}%`}
        />

      </div>

      {/* ACTIVITY RULE */}

      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">

        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
          Monthly Activity
        </p>

        <p className="mt-1 text-sm font-semibold text-emerald-900">
          {member.policiesThisMonth >= 1
            ? "✅ Active this month — at least one policy completed."
            : "⚠️ No policy completed this month."}
        </p>

      </div>

    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  emoji,
  valueClass = "text-slate-950",
  borderClass = "border-slate-200",
}: {
  label: string;
  value: number;
  emoji: string;
  valueClass?: string;
  borderClass?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${borderClass}`}
    >

      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-bold text-slate-600">
            {label}
          </p>

          <p
            className={`mt-1 text-3xl font-black ${valueClass}`}
          >
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {value}
      </p>

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: StaffStatus;
}) {
  if (status === "ACTIVE") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
      Inactive
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-black ${
        active
          ? "bg-blue-700 text-white"
          : "border border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function QuickLink({
  href,
  title,
  description,
  emoji,
}: {
  href: string;
  title: string;
  description: string;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >

      <div className="text-2xl">
        {emoji}
      </div>

      <h3 className="mt-2 font-black">
        {title}
      </h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>

    </Link>
  );
}