"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type SubAgent = {
  id: string;
  code?: string | null;
  name: string;
  phone?: string | null;
  isActive?: boolean;
};

type Policy = {
  id: string;

  policyNumber?: string | null;

  customerId?: string | null;

  customerName?: string | null;

  companyName?: string | null;

  insurerName?: string | null;

  productName?: string | null;

  policyType?: string | null;

  premium?: number | string | null;

  actualPremium?: number | string | null;

  customerPremium?: number | string | null;

  sumInsured?: number | string | null;

  startDate?: string | null;

  expiryDate?: string | null;

  endDate?: string | null;

  status?: string | null;

  policyStage?: string | null;

  customerSource?: string | null;

  subAgentId?: string | null;

  isActive?: boolean;

  createdAt?: string | null;

  customer?: {
    id?: string;
    customerId?: string;
    name?: string;
    phone?: string;
    email?: string;
    sourceType?: string;
  } | null;

  subAgent?: {
    id?: string;
    code?: string;
    name?: string;
    phone?: string;
    whatsapp?: string;
  } | null;

  company?: {
    id?: string;
    name?: string;
  } | null;
};

type ExpiryFilter =
  | "ALL"
  | "TODAY"
  | "7_DAYS"
  | "30_DAYS"
  | "EXPIRED";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
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
    return value;
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

  return amount.toLocaleString(
    "en-IN"
  );
}

function getPremium(
  policy: Policy
) {
  return (
    policy.customerPremium ??
    policy.actualPremium ??
    policy.premium ??
    null
  );
}

function getExpiryDate(
  policy: Policy
) {
  return (
    policy.expiryDate ||
    policy.endDate ||
    null
  );
}

