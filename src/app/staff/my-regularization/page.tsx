"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type StaffUser = {
  id?: string;
  userId?: string;
  staffCode?: string;
  name?: string;
};

type RequestRow = {
  id: string;
  attendanceDate: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason: string;
  status: string;
  adminRemarks?: string | null;
};

type CalendarMarker = {
  date: string;
  type:
    | "HOLIDAY"
    | "MISSED_PUNCH"
    | "LEAVE"
    | "WEEK_OFF"
    | "PRESENT";
  label: string;
};

const reasons = [
  "Forgot to Clock In",
  "Forgot to Clock Out",
  "Technical Error",
  "Work from Home",
  "Out Duty",
  "Other",
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getLoggedInStaff(): StaffUser | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  for (
    const key of [
      "staffUser",
      "agentUser",
      "user",
    ]
  ) {
    const raw =
      localStorage.getItem(
        key
      );

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(raw);

      if (
        parsed &&
        (
          parsed.staffCode ||
          parsed.accountType ===
            "STAFF" ||
          parsed.role ===
            "STAFF" ||
          parsed.role ===
            "SUPERVISOR"
        )
      ) {
        return parsed;
      }
    } catch {
      //
    }
  }

  return null;
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "—"
    : date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
}

function formatTime(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "—"
    : date.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      );
}

