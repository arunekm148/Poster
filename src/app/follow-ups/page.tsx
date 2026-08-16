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

  lostReason?: string | null;
  cancellationReason?: string | null;

  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  customer?: {
    id: string;
    customerId?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  enquiry?: {
    id: string;
    businessType?: string | null;
    requirement?: string | null;
    remarks?: string | null;
    status?: string | null;
    enquiryDate?: string | null;
    nextFollowUpDate?: string | null;
  } | null;
};

type Outcome =
  | "CONTINUE"
  | "BUSINESS_CLOSED"
  | "CASE_LOST"
  | "CANCELLED";

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
/* -------------------------------------------------------------------------- */

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

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

function toDateInputValue(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getUTCDate()
    ).padStart(2, "0"),
  ].join("-");
}

/* -------------------------------------------------------------------------- */
/* LOGGED-IN USER                                                             */
/* -------------------------------------------------------------------------- */

function getLoggedInUserId(): string {
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

  const stored =
    localStorage.getItem(
      "agentUser"
    );

  if (!stored) {
    return "";
  }

  try {
    const user =
      JSON.parse(stored);

    if (
      user?.id ||
      user?.userId
    ) {
      const id =
        String(
          user.id ||
            user.userId
        ).trim();

      localStorage.setItem(
        "userId",
        id
      );

      return id;
    }
  } catch (error) {
    console.error(
      "USER STORAGE ERROR:",
      error
    );
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* PHONE                                                                      */
/* -------------------------------------------------------------------------- */

function cleanPhone(
  phone?: string | null
) {
  if (!phone) {
    return "";
  }

  const digits =
    phone.replace(
      /\D/g,
      ""
    );

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

/* -------------------------------------------------------------------------- */
/* STATUS                                                                     */
/* -------------------------------------------------------------------------- */

function getStatusStyle(
  status?: string
) {
  switch (status) {
    case "PENDING":
      return "bg-orange-50 text-orange-700";

    case "COMPLETED":
      return "bg-green-50 text-green-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusName(
  status?: string
) {
  switch (status) {
    case "PENDING":
      return "Pending";

    case "COMPLETED":
      return "Completed";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status || "-";
  }
}

/* -------------------------------------------------------------------------- */
/* OUTCOME                                                                    */
/* -------------------------------------------------------------------------- */

function getOutcomeName(
  outcome?: string
) {
  switch (outcome) {
    case "CONTINUE":
      return "Continue Follow-up";

    case "BUSINESS_CLOSED":
      return "Business Closed / Converted";

    case "CASE_LOST":
      return "Case Lost";

    case "CANCELLED":
      return "Cancelled";

    default:
      return "";
  }
}

function getOutcomeStyle(
  outcome?: string
) {
  switch (outcome) {
    case "BUSINESS_CLOSED":
      return "bg-green-50 text-green-700";

    case "CASE_LOST":
      return "bg-red-50 text-red-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-blue-50 text-blue-700";
  }
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function FollowUpsPage() {
  const router =
    useRouter();

  const [
    followUps,
    setFollowUps,
  ] =
    useState<FollowUp[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    userId,
    setUserId,
  ] = useState("");

  /* ------------------------------------------------------------------------ */
  /* ACTION MODAL                                                             */
  /* ------------------------------------------------------------------------ */

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

  const [
    actionComment,
    setActionComment,
  ] = useState("");

  const [
    actionFollowUpDate,
    setActionFollowUpDate,
  ] = useState("");

  const [
    actionNextDate,
    setActionNextDate,
  ] = useState("");

  const [
    lostReason,
    setLostReason,
  ] = useState("");

  const [
    cancellationReason,
    setCancellationReason,
  ] = useState("");

  const [
    savingAction,
    setSavingAction,
  ] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  const loadFollowUps =
    useCallback(
      async (
        currentUserId: string
      ) => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `/api/follow-ups?userId=${encodeURIComponent(
                currentUserId
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            data.success ===
              false
          ) {
            setFollowUps(
              []
            );

            setError(
              data.message ||
                "Unable to load follow-ups."
            );

            return;
          }

          setFollowUps(
            Array.isArray(
              data.followUps
            )
              ? data.followUps
              : []
          );
        } catch (error) {
          console.error(
            "LOAD FOLLOW UPS ERROR:",
            error
          );

          setFollowUps(
            []
          );

          setError(
            "Unable to load follow-ups."
          );
        } finally {
          setLoading(
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

    loadFollowUps(id);
  }, [loadFollowUps]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const pendingCount =
    useMemo(() => {
      return followUps.filter(
        (item) =>
          item.status ===
          "PENDING"
      ).length;
    }, [followUps]);

  const completedCount =
    useMemo(() => {
      return followUps.filter(
        (item) =>
          item.status ===
          "COMPLETED"
      ).length;
    }, [followUps]);

  const cancelledCount =
    useMemo(() => {
      return followUps.filter(
        (item) =>
          item.status ===
          "CANCELLED"
      ).length;
    }, [followUps]);

  /* ------------------------------------------------------------------------ */
  /* SEARCH                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredFollowUps =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return followUps;
      }

      return followUps.filter(
        (item) => {
          const name =
            item.customer
              ?.name || "";

          const phone =
            item.customer
              ?.phone || "";

          const customerCode =
            item.customer
              ?.customerId ||
            "";

          const businessType =
            item.enquiry
              ?.businessType ||
            "";

          const requirement =
            item.enquiry
              ?.requirement ||
            "";

          const outcomeName =
            getOutcomeName(
              item.outcome
            );

          return (
            name
              .toLowerCase()
              .includes(value) ||
            phone
              .toLowerCase()
              .includes(value) ||
            customerCode
              .toLowerCase()
              .includes(value) ||
            businessType
              .toLowerCase()
              .includes(value) ||
            requirement
              .toLowerCase()
              .includes(value) ||
            item.comment
              .toLowerCase()
              .includes(value) ||
            item.status
              .toLowerCase()
              .includes(value) ||
            outcomeName
              .toLowerCase()
              .includes(value)
          );
        }
      );
    }, [
      followUps,
      search,
    ]);

  /* ------------------------------------------------------------------------ */
  /* OPEN ACTION                                                              */
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

    setActionComment(
      item.comment || ""
    );

    setActionFollowUpDate(
      toDateInputValue(
        item.followUpDate
      )
    );

    setActionNextDate(
      outcome ===
        "CONTINUE"
        ? toDateInputValue(
            item.nextFollowUpDate
          )
        : ""
    );

    setLostReason("");
    setCancellationReason("");

    setError("");
    setSuccess("");
  }

  /* ------------------------------------------------------------------------ */
  /* CLOSE ACTION                                                             */
  /* ------------------------------------------------------------------------ */

  function closeAction() {
    if (savingAction) {
      return;
    }

    setSelectedFollowUp(
      null
    );

    setSelectedOutcome(
      null
    );

    setActionComment("");
    setActionFollowUpDate("");
    setActionNextDate("");
    setLostReason("");
    setCancellationReason("");
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE ACTION                                                              */
  /* ------------------------------------------------------------------------ */

  async function saveAction() {
    if (
      !selectedFollowUp ||
      !selectedOutcome
    ) {
      return;
    }

    if (!userId) {
      setError(
        "Logged-in user information was not found."
      );

      return;
    }

    const comment =
      actionComment.trim();

    if (!comment) {
      setError(
        "Please enter follow-up remarks."
      );

      return;
    }

    if (
      selectedOutcome ===
        "CONTINUE" &&
      !actionNextDate
    ) {
      setError(
        "Please select the next follow-up date."
      );

      return;
    }

    if (
      selectedOutcome ===
        "CASE_LOST" &&
      !lostReason.trim()
    ) {
      setError(
        "Please enter the lost reason."
      );

      return;
    }

    if (
      selectedOutcome ===
        "CANCELLED" &&
      !cancellationReason.trim()
    ) {
      setError(
        "Please enter the cancellation reason."
      );

      return;
    }

    /*
     * IMPORTANT:
     * Save these values BEFORE closing the modal.
     *
     * After the API successfully marks the enquiry
     * as Business Closed, we use this customer ID
     * to open the Add Policy page.
     */

    const convertedCustomerId =
      selectedFollowUp.customer?.id ||
      selectedFollowUp.customerId;

    const wasBusinessClosed =
      selectedOutcome ===
      "BUSINESS_CLOSED";

    try {
      setSavingAction(true);

      setError("");
      setSuccess("");

      const payload: {
        id: string;
        userId: string;
        outcome: Outcome;
        comment: string;
        followUpDate?: string;
        nextFollowUpDate?: string;
        lostReason?: string;
        cancellationReason?: string;
      } = {
        id:
          selectedFollowUp.id,

        userId,

        outcome:
          selectedOutcome,

        comment,
      };

      if (
        actionFollowUpDate
      ) {
        payload.followUpDate =
          actionFollowUpDate;
      }

      if (
        selectedOutcome ===
        "CONTINUE"
      ) {
        payload.nextFollowUpDate =
          actionNextDate;
      }

      if (
        selectedOutcome ===
        "CASE_LOST"
      ) {
        payload.lostReason =
          lostReason.trim();
      }

      if (
        selectedOutcome ===
        "CANCELLED"
      ) {
        payload.cancellationReason =
          cancellationReason.trim();
      }

      const response =
        await fetch(
          "/api/follow-ups",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

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

      /*
       * BUSINESS CLOSED / CONVERTED
       *
       * Follow-up is already saved by API.
       * Now open Add Policy page for the
       * same customer automatically.
       */

      if (
        wasBusinessClosed &&
        convertedCustomerId
      ) {
        setSuccess(
          "Business converted successfully. Opening policy entry..."
        );

        setSelectedFollowUp(
          null
        );

        setSelectedOutcome(
          null
        );

        router.push(
          `/policies/add?customerId=${encodeURIComponent(
            convertedCustomerId
          )}`
        );

        return;
      }

      /*
       * NORMAL FOLLOW-UP ACTIONS
       */

      setSuccess(
        data.message ||
          "Follow-up updated successfully."
      );

      setSelectedFollowUp(
        null
      );

      setSelectedOutcome(
        null
      );

      setActionComment("");
      setActionFollowUpDate("");
      setActionNextDate("");
      setLostReason("");
      setCancellationReason("");

      await loadFollowUps(
        userId
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    } catch (error) {
      console.error(
        "UPDATE FOLLOW UP ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update follow-up."
      );
    } finally {
      setSavingAction(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="mx-auto max-w-6xl">

        {/* TOP */}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

          <Link
            href="/dashboard"
            className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            ← Dashboard
          </Link>

          <Link
            href="/enquiries"
            className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Enquiries
          </Link>

        </div>

        {/* HEADER */}

        <div className="mb-4">

          <h1 className="text-2xl font-bold text-gray-900">
            Follow-ups
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Customer follow-up reminders and status
          </p>

        </div>

        {/* SUCCESS */}

        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
            ✅ {success}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* SUMMARY */}

        {!loading && (
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">

            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">

              <p className="text-xs font-medium text-gray-500">
                📞 Total
              </p>

              <p className="mt-1 text-xl font-bold text-blue-700">
                {followUps.length}
              </p>

            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">

              <p className="text-xs font-medium text-gray-500">
                ⏳ Pending
              </p>

              <p className="mt-1 text-xl font-bold text-orange-600">
                {pendingCount}
              </p>

            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">

              <p className="text-xs font-medium text-gray-500">
                ✅ Completed
              </p>

              <p className="mt-1 text-xl font-bold text-green-600">
                {completedCount}
              </p>

            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">

              <p className="text-xs font-medium text-gray-500">
                ❌ Cancelled
              </p>

              <p className="mt-1 text-xl font-bold text-red-600">
                {cancelledCount}
              </p>

            </div>

          </div>
        )}

        {/* SEARCH */}

        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">

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
            placeholder="Search customer, mobile, business, remarks or status..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />

        </div>

        {/* LOADING */}

        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">

            <div className="mb-2 text-3xl">
              ⏳
            </div>

            <p className="text-sm text-gray-600">
              Loading follow-ups...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          filteredFollowUps.length ===
            0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">

              <div className="mb-2 text-4xl">
                📞
              </div>

              <h2 className="font-bold text-gray-900">
                No Follow-ups Found
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Follow-ups created from enquiries will appear here.
              </p>

            </div>
          )}

        {/* FOLLOW-UP LIST */}

        {!loading &&
          filteredFollowUps.length >
            0 && (
            <div className="space-y-3">

              {filteredFollowUps.map(
                (item) => {
                  const phone =
                    item.customer
                      ?.phone || "";

                  const whatsapp =
                    cleanPhone(
                      phone
                    );

                  const businessType =
                    item.enquiry
                      ?.businessType ||
                    "-";

                  const requirement =
                    item.enquiry
                      ?.requirement ||
                    "-";

                  const outcomeName =
                    getOutcomeName(
                      item.outcome
                    );

                  const isPending =
                    item.status ===
                    "PENDING";

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                    >

                      {/* FIRST ROW */}

                      <div className="flex flex-wrap items-start justify-between gap-2">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h2 className="font-bold text-gray-900">
                              {item
                                .customer
                                ?.name ||
                                "Customer"}
                            </h2>

                            {item
                              .customer
                              ?.customerId && (
                              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {
                                  item
                                    .customer
                                    .customerId
                                }
                              </span>
                            )}

                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">

                            {phone && (
                              <span>
                                📱{" "}
                                {phone}
                              </span>
                            )}

                            <span>
                              🛡️{" "}
                              {businessType}
                            </span>

                            <span>
                              Requirement:{" "}
                              {requirement}
                            </span>

                          </div>

                        </div>

                        <span
                          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${getStatusStyle(
                            item.status
                          )}`}
                        >
                          {getStatusName(
                            item.status
                          )}
                        </span>

                      </div>

                      {/* DATES */}

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-3 text-sm">

                        <span className="font-medium text-blue-700">
                          📅{" "}
                          {formatDate(
                            item.followUpDate
                          )}
                        </span>

                        {item.nextFollowUpDate && (
                          <span className="font-medium text-orange-700">
                            Next:{" "}
                            {formatDate(
                              item.nextFollowUpDate
                            )}
                          </span>
                        )}

                      </div>

                      {/* REMARK */}

                      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">

                        <p className="text-sm text-gray-700">

                          <span className="font-semibold">
                            Remarks:
                          </span>{" "}

                          {item.comment}

                        </p>

                      </div>

                      {/* OUTCOME */}

                      {item.outcome &&
                        item.outcome !==
                          "CONTINUE" && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">

                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${getOutcomeStyle(
                                item.outcome
                              )}`}
                            >
                              {outcomeName}
                            </span>

                            {item.lostReason && (
                              <span className="text-xs text-red-700">
                                Reason:{" "}
                                {
                                  item
                                    .lostReason
                                }
                              </span>
                            )}

                            {item.cancellationReason && (
                              <span className="text-xs text-red-700">
                                Reason:{" "}
                                {
                                  item
                                    .cancellationReason
                                }
                              </span>
                            )}

                          </div>
                        )}

                      {/* CONTACT ACTIONS */}

                      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100"
                          >
                            📞 Call
                          </a>
                        )}

                        {whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100"
                          >
                            WhatsApp
                          </a>
                        )}

                        {item.enquiryId && (
                          <Link
                            href={`/enquiries/${item.enquiryId}`}
                            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
                          >
                            👁️ View Enquiry
                          </Link>
                        )}

                      </div>

                      {/* FOLLOW-UP ACTIONS */}

                      {isPending && (
                        <div className="mt-3 border-t border-gray-100 pt-3">

                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                            Update Follow-up
                          </p>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

                            <button
                              type="button"
                              onClick={() =>
                                openAction(
                                  item,
                                  "CONTINUE"
                                )
                              }
                              className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                            >
                              📅 Continue
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openAction(
                                  item,
                                  "BUSINESS_CLOSED"
                                )
                              }
                              className="rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
                            >
                              ✅ Business Closed
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openAction(
                                  item,
                                  "CASE_LOST"
                                )
                              }
                              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                            >
                              ❌ Case Lost
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openAction(
                                  item,
                                  "CANCELLED"
                                )
                              }
                              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200"
                            >
                              🚫 Cancel
                            </button>

                          </div>

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

      </div>

      {/* ==================================================================== */}
      {/* ACTION MODAL                                                         */}
      {/* ==================================================================== */}

      {selectedFollowUp &&
        selectedOutcome && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">

            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="border-b border-gray-100 p-5">

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Update Follow-up
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-gray-900">
                      {getOutcomeName(
                        selectedOutcome
                      )}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {selectedFollowUp
                        .customer
                        ?.name ||
                        "Customer"}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      closeAction
                    }
                    disabled={
                      savingAction
                    }
                    className="rounded-lg bg-gray-100 px-3 py-2 font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                  >
                    ✕
                  </button>

                </div>

              </div>

              {/* MODAL BODY */}

              <div className="space-y-4 p-5">

                {/* REMARKS */}

                <div>

                  <label className="block text-sm font-bold text-gray-700">
                    Follow-up Remarks *
                  </label>

                  <textarea
                    rows={4}
                    value={
                      actionComment
                    }
                    onChange={(
                      event
                    ) =>
                      setActionComment(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="Enter follow-up remarks..."
                  />

                </div>

                {/* FOLLOW-UP DATE */}

                <div>

                  <label className="block text-sm font-bold text-gray-700">
                    Follow-up Date
                  </label>

                  <input
                    type="date"
                    value={
                      actionFollowUpDate
                    }
                    onChange={(
                      event
                    ) =>
                      setActionFollowUpDate(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />

                </div>

                {/* CONTINUE */}

                {selectedOutcome ===
                  "CONTINUE" && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

                    <label className="block text-sm font-bold text-blue-900">
                      Next Follow-up Date *
                    </label>

                    <input
                      type="date"
                      value={
                        actionNextDate
                      }
                      onChange={(
                        event
                      ) =>
                        setActionNextDate(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-blue-700">
                      The enquiry will remain in Follow-up status.
                    </p>

                  </div>
                )}

                {/* BUSINESS CLOSED */}

                {selectedOutcome ===
                  "BUSINESS_CLOSED" && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">

                    <p className="font-bold text-green-800">
                      ✅ Business Closed / Converted
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      This follow-up will be completed and the enquiry will be marked as converted.
                    </p>

                    <div className="mt-3 rounded-lg border border-green-200 bg-white p-3">

                      <p className="text-sm font-semibold text-green-800">
                        📄 Next Step: Policy Entry
                      </p>

                      <p className="mt-1 text-xs text-green-700">
                        After confirmation, the Add Policy page will open automatically for this customer.
                      </p>

                    </div>

                  </div>
                )}

                {/* CASE LOST */}

                {selectedOutcome ===
                  "CASE_LOST" && (
                  <div>

                    <label className="block text-sm font-bold text-red-700">
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
                      className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm outline-none focus:border-red-500"
                      placeholder="Why was this case lost?"
                    />

                  </div>
                )}

                {/* CANCEL */}

                {selectedOutcome ===
                  "CANCELLED" && (
                  <div>

                    <label className="block text-sm font-bold text-red-700">
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
                      className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm outline-none focus:border-red-500"
                      placeholder="Enter cancellation reason..."
                    />

                  </div>
                )}

              </div>

              {/* MODAL BUTTONS */}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 p-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeAction
                  }
                  disabled={
                    savingAction
                  }
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={
                    saveAction
                  }
                  disabled={
                    savingAction
                  }
                  className={`rounded-xl px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    selectedOutcome ===
                    "BUSINESS_CLOSED"
                      ? "bg-green-600 hover:bg-green-700"
                      : selectedOutcome ===
                        "CASE_LOST"
                      ? "bg-red-600 hover:bg-red-700"
                      : selectedOutcome ===
                        "CANCELLED"
                      ? "bg-gray-800 hover:bg-gray-900"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {savingAction
                    ? "Saving..."
                    : selectedOutcome ===
                      "BUSINESS_CLOSED"
                    ? "✓ Confirm & Add Policy"
                    : selectedOutcome ===
                      "CASE_LOST"
                    ? "Confirm Case Lost"
                    : selectedOutcome ===
                      "CANCELLED"
                    ? "Confirm Cancellation"
                    : "Save Next Follow-up"}
                </button>

              </div>

            </div>

          </div>
        )}

    </main>
  );
}