"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type FollowUp = {
  id: string;
  userId: string;
  customerId: string;
  enquiryId?: string | null;

  comment: string;

  followUpDate: string;
  nextFollowUpDate?: string | null;

  status:
    | "PENDING"
    | "COMPLETED"
    | "CANCELLED"
    | string;

  outcome?:
    | "CONTINUE"
    | "BUSINESS_CLOSED"
    | "CASE_LOST"
    | "CANCELLED"
    | string;

  actionType?:
    | "FOLLOW_UP"
    | "CONTINUE"
    | "READY_FOR_POLICY"
    | "BUSINESS_CLOSED"
    | "CASE_LOST"
    | "CANCELLED"
    | string;

  lostReason?: string | null;
  cancellationReason?: string | null;

  createdByType?:
    | "AGENT"
    | "STAFF"
    | string;

  createdByStaffId?: string | null;
  createdByName?: string | null;

  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  createdByStaff?: {
    id: string;
    staffCode?: string | null;
    name?: string | null;
    staffRole?: string | null;
  } | null;

  customer?: {
    id: string;
    customerId?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    sourceType?: string | null;
    subAgentId?: string | null;

    subAgent?: {
      id: string;
      code?: string | null;
      name?: string | null;
    } | null;
  } | null;

  enquiry?: {
    id: string;
    businessType?: string | null;
    requirement?: string | null;
    remarks?: string | null;
    status?: string | null;
    enquiryDate?: string | null;
    nextFollowUpDate?: string | null;
    convertedAt?: string | null;
    closedAt?: string | null;
  } | null;
};

type Outcome =
  | "CONTINUE"
  | "READY_FOR_POLICY"
  | "BUSINESS_CLOSED"
  | "CASE_LOST"
  | "CANCELLED";

type LeadType =
  | "CUSTOMER"
  | "SUB_AGENT";

type EffectiveStatus =
  | "PENDING"
  | "READY_FOR_POLICY"
  | "CONVERTED"
  | "LOST"
  | "CANCELLED"
  | "COMPLETED";

type FollowUpGroup = {
  key: string;

  enquiryId: string;

  customerId: string;

  items: FollowUp[];

  current: FollowUp | null;

  latest: FollowUp;

  effectiveStatus: EffectiveStatus;
};

type ApiResponse = {
  success?: boolean;
  message?: string;

  agent?: {
    id?: string;
    name?: string;
  };

  followUps?: FollowUp[];
};

/* -------------------------------------------------------------------------- */
/* USER                                                                       */
/* -------------------------------------------------------------------------- */

function getLoggedInUserId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const direct =
    localStorage.getItem(
      "userId"
    );

  if (
    direct?.trim()
  ) {
    return direct.trim();
  }

  for (
    const key of [
      "agentUser",
      "user",
    ]
  ) {
    const stored =
      localStorage.getItem(
        key
      );

    if (!stored) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(
          stored
        );

      const id =
        String(
          parsed?.id ||
          parsed?.userId ||
          ""
        ).trim();

      if (id) {
        localStorage.setItem(
          "userId",
          id
        );

        return id;
      }
    } catch {
      // Ignore invalid local storage.
    }
  }

  return "";
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