function monthKey(
  date: Date
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function dateKey(
  date: Date
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function markerClass(
  type:
    CalendarMarker["type"]
) {
  switch (type) {
    case "HOLIDAY":
      return "border-red-300 bg-red-50 text-red-700";

    case "MISSED_PUNCH":
      return "border-amber-400 bg-amber-50 text-amber-800";

    case "LEAVE":
      return "border-violet-300 bg-violet-50 text-violet-700";

    case "WEEK_OFF":
      return "border-slate-300 bg-slate-100 text-slate-600";

    case "PRESENT":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function MyRegularizationPage() {
  const router =
    useRouter();

  const [
    staff,
    setStaff,
  ] =
    useState<StaffUser | null>(
      null
    );

  const [
    rows,
    setRows,
  ] =
    useState<RequestRow[]>(
      []
    );

  const [
    markers,
    setMarkers,
  ] =
    useState<CalendarMarker[]>(
      []
    );

  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(
      new Date()
    );

  const [
    attendanceDate,
    setAttendanceDate,
  ] =
    useState("");

  const [
    reasonChoice,
    setReasonChoice,
  ] =
    useState("");

  const [
    location,
    setLocation,
  ] =
    useState(
      "OFFICE"
    );

  const [
    checkInTime,
    setCheckInTime,
  ] =
    useState("");

  const [
    checkOutTime,
    setCheckOutTime,
  ] =
    useState("");

  const [
    messageText,
    setMessageText,
  ] =
    useState("");

  const [
    showReasons,
    setShowReasons,
  ] =
    useState(false);

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
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  const load =
    useCallback(
      async (
        currentStaff:
          StaffUser,
        month:
          Date
      ) => {
        const response =
          await fetch(
            `/api/staff/my-regularization?userId=${encodeURIComponent(
              String(
                currentStaff.userId ||
                ""
              )
            )}&staffId=${encodeURIComponent(
              String(
                currentStaff.id ||
                ""
              )
            )}&month=${encodeURIComponent(
              monthKey(
                month
              )
            )}`,
            {
              cache:
                "no-store",
            }
          );

        let json:
          any = {};

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
            "Unable to load attendance requests."
          );
        }

        setRows(
          Array.isArray(
            json.regularizations
          )
            ? json.regularizations
            : []
        );

        setMarkers(
          Array.isArray(
            json.markers
          )
            ? json.markers
            : []
        );
      },
      []
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const dateFromUrl =
      params.get("date");

    if (dateFromUrl) {
      setAttendanceDate(
        dateFromUrl
      );
    }

    const currentStaff =
      getLoggedInStaff();

    if (
      !currentStaff?.id ||
      !currentStaff
        ?.userId
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    setStaff(
      currentStaff
    );

    void load(
      currentStaff,
      calendarMonth
    )
      .catch(
        (loadError) => {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load attendance requests."
          );
        }
      )
      .finally(
        () => {
          setLoading(
            false
          );
        }
      );
  }, [
    router,
    load,
    calendarMonth,
  ]);

  /* ------------------------------------------------------------------------ */
  /* CALENDAR                                                                 */
  /* ------------------------------------------------------------------------ */

  const markerMap =
    useMemo(
      () =>
        new Map(
          markers.map(
            (item) => [
              item.date,
              item,
            ]
          )
        ),
      [
        markers,
      ]
    );

  const calendarDays =
    useMemo(() => {
      const year =
        calendarMonth.getFullYear();

      const month =
        calendarMonth.getMonth();

      const first =
        new Date(
          year,
          month,
          1
        );

      const last =
        new Date(
          year,
          month + 1,
          0
        );

      const cells:
        Array<Date | null> =
        [];

      for (
        let i = 0;
        i <
        first.getDay();
        i += 1
      ) {
        cells.push(
          null
        );
      }

      for (
        let day = 1;
        day <=
        last.getDate();
        day += 1
      ) {
        cells.push(
          new Date(
            year,
            month,
            day
          )
        );
      }

      while (
        cells.length %
          7 !==
        0
      ) {
        cells.push(
          null
        );
      }

      return cells;
    }, [
      calendarMonth,
    ]);

  function changeMonth(
    delta:
      number
  ) {
    setCalendarMonth(
      (
        current
      ) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            delta,
          1
        )
    );
  }

  function selectDate(
    date:
      Date
  ) {
    const key =
      dateKey(
        date
      );

    setAttendanceDate(
      key
    );

    const marker =
      markerMap.get(
        key
      );

    if (
      marker?.type ===
      "MISSED_PUNCH"
    ) {
      if (
        marker.label.includes(
          "Check In"
        )
      ) {
        setReasonChoice(
          "Forgot to Clock In"
        );
      } else if (
        marker.label.includes(
          "Check Out"
        )
      ) {
        setReasonChoice(
          "Forgot to Clock Out"
        );
      }
    }
  }

  /* ------------------------------------------------------------------------ */
  /* SUBMIT                                                                   */
  /* ------------------------------------------------------------------------ */

  function buildDateTime(
    date:
      string,
    time:
      string
  ) {
    if (
      !date ||
      !time
    ) {
      return null;
    }

    return `${date}T${time}:00+05:30`;
  }

  async function submit() {
    if (
      !staff?.id ||
      !staff.userId
    ) {
      return;
    }

    if (
      !attendanceDate ||
      !reasonChoice
    ) {
      setError(
        "Attendance date and reason are required."
      );

      return;
    }

    if (
      !checkInTime &&
      !checkOutTime
    ) {
      setError(
        "Enter requested check-in or check-out time."
      );

      return;
    }

    const fullReason =
      [
        reasonChoice,
        `Location: ${location.replaceAll(
          "_",
          " "
        )}`,
        messageText.trim(),
      ]
        .filter(
          Boolean
        )
        .join(
          " | "
        );

    setSaving(
      true
    );

    setMessage("");

    setError("");

    try {
      const response =
        await fetch(
          "/api/staff/my-regularization",
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
                  staff.userId,
                staffId:
                  staff.id,
                attendanceDate,
                requestedCheckIn:
                  buildDateTime(
                    attendanceDate,
                    checkInTime
                  ),
                requestedCheckOut:
                  buildDateTime(
                    attendanceDate,
                    checkOutTime
                  ),
                reason:
                  fullReason,
              }),
          }
        );

      let json:
        any = {};

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
          "Unable to submit attendance request."
        );
      }

      setMessage(
        json.message ||
        "Attendance request submitted."
      );

      setAttendanceDate("");

      setReasonChoice("");

      setLocation(
        "OFFICE"
      );

      setCheckInTime("");

      setCheckOutTime("");

      setMessageText("");

      await load(
        staff,
        calendarMonth
      );
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit attendance request."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/staff/my-attendance"
              className="rounded-xl border bg-white px-3 py-2 font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Staff Portal
              </p>

              <h1 className="text-2xl font-black">
                Attendance Request
              </h1>

              <p className="text-sm font-semibold text-slate-500">
                Holidays and missed punches are highlighted for easy selection.
              </p>

            </div>

          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            {staff?.staffCode}
          </span>

        </div>

      </header>

      <section className="mx-auto max-w-5xl px-4 py-5">

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-700">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
            ⚠️ {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          {/* CALENDAR */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-center justify-between gap-3">

              <button
                type="button"
                onClick={() =>
                  changeMonth(
                    -1
                  )
                }
                className="rounded-xl border bg-white px-3 py-2 font-black"
              >
                ←
              </button>

              <h2 className="text-lg font-black">
                {calendarMonth.toLocaleDateString(
                  "en-IN",
                  {
                    month:
                      "long",
                    year:
                      "numeric",
                  }
                )}
              </h2>

              <button
                type="button"
                onClick={() =>
                  changeMonth(
                    1
                  )
                }
                className="rounded-xl border bg-white px-3 py-2 font-black"
              >
                →
              </button>

            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-500">

              {[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ].map(
                (
                  day
                ) => (
                  <div
                    key={
                      day
                    }
                    className="py-1"
                  >
                    {day}
                  </div>
                )
              )}

            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">

              {calendarDays.map(
                (
                  date,
                  index
                ) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="aspect-square"
                      />
                    );
                  }

                  const key =
                    dateKey(
                      date
                    );

                  const marker =
                    markerMap.get(
                      key
                    );

                  const selected =
                    attendanceDate ===
                    key;

                  return (
                    <button
                      key={
                        key
                      }
                      type="button"
                      title={
                        marker?.label ||
                        ""
                      }
                      onClick={() =>
                        selectDate(
                          date
                        )
                      }
                      className={`relative aspect-square rounded-xl border text-sm font-black transition ${
                        selected
                          ? "border-blue-700 bg-blue-700 text-white"
                          : marker
                            ? markerClass(
                                marker.type
                              )
                            : "border-transparent bg-white text-slate-800 hover:border-blue-300"
                      }`}
                    >

                      {date.getDate()}

                      {marker &&
                        !selected && (
                          <span
                            className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                              marker.type ===
                              "HOLIDAY"
                                ? "bg-red-500"
                                : marker.type ===
                                    "MISSED_PUNCH"
                                  ? "bg-amber-500"
                                  : marker.type ===
                                      "LEAVE"
                                    ? "bg-violet-500"
                                    : marker.type ===
                                        "WEEK_OFF"
                                      ? "bg-slate-500"
                                      : "bg-emerald-500"
                            }`}
                          />
                        )}

                    </button>
                  );
                }
              )}

            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black">

              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-800">
                ● Missed Punch
              </span>

              <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-red-700">
                ● Holiday
              </span>

              <span className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-violet-700">
                ● Leave
              </span>

              <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-slate-600">
                ● Weekly Off
              </span>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                ● Complete
              </span>

            </div>

            {attendanceDate &&
              markerMap.get(
                attendanceDate
              ) && (
                <div className="mt-3 rounded-xl border bg-white p-3">

                  <p className="text-xs font-black text-slate-500">
                    Selected Date
                  </p>

                  <p className="mt-1 font-black">
                    {
                      markerMap.get(
                        attendanceDate
                      )?.label
                    }
                  </p>

                </div>
              )}

          </div>

          {/* REQUEST */}

          <div className="mt-5 rounded-2xl bg-blue-50 p-4">

            <p className="text-xs font-black uppercase text-blue-700">
              For Myself
            </p>

            <p className="mt-1 text-lg font-black text-blue-950">
              Attendance Request
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setShowReasons(
                true
              )
            }
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left"
          >

            <p className="text-xs font-black uppercase text-slate-500">
              Reasons
            </p>

            <p className="mt-1 font-black text-slate-950">
              {reasonChoice ||
                "Select reason"}
            </p>

          </button>

          <label className="mt-4 block">

            <span className="mb-1 block text-xs font-black text-slate-600">
              Location
            </span>

            <select
              value={
                location
              }
              onChange={(
                event
              ) =>
                setLocation(
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-3 py-3 font-bold"
            >
              <option value="OFFICE">
                Office
              </option>

              <option value="WORK_FROM_HOME">
                Work from Home
              </option>

              <option value="FIELD">
                Out Duty / Field
              </option>
            </select>

          </label>

          <div className="mt-4 grid gap-3 md:grid-cols-3">

            <label>

              <span className="mb-1 block text-xs font-black text-slate-600">
                Date
              </span>

              <input
                type="date"
                value={
                  attendanceDate
                }
                onChange={(
                  event
                ) =>
                  setAttendanceDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border px-3 py-3"
              />

            </label>

            <TimePicker
              label="From"
              value={checkInTime}
              onChange={setCheckInTime}
            />

            <TimePicker
              label="To"
              value={checkOutTime}
              onChange={setCheckOutTime}
            />

          </div>

          <label className="mt-4 block">

            <span className="mb-1 block text-xs font-black text-slate-600">
              Type your message
            </span>

            <textarea
              rows={4}
              value={
                messageText
              }
              onChange={(
                event
              ) =>
                setMessageText(
                  event.target.value
                )
              }
              placeholder="Explain the attendance correction..."
              className="w-full rounded-xl border px-3 py-3"
            />

          </label>

          <button
            type="button"
            onClick={() =>
              void submit()
            }
            disabled={
              saving
            }
            className="mt-5 w-full rounded-2xl bg-blue-700 px-5 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {saving
              ? "Submitting..."
              : "Submit"}
          </button>

        </section>

        {/* HISTORY */}

        <section className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">

          <div className="border-b p-5">

            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              My Requests
            </p>

            <h2 className="mt-1 text-xl font-black">
              Request History
            </h2>

          </div>

          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">
              Loading requests...
            </div>
          ) : rows.length ===
            0 ? (
            <div className="p-8 text-center font-bold text-slate-500">
              No attendance requests yet.
            </div>
          ) : (
            <div className="space-y-3 p-4">

              {rows.map(
                (row) => (
                  <article
                    key={
                      row.id
                    }
                    className="rounded-2xl border bg-slate-50 p-4"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-3">

                      <div>

                        <p className="font-black">
                          {formatDate(
                            row.attendanceDate
                          )}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {formatTime(
                            row.requestedCheckIn
                          )}
                          {"  →  "}
                          {formatTime(
                            row.requestedCheckOut
                          )}
                        </p>

                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                        {
                          row.status
                        }
                      </span>

                    </div>

                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {
                        row.reason
                      }
                    </p>

                    {row.adminRemarks && (
                      <div className="mt-3 rounded-xl bg-white p-3">

                        <p className="text-[10px] font-black uppercase text-slate-500">
                          Admin Remarks
                        </p>

                        <p className="mt-1 text-sm font-bold">
                          {
                            row.adminRemarks
                          }
                        </p>

                      </div>
                    )}

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </section>

      {/* REASON SHEET */}

      {showReasons && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">

          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">

            <div className="flex items-center justify-between">

              <h2 className="text-xl font-black">
                Reasons
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowReasons(
                    false
                  )
                }
                className="rounded-xl bg-slate-100 px-3 py-2 font-black"
              >
                ✕
              </button>

            </div>

            <div className="mt-3 divide-y divide-slate-100">

              {reasons.map(
                (
                  reason
                ) => (
                  <button
                    key={
                      reason
                    }
                    type="button"
                    onClick={() => {
                      setReasonChoice(
                        reason
                      );

                      setShowReasons(
                        false
                      );
                    }}
                    className="block w-full py-4 text-left text-base font-bold text-slate-800"
                  >
                    {
                      reason
                    }
                  </button>
                )
              )}

            </div>

          </div>

        </div>
      )}

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* CUSTOM TIME PICKER                                                         */
/* -------------------------------------------------------------------------- */

function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const parsed = (() => {
    if (!value) {
      return {
        hour: 9,
        minute: 30,
        period: "AM" as "AM" | "PM",
      };
    }

    const [hText, mText] = value.split(":");
    const h24 = Number(hText);
    const minute = Number(mText);

    const period: "AM" | "PM" =
      h24 >= 12
        ? "PM"
        : "AM";

    const hour12 =
      h24 % 12 === 0
        ? 12
        : h24 % 12;

    return {
      hour: hour12,
      minute:
        Number.isFinite(minute)
          ? minute
          : 0,
      period,
    };
  })();

  const [
    hour,
    setHour,
  ] =
    useState(
      parsed.hour
    );

  const [
    minute,
    setMinute,
  ] =
    useState(
      parsed.minute
    );

  const [
    period,
    setPeriod,
  ] =
    useState<
      "AM" | "PM"
    >(
      parsed.period
    );

  useEffect(() => {
    const next = (() => {
      if (!value) {
        return {
          hour: 9,
          minute: 30,
          period:
            "AM" as "AM" | "PM",
        };
      }

      const [hText, mText] =
        value.split(":");

      const h24 =
        Number(hText);

      const min =
        Number(mText);

      return {
        hour:
          h24 % 12 === 0
            ? 12
            : h24 % 12,
        minute:
          Number.isFinite(min)
            ? min
            : 0,
        period:
          h24 >= 12
            ? ("PM" as const)
            : ("AM" as const),
      };
    })();

    setHour(
      next.hour
    );

    setMinute(
      next.minute
    );

    setPeriod(
      next.period
    );
  }, [
    value,
  ]);

  function formatDisplay() {
    if (!value) {
      return "Select time";
    }

    return `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(
      2,
      "0"
    )} ${period}`;
  }

  function apply() {
    let h24 =
      hour % 12;

    if (
      period ===
      "PM"
    ) {
      h24 += 12;
    }

    const nextValue =
      `${String(
        h24
      ).padStart(
        2,
        "0"
      )}:${String(
        minute
      ).padStart(
        2,
        "0"
      )}`;

    onChange(
      nextValue
    );

    setOpen(
      false
    );
  }

  const quickTimes = [
    "09:00",
    "09:30",
    "10:00",
    "13:00",
    "13:30",
    "18:00",
    "18:30",
  ];

  return (
    <div>

      <span className="mb-1 block text-xs font-black text-slate-600">
        {label}
      </span>

      <button
        type="button"
        onClick={() =>
          setOpen(
            true
          )
        }
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-3 text-left"
      >
        <span
          className={
            value
              ? "font-black text-slate-950"
              : "font-semibold text-slate-400"
          }
        >
          {
            formatDisplay()
          }
        </span>

        <span className="text-slate-500">
          🕒
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">

          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                  Select Time
                </p>

                <h3 className="mt-1 text-xl font-black">
                  {label}
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-700"
              >
                ✕
              </button>

            </div>

            <div className="mt-5">

              <p className="text-xs font-black uppercase text-slate-500">
                Hour
              </p>

              <div className="mt-2 grid grid-cols-6 gap-2">

                {Array.from(
                  {
                    length:
                      12,
                  },
                  (
                    _,
                    index
                  ) =>
                    index + 1
                ).map(
                  (
                    item
                  ) => (
                    <button
                      key={
                        item
                      }
                      type="button"
                      onClick={() =>
                        setHour(
                          item
                        )
                      }
                      className={`rounded-xl border px-2 py-2.5 text-sm font-black ${
                        hour ===
                        item
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {
                        item
                      }
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="mt-5">

              <p className="text-xs font-black uppercase text-slate-500">
                Minutes
              </p>

              <div className="mt-2 grid grid-cols-4 gap-2">

                {[
                  0,
                  15,
                  30,
                  45,
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
                        setMinute(
                          item
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-black ${
                        minute ===
                        item
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {String(
                        item
                      ).padStart(
                        2,
                        "0"
                      )}
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="mt-5">

              <p className="text-xs font-black uppercase text-slate-500">
                AM / PM
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">

                {[
                  "AM",
                  "PM",
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
                        setPeriod(
                          item as
                            | "AM"
                            | "PM"
                        )
                      }
                      className={`rounded-xl border px-4 py-3 font-black ${
                        period ===
                        item
                          ? "border-blue-700 bg-blue-700 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {
                        item
                      }
                    </button>
                  )
                )}

              </div>

            </div>

            <div className="mt-5">

              <p className="text-xs font-black uppercase text-slate-500">
                Quick Select
              </p>

              <div className="mt-2 flex flex-wrap gap-2">

                {quickTimes.map(
                  (
                    item
                  ) => {
                    const [
                      h,
                      m,
                    ] =
                      item.split(
                        ":"
                      );

                    const h24 =
                      Number(
                        h
                      );

                    const itemPeriod =
                      h24 >= 12
                        ? "PM"
                        : "AM";

                    const itemHour =
                      h24 % 12 ===
                      0
                        ? 12
                        : h24 %
                          12;

                    const label =
                      `${String(
                        itemHour
                      ).padStart(
                        2,
                        "0"
                      )}:${m} ${itemPeriod}`;

                    return (
                      <button
                        key={
                          item
                        }
                        type="button"
                        onClick={() => {
                          setHour(
                            itemHour
                          );

                          setMinute(
                            Number(
                              m
                            )
                          );

                          setPeriod(
                            itemPeriod as
                              | "AM"
                              | "PM"
                          );
                        }}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700"
                      >
                        {
                          label
                        }
                      </button>
                    );
                  }
                )}

              </div>

            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  apply
                }
                className="rounded-xl bg-blue-700 px-4 py-3 font-black text-white"
              >
                Apply
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
