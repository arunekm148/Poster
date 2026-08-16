"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AccountMode =
  | "SELF"
  | "SELF_STAFF"
  | "SELF_STAFF_SUBAGENT";

type AdminUser = {
  id: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role?: string;
};

type Agent = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;

  role: "AGENT" | "ADMIN";
  accountMode?: AccountMode;

  logoUrl?: string | null;

  address?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt?: string;

  _count?: {
    customers?: number;
    policies?: number;
    downloads?: number;
    staffs?: number;
    subAgents?: number;
  };
};

type CreateAgentForm = {
  name: string;
  phone: string;
  email: string;
  state: string;
  district: string;
  address: string;
  pincode: string;
  password: string;
  confirmPassword: string;
  accountMode: AccountMode;
};

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const EMPTY_CREATE_FORM: CreateAgentForm = {
  name: "",
  phone: "",
  email: "",
  state: "",
  district: "",
  address: "",
  pincode: "",
  password: "",
  confirmPassword: "",
  accountMode: "SELF",
};

const ACCOUNT_MODES: {
  value: AccountMode;
  title: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: "SELF",
    title: "Self",
    description: "Own business management only.",
    emoji: "👤",
  },
  {
    value: "SELF_STAFF",
    title: "Self + Staff",
    description: "Own business plus staff management.",
    emoji: "👥",
  },
  {
    value: "SELF_STAFF_SUBAGENT",
    title: "Self + Staff + Sub Agent",
    description:
      "Own business, staff and sub-agent management.",
    emoji: "🏢",
  },
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function displayPhone(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "-";

  const mobile =
    digits.length > 10 ? digits.slice(-10) : digits;

  return `+91 ${mobile}`;
}

function accountModeLabel(mode?: AccountMode) {
  if (mode === "SELF_STAFF") {
    return "Self + Staff";
  }

  if (mode === "SELF_STAFF_SUBAGENT") {
    return "Self + Staff + Sub Agent";
  }

  return "Self";
}

