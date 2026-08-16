"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AgentUser = {
  id?: string;
  name?: string;
  phone?: string;
  role?: string;
};

type SubAgent = {
  id: string;
  userId?: string;

  code?: string | null;

  name: string;

  phone?: string | null;

  whatsapp?: string | null;

  email?: string | null;

  address?: string | null;

  district?: string | null;

  state?: string | null;

  pincode?: string | null;

  notes?: string | null;

  isActive?: boolean;

  createdAt?: string | null;

  updatedAt?: string | null;
};

type Customer = {
  id: string;

  userId?: string;

  customerId?: string | null;

  name: string;

  phone?: string | null;

  email?: string | null;

  dateOfBirth?: string | null;

  address?: string | null;

  district?: string | null;

  state?: string | null;

  pincode?: string | null;

  sourceType?: string | null;

  subAgentId?: string | null;

  isActive?: boolean;

  createdAt?: string | null;

  _count?: {
    policies?: number;
    enquiries?: number;
    followUps?: number;
  };
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanPhone(
  phone?: string | null
) {
  return String(
    phone || ""
  ).replace(/\D/g, "");
}

function whatsappNumber(
  phone?: string | null
) {
  const digits =
    cleanPhone(phone);

  if (!digits) {
    return "";
  }

  if (
    digits.startsWith("91") &&
    digits.length >= 12
  ) {
    return digits;
  }

  const lastTen =
    digits.slice(-10);

  return `91${lastTen}`;
}

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

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function SubAgentDetailsPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const subAgentId =
    String(
      params?.id || ""
    );

  const [
    user,
    setUser,
  ] =
    useState<
      AgentUser | null
    >(null);

  const [
    subAgent,
    setSubAgent,
  ] =
    useState<
      SubAgent | null
    >(null);

  const [
    customers,
    setCustomers,
  ] =
    useState<Customer[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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
    useState<
      "ALL" |
      "ACTIVE" |
      "INACTIVE"
    >("ALL");

  /* ------------------------------------------------------------------------ */
  /* LOAD PAGE                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setMessage("");

        /* ------------------------------------------------------------------ */
        /* LOGIN USER                                                         */
        /* ------------------------------------------------------------------ */

        const savedUser =
          localStorage.getItem(
            "agentUser"
          );

        if (!savedUser) {
          router.replace(
            "/login"
          );

          return;
        }

        const parsed:
          AgentUser =
          JSON.parse(
            savedUser
          );

        if (!parsed?.id) {
          localStorage.removeItem(
            "agentUser"
          );

          localStorage.removeItem(
            "userId"
          );

          router.replace(
            "/login"
          );

          return;
        }

        setUser(parsed);

        localStorage.setItem(
          "userId",
          parsed.id
        );

        /* ------------------------------------------------------------------ */
        /* GET SUB AGENT                                                      */
        /* ------------------------------------------------------------------ */

        const subAgentResponse =
          await fetch(
            `/api/sub-agents?userId=${encodeURIComponent(
              parsed.id
            )}&subAgentId=${encodeURIComponent(
              subAgentId
            )}&activeOnly=false`,
            {
              cache:
                "no-store",
            }
          );

        let subAgentData:
          any = {};

        try {
          subAgentData =
            await subAgentResponse.json();
        } catch {
          subAgentData = {};
        }

        if (
          !subAgentResponse.ok ||
          subAgentData.success === false
        ) {
          throw new Error(
            subAgentData.message ||
              "Unable to load sub agent."
          );
        }

        let foundSubAgent:
          SubAgent | null =
          null;

        if (
          subAgentData.subAgent
        ) {
          foundSubAgent =
            subAgentData.subAgent;
        } else if (
          Array.isArray(
            subAgentData.subAgents
          )
        ) {
          foundSubAgent =
            subAgentData.subAgents.find(
              (
                item:
                  SubAgent
              ) =>
                item.id ===
                subAgentId
            ) || null;
        } else if (
          Array.isArray(
            subAgentData.data
          )
        ) {
          foundSubAgent =
            subAgentData.data.find(
              (
                item:
                  SubAgent
              ) =>
                item.id ===
                subAgentId
            ) || null;
        }

        if (
          !foundSubAgent
        ) {
          throw new Error(
            "Sub agent not found."
          );
        }

        setSubAgent(
          foundSubAgent
        );

        /* ------------------------------------------------------------------ */
        /* GET CUSTOMERS                                                      */
        /* ------------------------------------------------------------------ */

        const customerResponse =
          await fetch(
            `/api/customers?userId=${encodeURIComponent(
              parsed.id
            )}&limit=500`,
            {
              cache:
                "no-store",
            }
          );

        let customerData:
          any = {};

        try {
          customerData =
            await customerResponse.json();
        } catch {
          customerData = {};
        }

        if (
          !customerResponse.ok ||
          customerData.success ===
            false
        ) {
          throw new Error(
            customerData.message ||
              "Unable to load customers."
          );
        }

        let customerList:
          Customer[] =
          [];

        if (
          Array.isArray(
            customerData
          )
        ) {
          customerList =
            customerData;
        } else if (
          Array.isArray(
            customerData.customers
          )
        ) {
          customerList =
            customerData.customers;
        } else if (
          Array.isArray(
            customerData.data
          )
        ) {
          customerList =
            customerData.data;
        }

        const subAgentCustomers =
          customerList.filter(
            (
              customer
            ) =>
              customer.subAgentId ===
              subAgentId
          );

        setCustomers(
          subAgentCustomers
        );
      } catch (error) {
        console.error(
          "SUB AGENT DETAILS ERROR:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load sub agent."
        );
      } finally {
        setLoading(false);
      }
    }

    if (subAgentId) {
      void loadPage();
    }
  }, [
    router,
    subAgentId,
  ]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const activeCustomers =
    useMemo(
      () =>
        customers.filter(
          (
            customer
          ) =>
            customer.isActive !==
            false
        ),
      [customers]
    );

  const inactiveCustomers =
    useMemo(
      () =>
        customers.filter(
          (
            customer
          ) =>
            customer.isActive ===
            false
        ),
      [customers]
    );

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const visibleCustomers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return customers.filter(
        (
          customer
        ) => {
          if (
            statusFilter ===
              "ACTIVE" &&
            customer.isActive ===
              false
          ) {
            return false;
          }

          if (
            statusFilter ===
              "INACTIVE" &&
            customer.isActive !==
              false
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchable =
            [
              customer.customerId,
              customer.name,
              customer.phone,
              customer.email,
              customer.address,
              customer.district,
              customer.state,
              customer.pincode,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      customers,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="text-5xl">
            🤝
          </div>

          <p className="mt-3 font-bold text-slate-600">
            Loading sub agent...
          </p>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ERROR                                                                    */
  /* ------------------------------------------------------------------------ */

  if (
    message &&
    !subAgent
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">

        <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-950">
            Unable to Open Sub Agent
          </h1>

          <p className="mt-2 text-sm font-semibold text-red-600">
            {message}
          </p>

          <Link
            href="/sub-agents"
            className="mt-5 inline-block rounded-xl bg-violet-700 px-5 py-3 font-black text-white"
          >
            ← Back to Sub Agents
          </Link>

        </div>

      </main>
    );
  }

  if (!subAgent) {
    return null;
  }

  const callPhone =
    cleanPhone(
      subAgent.phone
    );

  const whatsapp =
    whatsappNumber(
      subAgent.whatsapp ||
        subAgent.phone
    );

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-violet-950 to-blue-950 text-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">

          <div>

            <p className="text-xs font-bold text-violet-200">
              Sub Agent Management
            </p>

            <h1 className="text-2xl font-black">
              Sub Agent Details
            </h1>

          </div>

          <Link
            href="/sub-agents"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black"
          >
            ← Sub Agents
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">

        {/* ------------------------------------------------------------------ */}
        {/* PROFILE                                                            */}
        {/* ------------------------------------------------------------------ */}

        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 text-white shadow-lg">

          <div className="p-5 sm:p-6">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-black">

                  {subAgent.name
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "S"}

                </div>

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="text-2xl font-black">
                      {subAgent.name}
                    </h2>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        subAgent.isActive ===
                        false
                          ? "bg-red-500/30 text-red-100"
                          : "bg-emerald-500/30 text-emerald-100"
                      }`}
                    >
                      {subAgent.isActive ===
                      false
                        ? "INACTIVE"
                        : "ACTIVE"}
                    </span>

                  </div>

                  {subAgent.code && (
                    <p className="mt-1 text-sm font-bold text-violet-100">
                      Code:{" "}
                      {subAgent.code}
                    </p>
                  )}

                  {subAgent.phone && (
                    <p className="mt-1 text-sm text-blue-100">
                      +91{" "}
                      {cleanPhone(
                        subAgent.phone
                      ).slice(-10)}
                    </p>
                  )}

                </div>

              </div>

              {/* ACTIONS */}

              <div className="flex flex-wrap gap-2">

                <Link
                  href={`/sub-agents/edit/${subAgent.id}`}
                  className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950"
                >
                  ✏️ Edit Sub-Agent
                </Link>

                {callPhone && (
                  <a
                    href={`tel:${callPhone}`}
                    className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-violet-800"
                  >
                    📞 Call
                  </a>
                )}

                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-white"
                  >
                    WhatsApp
                  </a>
                )}

              </div>

            </div>

          </div>

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* INFORMATION                                                        */}
        {/* ------------------------------------------------------------------ */}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">

          <div className="rounded-3xl border bg-white p-5 shadow-sm">

            <h2 className="font-black text-slate-950">
              Contact Details
            </h2>

            <div className="mt-4 space-y-4">

              <div>

                <p className="text-xs font-bold text-slate-500">
                  Mobile
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {subAgent.phone ||
                    "Not available"}
                </p>

              </div>

              <div>

                <p className="text-xs font-bold text-slate-500">
                  WhatsApp
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {subAgent.whatsapp ||
                    subAgent.phone ||
                    "Not available"}
                </p>

              </div>

              <div>

                <p className="text-xs font-bold text-slate-500">
                  Email
                </p>

                <p className="mt-1 break-all font-bold text-slate-900">
                  {subAgent.email ||
                    "Not available"}
                </p>

              </div>

            </div>

          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">

            <h2 className="font-black text-slate-950">
              Address Details
            </h2>

            <div className="mt-4 space-y-4">

              <div>

                <p className="text-xs font-bold text-slate-500">
                  Address
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {subAgent.address ||
                    "Not available"}
                </p>

              </div>

              <div>

                <p className="text-xs font-bold text-slate-500">
                  District / State
                </p>

                <p className="mt-1 font-bold text-slate-900">

                  {[
                    subAgent.district,
                    subAgent.state,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Not available"}

                </p>

              </div>

              <div>

                <p className="text-xs font-bold text-slate-500">
                  Pincode
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {subAgent.pincode ||
                    "Not available"}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* NOTES                                                              */}
        {/* ------------------------------------------------------------------ */}

        {subAgent.notes && (
          <div className="mt-4 rounded-3xl border bg-white p-5 shadow-sm">

            <h2 className="font-black text-slate-950">
              Notes
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
              {subAgent.notes}
            </p>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* DATES                                                              */}
        {/* ------------------------------------------------------------------ */}

        {(subAgent.createdAt ||
          subAgent.updatedAt) && (
          <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">

            <div className="flex flex-wrap gap-x-8 gap-y-2">

              {subAgent.createdAt && (
                <p className="text-xs font-semibold text-slate-500">
                  Created:{" "}
                  <strong className="text-slate-700">
                    {formatDate(
                      subAgent.createdAt
                    )}
                  </strong>
                </p>
              )}

              {subAgent.updatedAt && (
                <p className="text-xs font-semibold text-slate-500">
                  Last Updated:{" "}
                  <strong className="text-slate-700">
                    {formatDate(
                      subAgent.updatedAt
                    )}
                  </strong>
                </p>
              )}

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* CUSTOMERS                                                          */}
        {/* ------------------------------------------------------------------ */}

        <div className="mt-7">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                Customer Portfolio
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                👥 Sub Agent Customers
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Customers assigned to{" "}
                {subAgent.name}
              </p>

            </div>

            <Link
              href={`/customers/add?subAgentId=${encodeURIComponent(
                subAgent.id
              )}`}
              className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-black text-white"
            >
              + Add Customer
            </Link>

          </div>

          {/* COUNTS */}

          <div className="mt-4 grid grid-cols-3 gap-3">

            <button
              type="button"
              onClick={() =>
                setStatusFilter(
                  "ALL"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                statusFilter ===
                "ALL"
                  ? "border-blue-300 bg-blue-50"
                  : "bg-white"
              }`}
            >

              <p className="text-xs font-bold text-slate-500">
                Total
              </p>

              <p className="mt-1 text-2xl font-black text-slate-950">
                {customers.length}
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter(
                  "ACTIVE"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                statusFilter ===
                "ACTIVE"
                  ? "border-emerald-300 bg-emerald-50"
                  : "bg-white"
              }`}
            >

              <p className="text-xs font-bold text-emerald-700">
                Active
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-700">
                {activeCustomers.length}
              </p>

            </button>

            <button
              type="button"
              onClick={() =>
                setStatusFilter(
                  "INACTIVE"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm ${
                statusFilter ===
                "INACTIVE"
                  ? "border-red-300 bg-red-50"
                  : "bg-white"
              }`}
            >

              <p className="text-xs font-bold text-red-700">
                Inactive
              </p>

              <p className="mt-1 text-2xl font-black text-red-700">
                {inactiveCustomers.length}
              </p>

            </button>

          </div>

          {/* SEARCH */}

          <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search customer ID, name, mobile, email..."
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />

          </div>

          {/* LIST */}

          {visibleCustomers.length ===
          0 ? (
            <div className="mt-4 rounded-3xl border bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                👥
              </div>

              <h3 className="mt-3 font-black text-slate-950">
                No Customers Found
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                No customers are currently assigned to this sub agent.
              </p>

              <Link
                href={`/customers/add?subAgentId=${encodeURIComponent(
                  subAgent.id
                )}`}
                className="mt-5 inline-block rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
              >
                + Add First Customer
              </Link>

            </div>
          ) : (
            <div className="mt-4 space-y-3">

              {visibleCustomers.map(
                (
                  customer
                ) => {
                  const phone =
                    cleanPhone(
                      customer.phone
                    );

                  const customerWhatsapp =
                    whatsappNumber(
                      customer.phone
                    );

                  const customerActive =
                    customer.isActive !==
                    false;

                  return (
                    <article
                      key={
                        customer.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex min-w-0 items-start gap-3">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-800">

                            {customer.name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              "C"}

                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="font-black text-slate-950">
                                {customer.name}
                              </h3>

                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                  customerActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {customerActive
                                  ? "ACTIVE"
                                  : "INACTIVE"}
                              </span>

                            </div>

                            {customer.customerId && (
                              <p className="mt-1 text-xs font-black text-blue-700">
                                Customer ID:{" "}
                                {customer.customerId}
                              </p>
                            )}

                            {customer.phone && (
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                📱{" "}
                                {customer.phone}
                              </p>
                            )}

                            {customer.email && (
                              <p className="mt-1 break-all text-xs text-slate-500">
                                ✉️{" "}
                                {customer.email}
                              </p>
                            )}

                            {(customer.district ||
                              customer.state) && (
                              <p className="mt-1 text-xs text-slate-500">
                                📍{" "}
                                {[
                                  customer.district,
                                  customer.state,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            )}

                            {customer.createdAt && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                Added{" "}
                                {formatDate(
                                  customer.createdAt
                                )}
                              </p>
                            )}

                            {typeof customer
                              ._count
                              ?.policies ===
                              "number" && (
                              <p className="mt-1 text-xs font-bold text-violet-700">
                                📄 Policies:{" "}
                                {
                                  customer
                                    ._count
                                    ?.policies
                                }
                              </p>
                            )}

                          </div>

                        </div>

                        {/* CUSTOMER ACTIONS */}

                        <div className="flex flex-wrap gap-2">

                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700"
                            >
                              📞 Call
                            </a>
                          )}

                          {customerWhatsapp && (
                            <a
                              href={`https://wa.me/${customerWhatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white"
                            >
                              WhatsApp
                            </a>
                          )}

                          <Link
                            href={`/policies?customerId=${encodeURIComponent(
                              customer.id
                            )}`}
                            className="rounded-xl border border-violet-300 bg-violet-50 px-3 py-2.5 text-xs font-black text-violet-800"
                          >
                            📄 View Policies
                          </Link>

                          {customerActive && (
                            <Link
                              href={`/policies/add?customerId=${encodeURIComponent(
                                customer.id
                              )}&subAgentId=${encodeURIComponent(
                                subAgent.id
                              )}`}
                              className="rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-black text-white"
                            >
                              + Add Policy
                            </Link>
                          )}

                          <Link
                            href={`/customers/${customer.id}`}
                            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-800"
                          >
                            👁 View Customer
                          </Link>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </div>

      </section>

      {/* MOBILE NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg md:hidden">

        <div className="grid h-16 grid-cols-4">

          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span>🏠</span>
            <span className="text-xs">
              Home
            </span>
          </Link>

          <Link
            href="/customers"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span>👥</span>
            <span className="text-xs">
              Customers
            </span>
          </Link>

          <Link
            href="/sub-agents"
            className="flex flex-col items-center justify-center text-violet-700"
          >
            <span>🤝</span>
            <span className="text-xs">
              Sub Agents
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