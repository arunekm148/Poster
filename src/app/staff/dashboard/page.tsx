"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

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

  supervisorId?: string | null;
};

type Enquiry = {
  id: string;
  status?: string | null;

  assignedStaffId?: string | null;
  assignedSupervisorId?: string | null;

  enquiryDate?: string | null;
  createdAt?: string | null;
};

type FollowUp = {
  id: string;
  enquiryId?: string | null;

  status?: string | null;

  followUpDate?: string | null;
  nextFollowUpDate?: string | null;
};

type Policy = {
  id: string;

  originStaffId?: string | null;
  originSupervisorId?: string | null;

  subAgentId?: string | null;

  premium?: number | string | null;
  actualPremium?: number | string | null;
  customerPremium?: number | string | null;

  startDate?: string | null;
  createdAt?: string | null;
  expiryDate?: string | null;

  isActive?: boolean;
};

type SubAgent = {
  id: string;
  name?: string | null;
  code?: string | null;
  assignedStaffId?: string | null;
  isActive?: boolean;
};

type Customer = {
  id: string;
  name?: string | null;
  assignedStaffId?: string | null;
  subAgentId?: string | null;
  isActive?: boolean;
};

type DashboardData = {
  enquiries: Enquiry[];
  followUps: FollowUp[];
  policies: Policy[];
  subAgents: SubAgent[];
  customers: Customer[];
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
    const stored =
      localStorage.getItem(key);

    if (!stored) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(stored);

      if (
        parsed &&
        (
          parsed.staffRole ||
          parsed.staffCode ||
          parsed.role === "STAFF" ||
          parsed.role === "SUPERVISOR" ||
          parsed.accountType === "STAFF"
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

function getDateOnly(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function sameDay(
  a: Date | null,
  b: Date
) {
  if (!a) {
    return false;
  }

  return (
    a.getFullYear() ===
      b.getFullYear() &&
    a.getMonth() ===
      b.getMonth() &&
    a.getDate() ===
      b.getDate()
  );
}

function isWithin(
  date: Date | null,
  start: Date,
  end: Date
) {
  if (!date) {
    return false;
  }

  return (
    date.getTime() >=
      start.getTime() &&
    date.getTime() <=
      end.getTime()
  );
}

function formatMoney(
  value: number
) {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function getPolicyPremium(
  policy: Policy
) {
  const value =
    Number(
      policy.customerPremium ??
      policy.actualPremium ??
      policy.premium ??
      0
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

function getPolicyDate(
  policy: Policy
) {
  return getDateOnly(
    policy.startDate ||
    policy.createdAt
  );
}

function getMonthRange(
  date: Date
) {
  return {
    start:
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ),

    end:
      new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      ),
  };
}

function getFinancialYearRange(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  const startYear =
    month >= 3
      ? year
      : year - 1;

  return {
    start:
      new Date(
        startYear,
        3,
        1
      ),

    end:
      new Date(
        startYear + 1,
        2,
        31,
        23,
        59,
        59,
        999
      ),

    label:
      `FY ${startYear}-${String(
        startYear + 1
      ).slice(-2)}`,
  };
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function StaffDashboardPage() {
  const router =
    useRouter();

  const [
    staff,
    setStaff,
  ] =
    useState<StaffUser | null>(
      null
    );

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
    currentTime,
    setCurrentTime,
  ] =
    useState<Date>(
      new Date()
    );

  const [
    data,
    setData,
  ] =
    useState<DashboardData>({
      enquiries: [],
      followUps: [],
      policies: [],
      subAgents: [],
      customers: [],
    });

  /* ------------------------------------------------------------------------ */
  /* LOAD DASHBOARD DATA                                                      */
  /* ------------------------------------------------------------------------ */

  const loadDashboard =
    useCallback(
      async (
        ownerUserId: string
      ) => {
        try {
          setLoading(true);
          setError("");

          const [
            enquiriesResult,
            followUpsResult,
            policiesResult,
            subAgentsResult,
            customersResult,
          ] =
            await Promise.allSettled([
              fetch(
                `/api/enquiries?userId=${encodeURIComponent(
                  ownerUserId
                )}`,
                {
                  cache: "no-store",
                }
              ).then(
                async (
                  response
                ) => ({
                  response,
                  json:
                    await response.json(),
                })
              ),

              fetch(
                `/api/follow-ups?userId=${encodeURIComponent(
                  ownerUserId
                )}`,
                {
                  cache: "no-store",
                }
              ).then(
                async (
                  response
                ) => ({
                  response,
                  json:
                    await response.json(),
                })
              ),

              fetch(
                `/api/policies?userId=${encodeURIComponent(
                  ownerUserId
                )}`,
                {
                  cache: "no-store",
                }
              ).then(
                async (
                  response
                ) => ({
                  response,
                  json:
                    await response.json(),
                })
              ),

              fetch(
                `/api/sub-agents?userId=${encodeURIComponent(
                  ownerUserId
                )}&activeOnly=false`,
                {
                  cache: "no-store",
                }
              ).then(
                async (
                  response
                ) => ({
                  response,
                  json:
                    await response.json(),
                })
              ),

              fetch(
                `/api/customers?userId=${encodeURIComponent(
                  ownerUserId
                )}`,
                {
                  cache: "no-store",
                }
              ).then(
                async (
                  response
                ) => ({
                  response,
                  json:
                    await response.json(),
                })
              ),
            ]);

          const next:
            DashboardData = {
              enquiries: [],
              followUps: [],
              policies: [],
              subAgents: [],
              customers: [],
            };

          if (
            enquiriesResult.status ===
              "fulfilled" &&
            enquiriesResult.value
              .response.ok
          ) {
            next.enquiries =
              Array.isArray(
                enquiriesResult.value
                  .json.enquiries
              )
                ? enquiriesResult.value
                    .json.enquiries
                : [];
          }

          if (
            followUpsResult.status ===
              "fulfilled" &&
            followUpsResult.value
              .response.ok
          ) {
            next.followUps =
              Array.isArray(
                followUpsResult.value
                  .json.followUps
              )
                ? followUpsResult.value
                    .json.followUps
                : [];
          }

          if (
            policiesResult.status ===
              "fulfilled" &&
            policiesResult.value
              .response.ok
          ) {
            const json =
              policiesResult.value
                .json;

            next.policies =
              Array.isArray(
                json.policies
              )
                ? json.policies
                : Array.isArray(
                    json.data
                  )
                  ? json.data
                  : [];
          }

          if (
            subAgentsResult.status ===
              "fulfilled" &&
            subAgentsResult.value
              .response.ok
          ) {
            next.subAgents =
              Array.isArray(
                subAgentsResult.value
                  .json.subAgents
              )
                ? subAgentsResult.value
                    .json.subAgents
                : [];
          }

          if (
            customersResult.status ===
              "fulfilled" &&
            customersResult.value
              .response.ok
          ) {
            const json =
              customersResult.value
                .json;

            next.customers =
              Array.isArray(
                json.customers
              )
                ? json.customers
                : Array.isArray(
                    json.data
                  )
                  ? json.data
                  : [];
          }

          setData(next);
        } catch (
          loadError
        ) {
          console.error(
            "STAFF DASHBOARD LOAD ERROR:",
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dashboard."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* INITIAL                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const loggedInStaff =
      getLoggedInStaff();

    if (
      !loggedInStaff?.id ||
      !loggedInStaff?.userId
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    setStaff(
      loggedInStaff
    );

    void loadDashboard(
      loggedInStaff.userId
    );
  }, [
    router,
    loadDashboard,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setCurrentTime(
            new Date()
          );
        },
        30000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* METRICS                                                                  */
  /* ------------------------------------------------------------------------ */

  const metrics =
    useMemo(() => {
      const staffId =
        staff?.id || "";

      const today =
        new Date();

      const todayOnly =
        new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );

      const thisMonth =
        getMonthRange(today);

      const financialYear =
        getFinancialYearRange(
          today
        );

      const in30Days =
        new Date(todayOnly);

      in30Days.setDate(
        in30Days.getDate() +
          30
      );

      const assignedEnquiries =
        data.enquiries.filter(
          (
            enquiry
          ) =>
            enquiry.assignedStaffId ===
            staffId
        );

      const enquiryIds =
        new Set(
          assignedEnquiries.map(
            (
              enquiry
            ) =>
              enquiry.id
          )
        );

      const pendingFollowUps =
        data.followUps.filter(
          (
            followUp
          ) =>
            followUp.status ===
              "PENDING" &&
            Boolean(
              followUp.enquiryId &&
              enquiryIds.has(
                followUp.enquiryId
              )
            )
        );

      const todayFollowUps =
        pendingFollowUps.filter(
          (
            followUp
          ) =>
            sameDay(
              getDateOnly(
                followUp.nextFollowUpDate ||
                followUp.followUpDate
              ),
              todayOnly
            )
        );

      const overdueFollowUps =
        pendingFollowUps.filter(
          (
            followUp
          ) => {
            const date =
              getDateOnly(
                followUp.nextFollowUpDate ||
                followUp.followUpDate
              );

            return Boolean(
              date &&
              date.getTime() <
                todayOnly.getTime()
            );
          }
        );

      const assignedPolicies =
        data.policies.filter(
          (
            policy
          ) =>
            policy.originStaffId ===
            staffId &&
            policy.isActive !==
              false
        );

      const policiesThisMonth =
        assignedPolicies.filter(
          (
            policy
          ) =>
            isWithin(
              getPolicyDate(
                policy
              ),
              thisMonth.start,
              thisMonth.end
            )
        );

      const fyPolicies =
        assignedPolicies.filter(
          (
            policy
          ) =>
            isWithin(
              getPolicyDate(
                policy
              ),
              financialYear.start,
              financialYear.end
            )
        );

      const renewalsDue =
        assignedPolicies.filter(
          (
            policy
          ) => {
            const expiry =
              getDateOnly(
                policy.expiryDate
              );

            return Boolean(
              expiry &&
              expiry.getTime() >=
                todayOnly.getTime() &&
              expiry.getTime() <=
                in30Days.getTime()
            );
          }
        );

      const converted =
        assignedEnquiries.filter(
          (
            enquiry
          ) =>
            String(
              enquiry.status ||
                ""
            ).toUpperCase() ===
            "CONVERTED"
        );

      const assignedSubAgents =
        data.subAgents.filter(
          (
            item
          ) =>
            item.assignedStaffId ===
              staffId &&
            item.isActive !==
              false
        );

      const assignedCustomers =
        data.customers.filter(
          (
            customer
          ) =>
            customer.assignedStaffId ===
              staffId &&
            customer.isActive !==
              false
        );

      return {
        assignedEnquiries:
          assignedEnquiries.length,

        todayEnquiries:
          assignedEnquiries.filter(
            (
              enquiry
            ) =>
              sameDay(
                getDateOnly(
                  enquiry.enquiryDate ||
                  enquiry.createdAt
                ),
                todayOnly
              )
          ).length,

        pendingFollowUps:
          pendingFollowUps.length,

        todayFollowUps:
          todayFollowUps.length,

        overdueFollowUps:
          overdueFollowUps.length,

        converted:
          converted.length,

        activePolicies:
          assignedPolicies.length,

        policiesThisMonth:
          policiesThisMonth.length,

        thisMonthPremium:
          policiesThisMonth.reduce(
            (
              total,
              policy
            ) =>
              total +
              getPolicyPremium(
                policy
              ),
            0
          ),

        fyPremium:
          fyPolicies.reduce(
            (
              total,
              policy
            ) =>
              total +
              getPolicyPremium(
                policy
              ),
            0
          ),

        renewalsDue:
          renewalsDue.length,

        renewalPremium:
          renewalsDue.reduce(
            (
              total,
              policy
            ) =>
              total +
              getPolicyPremium(
                policy
              ),
            0
          ),

        assignedSubAgents:
          assignedSubAgents.length,

        assignedCustomers:
          assignedCustomers.length,

        financialYearLabel:
          financialYear.label,
      };
    }, [
      staff,
      data,
    ]);

  /* ------------------------------------------------------------------------ */
  /* LOGOUT                                                                   */
  /* ------------------------------------------------------------------------ */

  function handleLogout() {
    localStorage.removeItem(
      "staffUser"
    );

    localStorage.removeItem(
      "agentUser"
    );

    localStorage.removeItem(
      "user"
    );

    localStorage.removeItem(
      "userId"
    );

    router.replace(
      "/login"
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-5">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
                Staff Portal
              </p>

              <h1 className="mt-1 text-2xl font-black">
                Welcome,{" "}
                {staff?.name ||
                  "Staff"}
              </h1>

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-300">

                {staff?.staffCode && (
                  <span className="rounded-full bg-white/10 px-3 py-1">
                    🪪 {staff.staffCode}
                  </span>
                )}

                <span className="rounded-full bg-white/10 px-3 py-1">
                  {String(
                    staff?.staffRole ||
                    "STAFF"
                  ).toUpperCase()}
                </span>

                <span>
                  📅{" "}
                  {currentTime.toLocaleDateString(
                    "en-IN",
                    {
                      day:
                        "2-digit",
                      month:
                        "short",
                      year:
                        "numeric",
                    }
                  )}
                </span>

                <span className="text-amber-300">
                  🕒{" "}
                  {currentTime.toLocaleTimeString(
                    "en-IN",
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                      hour12:
                        true,
                    }
                  )}
                </span>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Link
                href="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                👤
              </Link>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white"
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-5">

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* TODAY COMMAND CENTER */}

        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-violet-800 p-5 text-white shadow-xl">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="max-w-xl">

              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-200">
                Today&apos;s Work
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Your Daily Command Center
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
                Focus on assigned enquiries, follow-ups, renewals and new business.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[470px]">

              <ActionTile
                href="/enquiries"
                emoji="📥"
                title="Enquiries"
                value={
                  loading
                    ? "..."
                    : String(
                        metrics.todayEnquiries
                      )
                }
              />

              <ActionTile
                href="/follow-ups"
                emoji="📞"
                title="Today"
                value={
                  loading
                    ? "..."
                    : String(
                        metrics.todayFollowUps
                      )
                }
              />

              <ActionTile
                href="/follow-ups"
                emoji="⚠️"
                title="Overdue"
                value={
                  loading
                    ? "..."
                    : String(
                        metrics.overdueFollowUps
                      )
                }
              />

              <ActionTile
                href="/renewals"
                emoji="🔄"
                title="Renewals"
                value={
                  loading
                    ? "..."
                    : String(
                        metrics.renewalsDue
                      )
                }
              />

            </div>

          </div>

        </section>

        {/* ATTENDANCE STRIP */}

        <section className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">

          <Link
            href="/staff/my-attendance"
            className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm"
          >

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                  Attendance
                </p>

                <h3 className="mt-1 font-black text-blue-950">
                  🕒 My Attendance
                </h3>

                <p className="mt-1 text-sm font-semibold text-blue-700">
                  Punch in, punch out and view my attendance.
                </p>

              </div>

              <span className="font-black text-blue-700">
                →
              </span>

            </div>

          </Link>

          <Link
            href="/staff/my-regularization"
            className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-black text-violet-700 shadow-sm"
          >
            📝 My Regularization
          </Link>

        </section>

        {/* BUSINESS SNAPSHOT */}

        <section className="mt-6">

          <div className="mb-3">

            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              Business Performance
            </p>

            <h2 className="mt-1 text-xl font-black">
              My Business Snapshot
            </h2>

          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

            <MetricCard
              label="This Month Premium"
              value={
                loading
                  ? "..."
                  : formatMoney(
                      metrics.thisMonthPremium
                    )
              }
              emoji="₹"
              valueClass="text-emerald-700"
            />

            <MetricCard
              label={
                metrics.financialYearLabel
              }
              value={
                loading
                  ? "..."
                  : formatMoney(
                      metrics.fyPremium
                    )
              }
              emoji="📊"
              valueClass="text-violet-700"
            />

            <MetricCard
              label="Policies This Month"
              value={
                loading
                  ? "..."
                  : String(
                      metrics.policiesThisMonth
                    )
              }
              emoji="📄"
              valueClass="text-blue-700"
            />

            <MetricCard
              label="Converted"
              value={
                loading
                  ? "..."
                  : String(
                      metrics.converted
                    )
              }
              emoji="🎯"
              valueClass="text-emerald-700"
            />

          </div>

        </section>

        {/* PIPELINE + RENEWALS */}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                  Work Pipeline
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Enquiries & Follow-ups
                </h2>
              </div>

              <Link
                href="/follow-ups"
                className="text-xs font-black text-blue-700"
              >
                View →
              </Link>

            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">

              <SmallStat
                label="Assigned"
                value={
                  metrics.assignedEnquiries
                }
                valueClass="text-blue-700"
              />

              <SmallStat
                label="Pending"
                value={
                  metrics.pendingFollowUps
                }
                valueClass="text-orange-700"
              />

              <SmallStat
                label="Overdue"
                value={
                  metrics.overdueFollowUps
                }
                valueClass="text-red-700"
              />

            </div>

          </section>

          <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">

            <div className="flex items-center justify-between gap-3">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                  Renewal Center
                </p>

                <h2 className="mt-1 text-lg font-black">
                  My Renewal Work
                </h2>
              </div>

              <Link
                href="/renewals"
                className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white"
              >
                View
              </Link>

            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">

              <SmallStat
                label="Due 30 Days"
                value={
                  metrics.renewalsDue
                }
                valueClass="text-orange-700"
              />

              <SmallStat
                label="Premium"
                value={
                  formatMoney(
                    metrics.renewalPremium
                  )
                }
                valueClass="text-cyan-800"
              />

            </div>

          </section>

        </div>

        {/* MY NETWORK */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                My Network
              </p>

              <h2 className="mt-1 text-lg font-black">
                Customers & Sub-Agents
              </h2>
            </div>

            <Link
              href="/sub-agents"
              className="text-xs font-black text-violet-700"
            >
              View Network →
            </Link>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">

            <Link
              href="/customers"
              className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
            >

              <p className="text-xs font-black text-blue-700">
                👥 Assigned Customers
              </p>

              <p className="mt-2 text-3xl font-black text-blue-950">
                {loading
                  ? "..."
                  : metrics.assignedCustomers}
              </p>

            </Link>

            <Link
              href="/sub-agents"
              className="rounded-2xl border border-violet-200 bg-violet-50 p-4"
            >

              <p className="text-xs font-black text-violet-700">
                🤝 Assigned Sub-Agents
              </p>

              <p className="mt-2 text-3xl font-black text-violet-950">
                {loading
                  ? "..."
                  : metrics.assignedSubAgents}
              </p>

            </Link>

          </div>

        </section>

        {/* QUICK ACTIONS */}

        <section className="mt-6">

          <div className="mb-3">

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Quick Actions
            </p>

            <h2 className="mt-1 text-lg font-black">
              Start New Work
            </h2>

          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            <QuickAction
              href="/enquiries/add"
              emoji="📥"
              title="New Enquiry"
              className="bg-indigo-700"
            />

            <QuickAction
              href="/customers/add"
              emoji="➕"
              title="Add Customer"
              className="bg-blue-700"
            />

            <QuickAction
              href="/policies/add"
              emoji="📄"
              title="Add Policy"
              className="bg-emerald-700"
            />

            <QuickAction
              href="/follow-ups"
              emoji="📞"
              title="Follow-up"
              className="bg-violet-700"
            />

          </div>

        </section>

        {/* ACCOUNT */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Staff Account
              </p>

              <h2 className="mt-1 text-lg font-black">
                {staff?.name ||
                  "Staff Member"}
              </h2>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-500">

                {staff?.designation && (
                  <span>
                    💼 {
                      staff.designation
                    }
                  </span>
                )}

                {staff?.department && (
                  <span>
                    🏢 {
                      staff.department
                    }
                  </span>
                )}

                {staff?.phone && (
                  <span>
                    📱 {
                      staff.phone
                    }
                  </span>
                )}

              </div>

            </div>

            <div className="flex flex-wrap gap-2">

              <Link
                href="/profile"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                Profile
              </Link>

              <Link
                href="/staff/my-leave"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700"
              >
                🌴 My Leave
              </Link>

            </div>

          </div>

        </section>

      </section>

      {/* MOBILE NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg md:hidden">

        <div className="grid h-16 grid-cols-5">

          <Link
            href="/staff-dashboard"
            className="flex flex-col items-center justify-center text-blue-700"
          >
            <span>🏠</span>
            <span className="text-xs">
              Home
            </span>
          </Link>

          <Link
            href="/enquiries"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span>📥</span>
            <span className="text-xs">
              Enquiry
            </span>
          </Link>

          <Link
            href="/customers/add"
            className="flex flex-col items-center justify-center"
          >
            <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-2xl text-white shadow-lg">
              +
            </div>

            <span className="text-xs">
              Add
            </span>
          </Link>

          <Link
            href="/renewals"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span>🔄</span>
            <span className="text-xs">
              Renewal
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span>👤</span>
            <span className="text-xs">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function ActionTile({
  href,
  emoji,
  title,
  value,
}: {
  href: string;
  emoji: string;
  title: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white p-3 text-center text-slate-950 shadow-sm transition hover:-translate-y-0.5"
    >
      <div className="text-xl">
        {emoji}
      </div>

      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-black text-blue-700">
        {value}
      </p>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  emoji,
  valueClass,
}: {
  label: string;
  value: string;
  emoji: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-black ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg">
          {emoji}
        </div>

      </div>

    </div>
  );
}

function SmallStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function QuickAction({
  href,
  emoji,
  title,
  className,
}: {
  href: string;
  emoji: string;
  title: string;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl p-4 text-center text-white shadow-sm transition hover:-translate-y-0.5 ${className}`}
    >
      <div className="text-xl">
        {emoji}
      </div>

      <p className="mt-1 text-xs font-black">
        {title}
      </p>
    </Link>
  );
}
