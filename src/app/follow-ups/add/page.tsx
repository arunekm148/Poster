"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type FollowUpHistoryItem = {
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

  createdByType?:
    | "AGENT"
    | "STAFF"
    | string;

  createdByName?: string | null;

  createdByStaffId?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;

  lostReason?: string | null;
  cancellationReason?: string | null;

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

type ApiResponse = {
  success?: boolean;
  message?: string;

  agent?: {
    id?: string;
    name?: string;
  };

  followUps?: FollowUpHistoryItem[];

  followUp?: FollowUpHistoryItem;
};

/* -------------------------------------------------------------------------- */
/* LOGIN                                                                      */
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
      // Ignore invalid local storage data
    }
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
/* -------------------------------------------------------------------------- */

function nowForDateTimeInput(): string {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
      1
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

  const hours =
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    );

  const minutes =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(
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

  return date.toLocaleString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        true,
    }
  );
}

/* -------------------------------------------------------------------------- */
/* LABELS                                                                     */
/* -------------------------------------------------------------------------- */

function getActionLabel(
  item: FollowUpHistoryItem
) {
  switch (
    item.actionType
  ) {
    case "FOLLOW_UP":
      return "Follow-up";

    case "CONTINUE":
      return "Continue";

    case "READY_FOR_POLICY":
      return "Ready for Policy";

    case "BUSINESS_CLOSED":
      return "Business Closed";

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
      return "Business Closed";

    case "CASE_LOST":
      return "Case Lost";

    case "CANCELLED":
      return "Cancelled";

    default:
      return "Follow-up";
  }
}

function getCreatorName(
  item: FollowUpHistoryItem,
  agentName: string
) {
  if (
    item.createdByName
      ?.trim()
  ) {
    return item.createdByName.trim();
  }

  if (
    item.createdByType ===
    "AGENT" &&
    agentName
  ) {
    return agentName;
  }

  return "Previous record";
}

function getCreatorRole(
  item: FollowUpHistoryItem
) {
  if (
    item.createdByType ===
    "STAFF"
  ) {
    return "Staff";
  }

  if (
    item.createdByType ===
    "AGENT"
  ) {
    return "Agent";
  }

  return "Old Data";
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AddFollowUpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="font-bold text-slate-500">
            Loading follow-up...
          </p>
        </main>
      }
    >
      <AddFollowUpContent />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                    */
/* -------------------------------------------------------------------------- */

function AddFollowUpContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const enquiryId =
    String(
      searchParams.get(
        "enquiryId"
      ) ||
      ""
    ).trim();

  const customerId =
    String(
      searchParams.get(
        "customerId"
      ) ||
      ""
    ).trim();

  const customerName =
    String(
      searchParams.get(
        "name"
      ) ||
      "Customer"
    ).trim();

  const customerPhone =
    String(
      searchParams.get(
        "phone"
      ) ||
      ""
    ).trim();

  const businessType =
    String(
      searchParams.get(
        "businessType"
      ) ||
      ""
    ).trim();

  /* ------------------------------------------------------------------------ */
  /* STATE                                                                    */
  /* ------------------------------------------------------------------------ */

  const [
    userId,
    setUserId,
  ] =
    useState(
      ""
    );

  const [
    agentName,
    setAgentName,
  ] =
    useState(
      ""
    );

  const [
    history,
    setHistory,
  ] =
    useState<
      FollowUpHistoryItem[]
    >(
      []
    );

  const [
    loadingHistory,
    setLoadingHistory,
  ] =
    useState(
      true
    );

  const [
    comment,
    setComment,
  ] =
    useState(
      ""
    );

  const [
    followUpDate,
    setFollowUpDate,
  ] =
    useState(
      nowForDateTimeInput()
    );

  const [
    nextFollowUpDate,
    setNextFollowUpDate,
  ] =
    useState(
      ""
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    success,
    setSuccess,
  ] =
    useState(
      ""
    );

  /* ------------------------------------------------------------------------ */
  /* HISTORY                                                                  */
  /* ------------------------------------------------------------------------ */

  const loadHistory =
    useCallback(
      async (
        activeUserId: string
      ) => {
        if (
          !activeUserId ||
          !enquiryId
        ) {
          setLoadingHistory(
            false
          );

          return;
        }

        try {
          setLoadingHistory(
            true
          );

          const response =
            await fetch(
              `/api/follow-ups?userId=${encodeURIComponent(
                activeUserId
              )}&enquiryId=${encodeURIComponent(
                enquiryId
              )}`,
              {
                cache:
                  "no-store",

                credentials:
                  "include",
              }
            );

          const data:
            ApiResponse =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (
            !response.ok ||
            data.success ===
              false
          ) {
            throw new Error(
              data.message ||
              "Unable to load follow-up history."
            );
          }

          setAgentName(
            String(
              data.agent?.name ||
              ""
            )
          );

          setHistory(
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
            "LOAD FOLLOW-UP HISTORY ERROR:",
            err
          );

          setHistory(
            []
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load follow-up history."
          );
        } finally {
          setLoadingHistory(
            false
          );
        }
      },
      [
        enquiryId,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const activeUserId =
      getLoggedInUserId();

    if (
      !activeUserId
    ) {
      setLoadingHistory(
        false
      );

      setError(
        "Agent login information not found. Please login again."
      );

      return;
    }

    setUserId(
      activeUserId
    );

    if (
      !enquiryId ||
      !customerId
    ) {
      setLoadingHistory(
        false
      );

      setError(
        "Enquiry information is missing. Please open Add Follow-up from the Enquiries page."
      );

      return;
    }

    void loadHistory(
      activeUserId
    );
  }, [
    enquiryId,
    customerId,
    loadHistory,
  ]);

  /* ------------------------------------------------------------------------ */
  /* ENQUIRY / LEAD COMMENT                                                   */
  /* ------------------------------------------------------------------------ */

  const enquiryComment =
    useMemo(
      () => {
        const first =
          history.find(
            (
              item
            ) =>
              item.enquiry
                ?.remarks
                ?.trim() ||
              item.enquiry
                ?.requirement
                ?.trim()
          );

        if (!first) {
          return "";
        }

        const remarks =
          String(
            first.enquiry
              ?.remarks ||
            ""
          ).trim();

        const requirement =
          String(
            first.enquiry
              ?.requirement ||
            ""
          ).trim();

        if (
          remarks &&
          requirement
        ) {
          return `${requirement}\n${remarks}`;
        }

        return (
          remarks ||
          requirement
        );
      },
      [
        history,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function saveFollowUp(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError(
      ""
    );

    setSuccess(
      ""
    );

    const activeUserId =
      userId ||
      getLoggedInUserId();

    if (
      !activeUserId
    ) {
      setError(
        "Agent login information not found."
      );

      return;
    }

    if (
      !customerId
    ) {
      setError(
        "Customer information is missing."
      );

      return;
    }

    if (
      !enquiryId
    ) {
      setError(
        "Enquiry information is missing."
      );

      return;
    }

    if (
      !comment.trim()
    ) {
      setError(
        "Please enter follow-up remarks."
      );

      return;
    }

    if (
      !followUpDate
    ) {
      setError(
        "Please select follow-up date and time."
      );

      return;
    }

    const currentFollowUp =
      new Date(
        followUpDate
      );

    if (
      Number.isNaN(
        currentFollowUp.getTime()
      )
    ) {
      setError(
        "Please select a valid follow-up date & time."
      );

      return;
    }

    let nextFollowUp:
      | Date
      | null =
      null;

    if (
      nextFollowUpDate
    ) {
      nextFollowUp =
        new Date(
          nextFollowUpDate
        );

      if (
        Number.isNaN(
          nextFollowUp.getTime()
        )
      ) {
        setError(
          "Please select a valid next follow-up date & time."
        );

        return;
      }

      if (
        nextFollowUp <=
        currentFollowUp
      ) {
        setError(
          "Next follow-up time must be after the current follow-up time."
        );

        return;
      }
    }

    try {
      setSaving(
        true
      );

      const response =
        await fetch(
          "/api/follow-ups",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  activeUserId,

                customerId,

                enquiryId,

                comment:
                  comment.trim(),

                followUpDate:
                  currentFollowUp.toISOString(),

                nextFollowUpDate:
                  nextFollowUp
                    ? nextFollowUp.toISOString()
                    : null,
              }),
          }
        );

      const data:
        ApiResponse =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        data.success ===
          false
      ) {
        throw new Error(
          data.message ||
          `Unable to save follow-up. Server returned ${response.status}.`
        );
      }

      setSuccess(
        data.message ||
        "Follow-up saved successfully."
      );

      /*
       * Keep user on this page so they can immediately
       * see the new comment added to the history.
       */

      setComment(
        ""
      );

      setFollowUpDate(
        nowForDateTimeInput()
      );

      setNextFollowUpDate(
        ""
      );

      await loadHistory(
        activeUserId
      );

      window.scrollTo({
        top:
          0,

        behavior:
          "smooth",
      });
    } catch (
      err
    ) {
      console.error(
        "SAVE FOLLOW-UP ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save follow-up."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RETURN                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 text-slate-950">

      <div className="mx-auto max-w-2xl">

        {/* TOP BUTTONS */}

        <div className="mb-4 flex flex-wrap gap-2">

          <Link
            href={
              enquiryId
                ? `/enquiries/${enquiryId}`
                : "/enquiries"
            }
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            ← Enquiry
          </Link>

          <Link
            href="/follow-ups"
            className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-800 hover:bg-orange-100"
          >
            Follow-ups
          </Link>

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <p className="text-xs font-black uppercase tracking-wider text-orange-700">
            Sales Follow-up
          </p>

          <h1 className="mt-1 text-2xl font-black">
            Add Follow-up
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Record each discussion without deleting the previous history.
          </p>

          {/* CUSTOMER */}

          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">

            <p className="text-xs font-black uppercase text-blue-700">
              Enquiry
            </p>

            <h2 className="mt-1 text-xl font-black text-blue-950">
              {customerName}
            </h2>

            <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-blue-800">

              {customerPhone && (
                <span>
                  📱{" "}
                  {customerPhone}
                </span>
              )}

              {businessType && (
                <span>
                  🛡️{" "}
                  {businessType}
                </span>
              )}

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              ⚠️{" "}
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              ✅{" "}
              {success}
            </div>
          )}

          {/* LEAD COMMENT */}

          <div className="mt-6">

            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Lead / Enquiry Comment
            </p>

            <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">

              {enquiryComment ? (
                <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-amber-950">
                  {enquiryComment}
                </p>
              ) : (
                <p className="text-sm font-semibold text-amber-700">
                  No enquiry comment available.
                </p>
              )}

            </div>

          </div>

          {/* HISTORY */}

          <div className="mt-6">

            <div className="flex items-center justify-between gap-3">

              <div>

                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Previous Follow-up History
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Every old comment remains here.
                </p>

              </div>

              {!loadingHistory && (
                <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {history.length}{" "}
                  record
                  {history.length ===
                  1
                    ? ""
                    : "s"}
                </span>
              )}

            </div>

            {loadingHistory && (
              <div className="mt-3 rounded-xl border bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Loading previous follow-ups...
              </div>
            )}

            {!loadingHistory &&
              history.length ===
                0 && (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No previous follow-up. This will be the first entry.
                </div>
              )}

            {!loadingHistory &&
              history.length >
                0 && (
                <div className="mt-3 space-y-3">

                  {history.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div>

                            <p className="font-black text-slate-900">
                              {getCreatorName(
                                item,
                                agentName
                              )}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2">

                              <span
                                className={`rounded-md px-2 py-1 text-xs font-black ${
                                  item.createdByType ===
                                  "STAFF"
                                    ? "bg-violet-100 text-violet-800"
                                    : item.createdByType ===
                                        "AGENT"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {getCreatorRole(
                                  item
                                )}
                              </span>

                              <span className="text-xs font-bold text-slate-500">
                                {formatDateTime(
                                  item.createdAt ||
                                  item.followUpDate
                                )}
                              </span>

                              {index ===
                                0 && (
                                <span className="rounded-md bg-orange-100 px-2 py-1 text-xs font-black text-orange-800">
                                  Latest
                                </span>
                              )}

                            </div>

                          </div>

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                            {getActionLabel(
                              item
                            )}
                          </span>

                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 p-3">

                          <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                            {item.comment}
                          </p>

                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-500">

                          <span>
                            Follow-up:{" "}
                            {formatDateTime(
                              item.followUpDate
                            )}
                          </span>

                          {item.nextFollowUpDate && (
                            <span className="text-orange-700">
                              Next:{" "}
                              {formatDateTime(
                                item.nextFollowUpDate
                              )}
                            </span>
                          )}

                        </div>

                        {item.lostReason && (
                          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                            Lost Reason:{" "}
                            {item.lostReason}
                          </div>
                        )}

                        {item.cancellationReason && (
                          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
                            Cancellation Reason:{" "}
                            {item.cancellationReason}
                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>
              )}

          </div>

          {/* NEW FOLLOW-UP */}

          <form
            onSubmit={
              saveFollowUp
            }
            className="mt-7 space-y-5 border-t border-slate-200 pt-6"
          >

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-orange-700">
                New Entry
              </p>

              <h3 className="mt-1 text-xl font-black">
                Add New Follow-up
              </h3>

            </div>

            <div>

              <label className="mb-2 block text-sm font-black text-slate-800">
                New Follow-up Remarks *
              </label>

              <textarea
                rows={
                  4
                }
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
                placeholder="Example: Customer requested quotation. Call again tomorrow morning."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-black text-slate-800">
                  Follow-up Date & Time *
                </label>

                <input
                  type="datetime-local"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-black text-slate-800">
                  Next Follow-up Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={
                    nextFollowUpDate
                  }
                  min={
                    followUpDate ||
                    undefined
                  }
                  onChange={(
                    event
                  ) =>
                    setNextFollowUpDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

              </div>

            </div>

            <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              Saving creates a new follow-up history record. Previous comments must remain unchanged.
            </p>

            <div className="flex flex-wrap justify-end gap-2">

              <Link
                href={
                  enquiryId
                    ? `/enquiries/${enquiryId}`
                    : "/enquiries"
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  saving ||
                  !enquiryId ||
                  !customerId
                }
                className="rounded-xl bg-orange-600 px-6 py-3 font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Follow-up"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </main>
  );
}