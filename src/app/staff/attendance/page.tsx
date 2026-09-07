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

type AttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "WEEK_OFF"
  | "HOLIDAY"
  | "NOT_PUNCHED";

type StaffInfo = {
  id: string;
  staffCode: string;
  name: string;
  phone?: string | null;
  staffRole?: string | null;
  designation?: string | null;
  department?: string | null;
  workMode?: string | null;
  loginEnabled?: boolean;
  supervisor?: {
    id: string;
    staffCode?: string | null;
    name?: string | null;
  } | null;
};

type AttendanceRecord = {
  id: string;
  staffId: string;
  date?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string | null;
  workLocation?: string | null;
  lateMinutes?: number | null;
  workingMinutes?: number | null;

  checkInIp?: string | null;
  checkInPhotoUrl?: string | null;
  checkInSource?: string | null;

  checkOutIp?: string | null;
  checkOutPhotoUrl?: string | null;
  checkOutSource?: string | null;

  checkInLatitude?: string | number | null;
  checkInLongitude?: string | number | null;
  checkInAccuracyMeters?: number | null;
  checkInDistanceMeters?: number | null;
  checkInGeofencePassed?: boolean | null;

  checkOutLatitude?: string | number | null;
  checkOutLongitude?: string | number | null;
  checkOutAccuracyMeters?: number | null;
  checkOutDistanceMeters?: number | null;
  checkOutGeofencePassed?: boolean | null;

  adminEdited?: boolean;
  notes?: string | null;
};

type LeaveInfo = {
  id: string;
  leaveType?: string | null;
  reason?: string | null;
};

type AttendanceRow = {
  staff: StaffInfo;
  attendance?: AttendanceRecord | null;
  leave?: LeaveInfo | null;
  displayStatus: AttendanceStatus;
};