function formatDateTime(
  value?: string | null
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

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function toDateInputValue(
  value?: string | null
) {
  const date =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}

/* -------------------------------------------------------------------------- */
/* PHONE                                                                      */
/* -------------------------------------------------------------------------- */

function cleanPhone(
  phone?: string | null
) {
  const digits =
    String(
      phone || ""
    ).replace(
      /\D/g,
      ""
    );

  if (
    digits.length ===
    10
  ) {
    return `91${digits}`;
  }

  if (
    digits.startsWith(
      "91"
    ) &&
    digits.length ===
      12
  ) {
    return digits;
  }

  return digits;
}

/* -------------------------------------------------------------------------- */
/* LEAD TYPE                                                                  */
/* -------------------------------------------------------------------------- */

function getLeadType(
  item: FollowUp
): LeadType {
  const source =
    String(
      item.customer?.sourceType ||
      ""
    ).toUpperCase();

  if (
    source ===
    "SUB_AGENT"
  ) {
    return "SUB_AGENT";
  }

  const marker =
    `${item.enquiry?.remarks || ""} ${item.enquiry?.requirement || ""}`
      .toUpperCase();

  if (
    marker.includes(
      "SUB_AGENT"
    ) ||
    marker.includes(
      "SUB-AGENT"
    )
  ) {
    return "SUB_AGENT";
  }

  return "CUSTOMER";
}

/* -------------------------------------------------------------------------- */
/* TERMINAL / EFFECTIVE STATUS                                                */
/* -------------------------------------------------------------------------- */

function isTerminalAction(
  item: FollowUp
) {
  return (
    item.actionType ===
      "BUSINESS_CLOSED" ||
    item.actionType ===
      "CASE_LOST" ||
    item.actionType ===
      "CANCELLED"
  );
}

function getEffectiveStatus(
  items: FollowUp[]
): EffectiveStatus {
  if (
    items.length ===
    0
  ) {
    return "COMPLETED";
  }

  const latest =
    items[0];

  /*
   * First trust the real enquiry status.
   * This prevents an old pending row from keeping a
   * converted/lost/closed enquiry displayed as Pending.
   */

  const enquiryStatus =
    String(
      latest.enquiry?.status ||
      ""
    ).toUpperCase();

  if (
    enquiryStatus ===
    "CONVERTED"
  ) {
    return "CONVERTED";
  }

  if (
    enquiryStatus ===
    "LOST"
  ) {
    return "LOST";
  }

  if (
    enquiryStatus ===
    "CLOSED"
  ) {
    return "CANCELLED";
  }

  /*
   * Then inspect latest history action.
   */

  if (
    latest.actionType ===
    "BUSINESS_CLOSED" ||
    latest.outcome ===
    "BUSINESS_CLOSED"
  ) {
    return "CONVERTED";
  }

  if (
    latest.actionType ===
    "CASE_LOST" ||
    latest.outcome ===
    "CASE_LOST"
  ) {
    return "LOST";
  }

  if (
    latest.actionType ===
    "CANCELLED" ||
    latest.outcome ===
    "CANCELLED"
  ) {
    return "CANCELLED";
  }

  if (
    latest.actionType ===
    "READY_FOR_POLICY"
  ) {
    return "READY_FOR_POLICY";
  }

  /*
   * Only show Pending when the lead itself is still open.
   */

  if (
    enquiryStatus ===
      "NEW" ||
    enquiryStatus ===
      "FOLLOW_UP" ||
    !enquiryStatus
  ) {
    const pending =
      items.some(
        (item) =>
          item.status ===
          "PENDING"
      );

    if (pending) {
      return "PENDING";
    }
  }

  return "COMPLETED";
}

function getStatusName(
  status: EffectiveStatus
) {
  switch (status) {
    case "PENDING":
      return "Pending";

    case "READY_FOR_POLICY":
      return "Ready for Policy";

    case "CONVERTED":
      return "Converted";

    case "LOST":
      return "Lost";

    case "CANCELLED":
      return "Cancelled";

    case "COMPLETED":
      return "Completed";

    default:
      return status;
  }
}

function getStatusStyle(
  status: EffectiveStatus
) {
  switch (status) {
    case "PENDING":
      return "border-orange-200 bg-orange-50 text-orange-800";

    case "READY_FOR_POLICY":
      return "border-violet-200 bg-violet-50 text-violet-800";

    case "CONVERTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";

    case "LOST":
      return "border-red-200 bg-red-50 text-red-800";

    case "CANCELLED":
      return "border-slate-300 bg-slate-100 text-slate-800";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

/* -------------------------------------------------------------------------- */
/* ACTION                                                                     */
/* -------------------------------------------------------------------------- */

function getActionName(
  item: FollowUp
) {
  switch (
    item.actionType
  ) {
    case "FOLLOW_UP":
      return "Follow-up Created";

    case "CONTINUE":
      return "Continue Follow-up";

    case "READY_FOR_POLICY":
      return "Ready for Policy";

    case "BUSINESS_CLOSED":
      return "Business Closed / Converted";

    case "CASE_LOST":
      return "Case Lost";

    case "CANCELLED":
      return "Cancelled";

    default:
      break;
  }

  switch (
    item.outcome
  ) {
    case "BUSINESS_CLOSED":
      return "Business Closed / Converted";

    case "CASE_LOST":
      return "Case Lost";

    case "CANCELLED":
      return "Cancelled";

    default:
      return "Follow-up";
  }
}

function getActionStyle(
  item: FollowUp
) {
  switch (
    item.actionType
  ) {
    case "READY_FOR_POLICY":
      return "bg-violet-100 text-violet-800";

    case "BUSINESS_CLOSED":
      return "bg-emerald-100 text-emerald-800";

    case "CASE_LOST":
    case "CANCELLED":
      return "bg-red-100 text-red-800";

    case "CONTINUE":
      return "bg-blue-100 text-blue-800";

    default:
      break;
  }

  switch (
    item.outcome
  ) {
    case "BUSINESS_CLOSED":
      return "bg-emerald-100 text-emerald-800";

    case "CASE_LOST":
    case "CANCELLED":
      return "bg-red-100 text-red-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

/* -------------------------------------------------------------------------- */
/* CREATOR                                                                    */
/* -------------------------------------------------------------------------- */

function hasRealCreator(
  item: FollowUp
) {
  return Boolean(
    item.createdByName?.trim() ||
    item.createdByStaff?.name?.trim()
  );
}

function getCreatorName(
  item: FollowUp
) {
  if (
    item.createdByName
      ?.trim()
  ) {
    return item.createdByName.trim();
  }

  if (
    item.createdByStaff
      ?.name
      ?.trim()
  ) {
    return item.createdByStaff.name.trim();
  }

  /*
   * IMPORTANT:
   * Old rows were given database defaults after the
   * new columns were added. createdByType=AGENT on an
   * old row does NOT prove which person created it.
   */

  return "Previous record";
}

function getCreatorType(
  item: FollowUp
) {
  if (
    !hasRealCreator(
      item
    )
  ) {
    return "Old Data";
  }

  if (
    item.createdByType ===
    "STAFF"
  ) {
    return item.createdByStaff
      ?.staffRole ===
      "SUPERVISOR"
      ? "Supervisor"
      : "Staff";
  }

  if (
    item.createdByType ===
    "AGENT"
  ) {
    return "Agent";
  }

  return "User";
}

function getActorPrefix(
  item: FollowUp
) {
  if (
    item.actionType ===
      "BUSINESS_CLOSED" ||
    item.outcome ===
      "BUSINESS_CLOSED"
  ) {
    return "Closed by";
  }

  if (
    item.actionType ===
      "CASE_LOST" ||
    item.outcome ===
      "CASE_LOST"
  ) {
    return "Marked lost by";
  }

  if (
    item.actionType ===
      "CANCELLED" ||
    item.outcome ===
      "CANCELLED"
  ) {
    return "Cancelled by";
  }

  if (
    item.actionType ===
    "READY_FOR_POLICY"
  ) {
    return "Marked ready by";
  }

  if (
    item.actionType ===
    "CONTINUE"
  ) {
    return "Followed up by";
  }

  return "Created by";
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function FollowUpsPage() {
  const router =
    useRouter();

  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    followUps,
    setFollowUps,
  ] =
    useState<FollowUp[]>(
      []
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
    success,
    setSuccess,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    selectedFollowUp,
    setSelectedFollowUp,
  ] =
    useState<FollowUp | null>(
      null
    );

  const [
    selectedOutcome,
    setSelectedOutcome,
  ] =
    useState<Outcome | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  const loadFollowUps =
    useCallback(
      async (
        id: string
      ) => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `/api/follow-ups?userId=${encodeURIComponent(
                id
              )}`,
              {
                cache:
                  "no-store",

                credentials:
                  "include",
              }
            );

          let data:
            ApiResponse =
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
                "Unable to load follow-ups."
            );
          }

          setFollowUps(
            Array.isArray(
              data.followUps
            )
              ? data.followUps
              : []
          );
        } catch (
          err
        ) {
          console.error(
            "LOAD FOLLOW UPS:",
            err
          );

          setFollowUps(
            []
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load follow-ups."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    const id =
      getLoggedInUserId();

    if (!id) {
      setLoading(false);

      setError(
        "Logged-in user information was not found. Please login again."
      );

      return;
    }

    setUserId(id);

    void loadFollowUps(
      id
    );
  }, [
    loadFollowUps,
  ]);

  /* ------------------------------------------------------------------------ */
  /* GROUP HISTORY                                                            */
  /* ------------------------------------------------------------------------ */

  const groups =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            FollowUp[]
          >();

        for (
          const item of
          followUps
        ) {
          const key =
            item.enquiryId ||
            item.enquiry?.id ||
            `${item.customerId}-${item.enquiry?.businessType || "OTHER"}`;

          const currentItems =
            map.get(key) ||
            [];

          currentItems.push(
            item
          );

          map.set(
            key,
            currentItems
          );
        }

        const result:
          FollowUpGroup[] =
          [];

        for (
          const [
            key,
            items,
          ] of map
        ) {
          const sorted =
            [
              ...items,
            ].sort(
              (
                a,
                b
              ) => {
                const aTime =
                  new Date(
                    a.createdAt ||
                    a.followUpDate
                  ).getTime();

                const bTime =
                  new Date(
                    b.createdAt ||
                    b.followUpDate
                  ).getTime();

                return (
                  bTime -
                  aTime
                );
              }
            );

          const latest =
            sorted[0];

          const effectiveStatus =
            getEffectiveStatus(
              sorted
            );

          /*
           * IMPORTANT:
           *
           * Once lead is terminal, an old pending row
           * must not become the current follow-up.
           */

          let current:
            FollowUp | null =
            null;

          if (
            effectiveStatus ===
            "PENDING"
          ) {
            current =
              sorted.find(
                (item) =>
                  item.status ===
                  "PENDING"
              ) ||
              null;
          }

          result.push({
            key,

            enquiryId:
              latest.enquiryId ||
              latest.enquiry?.id ||
              "",

            customerId:
              latest.customerId,

            items:
              sorted,

            current,

            latest,

            effectiveStatus,
          });
        }

        return result.sort(
          (
            a,
            b
          ) => {
            const aTime =
              new Date(
                a.latest.createdAt ||
                a.latest.followUpDate
              ).getTime();

            const bTime =
              new Date(
                b.latest.createdAt ||
                b.latest.followUpDate
              ).getTime();

            return (
              bTime -
              aTime
            );
          }
        );
      },
      [
        followUps,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredGroups =
    useMemo(
      () => {
        const value =
          search
            .trim()
            .toLowerCase();

        if (!value) {
          return groups;
        }

        return groups.filter(
          (
            group
          ) => {
            const item =
              group.latest;

            const searchText =
              [
                item.customer
                  ?.name,

                item.customer
                  ?.phone,

                item.customer
                  ?.customerId,

                item.enquiry
                  ?.businessType,

                item.enquiry
                  ?.requirement,

                item.enquiry
                  ?.remarks,

                group.effectiveStatus,

                ...group.items.map(
                  (
                    history
                  ) =>
                    history.comment
                ),

                ...group.items.map(
                  (
                    history
                  ) =>
                    history.createdByName
                ),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchText.includes(
              value
            );
          }
        );
      },
      [
        groups,
        search,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const pendingCount =
    groups.filter(
      (group) =>
        group.effectiveStatus ===
        "PENDING"
    ).length;

  const completedCount =
    groups.filter(
      (group) =>
        group.effectiveStatus ===
          "CONVERTED" ||
        group.effectiveStatus ===
          "COMPLETED" ||
        group.effectiveStatus ===
          "READY_FOR_POLICY"
    ).length;

  const cancelledCount =
    groups.filter(
      (group) =>
        group.effectiveStatus ===
          "CANCELLED" ||
        group.effectiveStatus ===
          "LOST"
    ).length;

  /* ------------------------------------------------------------------------ */
  /* ACTION                                                                   */
  /* ------------------------------------------------------------------------ */

  function openAction(
    item: FollowUp,
    outcome: Outcome
  ) {
    setSelectedFollowUp(
      item
    );

    setSelectedOutcome(
      outcome
    );

    setError("");
    setSuccess("");
  }

  function closeAction() {
    setSelectedFollowUp(
      null
    );

    setSelectedOutcome(
      null
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">

      <div className="mx-auto max-w-6xl">

        {/* TOP */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <Link
            href="/dashboard"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
          >
            ← Dashboard
          </Link>

          <Link
            href="/enquiries"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Enquiries
          </Link>

        </div>

        <div className="mb-5">

          <h1 className="text-3xl font-black">
            Follow-ups
          </h1>

          <p className="mt-1 font-semibold text-slate-500">
            Complete customer and Sub-Agent follow-up history.
          </p>

        </div>

        {/* MESSAGES */}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800">
            ✅ {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {/* SUMMARY */}

        {!loading && (
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">

            <SummaryCard
              label="📞 Leads"
              value={
                groups.length
              }
              valueClass="text-blue-700"
            />

            <SummaryCard
              label="⏳ Pending"
              value={
                pendingCount
              }
              valueClass="text-orange-700"
            />

            <SummaryCard
              label="✅ Completed"
              value={
                completedCount
              }
              valueClass="text-emerald-700"
            />

            <SummaryCard
              label="❌ Closed / Lost"
              value={
                cancelledCount
              }
              valueClass="text-red-700"
            />

          </div>
        )}

        {/* SEARCH */}

        <div className="mb-5 rounded-2xl border bg-white p-3 shadow-sm">

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
            placeholder="Search customer, mobile, remark, staff or Agent..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-blue-500"
          />

        </div>

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

            <div className="text-4xl">
              ⏳
            </div>

            <p className="mt-3 font-bold text-slate-600">
              Loading follow-up history...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          filteredGroups.length ===
            0 && (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

              <div className="text-4xl">
                📞
              </div>

              <p className="mt-3 font-black">
                No Follow-ups Found
              </p>

            </div>
          )}

        {/* GROUPS */}

        {!loading &&
          filteredGroups.length >
            0 && (
            <div className="space-y-5">

              {filteredGroups.map(
                (
                  group
                ) => {
                  const latest =
                    group.latest;

                  const current =
                    group.current;

                  const phone =
                    latest.customer
                      ?.phone ||
                    "";

                  const whatsapp =
                    cleanPhone(
                      phone
                    );

                  const leadType =
                    getLeadType(
                      latest
                    );

                  const businessType =
                    latest.enquiry
                      ?.businessType ||
                    "-";

                  const closedHistory =
                    group.items.find(
                      (item) =>
                        isTerminalAction(
                          item
                        )
                    );

                  return (
                    <article
                      key={
                        group.key
                      }
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >

                      {/* CUSTOMER */}

                      <div className="border-b bg-slate-50 p-5">

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="text-xl font-black">
                                {latest.customer?.name ||
                                  "Customer"}
                              </h2>

                              {latest.customer?.customerId && (
                                <span className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-black text-blue-800">
                                  {
                                    latest.customer.customerId
                                  }
                                </span>
                              )}

                              <span
                                className={`rounded-lg px-2 py-1 text-xs font-black ${
                                  leadType ===
                                  "SUB_AGENT"
                                    ? "bg-violet-100 text-violet-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {leadType ===
                                "SUB_AGENT"
                                  ? "🤝 Sub Agent Lead"
                                  : "👤 Customer Lead"}
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-slate-600">

                              {phone && (
                                <span>
                                  📱 {phone}
                                </span>
                              )}

                              <span>
                                🛡️ {businessType}
                              </span>

                              {latest.customer
                                ?.subAgent
                                ?.name && (
                                <span>
                                  🤝{" "}
                                  {latest.customer.subAgent.code}{" "}
                                  -{" "}
                                  {latest.customer.subAgent.name}
                                </span>
                              )}

                            </div>

                          </div>

                          <span
                            className={`rounded-xl border px-3 py-2 text-xs font-black ${getStatusStyle(
                              group.effectiveStatus
                            )}`}
                          >
                            {getStatusName(
                              group.effectiveStatus
                            )}
                          </span>

                        </div>

                        {/* NEXT FOLLOW-UP */}

                        {group.effectiveStatus ===
                          "PENDING" &&
                          current?.nextFollowUpDate && (
                            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3">

                              <p className="text-xs font-black uppercase text-orange-700">
                                Next Follow-up
                              </p>

                              <p className="mt-1 font-black text-orange-900">
                                📅{" "}
                                {formatDate(
                                  current.nextFollowUpDate
                                )}
                              </p>

                            </div>
                          )}

                        {/* TERMINAL INFO */}

                        {closedHistory &&
                          group.effectiveStatus !==
                            "PENDING" && (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">

                              <div className="flex flex-wrap items-center gap-2 text-sm">

                                <span className="font-black text-slate-700">
                                  {getActorPrefix(
                                    closedHistory
                                  )}:
                                </span>

                                <span className="font-black text-slate-950">
                                  {getCreatorName(
                                    closedHistory
                                  )}
                                </span>

                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                                  {getCreatorType(
                                    closedHistory
                                  )}
                                </span>

                                <span className="text-xs font-bold text-slate-500">
                                  {formatDateTime(
                                    closedHistory.createdAt ||
                                    closedHistory.completedAt ||
                                    closedHistory.followUpDate
                                  )}
                                </span>

                              </div>

                            </div>
                          )}

                      </div>

                      {/* HISTORY */}

                      <div className="p-5">

                        <div className="flex items-center justify-between">

                          <div>

                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Follow-up History
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {group.items.length}{" "}
                              record
                              {group.items.length ===
                              1
                                ? ""
                                : "s"}
                            </p>

                          </div>

                        </div>

                        <div className="mt-5 space-y-3">

                          {group.items.map(
                            (
                              history,
                              index
                            ) => (
                              <div
                                key={
                                  history.id
                                }
                                className="relative rounded-2xl border border-slate-200 bg-white p-4"
                              >

                                <div className="flex flex-wrap items-start justify-between gap-3">

                                  <div>

                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                      {getActorPrefix(
                                        history
                                      )}
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                      {getCreatorName(
                                        history
                                      )}
                                    </p>

                                    <div className="mt-1 flex flex-wrap items-center gap-2">

                                      <span
                                        className={`rounded-md px-2 py-1 text-xs font-black ${
                                          !hasRealCreator(
                                            history
                                          )
                                            ? "bg-slate-100 text-slate-600"
                                            : history.createdByType ===
                                                "STAFF"
                                              ? "bg-violet-100 text-violet-800"
                                              : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        {getCreatorType(
                                          history
                                        )}
                                      </span>

                                      <span className="text-xs font-bold text-slate-500">
                                        {formatDateTime(
                                          history.createdAt ||
                                          history.followUpDate
                                        )}
                                      </span>

                                      {index ===
                                        0 && (
                                        <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
                                          Latest
                                        </span>
                                      )}

                                    </div>

                                  </div>

                                  <span
                                    className={`rounded-lg px-2.5 py-1 text-xs font-black ${getActionStyle(
                                      history
                                    )}`}
                                  >
                                    {getActionName(
                                      history
                                    )}
                                  </span>

                                </div>

                                {/* COMMENT */}

                                <div className="mt-3 rounded-xl bg-slate-50 p-3">

                                  <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                                    {history.comment}
                                  </p>

                                </div>

                                {/* DATES */}

                                <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-500">

                                  <span>
                                    Follow-up:{" "}
                                    {formatDateTime(
                                      history.followUpDate
                                    )}
                                  </span>

                                  {history.nextFollowUpDate && (
                                    <span className="text-orange-700">
                                      Next:{" "}
                                      {formatDateTime(
                                        history.nextFollowUpDate
                                      )}
                                    </span>
                                  )}

                                  {history.completedAt && (
                                    <span className="text-emerald-700">
                                      Completed:{" "}
                                      {formatDateTime(
                                        history.completedAt
                                      )}
                                    </span>
                                  )}

                                </div>

                                {/* LOST */}

                                {history.lostReason && (
                                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                                    Lost Reason:{" "}
                                    {history.lostReason}
                                  </div>
                                )}

                                {/* CANCEL */}

                                {history.cancellationReason && (
                                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                                    Cancellation Reason:{" "}
                                    {history.cancellationReason}
                                  </div>
                                )}

                              </div>
                            )
                          )}

                        </div>

                      </div>

                      {/* CONTACT */}

                      <div className="border-t bg-slate-50 p-5">

                        <div className="flex flex-wrap gap-2">

                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-emerald-800"
                            >
                              📞 Call
                            </a>
                          )}

                          {whatsapp && (
                            <a
                              href={`https://wa.me/${whatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white"
                            >
                              WhatsApp
                            </a>
                          )}

                          {group.enquiryId && (
                            <Link
                              href={`/enquiries/${group.enquiryId}`}
                              className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800"
                            >
                              👁 View Enquiry
                            </Link>
                          )}

                          {group.enquiryId && (
                            <Link
                              href={`/enquiries/${group.enquiryId}/edit`}
                              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-800"
                            >
                              ✏️ Edit Enquiry
                            </Link>
                          )}

                        </div>

                        {/* ONLY OPEN LEADS GET ACTION BUTTONS */}

                        {group.effectiveStatus ===
                          "PENDING" &&
                          current && (
                            <div className="mt-4 border-t border-slate-200 pt-4">

                              <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                                Update Follow-up
                              </p>

                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      current,
                                      "CONTINUE"
                                    )
                                  }
                                  className="rounded-xl bg-blue-100 px-3 py-3 text-sm font-black text-blue-800"
                                >
                                  📅 Continue
                                </button>

                                {leadType ===
                                "CUSTOMER" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAction(
                                        current,
                                        "READY_FOR_POLICY"
                                      )
                                    }
                                    className="rounded-xl bg-violet-100 px-3 py-3 text-sm font-black text-violet-800"
                                  >
                                    📄 Ready for Policy
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const params =
                                        new URLSearchParams({
                                          conversion:
                                            "1",

                                          followUpId:
                                            current.id,

                                          enquiryId:
                                            current.enquiryId ||
                                            "",

                                          name:
                                            current.customer?.name ||
                                            "",

                                          phone:
                                            current.customer?.phone ||
                                            "",

                                          businessType:
                                            current.enquiry?.businessType ||
                                            "",
                                        });

                                      router.push(
                                        `/sub-agents/add?${params.toString()}`
                                      );
                                    }}
                                    className="rounded-xl bg-violet-100 px-3 py-3 text-sm font-black text-violet-800"
                                  >
                                    🤝 Create Sub Agent
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      current,
                                      "BUSINESS_CLOSED"
                                    )
                                  }
                                  className="rounded-xl bg-emerald-100 px-3 py-3 text-sm font-black text-emerald-800"
                                >
                                  ✅ Business Closed
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      current,
                                      "CASE_LOST"
                                    )
                                  }
                                  className="rounded-xl bg-red-100 px-3 py-3 text-sm font-black text-red-800"
                                >
                                  ❌ Case Lost
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      current,
                                      "CANCELLED"
                                    )
                                  }
                                  className="rounded-xl bg-slate-200 px-3 py-3 text-sm font-black text-slate-800"
                                >
                                  🚫 Cancel
                                </button>

                              </div>

                            </div>
                          )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

      </div>

      {/* MODAL */}

      {selectedFollowUp &&
        selectedOutcome && (
          <ActionModal
            followUp={
              selectedFollowUp
            }
            outcome={
              selectedOutcome
            }
            userId={
              userId
            }
            onClose={
              closeAction
            }
            onSaved={async (
              message
            ) => {
              closeAction();

              setSuccess(
                message
              );

              await loadFollowUps(
                userId
              );

              window.scrollTo({
                top: 0,
                behavior:
                  "smooth",
              });
            }}
            onError={
              setError
            }
          />
        )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* MODAL                                                                      */
/* -------------------------------------------------------------------------- */

function ActionModal({
  followUp,
  outcome,
  userId,
  onClose,
  onSaved,
  onError,
}: {
  followUp: FollowUp;

  outcome: Outcome;

  userId: string;

  onClose:
    () => void;

  onSaved:
    (
      message: string
    ) => Promise<void>;

  onError:
    (
      message: string
    ) => void;
}) {
  const router =
    useRouter();

  const [
    comment,
    setComment,
  ] =
    useState("");

  const [
    followUpDate,
    setFollowUpDate,
  ] =
    useState(
      toDateInputValue()
    );

  const [
    nextDate,
    setNextDate,
  ] =
    useState("");

  const [
    lostReason,
    setLostReason,
  ] =
    useState("");

  const [
    cancellationReason,
    setCancellationReason,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const leadType =
    getLeadType(
      followUp
    );

  async function save() {
    const cleanComment =
      comment.trim();

    if (!cleanComment) {
      onError(
        "Please enter the NEW follow-up remarks."
      );

      return;
    }

    if (
      outcome ===
        "CONTINUE" &&
      !nextDate
    ) {
      onError(
        "Please select the next follow-up date."
      );

      return;
    }

    if (
      outcome ===
        "CASE_LOST" &&
      !lostReason.trim()
    ) {
      onError(
        "Please enter the lost reason."
      );

      return;
    }

    if (
      outcome ===
        "CANCELLED" &&
      !cancellationReason.trim()
    ) {
      onError(
        "Please enter the cancellation reason."
      );

      return;
    }

    try {
      setSaving(true);
      onError("");

      const response =
        await fetch(
          "/api/follow-ups",
          {
            method:
              "PUT",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  followUp.id,

                userId,

                outcome,

                comment:
                  cleanComment,

                followUpDate,

                ...(outcome ===
                "CONTINUE"
                  ? {
                      nextFollowUpDate:
                        nextDate,
                    }
                  : {}),

                ...(outcome ===
                "CASE_LOST"
                  ? {
                      lostReason:
                        lostReason.trim(),
                    }
                  : {}),

                ...(outcome ===
                "CANCELLED"
                  ? {
                      cancellationReason:
                        cancellationReason.trim(),
                    }
                  : {}),
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        customerId?: string;
        enquiryId?: string;
        readyForPolicy?: boolean;
      } =
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
            "Unable to update follow-up."
        );
      }

      if (
        outcome ===
          "READY_FOR_POLICY" &&
        data.customerId
      ) {
        router.push(
          `/policies/add?customerId=${encodeURIComponent(
            data.customerId
          )}`
        );

        return;
      }

      if (
        outcome ===
          "BUSINESS_CLOSED" &&
        leadType ===
          "CUSTOMER" &&
        data.customerId
      ) {
        router.push(
          `/policies/add?customerId=${encodeURIComponent(
            data.customerId
          )}`
        );

        return;
      }

      await onSaved(
        data.message ||
          "Follow-up updated successfully."
      );
    } catch (
      err
    ) {
      console.error(
        "SAVE FOLLOW UP:",
        err
      );

      onError(
        err instanceof Error
          ? err.message
          : "Unable to update follow-up."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">

      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="border-b p-5">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                New History Entry
              </p>

              <h2 className="mt-1 text-xl font-black">
                {outcome ===
                "CONTINUE"
                  ? "Continue Follow-up"
                  : outcome ===
                      "READY_FOR_POLICY"
                    ? "Ready for Policy"
                    : outcome ===
                        "BUSINESS_CLOSED"
                      ? "Business Closed"
                      : outcome ===
                          "CASE_LOST"
                        ? "Case Lost"
                        : "Cancel Enquiry"}
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {followUp.customer?.name}
              </p>

            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                saving
              }
              className="rounded-xl bg-slate-100 px-3 py-2 font-black"
            >
              ✕
            </button>

          </div>

        </div>

        {/* BODY */}

        <div className="space-y-4 p-5">

          {/* OLD COMMENT */}

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">

            <p className="text-xs font-black uppercase text-blue-700">
              Previous Remark
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-blue-900">
              {followUp.comment}
            </p>

            <p className="mt-2 text-xs font-bold text-blue-700">
              This previous comment will NOT be changed.
            </p>

          </div>

          {/* NEW COMMENT */}

          <div>

            <label className="block text-sm font-black">
              New Follow-up Remarks *
            </label>

            <textarea
              rows={4}
              value={
                comment
              }
              onChange={(
                event
              ) =>
                setComment(
                  event.target.value
                )
              }
              placeholder="Enter today's discussion..."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-500"
            />

          </div>

          {/* DATE */}

          <div>

            <label className="block text-sm font-black">
              Action Date
            </label>

            <input
              type="date"
              value={
                followUpDate
              }
              onChange={(
                event
              ) =>
                setFollowUpDate(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
            />

          </div>

          {/* NEXT */}

          {outcome ===
            "CONTINUE" && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">

              <label className="block text-sm font-black text-orange-900">
                Next Follow-up Date *
              </label>

              <input
                type="date"
                value={
                  nextDate
                }
                onChange={(
                  event
                ) =>
                  setNextDate(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-orange-300 bg-white px-4 py-3"
              />

            </div>
          )}

          {/* READY */}

          {outcome ===
            "READY_FOR_POLICY" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 font-semibold text-violet-800">
              📄 This history will be saved as Ready for Policy. The Add Policy page will then open.
            </div>
          )}

          {/* CLOSED */}

          {outcome ===
            "BUSINESS_CLOSED" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">
              ✅ The enquiry will be marked Converted and this action will remain permanently in the history with the person who closed it.
            </div>
          )}

          {/* LOST */}

          {outcome ===
            "CASE_LOST" && (
            <div>

              <label className="block text-sm font-black text-red-700">
                Lost Reason *
              </label>

              <textarea
                rows={3}
                value={
                  lostReason
                }
                onChange={(
                  event
                ) =>
                  setLostReason(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3"
              />

            </div>
          )}

          {/* CANCEL */}

          {outcome ===
            "CANCELLED" && (
            <div>

              <label className="block text-sm font-black text-red-700">
                Cancellation Reason *
              </label>

              <textarea
                rows={3}
                value={
                  cancellationReason
                }
                onChange={(
                  event
                ) =>
                  setCancellationReason(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3"
              />

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div className="flex gap-3 border-t p-5">

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              saving
            }
            className="rounded-xl border px-5 py-3 font-black"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() =>
              void save()
            }
            disabled={
              saving
            }
            className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save History"}
          </button>

        </div>

      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY                                                                    */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">

      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-3xl font-black ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}