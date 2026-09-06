"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Customer = {
  id?: string;
  customerId?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
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
  updatedAt?: string | null;
  customer?: Customer | null;
};

type LeadType =
  | "CUSTOMER"
  | "SUB_AGENT";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
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

function normalizeStatus(
  status?: string | null
) {
  return String(
    status ||
      "NEW"
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
    "CONVERTED"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (
    value ===
      "FOLLOW_UP" ||
    value ===
      "FOLLOWUP" ||
    value ===
      "PENDING"
  ) {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  if (
    value ===
      "LOST" ||
    value ===
      "CLOSED" ||
    value ===
      "CANCELLED"
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function getLeadType(
  enquiry: Enquiry
): LeadType {
  const marker =
    `${enquiry.remarks || ""} ${enquiry.requirement || ""}`.toUpperCase();

  return (
    marker.includes(
      "SUB_AGENT"
    ) ||
    marker.includes(
      "SUB-AGENT"
    )
  )
    ? "SUB_AGENT"
    : "CUSTOMER";
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(
      value
    );

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

function cleanPhoneNumber(
  value?: string | null
) {
  const digits =
    String(
      value || ""
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
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function EnquiryDetailsPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id: string;
    }>();

  const enquiryId =
    String(
      params?.id ||
        ""
    ).trim();

  const [
    enquiry,
    setEnquiry,
  ] =
    useState<Enquiry | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  useEffect(() => {
    if (
      !enquiryId
    ) {
      setError(
        "Enquiry ID is missing."
      );

      setLoading(
        false
      );

      return;
    }

    void loadEnquiry();
  }, [
    enquiryId,
  ]);

  async function loadEnquiry() {
    try {
      setLoading(
        true
      );

      setError(
        ""
      );

      const userId =
        getLoggedInUserId();

      if (
        !userId
      ) {
        throw new Error(
          "Logged-in user information was not found. Please login again."
        );
      }

      const response =
        await fetch(
          `/api/enquiries?userId=${encodeURIComponent(
            userId
          )}`,
          {
            cache:
              "no-store",

            credentials:
              "include",
          }
        );

      let data:
        any = {};

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
            "Unable to load enquiry."
        );
      }

      const list:
        Enquiry[] =
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

      const found =
        list.find(
          (
            item
          ) =>
            item.id ===
            enquiryId
        ) ||
        null;

      if (
        !found
      ) {
        throw new Error(
          "Enquiry not found."
        );
      }

      setEnquiry(
        found
      );
    } catch (
      err
    ) {
      console.error(
        "LOAD ENQUIRY ERROR:",
        err
      );

      setEnquiry(
        null
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load enquiry."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  const leadType =
    useMemo(
      () =>
        enquiry
          ? getLeadType(
              enquiry
            )
          : "CUSTOMER",
      [
        enquiry,
      ]
    );

  const phone =
    enquiry?.customer?.phone ||
    "";

  const whatsapp =
    cleanPhoneNumber(
      phone
    );

  const customerId =
    enquiry?.customer?.id ||
    enquiry?.customerId ||
    "";

  const status =
    normalizeStatus(
      enquiry?.status
    );

  const canAddFollowUp =
    ![
      "CONVERTED",
      "LOST",
      "CLOSED",
      "CANCELLED",
    ].includes(
      status
    );

  const addFollowUpHref =
    enquiry
      ? `/follow-ups/add?enquiryId=${encodeURIComponent(
          enquiry.id
        )}&customerId=${encodeURIComponent(
          customerId
        )}&name=${encodeURIComponent(
          enquiry.customer?.name ||
            ""
        )}&phone=${encodeURIComponent(
          phone
        )}&businessType=${encodeURIComponent(
          enquiry.businessType ||
            ""
        )}`
      : "#";

  const convertSubAgentHref =
    enquiry
      ? `/sub-agents/add?name=${encodeURIComponent(
          enquiry.customer?.name ||
            ""
        )}&phone=${encodeURIComponent(
          phone
        )}&businessType=${encodeURIComponent(
          enquiry.businessType ||
            ""
        )}&enquiryId=${encodeURIComponent(
          enquiry.id
        )}`
      : "#";

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">

      <div className="mx-auto max-w-3xl">

        <div className="mb-5 flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              router.push(
                "/enquiries"
              )
            }
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"
          >
            ← Enquiries
          </button>

          <Link
            href="/follow-ups"
            className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-800"
          >
            📞 Follow-ups
          </Link>

        </div>

        {loading && (
          <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">

            <div className="text-4xl">
              ⏳
            </div>

            <p className="mt-3 font-bold text-slate-600">
              Loading enquiry...
            </p>

          </div>
        )}

        {!loading &&
          error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

              <p className="font-black text-red-800">
                ⚠️ {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadEnquiry()
                }
                className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white"
              >
                Try Again
              </button>

            </div>
          )}

        {!loading &&
          !error &&
          enquiry && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>

                    <p className="text-xs font-black uppercase tracking-wider text-blue-100">
                      Enquiry Details
                    </p>

                    <h1 className="mt-1 text-3xl font-black">
                      {enquiry.customer?.name ||
                        "Lead"}
                    </h1>

                    {phone && (
                      <p className="mt-2 font-bold text-blue-100">
                        📱 {phone}
                      </p>
                    )}

                  </div>

                  <div
                    className={`rounded-xl border px-3 py-2 text-sm font-black ${getStatusStyle(
                      enquiry.status
                    )}`}
                  >
                    {getStatusLabel(
                      enquiry.status
                    )}
                  </div>

                </div>

              </div>

              <div className="space-y-5 p-5 sm:p-7">

                <div className="flex flex-wrap gap-2">

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
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

                  {enquiry.businessType && (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                      🛡️{" "}
                      {
                        enquiry.businessType
                      }
                    </span>
                  )}

                  {enquiry.enquiryId && (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                      {
                        enquiry.enquiryId
                      }
                    </span>
                  )}

                </div>

                <div className="grid gap-3 sm:grid-cols-2">

                  <InfoCard
                    label="Enquiry Date"
                    value={
                      formatDate(
                        enquiry.enquiryDate
                      )
                    }
                  />

                  <InfoCard
                    label="Next Follow-up"
                    value={
                      formatDate(
                        enquiry.nextFollowUpDate
                      )
                    }
                    accent
                  />

                </div>

                {enquiry.customer?.customerId && (
                  <InfoBlock
                    label="Customer ID"
                    value={
                      enquiry.customer.customerId
                    }
                  />
                )}

                {enquiry.customer?.email && (
                  <InfoBlock
                    label="Email"
                    value={
                      enquiry.customer.email
                    }
                  />
                )}

                {enquiry.requirement &&
                  !enquiry.requirement
                    .toUpperCase()
                    .includes(
                      "SUB-AGENT LEAD"
                    ) && (
                    <InfoBlock
                      label="Requirement"
                      value={
                        enquiry.requirement
                      }
                    />
                  )}

                {enquiry.remarks && (
                  <InfoBlock
                    label="Remarks / Lead Information"
                    value={
                      enquiry.remarks
                    }
                    preserveLines
                  />
                )}

                <div className="border-t border-slate-100 pt-5">

                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
                    Actions
                  </p>

                  <div className="flex flex-wrap gap-2">

                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
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

                    <Link
                      href={`/enquiries/${enquiry.id}/edit`}
                      className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800"
                    >
                      ✏️ Edit Enquiry
                    </Link>

                    {canAddFollowUp &&
                      customerId && (
                        <Link
                          href={
                            addFollowUpHref
                          }
                          className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white"
                        >
                          📅 + Add Follow-up
                        </Link>
                      )}

                    {leadType ===
                      "SUB_AGENT" &&
                      status !==
                        "CONVERTED" && (
                        <Link
                          href={
                            convertSubAgentHref
                          }
                          className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-black text-white"
                        >
                          🤝 Create Sub Agent
                        </Link>
                      )}

                  </div>

                  {status ===
                    "CONVERTED" && (
                    <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                      ✅ This enquiry is converted. You can still use Edit Enquiry to correct details. Editing does not automatically reopen the enquiry.
                    </p>
                  )}

                </div>

              </div>

            </div>
          )}

      </div>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function InfoCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-orange-200 bg-orange-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >

      <p
        className={`text-xs font-bold ${
          accent
            ? "text-orange-700"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 font-black ${
          accent
            ? "text-orange-900"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function InfoBlock({
  label,
  value,
  preserveLines = false,
}: {
  label: string;
  value: string;
  preserveLines?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-semibold leading-6 text-slate-800 ${
          preserveLines
            ? "whitespace-pre-wrap"
            : ""
        }`}
      >
        {value}
      </p>

    </div>
  );
}