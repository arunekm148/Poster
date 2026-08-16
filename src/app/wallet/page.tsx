"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AgentUser = {
  id: string;
  name?: string;
  role?: string;
};

type PosterWalletSummary = {
  availableBalance: number;
  totalEarned: number;
  totalPending: number;
  totalWithdrawn: number;
};

export default function WalletPage() {
  const [user, setUser] =
    useState<AgentUser | null>(null);

  const [posterWallet, setPosterWallet] =
    useState<PosterWalletSummary>({
      availableBalance: 0,
      totalEarned: 0,
      totalPending: 0,
      totalWithdrawn: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

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

        setLoading(false);
        return;
      }

      const parsed: AgentUser =
        JSON.parse(savedUser);

      if (!parsed?.id) {
        setMessage(
          "User session not found."
        );

        setLoading(false);
        return;
      }

      setUser(parsed);

      void loadPosterWallet(
        parsed.id
      );
    } catch (error) {
      console.error(
        "WALLET USER ERROR:",
        error
      );

      setMessage(
        "Unable to load wallet."
      );

      setLoading(false);
    }
  }, []);

  async function loadPosterWallet(
    userId: string
  ) {
    try {
      setLoading(true);

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
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Unable to load Poster Wallet."
        );
      }

      const wallet =
        data.wallet || {};

      setPosterWallet({
        availableBalance:
          Number(
            wallet.availableBalance ||
              0
          ),

        totalEarned:
          Number(
            wallet.totalEarned ||
              0
          ),

        totalPending:
          Number(
            wallet.totalPending ||
              0
          ),

        totalWithdrawn:
          Number(
            wallet.totalWithdrawn ||
              0
          ),
      });
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
      setLoading(false);
    }
  }

  function formatMoney(
    value: number
  ) {
    return `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits:
          2,
      }
    )}`;
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">

        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            💰
          </div>

          <p className="mt-3 font-black text-slate-700">
            Loading Wallet...
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-20 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

          <div className="flex items-center gap-4">

            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                Agent Account
              </p>

              <h1 className="text-2xl font-black">
                💰 Wallet
              </h1>

              <p className="mt-1 text-sm font-semibold text-blue-200">
                Manage all your earnings wallets
              </p>

            </div>

          </div>

          {user?.name && (
            <div className="hidden rounded-xl bg-white/10 px-4 py-2 text-sm font-black sm:block">
              {user.name}
            </div>
          )}

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {message && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {message}
          </div>
        )}

        <div>

          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            Your Wallets
          </p>

          <h2 className="mt-1 text-xl font-black">
            Earnings & Withdrawals
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Each earning source will have its own wallet.
          </p>

        </div>

        {/* POSTER WALLET */}

        <Link
          href="/wallet/poster"
          className="mt-6 block overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 via-indigo-800 to-violet-800 text-white shadow-lg transition hover:-translate-y-0.5"
        >

          <div className="p-5 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">
                  🖼️
                </div>

                <p className="mt-4 text-xs font-black uppercase tracking-wider text-blue-200">
                  Poster Earnings
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Poster Wallet
                </h3>

              </div>

              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                Open →
              </span>

            </div>

            <div className="mt-6">

              <p className="text-sm font-semibold text-blue-200">
                Available Balance
              </p>

              <p className="mt-1 text-4xl font-black">
                {formatMoney(
                  posterWallet.availableBalance
                )}
              </p>

            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">

              <div className="rounded-2xl bg-white/10 p-3">

                <p className="text-[10px] font-black uppercase text-blue-200">
                  Earned
                </p>

                <p className="mt-1 font-black">
                  {formatMoney(
                    posterWallet.totalEarned
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-white/10 p-3">

                <p className="text-[10px] font-black uppercase text-blue-200">
                  Pending
                </p>

                <p className="mt-1 font-black">
                  {formatMoney(
                    posterWallet.totalPending
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-white/10 p-3">

                <p className="text-[10px] font-black uppercase text-blue-200">
                  Withdrawn
                </p>

                <p className="mt-1 font-black">
                  {formatMoney(
                    posterWallet.totalWithdrawn
                  )}
                </p>

              </div>

            </div>

          </div>

        </Link>

        {/* FUTURE WALLETS */}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">

            <div className="text-3xl">
              🔒
            </div>

            <h3 className="mt-3 font-black">
              Future Wallet
            </h3>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Additional earning wallets can be added here later.
            </p>

          </div>

          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">

            <div className="text-3xl">
              ➕
            </div>

            <h3 className="mt-3 font-black">
              More Wallets
            </h3>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              The Wallet section is ready for future earning categories.
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}