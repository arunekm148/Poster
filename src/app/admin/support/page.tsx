"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: string;
  name?: string;
  role?: string;
};

type SupportMessage = {
  id: string;
  agentId: string;
  sender: "AGENT" | "ADMIN";
  message: string;
  adminId?: string | null;
  readByAdmin?: boolean;
  readByAgent?: boolean;
  createdAt: string;

  agent?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string | null;
  } | null;

  admin?: {
    id?: string;
    name?: string;
  } | null;
};

type AgentConversation = {
  agentId: string;
  agentName: string;
  phone?: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
};

export default function AdminSupportPage() {
  const [admin, setAdmin] =
    useState<AdminUser | null>(null);

  const [messages, setMessages] =
    useState<SupportMessage[]>([]);

  const [selectedAgentId, setSelectedAgentId] =
    useState("");

  const [reply, setReply] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("agentUser");

      if (!stored) {
        setError("Please login as Admin.");
        setLoading(false);
        return;
      }

      const parsed: AdminUser =
        JSON.parse(stored);

      if (
        !parsed?.id ||
        parsed.role !== "ADMIN"
      ) {
        setError("Admin access only.");
        setLoading(false);
        return;
      }

      setAdmin(parsed);

      void loadMessages();
    } catch (error) {
      console.error(
        "ADMIN SUPPORT USER ERROR:",
        error
      );

      setError(
        "Unable to read Admin session."
      );

      setLoading(false);
    }
  }, []);

  async function loadMessages() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/admin/support",
          {
            cache: "no-store",
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
            "Unable to load support messages."
        );
      }

      const list =
        Array.isArray(
          data.messages
        )
          ? data.messages
          : Array.isArray(
              data.data
            )
          ? data.data
          : Array.isArray(
              data
            )
          ? data
          : [];

      setMessages(list);
    } catch (error) {
      console.error(
        "LOAD SUPPORT ERROR:",
        error
      );

      setMessages([]);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load support messages."
      );
    } finally {
      setLoading(false);
    }
  }

  const conversations =
    useMemo(() => {
      const map =
        new Map<
          string,
          AgentConversation
        >();

      messages.forEach(
        (message) => {
          const current =
            map.get(
              message.agentId
            );

          const createdAt =
            message.createdAt ||
            new Date().toISOString();

          if (!current) {
            map.set(
              message.agentId,
              {
                agentId:
                  message.agentId,

                agentName:
                  message.agent?.name ||
                  "Agent",

                phone:
                  message.agent?.phone,

                unreadCount:
                  message.sender ===
                    "AGENT" &&
                  !message.readByAdmin
                    ? 1
                    : 0,

                lastMessage:
                  message.message,

                lastMessageAt:
                  createdAt,
              }
            );

            return;
          }

          if (
            message.sender ===
              "AGENT" &&
            !message.readByAdmin
          ) {
            current.unreadCount +=
              1;
          }

          if (
            new Date(
              createdAt
            ).getTime() >
            new Date(
              current.lastMessageAt
            ).getTime()
          ) {
            current.lastMessage =
              message.message;

            current.lastMessageAt =
              createdAt;
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          new Date(
            b.lastMessageAt
          ).getTime() -
          new Date(
            a.lastMessageAt
          ).getTime()
      );
    }, [messages]);

  const filteredConversations =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return conversations;
      }

      return conversations.filter(
        (conversation) =>
          conversation.agentName
            .toLowerCase()
            .includes(value) ||
          String(
            conversation.phone ||
              ""
          )
            .toLowerCase()
            .includes(value)
      );
    }, [
      conversations,
      search,
    ]);

  useEffect(() => {
    if (
      !selectedAgentId &&
      conversations.length >
        0
    ) {
      setSelectedAgentId(
        conversations[0].agentId
      );
    }
  }, [
    conversations,
    selectedAgentId,
  ]);

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.agentId ===
        selectedAgentId
    );

  const selectedMessages =
    useMemo(() => {
      return messages
        .filter(
          (message) =>
            message.agentId ===
            selectedAgentId
        )
        .sort(
          (a, b) =>
            new Date(
              a.createdAt
            ).getTime() -
            new Date(
              b.createdAt
            ).getTime()
        );
    }, [
      messages,
      selectedAgentId,
    ]);

  async function handleSendReply() {
    const text =
      reply.trim();

    if (
      !text ||
      !selectedAgentId ||
      !admin?.id
    ) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const response =
        await fetch(
          "/api/admin/support",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                agentId:
                  selectedAgentId,

                adminId:
                  admin.id,

                message:
                  text,
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
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Unable to send reply."
        );
      }

      setReply("");

      await loadMessages();
    } catch (error) {
      console.error(
        "SEND ADMIN REPLY ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to send reply."
      );
    } finally {
      setSending(false);
    }
  }

  function formatTime(
    value?: string
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">

        <div className="rounded-3xl bg-white px-8 py-10 text-center shadow-sm">

          <div className="text-4xl">
            💬
          </div>

          <p className="mt-3 font-black text-slate-700">
            Loading Support...
          </p>

        </div>

      </main>
    );
  }

  if (!admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">

        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Admin Access
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {error ||
              "Admin login required."}
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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

          <div>

            <p className="text-xs font-black uppercase tracking-widest text-blue-300">
              Master Admin
            </p>

            <h1 className="text-2xl font-black">
              Agent Support
            </h1>

            <p className="mt-1 text-sm font-semibold text-blue-200">
              View and reply to agent messages
            </p>

          </div>

          <Link
            href="/admin"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20"
          >
            ← Admin Dashboard
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-h-[650px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_1fr]">

          {/* LEFT SIDE */}

          <div className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">

            <div className="border-b border-slate-200 p-4">

              <h2 className="font-black">
                Agent Conversations
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                {conversations.length} conversations
              </p>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search agent..."
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600"
              />

            </div>

            <div className="max-h-[560px] overflow-y-auto">

              {filteredConversations.length ===
              0 ? (
                <div className="p-8 text-center">

                  <div className="text-4xl">
                    💬
                  </div>

                  <p className="mt-3 text-sm font-bold text-slate-500">
                    No support messages yet
                  </p>

                </div>
              ) : (
                filteredConversations.map(
                  (
                    conversation
                  ) => (
                    <button
                      key={
                        conversation.agentId
                      }
                      type="button"
                      onClick={() =>
                        setSelectedAgentId(
                          conversation.agentId
                        )
                      }
                      className={`w-full border-b border-slate-200 p-4 text-left transition ${
                        selectedAgentId ===
                        conversation.agentId
                          ? "bg-blue-50"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-black text-slate-900">
                            {
                              conversation.agentName
                            }
                          </p>

                          {conversation.phone && (
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              📱{" "}
                              {
                                conversation.phone
                              }
                            </p>
                          )}

                        </div>

                        {conversation.unreadCount >
                          0 && (
                          <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                            {
                              conversation.unreadCount
                            }
                          </span>
                        )}

                      </div>

                      <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600">
                        {
                          conversation.lastMessage
                        }
                      </p>

                      <p className="mt-2 text-[10px] font-semibold text-slate-400">
                        {formatTime(
                          conversation.lastMessageAt
                        )}
                      </p>

                    </button>
                  )
                )
              )}

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className="flex min-h-[650px] flex-col">

            {!selectedConversation ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">

                <div>

                  <div className="text-6xl">
                    💬
                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    Select an Agent
                  </h2>

                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Choose an agent conversation from the left.
                  </p>

                </div>

              </div>
            ) : (
              <>
                {/* CHAT HEADER */}

                <div className="border-b border-slate-200 bg-white px-5 py-4">

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="font-black text-slate-950">
                        {
                          selectedConversation.agentName
                        }
                      </h2>

                      {selectedConversation.phone && (
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          📱{" "}
                          {
                            selectedConversation.phone
                          }
                        </p>
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={
                        loadMessages
                      }
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                    >
                      ↻ Refresh
                    </button>

                  </div>

                </div>

                {/* MESSAGES */}

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-5">

                  {selectedMessages.length ===
                  0 ? (
                    <div className="p-8 text-center text-sm font-bold text-slate-500">
                      No messages in this conversation.
                    </div>
                  ) : (
                    selectedMessages.map(
                      (
                        message
                      ) => (
                        <div
                          key={
                            message.id
                          }
                          className={`flex ${
                            message.sender ===
                            "ADMIN"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >

                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                              message.sender ===
                              "ADMIN"
                                ? "rounded-br-md bg-blue-700 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                            }`}
                          >

                            <p className="whitespace-pre-wrap text-sm font-semibold leading-5">
                              {
                                message.message
                              }
                            </p>

                            <div
                              className={`mt-2 flex items-center gap-2 text-[10px] ${
                                message.sender ===
                                "ADMIN"
                                  ? "text-blue-200"
                                  : "text-slate-400"
                              }`}
                            >

                              <span>
                                {message.sender ===
                                "ADMIN"
                                  ? "Admin"
                                  : selectedConversation.agentName}
                              </span>

                              <span>
                                •
                              </span>

                              <span>
                                {formatTime(
                                  message.createdAt
                                )}
                              </span>

                            </div>

                          </div>

                        </div>
                      )
                    )
                  )}

                </div>

                {/* REPLY */}

                <div className="border-t border-slate-200 bg-white p-4">

                  <div className="flex items-end gap-2">

                    <textarea
                      value={
                        reply
                      }
                      onChange={(
                        event
                      ) =>
                        setReply(
                          event.target.value
                        )
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();

                          void handleSendReply();
                        }
                      }}
                      placeholder={`Reply to ${selectedConversation.agentName}...`}
                      rows={
                        2
                      }
                      className="min-h-[48px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        void handleSendReply()
                      }
                      disabled={
                        sending ||
                        !reply.trim()
                      }
                      className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-blue-700 px-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending
                        ? "..."
                        : "Send"}
                    </button>

                  </div>

                  <p className="mt-2 text-[10px] font-semibold text-slate-400">
                    Enter to send · Shift + Enter for new line
                  </p>

                </div>
              </>
            )}

          </div>

        </div>

      </section>

    </main>
  );
}