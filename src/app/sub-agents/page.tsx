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

type Staff = {
  id: string;
  staffCode?: string | null;
  name: string;
  staffRole?: string | null;
  designation?: string | null;
  department?: string | null;
  isActive?: boolean;
};

type AssignmentHistory = {
  id: string;

  subAgentId: string;
  ownerUserId: string;

  fromStaffId?: string | null;
  toStaffId?: string | null;

  changedByType?: string | null;
  changedByUserId?: string | null;
  changedByStaffId?: string | null;
  changedByName?: string | null;

  reason?: string | null;
  createdAt?: string | null;

  fromStaff?: {
    id: string;
    staffCode?: string | null;
    name?: string | null;
    staffRole?: string | null;
  } | null;

  toStaff?: {
    id: string;
    staffCode?: string | null;
    name?: string | null;
    staffRole?: string | null;
  } | null;

  changedByStaff?: {
    id: string;
    staffCode?: string | null;
    name?: string | null;
    staffRole?: string | null;
  } | null;
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

  assignedStaffId?: string | null;

  assignedStaff?: {
    id: string;
    staffCode?: string | null;
    name?: string | null;
    staffRole?: string | null;
    designation?: string | null;
    department?: string | null;
    isActive?: boolean;
  } | null;

  assignmentType?:
    | "STAFF"
    | "AGENT_DIRECT"
    | string;

  assignmentHistory?: AssignmentHistory[];

  createdAt?: string | null;
  updatedAt?: string | null;

  _count?: {
    customers?: number;
    policies?: number;
  };
};

type FilterType =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "AGENT_DIRECT"
  | "STAFF_ASSIGNED";

type ApiResponse = {
  success?: boolean;
  message?: string;
  subAgents?: SubAgent[];
  subAgent?: SubAgent;
};

type StaffApiResponse = {
  success?: boolean;
  message?: string;
  staffs?: Staff[];
  staff?: Staff[];
  data?: Staff[];
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

function formatDateTime(
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
      hour12: true,
    }
  );
}

