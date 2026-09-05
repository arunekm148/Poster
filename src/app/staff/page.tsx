"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type LoggedInUser = {
  id?: string;
  userId?: string;
  role?: string;
  accountType?: string;
  name?: string;
};

type SupervisorInfo = {
  id: string;
  staffCode: string;
  name: string;
  staffRole: string;
};

type StaffMember = {
  id: string;
  userId: string;

  staffCode: string;
  name: string;

  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;

  staffRole: "STAFF" | "SUPERVISOR";

  designation?: string | null;
  department?: string | null;

  supervisorId?: string | null;

  address?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;

  joiningDate?: string | null;
  notes?: string | null;

  loginEnabled: boolean;
  isActive: boolean;

  inactiveReason?: string | null;
  inactiveAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  supervisor?: SupervisorInfo | null;

  _count?: {
    teamMembers?: number;
    attendance?: number;
  };
};

type StaffApiResponse = {
  success?: boolean;
  message?: string;
  staff?: StaffMember[];
};

type DirectoryFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "SUPERVISORS"
  | "LOGIN_ENABLED";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getLoggedInAgent(): LoggedInUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const keys = [
    "agentUser",
    "user",
  ];

  for (const key of keys) {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(raw);

      if (
        parsed &&
        (
          parsed.role === "AGENT" ||
          parsed.role === "ADMIN" ||
          parsed.accountType === "USER"
        )
      ) {
        return parsed;
      }
    } catch {
      // Ignore invalid localStorage data.
    }
  }

  return null;
}

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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

function isSupervisor(
  member: StaffMember
): boolean {
  if (
    member.staffRole ===
    "SUPERVISOR"
  ) {
    return true;
  }

  const designation =
    String(
      member.designation ||
      ""
    )
      .trim()
      .toLowerCase();

  return designation.includes(
    "supervisor"
  );
}

