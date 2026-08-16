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

type Customer = {
  id?: string;

  customerId?: string | null;

  name?: string | null;

  phone?: string | null;

  email?: string | null;

  sourceType?: string | null;

  subAgentId?: string | null;

  subAgent?: {
    id?: string;
    code?: string | null;
    name?: string | null;
  } | null;
};

type Enquiry = {
  id: string;

  enquiryId?: string | null;

  customerId?: string | null;

  businessType?: string | null;

  requirement?: string | null;

  remarks?: string | null;

  status?: string | null;

  enquiryDate?: string | null;

  nextFollowUpDate?: string | null;

  createdAt?: string | null;

  customer?: Customer | null;

  followUps?: unknown[];
};

type SummaryFilter =
  | "ALL"
  | "OPEN"
  | "FOLLOW_UP"
  | "CONVERTED";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(
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

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

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

  if (direct?.trim()) {
    return direct.trim();
  }

  const storedKeys = [
    "agentUser",
    "user",
  ];

  for (
    const key of storedKeys
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
        JSON.parse(stored);

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

function cleanPhoneNumber(
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
    digits.length === 12
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

function normalizeStatus(
  status?: string | null
) {
  return String(
    status || "NEW"
  )
    .trim()
    .toUpperCase();
}

function getStatusLabel(
  status?: string | null
) {
  const value =
    normalizeStatus(
      status
    );

  switch (value) {
    case "NEW":
      return "New";

    case "OPEN":
      return "Open";

    case "FOLLOW_UP":
    case "FOLLOWUP":
      return "Follow-up";

    case "PENDING":
      return "Pending";

    case "CONVERTED":
      return "Converted";

    case "LOST":
      return "Lost";

    case "CLOSED":
      return "Closed";

    case "CANCELLED":
      return "Cancelled";

    default:
      return value
        .replace(
          /_/g,
          " "
        )
        .toLowerCase()
        .replace(
          /\b\w/g,
          (
            letter
          ) =>
            letter.toUpperCase()
        );
  }
}

function getStatusStyle(
  status?: string | null
) {
  const value =
    normalizeStatus(
      status
    );

  if (
    value ===
      "CONVERTED" ||
    value ===
      "COMPLETED"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    value ===
      "FOLLOW_UP" ||
    value ===
      "FOLLOWUP" ||
    value ===
      "PENDING"
  ) {
    return "bg-orange-100 text-orange-800";
  }

  if (
    value ===
      "LOST" ||
    value ===
      "CANCELLED" ||
    value ===
      "CLOSED"
  ) {
    return "bg-red-100 text-red-800";
  }

  return "bg-blue-100 text-blue-800";
}

function getCustomerSource(
  customer?: Customer | null
) {
  if (!customer) {
    return "";
  }

  const isSubAgent =
    String(
      customer.sourceType ||
        ""
    ).toUpperCase() ===
      "SUB_AGENT" ||
    Boolean(
      customer.subAgentId
    ) ||
    Boolean(
      customer.subAgent?.id
    );

  if (!isSubAgent) {
    return "Self / Direct";
  }

  const name =
    customer.subAgent
      ?.name?.trim();

  const code =
    customer.subAgent
      ?.code?.trim();

  if (
    name &&
    code
  ) {
    return `Sub-Agent - ${name} (${code})`;
  }

  if (name) {
    return `Sub-Agent - ${name}`;
  }

  if (code) {
    return `Sub-Agent - ${code}`;
  }

  return "Sub-Agent";
}

function matchesSummaryFilter(
  enquiry: Enquiry,
  filter: SummaryFilter
) {
  if (
    filter ===
    "ALL"
  ) {
    return true;
  }

  const status =
    normalizeStatus(
      enquiry.status
    );

  if (
    filter ===
    "OPEN"
  ) {
    return (
      status === "NEW" ||
      status === "OPEN"
    );
  }

  if (
    filter ===
    "FOLLOW_UP"
  ) {
    return (
      status ===
        "FOLLOW_UP" ||
      status ===
        "FOLLOWUP" ||
      status ===
        "PENDING"
    );
  }

  if (
    filter ===
    "CONVERTED"
  ) {
    return (
      status ===
      "CONVERTED"
    );
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function EnquiriesPage() {
  const [
    enquiries,
    setEnquiries,
  ] =
    useState<
      Enquiry[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    summaryFilter,
    setSummaryFilter,
  ] =
    useState<SummaryFilter>(
      "ALL"
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void loadEnquiries();
  }, []);

  async function loadEnquiries() {
    try {
      setLoading(true);

      setError("");

      const userId =
        getLoggedInUserId();

      if (!userId) {
        setEnquiries([]);

        setError(
          "Logged-in user information was not found. Please login again."
        );

        return;
      }

      const response =
        await fetch(
          `/api/enquiries?userId=${encodeURIComponent(
            userId
          )}`,
          {
            cache:
              "no-store",
          }
        );

      let data: any =
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
            "Unable to load enquiries."
        );
      }

      const list =
        Array.isArray(
          data
        )
          ? data
          : Array.isArray(
              data.enquiries
            )
            ? data.enquiries
            : Array.isArray(
                data.data
              )
              ? data.data
              : [];

      setEnquiries(
        list
      );
    } catch (
      err
    ) {
      console.error(
        "LOAD ENQUIRIES ERROR:",
        err
      );

      setEnquiries([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load enquiries."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const openCount =
    useMemo(
      () =>
        enquiries.filter(
          (
            enquiry
          ) => {
            const status =
              normalizeStatus(
                enquiry.status
              );

            return (
              status ===
                "NEW" ||
              status ===
                "OPEN"
            );
          }
        ).length,
      [
        enquiries,
      ]
    );

  const followUpCount =
    useMemo(
      () =>
        enquiries.filter(
          (
            enquiry
          ) => {
            const status =
              normalizeStatus(
                enquiry.status
              );

            return (
              status ===
                "FOLLOW_UP" ||
              status ===
                "FOLLOWUP" ||
              status ===
                "PENDING"
            );
          }
        ).length,
      [
        enquiries,
      ]
    );

  const convertedCount =
    useMemo(
      () =>
        enquiries.filter(
          (
            enquiry
          ) =>
            normalizeStatus(
              enquiry.status
            ) ===
            "CONVERTED"
        ).length,
      [
        enquiries,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* FILTER + SEARCH                                                          */
  /* ------------------------------------------------------------------------ */

  const filteredEnquiries =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return enquiries.filter(
        (
          enquiry
        ) => {
          /* SUMMARY FILTER */

          if (
            !matchesSummaryFilter(
              enquiry,
              summaryFilter
            )
          ) {
            return false;
          }

          /* SEARCH */

          if (!query) {
            return true;
          }

          const customer =
            enquiry.customer;

          const values = [
            enquiry.enquiryId,
            enquiry.id,
            customer
              ?.customerId,
            customer?.name,
            customer?.phone,
            customer?.email,
            enquiry.businessType,
            enquiry.requirement,
            enquiry.remarks,
            enquiry.status,
            getCustomerSource(
              customer
            ),
            customer
              ?.subAgent
              ?.name,
            customer
              ?.subAgent
              ?.code,
          ];

          return values.some(
            (
              value
            ) =>
              String(
                value || ""
              )
                .toLowerCase()
                .includes(
                  query
                )
          );
        }
      );
    }, [
      enquiries,
      search,
      summaryFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* FILTER LABEL                                                             */
  /* ------------------------------------------------------------------------ */

  const currentFilterLabel =
    summaryFilter ===
    "ALL"
      ? "All Enquiries"
      : summaryFilter ===
          "OPEN"
        ? "Open / New"
        : summaryFilter ===
            "FOLLOW_UP"
          ? "Follow-up"
          : "Converted";

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">

      <div className="mx-auto max-w-6xl">

        {/* DASHBOARD */}

        <div className="mb-4">

          <Link
            href="/dashboard"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
          >
            ← Dashboard
          </Link>

        </div>

        {/* HEADER */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Sales Management
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Enquiries
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Manage customer enquiries, digital leads and follow-ups
            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/enquiries/import"
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
            >
              📊 Import Excel
            </Link>

            <Link
              href="/enquiries/add"
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white shadow-sm"
            >
              + New Enquiry
            </Link>

          </div>

        </div>

        {/* SUMMARY */}

        {!loading && (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">

            {/* TOTAL */}

            <button
              type="button"
              onClick={() =>
                setSummaryFilter(
                  "ALL"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                summaryFilter ===
                "ALL"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-blue-300"
              }`}
            >

              <div className="text-xl">
                📥
              </div>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Total Enquiries
              </p>

              <p className="mt-1 text-2xl font-black text-blue-700">
                {
                  enquiries.length
                }
              </p>

            </button>

            {/* OPEN */}

            <button
              type="button"
              onClick={() =>
                setSummaryFilter(
                  "OPEN"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                summaryFilter ===
                "OPEN"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-blue-300"
              }`}
            >

              <div className="text-xl">
                🆕
              </div>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Open / New
              </p>

              <p className="mt-1 text-2xl font-black text-blue-700">
                {
                  openCount
                }
              </p>

            </button>

            {/* FOLLOW-UP */}

            <button
              type="button"
              onClick={() =>
                setSummaryFilter(
                  "FOLLOW_UP"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                summaryFilter ===
                "FOLLOW_UP"
                  ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100"
                  : "border-slate-200 bg-white hover:border-orange-300"
              }`}
            >

              <div className="text-xl">
                📞
              </div>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Follow-up
              </p>

              <p className="mt-1 text-2xl font-black text-orange-700">
                {
                  followUpCount
                }
              </p>

            </button>

            {/* CONVERTED */}

            <button
              type="button"
              onClick={() =>
                setSummaryFilter(
                  "CONVERTED"
                )
              }
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                summaryFilter ===
                "CONVERTED"
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >

              <div className="text-xl">
                ✅
              </div>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Converted
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-700">
                {
                  convertedCount
                }
              </p>

            </button>

          </div>
        )}

        {/* IMPORT NOTICE */}

        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-black text-emerald-950">
                📊 Digital Marketing Lead Import
              </p>

              <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                Upload Excel leads. Existing customers are matched by mobile number and new customers are created automatically.
              </p>

            </div>

            <Link
              href="/enquiries/import"
              className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-center text-xs font-black text-white"
            >
              Open Import
            </Link>

          </div>

        </div>

        {/* SEARCH */}

        <div className="mb-4 rounded-2xl border bg-white p-3 shadow-sm">

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
            placeholder="Search customer name, mobile, ID, business type, Sub-Agent..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />

          {!loading && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">

              <p className="text-slate-500">
                View:{" "}
                <span className="text-slate-900">
                  {
                    currentFilterLabel
                  }
                </span>
              </p>

              <p className="text-slate-500">
                Showing{" "}
                <span className="text-blue-700">
                  {
                    filteredEnquiries.length
                  }
                </span>{" "}
                enquiry
                {filteredEnquiries.length ===
                1
                  ? ""
                  : "ies"}
              </p>

            </div>
          )}

        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-bold text-red-800">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadEnquiries()
              }
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-black text-white"
            >
              Try Again
            </button>

          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

            <div className="text-5xl">
              ⏳
            </div>

            <p className="mt-3 font-bold text-slate-600">
              Loading enquiries...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredEnquiries.length ===
            0 && (
            <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">

              <div className="text-4xl">
                📥
              </div>

              <h2 className="mt-3 text-lg font-black">
                No Enquiries Found
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                No enquiries found in{" "}
                {
                  currentFilterLabel
                }.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">

                {summaryFilter !==
                  "ALL" && (
                  <button
                    type="button"
                    onClick={() =>
                      setSummaryFilter(
                        "ALL"
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-800"
                  >
                    Show All
                  </button>
                )}

                <Link
                  href="/enquiries/add"
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"
                >
                  + New Enquiry
                </Link>

                <Link
                  href="/enquiries/import"
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white"
                >
                  📊 Import Excel
                </Link>

              </div>

            </div>
          )}

        {/* LIST */}

        {!loading &&
          filteredEnquiries.length >
            0 && (
            <div className="space-y-2.5">

              {filteredEnquiries.map(
                (
                  enquiry
                ) => {
                  const customer =
                    enquiry.customer;

                  const customerName =
                    customer?.name ||
                    "Customer";

                  const phone =
                    customer?.phone ||
                    "";

                  const whatsapp =
                    cleanPhoneNumber(
                      phone
                    );

                  const source =
                    getCustomerSource(
                      customer
                    );

                  return (
                    <article
                      key={
                        enquiry.id
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >

                      {/* TOP */}

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            {customer
                              ?.customerId && (
                              <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                                {
                                  customer.customerId
                                }
                              </span>
                            )}

                            {enquiry.businessType && (
                              <span className="rounded-md bg-violet-50 px-2 py-1 text-[11px] font-black text-violet-700">
                                🛡️{" "}
                                {
                                  enquiry.businessType
                                }
                              </span>
                            )}

                          </div>

                          <h2 className="mt-1.5 text-lg font-black leading-tight">
                            {
                              customerName
                            }
                          </h2>

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">

                            {phone && (
                              <span className="font-bold text-slate-700">
                                📱{" "}
                                {phone}
                              </span>
                            )}

                            {customer
                              ?.email && (
                              <span className="break-all font-semibold text-slate-600">
                                ✉️{" "}
                                {
                                  customer.email
                                }
                              </span>
                            )}

                          </div>

                          {source && (
                            <div
                              className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${
                                source.startsWith(
                                  "Sub-Agent"
                                )
                                  ? "bg-violet-100 text-violet-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {source.startsWith(
                                "Sub-Agent"
                              )
                                ? "🤝"
                                : "👤"}{" "}
                              {
                                source
                              }
                            </div>
                          )}

                        </div>

                        <span
                          className={`shrink-0 self-start rounded-lg px-2.5 py-1.5 text-xs font-black ${getStatusStyle(
                            enquiry.status
                          )}`}
                        >
                          {getStatusLabel(
                            enquiry.status
                          )}
                        </span>

                      </div>

                      {/* REQUIREMENT */}

                      {enquiry.requirement && (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">

                          <p className="text-xs font-bold text-slate-500">
                            Requirement
                          </p>

                          <p className="mt-0.5 text-sm font-semibold leading-5 text-slate-800">
                            {
                              enquiry.requirement
                            }
                          </p>

                        </div>
                      )}

                      {/* DATES */}

                      <div className="mt-2 grid grid-cols-2 gap-2">

                        <div className="rounded-lg bg-slate-50 px-3 py-2">

                          <p className="text-[11px] font-bold text-slate-500">
                            Enquiry Date
                          </p>

                          <p className="mt-0.5 text-sm font-black">
                            {formatDate(
                              enquiry.enquiryDate
                            ) ||
                              "-"}
                          </p>

                        </div>

                        <div className="rounded-lg bg-orange-50 px-3 py-2">

                          <p className="text-[11px] font-bold text-orange-700">
                            Next Follow-up
                          </p>

                          <p className="mt-0.5 text-sm font-black text-orange-900">
                            {formatDate(
                              enquiry.nextFollowUpDate
                            ) ||
                              "Not Scheduled"}
                          </p>

                        </div>

                      </div>

                      {/* REMARKS */}

                      {enquiry.remarks && (
                        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">

                          <p className="text-[11px] font-bold text-slate-500">
                            Remarks
                          </p>

                          <p className="mt-0.5 text-sm font-semibold leading-5 text-slate-800">
                            {
                              enquiry.remarks
                            }
                          </p>

                        </div>
                      )}

                      {/* ACTIONS */}

                      <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"
                          >
                            📞 Call
                          </a>
                        )}

                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                          >
                            WhatsApp
                          </a>
                        )}

                        {customer?.id && (
                          <Link
                            href={`/customers/${customer.id}`}
                            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800"
                          >
                            👤 Customer
                          </Link>
                        )}

                        <Link
                          href={`/enquiries/${enquiry.id}`}
                          className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                        >
                          👁 View / Follow-up
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