function getDaysToExpiry(
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

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const expiryDay =
    new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate()
    );

  return Math.round(
    (
      expiryDay.getTime() -
      today.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
}

function getPolicySource(
  policy: Policy
) {
  return String(
    policy.customerSource ||
      policy.customer
        ?.sourceType ||
      "SELF"
  ).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function PoliciesPage() {
  const [
    policies,
    setPolicies,
  ] =
    useState<
      Policy[]
    >([]);

  const [
    subAgents,
    setSubAgents,
  ] =
    useState<
      SubAgent[]
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
    search,
    setSearch,
  ] =
    useState("");

  const [
    selectedCustomerId,
    setSelectedCustomerId,
  ] =
    useState("");

  const [
    pageReady,
    setPageReady,
  ] =
    useState(false);

  const [
    sourceFilter,
    setSourceFilter,
  ] =
    useState("ALL");

  const [
    expiryFilter,
    setExpiryFilter,
  ] =
    useState<ExpiryFilter>(
      "ALL"
    );

  /* ------------------------------------------------------------------------ */
  /* READ CUSTOMER ID                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const customerId =
      String(
        params.get(
          "customerId"
        ) || ""
      ).trim();

    setSelectedCustomerId(
      customerId
    );

    setPageReady(
      true
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!pageReady) {
      return;
    }

    void loadPageData();
  }, [
    pageReady,
    selectedCustomerId,
  ]);

  async function getLoggedUserId() {
    let userId =
      localStorage.getItem(
        "userId"
      );

    if (userId) {
      return userId;
    }

    const storedUser =
      localStorage.getItem(
        "agentUser"
      );

    if (!storedUser) {
      return "";
    }

    try {
      const parsed =
        JSON.parse(
          storedUser
        );

      if (
        parsed?.id
      ) {
        userId =
          String(
            parsed.id
          );

        localStorage.setItem(
          "userId",
          userId
        );

        return userId;
      }
    } catch {
      return "";
    }

    return "";
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setError("");

      const userId =
        await getLoggedUserId();

      if (!userId) {
        setPolicies([]);
        setSubAgents([]);

        setError(
          "Logged-in user information was not found. Please login again."
        );

        return;
      }

      let policyUrl =
        `/api/policies?userId=${encodeURIComponent(
          userId
        )}`;

      if (
        selectedCustomerId
      ) {
        policyUrl +=
          `&customerId=${encodeURIComponent(
            selectedCustomerId
          )}`;
      }

      const [
        policyResponse,
        subAgentResponse,
      ] =
        await Promise.all([
          fetch(
            policyUrl,
            {
              cache:
                "no-store",
            }
          ),

          fetch(
            `/api/sub-agents?userId=${encodeURIComponent(
              userId
            )}&activeOnly=false`,
            {
              cache:
                "no-store",
            }
          ),
        ]);

      /* POLICIES */

      let policyData: any =
        {};

      try {
        policyData =
          await policyResponse.json();
      } catch {
        policyData =
          {};
      }

      if (
        !policyResponse.ok ||
        policyData.success ===
          false
      ) {
        throw new Error(
          policyData.message ||
            "Unable to load policies."
        );
      }

      const policyList =
        Array.isArray(
          policyData
        )
          ? policyData
          : Array.isArray(
              policyData.policies
            )
          ? policyData.policies
          : Array.isArray(
              policyData.data
            )
          ? policyData.data
          : [];

      setPolicies(
        policyList
      );

      /* SUB AGENTS */

      let subAgentData: any =
        {};

      try {
        subAgentData =
          await subAgentResponse.json();
      } catch {
        subAgentData =
          {};
      }

      if (
        subAgentResponse.ok &&
        subAgentData.success !==
          false
      ) {
        const list =
          Array.isArray(
            subAgentData
          )
            ? subAgentData
            : Array.isArray(
                subAgentData.subAgents
              )
            ? subAgentData.subAgents
            : Array.isArray(
                subAgentData.data
              )
            ? subAgentData.data
            : [];

        setSubAgents(
          list
        );
      } else {
        setSubAgents([]);
      }
    } catch (
      error
    ) {
      console.error(
        "POLICY PAGE LOAD ERROR:",
        error
      );

      setPolicies([]);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load policies."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SELECTED CUSTOMER                                                        */
  /* ------------------------------------------------------------------------ */

  const selectedCustomer =
    useMemo(() => {
      if (
        !selectedCustomerId ||
        policies.length === 0
      ) {
        return null;
      }

      const policy =
        policies[0];

      return {
        id:
          policy.customer
            ?.id ||
          selectedCustomerId,

        customerId:
          policy.customer
            ?.customerId ||
          "",

        name:
          policy.customer
            ?.name ||
          policy.customerName ||
          "Customer",

        phone:
          policy.customer
            ?.phone ||
          "",
      };
    }, [
      selectedCustomerId,
      policies,
    ]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const todayPolicies =
    useMemo(() => {
      return policies.filter(
        (
          policy
        ) =>
          getDaysToExpiry(
            getExpiryDate(
              policy
            )
          ) === 0
      );
    }, [
      policies,
    ]);

  const sevenDayPolicies =
    useMemo(() => {
      return policies.filter(
        (
          policy
        ) => {
          const days =
            getDaysToExpiry(
              getExpiryDate(
                policy
              )
            );

          return (
            days !== null &&
            days >= 0 &&
            days <= 7
          );
        }
      );
    }, [
      policies,
    ]);

  const thirtyDayPolicies =
    useMemo(() => {
      return policies.filter(
        (
          policy
        ) => {
          const days =
            getDaysToExpiry(
              getExpiryDate(
                policy
              )
            );

          return (
            days !== null &&
            days >= 0 &&
            days <= 30
          );
        }
      );
    }, [
      policies,
    ]);

  const expiredPolicies =
    useMemo(() => {
      return policies.filter(
        (
          policy
        ) => {
          const days =
            getDaysToExpiry(
              getExpiryDate(
                policy
              )
            );

          return (
            days !== null &&
            days < 0
          );
        }
      );
    }, [
      policies,
    ]);

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredPolicies =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return policies.filter(
        (
          policy
        ) => {
          const source =
            getPolicySource(
              policy
            );

          /* SOURCE */

          if (
            sourceFilter ===
              "SELF" &&
            source !==
              "SELF"
          ) {
            return false;
          }

          if (
            sourceFilter.startsWith(
              "SUB_AGENT:"
            )
          ) {
            const filterSubAgentId =
              sourceFilter.replace(
                "SUB_AGENT:",
                ""
              );

            const policySubAgentId =
              policy.subAgent?.id ||
              policy.subAgentId ||
              "";

            if (
              source !==
                "SUB_AGENT" ||
              policySubAgentId !==
                filterSubAgentId
            ) {
              return false;
            }
          }

          /* EXPIRY */

          const days =
            getDaysToExpiry(
              getExpiryDate(
                policy
              )
            );

          if (
            expiryFilter ===
              "TODAY" &&
            days !== 0
          ) {
            return false;
          }

          if (
            expiryFilter ===
              "7_DAYS" &&
            !(
              days !== null &&
              days >= 0 &&
              days <= 7
            )
          ) {
            return false;
          }

          if (
            expiryFilter ===
              "30_DAYS" &&
            !(
              days !== null &&
              days >= 0 &&
              days <= 30
            )
          ) {
            return false;
          }

          if (
            expiryFilter ===
              "EXPIRED" &&
            !(
              days !== null &&
              days < 0
            )
          ) {
            return false;
          }

          /* SEARCH */

          if (!query) {
            return true;
          }

          const customerName =
            policy.customer
              ?.name ||
            policy.customerName ||
            "";

          const customerCode =
            policy.customer
              ?.customerId ||
            "";

          const company =
            policy.company
              ?.name ||
            policy.companyName ||
            policy.insurerName ||
            "";

          const subAgentName =
            policy.subAgent
              ?.name ||
            "";

          return [
            policy.policyNumber,
            customerName,
            customerCode,
            policy.customer?.phone,
            company,
            policy.productName,
            policy.policyType,
            subAgentName,
          ].some(
            (
              item
            ) =>
              String(
                item || ""
              )
                .toLowerCase()
                .includes(
                  query
                )
          );
        }
      );
    }, [
      policies,
      search,
      sourceFilter,
      expiryFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* ADD POLICY URL                                                           */
  /* ------------------------------------------------------------------------ */

  const addPolicyUrl =
    selectedCustomerId
      ? `/policies/add?customerId=${encodeURIComponent(
          selectedCustomerId
        )}`
      : "/policies/add";

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-24">

      <div className="mx-auto max-w-5xl">

        {/* DASHBOARD */}

        <div className="mb-5 flex flex-wrap gap-2">

          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            ← Dashboard
          </Link>

          {selectedCustomerId && (
            <Link
              href="/customers"
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700"
            >
              ← Customers
            </Link>
          )}

        </div>

        {/* HEADER */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCustomerId
                ? "Customer Policies"
                : "Policies"}
            </h1>

            <p className="mt-1 text-sm text-gray-500">

              {selectedCustomerId
                ? selectedCustomer?.name
                  ? `Policies for ${selectedCustomer.name}`
                  : "Policies for selected customer"
                : "Manage your insurance policies"}

            </p>

          </div>

          <Link
            href={
              addPolicyUrl
            }
            className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm"
          >
            + Add Policy
          </Link>

        </div>

        {/* SELECTED CUSTOMER */}

        {selectedCustomerId &&
          selectedCustomer && (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

            <p className="text-xs font-bold uppercase text-blue-600">
              Selected Customer
            </p>

            <p className="mt-1 text-xl font-black text-gray-900">
              {
                selectedCustomer.name
              }
            </p>

            {selectedCustomer.customerId && (
              <p className="mt-1 text-sm font-semibold text-blue-800">
                Customer ID:{" "}
                {
                  selectedCustomer.customerId
                }
              </p>
            )}

          </div>
        )}

        {/* EXPIRY CARDS */}

        {!loading && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">

            <button
              type="button"
              onClick={() =>
                setExpiryFilter(
                  "ALL"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                expiryFilter ===
                "ALL"
                  ? "border-blue-400 bg-blue-50"
                  : "bg-white"
              }`}
            >
              <p className="text-xs font-bold text-gray-500">
                Total Policies
              </p>

              <div className="mt-2 flex items-center gap-3">

                <span className="text-2xl">
                  📄
                </span>

                <span className="text-3xl font-black text-blue-700">
                  {
                    policies.length
                  }
                </span>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setExpiryFilter(
                  "TODAY"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                expiryFilter ===
                "TODAY"
                  ? "border-red-400 bg-red-50"
                  : "bg-white"
              }`}
            >
              <p className="text-xs font-bold text-gray-500">
                Expiring Today
              </p>

              <div className="mt-2 flex items-center gap-3">

                <span className="text-2xl">
                  🚨
                </span>

                <span className="text-3xl font-black text-red-600">
                  {
                    todayPolicies.length
                  }
                </span>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setExpiryFilter(
                  "7_DAYS"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                expiryFilter ===
                "7_DAYS"
                  ? "border-orange-400 bg-orange-50"
                  : "bg-white"
              }`}
            >
              <p className="text-xs font-bold text-gray-500">
                Next 7 Days
              </p>

              <div className="mt-2 flex items-center gap-3">

                <span className="text-2xl">
                  🔔
                </span>

                <span className="text-3xl font-black text-orange-600">
                  {
                    sevenDayPolicies.length
                  }
                </span>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setExpiryFilter(
                  "30_DAYS"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                expiryFilter ===
                "30_DAYS"
                  ? "border-orange-400 bg-orange-50"
                  : "bg-white"
              }`}
            >
              <p className="text-xs font-bold text-gray-500">
                Next 30 Days
              </p>

              <div className="mt-2 flex items-center gap-3">

                <span className="text-2xl">
                  ⏰
                </span>

                <span className="text-3xl font-black text-orange-600">
                  {
                    thirtyDayPolicies.length
                  }
                </span>

              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setExpiryFilter(
                  "EXPIRED"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                expiryFilter ===
                "EXPIRED"
                  ? "border-red-400 bg-red-50"
                  : "bg-white"
              }`}
            >
              <p className="text-xs font-bold text-gray-500">
                Expired
              </p>

              <div className="mt-2 flex items-center gap-3">

                <span className="text-2xl">
                  ⚠️
                </span>

                <span className="text-3xl font-black text-red-600">
                  {
                    expiredPolicies.length
                  }
                </span>

              </div>
            </button>

          </div>
        )}

        {/* SOURCE FILTER */}

        {!loading &&
          !selectedCustomerId && (
          <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">

            <label className="mb-2 block text-sm font-black text-gray-900">
              Customer Source
            </label>

            <select
              value={
                sourceFilter
              }
              onChange={(
                event
              ) =>
                setSourceFilter(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900"
            >

              <option value="ALL">
                All Customers
              </option>

              <option value="SELF">
                Self / Direct Customers
              </option>

              {subAgents.map(
                (
                  subAgent
                ) => (
                  <option
                    key={
                      subAgent.id
                    }
                    value={`SUB_AGENT:${subAgent.id}`}
                  >
                    Sub-Agent -{" "}
                    {
                      subAgent.name
                    }
                    {subAgent.code
                      ? ` (${subAgent.code})`
                      : ""}
                  </option>
                )
              )}

            </select>

          </div>
        )}

        {/* SEARCH */}

        <div className="mb-5 rounded-xl bg-white p-3 shadow-sm">

          <input
            type="text"
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
            placeholder="Search policy, customer, mobile, company, product or sub-agent..."
            className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
          />

        </div>

        {/* FILTER INFO */}

        {!loading &&
          (
            sourceFilter !==
              "ALL" ||
            expiryFilter !==
              "ALL" ||
            search
          ) && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">

            <p className="font-bold text-blue-900">
              Showing{" "}
              {
                filteredPolicies.length
              }{" "}
              filtered polic
              {filteredPolicies.length ===
              1
                ? "y"
                : "ies"}
            </p>

            <button
              type="button"
              onClick={() => {
                setSourceFilter(
                  "ALL"
                );

                setExpiryFilter(
                  "ALL"
                );

                setSearch(
                  ""
                );
              }}
              className="rounded-lg bg-white px-4 py-2 text-xs font-black text-blue-700"
            >
              Clear Filters
            </button>

          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-semibold text-red-700">
              {
                error
              }
            </p>

            <button
              type="button"
              onClick={() =>
                void loadPageData()
              }
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>

          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-4xl">
              📄
            </div>

            <p className="mt-3 text-gray-500">
              Loading policies...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredPolicies.length ===
            0 && (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              📄
            </div>

            <h2 className="mt-3 text-lg font-bold text-gray-900">
              No Policies Found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              No policies match the selected filter.
            </p>

          </div>
        )}

        {/* POLICY LIST */}

        {!loading &&
          filteredPolicies.length >
            0 && (
          <div className="space-y-4">

            {filteredPolicies.map(
              (
                policy
              ) => {
                const expiryDate =
                  getExpiryDate(
                    policy
                  );

                const days =
                  getDaysToExpiry(
                    expiryDate
                  );

                const customerName =
                  policy.customer
                    ?.name ||
                  policy.customerName ||
                  "Customer";

                const customerCode =
                  policy.customer
                    ?.customerId ||
                  "";

                const company =
                  policy.company
                    ?.name ||
                  policy.companyName ||
                  policy.insurerName ||
                  "";

                const policyCustomerId =
                  policy.customer
                    ?.id ||
                  policy.customerId ||
                  "";

                const premium =
                  getPremium(
                    policy
                  );

                const source =
                  getPolicySource(
                    policy
                  );

                const policyAddUrl =
                  policyCustomerId
                    ? `/policies/add?customerId=${encodeURIComponent(
                        policyCustomerId
                      )}`
                    : "/policies/add";

                const renewPolicyUrl =
                  `/policies/add?renewFrom=${encodeURIComponent(
                    policy.id
                  )}`;

                return (
                  <article
                    key={
                      policy.id
                    }
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div className="min-w-0">

                        {/* POLICY NUMBER */}

                        <div className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {policy.policyNumber ||
                            "Policy"}
                        </div>

                        {/* CUSTOMER NAME */}

                        <h2 className="mt-3 text-xl font-black text-gray-900">
                          {
                            customerName
                          }
                        </h2>

                        {/* CUSTOMER ID */}

                        {customerCode && (
                          <p className="mt-1 text-sm font-medium text-gray-500">
                            Customer ID:{" "}
                            {
                              customerCode
                            }
                          </p>
                        )}

                        {/* CUSTOMER SOURCE */}

                        {source ===
                        "SUB_AGENT" ? (
                          <div className="mt-2 inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-800">

                            🤝 Source: Sub-Agent -{" "}

                            {policy.subAgent?.name
                              ? policy.subAgent.code
                                ? `${policy.subAgent.name} (${policy.subAgent.code})`
                                : policy.subAgent.name
                              : "Sub-Agent"}

                          </div>
                        ) : (
                          <div className="mt-2 inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
                            👤 Source: Self / Direct
                          </div>
                        )}

                        {/* COMPANY */}

                        {company && (
                          <p className="mt-3 text-sm text-gray-600">
                            🏢{" "}
                            {
                              company
                            }
                          </p>
                        )}

                        {/* PRODUCT */}

                        {policy.productName && (
                          <p className="mt-1 text-sm text-gray-600">
                            📋{" "}
                            {
                              policy.productName
                            }
                          </p>
                        )}

                        {/* TYPE */}

                        {policy.policyType && (
                          <p className="mt-1 text-sm text-gray-500">
                            Type:{" "}
                            {
                              policy.policyType
                            }
                          </p>
                        )}

                      </div>

                      {/* EXPIRY STATUS */}

                      <div>

                        {days === null ? (
                          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                            No Expiry
                          </span>
                        ) : days < 0 ? (
                          <span className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-black text-red-700">
                            Expired
                          </span>
                        ) : days === 0 ? (
                          <span className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-black text-white">
                            🚨 Expires Today
                          </span>
                        ) : days === 1 ? (
                          <span className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-800">
                            Expires Tomorrow
                          </span>
                        ) : days <= 7 ? (
                          <span className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-800">
                            {days} Days
                          </span>
                        ) : days <= 30 ? (
                          <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">
                            {days} Days
                          </span>
                        ) : (
                          <span className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                            {policy.policyStage ||
                              policy.status ||
                              "Active"}
                          </span>
                        )}

                      </div>

                    </div>

                    {/* DETAILS */}

                    <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">

                      <div className="rounded-xl bg-gray-50 p-3">

                        <p className="text-xs text-gray-500">
                          Premium
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-900">
                          ₹{" "}
                          {formatMoney(
                            premium
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">

                        <p className="text-xs text-gray-500">
                          Sum Insured
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-900">
                          ₹{" "}
                          {formatMoney(
                            policy.sumInsured
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">

                        <p className="text-xs text-gray-500">
                          Policy Start
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDate(
                            policy.startDate
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">

                        <p className="text-xs text-gray-500">
                          Policy Expiry
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDate(
                            expiryDate
                          )}
                        </p>

                      </div>

                    </div>

                    {/* EXPIRY ALERT */}

                    {days === 0 && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
                        🚨 This policy expires today
                      </div>
                    )}

                    {days !== null &&
                      days > 0 &&
                      days <= 7 && (
                      <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-800">
                        🔔 Policy expires in{" "}
                        {days}{" "}
                        day
                        {days === 1
                          ? ""
                          : "s"}
                      </div>
                    )}

                    {days !== null &&
                      days > 7 &&
                      days <= 30 && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                        ⏰ Policy expires in{" "}
                        {
                          days
                        }{" "}
                        days
                      </div>
                    )}

                    {days !== null &&
                      days < 0 && (
                      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                        ⚠️ This policy has expired
                      </div>
                    )}

                    {/* ACTIONS */}

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">

                      {policyCustomerId && (
                        <Link
                          href={`/customers/${policyCustomerId}`}
                          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          👁 View Customer
                        </Link>
                      )}

                      {!selectedCustomerId &&
                        policyCustomerId && (
                        <Link
                          href={`/policies?customerId=${encodeURIComponent(
                            policyCustomerId
                          )}`}
                          className="rounded-lg bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700"
                        >
                          📄 Customer Policies
                        </Link>
                      )}

                      <Link
                        href={
                          policyAddUrl
                        }
                        className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                      >
                        + Add Policy
                      </Link>

                      <Link
                        href={
                          renewPolicyUrl
                        }
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700"
                      >
                        🔄 Renew Policy
                      </Link>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </div>

    </main>
  );
}