function accountModeDescription(mode?: AccountMode) {
  if (mode === "SELF_STAFF") {
    return "Own business + staff management";
  }

  if (mode === "SELF_STAFF_SUBAGENT") {
    return "Own business + staff + sub-agent management";
  }

  return "Own business only";
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminAgentsPage() {
  const [admin, setAdmin] =
    useState<AdminUser | null>(null);

  const [agents, setAgents] =
    useState<Agent[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [actionUserId, setActionUserId] =
    useState<string | null>(null);

  /* CREATE */

  const [createOpen, setCreateOpen] =
    useState(false);

  const [createForm, setCreateForm] =
    useState<CreateAgentForm>(EMPTY_CREATE_FORM);

  const [creatingAgent, setCreatingAgent] =
    useState(false);

  /* PASSWORD */

  const [resetAgent, setResetAgent] =
    useState<Agent | null>(null);

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [resettingPassword, setResettingPassword] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD ADMIN                                                               */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("agentUser");

      if (!savedUser) {
        setMessage("Please login as Admin.");
        setLoading(false);
        return;
      }

      const parsed: AdminUser =
        JSON.parse(savedUser);

      if (
        !parsed?.id ||
        parsed.role !== "ADMIN"
      ) {
        setMessage("Admin access only.");
        setLoading(false);
        return;
      }

      setAdmin(parsed);

      void loadAgents(parsed.id);
    } catch (error) {
      console.error(
        "ADMIN SESSION ERROR:",
        error
      );

      setMessage(
        "Unable to load admin session."
      );

      setLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* LOAD AGENTS                                                              */
  /* ------------------------------------------------------------------------ */

  async function loadAgents(adminId?: string) {
    try {
      const currentAdminId =
        adminId || admin?.id;

      if (!currentAdminId) return;

      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/admin/agents?adminId=${encodeURIComponent(
          currentAdminId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to load registered agents."
        );
      }

      setAgents(
        Array.isArray(data.agents)
          ? data.agents
          : []
      );
    } catch (error) {
      console.error(
        "LOAD AGENTS ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load registered agents."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* FILTER                                                                   */
  /* ------------------------------------------------------------------------ */

  const filteredAgents =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return agents.filter((agent) => {
        if (
          statusFilter === "ACTIVE" &&
          !agent.isActive
        ) {
          return false;
        }

        if (
          statusFilter === "INACTIVE" &&
          agent.isActive
        ) {
          return false;
        }

        if (!query) return true;

        const searchable = [
          agent.name,
          agent.phone,
          agent.email || "",
          agent.state || "",
          agent.district || "",
          accountModeLabel(
            agent.accountMode
          ),
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      });
    }, [
      agents,
      search,
      statusFilter,
    ]);

  const activeCount =
    agents.filter(
      (agent) => agent.isActive
    ).length;

  const inactiveCount =
    agents.length - activeCount;

  /* ------------------------------------------------------------------------ */
  /* CREATE FORM                                                              */
  /* ------------------------------------------------------------------------ */

  function updateCreateField(
    field: keyof CreateAgentForm,
    value: string
  ) {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateAgent() {
    setCreateForm(EMPTY_CREATE_FORM);
    setMessage("");
    setCreateOpen(true);
  }

  function closeCreateAgent() {
    if (creatingAgent) return;

    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE_FORM);
  }

  /* ------------------------------------------------------------------------ */
  /* CREATE AGENT                                                             */
  /* ------------------------------------------------------------------------ */

  async function createAgent() {
    if (!admin?.id) return;

    if (!createForm.name.trim()) {
      alert("Full name is required.");
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        createForm.phone
      )
    ) {
      alert(
        "Please enter a valid 10 digit mobile number."
      );
      return;
    }

    if (!createForm.email.trim()) {
      alert("Email address is required.");
      return;
    }

    if (!createForm.state.trim()) {
      alert("State is required.");
      return;
    }

    if (!createForm.district.trim()) {
      alert("District is required.");
      return;
    }

    if (createForm.password.length < 6) {
      alert(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      createForm.password !==
      createForm.confirmPassword
    ) {
      alert(
        "Password and Confirm Password do not match."
      );
      return;
    }

    try {
      setCreatingAgent(true);

      const response = await fetch(
        "/api/admin/agents",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            adminId: admin.id,

            name:
              createForm.name.trim(),

            phone:
              createForm.phone,

            email:
              createForm.email
                .trim()
                .toLowerCase(),

            state:
              createForm.state.trim(),

            district:
              createForm.district.trim(),

            address:
              createForm.address.trim(),

            pincode:
              createForm.pincode,

            password:
              createForm.password,

            confirmPassword:
              createForm.confirmPassword,

            accountMode:
              createForm.accountMode,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to create agent."
        );
      }

      setMessage(
        data.message ||
          "Agent created successfully."
      );

      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);

      await loadAgents();
    } catch (error) {
      console.error(
        "CREATE AGENT ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to create agent."
      );
    } finally {
      setCreatingAgent(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* CHANGE ACCOUNT MODE                                                      */
  /* ------------------------------------------------------------------------ */

  async function changeAccountMode(
    agent: Agent,
    accountMode: AccountMode
  ) {
    if (!admin?.id) return;

    if (agent.role === "ADMIN") {
      return;
    }

    if (
      (agent.accountMode || "SELF") ===
      accountMode
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Change ${agent.name} to "${accountModeLabel(
          accountMode
        )}"?`
      );

    if (!confirmed) return;

    try {
      setActionUserId(agent.id);

      const response = await fetch(
        "/api/admin/agents",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            adminId: admin.id,
            action: "ACCOUNT_MODE",
            userId: agent.id,
            accountMode,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to change account access."
        );
      }

      setAgents((current) =>
        current.map((item) =>
          item.id === agent.id
            ? {
                ...item,
                accountMode,
              }
            : item
        )
      );

      setMessage(
        data.message ||
          "Account access updated successfully."
      );
    } catch (error) {
      console.error(
        "ACCOUNT MODE ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to change account access."
      );
    } finally {
      setActionUserId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* STATUS                                                                   */
  /* ------------------------------------------------------------------------ */

  async function changeAgentStatus(
    agent: Agent
  ) {
    if (!admin?.id) return;

    if (agent.role === "ADMIN") {
      alert(
        "Admin account status cannot be changed."
      );
      return;
    }

    const nextActive =
      !agent.isActive;

    const confirmed =
      window.confirm(
        nextActive
          ? `Activate ${agent.name}?`
          : `Deactivate ${agent.name}?`
      );

    if (!confirmed) return;

    try {
      setActionUserId(agent.id);

      const response = await fetch(
        "/api/admin/agents",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            adminId: admin.id,
            action: "STATUS",
            userId: agent.id,
            isActive: nextActive,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to update agent."
        );
      }

      setAgents((current) =>
        current.map((item) =>
          item.id === agent.id
            ? {
                ...item,
                isActive: nextActive,
              }
            : item
        )
      );

      setMessage(
        data.message ||
          "Agent status updated."
      );
    } catch (error) {
      console.error(
        "STATUS ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update agent."
      );
    } finally {
      setActionUserId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* PASSWORD RESET                                                           */
  /* ------------------------------------------------------------------------ */

  function openPasswordReset(
    agent: Agent
  ) {
    setResetAgent(agent);
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
  }

  function closePasswordReset() {
    if (resettingPassword) return;

    setResetAgent(null);
    setNewPassword("");
    setConfirmPassword("");
  }

  async function resetPassword() {
    if (!resetAgent || !admin?.id) {
      return;
    }

    if (newPassword.length < 6) {
      alert(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      alert(
        "Password and Confirm Password do not match."
      );
      return;
    }

    if (
      !window.confirm(
        `Reset password for ${resetAgent.name}?`
      )
    ) {
      return;
    }

    try {
      setResettingPassword(true);

      const response = await fetch(
        "/api/admin/agents",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            adminId: admin.id,
            action: "RESET_PASSWORD",
            userId: resetAgent.id,
            password: newPassword,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to reset password."
        );
      }

      setMessage(
        data.message ||
          "Password reset successfully."
      );

      closePasswordReset();
    } catch (error) {
      console.error(
        "PASSWORD ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset password."
      );
    } finally {
      setResettingPassword(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* NO ADMIN                                                                 */
  /* ------------------------------------------------------------------------ */

  if (!loading && !admin) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Admin Access
          </h1>

          <p className="mt-2 font-semibold text-slate-600">
            {message ||
              "Please login as Admin."}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 font-black text-white"
          >
            Go to Login
          </Link>

        </div>

      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-100 pb-20">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-900 text-white">

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">

          <div className="flex items-center gap-4">

            <Link
              href="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-blue-300">
                Master Admin
              </p>

              <h1 className="text-2xl font-black">
                Registered Agents
              </h1>

              <p className="mt-1 text-xs font-semibold text-blue-200">
                Manage agents, packages and account access
              </p>

            </div>

          </div>

          <div className="flex gap-2">

            <button
              onClick={openCreateAgent}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-blue-900"
            >
              + Create Agent
            </button>

            <button
              onClick={() =>
                void loadAgents()
              }
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black"
            >
              ↻ Refresh
            </button>

          </div>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* SUMMARY */}

        <section className="grid gap-3 sm:grid-cols-3">

          <SummaryBox
            label="Registered"
            value={agents.length}
          />

          <SummaryBox
            label="Active"
            value={activeCount}
          />

          <SummaryBox
            label="Inactive"
            value={inactiveCount}
          />

        </section>

        {/* SEARCH */}

        <section className="mt-5 rounded-3xl border bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, mobile, email, location or package..."
              className="rounded-xl border-2 border-slate-300 px-4 py-3"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "ALL"
                    | "ACTIVE"
                    | "INACTIVE"
                )
              }
              className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-bold"
            >
              <option value="ALL">
                All Accounts
              </option>

              <option value="ACTIVE">
                Active Only
              </option>

              <option value="INACTIVE">
                Inactive Only
              </option>

            </select>

          </div>

        </section>

        {message && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-900">
            {message}
          </div>
        )}

        {/* AGENT LIST */}

        <section className="mt-5">

          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center font-bold">
              Loading registered agents...
            </div>
          ) : (
            <div className="space-y-4">

              {filteredAgents.map(
                (agent) => (
                  <article
                    key={agent.id}
                    className="rounded-3xl border bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">

                      {/* DETAILS */}

                      <div className="flex gap-4">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                          👤
                        </div>

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h2 className="text-lg font-black">
                              {agent.name}
                            </h2>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                agent.role === "ADMIN"
                                  ? "bg-violet-100 text-violet-700"
                                  : agent.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {agent.role === "ADMIN"
                                ? "ADMIN"
                                : agent.isActive
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>

                          </div>

                          <p className="mt-1 font-black text-blue-700">
                            {displayPhone(
                              agent.phone
                            )}
                          </p>

                          {agent.email && (
                            <p className="text-sm font-semibold text-slate-600">
                              {agent.email}
                            </p>
                          )}

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {[
                              agent.district,
                              agent.state,
                            ]
                              .filter(Boolean)
                              .join(", ") ||
                              "Location not added"}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Registered{" "}
                            {formatDate(
                              agent.createdAt
                            )}
                          </p>

                          {agent.role !== "ADMIN" && (
                            <div className="mt-3 inline-block rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">

                              <p className="text-[10px] font-black uppercase text-blue-600">
                                Account Access
                              </p>

                              <p className="text-sm font-black text-blue-950">
                                {accountModeLabel(
                                  agent.accountMode
                                )}
                              </p>

                            </div>
                          )}

                        </div>

                      </div>

                      {/* COUNTS */}

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:min-w-[500px]">

                        <CountBox
                          label="Customers"
                          value={
                            agent._count?.customers ??
                            0
                          }
                        />

                        <CountBox
                          label="Policies"
                          value={
                            agent._count?.policies ??
                            0
                          }
                        />

                        <CountBox
                          label="Downloads"
                          value={
                            agent._count?.downloads ??
                            0
                          }
                        />

                        <CountBox
                          label="Staff"
                          value={
                            agent._count?.staffs ??
                            0
                          }
                        />

                        <CountBox
                          label="Sub Agents"
                          value={
                            agent._count?.subAgents ??
                            0
                          }
                        />

                      </div>

                    </div>

                    {/* PACKAGE */}

                    {agent.role !== "ADMIN" && (
                      <div className="mt-5 rounded-2xl border bg-slate-50 p-4">

                        <p className="font-black">
                          Account Package
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Select the features available for this agent.
                        </p>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">

                          {ACCOUNT_MODES.map(
                            (mode) => {
                              const active =
                                (agent.accountMode ||
                                  "SELF") ===
                                mode.value;

                              return (
                                <button
                                  key={mode.value}
                                  type="button"
                                  disabled={
                                    actionUserId ===
                                    agent.id
                                  }
                                  onClick={() =>
                                    void changeAccountMode(
                                      agent,
                                      mode.value
                                    )
                                  }
                                  className={`rounded-2xl border p-4 text-left ${
                                    active
                                      ? "border-blue-600 bg-blue-700 text-white"
                                      : "border-slate-200 bg-white"
                                  }`}
                                >

                                  <p className="font-black">
                                    {mode.emoji}{" "}
                                    {mode.title}
                                  </p>

                                  <p
                                    className={`mt-1 text-xs font-semibold ${
                                      active
                                        ? "text-blue-100"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {
                                      mode.description
                                    }
                                  </p>

                                </button>
                              );
                            }
                          )}

                        </div>

                      </div>
                    )}

                    {/* ACTIONS */}

                    <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">

                      <button
                        onClick={() =>
                          openPasswordReset(
                            agent
                          )
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-800"
                      >
                        🔑 Reset Password
                      </button>

                      {agent.role !== "ADMIN" && (
                        <button
                          disabled={
                            actionUserId ===
                            agent.id
                          }
                          onClick={() =>
                            void changeAgentStatus(
                              agent
                            )
                          }
                          className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                            agent.isActive
                              ? "border border-red-200 bg-red-50 text-red-700"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {agent.isActive
                            ? "⛔ Deactivate"
                            : "✓ Activate"}
                        </button>
                      )}

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </div>

      {/* CREATE MODAL */}

      {createOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">

          <div className="mx-auto my-8 max-w-3xl rounded-3xl bg-white p-6">

            <div className="flex justify-between">

              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  Master Admin
                </p>

                <h2 className="text-xl font-black">
                  Create New Agent
                </h2>
              </div>

              <button
                onClick={closeCreateAgent}
                className="h-9 w-9 rounded-xl bg-slate-100 font-black"
              >
                ✕
              </button>

            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              <FormInput
                label="Full Name *"
                value={createForm.name}
                onChange={(value) =>
                  updateCreateField(
                    "name",
                    value
                  )
                }
              />

              <FormInput
                label="Mobile Number *"
                value={createForm.phone}
                onChange={(value) =>
                  updateCreateField(
                    "phone",
                    value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
              />

              <FormInput
                label="Email *"
                value={createForm.email}
                onChange={(value) =>
                  updateCreateField(
                    "email",
                    value
                  )
                }
              />

              <FormInput
                label="State *"
                value={createForm.state}
                onChange={(value) =>
                  updateCreateField(
                    "state",
                    value
                  )
                }
              />

              <FormInput
                label="District *"
                value={
                  createForm.district
                }
                onChange={(value) =>
                  updateCreateField(
                    "district",
                    value
                  )
                }
              />

              <FormInput
                label="Pincode"
                value={
                  createForm.pincode
                }
                onChange={(value) =>
                  updateCreateField(
                    "pincode",
                    value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
              />

              <FormInput
                label="Address"
                value={
                  createForm.address
                }
                onChange={(value) =>
                  updateCreateField(
                    "address",
                    value
                  )
                }
              />

              <div />

              <FormInput
                label="Password *"
                type="password"
                value={
                  createForm.password
                }
                onChange={(value) =>
                  updateCreateField(
                    "password",
                    value
                  )
                }
              />

              <FormInput
                label="Confirm Password *"
                type="password"
                value={
                  createForm.confirmPassword
                }
                onChange={(value) =>
                  updateCreateField(
                    "confirmPassword",
                    value
                  )
                }
              />

            </div>

            {/* CREATE PACKAGE */}

            <div className="mt-6">

              <p className="font-black">
                Agent Account Package *
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                You can change this package later.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-3">

                {ACCOUNT_MODES.map(
                  (mode) => {
                    const active =
                      createForm.accountMode ===
                      mode.value;

                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() =>
                          setCreateForm(
                            (current) => ({
                              ...current,
                              accountMode:
                                mode.value,
                            })
                          )
                        }
                        className={`rounded-2xl border p-4 text-left ${
                          active
                            ? "border-blue-600 bg-blue-700 text-white"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >

                        <p className="font-black">
                          {mode.emoji}{" "}
                          {mode.title}
                        </p>

                        <p
                          className={`mt-1 text-xs font-semibold ${
                            active
                              ? "text-blue-100"
                              : "text-slate-500"
                          }`}
                        >
                          {
                            mode.description
                          }
                        </p>

                      </button>
                    );
                  }
                )}

              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={closeCreateAgent}
                disabled={creatingAgent}
                className="rounded-xl border px-5 py-3 font-black"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  void createAgent()
                }
                disabled={creatingAgent}
                className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:opacity-50"
              >
                {creatingAgent
                  ? "Creating..."
                  : "Create Agent"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* PASSWORD MODAL */}

      {resetAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md rounded-3xl bg-white p-6">

            <h2 className="text-xl font-black">
              Reset Password
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {resetAgent.name}
            </p>

            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
              placeholder="New password"
              className="mt-5 w-full rounded-xl border-2 px-4 py-3"
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Confirm password"
              className="mt-3 w-full rounded-xl border-2 px-4 py-3"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">

              <button
                onClick={
                  closePasswordReset
                }
                className="rounded-xl border py-3 font-black"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  void resetPassword()
                }
                disabled={
                  resettingPassword
                }
                className="rounded-xl bg-blue-700 py-3 font-black text-white"
              >
                {resettingPassword
                  ? "Resetting..."
                  : "Reset Password"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">

      <p className="text-sm font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">
        {value}
      </p>

    </div>
  );
}

function CountBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">

      <p className="text-lg font-black">
        {value}
      </p>

      <p className="text-[10px] font-black uppercase text-slate-500">
        {label}
      </p>

    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
}) {
  return (
    <div>

      <label className="text-sm font-black">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 w-full rounded-xl border-2 border-slate-300 px-4 py-3"
      />

    </div>
  );
}