function staffLabel(
  staff?: {
    staffCode?: string | null;
    name?: string | null;
  } | null
) {
  if (!staff) {
    return "Agent Direct";
  }

  return [
    staff.staffCode,
    staff.name,
  ]
    .filter(Boolean)
    .join(" - ");
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
    staffs,
    setStaffs,
  ] =
    useState<Staff[]>(
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
    successMessage,
    setSuccessMessage,
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

  const [
    staffFilter,
    setStaffFilter,
  ] =
    useState("");

  const [
    transferTarget,
    setTransferTarget,
  ] =
    useState<SubAgent | null>(
      null
    );

  const [
    transferStaffId,
    setTransferStaffId,
  ] =
    useState("");

  const [
    transferReason,
    setTransferReason,
  ] =
    useState("");

  const [
    transferSaving,
    setTransferSaving,
  ] =
    useState(false);

  const [
    historyTarget,
    setHistoryTarget,
  ] =
    useState<SubAgent | null>(
      null
    );

  const [
    historyItems,
    setHistoryItems,
  ] =
    useState<AssignmentHistory[]>(
      []
    );

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD SUB AGENTS                                                          */
  /* ------------------------------------------------------------------------ */

  const loadSubAgents =
    useCallback(
      async (
        userId: string
      ) => {
        try {
          setLoading(true);
          setMessage("");

          const response =
            await fetch(
              `/api/sub-agents?userId=${encodeURIComponent(
                userId
              )}&activeOnly=false`,
              {
                method: "GET",
                cache:
                  "no-store",
              }
            );

          let data:
            ApiResponse =
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
                "Unable to load sub agents."
            );
          }

          setSubAgents(
            Array.isArray(
              data.subAgents
            )
              ? data.subAgents
              : []
          );
        } catch (error) {
          console.error(
            "LOAD SUB AGENTS ERROR:",
            error
          );

          setSubAgents([]);

          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load sub agents."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD STAFF                                                               */
  /* ------------------------------------------------------------------------ */

  const loadStaff =
    useCallback(
      async (
        userId: string
      ) => {
        try {
          const response =
            await fetch(
              `/api/staff?userId=${encodeURIComponent(
                userId
              )}`,
              {
                method: "GET",
                cache:
                  "no-store",
              }
            );

          let data:
            StaffApiResponse =
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
                "Unable to load Staff."
            );
          }

          const list =
            Array.isArray(
              data.staffs
            )
              ? data.staffs
              : Array.isArray(
                    data.staff
                  )
                ? data.staff
                : Array.isArray(
                      data.data
                    )
                  ? data.data
                  : [];

          setStaffs(
            list.filter(
              (item) =>
                item.isActive !==
                false
            )
          );
        } catch (error) {
          console.error(
            "LOAD STAFF ERROR:",
            error
          );

          /*
           * Sub-Agent page remains usable even if
           * the Staff list cannot be loaded.
           */
          setStaffs([]);
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

      setUser(parsed);

      localStorage.setItem(
        "userId",
        parsed.id
      );

      void Promise.all([
        loadSubAgents(
          parsed.id
        ),
        loadStaff(
          parsed.id
        ),
      ]);
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
    loadStaff,
  ]);

  /* ------------------------------------------------------------------------ */
  /* COUNTS                                                                   */
  /* ------------------------------------------------------------------------ */

  const activeCount =
    useMemo(
      () =>
        subAgents.filter(
          (item) =>
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
          (item) =>
            item.isActive ===
            false
        ).length,
      [
        subAgents,
      ]
    );

  const agentDirectCount =
    useMemo(
      () =>
        subAgents.filter(
          (item) =>
            !item.assignedStaffId
        ).length,
      [
        subAgents,
      ]
    );

  const staffAssignedCount =
    useMemo(
      () =>
        subAgents.filter(
          (item) =>
            Boolean(
              item.assignedStaffId
            )
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
        (item) => {
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

          if (
            filter ===
              "AGENT_DIRECT" &&
            item.assignedStaffId
          ) {
            return false;
          }

          if (
            filter ===
              "STAFF_ASSIGNED" &&
            !item.assignedStaffId
          ) {
            return false;
          }

          if (
            staffFilter &&
            item.assignedStaffId !==
              staffFilter
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
              item.assignedStaff
                ?.name,
              item.assignedStaff
                ?.staffCode,
              item.assignedStaff
                ?.designation,
              item.assignedStaff
                ?.department,
            ]
              .filter(Boolean)
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
      staffFilter,
    ]);

  /* ------------------------------------------------------------------------ */
  /* TRANSFER                                                                 */
  /* ------------------------------------------------------------------------ */

  function openTransfer(
    subAgent: SubAgent
  ) {
    setTransferTarget(
      subAgent
    );

    setTransferStaffId(
      subAgent.assignedStaffId ||
      ""
    );

    setTransferReason("");
    setMessage("");
    setSuccessMessage("");
  }

  function closeTransfer() {
    if (
      transferSaving
    ) {
      return;
    }

    setTransferTarget(null);
    setTransferStaffId("");
    setTransferReason("");
  }

  async function saveTransfer() {
    if (
      !transferTarget ||
      !user?.id
    ) {
      return;
    }

    const currentStaffId =
      transferTarget.assignedStaffId ||
      "";

    if (
      currentStaffId ===
      transferStaffId
    ) {
      setMessage(
        "Please select a different Staff member or Agent Direct."
      );

      return;
    }

    try {
      setTransferSaving(true);
      setMessage("");
      setSuccessMessage("");

      const response =
        await fetch(
          "/api/sub-agents",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "TRANSFER_STAFF",

                userId:
                  user.id,

                subAgentId:
                  transferTarget.id,

                assignedStaffId:
                  transferStaffId ||
                  null,

                reason:
                  transferReason.trim() ||
                  null,
              }),
          }
        );

      let data:
        {
          success?: boolean;
          message?: string;
          subAgent?: SubAgent;
        } =
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
            "Unable to transfer Sub-Agent."
        );
      }

      setSuccessMessage(
        data.message ||
          "Sub-Agent assignment updated successfully."
      );

      closeTransfer();

      await loadSubAgents(
        user.id
      );
    } catch (error) {
      console.error(
        "TRANSFER SUB AGENT ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to transfer Sub-Agent."
      );
    } finally {
      setTransferSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* HISTORY                                                                  */
  /* ------------------------------------------------------------------------ */

  async function openHistory(
    subAgent: SubAgent
  ) {
    if (!user?.id) {
      return;
    }

    try {
      setHistoryTarget(
        subAgent
      );

      setHistoryItems([]);
      setHistoryLoading(true);
      setMessage("");

      const response =
        await fetch(
          `/api/sub-agents?userId=${encodeURIComponent(
            user.id
          )}&subAgentId=${encodeURIComponent(
            subAgent.id
          )}&includeHistory=true`,
          {
            cache:
              "no-store",
          }
        );

      let data:
        ApiResponse =
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
            "Unable to load assignment history."
        );
      }

      setHistoryItems(
        Array.isArray(
          data.subAgent
            ?.assignmentHistory
        )
          ? data.subAgent
              ?.assignmentHistory ||
              []
          : []
      );
    } catch (error) {
      console.error(
        "LOAD SUB AGENT HISTORY ERROR:",
        error
      );

      setHistoryItems([]);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load assignment history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

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
              Manage, assign and transfer your Sub-Agent network
            </p>

          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-4 py-6">

        {/* SUMMARY */}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">

          <SummaryButton
            label="Total"
            value={
              subAgents.length
            }
            active={
              filter === "ALL"
            }
            onClick={() =>
              setFilter("ALL")
            }
            activeClass="border-blue-300 bg-blue-50"
            valueClass="text-slate-950"
          />

          <SummaryButton
            label="Active"
            value={
              activeCount
            }
            active={
              filter === "ACTIVE"
            }
            onClick={() =>
              setFilter(
                "ACTIVE"
              )
            }
            activeClass="border-emerald-300 bg-emerald-50"
            valueClass="text-emerald-700"
          />

          <SummaryButton
            label="Inactive"
            value={
              inactiveCount
            }
            active={
              filter === "INACTIVE"
            }
            onClick={() =>
              setFilter(
                "INACTIVE"
              )
            }
            activeClass="border-red-300 bg-red-50"
            valueClass="text-red-700"
          />

          <SummaryButton
            label="Agent Direct"
            value={
              agentDirectCount
            }
            active={
              filter ===
              "AGENT_DIRECT"
            }
            onClick={() =>
              setFilter(
                "AGENT_DIRECT"
              )
            }
            activeClass="border-amber-300 bg-amber-50"
            valueClass="text-amber-700"
          />

          <SummaryButton
            label="With Staff"
            value={
              staffAssignedCount
            }
            active={
              filter ===
              "STAFF_ASSIGNED"
            }
            onClick={() =>
              setFilter(
                "STAFF_ASSIGNED"
              )
            }
            activeClass="border-violet-300 bg-violet-50"
            valueClass="text-violet-700"
          />

        </div>

        {/* SEARCH + FILTER + ADD */}

        <div className="mt-5 rounded-3xl border bg-white p-4 shadow-sm">

          <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, code, mobile, district or Staff..."
              className="min-w-0 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
            />

            <select
              value={
                staffFilter
              }
              onChange={(
                event
              ) =>
                setStaffFilter(
                  event.target.value
                )
              }
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="">
                All Staff / Agent Direct
              </option>

              {staffs.map(
                (staff) => (
                  <option
                    key={
                      staff.id
                    }
                    value={
                      staff.id
                    }
                  >
                    {staffLabel(
                      staff
                    )}
                  </option>
                )
              )}

            </select>

            <Link
              href="/sub-agents/add"
              className="rounded-xl bg-violet-700 px-5 py-3 text-center text-sm font-black text-white hover:bg-violet-800"
            >
              + Add Sub Agent
            </Link>

          </div>

          <div className="mt-3 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() => {
                setFilter("ALL");
                setStaffFilter("");
                setSearch("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"
            >
              Clear Filters
            </button>

          </div>

        </div>

        {/* SUCCESS */}

        {successMessage && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            ✅ {successMessage}
          </div>
        )}

        {/* ERROR */}

        {message && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            ⚠️ {message}
          </div>
        )}

        {/* LIST */}

        <div className="mt-5">

          {loading ? (
            <div className="rounded-3xl border bg-white p-10 text-center font-bold text-slate-600">
              Loading Sub-Agents...
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
                Add a new Sub-Agent or clear the current filters.
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
                (item) => {
                  const phone =
                    cleanPhone(
                      item.phone
                    );

                  const whatsapp =
                    whatsappPhone(
                      item.whatsapp ||
                        item.phone
                    );

                  const assigned =
                    Boolean(
                      item.assignedStaffId
                    );

                  return (
                    <article
                      key={
                        item.id
                      }
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        {/* INFO */}

                        <div className="flex min-w-0 items-start gap-3">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-black text-violet-800">
                            {item.name
                              ?.trim()
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              "S"}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h2 className="font-black text-slate-950">
                                {item.name}
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
                                Code: {item.code}
                              </p>
                            )}

                            {item.phone && (
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                📱 {item.phone}
                              </p>
                            )}

                            {item.email && (
                              <p className="mt-1 break-all text-xs text-slate-500">
                                ✉️ {item.email}
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

                            <div
                              className={`mt-3 rounded-xl border p-3 ${
                                assigned
                                  ? "border-violet-200 bg-violet-50"
                                  : "border-amber-200 bg-amber-50"
                              }`}
                            >
                              <p
                                className={`text-[10px] font-black uppercase tracking-wide ${
                                  assigned
                                    ? "text-violet-700"
                                    : "text-amber-700"
                                }`}
                              >
                                Current Assignment
                              </p>

                              <p
                                className={`mt-1 text-sm font-black ${
                                  assigned
                                    ? "text-violet-950"
                                    : "text-amber-950"
                                }`}
                              >
                                {assigned
                                  ? `👨‍💼 ${staffLabel(
                                      item.assignedStaff
                                    )}`
                                  : "👤 Agent Direct"}
                              </p>

                              {item.assignedStaff
                                ?.designation && (
                                <p className="mt-1 text-xs font-semibold text-violet-700">
                                  {
                                    item.assignedStaff.designation
                                  }
                                </p>
                              )}

                            </div>

                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">

                              <span>
                                Customers:{" "}
                                {item._count
                                  ?.customers ??
                                  0}
                              </span>

                              <span>
                                Policies:{" "}
                                {item._count
                                  ?.policies ??
                                  0}
                              </span>

                              {item.createdAt && (
                                <span>
                                  Added{" "}
                                  {formatDate(
                                    item.createdAt
                                  )}
                                </span>
                              )}

                            </div>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex flex-wrap gap-2 lg:max-w-[420px] lg:justify-end">

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

                          <button
                            type="button"
                            onClick={() =>
                              openTransfer(
                                item
                              )
                            }
                            className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white"
                          >
                            {assigned
                              ? "Transfer"
                              : "Assign Staff"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void openHistory(
                                item
                              )
                            }
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700"
                          >
                            History
                          </button>

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

      {/* TRANSFER MODAL */}

      {transferTarget && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="border-b p-5">

              <div className="flex items-start justify-between gap-3">

                <div>

                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Sub-Agent Assignment
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {transferTarget.code
                      ? `${transferTarget.code} - `
                      : ""}
                    {transferTarget.name}
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    closeTransfer
                  }
                  disabled={
                    transferSaving
                  }
                  className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-700"
                >
                  ✕
                </button>

              </div>

            </div>

            <div className="space-y-4 p-5">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-black uppercase text-slate-500">
                  Current Assignment
                </p>

                <p className="mt-1 font-black text-slate-950">
                  {transferTarget.assignedStaffId
                    ? staffLabel(
                        transferTarget.assignedStaff
                      )
                    : "Agent Direct"}
                </p>

              </div>

              <div>

                <label className="block text-sm font-black text-slate-950">
                  Transfer To *
                </label>

                <select
                  value={
                    transferStaffId
                  }
                  onChange={(
                    event
                  ) =>
                    setTransferStaffId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-950"
                >
                  <option value="">
                    👤 Agent Direct
                  </option>

                  {staffs.map(
                    (staff) => (
                      <option
                        key={
                          staff.id
                        }
                        value={
                          staff.id
                        }
                      >
                        👨‍💼{" "}
                        {staffLabel(
                          staff
                        )}
                        {staff.staffRole ===
                        "SUPERVISOR"
                          ? " (Supervisor)"
                          : ""}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="block text-sm font-black text-slate-950">
                  Transfer Reason
                </label>

                <textarea
                  rows={3}
                  value={
                    transferReason
                  }
                  onChange={(
                    event
                  ) =>
                    setTransferReason(
                      event.target.value
                    )
                  }
                  placeholder="Example: Territory change, workload balance, handled directly by Agent..."
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-950"
                />

              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                Existing policies and historical production are not rewritten. This changes the Sub-Agent's current assignment and saves a permanent transfer-history record.
              </div>

            </div>

            <div className="flex gap-3 border-t p-5">

              <button
                type="button"
                onClick={
                  closeTransfer
                }
                disabled={
                  transferSaving
                }
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void saveTransfer()
                }
                disabled={
                  transferSaving
                }
                className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {transferSaving
                  ? "Saving..."
                  : transferStaffId
                    ? "Save Assignment"
                    : "Move to Agent Direct"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* HISTORY MODAL */}

      {historyTarget && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/50 p-3 sm:items-center">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-white p-5">

              <div>

                <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                  Assignment History
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950">
                  {historyTarget.code
                    ? `${historyTarget.code} - `
                    : ""}
                  {historyTarget.name}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setHistoryTarget(
                    null
                  )
                }
                className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-700"
              >
                ✕
              </button>

            </div>

            <div className="p-5">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-xs font-black uppercase text-slate-500">
                  Current Assignment
                </p>

                <p className="mt-1 font-black text-slate-950">
                  {historyTarget.assignedStaffId
                    ? staffLabel(
                        historyTarget.assignedStaff
                      )
                    : "Agent Direct"}
                </p>

              </div>

              {historyLoading ? (
                <div className="mt-4 rounded-xl border p-6 text-center font-bold text-slate-500">
                  Loading assignment history...
                </div>
              ) : historyItems.length ===
                0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">

                  <p className="font-black text-amber-900">
                    No transfer history yet
                  </p>

                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    This Sub-Agent has not been transferred since assignment tracking was enabled.
                  </p>

                </div>
              ) : (
                <div className="mt-4 space-y-3">

                  {historyItems.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >

                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div>

                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              {index ===
                              0
                                ? "Latest Transfer"
                                : "Transfer"}
                            </p>

                            <p className="mt-1 font-black text-slate-950">
                              {staffLabel(
                                item.fromStaff
                              )}
                              {" → "}
                              {staffLabel(
                                item.toStaff
                              )}
                            </p>

                          </div>

                          <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-800">
                            {formatDateTime(
                              item.createdAt
                            )}
                          </span>

                        </div>

                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-black uppercase text-slate-500">
                              Changed By
                            </p>

                            <p className="mt-1 font-black text-slate-900">
                              {item.changedByName ||
                                item.changedByStaff?.name ||
                                "Previous record"}
                            </p>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {item.changedByType ||
                                "-"}
                            </p>

                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-black uppercase text-slate-500">
                              Reason
                            </p>

                            <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-800">
                              {item.reason ||
                                "No reason entered"}
                            </p>

                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

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

/* -------------------------------------------------------------------------- */
/* SUMMARY BUTTON                                                             */
/* -------------------------------------------------------------------------- */

function SummaryButton({
  label,
  value,
  active,
  onClick,
  activeClass,
  valueClass,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  valueClass: string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-2xl border p-4 text-left shadow-sm ${
        active
          ? activeClass
          : "bg-white"
      }`}
    >
      <p className="text-xs font-bold text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-black ${valueClass}`}
      >
        {value}
      </p>
    </button>
  );
}
