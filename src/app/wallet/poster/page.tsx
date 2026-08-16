"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AgentUser = {
  id: string;
  name?: string;
  role?: string;
};

type WalletSummary = {
  availableBalance: number;
  totalEarned: number;
  totalPending: number;
  totalWithdrawn: number;
};

type BankAccount = {
  id?: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branch?: string | null;
  ifscCode: string;
  isActive?: boolean;
};

type Withdrawal = {
  id: string;
  amount: number;

  status:
    | "PENDING"
    | "APPROVED"
    | "PAID"
    | "REJECTED"
    | "CANCELLED";

  requestedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  paidAt?: string | null;

  transactionNumber?: string | null;
  paymentRemarks?: string | null;
  paymentProofUrl?: string | null;
};

type WalletTransaction = {
  id: string;

  type:
    | "EARN"
    | "WITHDRAWAL_PENDING"
    | "WITHDRAWAL_PAID"
    | "WITHDRAWAL_REVERSED"
    | "ADMIN_ADJUSTMENT";

  amount: number;

  description?: string | null;

  createdAt: string;

  media?: {
    id?: string;
    title?: string;
    fileUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
};

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function PosterWalletPage() {
  const [
    user,
    setUser,
  ] =
    useState<AgentUser | null>(
      null
    );

  const [
    wallet,
    setWallet,
  ] =
    useState<WalletSummary>({
      availableBalance: 0,
      totalEarned: 0,
      totalPending: 0,
      totalWithdrawn: 0,
    });

  const [
    bankAccount,
    setBankAccount,
  ] =
    useState<BankAccount | null>(
      null
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<WalletTransaction[]>(
      []
    );

  const [
    withdrawals,
    setWithdrawals,
  ] =
    useState<Withdrawal[]>(
      []
    );

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
    bankModalOpen,
    setBankModalOpen,
  ] =
    useState(false);

  const [
    withdrawalModalOpen,
    setWithdrawalModalOpen,
  ] =
    useState(false);

  const [
    savingBank,
    setSavingBank,
  ] =
    useState(false);

  const [
    requestingWithdrawal,
    setRequestingWithdrawal,
  ] =
    useState(false);

  /* BANK FORM */

  const [
    accountHolderName,
    setAccountHolderName,
  ] =
    useState("");

  const [
    accountNumber,
    setAccountNumber,
  ] =
    useState("");

  const [
    bankName,
    setBankName,
  ] =
    useState("");

  const [
    branch,
    setBranch,
  ] =
    useState("");

  const [
    ifscCode,
    setIfscCode,
  ] =
    useState("");

  /* WITHDRAWAL */

  const [
    withdrawalAmount,
    setWithdrawalAmount,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD USER                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        setMessage(
          "Please login first."
        );

        setLoading(
          false
        );

        return;
      }

      const parsed:
        AgentUser =
        JSON.parse(
          savedUser
        );

      if (!parsed?.id) {
        setMessage(
          "Agent session not found."
        );

        setLoading(
          false
        );

        return;
      }

      setUser(
        parsed
      );

      void loadWallet(
        parsed.id
      );
    } catch (error) {
      console.error(
        "POSTER WALLET USER ERROR:",
        error
      );

      setMessage(
        "Unable to read Agent session."
      );

      setLoading(
        false
      );
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD WALLET                                                              */
  /* ------------------------------------------------------------------------ */

  async function loadWallet(
    userId: string
  ) {
    try {
      setLoading(
        true
      );

      setMessage(
        ""
      );

      const response =
        await fetch(
          `/api/wallet/poster?userId=${encodeURIComponent(
            userId
          )}`,
          {
            cache:
              "no-store",
          }
        );

      let data: any = {};

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
            "Unable to load Poster Wallet."
        );
      }

      setWallet({
        availableBalance:
          Number(
            data.wallet
              ?.availableBalance ||
              0
          ),

        totalEarned:
          Number(
            data.wallet
              ?.totalEarned ||
              0
          ),

        totalPending:
          Number(
            data.wallet
              ?.totalPending ||
              0
          ),

        totalWithdrawn:
          Number(
            data.wallet
              ?.totalWithdrawn ||
              0
          ),
      });

      const bank =
        data.bankAccount ||
        null;

      setBankAccount(
        bank
      );

      if (bank) {
        setAccountHolderName(
          bank.accountHolderName ||
            ""
        );

        setAccountNumber(
          bank.accountNumber ||
            ""
        );

        setBankName(
          bank.bankName ||
            ""
        );

        setBranch(
          bank.branch ||
            ""
        );

        setIfscCode(
          bank.ifscCode ||
            ""
        );
      }

      setTransactions(
        Array.isArray(
          data.transactions
        )
          ? data.transactions
          : []
      );

      setWithdrawals(
        Array.isArray(
          data.withdrawals
        )
          ? data.withdrawals
          : []
      );
    } catch (error) {
      console.error(
        "LOAD POSTER WALLET ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load Poster Wallet."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* MONEY                                                                    */
  /* ------------------------------------------------------------------------ */

  function formatMoney(
    value: number
  ) {
    return `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          2,
      }
    )}`;
  }

  /* ------------------------------------------------------------------------ */
  /* DATE                                                                     */
  /* ------------------------------------------------------------------------ */

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
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CURRENT WITHDRAWAL                                                       */
  /* ------------------------------------------------------------------------ */

  const activeWithdrawal =
    useMemo(() => {
      return withdrawals.find(
        (withdrawal) =>
          withdrawal.status ===
            "PENDING" ||
          withdrawal.status ===
            "APPROVED"
      );
    }, [
      withdrawals,
    ]);

  /* ------------------------------------------------------------------------ */
  /* SAVE BANK                                                                */
  /* ------------------------------------------------------------------------ */

  async function saveBankDetails() {
    if (!user?.id) {
      return;
    }

    if (
      !accountHolderName.trim()
    ) {
      window.alert(
        "Enter account holder name."
      );

      return;
    }

    if (
      !accountNumber.trim()
    ) {
      window.alert(
        "Enter account number."
      );

      return;
    }

    if (
      !bankName.trim()
    ) {
      window.alert(
        "Enter bank name."
      );

      return;
    }

    if (
      !ifscCode.trim()
    ) {
      window.alert(
        "Enter IFSC code."
      );

      return;
    }

    try {
      setSavingBank(
        true
      );

      const response =
        await fetch(
          "/api/wallet/poster/bank",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  user.id,

                accountHolderName:
                  accountHolderName.trim(),

                accountNumber:
                  accountNumber.trim(),

                bankName:
                  bankName.trim(),

                branch:
                  branch.trim(),

                ifscCode:
                  ifscCode
                    .trim()
                    .toUpperCase(),
              }),
          }
        );

      let data: any = {};

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
            "Unable to save bank details."
        );
      }

      setMessage(
        "✅ Bank details saved successfully."
      );

      setBankModalOpen(
        false
      );

      await loadWallet(
        user.id
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save bank details."
      );
    } finally {
      setSavingBank(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* WITHDRAWAL                                                               */
  /* ------------------------------------------------------------------------ */

  async function requestWithdrawal() {
    if (!user?.id) {
      return;
    }

    const amount =
      Number(
        withdrawalAmount
      );

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      window.alert(
        "Enter a valid withdrawal amount."
      );

      return;
    }

    if (
      amount >
      wallet.availableBalance
    ) {
      window.alert(
        "Withdrawal amount is more than available balance."
      );

      return;
    }

    try {
      setRequestingWithdrawal(
        true
      );

      const response =
        await fetch(
          "/api/wallet/poster/withdrawals",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  user.id,

                amount,
              }),
          }
        );

      let data: any = {};

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
            "Unable to submit withdrawal."
        );
      }

      setMessage(
        "✅ Withdrawal request submitted successfully."
      );

      setWithdrawalAmount(
        ""
      );

      setWithdrawalModalOpen(
        false
      );

      await loadWallet(
        user.id
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to submit withdrawal."
      );
    } finally {
      setRequestingWithdrawal(
        false
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">

        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">

          <div className="text-5xl">
            💰
          </div>

          <p className="mt-4 font-black text-slate-700">
            Loading Poster Wallet...
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

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

          <div className="flex items-center gap-4">

            <Link
              href="/wallet"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                Wallet
              </p>

              <h1 className="text-2xl font-black">
                🖼️ Poster Wallet
              </h1>

              <p className="mt-1 text-sm font-semibold text-blue-200">
                Poster contribution earnings
              </p>

            </div>

          </div>

          <Link
            href="/posters"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black"
          >
            Posters
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* MESSAGE */}

        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-800">
            {message}
          </div>
        )}

        {/* BALANCE */}

        <div className="rounded-3xl bg-gradient-to-br from-blue-800 via-indigo-800 to-violet-800 p-6 text-white shadow-lg">

          <p className="text-xs font-black uppercase tracking-widest text-blue-200">
            Available Poster Credit
          </p>

          <p className="mt-2 text-4xl font-black">
            {formatMoney(
              wallet.availableBalance
            )}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">

            <div className="rounded-2xl bg-white/10 p-3">

              <p className="text-[10px] font-black uppercase text-blue-200">
                Total Earned
              </p>

              <p className="mt-1 font-black">
                {formatMoney(
                  wallet.totalEarned
                )}
              </p>

            </div>

            <div className="rounded-2xl bg-white/10 p-3">

              <p className="text-[10px] font-black uppercase text-blue-200">
                Pending
              </p>

              <p className="mt-1 font-black">
                {formatMoney(
                  wallet.totalPending
                )}
              </p>

            </div>

            <div className="rounded-2xl bg-white/10 p-3">

              <p className="text-[10px] font-black uppercase text-blue-200">
                Withdrawn
              </p>

              <p className="mt-1 font-black">
                {formatMoney(
                  wallet.totalWithdrawn
                )}
              </p>

            </div>

          </div>

        </div>

        {/* BANK + WITHDRAWAL */}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">

          {/* BANK */}

          <section className="rounded-3xl bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Payout Account
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Bank Details
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setBankModalOpen(
                    true
                  )
                }
                className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-800"
              >
                {bankAccount
                  ? "Edit"
                  : "Add Bank"}
              </button>

            </div>

            {bankAccount ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">

                <p className="font-black text-slate-900">
                  {
                    bankAccount.accountHolderName
                  }
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {
                    bankAccount.bankName
                  }
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  A/C:{" "}
                  {bankAccount.accountNumber.length >
                  4
                    ? `••••••${bankAccount.accountNumber.slice(
                        -4
                      )}`
                    : bankAccount.accountNumber}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                  IFSC:{" "}
                  {
                    bankAccount.ifscCode
                  }
                </p>

                {bankAccount.branch && (
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Branch:{" "}
                    {
                      bankAccount.branch
                    }
                  </p>
                )}

              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center">

                <div className="text-4xl">
                  🏦
                </div>

                <p className="mt-2 font-bold text-slate-500">
                  Add your bank details for Poster Wallet withdrawal.
                </p>

              </div>
            )}

          </section>

          {/* WITHDRAWAL */}

          <section className="rounded-3xl bg-white p-5 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
              Poster Wallet
            </p>

            <h2 className="mt-1 text-xl font-black">
              Withdrawal
            </h2>

            <p className="mt-3 text-sm font-semibold text-slate-500">
              Available balance
            </p>

            <p className="mt-1 text-3xl font-black text-emerald-700">
              {formatMoney(
                wallet.availableBalance
              )}
            </p>

            {activeWithdrawal ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">

                <p className="text-xs font-black uppercase text-amber-700">
                  Current Withdrawal
                </p>

                <p className="mt-1 text-xl font-black text-amber-900">
                  {formatMoney(
                    activeWithdrawal.amount
                  )}
                </p>

                <p className="mt-1 text-sm font-bold text-amber-800">
                  Status:{" "}
                  {
                    activeWithdrawal.status
                  }
                </p>

              </div>
            ) : (
              <button
                type="button"
                disabled={
                  !bankAccount ||
                  wallet.availableBalance <=
                    0
                }
                onClick={() =>
                  setWithdrawalModalOpen(
                    true
                  )
                }
                className="mt-5 w-full rounded-xl bg-emerald-700 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Request Withdrawal
              </button>
            )}

            {!bankAccount && (
              <p className="mt-3 text-xs font-bold text-red-600">
                Add bank details before withdrawal.
              </p>
            )}

          </section>

        </div>

        {/* EARNING HISTORY */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-blue-700">
              Poster Credits
            </p>

            <h2 className="mt-1 text-xl font-black">
              Earnings History
            </h2>

          </div>

          {transactions.length ===
          0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">

              <div className="text-4xl">
                🖼️
              </div>

              <p className="mt-3 font-bold text-slate-500">
                No Poster Wallet transactions yet.
              </p>

            </div>
          ) : (
            <div className="mt-5 space-y-3">

              {transactions.map(
                (
                  transaction
                ) => (
                  <div
                    key={
                      transaction.id
                    }
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-black">
                        {transaction.media
                          ?.title ||
                          transaction.description ||
                          "Poster Wallet"}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatDate(
                          transaction.createdAt
                        )}
                      </p>

                      <p className="mt-1 text-[10px] font-black text-slate-400">
                        {
                          transaction.type
                        }
                      </p>

                    </div>

                    <p
                      className={`shrink-0 text-lg font-black ${
                        transaction.type ===
                        "EARN"
                          ? "text-emerald-700"
                          : "text-slate-700"
                      }`}
                    >
                      {transaction.type ===
                      "EARN"
                        ? "+"
                        : ""}
                      {formatMoney(
                        transaction.amount
                      )}
                    </p>

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* WITHDRAWAL HISTORY */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <p className="text-xs font-black uppercase tracking-wider text-violet-700">
            Payouts
          </p>

          <h2 className="mt-1 text-xl font-black">
            Withdrawal History
          </h2>

          {withdrawals.length ===
          0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">

              <div className="text-4xl">
                💳
              </div>

              <p className="mt-3 font-bold text-slate-500">
                No withdrawal requests yet.
              </p>

            </div>
          ) : (
            <div className="mt-5 space-y-3">

              {withdrawals.map(
                (
                  withdrawal
                ) => (
                  <div
                    key={
                      withdrawal.id
                    }
                    className="rounded-2xl border border-slate-200 p-4"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-xl font-black">
                          {formatMoney(
                            withdrawal.amount
                          )}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {formatDate(
                            withdrawal.requestedAt
                          )}
                        </p>

                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                        {
                          withdrawal.status
                        }
                      </span>

                    </div>

                    {withdrawal.transactionNumber && (
                      <div className="mt-3 rounded-xl bg-emerald-50 p-3">

                        <p className="text-xs font-black text-emerald-700">
                          Transaction Reference
                        </p>

                        <p className="mt-1 font-black text-emerald-900">
                          {
                            withdrawal.transactionNumber
                          }
                        </p>

                      </div>
                    )}

                    {withdrawal.paymentRemarks && (
                      <p className="mt-3 text-sm font-semibold text-slate-600">
                        {
                          withdrawal.paymentRemarks
                        }
                      </p>
                    )}

                    {withdrawal.rejectionReason && (
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
                        Rejected:{" "}
                        {
                          withdrawal.rejectionReason
                        }
                      </div>
                    )}

                    {withdrawal.paymentProofUrl && (
                      <a
                        href={
                          withdrawal.paymentProofUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-700"
                      >
                        View Payment Proof
                      </a>
                    )}

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </section>

      {/* -------------------------------------------------------------------- */}
      {/* BANK MODAL                                                           */}
      {/* -------------------------------------------------------------------- */}

      {bankModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">

          <div className="mx-auto my-8 max-w-lg rounded-3xl bg-white p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-black uppercase text-blue-700">
                  Poster Wallet
                </p>

                <h2 className="text-xl font-black">
                  Bank Details
                </h2>

              </div>

              <button
                type="button"
                disabled={
                  savingBank
                }
                onClick={() =>
                  setBankModalOpen(
                    false
                  )
                }
                className="h-9 w-9 rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>

            </div>

            <label className="mt-5 block text-sm font-black">
              Account Holder Name *
            </label>

            <input
              value={
                accountHolderName
              }
              onChange={(
                event
              ) =>
                setAccountHolderName(
                  event.target.value
                )
              }
              placeholder="Account holder name"
              className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3"
            />

            <label className="mt-4 block text-sm font-black">
              Account Number *
            </label>

            <input
              value={
                accountNumber
              }
              onChange={(
                event
              ) =>
                setAccountNumber(
                  event.target.value
                )
              }
              placeholder="Bank account number"
              inputMode="numeric"
              className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3"
            />

            <label className="mt-4 block text-sm font-black">
              Bank Name *
            </label>

            <input
              value={
                bankName
              }
              onChange={(
                event
              ) =>
                setBankName(
                  event.target.value
                )
              }
              placeholder="Bank name"
              className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3"
            />

            <label className="mt-4 block text-sm font-black">
              Branch
            </label>

            <input
              value={
                branch
              }
              onChange={(
                event
              ) =>
                setBranch(
                  event.target.value
                )
              }
              placeholder="Branch"
              className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3"
            />

            <label className="mt-4 block text-sm font-black">
              IFSC Code *
            </label>

            <input
              value={
                ifscCode
              }
              onChange={(
                event
              ) =>
                setIfscCode(
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder="Example: SBIN0001234"
              className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3 uppercase"
            />

            <button
              type="button"
              disabled={
                savingBank
              }
              onClick={() =>
                void saveBankDetails()
              }
              className="mt-6 w-full rounded-xl bg-blue-700 py-3 font-black text-white disabled:bg-slate-400"
            >
              {savingBank
                ? "Saving..."
                : "Save Bank Details"}
            </button>

          </div>

        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* WITHDRAWAL MODAL                                                     */}
      {/* -------------------------------------------------------------------- */}

      {withdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

          <div className="w-full max-w-md rounded-3xl bg-white p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-black uppercase text-emerald-700">
                  Poster Wallet
                </p>

                <h2 className="text-xl font-black">
                  Request Withdrawal
                </h2>

              </div>

              <button
                type="button"
                disabled={
                  requestingWithdrawal
                }
                onClick={() =>
                  setWithdrawalModalOpen(
                    false
                  )
                }
                className="h-9 w-9 rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>

            </div>

            <div className="mt-5 rounded-2xl bg-emerald-50 p-4">

              <p className="text-xs font-black uppercase text-emerald-700">
                Available Balance
              </p>

              <p className="mt-1 text-2xl font-black text-emerald-900">
                {formatMoney(
                  wallet.availableBalance
                )}
              </p>

            </div>

            <label className="mt-5 block text-sm font-black">
              Withdrawal Amount
            </label>

            <input
              type="number"
              min="1"
              max={
                wallet.availableBalance
              }
              value={
                withdrawalAmount
              }
              onChange={(
                event
              ) =>
                setWithdrawalAmount(
                  event.target.value
                )
              }
              placeholder="Enter amount"
              className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3"
            />

            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={
                  requestingWithdrawal
                }
                onClick={() =>
                  setWithdrawalModalOpen(
                    false
                  )
                }
                className="rounded-xl border border-slate-300 py-3 font-black"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  requestingWithdrawal
                }
                onClick={() =>
                  void requestWithdrawal()
                }
                className="rounded-xl bg-emerald-700 py-3 font-black text-white disabled:bg-slate-400"
              >
                {requestingWithdrawal
                  ? "Submitting..."
                  : "Submit"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}