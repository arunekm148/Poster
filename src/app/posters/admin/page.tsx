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

type AdminUser = {
  id: string;
  name?: string;
  role?: string;
};

type Poster = {
  id: string;
  title: string;
  fileUrl: string;
  thumbnailUrl?: string | null;

  source?: "ADMIN" | "AGENT";

  approvalStatus?:
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

  isActive?: boolean;

  rejectionReason?: string | null;

  creditAmount?:
    | number
    | string
    | null;

  creditedAt?:
    | string
    | null;

  createdAt?: string;

  company?: {
    id?: string;
    name?: string;
    logoUrl?: string | null;
  } | null;

  category?: {
    id?: string;
    name?: string;
  } | null;

  uploadedBy?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string | null;
    logoUrl?: string | null;
  } | null;

  approvedBy?: {
    id?: string;
    name?: string;
  } | null;

  _count?: {
    downloads?: number;
  };
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(
  value?: string
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
    }
  );
}

function formatMoney(
  value:
    | number
    | string
    | null
    | undefined
) {
  const amount =
    Number(
      value || 0
    );

  return `₹${amount.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminPosterApprovalPage() {
  const [
    admin,
    setAdmin,
  ] =
    useState<AdminUser | null>(
      null
    );

  const [
    pendingPosters,
    setPendingPosters,
  ] =
    useState<Poster[]>([]);

  const [
    rejectedPosters,
    setRejectedPosters,
  ] =
    useState<Poster[]>([]);

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
    actionPosterId,
    setActionPosterId,
  ] =
    useState<string | null>(
      null
    );

  const [
    creditValues,
    setCreditValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    rejectionValues,
    setRejectionValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    search,
    setSearch,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD ADMIN                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        setMessage(
          "Please login as Admin."
        );

        setLoading(
          false
        );

        return;
      }

      const parsed:
        AdminUser =
        JSON.parse(
          savedUser
        );

      if (
        !parsed?.id
      ) {
        setMessage(
          "Admin session not found."
        );

        setLoading(
          false
        );

        return;
      }

      if (
        parsed.role !==
        "ADMIN"
      ) {
        setMessage(
          "Admin access only."
        );

        setLoading(
          false
        );

        return;
      }

      setAdmin(
        parsed
      );
    } catch (error) {
      console.error(
        "LOAD ADMIN ERROR:",
        error
      );

      setMessage(
        "Unable to read Admin session."
      );

      setLoading(
        false
      );
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD POSTERS                                                             */
  /* ------------------------------------------------------------------------ */

  const loadPosters =
    useCallback(
      async () => {
        if (!admin?.id) {
          return;
        }

        try {
          setLoading(
            true
          );

          const [
            pendingResponse,
            rejectedResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/posters?pending=true",
                {
                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/posters?status=REJECTED&source=AGENT",
                {
                  cache:
                    "no-store",
                }
              ),
            ]);

          const pendingData =
            await pendingResponse
              .json()
              .catch(
                () => ({})
              );

          const rejectedData =
            await rejectedResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            !pendingResponse.ok ||
            !pendingData.success
          ) {
            throw new Error(
              pendingData.message ||
                "Unable to load pending posters."
            );
          }

          if (
            !rejectedResponse.ok ||
            !rejectedData.success
          ) {
            throw new Error(
              rejectedData.message ||
                "Unable to load rejected posters."
            );
          }

          setPendingPosters(
            Array.isArray(
              pendingData.posters
            )
              ? pendingData.posters
              : []
          );

          setRejectedPosters(
            Array.isArray(
              rejectedData.posters
            )
              ? rejectedData.posters
              : []
          );
        } catch (error) {
          console.error(
            "LOAD ADMIN POSTERS ERROR:",
            error
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load posters."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        admin?.id,
      ]
    );

  useEffect(() => {
    if (!admin?.id) {
      return;
    }

    void loadPosters();
  }, [
    admin?.id,
    loadPosters,
  ]);

  /* ------------------------------------------------------------------------ */
  /* SEARCH                                                                   */
  /* ------------------------------------------------------------------------ */

  const visiblePending =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return pendingPosters;
      }

      return pendingPosters.filter(
        (
          poster
        ) => {
          const text =
            [
              poster.title,
              poster.category
                ?.name || "",
              poster.company
                ?.name || "",
              poster.uploadedBy
                ?.name || "",
              poster.uploadedBy
                ?.phone || "",
              poster.uploadedBy
                ?.email || "",
            ]
              .join(" ")
              .toLowerCase();

          return text.includes(
            query
          );
        }
      );
    }, [
      pendingPosters,
      search,
    ]);

  /* ------------------------------------------------------------------------ */
  /* APPROVE                                                                  */
  /* ------------------------------------------------------------------------ */

  async function approvePoster(
    poster: Poster
  ) {
    if (!admin?.id) {
      return;
    }

    const rawCredit =
      creditValues[
        poster.id
      ] ?? "";

    const creditAmount =
      Number(
        rawCredit
      );

    if (
      !Number.isFinite(
        creditAmount
      ) ||
      creditAmount < 0
    ) {
      window.alert(
        "Enter a valid credit amount."
      );

      return;
    }

    const confirmed =
      window.confirm(
        creditAmount > 0
          ? `Approve "${poster.title}" and credit ${formatMoney(
              creditAmount
            )} to ${poster.uploadedBy?.name || "the contributor"}?`
          : `Approve "${poster.title}" with no contributor credit?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionPosterId(
        poster.id
      );

      const response =
        await fetch(
          "/api/posters",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  poster.id,

                action:
                  "APPROVE",

                approvedByUserId:
                  admin.id,

                creditAmount,
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to approve poster."
        );
      }

      setMessage(
        data.message ||
          "✅ Poster approved successfully."
      );

      setCreditValues(
        (
          current
        ) => {
          const next =
            {
              ...current,
            };

          delete next[
            poster.id
          ];

          return next;
        }
      );

      await loadPosters();
    } catch (error) {
      console.error(
        "APPROVE POSTER ERROR:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to approve poster."
      );
    } finally {
      setActionPosterId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* REJECT                                                                   */
  /* ------------------------------------------------------------------------ */

  async function rejectPoster(
    poster: Poster
  ) {
    if (!admin?.id) {
      return;
    }

    const reason =
      (
        rejectionValues[
          poster.id
        ] ||
        ""
      ).trim();

    if (!reason) {
      window.alert(
        "Enter rejection reason."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Reject "${poster.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionPosterId(
        poster.id
      );

      const response =
        await fetch(
          "/api/posters",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  poster.id,

                action:
                  "REJECT",

                approvedByUserId:
                  admin.id,

                rejectionReason:
                  reason,
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to reject poster."
        );
      }

      setMessage(
        data.message ||
          "Poster rejected successfully."
      );

      setRejectionValues(
        (
          current
        ) => {
          const next =
            {
              ...current,
            };

          delete next[
            poster.id
          ];

          return next;
        }
      );

      await loadPosters();
    } catch (error) {
      console.error(
        "REJECT POSTER ERROR:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to reject poster."
      );
    } finally {
      setActionPosterId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS                                                                   */
  /* ------------------------------------------------------------------------ */

  if (
    !loading &&
    !admin
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

        <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Admin Access Required
          </h1>

          <p className="mt-2 font-semibold text-slate-600">
            {message}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-black text-white"
          >
            Login
          </Link>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* PAGE                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-100 pb-20 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-violet-900 text-white">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-4">

            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                Master Admin
              </p>

              <h1 className="text-2xl font-black">
                Poster Approval Centre
              </h1>

              <p className="mt-1 text-sm font-semibold text-blue-200">
                Review agent uploads and approve contributor credit
              </p>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/posters"
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black"
            >
              Poster Library
            </Link>

            <button
              type="button"
              onClick={() =>
                void loadPosters()
              }
              className="rounded-xl bg-white px-4 py-3 text-sm font-black text-blue-900"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* COUNTS */}

        <section className="grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Pending Approval
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                pendingPosters.length
              }
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                rejectedPosters.length
              }
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wide text-violet-700">
              Admin
            </p>

            <p className="mt-2 truncate text-lg font-black">
              {
                admin?.name ||
                "Administrator"
              }
            </p>

          </div>

        </section>

        {/* MESSAGE */}

        {message && (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-900">
            {message}
          </div>
        )}

        {/* SEARCH */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder="Search poster, contributor, phone or company"
            className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-700"
          />

        </section>

        {/* PENDING */}

        <section className="mt-6">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Agent Contributions
              </p>

              <h2 className="text-xl font-black">
                Pending Posters
              </h2>

            </div>

            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              {
                visiblePending.length
              }{" "}
              Pending
            </span>

          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl bg-white p-10 text-center font-bold">
              Loading pending posters...
            </div>
          ) : visiblePending.length ===
            0 ? (
            <div className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                ✅
              </div>

              <h3 className="mt-3 text-lg font-black">
                No Pending Posters
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Agent poster submissions waiting for approval will appear here.
              </p>

            </div>
          ) : (
            <div className="mt-5 grid gap-5 lg:grid-cols-2">

              {visiblePending.map(
                (
                  poster
                ) => {
                  const busy =
                    actionPosterId ===
                    poster.id;

                  return (
                    <article
                      key={
                        poster.id
                      }
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >

                      <div className="grid gap-0 md:grid-cols-[260px_1fr]">

                        {/* IMAGE */}

                        <div className="bg-slate-950">

                          <img
                            src={
                              poster.thumbnailUrl ||
                              poster.fileUrl
                            }
                            alt={
                              poster.title
                            }
                            className="h-full min-h-64 w-full object-contain"
                          />

                        </div>

                        {/* DETAILS */}

                        <div className="p-5">

                          <div className="flex flex-wrap items-start justify-between gap-3">

                            <div>

                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                Pending Approval
                              </p>

                              <h3 className="mt-1 text-xl font-black">
                                {
                                  poster.title
                                }
                              </h3>

                            </div>

                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-800">
                              PENDING
                            </span>

                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[10px] font-black uppercase text-slate-500">
                                Contributor
                              </p>

                              <p className="mt-1 font-black">
                                {
                                  poster.uploadedBy
                                    ?.name ||
                                  "-"
                                }
                              </p>

                              {poster.uploadedBy
                                ?.phone && (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {
                                    poster.uploadedBy
                                      .phone
                                  }
                                </p>
                              )}

                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[10px] font-black uppercase text-slate-500">
                                Submitted
                              </p>

                              <p className="mt-1 text-sm font-black">
                                {formatDate(
                                  poster.createdAt
                                )}
                              </p>

                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[10px] font-black uppercase text-slate-500">
                                Category
                              </p>

                              <p className="mt-1 text-sm font-black">
                                {
                                  poster.category
                                    ?.name ||
                                  "-"
                                }
                              </p>

                            </div>

                            <div className="rounded-xl bg-slate-50 p-3">

                              <p className="text-[10px] font-black uppercase text-slate-500">
                                Company
                              </p>

                              <p className="mt-1 text-sm font-black">
                                {
                                  poster.company
                                    ?.name ||
                                  "General Poster"
                                }
                              </p>

                            </div>

                          </div>

                          {/* CREDIT */}

                          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                            <label className="text-xs font-black uppercase tracking-wide text-emerald-700">
                              Contributor Credit Amount
                            </label>

                            <div className="mt-2 flex items-center gap-2">

                              <span className="text-xl font-black text-emerald-900">
                                ₹
                              </span>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  creditValues[
                                    poster.id
                                  ] ??
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setCreditValues(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [poster.id]:
                                        event
                                          .target
                                          .value,
                                    })
                                  )
                                }
                                placeholder="Enter credit amount"
                                className="w-full rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 font-black outline-none focus:border-emerald-600"
                              />

                            </div>

                            <p className="mt-2 text-xs font-semibold text-emerald-800">
                              Amount will be added directly to the contributor&apos;s Poster Wallet after approval.
                            </p>

                          </div>

                          {/* APPROVE */}

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              void approvePoster(
                                poster
                              )
                            }
                            className="mt-4 w-full rounded-xl bg-emerald-700 py-3 font-black text-white disabled:bg-slate-400"
                          >
                            {busy
                              ? "Processing..."
                              : "✓ Approve & Credit Poster"}
                          </button>

                          {/* REJECTION */}

                          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">

                            <label className="text-xs font-black uppercase tracking-wide text-red-700">
                              Rejection Reason
                            </label>

                            <textarea
                              rows={
                                3
                              }
                              value={
                                rejectionValues[
                                  poster.id
                                ] ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                setRejectionValues(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [poster.id]:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              placeholder="Enter reason if rejecting this poster"
                              className="mt-2 w-full resize-none rounded-xl border-2 border-red-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500"
                            />

                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void rejectPoster(
                                  poster
                                )
                              }
                              className="mt-3 w-full rounded-xl border-2 border-red-300 bg-white py-3 font-black text-red-700 disabled:bg-slate-100"
                            >
                              ✕ Reject Poster
                            </button>

                          </div>

                          <a
                            href={
                              poster.fileUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-block text-xs font-black text-blue-700 underline"
                          >
                            Open Original Image
                          </a>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* REJECTED HISTORY */}

        <section className="mt-8 rounded-3xl bg-white p-5 shadow-sm">

          <div>

            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Review History
            </p>

            <h2 className="mt-1 text-xl font-black">
              Recently Rejected Posters
            </h2>

          </div>

          {rejectedPosters.length ===
          0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">

              <p className="font-bold text-slate-500">
                No rejected Agent posters.
              </p>

            </div>
          ) : (
            <div className="mt-5 space-y-3">

              {rejectedPosters
                .slice(
                  0,
                  20
                )
                .map(
                  (
                    poster
                  ) => (
                    <div
                      key={
                        poster.id
                      }
                      className="flex gap-4 rounded-2xl border border-red-100 bg-red-50 p-3"
                    >

                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">

                        <img
                          src={
                            poster.thumbnailUrl ||
                            poster.fileUrl
                          }
                          alt={
                            poster.title
                          }
                          className="h-full w-full object-cover"
                        />

                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-start justify-between gap-2">

                          <div>

                            <p className="truncate font-black">
                              {
                                poster.title
                              }
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {
                                poster.uploadedBy
                                  ?.name ||
                                "Contributor"
                              }
                            </p>

                          </div>

                          <span className="rounded-full bg-red-100 px-3 py-1 text-[10px] font-black text-red-700">
                            REJECTED
                          </span>

                        </div>

                        <div className="mt-2 rounded-xl bg-white/80 p-3">

                          <p className="text-[10px] font-black uppercase text-red-600">
                            Reason
                          </p>

                          <p className="mt-1 text-xs font-bold text-red-800">
                            {
                              poster.rejectionReason ||
                              "-"
                            }
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}