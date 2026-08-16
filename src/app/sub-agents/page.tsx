"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AgentUser = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
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

type FilterType =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

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

function whatsappPhone(
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

  return `91${digits.slice(-10)}`;
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

export default function SubAgentsPage() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<AgentUser | null>(
      null
    );

  const [
    subAgents,
    setSubAgents,
  ] =
    useState<SubAgent[]>(
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
    search,
    setSearch,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "ALL"
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD SUB AGENTS                                                          */
  /* ------------------------------------------------------------------------ */

  const loadSubAgents =
    useCallback(
      async (
        userId: string
      ) => {
        try {
          setLoading(
            true
          );

          setMessage("");

          const response =
            await fetch(
              `/api/sub-agents?userId=${encodeURIComponent(
                userId
              )}`,
              {
                method: "GET",
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

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Unable to load sub agents."
            );
          }

          if (
            data.success ===
            false
          ) {
            throw new Error(
              data.message ||
                "Unable to load sub agents."
            );
          }

          if (
            Array.isArray(
              data
            )
          ) {
            setSubAgents(
              data
            );

            return;
          }

          if (
            Array.isArray(
              data.subAgents
            )
          ) {
            setSubAgents(
              data.subAgents
            );

            return;
          }

          if (
            Array.isArray(
              data.subagents
            )
          ) {
            setSubAgents(
              data.subagents
            );

            return;
          }

          if (
            Array.isArray(
              data.data
            )
          ) {
            setSubAgents(
              data.data
            );

            return;
          }

          setSubAgents(
            []
          );
        } catch (error) {
          console.error(
            "LOAD SUB AGENTS ERROR:",
            error
          );

          setSubAgents(
            []
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load sub agents."
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
  /* LOAD USER                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
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

      setUser(
        parsed
      );

      localStorage.setItem(
        "userId",
        parsed.id
      );

      void loadSubAgents(
        parsed.id
      );
    } catch (error) {
      console.error(
        "LOAD USER ERROR:",
        error
      );

      router.replace(
        "/login"
      );
    }
  }, [
    router,
    loadSubAgents,
  ]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const activeCount =
    useMemo(
      () =>
        subAgents.filter(
          (
            item
          ) =>
            item.isActive !==
            false
        ).length,
      [
        subAgents,
      ]
    );

  const inactiveCount =
    useMemo(
      () =>
        subAgents.filter(
          (
            item
          ) =>
            item.isActive ===
            false
        ).length,
      [
        subAgents,
      ]
    );

  /* ------------------------------------------------------------------------ */
  /* FILTERED LIST                                                            */
  /* ------------------------------------------------------------------------ */

  const filteredSubAgents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return subAgents.filter(
        (
          item
        ) => {
          if (
            filter ===
              "ACTIVE" &&
            item.isActive ===
              false
          ) {
            return false;
          }

          if (
            filter ===
              "INACTIVE" &&
            item.isActive !==
              false
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack =
            [
              item.code,
              item.name,
              item.phone,
              item.whatsapp,
              item.email,
              item.district,
              item.state,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();

          return haystack.includes(
            query
          );
        }
      );
    }, [
      subAgents,
      filter,
      search,
    ]);

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">

          <div>

            <p className="text-xs font-semibold text-blue-200">
              Agent Platform
            </p>

            <h1 className="text-2xl font-black">
              Sub Agents
            </h1>

            <p className="mt-1 text-xs text-blue-200">
              Manage your sub-agent network
            </p>

          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-4 py-6">

        {/* SUMMARY */}

        <div className="grid grid-cols-3 gap-3">

          <button
            type="button"
            onClick={() =>
              setFilter(
                "ALL"
              )
            }
            className={`rounded-2xl border p-4 text-left shadow-sm ${
              filter ===
              "ALL"
                ? "border-blue-300 bg-blue-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-bold text-slate-500">
              Total
            </p>

            <p className="mt-1 text-2xl font-black text-slate-950">
              {
                subAgents.length
              }
            </p>

          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "ACTIVE"
              )
            }
            className={`rounded-2xl border p-4 text-left shadow-sm ${
              filter ===
              "ACTIVE"
                ? "border-emerald-300 bg-emerald-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-bold text-emerald-700">
              Active
            </p>

            <p className="mt-1 text-2xl font-black text-emerald-700">
              {activeCount}
            </p>

          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "INACTIVE"
              )
            }
            className={`rounded-2xl border p-4 text-left shadow-sm ${
              filter ===
              "INACTIVE"
                ? "border-red-300 bg-red-50"
                : "bg-white"
            }`}
          >

            <p className="text-xs font-bold text-red-700">
              Inactive
            </p>

            <p className="mt-1 text-2xl font-black text-red-700">
              {inactiveCount}
            </p>

          </button>

        </div>

        {/* SEARCH + ADD */}

        <div className="mt-5 rounded-3xl border bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 sm:flex-row">

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, code, mobile, district..."
              className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
            />

            <Link
              href="/sub-agents/add"
              className="rounded-xl bg-violet-700 px-5 py-3 text-center text-sm font-black text-white hover:bg-violet-800"
            >
              + Add Sub Agent
            </Link>

          </div>

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {message}
          </div>
        )}

        {/* LIST */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center font-bold text-slate-600">
              Loading sub agents...
            </div>
          ) : filteredSubAgents.length ===
            0 ? (
            <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">

              <div className="text-5xl">
                🤝
              </div>

              <h2 className="mt-4 text-lg font-black text-slate-950">
                No Sub Agents Found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Add a new sub agent to start building your network.
              </p>

              <Link
                href="/sub-agents/add"
                className="mt-5 inline-block rounded-xl bg-violet-700 px-6 py-3 text-sm font-black text-white"
              >
                + Add Sub Agent
              </Link>

            </div>
          ) : (
            <div className="space-y-3">

              {filteredSubAgents.map(
                (
                  item
                ) => {
                  const phone =
                    cleanPhone(
                      item.phone
                    );

                  const whatsapp =
                    whatsappPhone(
                      item.whatsapp ||
                        item.phone
                    );

                  return (
                    <article
                      key={
                        item.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        {/* INFO */}

                        <div className="flex min-w-0 items-start gap-3">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-black text-violet-800">
                            {item.name
                              ?.trim()
                              ?.charAt(
                                0
                              )
                              ?.toUpperCase() ||
                              "S"}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="font-black text-slate-950">
                                {
                                  item.name
                                }
                              </h2>

                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                  item.isActive ===
                                  false
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {item.isActive ===
                                false
                                  ? "INACTIVE"
                                  : "ACTIVE"}
                              </span>

                            </div>

                            {item.code && (
                              <p className="mt-1 text-xs font-bold text-violet-700">
                                Code:{" "}
                                {
                                  item.code
                                }
                              </p>
                            )}

                            {item.phone && (
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                📱{" "}
                                {
                                  item.phone
                                }
                              </p>
                            )}

                            {item.email && (
                              <p className="mt-1 break-all text-xs text-slate-500">
                                ✉️{" "}
                                {
                                  item.email
                                }
                              </p>
                            )}

                            {(item.district ||
                              item.state) && (
                              <p className="mt-1 text-xs text-slate-500">
                                📍{" "}
                                {[
                                  item.district,
                                  item.state,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ", "
                                  )}
                              </p>
                            )}

                            {item.createdAt && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                Added{" "}
                                {formatDate(
                                  item.createdAt
                                )}
                              </p>
                            )}

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2">

                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700"
                            >
                              📞 Call
                            </a>
                          )}

                          {whatsapp && (
                            <a
                              href={`https://wa.me/${whatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"
                            >
                              WhatsApp
                            </a>
                          )}

                          <Link
                            href={`/sub-agents/${item.id}`}
                            className="rounded-xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-700"
                          >
                            View
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

        <div className="grid h-16 grid-cols-5">

          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span className="text-lg">
              🏠
            </span>

            <span className="text-xs">
              Home
            </span>
          </Link>

          <Link
            href="/customers"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span className="text-lg">
              👥
            </span>

            <span className="text-xs">
              Customers
            </span>
          </Link>

          <Link
            href="/sub-agents/add"
            className="flex flex-col items-center justify-center"
          >
            <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-violet-700 text-2xl text-white shadow-lg">
              +
            </div>

            <span className="mt-1 text-xs text-slate-600">
              Add
            </span>
          </Link>

          <Link
            href="/sub-agents"
            className="flex flex-col items-center justify-center text-violet-700"
          >
            <span className="text-lg">
              🤝
            </span>

            <span className="text-xs">
              Sub Agents
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center text-slate-600"
          >
            <span className="text-lg">
              👤
            </span>

            <span className="text-xs">
              Profile
            </span>
          </Link>

        </div>

      </nav>

    </main>
  );
}