function scrollToDirectory() {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document
    .getElementById(
      "staff-directory"
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function StaffPage() {
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
    search,
    setSearch,
  ] =
    useState("");

  const [
    directoryFilter,
    setDirectoryFilter,
  ] =
    useState<DirectoryFilter>(
      "ALL"
    );

  const [
    staff,
    setStaff,
  ] =
    useState<StaffMember[]>([]);

  const loadStaff =
    useCallback(
      async (
        userId: string
      ) => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `/api/staff?userId=${encodeURIComponent(
                userId
              )}`,
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
              }
            );

          let data:
            StaffApiResponse = {};

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
            setError(
              data.message ||
              "Unable to load staff."
            );

            setStaff([]);

            return;
          }

          setStaff(
            Array.isArray(
              data.staff
            )
              ? data.staff
              : []
          );
        } catch (
          loadError
        ) {
          console.error(
            "LOAD STAFF ERROR:",
            loadError
          );

          setError(
            "Unable to connect to the staff server."
          );

          setStaff([]);
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    const loggedIn =
      getLoggedInAgent();

    const userId =
      String(
        loggedIn?.userId ||
        loggedIn?.id ||
        ""
      ).trim();

    if (!userId) {
      setError(
        "Agent login information was not found. Please log in again."
      );

      setLoading(false);

      return;
    }

    void loadStaff(userId);
  }, [
    loadStaff,
  ]);

  const filteredStaff =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return staff.filter(
        (
          member
        ) => {
          if (
            directoryFilter ===
              "ACTIVE" &&
            !member.isActive
          ) {
            return false;
          }

          if (
            directoryFilter ===
              "INACTIVE" &&
            member.isActive
          ) {
            return false;
          }

          if (
            directoryFilter ===
              "SUPERVISORS" &&
            !isSupervisor(
              member
            )
          ) {
            return false;
          }

          if (
            directoryFilter ===
              "LOGIN_ENABLED" &&
            !(
              member.loginEnabled &&
              member.isActive
            )
          ) {
            return false;
          }

          if (!value) {
            return true;
          }

          return [
            member.staffCode,
            member.name,
            member.phone,
            member.email,
            member.designation,
            member.department,
            member.supervisor?.name,
          ].some(
            (
              field
            ) =>
              String(
                field || ""
              )
                .toLowerCase()
                .includes(
                  value
                )
          );
        }
      );
    }, [
      search,
      staff,
      directoryFilter,
    ]);

  const totalStaff =
    staff.length;

  const activeStaff =
    staff.filter(
      (
        member
      ) =>
        member.isActive
    ).length;

  const supervisors =
    staff.filter(
      (
        member
      ) =>
        member.isActive &&
        isSupervisor(
          member
        )
    ).length;

  const loginEnabled =
    staff.filter(
      (
        member
      ) =>
        member.loginEnabled &&
        member.isActive
    ).length;

  const attendanceRecords =
    staff.reduce(
      (
        total,
        member
      ) =>
        total +
        Number(
          member._count
            ?.attendance ||
          0
        ),
      0
    );

  function chooseDirectoryFilter(
    filter:
      DirectoryFilter
  ) {
    setDirectoryFilter(
      filter
    );

    setSearch("");

    setTimeout(
      () => {
        scrollToDirectory();
      },
      50
    );
  }

  const directoryTitle =
    useMemo(() => {
      switch (
        directoryFilter
      ) {
        case "ACTIVE":
          return "Active Staff";

        case "INACTIVE":
          return "Inactive Staff";

        case "SUPERVISORS":
          return "Supervisors";

        case "LOGIN_ENABLED":
          return "Login Enabled Staff";

        case "ALL":
        default:
          return "Staff Directory";
      }
    }, [
      directoryFilter,
    ]);

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

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
                Staff & Attendance
              </h1>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Manage staff, supervisors, login access and attendance administration.
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

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            ⚠️ {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          <ClickableSummaryCard
            label="Total Staff"
            value={totalStaff}
            emoji="👥"
            active={
              directoryFilter ===
              "ALL"
            }
            onClick={() =>
              chooseDirectoryFilter(
                "ALL"
              )
            }
          />

          <ClickableSummaryCard
            label="Active Staff"
            value={activeStaff}
            emoji="✅"
            valueClass="text-emerald-700"
            borderClass="border-emerald-200"
            active={
              directoryFilter ===
              "ACTIVE"
            }
            onClick={() =>
              chooseDirectoryFilter(
                "ACTIVE"
              )
            }
          />

          <ClickableSummaryCard
            label="Supervisors"
            value={supervisors}
            emoji="🧑‍💼"
            valueClass="text-violet-700"
            borderClass="border-violet-200"
            active={
              directoryFilter ===
              "SUPERVISORS"
            }
            onClick={() =>
              chooseDirectoryFilter(
                "SUPERVISORS"
              )
            }
          />

          <ClickableSummaryCard
            label="Login Enabled"
            value={loginEnabled}
            emoji="🔐"
            valueClass="text-blue-700"
            borderClass="border-blue-200"
            active={
              directoryFilter ===
              "LOGIN_ENABLED"
            }
            onClick={() =>
              chooseDirectoryFilter(
                "LOGIN_ENABLED"
              )
            }
          />

          <SummaryCard
            label="Attendance Records"
            value={attendanceRecords}
            emoji="🕒"
            valueClass="text-amber-700"
            borderClass="border-amber-200"
          />

        </div>

        <div className="mt-6">

          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            Staff Management
          </p>

          <h2 className="mt-1 text-xl font-black">
            Team Administration
          </h2>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <QuickLink
              href="/staff/add"
              title="Add Staff"
              description="Create staff or supervisor login."
              emoji="➕"
            />

            <QuickLink
              href="/sub-agents"
              title="Sub-Agent Management"
              description="Manage assignments and sub-agents."
              emoji="🤝"
            />

            <QuickLink
              href="/dashboard"
              title="Agent Dashboard"
              description="Return to main dashboard."
              emoji="🏠"
            />

          </div>

        </div>

        <div className="mt-7 rounded-3xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Attendance Management
              </p>

              <h2 className="mt-1 text-xl font-black text-blue-950">
                Staff Attendance Administration
              </h2>

              <p className="mt-1 max-w-3xl text-sm font-semibold text-blue-700">
                Manage attendance rules, approvals, leave and office verification.
                Staff punch in and punch out is available only through individual staff login.
              </p>

            </div>

            <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700">
              🕒 Management
            </div>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <AttendanceAdminCard
              emoji="📊"
              title="Today's Attendance"
              description="See present, late, absent and not-punched staff."
            />

            <AttendanceAdminCard
              emoji="📝"
              title="Regularization"
              description="Review missed punch correction requests."
            />

            <AttendanceAdminCard
              emoji="🌴"
              title="Leave Approvals"
              description="Review and approve staff leave requests."
            />

            <AttendanceAdminCard
              emoji="⚙️"
              title="Attendance Settings"
              description="Office timing, grace and verification rules."
            />

            <AttendanceAdminCard
              emoji="🎉"
              title="Holiday Management"
              description="Configure company holidays and weekly offs."
            />

            <AttendanceAdminCard
              emoji="📍"
              title="GPS & Office Location"
              description="Configure office coordinates and attendance radius."
            />

          </div>

        </div>

        <div
          id="staff-directory"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

            <div className="flex-1">

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
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
                active={
                  directoryFilter ===
                  "ALL"
                }
                onClick={() =>
                  chooseDirectoryFilter(
                    "ALL"
                  )
                }
              >
                All
              </FilterButton>

              <FilterButton
                active={
                  directoryFilter ===
                  "ACTIVE"
                }
                onClick={() =>
                  chooseDirectoryFilter(
                    "ACTIVE"
                  )
                }
              >
                Active
              </FilterButton>

              <FilterButton
                active={
                  directoryFilter ===
                  "INACTIVE"
                }
                onClick={() =>
                  chooseDirectoryFilter(
                    "INACTIVE"
                  )
                }
              >
                Inactive
              </FilterButton>

              <FilterButton
                active={
                  directoryFilter ===
                  "SUPERVISORS"
                }
                onClick={() =>
                  chooseDirectoryFilter(
                    "SUPERVISORS"
                  )
                }
              >
                Supervisors
              </FilterButton>

              <FilterButton
                active={
                  directoryFilter ===
                  "LOGIN_ENABLED"
                }
                onClick={() =>
                  chooseDirectoryFilter(
                    "LOGIN_ENABLED"
                  )
                }
              >
                Login Enabled
              </FilterButton>

            </div>

          </div>

        </div>

        <div className="mt-5">

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

            <div>

              <h2 className="text-lg font-black">
                {directoryTitle}
              </h2>

              <p className="text-sm font-semibold text-slate-500">
                Live staff records from your database.
              </p>

            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {filteredStaff.length} Record
              {filteredStaff.length === 1
                ? ""
                : "s"}
            </span>

          </div>

          {loading ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-bold text-slate-500">
              Loading staff...
            </div>

          ) : filteredStaff.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="text-5xl">
                👤
              </div>

              <h3 className="mt-3 text-lg font-black">
                No Staff Found
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Try another search or choose another filter.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {filteredStaff.map(
                (
                  member
                ) => (
                  <StaffCard
                    key={
                      member.id
                    }
                    member={
                      member
                    }
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
  const teamCount =
    Number(
      member._count
        ?.teamMembers ||
      0
    );

  const attendanceCount =
    Number(
      member._count
        ?.attendance ||
      0
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
              {member.staffCode}
            </span>

            <RoleBadge
              member={
                member
              }
            />

            <StatusBadge
              active={
                member.isActive
              }
            />

            {!member.loginEnabled && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                Login Disabled
              </span>
            )}

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

            {member.supervisor && (
              <p>
                👨‍💼 Supervisor:{" "}
                <span className="font-black text-slate-800">
                  {
                    member
                      .supervisor
                      .name
                  }
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

            {member.joiningDate && (
              <p>
                📅 Joined:{" "}
                {formatDate(
                  member.joiningDate
                )}
              </p>
            )}

          </div>

        </div>

        <div>

          <Link
            href={`/staff/edit/${member.id}`}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
          >
            Edit
          </Link>

        </div>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">

        <MiniStat
          label="Team Members"
          value={
            teamCount
          }
        />

        <MiniStat
          label="Attendance Records"
          value={
            attendanceCount
          }
        />

        <MiniStat
          label="Login"
          value={
            member.loginEnabled
              ? "Enabled"
              : "Disabled"
          }
        />

        <MiniStat
          label="Status"
          value={
            member.isActive
              ? "Active"
              : "Inactive"
          }
        />

      </div>

      {!member.isActive &&
        member.inactiveReason && (
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">

            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Inactive Reason
            </p>

            <p className="mt-1 text-sm font-semibold text-red-900">
              {
                member.inactiveReason
              }
            </p>

          </div>
        )}

    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function ClickableSummaryCard({
  label,
  value,
  emoji,
  onClick,
  active,
  valueClass =
    "text-slate-950",
  borderClass =
    "border-slate-200",
}: {
  label: string;
  value: number;
  emoji: string;
  onClick: () => void;
  active: boolean;
  valueClass?: string;
  borderClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderClass} ${
        active
          ? "ring-2 ring-blue-200"
          : ""
      }`}
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

          <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-blue-600">
            View Staff →
          </p>

        </div>

        <div className="text-2xl">
          {emoji}
        </div>

      </div>

    </button>
  );
}

function SummaryCard({
  label,
  value,
  emoji,
  valueClass =
    "text-slate-950",
  borderClass =
    "border-slate-200",
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
  value:
    | number
    | string;
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
  active,
}: {
  active: boolean;
}) {
  if (active) {
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

function RoleBadge({
  member,
}: {
  member: StaffMember;
}) {
  if (
    isSupervisor(
      member
    )
  ) {
    return (
      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-700">
        Supervisor
      </span>
    );
  }

  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">
      Staff
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
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
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
      href={
        href
      }
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

function AttendanceAdminCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">

      <div className="text-2xl">
        {emoji}
      </div>

      <h3 className="mt-2 font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>

      <div className="mt-3 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
        Setup Next
      </div>

    </div>
  );
}
