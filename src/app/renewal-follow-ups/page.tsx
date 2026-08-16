"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Customer = {
  id: string;
  customerId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Policy = {
  id: string;
  policyNumber?: string | null;
  companyName?: string | null;
  productName?: string | null;
  policyType?: string | null;
  premium?: number | string | null;
  customerPremium?: number | string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  isActive?: boolean | null;
};

type RenewalStatus =
  | "NOT_CONTACTED"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "INTERESTED"
  | "PAYMENT_PENDING"
  | "RENEWED"
  | "CLOSED";

type RenewalOutcome =
  | ""
  | "RENEWED"
  | "NOT_INTERESTED"
  | "RENEWED_ELSEWHERE"
  | "UNABLE_TO_CONTACT"
  | "LAPSED";

type RenewalFollowUp = {
  id: string;

  userId?: string;
  customerId: string;
  policyId: string;

  status?: RenewalStatus | string | null;
  outcome?: RenewalOutcome | string | null;

  followUpDate?: string | null;
  nextFollowUpDate?: string | null;

  remarks?: string | null;

  quotedPremium?:
    | number
    | string
    | null;

  completedAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  customer?: Customer | null;
  policy?: Policy | null;
};

type StatusFilter =
  | "ALL"
  | "PENDING"
  | "RENEWED"
  | "CLOSED";

/* -------------------------------------------------------------------------- */
/* LOGGED-IN USER                                                             */
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
      // Ignore invalid storage.
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

