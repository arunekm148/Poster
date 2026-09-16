"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  attendanceDate: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason: string;
  status: string;
  adminRemarks?: string | null;
  createdAt: string;
  reviewedAt?: string | null;

  Staff?: {
    staffCode: string;
    name: string;
    designation?: string | null;
  };

  StaffAttendance?: {
    id?: string;
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string | null;
    workLocation?: string | null;
    lateMinutes?: number | null;
    workingMinutes?: number | null;

    checkInIp?: string | null;
    checkInPhotoUrl?: string | null;
    checkInSource?: string | null;
    checkInLatitude?: string | number | null;
    checkInLongitude?: string | number | null;
    checkInAccuracyMeters?: number | null;
    checkInDistanceMeters?: number | null;
    checkInGeofencePassed?: boolean | null;

    checkOutIp?: string | null;
    checkOutPhotoUrl?: string | null;
    checkOutSource?: string | null;
    checkOutLatitude?: string | number | null;
    checkOutLongitude?: string | number | null;
    checkOutAccuracyMeters?: number | null;
    checkOutDistanceMeters?: number | null;
    checkOutGeofencePassed?: boolean | null;
  } | null;
};

function fmt(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function fmtMinutes(value?: number | null) {
  const minutes = Number(value || 0);

  if (!minutes) return "—";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return hours
    ? `${hours}h ${mins}m`
    : `${mins}m`;
}

function yesNo(value?: boolean | null) {
  if (value === true) return "Passed";
  if (value === false) return "Failed";
  return "—";
}

function coords(
  lat?: string | number | null,
  lng?: string | number | null
) {
  if (
    lat === null ||
    lat === undefined ||
    lng === null ||
    lng === undefined
  ) {
    return "—";
  }

  return `${lat}, ${lng}`;
}

export default function RegularizationPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");

  async function load(uid: string) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/staff/regularization?userId=${encodeURIComponent(uid)}`,
        {
          cache: "no-store",
        }
      );

      let data: {
        success?: boolean;
        message?: string;
        regularizations?: Row[];
      } = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data.success === false) {
        throw new Error(
          data.message ||
            "Unable to load requests."
        );
      }

      setRows(
        Array.isArray(data.regularizations)
          ? data.regularizations
          : []
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Unable to load requests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("agentUser");

      if (!raw) {
        router.replace("/login");
        return;
      }

      const parsed =
        JSON.parse(raw);

      const uid =
        String(
          parsed.accountType === "STAFF"
            ? parsed.userId || ""
            : parsed.id || ""
        ).trim();

      if (!uid) {
        router.replace("/login");
        return;
      }

      setUserId(uid);
      void load(uid);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? rows
        : rows.filter(
            (row) =>
              row.status === filter
          ),
    [rows, filter]
  );

  async function review(
    id: string,
    action:
      | "APPROVED"
      | "REJECTED"
  ) {
    if (!userId || savingId) {
      return;
    }

    if (
      action === "REJECTED" &&
      !String(
        remarks[id] || ""
      ).trim()
    ) {
      setMessage(
        "Please enter a rejection reason before rejecting."
      );

      return;
    }

    setSavingId(id);
    setMessage("");

    try {
      const res =
        await fetch(
          "/api/staff/regularization",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                userId,
                id,
                action,
                reviewedById:
                  userId,
                adminRemarks:
                  remarks[id] ||
                  "",
              }),
          }
        );

      let data: {
        success?: boolean;
        message?: string;
      } = {};

      try {
        data =
          await res.json();
      } catch {
        data = {};
      }

      if (
        !res.ok ||
        data.success === false
      ) {
        throw new Error(
          data.message ||
            "Unable to update request."
        );
      }

      setMessage(
        action === "APPROVED"
          ? "Regularization approved."
          : "Regularization rejected."
      );

      setRemarks((current) => ({
        ...current,
        [id]: "",
      }));

      await load(userId);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Unable to update request."
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/staff"
              className="rounded-xl border bg-white px-3 py-2 font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">
                Attendance Management
              </p>

              <h1 className="text-2xl font-black">
                Regularization Approval
              </h1>

              <p className="text-sm font-semibold text-slate-500">
                Review the original attendance against the Staff request, then approve or reject.
              </p>

            </div>

          </div>

          <Link
            href="/staff/attendance"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"
          >
            Today&apos;s Attendance
          </Link>

        </div>

      </header>

      <section className="mx-auto max-w-7xl px-4 py-5">

        {message && (
          <div className="mb-4 rounded-xl border bg-white p-3 text-sm font-bold text-slate-700">
            {message}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">

          {[
            "PENDING",
            "APPROVED",
            "REJECTED",
            "ALL",
          ].map(
            (
              item
            ) => (
              <button
                key={
                  item
                }
                type="button"
                onClick={() =>
                  setFilter(
                    item
                  )
                }
                className={`rounded-xl px-4 py-2 text-xs font-black ${
                  filter ===
                  item
                    ? "bg-violet-700 text-white"
                    : "border bg-white text-slate-700"
                }`}
              >
                {item.replaceAll(
                  "_",
                  " "
                )}
              </button>
            )
          )}

        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-500">
            Loading requests...
          </div>
        ) : visible.length ===
          0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-500">
            No regularization requests.
          </div>
        ) : (
          <div className="space-y-4">

            {visible.map(
              (
                row
              ) => {
                const attendance =
                  row.StaffAttendance ||
                  null;

                const hasProof =
                  Boolean(
                    attendance?.checkInPhotoUrl ||
                    attendance?.checkOutPhotoUrl ||
                    attendance?.checkInIp ||
                    attendance?.checkOutIp ||
                    attendance?.checkInLatitude ||
                    attendance?.checkOutLatitude
                  );

                return (
                  <article
                    key={
                      row.id
                    }
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">

                      <div>

                        <h2 className="text-xl font-black text-slate-950">
                          {row.Staff?.name ||
                            "Staff"}
                        </h2>

                        <p className="text-xs font-black text-blue-700">
                          {row.Staff?.staffCode}
                          {row.Staff?.designation
                            ? ` · ${row.Staff.designation}`
                            : ""}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-600">
                          Attendance Date:{" "}
                          <span className="font-black text-slate-900">
                            {fmtDate(
                              row.attendanceDate
                            )}
                          </span>
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Requested:{" "}
                          {fmt(
                            row.createdAt
                          )}
                        </p>

                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          row.status ===
                          "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : row.status ===
                                "APPROVED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {row.status}
                      </span>

                    </div>

                    <div className="grid gap-4 p-5 lg:grid-cols-3">

                      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                          Original Attendance
                        </p>

                        <div className="mt-3 space-y-2 text-sm">

                          <Info
                            label="Check In"
                            value={fmt(
                              attendance?.checkIn
                            )}
                          />

                          <Info
                            label="Check Out"
                            value={fmt(
                              attendance?.checkOut
                            )}
                          />

                          <Info
                            label="Status"
                            value={
                              attendance?.status ||
                              "No attendance record"
                            }
                          />

                          <Info
                            label="Work Location"
                            value={
                              attendance?.workLocation?.replaceAll(
                                "_",
                                " "
                              ) ||
                              "—"
                            }
                          />

                          <Info
                            label="Late"
                            value={
                              attendance?.lateMinutes
                                ? `${attendance.lateMinutes} min`
                                : "—"
                            }
                          />

                          <Info
                            label="Working"
                            value={fmtMinutes(
                              attendance?.workingMinutes
                            )}
                          />

                        </div>

                      </section>

                      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">

                        <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
                          Requested Correction
                        </p>

                        <div className="mt-3 space-y-2 text-sm">

                          <Info
                            label="Requested In"
                            value={fmt(
                              row.requestedCheckIn
                            )}
                          />

                          <Info
                            label="Requested Out"
                            value={fmt(
                              row.requestedCheckOut
                            )}
                          />

                        </div>

                        <div className="mt-4 rounded-xl bg-white p-3">

                          <p className="text-[10px] font-black uppercase text-amber-700">
                            Staff Reason
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {row.reason}
                          </p>

                        </div>

                      </section>

                      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4">

                        <p className="text-[11px] font-black uppercase tracking-wide text-violet-700">
                          Original Verification Proof
                        </p>

                        {!hasProof ? (
                          <p className="mt-3 text-sm font-bold text-slate-500">
                            No GPS, IP or photo proof is available for the original attendance record.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2 text-sm">

                            <Info
                              label="Check-in IP"
                              value={
                                attendance?.checkInIp ||
                                "—"
                              }
                            />

                            <Info
                              label="Check-in GPS"
                              value={coords(
                                attendance?.checkInLatitude,
                                attendance?.checkInLongitude
                              )}
                            />

                            <Info
                              label="Check-in Accuracy"
                              value={
                                attendance?.checkInAccuracyMeters !==
                                  null &&
                                attendance?.checkInAccuracyMeters !==
                                  undefined
                                  ? `${attendance.checkInAccuracyMeters} m`
                                  : "—"
                              }
                            />

                            <Info
                              label="Check-in Distance"
                              value={
                                attendance?.checkInDistanceMeters !==
                                  null &&
                                attendance?.checkInDistanceMeters !==
                                  undefined
                                  ? `${attendance.checkInDistanceMeters} m`
                                  : "—"
                              }
                            />

                            <Info
                              label="Check-in Geofence"
                              value={yesNo(
                                attendance?.checkInGeofencePassed
                              )}
                            />

                            <Info
                              label="Check-out IP"
                              value={
                                attendance?.checkOutIp ||
                                "—"
                              }
                            />

                            <Info
                              label="Check-out GPS"
                              value={coords(
                                attendance?.checkOutLatitude,
                                attendance?.checkOutLongitude
                              )}
                            />

                            <Info
                              label="Check-out Geofence"
                              value={yesNo(
                                attendance?.checkOutGeofencePassed
                              )}
                            />

                          </div>
                        )}

                      </section>

                    </div>

                    {(attendance?.checkInPhotoUrl ||
                      attendance?.checkOutPhotoUrl) && (
                      <div className="border-t border-slate-100 px-5 py-4">

                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                          Original Attendance Photos
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">

                          {attendance?.checkInPhotoUrl && (
                            <a
                              href={
                                attendance.checkInPhotoUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700"
                            >
                              View Check-in Photo
                            </a>
                          )}

                          {attendance?.checkOutPhotoUrl && (
                            <a
                              href={
                                attendance.checkOutPhotoUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700"
                            >
                              View Check-out Photo
                            </a>
                          )}

                        </div>

                      </div>
                    )}

                    {row.status ===
                    "PENDING" ? (
                      <div className="border-t border-slate-100 bg-slate-50 p-5">

                        <label className="text-xs font-black uppercase tracking-wide text-slate-600">
                          Approval / Rejection Remarks
                        </label>

                        <textarea
                          value={
                            remarks[row.id] ||
                            ""
                          }
                          onChange={(
                            event
                          ) =>
                            setRemarks(
                              (
                                current
                              ) => ({
                                ...current,
                                [row.id]:
                                  event.target.value,
                              })
                            )
                          }
                          rows={2}
                          placeholder="Optional for approval. Required for rejection."
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-violet-500"
                        />

                        <div className="mt-3 flex flex-wrap gap-2">

                          <button
                            type="button"
                            disabled={
                              savingId ===
                              row.id
                            }
                            onClick={() =>
                              void review(
                                row.id,
                                "APPROVED"
                              )
                            }
                            className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
                          >
                            {savingId ===
                            row.id
                              ? "Saving..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              savingId ===
                              row.id
                            }
                            onClick={() =>
                              void review(
                                row.id,
                                "REJECTED"
                              )
                            }
                            className="rounded-xl bg-red-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
                          >
                            {savingId ===
                            row.id
                              ? "Saving..."
                              : "Reject"}
                          </button>

                        </div>

                      </div>
                    ) : (
                      <div className="border-t border-slate-100 bg-slate-50 p-5">

                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Review Result
                        </p>

                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {row.adminRemarks ||
                            "No reviewer remarks."}
                        </p>

                        {row.reviewedAt && (
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Reviewed:{" "}
                            {fmt(
                              row.reviewedAt
                            )}
                          </p>
                        )}

                      </div>
                    )}

                  </article>
                );
              }
            )}

          </div>
        )}

      </section>

    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">

      <span className="font-semibold text-slate-500">
        {label}
      </span>

      <span className="text-right font-black text-slate-900">
        {value}
      </span>

    </div>
  );
}