type AttendanceResponse = {
  success?: boolean;
  message?: string;
  date?: string;
  rows?: AttendanceRow[];
  counts?: {
    total?: number;
    present?: number;
    late?: number;
    halfDay?: number;
    absent?: number;
    onLeave?: number;
    notPunched?: number;
    weekOff?: number;
    holiday?: number;
    checkedOut?: number;
  };
  holiday?: {
    id?: string;
    name?: string;
    description?: string | null;
  } | null;
  weekOff?: boolean;
  weekDay?: string;
  settings?: {
    officeStartTime?: string | null;
    officeEndTime?: string | null;
    graceMinutes?: number | null;
    timezone?: string | null;
    gpsAttendanceEnabled?: boolean;
    officeRadiusMeters?: number | null;
  } | null;
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function formatTime(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function formatMinutes(
  minutes?: number | null
) {
  const value =
    Number(minutes || 0);

  if (!value) {
    return "—";
  }

  const hours =
    Math.floor(
      value / 60
    );

  const mins =
    value % 60;

  if (!hours) {
    return `${mins}m`;
  }

  return `${hours}h ${mins}m`;
}

function todayInputValue() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function statusClass(
  status: AttendanceStatus
) {
  switch (status) {
    case "PRESENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "LATE":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "HALF_DAY":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "ABSENT":
      return "bg-red-50 text-red-700 border-red-200";

    case "ON_LEAVE":
      return "bg-violet-50 text-violet-700 border-violet-200";

    case "WEEK_OFF":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "HOLIDAY":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";

    case "NOT_PUNCHED":
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function statusLabel(
  status: AttendanceStatus
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (text) =>
      text.toUpperCase()
    );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function StaffAttendancePage() {
  const router =
    useRouter();

  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      todayInputValue()
    );

  const [
    data,
    setData,
  ] =
    useState<AttendanceResponse | null>(
      null
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    selectedRow,
    setSelectedRow,
  ] =
    useState<AttendanceRow | null>(
      null
    );

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  const loadAttendance =
    useCallback(
      async (
        ownerUserId: string,
        date: string
      ) => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              `/api/staff/attendance?userId=${encodeURIComponent(
                ownerUserId
              )}&date=${encodeURIComponent(
                date
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          let json:
            AttendanceResponse =
            {};

          try {
            json =
              await response.json();
          } catch {
            json = {};
          }

          if (
            !response.ok ||
            json.success ===
              false
          ) {
            throw new Error(
              json.message ||
                "Unable to load attendance."
            );
          }

          setData(json);
        } catch (loadError) {
          console.error(
            "LOAD ATTENDANCE ERROR:",
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load attendance."
          );

          setData(null);
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          "agentUser"
        );

      if (!raw) {
        router.replace(
          "/login"
        );

        return;
      }

      const parsed =
        JSON.parse(raw);

      const ownerUserId =
        String(
          parsed.accountType ===
            "STAFF"
            ? parsed.userId ||
                ""
            : parsed.id ||
                ""
        ).trim();

      if (!ownerUserId) {
        router.replace(
          "/login"
        );

        return;
      }

      setUserId(
        ownerUserId
      );

      void loadAttendance(
        ownerUserId,
        selectedDate
      );
    } catch (loadError) {
      console.error(
        "LOAD ATTENDANCE USER ERROR:",
        loadError
      );

      router.replace(
        "/login"
      );
    }
  }, [
    router,
    loadAttendance,
  ]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    void loadAttendance(
      userId,
      selectedDate
    );
  }, [
    userId,
    selectedDate,
    loadAttendance,
  ]);

  const rows =
    useMemo(() => {
      const list =
        Array.isArray(
          data?.rows
        )
          ? data?.rows ||
            []
          : [];

      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return list;
      }

      return list.filter(
        (item) =>
          [
            item.staff.name,
            item.staff.staffCode,
            item.staff.phone,
            item.staff.designation,
            item.staff.department,
            item.staff.supervisor
              ?.name,
            item.displayStatus,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      data,
      search,
    ]);

  const counts =
    data?.counts || {};

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/staff"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white font-black shadow-sm"
            >
              ←
            </Link>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Attendance Management
              </p>

              <h1 className="text-2xl font-black">
                Today&apos;s Attendance
              </h1>

              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                Present, late, absent, leave, punch and GPS verification.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/staff/regularization"
              className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-700"
            >
              📝 Regularization
            </Link>

            <Link
              href="/staff/leaves"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700"
            >
              🌴 Leave
            </Link>

          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-5">

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* DATE / STATUS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Attendance Date
              </p>

              <input
                type="date"
                value={
                  selectedDate
                }
                onChange={(
                  event
                ) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-900"
              />
            </div>

            <div className="text-sm font-semibold text-slate-500">

              {data?.holiday ? (
                <span className="rounded-full bg-cyan-50 px-3 py-1.5 font-black text-cyan-700">
                  🎉 Holiday:{" "}
                  {
                    data
                      .holiday
                      .name
                  }
                </span>
              ) : data?.weekOff ? (
                <span className="rounded-full bg-slate-100 px-3 py-1.5 font-black text-slate-700">
                  🛌 Weekly Off
                </span>
              ) : (
                <span>
                  Office{" "}
                  {
                    data
                      ?.settings
                      ?.officeStartTime ||
                    "09:30"
                  }{" "}
                  –{" "}
                  {
                    data
                      ?.settings
                      ?.officeEndTime ||
                    "18:00"
                  }
                </span>
              )}

            </div>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">

          <Summary
            label="Total"
            value={
              counts.total ||
              0
            }
            valueClass="text-slate-950"
          />

          <Summary
            label="Present"
            value={
              counts.present ||
              0
            }
            valueClass="text-emerald-700"
          />

          <Summary
            label="Late"
            value={
              counts.late ||
              0
            }
            valueClass="text-amber-700"
          />

          <Summary
            label="Half Day"
            value={
              counts.halfDay ||
              0
            }
            valueClass="text-orange-700"
          />

          <Summary
            label="On Leave"
            value={
              counts.onLeave ||
              0
            }
            valueClass="text-violet-700"
          />

          <Summary
            label="Absent"
            value={
              counts.absent ||
              0
            }
            valueClass="text-red-700"
          />

          <Summary
            label="Not Punched"
            value={
              counts.notPunched ||
              0
            }
            valueClass="text-slate-700"
          />

        </div>

        {/* DIRECTORY */}

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-4">

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search staff, code, department, supervisor or status..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
            />

          </div>

          {loading ? (
            <div className="p-10 text-center font-bold text-slate-500">
              Loading attendance...
            </div>
          ) : rows.length ===
            0 ? (
            <div className="p-10 text-center font-bold text-slate-500">
              No Staff found for this view.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1050px] text-left">

                <thead className="bg-slate-50">

                  <tr className="text-[10px] font-black uppercase tracking-wide text-slate-500">

                    <th className="px-4 py-3">
                      Staff
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Check In
                    </th>

                    <th className="px-4 py-3">
                      Check Out
                    </th>

                    <th className="px-4 py-3">
                      Late
                    </th>

                    <th className="px-4 py-3">
                      Working
                    </th>

                    <th className="px-4 py-3">
                      Location
                    </th>

                    <th className="px-4 py-3">
                      GPS
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100">

                  {rows.map(
                    (item) => (
                      <tr
                        key={
                          item
                            .staff
                            .id
                        }
                        className="hover:bg-slate-50"
                      >

                        <td className="px-4 py-4">

                          <p className="font-black text-slate-950">
                            {
                              item
                                .staff
                                .name
                            }
                          </p>

                          <p className="mt-0.5 text-xs font-bold text-blue-700">
                            {
                              item
                                .staff
                                .staffCode
                            }
                          </p>

                          {item
                            .staff
                            .designation && (
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {
                                item
                                  .staff
                                  .designation
                              }
                            </p>
                          )}

                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusClass(
                              item.displayStatus
                            )}`}
                          >
                            {statusLabel(
                              item.displayStatus
                            )}
                          </span>

                        </td>

                        <td className="px-4 py-4 font-bold text-slate-800">
                          {formatTime(
                            item
                              .attendance
                              ?.checkIn
                          )}
                        </td>

                        <td className="px-4 py-4 font-bold text-slate-800">
                          {formatTime(
                            item
                              .attendance
                              ?.checkOut
                          )}
                        </td>

                        <td className="px-4 py-4">

                          {item
                            .attendance
                            ?.lateMinutes ? (
                            <span className="font-black text-amber-700">
                              {
                                item
                                  .attendance
                                  .lateMinutes
                              }{" "}
                              min
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              —
                            </span>
                          )}

                        </td>

                        <td className="px-4 py-4 font-bold text-slate-700">
                          {formatMinutes(
                            item
                              .attendance
                              ?.workingMinutes
                          )}
                        </td>

                        <td className="px-4 py-4 text-xs font-black text-slate-700">
                          {String(
                            item
                              .attendance
                              ?.workLocation ||
                              item
                                .staff
                                .workMode ||
                              "—"
                          ).replaceAll(
                            "_",
                            " "
                          )}
                        </td>

                        <td className="px-4 py-4">

                          {item
                            .attendance
                            ?.checkInGeofencePassed ===
                          true ? (
                            <span className="text-xs font-black text-emerald-700">
                              ✓ Passed
                            </span>
                          ) : item
                              .attendance
                              ?.checkInGeofencePassed ===
                            false ? (
                            <span className="text-xs font-black text-red-700">
                              ✕ Failed
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
                            </span>
                          )}

                        </td>

                        <td className="px-4 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedRow(
                                item
                              )
                            }
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-black text-white"
                          >
                            Details
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </section>

      {/* DETAILS MODAL */}

      {selectedRow && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="flex items-start justify-between gap-3 border-b p-5">

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Attendance Details
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {
                    selectedRow
                      .staff
                      .name
                  }
                </h2>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {
                    selectedRow
                      .staff
                      .staffCode
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRow(
                    null
                  )
                }
                className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-700"
              >
                ✕
              </button>

            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2">

              <DetailCard
                title="Check In"
                rows={[
                  [
                    "Time",
                    formatTime(
                      selectedRow
                        .attendance
                        ?.checkIn
                    ),
                  ],
                  [
                    "IP",
                    selectedRow
                      .attendance
                      ?.checkInIp ||
                      "—",
                  ],
                  [
                    "Source",
                    selectedRow
                      .attendance
                      ?.checkInSource ||
                      "—",
                  ],
                  [
                    "Distance",
                    selectedRow
                      .attendance
                      ?.checkInDistanceMeters !==
                    null &&
                    selectedRow
                      .attendance
                      ?.checkInDistanceMeters !==
                    undefined
                      ? `${selectedRow.attendance.checkInDistanceMeters} m`
                      : "—",
                  ],
                  [
                    "Accuracy",
                    selectedRow
                      .attendance
                      ?.checkInAccuracyMeters !==
                    null &&
                    selectedRow
                      .attendance
                      ?.checkInAccuracyMeters !==
                    undefined
                      ? `${selectedRow.attendance.checkInAccuracyMeters} m`
                      : "—",
                  ],
                ]}
              />

              <DetailCard
                title="Check Out"
                rows={[
                  [
                    "Time",
                    formatTime(
                      selectedRow
                        .attendance
                        ?.checkOut
                    ),
                  ],
                  [
                    "IP",
                    selectedRow
                      .attendance
                      ?.checkOutIp ||
                      "—",
                  ],
                  [
                    "Source",
                    selectedRow
                      .attendance
                      ?.checkOutSource ||
                      "—",
                  ],
                  [
                    "Working",
                    formatMinutes(
                      selectedRow
                        .attendance
                        ?.workingMinutes
                    ),
                  ],
                ]}
              />

              <DetailCard
                title="Status"
                rows={[
                  [
                    "Attendance",
                    statusLabel(
                      selectedRow.displayStatus
                    ),
                  ],
                  [
                    "Late",
                    selectedRow
                      .attendance
                      ?.lateMinutes
                      ? `${selectedRow.attendance.lateMinutes} min`
                      : "—",
                  ],
                  [
                    "Work Location",
                    String(
                      selectedRow
                        .attendance
                        ?.workLocation ||
                        selectedRow
                          .staff
                          .workMode ||
                        "—"
                    ).replaceAll(
                      "_",
                      " "
                    ),
                  ],
                  [
                    "Admin Edited",
                    selectedRow
                      .attendance
                      ?.adminEdited
                      ? "Yes"
                      : "No",
                  ],
                ]}
              />

              <DetailCard
                title="Verification"
                rows={[
                  [
                    "GPS",
                    selectedRow
                      .attendance
                      ?.checkInGeofencePassed ===
                    true
                      ? "Passed"
                      : selectedRow
                          .attendance
                          ?.checkInGeofencePassed ===
                        false
                        ? "Failed"
                        : "—",
                  ],
                  [
                    "Check-in Photo",
                    selectedRow
                      .attendance
                      ?.checkInPhotoUrl
                      ? "Available"
                      : "—",
                  ],
                  [
                    "Check-out Photo",
                    selectedRow
                      .attendance
                      ?.checkOutPhotoUrl
                      ? "Available"
                      : "—",
                  ],
                  [
                    "Leave",
                    selectedRow
                      .leave
                      ?.leaveType ||
                      "—",
                  ],
                ]}
              />

            </div>

            {(selectedRow
              .attendance
              ?.checkInPhotoUrl ||
              selectedRow
                .attendance
                ?.checkOutPhotoUrl) && (
              <div className="border-t p-5">

                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Attendance Photos
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">

                  {selectedRow
                    .attendance
                    ?.checkInPhotoUrl && (
                    <a
                      href={
                        selectedRow
                          .attendance
                          .checkInPhotoUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center text-xs font-black text-blue-700"
                    >
                      View Check-in Photo
                    </a>
                  )}

                  {selectedRow
                    .attendance
                    ?.checkOutPhotoUrl && (
                    <a
                      href={
                        selectedRow
                          .attendance
                          .checkOutPhotoUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center text-xs font-black text-blue-700"
                    >
                      View Check-out Photo
                    </a>
                  )}

                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* SMALL COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

function Summary({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-3xl font-black ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

function DetailCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<
    [
      string,
      string
    ]
  >;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-xs font-black uppercase tracking-wide text-blue-700">
        {title}
      </p>

      <div className="mt-3 space-y-2">

        {rows.map(
          (row) => (
            <div
              key={
                row[0]
              }
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="font-semibold text-slate-500">
                {row[0]}
              </span>

              <span className="text-right font-black text-slate-900">
                {row[1]}
              </span>
            </div>
          )
        )}

      </div>

    </div>
  );
}
