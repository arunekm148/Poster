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

type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

type Withdrawal = {
  id: string;

  agentId: string;

  amount: number | string;

  status: WithdrawalStatus;

  accountHolderName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  branch?: string | null;
  ifscCode?: string | null;

  requestedAt?: string | null;

  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;

  paidAt?: string | null;

  transactionNumber?: string | null;
  paymentRemarks?: string | null;
  paymentProofUrl?: string | null;

  agent?: {
    id?: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function money(
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
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

function maskedAccount(
  value?: string | null
) {
  const account =
    String(
      value || ""
    );

  if (!account) {
    return "-";
  }

  if (
    account.length <= 4
  ) {
    return account;
  }

  return `••••••${account.slice(
    -4
  )}`;
}

function validPaymentProofUrl(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const url =
    value.trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith(
      "https://"
    ) ||
    url.startsWith(
      "http://"
    ) ||
    url.startsWith("/")
  ) {
    return url;
  }

  return "";
}

function statusClass(
  status: WithdrawalStatus
) {
  if (
    status ===
    "PENDING"
  ) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    status ===
    "APPROVED"
  ) {
    return "bg-blue-100 text-blue-800";
  }

  if (
    status ===
    "PAID"
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (
    status ===
    "REJECTED"
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function PosterWithdrawalsAdminPage() {
  /* ------------------------------------------------------------------------ */
  /* ADMIN                                                                    */
  /* ------------------------------------------------------------------------ */

  const [
    admin,
    setAdmin,
  ] =
    useState<
      AdminUser | null
    >(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* DATA                                                                     */
  /* ------------------------------------------------------------------------ */

  const [
    withdrawals,
    setWithdrawals,
  ] =
    useState<
      Withdrawal[]
    >(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "ALL" | WithdrawalStatus
    >(
      "ALL"
    );

  /* ------------------------------------------------------------------------ */
  /* ACTION STATE                                                             */
  /* ------------------------------------------------------------------------ */

  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    rejectionReasons,
    setRejectionReasons,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  const [
    transactionNumbers,
    setTransactionNumbers,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  const [
    paymentRemarks,
    setPaymentRemarks,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  const [
    paymentProofUrls,
    setPaymentProofUrls,
  ] =
    useState<
      Record<
        string,
        string
      >
    >(
      {}
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD ADMIN                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          "agentUser"
        );

      if (!saved) {
        setMessage(
          "Admin login session was not found."
        );

        setLoading(
          false
        );

        return;
      }

      const parsed:
        AdminUser =
        JSON.parse(
          saved
        );

      if (
        !parsed?.id
      ) {
        setMessage(
          "Unable to identify logged-in Admin."
        );

        setLoading(
          false
        );

        return;
      }

      setAdmin(
        parsed
      );
    } catch (
      error
    ) {
      console.error(
        "LOAD ADMIN ERROR:",
        error
      );

      setMessage(
        "Unable to load Admin session."
      );

      setLoading(
        false
      );
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* API HELPER                                                               */
  /* ------------------------------------------------------------------------ */

  async function fetchWithdrawalApi(
    options?: RequestInit
  ) {
    return fetch(
      "/posters/withdrawals",
      {
        cache:
          "no-store",

        ...options,
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* LOAD WITHDRAWALS                                                         */
  /* ------------------------------------------------------------------------ */

  const loadWithdrawals =
    useCallback(
      async (
        adminUserId:
          string
      ) => {
        try {
          setLoading(
            true
          );

          setMessage(
            ""
          );

          const response =
            await fetch(
              `/posters/withdrawals?adminUserId=${encodeURIComponent(
                adminUserId
              )}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",
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
                "Unable to load withdrawal requests."
            );
          }

          const list =
            Array.isArray(
              data.withdrawals
            )
              ? data.withdrawals
              : Array.isArray(
                    data.requests
                  )
                ? data.requests
                : [];

          setWithdrawals(
            list
          );
        } catch (
          error
        ) {
          console.error(
            "LOAD ADMIN WITHDRAWALS ERROR:",
            error
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load withdrawal requests."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    if (
      !admin?.id
    ) {
      return;
    }

    void loadWithdrawals(
      admin.id
    );
  }, [
    admin?.id,
    loadWithdrawals,
  ]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const counts =
    useMemo(() => {
      return {
        pending:
          withdrawals.filter(
            (
              item
            ) =>
              item.status ===
              "PENDING"
          ).length,

        approved:
          withdrawals.filter(
            (
              item
            ) =>
              item.status ===
              "APPROVED"
          ).length,

        paid:
          withdrawals.filter(
            (
              item
            ) =>
              item.status ===
              "PAID"
          ).length,

        rejected:
          withdrawals.filter(
            (
              item
            ) =>
              item.status ===
              "REJECTED"
          ).length,
      };
    }, [
      withdrawals,
    ]);

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const visibleWithdrawals =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return withdrawals.filter(
        (
          item
        ) => {
          if (
            statusFilter !==
              "ALL" &&
            item.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack =
            [
              item.id,
              item.agentId,
              item.agent?.name,
              item.agent?.phone,
              item.agent?.email,
              item.accountHolderName,
              item.accountNumber,
              item.bankName,
              item.branch,
              item.ifscCode,
              item.transactionNumber,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLowerCase();

          return haystack.includes(
            query
          );
        }
      );
    }, [
      withdrawals,
      search,
      statusFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* ADMIN ACTION                                                             */
  /* ------------------------------------------------------------------------ */

  async function updateWithdrawal(
    withdrawal:
      Withdrawal,

    action:
      | "APPROVE"
      | "REJECT"
      | "PAID"
  ) {
    if (
      !admin?.id
    ) {
      window.alert(
        "Admin session not found."
      );

      return;
    }

    if (
      action ===
      "REJECT"
    ) {
      const reason =
        rejectionReasons[
          withdrawal.id
        ]?.trim() ||
        "";

      if (!reason) {
        window.alert(
          "Please enter rejection reason."
        );

        return;
      }
    }

    if (
      action ===
      "PAID"
    ) {
      const transactionNumber =
        transactionNumbers[
          withdrawal.id
        ]?.trim() ||
        "";

      if (
        !transactionNumber
      ) {
        window.alert(
          "Please enter transaction / UTR number."
        );

        return;
      }
    }

    const actionLabel =
      action ===
      "APPROVE"
        ? "approve"
        : action ===
            "REJECT"
          ? "reject"
          : "mark this withdrawal as paid";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionLabel} ${money(
          withdrawal.amount
        )}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(
        withdrawal.id
      );

      setMessage(
        ""
      );

      const response =
        await fetchWithdrawalApi({
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              id:
                withdrawal.id,

              withdrawalId:
                withdrawal.id,

              action,

              adminUserId:
                admin.id,

              approvedByUserId:
                admin.id,

              rejectionReason:
                rejectionReasons[
                  withdrawal.id
                ]?.trim() ||
                "",

              transactionNumber:
                transactionNumbers[
                  withdrawal.id
                ]?.trim() ||
                "",

              paymentRemarks:
                paymentRemarks[
                  withdrawal.id
                ]?.trim() ||
                "",

              paymentProofUrl:
                paymentProofUrls[
                  withdrawal.id
                ]?.trim() ||
                "",
            }),
        });

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
            "Unable to update withdrawal."
        );
      }

      setMessage(
        data.message ||
          "✅ Withdrawal updated successfully."
      );

      await loadWithdrawals(
        admin.id
      );
    } catch (
      error
    ) {
      console.error(
        "UPDATE WITHDRAWAL ERROR:",
        error
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update withdrawal."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (
    loading &&
    withdrawals.length ===
      0
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">

        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            💳
          </div>

          <p className="mt-4 font-black text-slate-700">
            Loading Poster Wallet Withdrawals...
          </p>

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

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-4">

            <Link
              href="/admin"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl font-black hover:bg-white/20"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                Master Admin
              </p>

              <h1 className="text-2xl font-black sm:text-3xl">
                💳 Poster Wallet Withdrawals
              </h1>

              <p className="mt-1 text-sm font-semibold text-blue-200">
                Approve, reject and complete contributor payouts
              </p>

            </div>

          </div>

          <div className="flex gap-2">

            <Link
              href="/admin/poster"
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black hover:bg-white/20"
            >
              Poster Admin
            </Link>

            <button
              type="button"
              disabled={
                loading ||
                !admin?.id
              }
              onClick={() => {
                if (
                  admin?.id
                ) {
                  void loadWithdrawals(
                    admin.id
                  );
                }
              }}
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-950 disabled:opacity-50"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* MESSAGE */}

        {message && (
          <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-900">
            {message}
          </div>
        )}

        {/* SUMMARY */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                "PENDING"
              )
            }
            className="rounded-3xl border border-amber-200 bg-white p-5 text-left shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                counts.pending
              }
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                "APPROVED"
              )
            }
            className="rounded-3xl border border-blue-200 bg-white p-5 text-left shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Approved
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                counts.approved
              }
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                "PAID"
              )
            }
            className="rounded-3xl border border-emerald-200 bg-white p-5 text-left shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
              Paid
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                counts.paid
              }
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(
                "REJECTED"
              )
            }
            className="rounded-3xl border border-red-200 bg-white p-5 text-left shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wider text-red-700">
              Rejected
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                counts.rejected
              }
            </p>
          </button>

        </section>

        {/* SEARCH */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">

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
              placeholder="Search agent, mobile, bank, account, IFSC or transaction..."
              className="w-full rounded-xl border-2 border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-700"
            />

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value as
                    | "ALL"
                    | WithdrawalStatus
                )
              }
              className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-black outline-none focus:border-blue-700"
            >
              <option value="ALL">
                All Status
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="APPROVED">
                Approved
              </option>

              <option value="PAID">
                Paid
              </option>

              <option value="REJECTED">
                Rejected
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch(
                  ""
                );

                setStatusFilter(
                  "ALL"
                );
              }}
              className="rounded-xl border-2 border-slate-300 px-5 py-3 font-black text-slate-700"
            >
              Clear
            </button>

          </div>

        </section>

        {/* REQUESTS */}

        <section className="mt-6">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                Poster Wallet
              </p>

              <h2 className="text-2xl font-black">
                Withdrawal Requests
              </h2>

            </div>

            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
              {
                visibleWithdrawals.length
              }{" "}
              requests
            </span>

          </div>

          {visibleWithdrawals.length ===
          0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

              <div className="text-5xl">
                ✅
              </div>

              <h3 className="mt-3 text-lg font-black">
                No Withdrawal Requests
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                No requests match the selected filter.
              </p>

            </div>
          ) : (
            <div className="mt-5 space-y-5">

              {visibleWithdrawals.map(
                (
                  withdrawal
                ) => {
                  const busy =
                    processingId ===
                    withdrawal.id;

                  const paymentProof =
                    validPaymentProofUrl(
                      withdrawal.paymentProofUrl
                    );

                  return (
                    <article
                      key={
                        withdrawal.id
                      }
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >

                      {/* TOP */}

                      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Withdrawal Amount
                          </p>

                          <p className="mt-1 text-3xl font-black text-slate-950">
                            {money(
                              withdrawal.amount
                            )}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Requested:{" "}
                            {formatDate(
                              withdrawal.requestedAt
                            )}
                          </p>

                        </div>

                        <span
                          className={`w-fit rounded-full px-4 py-2 text-xs font-black ${statusClass(
                            withdrawal.status
                          )}`}
                        >
                          {
                            withdrawal.status
                          }
                        </span>

                      </div>

                      <div className="grid gap-5 p-5 lg:grid-cols-2">

                        <div className="space-y-4">

                          <div className="rounded-2xl bg-slate-50 p-4">

                            <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                              Contributor
                            </p>

                            <p className="mt-2 text-lg font-black">
                              {withdrawal.agent
                                ?.name ||
                                "Agent"}
                            </p>

                            {withdrawal.agent
                              ?.phone && (
                              <p className="mt-1 text-sm font-semibold text-slate-600">
                                📱{" "}
                                {
                                  withdrawal.agent.phone
                                }
                              </p>
                            )}

                            {withdrawal.agent
                              ?.email && (
                              <p className="mt-1 text-sm font-semibold text-slate-600">
                                ✉️{" "}
                                {
                                  withdrawal.agent.email
                                }
                              </p>
                            )}

                            <p className="mt-2 break-all text-[10px] font-bold text-slate-400">
                              Agent ID:{" "}
                              {
                                withdrawal.agentId
                              }
                            </p>

                          </div>

                          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">

                            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                              Bank Account
                            </p>

                            <p className="mt-2 font-black text-blue-950">
                              {withdrawal.accountHolderName ||
                                "-"}
                            </p>

                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              Bank:{" "}
                              {withdrawal.bankName ||
                                "-"}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              Account:{" "}
                              {maskedAccount(
                                withdrawal.accountNumber
                              )}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              IFSC:{" "}
                              {withdrawal.ifscCode ||
                                "-"}
                            </p>

                            {withdrawal.branch && (
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                Branch:{" "}
                                {
                                  withdrawal.branch
                                }
                              </p>
                            )}

                          </div>

                        </div>

                        <div>

                          {withdrawal.status ===
                            "PENDING" && (
                            <div className="space-y-4">

                              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                                <p className="font-black text-emerald-900">
                                  Approve Withdrawal
                                </p>

                                <p className="mt-1 text-xs font-semibold text-emerald-700">
                                  Approval confirms this payout request for payment processing.
                                </p>

                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void updateWithdrawal(
                                      withdrawal,
                                      "APPROVE"
                                    )
                                  }
                                  className="mt-4 w-full rounded-xl bg-emerald-700 py-3 font-black text-white disabled:bg-slate-400"
                                >
                                  {busy
                                    ? "Processing..."
                                    : "✓ Approve Withdrawal"}
                                </button>

                              </div>

                              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

                                <label className="text-xs font-black uppercase tracking-wide text-red-700">
                                  Rejection Reason
                                </label>

                                <textarea
                                  value={
                                    rejectionReasons[
                                      withdrawal.id
                                    ] || ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setRejectionReasons(
                                      (
                                        current
                                      ) => ({
                                        ...current,

                                        [withdrawal.id]:
                                          event.target.value,
                                      })
                                    )
                                  }
                                  placeholder="Enter reason for rejection"
                                  rows={
                                    3
                                  }
                                  className="mt-2 w-full rounded-xl border-2 border-red-200 bg-white p-3 font-semibold outline-none focus:border-red-500"
                                />

                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void updateWithdrawal(
                                      withdrawal,
                                      "REJECT"
                                    )
                                  }
                                  className="mt-3 w-full rounded-xl border-2 border-red-300 bg-white py-3 font-black text-red-700 disabled:opacity-50"
                                >
                                  ✕ Reject & Return Wallet Amount
                                </button>

                              </div>

                            </div>
                          )}

                          {withdrawal.status ===
                            "APPROVED" && (
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">

                              <p className="text-lg font-black text-blue-950">
                                💸 Complete Payment
                              </p>

                              <p className="mt-1 text-xs font-semibold text-blue-700">
                                Enter bank transaction details after payment is completed.
                              </p>

                              <label className="mt-4 block text-xs font-black uppercase text-blue-800">
                                Transaction / UTR Number *
                              </label>

                              <input
                                value={
                                  transactionNumbers[
                                    withdrawal.id
                                  ] || ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setTransactionNumbers(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [withdrawal.id]:
                                        event.target.value,
                                    })
                                  )
                                }
                                placeholder="Enter UTR / transaction reference"
                                className="mt-2 w-full rounded-xl border-2 border-blue-200 bg-white p-3 font-bold outline-none focus:border-blue-600"
                              />

                              <label className="mt-4 block text-xs font-black uppercase text-blue-800">
                                Payment Remarks
                              </label>

                              <textarea
                                value={
                                  paymentRemarks[
                                    withdrawal.id
                                  ] || ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setPaymentRemarks(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [withdrawal.id]:
                                        event.target.value,
                                    })
                                  )
                                }
                                placeholder="Optional payment remarks"
                                rows={
                                  2
                                }
                                className="mt-2 w-full rounded-xl border-2 border-blue-200 bg-white p-3 font-semibold outline-none"
                              />

                              <label className="mt-4 block text-xs font-black uppercase text-blue-800">
                                Payment Proof URL
                              </label>

                              <input
                                value={
                                  paymentProofUrls[
                                    withdrawal.id
                                  ] || ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  setPaymentProofUrls(
                                    (
                                      current
                                    ) => ({
                                      ...current,

                                      [withdrawal.id]:
                                        event.target.value,
                                    })
                                  )
                                }
                                placeholder="Optional payment proof URL"
                                className="mt-2 w-full rounded-xl border-2 border-blue-200 bg-white p-3 font-semibold outline-none"
                              />

                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void updateWithdrawal(
                                    withdrawal,
                                    "PAID"
                                  )
                                }
                                className="mt-5 w-full rounded-xl bg-blue-700 py-3.5 font-black text-white disabled:bg-slate-400"
                              >
                                {busy
                                  ? "Processing..."
                                  : "✓ Mark as Paid"}
                              </button>

                            </div>
                          )}

                          {withdrawal.status ===
                            "PAID" && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                              <p className="text-lg font-black text-emerald-900">
                                ✅ Payment Completed
                              </p>

                              <p className="mt-2 text-sm font-semibold text-emerald-800">
                                Paid:{" "}
                                {formatDate(
                                  withdrawal.paidAt
                                )}
                              </p>

                              {withdrawal.transactionNumber && (
                                <div className="mt-3 rounded-xl bg-white p-3">

                                  <p className="text-[10px] font-black uppercase text-emerald-700">
                                    Transaction Reference
                                  </p>

                                  <p className="mt-1 break-all font-black text-slate-950">
                                    {
                                      withdrawal.transactionNumber
                                    }
                                  </p>

                                </div>
                              )}

                              {withdrawal.paymentRemarks && (
                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                  {
                                    withdrawal.paymentRemarks
                                  }
                                </p>
                              )}

                              {paymentProof && (
                                <a
                                  href={
                                    paymentProof
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-block rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white"
                                >
                                  View Payment Proof
                                </a>
                              )}

                            </div>
                          )}

                          {withdrawal.status ===
                            "REJECTED" && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

                              <p className="text-lg font-black text-red-800">
                                ✕ Withdrawal Rejected
                              </p>

                              <p className="mt-2 text-xs font-semibold text-red-700">
                                Rejected:{" "}
                                {formatDate(
                                  withdrawal.rejectedAt
                                )}
                              </p>

                              <div className="mt-3 rounded-xl bg-white p-3">

                                <p className="text-[10px] font-black uppercase text-red-600">
                                  Reason
                                </p>

                                <p className="mt-1 text-sm font-bold text-red-900">
                                  {withdrawal.rejectionReason ||
                                    "No rejection reason available."}
                                </p>

                              </div>

                              <p className="mt-3 text-xs font-semibold text-red-700">
                                The pending amount should be returned to the contributor&apos;s available Poster Wallet balance.
                              </p>

                            </div>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}