function todayForInput() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function dateForInput(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(
    2,
    "0"
  )}-${String(
    date.getUTCDate()
  ).padStart(
    2,
    "0"
  )}`;
}

/* -------------------------------------------------------------------------- */
/* DAYS TO EXPIRY                                                             */
/* -------------------------------------------------------------------------- */

function daysToExpiry(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const expiry =
    new Date(value);

  if (
    Number.isNaN(
      expiry.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  const start =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const end =
    new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate()
    );

  return Math.ceil(
    (
      end.getTime() -
      start.getTime()
    ) /
      86400000
  );
}

/* -------------------------------------------------------------------------- */
/* MONEY                                                                      */
/* -------------------------------------------------------------------------- */

function formatMoney(
  value?:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const amount =
    Number(value);

  if (
    Number.isNaN(
      amount
    )
  ) {
    return String(value);
  }

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

/* -------------------------------------------------------------------------- */
/* WHATSAPP                                                                   */
/* -------------------------------------------------------------------------- */

function getWhatsAppNumber(
  phone?: string | null
) {
  const digits =
    String(
      phone || ""
    ).replace(
      /\D/g,
      ""
    );

  if (!digits) {
    return "";
  }

  if (
    digits.startsWith(
      "91"
    ) &&
    digits.length >= 12
  ) {
    return digits;
  }

  if (
    digits.length === 10
  ) {
    return `91${digits}`;
  }

  return digits;
}

/* -------------------------------------------------------------------------- */
/* STATUS                                                                     */
/* -------------------------------------------------------------------------- */

function getStatusLabel(
  value?: string | null
) {
  switch (
    String(
      value || ""
    ).toUpperCase()
  ) {
    case "NOT_CONTACTED":
      return "Not Contacted";

    case "CONTACTED":
      return "Contacted";

    case "FOLLOW_UP":
      return "Follow-up";

    case "INTERESTED":
      return "Interested";

    case "PAYMENT_PENDING":
      return "Payment Pending";

    case "RENEWED":
      return "Renewed";

    case "CLOSED":
      return "Closed";

    default:
      return (
        value || "Follow-up"
      );
  }
}

function statusClass(
  value?: string | null
) {
  const status =
    String(
      value || ""
    ).toUpperCase();

  if (
    status === "RENEWED"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    status === "CLOSED"
  ) {
    return "bg-slate-200 text-slate-800";
  }

  if (
    status ===
    "PAYMENT_PENDING"
  ) {
    return "bg-violet-100 text-violet-800";
  }

  if (
    status ===
      "INTERESTED" ||
    status ===
      "CONTACTED"
  ) {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-orange-100 text-orange-800";
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function RenewalFollowUpsPage() {
  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    followUps,
    setFollowUps,
  ] =
    useState<
      RenewalFollowUp[]
    >([]);

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
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL"
    );

  /* ------------------------------------------------------------------------ */
  /* EDIT MODAL                                                               */
  /* ------------------------------------------------------------------------ */

  const [
    selected,
    setSelected,
  ] =
    useState<
      RenewalFollowUp | null
    >(null);

  const [
    editStatus,
    setEditStatus,
  ] =
    useState<RenewalStatus>(
      "FOLLOW_UP"
    );

  const [
    editOutcome,
    setEditOutcome,
  ] =
    useState<RenewalOutcome>(
      ""
    );

  const [
    followUpDate,
    setFollowUpDate,
  ] =
    useState(
      todayForInput()
    );

  const [
    nextFollowUpDate,
    setNextFollowUpDate,
  ] =
    useState("");

  const [
    remarks,
    setRemarks,
  ] =
    useState("");

  const [
    quotedPremium,
    setQuotedPremium,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    modalError,
    setModalError,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const id =
      getLoggedInUserId();

    if (!id) {
      setError(
        "Logged-in user information was not found. Please login again."
      );

      setLoading(false);

      return;
    }

    setUserId(id);

    void loadFollowUps(
      id
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  async function loadFollowUps(
    activeUserId?: string
  ) {
    try {
      setLoading(true);

      setError("");

      const id =
        activeUserId ||
        userId ||
        getLoggedInUserId();

      if (!id) {
        throw new Error(
          "User ID not found."
        );
      }

      const response =
        await fetch(
          `/api/renewal-follow-ups?userId=${encodeURIComponent(
            id
          )}`,
          {
            cache:
              "no-store",
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        followUps?: RenewalFollowUp[];
        data?: RenewalFollowUp[];
      } = {};

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
            "Unable to load renewal follow-ups."
        );
      }

      const list =
        Array.isArray(
          data.followUps
        )
          ? data.followUps
          : Array.isArray(
              data.data
            )
          ? data.data
          : [];

      setFollowUps(
        list
      );
    } catch (
      err
    ) {
      console.error(
        "LOAD RENEWAL FOLLOW-UPS:",
        err
      );

      setFollowUps([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load renewal follow-ups."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const pendingCount =
    useMemo(
      () =>
        followUps.filter(
          (item) =>
            ![
              "RENEWED",
              "CLOSED",
            ].includes(
              String(
                item.status ||
                  ""
              ).toUpperCase()
            )
        ).length,
      [
        followUps,
      ]
    );

  const renewedCount =
    useMemo(
      () =>
        followUps.filter(
          (item) =>
            String(
              item.status ||
                ""
            ).toUpperCase() ===
            "RENEWED"
        ).length,
      [
        followUps,
      ]
    );

  const closedCount =
    useMemo(
      () =>
        followUps.filter(
          (item) =>
            String(
              item.status ||
                ""
            ).toUpperCase() ===
            "CLOSED"
        ).length,
      [
        followUps,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredFollowUps =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return followUps.filter(
        (item) => {
          const status =
            String(
              item.status ||
                ""
            ).toUpperCase();

          if (
            statusFilter ===
              "PENDING" &&
            [
              "RENEWED",
              "CLOSED",
            ].includes(
              status
            )
          ) {
            return false;
          }

          if (
            statusFilter ===
              "RENEWED" &&
            status !==
              "RENEWED"
          ) {
            return false;
          }

          if (
            statusFilter ===
              "CLOSED" &&
            status !==
              "CLOSED"
          ) {
            return false;
          }

          if (!value) {
            return true;
          }

          const fields = [
            item.customer
              ?.customerId,
            item.customer
              ?.name,
            item.customer
              ?.phone,
            item.policy
              ?.policyNumber,
            item.policy
              ?.companyName,
            item.policy
              ?.productName,
            item.policy
              ?.policyType,
            item.remarks,
            item.status,
            item.outcome,
          ];

          return fields.some(
            (field) =>
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
      followUps,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* OPEN UPDATE                                                              */
  /* ------------------------------------------------------------------------ */

  function openUpdate(
    item: RenewalFollowUp
  ) {
    setSelected(item);

    const currentStatus =
      String(
        item.status ||
          "FOLLOW_UP"
      ).toUpperCase();

    const allowed:
      RenewalStatus[] = [
        "NOT_CONTACTED",
        "CONTACTED",
        "FOLLOW_UP",
        "INTERESTED",
        "PAYMENT_PENDING",
        "RENEWED",
        "CLOSED",
      ];

    setEditStatus(
      allowed.includes(
        currentStatus as
          RenewalStatus
      )
        ? currentStatus as RenewalStatus
        : "FOLLOW_UP"
    );

    setEditOutcome(
      (
        item.outcome ||
        ""
      ) as RenewalOutcome
    );

    setFollowUpDate(
      dateForInput(
        item.followUpDate
      ) ||
        todayForInput()
    );

    setNextFollowUpDate(
      dateForInput(
        item.nextFollowUpDate
      )
    );

    setRemarks(
      item.remarks ||
        ""
    );

    setQuotedPremium(
      item.quotedPremium !==
        null &&
        item.quotedPremium !==
          undefined
        ? String(
            item.quotedPremium
          )
        : ""
    );

    setModalError("");
    setMessage("");
  }

  /* ------------------------------------------------------------------------ */
  /* CLOSE UPDATE                                                             */
  /* ------------------------------------------------------------------------ */

  function closeUpdate() {
    if (saving) {
      return;
    }

    setSelected(null);
    setModalError("");
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE UPDATE                                                              */
  /* ------------------------------------------------------------------------ */

  async function saveUpdate(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    try {
      setSaving(true);

      setModalError("");

      if (!remarks.trim()) {
        throw new Error(
          "Agent follow-up remark is required."
        );
      }

      if (
        ![
          "RENEWED",
          "CLOSED",
        ].includes(
          editStatus
        ) &&
        !nextFollowUpDate
      ) {
        throw new Error(
          "Please select next follow-up date."
        );
      }

      const response =
        await fetch(
          "/api/renewal-follow-ups",
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  selected.id,

                userId,

                status:
                  editStatus,

                outcome:
                  editOutcome ||
                  undefined,

                followUpDate,

                nextFollowUpDate:
                  [
                    "RENEWED",
                    "CLOSED",
                  ].includes(
                    editStatus
                  )
                    ? null
                    : nextFollowUpDate ||
                      null,

                remarks:
                  remarks.trim(),

                quotedPremium:
                  quotedPremium
                    ? Number(
                        quotedPremium
                      )
                    : null,
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
        data.success ===
          false
      ) {
        throw new Error(
          data.message ||
            "Unable to update renewal follow-up."
        );
      }

      setMessage(
        data.message ||
          "Renewal follow-up updated successfully."
      );

      setSelected(null);

      await loadFollowUps(
        userId
      );
    } catch (
      err
    ) {
      setModalError(
        err instanceof Error
          ? err.message
          : "Unable to update renewal follow-up."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                Renewal Management
              </p>

              <h1 className="text-2xl font-black">
                Renewal Follow-ups
              </h1>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/renewals"
              className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-800"
            >
              🔄 Policy Renewals
            </Link>

            <Link
              href="/customers"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
            >
              👥 Customers
            </Link>

          </div>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-4 py-5">

        {/* SUMMARY */}

        {!loading && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

            <SummaryCard
              label="Total"
              value={
                followUps.length
              }
              active={
                statusFilter ===
                "ALL"
              }
              onClick={() =>
                setStatusFilter(
                  "ALL"
                )
              }
            />

            <SummaryCard
              label="Pending"
              value={
                pendingCount
              }
              active={
                statusFilter ===
                "PENDING"
              }
              onClick={() =>
                setStatusFilter(
                  "PENDING"
                )
              }
            />

            <SummaryCard
              label="Renewed"
              value={
                renewedCount
              }
              active={
                statusFilter ===
                "RENEWED"
              }
              onClick={() =>
                setStatusFilter(
                  "RENEWED"
                )
              }
            />

            <SummaryCard
              label="Closed / Lost"
              value={
                closedCount
              }
              active={
                statusFilter ===
                "CLOSED"
              }
              onClick={() =>
                setStatusFilter(
                  "CLOSED"
                )
              }
            />

          </div>
        )}

        {/* SEARCH */}

        <div className="mt-4 rounded-2xl border bg-white p-3 shadow-sm">

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
            placeholder="Search customer, mobile, policy number, company..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-black outline-none focus:border-blue-600"
          />

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
            ✅ {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">

            <p className="font-bold">
              ⚠️ {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadFollowUps()
              }
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white"
            >
              Try Again
            </button>

          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="mt-5 rounded-2xl border bg-white p-10 text-center">

            <div className="text-4xl">
              ⏳
            </div>

            <p className="mt-3 font-black">
              Loading renewal follow-ups...
            </p>

          </div>
        )}

        {/* LIST */}

        {!loading && (
          <div className="mt-5 space-y-3">

            {filteredFollowUps.map(
              (item) => {
                const customer =
                  item.customer;

                const policy =
                  item.policy;

                const phone =
                  customer?.phone ||
                  "";

                const whatsapp =
                  getWhatsAppNumber(
                    phone
                  );

                const expiryDays =
                  daysToExpiry(
                    policy?.expiryDate
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >

                    {/* TOP */}

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h2 className="text-lg font-black">
                            {customer?.name ||
                              "Customer"}
                          </h2>

                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs font-black ${statusClass(
                              item.status
                            )}`}
                          >
                            {getStatusLabel(
                              item.status
                            )}
                          </span>

                        </div>

                        {customer?.customerId && (
                          <p className="mt-1 text-xs font-bold text-blue-700">
                            {
                              customer.customerId
                            }
                          </p>
                        )}

                        {phone && (
                          <p className="mt-2 text-sm font-bold">
                            📱 {phone}
                          </p>
                        )}

                      </div>

                      {expiryDays !==
                        null && (
                        <span
                          className={`rounded-xl px-3 py-2 text-xs font-black ${
                            expiryDays <
                            0
                              ? "bg-red-100 text-red-800"
                              : expiryDays <=
                                30
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {expiryDays <
                          0
                            ? `${Math.abs(
                                expiryDays
                              )} days overdue`
                            : expiryDays ===
                              0
                            ? "Expires Today"
                            : `${expiryDays} days left`}
                        </span>
                      )}

                    </div>

                    {/* POLICY */}

                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">

                      <MiniDetail
                        label="Policy No."
                        value={
                          policy?.policyNumber ||
                          "-"
                        }
                      />

                      <MiniDetail
                        label="Company"
                        value={
                          policy?.companyName ||
                          "-"
                        }
                      />

                      <MiniDetail
                        label="Expiry"
                        value={formatDate(
                          policy?.expiryDate
                        )}
                      />

                      <MiniDetail
                        label="Premium"
                        value={formatMoney(
                          policy?.customerPremium ??
                            policy?.premium
                        )}
                      />

                    </div>

                    {/* FOLLOW-UP */}

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">

                      <MiniDetail
                        label="Last Follow-up"
                        value={formatDate(
                          item.followUpDate
                        )}
                      />

                      <MiniDetail
                        label="Next Follow-up"
                        value={formatDate(
                          item.nextFollowUpDate
                        )}
                      />

                      <MiniDetail
                        label="Quoted Premium"
                        value={formatMoney(
                          item.quotedPremium
                        )}
                      />

                    </div>

                    {/* AGENT REMARK */}

                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">

                      <p className="text-xs font-black uppercase text-blue-700">
                        Agent Follow-up Remark
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">
                        {item.remarks ||
                          "No remark entered."}
                      </p>

                    </div>

                    {/* ACTIONS */}

                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">

                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800"
                        >
                          📞 Call
                        </a>
                      )}

                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white"
                        >
                          💬 WhatsApp
                        </a>
                      )}

                      {customer?.id && (
                        <Link
                          href={`/customers/${customer.id}`}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white"
                        >
                          👤 Customer
                        </Link>
                      )}

                      {![
                        "RENEWED",
                        "CLOSED",
                      ].includes(
                        String(
                          item.status ||
                            ""
                        ).toUpperCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            openUpdate(
                              item
                            )
                          }
                          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white"
                        >
                          📝 Update Follow-up
                        </button>
                      )}

                      {policy?.id && (
                        <Link
                          href={`/policies/add?renewFrom=${encodeURIComponent(
                            policy.id
                          )}`}
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white"
                        >
                          🔄 Renew Policy
                        </Link>
                      )}

                    </div>

                  </article>
                );
              }
            )}

            {/* EMPTY */}

            {filteredFollowUps.length ===
              0 &&
              !error && (
                <div className="rounded-2xl border bg-white p-10 text-center">

                  <div className="text-4xl">
                    🔄
                  </div>

                  <h2 className="mt-3 font-black">
                    No Renewal Follow-ups
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Renewal follow-ups created from customer or renewal pages will appear here.
                  </p>

                  <Link
                    href="/renewals"
                    className="mt-4 inline-block rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
                  >
                    View Policy Renewals
                  </Link>

                </div>
              )}

          </div>
        )}

      </section>

      {/* UPDATE MODAL */}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">

          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-5">

              <div>

                <h2 className="text-xl font-black">
                  Update Renewal Follow-up
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selected.customer
                    ?.name}{" "}
                  •{" "}
                  {selected.policy
                    ?.policyNumber ||
                    "Policy"}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeUpdate
                }
                disabled={
                  saving
                }
                className="rounded-lg border px-3 py-2 font-black"
              >
                ✕
              </button>

            </div>

            <form
              onSubmit={
                saveUpdate
              }
              className="p-5"
            >

              {/* STATUS */}

              <label className="text-sm font-black">
                Renewal Status *
              </label>

              <select
                value={
                  editStatus
                }
                onChange={(
                  event
                ) =>
                  setEditStatus(
                    event.target
                      .value as
                      RenewalStatus
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
              >
                <option value="NOT_CONTACTED">
                  Not Contacted
                </option>

                <option value="CONTACTED">
                  Contacted
                </option>

                <option value="FOLLOW_UP">
                  Follow-up
                </option>

                <option value="INTERESTED">
                  Interested
                </option>

                <option value="PAYMENT_PENDING">
                  Payment Pending
                </option>

                <option value="RENEWED">
                  Renewed
                </option>

                <option value="CLOSED">
                  Closed / Lost
                </option>
              </select>

              {/* DATES */}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                <div>

                  <label className="text-sm font-black">
                    Follow-up Date *
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
                        event.target
                          .value
                      )
                    }
                    required
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
                  />

                </div>

                {![
                  "RENEWED",
                  "CLOSED",
                ].includes(
                  editStatus
                ) && (
                  <div>

                    <label className="text-sm font-black">
                      Next Follow-up *
                    </label>

                    <input
                      type="date"
                      value={
                        nextFollowUpDate
                      }
                      onChange={(
                        event
                      ) =>
                        setNextFollowUpDate(
                          event.target
                            .value
                        )
                      }
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
                    />

                  </div>
                )}

              </div>

              {/* PREMIUM */}

              <div className="mt-4">

                <label className="text-sm font-black">
                  Quoted Renewal Premium
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    quotedPremium
                  }
                  onChange={(
                    event
                  ) =>
                    setQuotedPremium(
                      event.target
                        .value
                    )
                  }
                  placeholder="Example: 16500"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
                />

              </div>

              {/* CLOSED OUTCOME */}

              {editStatus ===
                "CLOSED" && (
                <div className="mt-4">

                  <label className="text-sm font-black">
                    Closure Reason
                  </label>

                  <select
                    value={
                      editOutcome
                    }
                    onChange={(
                      event
                    ) =>
                      setEditOutcome(
                        event.target
                          .value as
                          RenewalOutcome
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-black"
                  >
                    <option value="">
                      Select Reason
                    </option>

                    <option value="NOT_INTERESTED">
                      Customer Not Interested
                    </option>

                    <option value="RENEWED_ELSEWHERE">
                      Renewed Elsewhere
                    </option>

                    <option value="UNABLE_TO_CONTACT">
                      Unable to Contact
                    </option>

                    <option value="LAPSED">
                      Policy Lapsed
                    </option>
                  </select>

                </div>
              )}

              {/* REMARK */}

              <div className="mt-4">

                <label className="text-sm font-black">
                  Agent Follow-up Remark *
                </label>

                <textarea
                  value={
                    remarks
                  }
                  onChange={(
                    event
                  ) =>
                    setRemarks(
                      event.target
                        .value
                    )
                  }
                  rows={4}
                  required
                  placeholder="Example: Customer contacted. Quotation shared. Asked to call again on Monday..."
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-black"
                />

              </div>

              {modalError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                  ⚠️ {modalError}
                </div>
              )}

              {/* BUTTONS */}

              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    closeUpdate
                  }
                  className="rounded-xl border px-4 py-2.5 text-sm font-black"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Follow-up"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-2xl border p-4 text-left shadow-sm ${
        active
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">
        {value}
      </p>

    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* MINI DETAIL                                                                */
/* -------------------------------------------------------------------------- */

function MiniDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[11px] font-black uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}