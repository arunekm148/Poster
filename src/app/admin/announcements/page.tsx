"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AdminUser = {
  id: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role?: string;
};

type Announcement = {
  id: string;
  message: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;

  createdBy?: {
    id?: string;
    name?: string;
    role?: string;
  } | null;
};

/* -------------------------------------------------------------------------- */
/* FORMAT DATE                                                                */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminAnnouncementsPage() {
  const [
    admin,
    setAdmin,
  ] =
    useState<
      AdminUser | null
    >(null);

  const [
    announcements,
    setAnnouncements,
  ] =
    useState<
      Announcement[]
    >([]);

  const [
    announcementMessage,
    setAnnouncementMessage,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    processingId,
    setProcessingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD ANNOUNCEMENTS                                                       */
  /* ------------------------------------------------------------------------ */

  const loadAnnouncements =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              "/api/admin/announcements?activeOnly=false",
              {
                cache:
                  "no-store",
              }
            );

          let data: {
            success?: boolean;
            message?: string;
            announcements?: Announcement[];
          } = {};

          try {
            data =
              await response.json();
          } catch {
            data = {};
          }

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Unable to load announcements."
            );
          }

          setAnnouncements(
            Array.isArray(
              data.announcements
            )
              ? data.announcements
              : []
          );
        } catch (
          loadError
        ) {
          console.error(
            "LOAD ANNOUNCEMENTS ERROR:",
            loadError
          );

          setAnnouncements(
            []
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load announcements."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  /* ------------------------------------------------------------------------ */
  /* ADMIN LOGIN CHECK                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "agentUser"
        );

      if (!savedUser) {
        setError(
          "Please login as Admin."
        );

        setLoading(false);

        return;
      }

      const parsed:
        AdminUser =
        JSON.parse(
          savedUser
        );

      if (
        !parsed?.id ||
        parsed.role !==
          "ADMIN"
      ) {
        setError(
          "Admin access only."
        );

        setLoading(false);

        return;
      }

      setAdmin(
        parsed
      );

      void loadAnnouncements();
    } catch (
      sessionError
    ) {
      console.error(
        "ADMIN SESSION ERROR:",
        sessionError
      );

      setError(
        "Unable to read Admin login information."
      );

      setLoading(false);
    }
  }, [
    loadAnnouncements,
  ]);

  /* ------------------------------------------------------------------------ */
  /* CREATE ANNOUNCEMENT                                                      */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!admin?.id) {
      setError(
        "Admin login information not found."
      );

      return;
    }

    const message =
      announcementMessage.trim();

    if (!message) {
      setError(
        "Please enter announcement message."
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/admin/announcements",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                message,
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
        announcement?: Announcement;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to publish announcement."
        );
      }

      setAnnouncementMessage(
        ""
      );

      setSuccessMessage(
        data.message ||
          "Announcement published successfully."
      );

      await loadAnnouncements();
    } catch (
      saveError
    ) {
      console.error(
        "CREATE ANNOUNCEMENT ERROR:",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to publish announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACTIVATE / DEACTIVATE                                                    */
  /* ------------------------------------------------------------------------ */

  async function toggleAnnouncement(
    announcement:
      Announcement
  ) {
    if (!admin?.id) {
      return;
    }

    try {
      setProcessingId(
        announcement.id
      );

      setError("");
      setSuccessMessage("");

      const response =
        await fetch(
          "/api/admin/announcements",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminId:
                  admin.id,

                announcementId:
                  announcement.id,

                isActive:
                  !announcement.isActive,
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to update announcement."
        );
      }

      setAnnouncements(
        (
          previous
        ) =>
          previous.map(
            (
              item
            ) =>
              item.id ===
              announcement.id
                ? {
                    ...item,

                    isActive:
                      !announcement.isActive,
                  }
                : item
          )
      );

      setSuccessMessage(
        announcement.isActive
          ? "Announcement deactivated."
          : "Announcement activated."
      );
    } catch (
      updateError
    ) {
      console.error(
        "UPDATE ANNOUNCEMENT ERROR:",
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update announcement."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                   */
  /* ------------------------------------------------------------------------ */

  async function deleteAnnouncement(
    announcement:
      Announcement
  ) {
    if (!admin?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this announcement permanently?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(
        announcement.id
      );

      setError("");
      setSuccessMessage("");

      const response =
        await fetch(
          `/api/admin/announcements?adminId=${encodeURIComponent(
            admin.id
          )}&announcementId=${encodeURIComponent(
            announcement.id
          )}`,
          {
            method:
              "DELETE",
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data =
          await response.json();
      } catch {
        data = {};
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to delete announcement."
        );
      }

      setAnnouncements(
        (
          previous
        ) =>
          previous.filter(
            (
              item
            ) =>
              item.id !==
              announcement.id
          )
      );

      setSuccessMessage(
        "Announcement deleted successfully."
      );
    } catch (
      deleteError
    ) {
      console.error(
        "DELETE ANNOUNCEMENT ERROR:",
        deleteError
      );

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete announcement."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ACCESS ERROR                                                             */
  /* ------------------------------------------------------------------------ */

  if (
    !loading &&
    !admin
  ) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">

        <div className="mx-auto max-w-lg rounded-3xl border bg-white p-8 text-center shadow-sm">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Admin Access
          </h1>

          <p className="mt-2 font-semibold text-red-700">
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

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-slate-100 pb-20 text-slate-950">

      {/* HEADER */}

      <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">

          <div>

            <p className="text-xs font-black uppercase tracking-widest text-blue-300">
              Master Admin
            </p>

            <h1 className="text-2xl font-black">
              📢 Announcements
            </h1>

            <p className="mt-1 text-sm font-semibold text-blue-200">
              Publish notices and feature updates for agents.
            </p>

          </div>

          <Link
            href="/admin"
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black hover:bg-white/20"
          >
            ← Admin
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">

        {/* CREATE */}

        <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">

          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            New Announcement
          </p>

          <h2 className="mt-1 text-xl font-black">
            Publish Agent Message
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Active announcements will later scroll across the blue Agent Dashboard header.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-5"
          >

            <textarea
              value={
                announcementMessage
              }
              onChange={(
                event
              ) =>
                setAnnouncementMessage(
                  event.target.value
                )
              }
              rows={
                4
              }
              maxLength={
                1000
              }
              placeholder="Example: New Health Insurance feature added. Please check the Policies section..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />

            <div className="mt-2 flex items-center justify-between">

              <p className="text-xs font-bold text-slate-500">
                {
                  announcementMessage.length
                }
                /1000
              </p>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:opacity-50"
              >
                {saving
                  ? "Publishing..."
                  : "📢 Publish Announcement"}
              </button>

            </div>

          </form>

        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 font-bold text-red-800">
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-800">
            ✅ {successMessage}
          </div>
        )}

        {/* LIST */}

        <div className="mt-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                Announcement History
              </p>

              <h2 className="mt-1 text-xl font-black">
                Published Messages
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                void loadAnnouncements()
              }
              className="rounded-xl border bg-white px-4 py-2 text-sm font-black"
            >
              🔄 Refresh
            </button>

          </div>

          {loading ? (
            <div className="mt-4 rounded-3xl border bg-white p-10 text-center font-bold">
              Loading announcements...
            </div>
          ) : announcements.length ===
            0 ? (
            <div className="mt-4 rounded-3xl border bg-white p-10 text-center shadow-sm">

              <div className="text-4xl">
                📢
              </div>

              <p className="mt-3 font-black">
                No announcements yet
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Publish your first announcement above.
              </p>

            </div>
          ) : (
            <div className="mt-4 space-y-3">

              {announcements.map(
                (
                  announcement
                ) => (
                  <article
                    key={
                      announcement.id
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              announcement.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {announcement.isActive
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>

                          <span className="text-xs font-bold text-slate-500">
                            {formatDate(
                              announcement.createdAt
                            )}
                          </span>

                        </div>

                        <p className="mt-4 whitespace-pre-wrap text-base font-bold leading-7 text-slate-900">
                          {
                            announcement.message
                          }
                        </p>

                        {announcement.createdBy?.name && (
                          <p className="mt-3 text-xs font-semibold text-slate-500">
                            Published by{" "}
                            <strong>
                              {
                                announcement.createdBy.name
                              }
                            </strong>
                          </p>
                        )}

                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">

                        <button
                          type="button"
                          disabled={
                            processingId ===
                            announcement.id
                          }
                          onClick={() =>
                            void toggleAnnouncement(
                              announcement
                            )
                          }
                          className={`rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-50 ${
                            announcement.isActive
                              ? "border border-orange-300 bg-orange-50 text-orange-800"
                              : "bg-emerald-700 text-white"
                          }`}
                        >
                          {processingId ===
                          announcement.id
                            ? "Saving..."
                            : announcement.isActive
                              ? "⏸ Deactivate"
                              : "✓ Activate"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            processingId ===
                            announcement.id
                          }
                          onClick={() =>
                            void deleteAnnouncement(
                              announcement
                            )
                          }
                          className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-black text-red-800 disabled:opacity-50"
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </div>

      </section>

    </main>
  );
}