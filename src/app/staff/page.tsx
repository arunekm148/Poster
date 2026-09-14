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
  staffs?: StaffMember[];
  data?: StaffMember[];
};

type SubAgent = {
  id: string;
  code?: string | null;
  name?: string | null;
  assignedStaffId?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
};

type Enquiry = {
  id: string;
  status?: string | null;
  assignedStaffId?: string | null;
  assignedSupervisorId?: string | null;
  assignedSubAgentId?: string | null;
  createdAt?: string | null;
  enquiryDate?: string | null;
  convertedAt?: string | null;
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

type DirectoryFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "SUPERVISORS"
  | "LOGIN_ENABLED";

type PerformanceScope =
  | "ALL"
  | "AGENT_DIRECT"
  | string;

type StaffMetrics = {
  assignedSubAgents: number;
  activeSubAgents: number;
  inactiveSubAgents: number;

  activeSubAgentsThisMonth: number;
  activeSubAgentsLastMonth: number;
  newlyActiveSubAgents: number;

  enquiries: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  convertedEnquiries: number;

  policies: number;
  thisMonthPremium: number;
  fyPremium: number;

  renewalsDueThisMonth: number;
  renewalsDue30Days: number;
  renewalPendingFy: number;
  renewalPendingPremium: number;
};

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

function formatMoney(
  value: number
) {
  if (
    !Number.isFinite(
      value
    )
  ) {
    return "₹0";
  }

  return `₹${value.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function getDateOnly(
  value?: string | null
): Date | null {
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

function scrollToPerformance() {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document
    .getElementById(
      "staff-performance"
    )
    ?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
}

function getFinancialYearRange(
  referenceDate: Date
) {
  const year =
    referenceDate.getFullYear();

  const month =
    referenceDate.getMonth();

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

function getMonthRange(
  referenceDate: Date,
  offset = 0
) {
  const start =
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() +
        offset,
      1
    );

  const end =
    new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() +
        offset +
        1,
      0,
      23,
      59,
      59,
      999
    );

  return {
    start,
    end,
  };
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
    performanceLoading,
    setPerformanceLoading,
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
    performanceScope,
    setPerformanceScope,
  ] =
    useState<PerformanceScope>(
      "ALL"
    );

  const [
    staff,
    setStaff,
  ] =
    useState<StaffMember[]>([]);

  const [
    subAgents,
    setSubAgents,
  ] =
    useState<SubAgent[]>([]);

  const [
    enquiries,
    setEnquiries,
  ] =
    useState<Enquiry[]>([]);

  const [
    followUps,
    setFollowUps,
  ] =
    useState<FollowUp[]>([]);

  const [
    policies,
    setPolicies,
  ] =
    useState<Policy[]>([]);

  /* ------------------------------------------------------------------------ */
  /* LOAD STAFF                                                               */
  /* ------------------------------------------------------------------------ */

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
                credentials:
                  "include",
                cache:
                  "no-store",
              }
            );

          let data:
            StaffApiResponse =
            {};

          try {
            data =
              await response.json();
          } catch {
            data = {};
          }

          if (
            !response.ok ||
            data.success ===
              false
          ) {
            throw new Error(
              data.message ||
                "Unable to load staff."
            );
          }

          const list =
            Array.isArray(
              data.staff
            )
              ? data.staff
              : Array.isArray(
                    data.staffs
                  )
                ? data.staffs
                : Array.isArray(
                      data.data
                    )
                  ? data.data
                  : [];

          setStaff(list);
        } catch (
          loadError
        ) {
          console.error(
            "LOAD STAFF ERROR:",
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to connect to the staff server."
          );

          setStaff([]);
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD PERFORMANCE DATA                                                    */
  /* ------------------------------------------------------------------------ */

  const loadPerformanceData =
    useCallback(
      async (
        userId: string
      ) => {
        try {
          setPerformanceLoading(
            true
          );

          const [
            subAgentResult,
            enquiryResult,
            followUpResult,
            policyResult,
          ] =
            await Promise.allSettled(
              [
                fetch(
                  `/api/sub-agents?userId=${encodeURIComponent(
                    userId
                  )}&activeOnly=false`,
                  {
                    cache:
                      "no-store",
                  }
                ).then(
                  async (
                    response
                  ) => ({
                    response,
                    data:
                      await response.json(),
                  })
                ),

                fetch(
                  `/api/enquiries?userId=${encodeURIComponent(
                    userId
                  )}`,
                  {
                    cache:
                      "no-store",
                  }
                ).then(
                  async (
                    response
                  ) => ({
                    response,
                    data:
                      await response.json(),
                  })
                ),

                fetch(
                  `/api/follow-ups?userId=${encodeURIComponent(
                    userId
                  )}`,
                  {
                    cache:
                      "no-store",
                  }
                ).then(
                  async (
                    response
                  ) => ({
                    response,
                    data:
                      await response.json(),
                  })
                ),

                fetch(
                  `/api/policies?userId=${encodeURIComponent(
                    userId
                  )}`,
                  {
                    cache:
                      "no-store",
                  }
                ).then(
                  async (
                    response
                  ) => ({
                    response,
                    data:
                      await response.json(),
                  })
                ),
              ]
            );

          if (
            subAgentResult.status ===
            "fulfilled" &&
            subAgentResult.value
              .response.ok
          ) {
            const data =
              subAgentResult.value
                .data;

            setSubAgents(
              Array.isArray(
                data.subAgents
              )
                ? data.subAgents
                : []
            );
          } else {
            setSubAgents([]);
          }

          if (
            enquiryResult.status ===
            "fulfilled" &&
            enquiryResult.value
              .response.ok
          ) {
            const data =
              enquiryResult.value
                .data;

            setEnquiries(
              Array.isArray(
                data.enquiries
              )
                ? data.enquiries
                : []
            );
          } else {
            setEnquiries([]);
          }

          if (
            followUpResult.status ===
            "fulfilled" &&
            followUpResult.value
              .response.ok
          ) {
            const data =
              followUpResult.value
                .data;

            setFollowUps(
              Array.isArray(
                data.followUps
              )
                ? data.followUps
                : []
            );
          } else {
            setFollowUps([]);
          }

          if (
            policyResult.status ===
            "fulfilled" &&
            policyResult.value
              .response.ok
          ) {
            const data =
              policyResult.value
                .data;

            setPolicies(
              Array.isArray(
                data.policies
              )
                ? data.policies
                : Array.isArray(
                      data.data
                    )
                  ? data.data
                  : []
            );
          } else {
            setPolicies([]);
          }
        } catch (
          loadError
        ) {
          console.error(
            "LOAD STAFF PERFORMANCE ERROR:",
            loadError
          );

          setSubAgents([]);
          setEnquiries([]);
          setFollowUps([]);
          setPolicies([]);
        } finally {
          setPerformanceLoading(
            false
          );
        }
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

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
      setPerformanceLoading(
        false
      );

      return;
    }

    void Promise.all([
      loadStaff(userId),
      loadPerformanceData(
        userId
      ),
    ]);
  }, [
    loadStaff,
    loadPerformanceData,
  ]);

  /* ------------------------------------------------------------------------ */
  /* DATES                                                                    */
  /* ------------------------------------------------------------------------ */

  const today =
    useMemo(() => {
      const now =
        new Date();

      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
    }, []);

  const thirtyDaysLater =
    useMemo(() => {
      const date =
        new Date(today);

      date.setDate(
        date.getDate() + 30
      );

      return date;
    }, [
      today,
    ]);

  const thisMonth =
    useMemo(
      () =>
        getMonthRange(
          today,
          0
        ),
      [
        today,
      ]
    );

  const lastMonth =
    useMemo(
      () =>
        getMonthRange(
          today,
          -1
        ),
      [
        today,
      ]
    );

  const financialYear =
    useMemo(
      () =>
        getFinancialYearRange(
          today
        ),
      [
        today,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* STAFF DIRECTORY                                                          */
  /* ------------------------------------------------------------------------ */

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
            member.supervisor
              ?.name,
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

  /* ------------------------------------------------------------------------ */
  /* PERFORMANCE SCOPE                                                        */
  /* ------------------------------------------------------------------------ */

  const selectedStaff =
    useMemo(
      () =>
        staff.find(
          (
            member
          ) =>
            member.id ===
            performanceScope
        ) ||
        null,
      [
        staff,
        performanceScope,
      ]
    );

  const scopeStaffIds =
    useMemo(() => {
      if (
        performanceScope ===
        "ALL"
      ) {
        return new Set(
          staff.map(
            (
              member
            ) =>
              member.id
          )
        );
      }

      if (
        performanceScope ===
        "AGENT_DIRECT"
      ) {
        return new Set<string>();
      }

      const selected =
        staff.find(
          (
            member
          ) =>
            member.id ===
            performanceScope
        );

      if (!selected) {
        return new Set<string>();
      }

      if (
        isSupervisor(
          selected
        )
      ) {
        const ids =
          new Set<string>([
            selected.id,
          ]);

        staff.forEach(
          (
            member
          ) => {
            if (
              member.supervisorId ===
              selected.id
            ) {
              ids.add(
                member.id
              );
            }
          }
        );

        return ids;
      }

      return new Set<string>([
        selected.id,
      ]);
    }, [
      performanceScope,
      staff,
    ]);

  const enquiryById =
    useMemo(
      () =>
        new Map(
          enquiries.map(
            (
              enquiry
            ) => [
              enquiry.id,
              enquiry,
            ]
          )
        ),
      [
        enquiries,
      ]
    );

  const currentScopeSubAgents =
    useMemo(() => {
      if (
        performanceScope ===
        "AGENT_DIRECT"
      ) {
        return subAgents.filter(
          (
            item
          ) =>
            !item.assignedStaffId
        );
      }

      if (
        performanceScope ===
        "ALL"
      ) {
        return subAgents;
      }

      return subAgents.filter(
        (
          item
        ) =>
          Boolean(
            item.assignedStaffId &&
            scopeStaffIds.has(
              item.assignedStaffId
            )
          )
      );
    }, [
      subAgents,
      performanceScope,
      scopeStaffIds,
    ]);

  const currentScopeEnquiries =
    useMemo(() => {
      if (
        performanceScope ===
        "AGENT_DIRECT"
      ) {
        return enquiries.filter(
          (
            item
          ) =>
            !item.assignedStaffId
        );
      }

      if (
        performanceScope ===
        "ALL"
      ) {
        return enquiries;
      }

      return enquiries.filter(
        (
          item
        ) =>
          Boolean(
            item.assignedStaffId &&
            scopeStaffIds.has(
              item.assignedStaffId
            )
          )
      );
    }, [
      enquiries,
      performanceScope,
      scopeStaffIds,
    ]);

  const currentScopePolicies =
    useMemo(() => {
      if (
        performanceScope ===
        "AGENT_DIRECT"
      ) {
        return policies.filter(
          (
            policy
          ) =>
            !policy.originStaffId
        );
      }

      if (
        performanceScope ===
        "ALL"
      ) {
        return policies;
      }

      return policies.filter(
        (
          policy
        ) =>
          Boolean(
            policy.originStaffId &&
            scopeStaffIds.has(
              policy.originStaffId
            )
          )
      );
    }, [
      policies,
      performanceScope,
      scopeStaffIds,
    ]);

  /* ------------------------------------------------------------------------ */
  /* PERFORMANCE METRICS                                                      */
  /* ------------------------------------------------------------------------ */

  const performanceMetrics =
    useMemo<StaffMetrics>(
      () => {
        const assignedSubAgents =
          currentScopeSubAgents
            .length;

        const activeSubAgents =
          currentScopeSubAgents.filter(
            (
              item
            ) =>
              item.isActive !==
              false
          ).length;

        const inactiveSubAgents =
          currentScopeSubAgents.filter(
            (
              item
            ) =>
              item.isActive ===
              false
          ).length;

        const thisMonthActiveIds =
          new Set<string>();

        const lastMonthActiveIds =
          new Set<string>();

        for (
          const policy of
          currentScopePolicies
        ) {
          if (
            !policy.subAgentId
          ) {
            continue;
          }

          const date =
            getPolicyDate(
              policy
            );

          if (
            isWithin(
              date,
              thisMonth.start,
              thisMonth.end
            )
          ) {
            thisMonthActiveIds.add(
              policy.subAgentId
            );
          }

          if (
            isWithin(
              date,
              lastMonth.start,
              lastMonth.end
            )
          ) {
            lastMonthActiveIds.add(
              policy.subAgentId
            );
          }
        }

        const newlyActiveSubAgents =
          Array.from(
            thisMonthActiveIds
          ).filter(
            (
              id
            ) =>
              !lastMonthActiveIds.has(
                id
              )
          ).length;

        const relevantEnquiryIds =
          new Set(
            currentScopeEnquiries.map(
              (
                enquiry
              ) =>
                enquiry.id
            )
          );

        const pendingFollowUps =
          followUps.filter(
            (
              followUp
            ) => {
              if (
                String(
                  followUp.status ||
                  ""
                ).toUpperCase() !==
                "PENDING"
              ) {
                return false;
              }

              if (
                !followUp.enquiryId ||
                !relevantEnquiryIds.has(
                  followUp.enquiryId
                )
              ) {
                return false;
              }

              const enquiry =
                enquiryById.get(
                  followUp.enquiryId
                );

              const enquiryStatus =
                String(
                  enquiry?.status ||
                  ""
                ).toUpperCase();

              return (
                enquiryStatus ===
                  "NEW" ||
                enquiryStatus ===
                  "FOLLOW_UP"
              );
            }
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
                  today.getTime()
              );
            }
          ).length;

        const convertedEnquiries =
          currentScopeEnquiries.filter(
            (
              enquiry
            ) =>
              String(
                enquiry.status ||
                ""
              ).toUpperCase() ===
              "CONVERTED"
          ).length;

        const activePolicies =
          currentScopePolicies.filter(
            (
              policy
            ) =>
              policy.isActive !==
              false
          );

        const thisMonthPolicies =
          activePolicies.filter(
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
          activePolicies.filter(
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

        /*
         * Renewal due in the current calendar month.
         *
         * This deliberately includes every active policy whose
         * expiry falls inside this month so the Staff dashboard
         * gives a clear month summary.
         */
        const renewalsDueThisMonth =
          activePolicies.filter(
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
                  thisMonth.start.getTime() &&
                expiry.getTime() <=
                  thisMonth.end.getTime()
              );
            }
          );

        const renewalsDue30Days =
          activePolicies.filter(
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
                  today.getTime() &&
                expiry.getTime() <=
                  thirtyDaysLater.getTime()
              );
            }
          );

        const renewalPendingFy =
          activePolicies.filter(
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
                  today.getTime() &&
                expiry.getTime() <=
                  financialYear.end.getTime()
              );
            }
          );

        return {
          assignedSubAgents,
          activeSubAgents,
          inactiveSubAgents,

          activeSubAgentsThisMonth:
            thisMonthActiveIds.size,

          activeSubAgentsLastMonth:
            lastMonthActiveIds.size,

          newlyActiveSubAgents,

          enquiries:
            currentScopeEnquiries.length,

          pendingFollowUps:
            pendingFollowUps.length,

          overdueFollowUps,

          convertedEnquiries,

          policies:
            activePolicies.length,

          thisMonthPremium:
            thisMonthPolicies.reduce(
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

          renewalsDueThisMonth:
            renewalsDueThisMonth.length,

          renewalsDue30Days:
            renewalsDue30Days.length,

          renewalPendingFy:
            renewalPendingFy.length,

          renewalPendingPremium:
            renewalPendingFy.reduce(
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
        };
      },
      [
        currentScopeSubAgents,
        currentScopeEnquiries,
        currentScopePolicies,
        followUps,
        enquiryById,
        today,
        thisMonth,
        lastMonth,
        financialYear,
        thirtyDaysLater,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* TEAM PERFORMANCE                                                         */
  /* ------------------------------------------------------------------------ */

  const staffPerformanceRows =
    useMemo(() => {
      return staff
        .filter(
          (
            member
          ) =>
            member.isActive
        )
        .map(
          (
            member
          ) => {
            const ids =
              new Set<string>([
                member.id,
              ]);

            if (
              isSupervisor(
                member
              )
            ) {
              staff.forEach(
                (
                  child
                ) => {
                  if (
                    child.supervisorId ===
                    member.id
                  ) {
                    ids.add(
                      child.id
                    );
                  }
                }
              );
            }

            const memberSubAgents =
              subAgents.filter(
                (
                  item
                ) =>
                  Boolean(
                    item.assignedStaffId &&
                    ids.has(
                      item.assignedStaffId
                    )
                  )
              );

            const memberEnquiries =
              enquiries.filter(
                (
                  item
                ) =>
                  Boolean(
                    item.assignedStaffId &&
                    ids.has(
                      item.assignedStaffId
                    )
                  )
              );

            const memberPolicies =
              policies.filter(
                (
                  item
                ) =>
                  Boolean(
                    item.originStaffId &&
                    ids.has(
                      item.originStaffId
                    )
                  )
              );

            const monthPolicies =
              memberPolicies.filter(
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

            const converted =
              memberEnquiries.filter(
                (
                  enquiry
                ) =>
                  String(
                    enquiry.status ||
                    ""
                  ).toUpperCase() ===
                  "CONVERTED"
              ).length;

            return {
              member,

              subAgents:
                memberSubAgents.length,

              activeSubAgents:
                memberSubAgents.filter(
                  (
                    item
                  ) =>
                    item.isActive !==
                    false
                ).length,

              enquiries:
                memberEnquiries.length,

              converted,

              policies:
                memberPolicies.length,

              monthPremium:
                monthPolicies.reduce(
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
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            b.monthPremium -
            a.monthPremium
        );
    }, [
      staff,
      subAgents,
      enquiries,
      policies,
      thisMonth,
    ]);

  const performanceTitle =
    performanceScope ===
    "ALL"
      ? "All Team Consolidated"
      : performanceScope ===
          "AGENT_DIRECT"
        ? "Agent Direct Business"
        : selectedStaff
          ? isSupervisor(
              selectedStaff
            )
            ? `${selectedStaff.name} — Supervisor Consolidated`
            : `${selectedStaff.name} — Staff Performance`
          : "Staff Performance";

  function selectPerformance(
    value: string
  ) {
    setPerformanceScope(
      value
    );

    window.setTimeout(
      () => {
        scrollToPerformance();
      },
      50
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* -------------------------------------------------------------------- */}
      {/* HEADER                                                               */}
      {/* -------------------------------------------------------------------- */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-black text-slate-800 shadow-sm"
            >
              ←
            </Link>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Team Management
              </p>

              <h1 className="text-2xl font-black tracking-tight">
                Staff & Business
              </h1>

              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                Staff, Sub-Agents, renewals, performance and attendance.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/sub-agents"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700"
            >
              🤝 Sub-Agents
            </Link>

            <Link
              href="/staff/offices"
              className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-cyan-800"
            >
              + Add Office
            </Link>

            <Link
              href="/staff/add"
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-blue-800"
            >
              + Add Staff
            </Link>

          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-5">

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TEAM SNAPSHOT                                                      */}
        {/* ------------------------------------------------------------------ */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <CompactTopCard
            label="Total Staff"
            value={totalStaff}
            detail={`${activeStaff} active`}
            emoji="👥"
            valueClass="text-slate-950"
            onClick={() =>
              chooseDirectoryFilter("ALL")
            }
          />

          <CompactTopCard
            label="Active Staff"
            value={activeStaff}
            detail={`${loginEnabled} login enabled`}
            emoji="✅"
            valueClass="text-emerald-700"
            onClick={() =>
              chooseDirectoryFilter("ACTIVE")
            }
          />

          <CompactTopCard
            label="Supervisors"
            value={supervisors}
            detail="Team leaders"
            emoji="🧑‍💼"
            valueClass="text-violet-700"
            onClick={() =>
              chooseDirectoryFilter("SUPERVISORS")
            }
          />

          <CompactTopCard
            label="Attendance"
            value={attendanceRecords}
            detail="Recorded punches"
            emoji="🕒"
            valueClass="text-amber-700"
            onClick={() =>
              scrollToDirectory()
            }
          />

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* QUICK ACTION BAR                                                   */}
        {/* ------------------------------------------------------------------ */}

        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

          <Link
            href="/staff/add"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"
          >
            ➕ Add Staff
          </Link>

          <Link
            href="/staff/offices"
            className="rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-black text-white"
          >
            🏢 Add / Manage Offices
          </Link>

          <Link
            href="/sub-agents"
            className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white"
          >
            🤝 Assign Sub-Agents
          </Link>

          <Link
            href="/enquiries"
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700"
          >
            📥 Enquiries
          </Link>

          <Link
            href="/follow-ups"
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-black text-orange-700"
          >
            📞 Follow-ups
          </Link>

          <Link
            href="/renewals"
            className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-xs font-black text-cyan-700"
          >
            🔄 Renewals
          </Link>

          <Link
            href="/policies"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700"
          >
            📄 Policies
          </Link>

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* MAIN PERFORMANCE DASHBOARD                                         */}
        {/* ------------------------------------------------------------------ */}

        <div
          id="staff-performance"
          className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >

          {/* PERFORMANCE HEADER */}

          <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">
                  Business Performance
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  {performanceTitle}
                </h2>

                <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-300">
                  Consolidated production, renewals, enquiries and Sub-Agent activity.
                </p>
              </div>

              <div className="w-full lg:w-[360px]">

                <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Select Staff / Supervisor
                </label>

                <select
                  value={performanceScope}
                  onChange={(event) =>
                    selectPerformance(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-600 bg-white px-4 py-3 text-sm font-black text-slate-950 outline-none"
                >
                  <option value="ALL">
                    All Team Consolidated
                  </option>

                  <option value="AGENT_DIRECT">
                    Agent Direct
                  </option>

                  {staff
                    .filter(
                      (member) =>
                        member.isActive
                    )
                    .map(
                      (member) => (
                        <option
                          key={member.id}
                          value={member.id}
                        >
                          {member.staffCode} - {member.name}
                          {isSupervisor(member)
                            ? " (Supervisor)"
                            : ""}
                        </option>
                      )
                    )}
                </select>

              </div>

            </div>

          </div>

          {performanceLoading ? (
            <div className="p-10 text-center font-bold text-slate-500">
              Loading business performance...
            </div>
          ) : (
            <div className="p-5">

              {/* ------------------------------------------------------------ */}
              {/* PRIMARY KPI                                                 */}
              {/* ------------------------------------------------------------ */}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                <HeroMetric
                  label="This Month Premium"
                  value={formatMoney(
                    performanceMetrics.thisMonthPremium
                  )}
                  sublabel="Current month production"
                  emoji="₹"
                  valueClass="text-emerald-700"
                />

                <HeroMetric
                  label={financialYear.label}
                  value={formatMoney(
                    performanceMetrics.fyPremium
                  )}
                  sublabel="Financial year premium"
                  emoji="📊"
                  valueClass="text-violet-700"
                />

                <HeroMetric
                  label="Policies"
                  value={performanceMetrics.policies}
                  sublabel="Attributed business"
                  emoji="📄"
                  valueClass="text-blue-700"
                />

                <HeroMetric
                  label="Converted"
                  value={performanceMetrics.convertedEnquiries}
                  sublabel="Converted enquiries"
                  emoji="🎯"
                  valueClass="text-emerald-700"
                />

              </div>

              {/* ------------------------------------------------------------ */}
              {/* RENEWAL CENTER                                              */}
              {/* ------------------------------------------------------------ */}

              <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
                      Renewal Center
                    </p>

                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      Renewal Pipeline
                    </h3>
                  </div>

                  <Link
                    href="/renewals"
                    className="rounded-xl bg-cyan-700 px-4 py-2.5 text-xs font-black text-white"
                  >
                    View Renewals →
                  </Link>

                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

                  <SmallMetric
                    label="Due This Month"
                    value={performanceMetrics.renewalsDueThisMonth}
                    valueClass="text-orange-700"
                  />

                  <SmallMetric
                    label="Pending This FY"
                    value={performanceMetrics.renewalPendingFy}
                    valueClass="text-red-700"
                  />

                  <SmallMetric
                    label="Pending Premium"
                    value={formatMoney(
                      performanceMetrics.renewalPendingPremium
                    )}
                    valueClass="text-amber-700"
                  />

                  <SmallMetric
                    label="Due Next 30 Days"
                    value={performanceMetrics.renewalsDue30Days}
                    valueClass="text-blue-700"
                  />

                </div>

              </section>

              {/* ------------------------------------------------------------ */}
              {/* PIPELINE + SUB-AGENTS                                       */}
              {/* ------------------------------------------------------------ */}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">

                <section className="rounded-2xl border border-slate-200 p-4">

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                      Work Pipeline
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Enquiries & Follow-ups
                    </h3>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <SmallMetric
                      label="Enquiries"
                      value={performanceMetrics.enquiries}
                      valueClass="text-blue-700"
                    />

                    <SmallMetric
                      label="Pending"
                      value={performanceMetrics.pendingFollowUps}
                      valueClass="text-orange-700"
                    />

                    <SmallMetric
                      label="Overdue"
                      value={performanceMetrics.overdueFollowUps}
                      valueClass="text-red-700"
                    />

                  </div>

                </section>

                <section className="rounded-2xl border border-slate-200 p-4">

                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">
                      Sub-Agent Network
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      Activity & Activation
                    </h3>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">

                    <SmallMetric
                      label="Assigned"
                      value={performanceMetrics.assignedSubAgents}
                      valueClass="text-violet-700"
                    />

                    <SmallMetric
                      label="Active"
                      value={performanceMetrics.activeSubAgents}
                      valueClass="text-emerald-700"
                    />

                    <SmallMetric
                      label="Active This Month"
                      value={performanceMetrics.activeSubAgentsThisMonth}
                      valueClass="text-emerald-700"
                    />

                    <SmallMetric
                      label="Active Last Month"
                      value={performanceMetrics.activeSubAgentsLastMonth}
                      valueClass="text-blue-700"
                    />

                    <SmallMetric
                      label="Newly Active"
                      value={performanceMetrics.newlyActiveSubAgents}
                      valueClass="text-violet-700"
                    />

                    <SmallMetric
                      label="Inactive"
                      value={performanceMetrics.inactiveSubAgents}
                      valueClass="text-slate-700"
                    />

                  </div>

                </section>

              </div>

              {selectedStaff &&
                isSupervisor(
                  selectedStaff
                ) && (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">

                    <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                      Supervisor Consolidation
                    </p>

                    <p className="mt-1 text-sm font-semibold text-violet-900">
                      Includes this Supervisor and{" "}
                      {
                        staff.filter(
                          (member) =>
                            member.supervisorId ===
                            selectedStaff.id
                        ).length
                      }{" "}
                      mapped Staff member
                      {
                        staff.filter(
                          (member) =>
                            member.supervisorId ===
                            selectedStaff.id
                        ).length === 1
                          ? ""
                          : "s"
                      }.
                    </p>

                  </div>
                )}

            </div>
          )}

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TEAM PERFORMANCE TABLE                                             */}
        {/* ------------------------------------------------------------------ */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Team Performance
              </p>

              <h2 className="mt-1 text-xl font-black">
                Staff Business Overview
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Ranked by this month's premium.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {staffPerformanceRows.length} Active
            </span>

          </div>

          {performanceLoading ? (
            <div className="p-8 text-center font-bold text-slate-500">
              Loading team performance...
            </div>
          ) : staffPerformanceRows.length === 0 ? (
            <div className="p-8 text-center font-bold text-slate-500">
              No active Staff found.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px] text-left">

                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">
                      Staff
                    </th>

                    <th className="px-4 py-3">
                      Sub-Agents
                    </th>

                    <th className="px-4 py-3">
                      Active
                    </th>

                    <th className="px-4 py-3">
                      Enquiries
                    </th>

                    <th className="px-4 py-3">
                      Converted
                    </th>

                    <th className="px-4 py-3">
                      Policies
                    </th>

                    <th className="px-4 py-3">
                      Month Premium
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {staffPerformanceRows.map(
                    (row) => (
                      <tr
                        key={row.member.id}
                        className="hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">

                          <p className="font-black text-slate-950">
                            {row.member.name}
                          </p>

                          <p className="mt-0.5 text-xs font-bold text-blue-700">
                            {row.member.staffCode}
                            {isSupervisor(
                              row.member
                            )
                              ? " • Supervisor"
                              : ""}
                          </p>

                        </td>

                        <td className="px-4 py-4 font-black text-violet-700">
                          {row.subAgents}
                        </td>

                        <td className="px-4 py-4 font-black text-emerald-700">
                          {row.activeSubAgents}
                        </td>

                        <td className="px-4 py-4 font-black text-blue-700">
                          {row.enquiries}
                        </td>

                        <td className="px-4 py-4 font-black text-emerald-700">
                          {row.converted}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900">
                          {row.policies}
                        </td>

                        <td className="px-4 py-4 font-black text-emerald-700">
                          {formatMoney(
                            row.monthPremium
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              selectPerformance(
                                row.member.id
                              )
                            }
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white"
                          >
                            View
                          </button>
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* STAFF DIRECTORY                                                    */}
        {/* ------------------------------------------------------------------ */}

        <section
          id="staff-directory"
          className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >

          <div className="border-b border-slate-200 px-5 py-4">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                  Staff Directory
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {directoryTitle}
                </h2>
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
                  Login
                </FilterButton>

              </div>

            </div>

            <div className="mt-3">
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

          </div>

          <div className="p-5">

            {loading ? (
              <div className="p-8 text-center font-bold text-slate-500">
                Loading staff...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <div className="text-4xl">
                  👤
                </div>

                <h3 className="mt-3 font-black">
                  No Staff Found
                </h3>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Try another search or filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">

                {filteredStaff.map(
                  (member) => (
                    <StaffCard
                      key={member.id}
                      member={member}
                      onViewPerformance={() =>
                        selectPerformance(
                          member.id
                        )
                      }
                    />
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* ATTENDANCE ADMIN                                                   */}
        {/* ------------------------------------------------------------------ */}

        <section className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Attendance Administration
              </p>

              <h2 className="mt-1 text-xl font-black text-blue-950">
                Attendance & Leave Controls
              </h2>

              <p className="mt-1 text-sm font-semibold text-blue-700">
                Attendance remains separate from business performance for a cleaner workflow.
              </p>
            </div>

            <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700">
              🕒 Management
            </div>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <AttendanceAdminCard
              href="/staff/attendance"
              emoji="📊"
              title="Today's Attendance"
              description="Present, late, absent and not-punched staff."
              actionLabel="View Attendance"
            />

            <AttendanceAdminCard
              href="/staff/regularization"
              emoji="📝"
              title="Regularization"
              description="Review missed punch correction requests."
              actionLabel="Review Requests"
            />

            <AttendanceAdminCard
              href="/staff/leaves"
              emoji="🌴"
              title="Leave Approvals"
              description="Review and approve staff leave requests."
              actionLabel="Review Leaves"
            />

            <AttendanceAdminCard
              href="/staff/attendance/settings"
              emoji="⚙️"
              title="Attendance Settings"
              description="Office timing, grace and verification rules."
              actionLabel="Configure"
            />

            <AttendanceAdminCard
              href="/staff/holidays"
              emoji="🎉"
              title="Holiday Management"
              description="Configure company holidays and weekly offs."
              actionLabel="Manage Holidays"
            />

            <AttendanceAdminCard
              href="/staff/offices"
              emoji="🏢"
              title="Offices & GPS"
              description="Create branches, set office GPS coordinates and attendance radius."
              actionLabel="Manage Offices"
            />

          </div>

        </section>

      </section>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* REDESIGNED DASHBOARD COMPONENTS                                            */
/* -------------------------------------------------------------------------- */

function CompactTopCard({
  label,
  value,
  detail,
  emoji,
  valueClass,
  onClick,
}: {
  label: string;
  value: number | string;
  detail: string;
  emoji: string;
  valueClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">

        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p
            className={`mt-1 text-3xl font-black ${valueClass}`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {detail}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
          {emoji}
        </div>

      </div>
    </button>
  );
}

function HeroMetric({
  label,
  value,
  sublabel,
  emoji,
  valueClass,
}: {
  label: string;
  value: number | string;
  sublabel: string;
  emoji: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-black ${valueClass}`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {sublabel}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
          {emoji}
        </div>

      </div>

    </div>
  );
}

function SmallMetric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl border border-white bg-white p-3 shadow-sm">

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

/* -------------------------------------------------------------------------- */
/* STAFF CARD                                                                 */
/* -------------------------------------------------------------------------- */

function StaffCard({
  member,
  onViewPerformance,
}: {
  member: StaffMember;
  onViewPerformance:
    () => void;
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

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={
              onViewPerformance
            }
            className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white"
          >
            View Performance
          </button>

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

function PerformanceCard({
  label,
  value,
  emoji,
  valueClass =
    "text-slate-950",
}: {
  label: string;
  value:
    | number
    | string;
  emoji: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p
            className={`mt-1 text-xl font-black ${valueClass}`}
          >
            {value}
          </p>

        </div>

        <span className="text-xl">
          {emoji}
        </span>

      </div>

    </div>
  );
}

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
  href,
  emoji,
  title,
  description,
  actionLabel,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-blue-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
    >

      <div className="flex items-start justify-between gap-3">

        <div className="text-2xl">
          {emoji}
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 transition group-hover:translate-x-0.5 group-hover:bg-blue-700 group-hover:text-white">
          →
        </span>

      </div>

      <h3 className="mt-2 font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {description}
      </p>

      <div className="mt-3 inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
        {actionLabel}
      </div>

    </Link>
  );
}
