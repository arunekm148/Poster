"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type StaffUser = {
  id?: string;
  userId?: string;
  staffCode?: string;
  name?: string;
  phone?: string;
  staffRole?: string;
  workMode?: string | null;
};

type Attendance = {
  id: string;
  date?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string | null;
  workLocation?: string | null;
  lateMinutes?: number | null;
  workingMinutes?: number | null;
};

type HistoryRow = {
  id: string;
  date?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string | null;
  workLocation?: string | null;
  lateMinutes?: number | null;
  workingMinutes?: number | null;
  adminEdited?: boolean;
};

type TeamPresence = {
  id: string;
  staffCode?: string | null;
  name: string;
  status:
    | "PRESENT"
    | "ON_LEAVE"
    | "NOT_PUNCHED"
    | "ABSENT"
    | "WEEK_OFF"
    | "HOLIDAY";
  isMe?: boolean;
};

type Setting = {
  officeStartTime?: string | null;
  officeEndTime?: string | null;
  graceMinutes?: number | null;
  weekOffDays?: string[] | null;

  gpsAttendanceEnabled?: boolean;
  requireGpsForCheckIn?: boolean;
  requireGpsForCheckOut?: boolean;
  requireCheckInPhoto?: boolean;
  requireCheckOutPhoto?: boolean;
  officeRadiusMeters?: number | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  staff?: StaffUser;
  attendance?: Attendance | null;
  history?: HistoryRow[];
  setting?: Setting | null;
  teamPresence?: TeamPresence[];
  holiday?: {
    name?: string;
  } | null;
  weekOff?: boolean;
};

type Tab = "SUMMARY" | "PUNCH";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getLoggedInStaff(): StaffUser | null {
  if (typeof window === "undefined") return null;

  for (const key of ["staffUser", "agentUser", "user"]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);

      if (
        parsed &&
        (
          parsed.staffCode ||
          parsed.accountType === "STAFF" ||
          parsed.role === "STAFF" ||
          parsed.role === "SUPERVISOR"
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

function formatTime(value?: string | null) {
  if (!value) return "N.A.";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N.A.";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatShortTime(value?: string | null) {
  if (!value) return "N.A.";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N.A.";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dayParts(value?: string | null) {
  if (!value) {
    return {
      day: "--",
      month: "---",
      weekDay: "---",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      day: "--",
      month: "---",
      weekDay: "---",
    };
  }

  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: date.toLocaleDateString("en-IN", {
      month: "short",
    }),
    weekDay: date.toLocaleDateString("en-IN", {
      weekday: "short",
    }),
  };
}

function formatMinutes(value?: number | null) {
  const minutes = Number(value || 0);

  if (!minutes) return "00:00";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function readable(value?: string | null) {
  return String(value || "—")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedStatus(value?: string | null) {
  return String(value || "").toUpperCase();
}

function monthName(date: Date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function toDateInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function presenceStyle(status: TeamPresence["status"]) {
  switch (status) {
    case "PRESENT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ON_LEAVE":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "ABSENT":
      return "bg-red-50 text-red-700 border-red-200";
    case "WEEK_OFF":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "HOLIDAY":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function MyAttendancePage() {
  const router = useRouter();

  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const [tab, setTab] = useState<Tab>("SUMMARY");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [workLocation, setWorkLocation] = useState("OFFICE");

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [locationLoading, setLocationLoading] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD                                                                     */
  /* ------------------------------------------------------------------------ */

  const loadData = useCallback(
    async (currentStaff: StaffUser) => {
      const ownerUserId = String(currentStaff.userId || "").trim();
      const currentStaffId = String(currentStaff.id || "").trim();

      if (!ownerUserId || !currentStaffId) {
        throw new Error("Staff login information is incomplete.");
      }

      const response = await fetch(
        `/api/staff/my-attendance?userId=${encodeURIComponent(
          ownerUserId
        )}&staffId=${encodeURIComponent(currentStaffId)}`,
        {
          cache: "no-store",
        }
      );

      let json: ApiResponse = {};

      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        throw new Error(json.message || "Unable to load attendance.");
      }

      setData(json);

      if (json.staff?.workMode) {
        const mode = String(json.staff.workMode).toUpperCase();

        if (mode.includes("HOME")) {
          setWorkLocation("WORK_FROM_HOME");
        } else if (mode.includes("FIELD")) {
          setWorkLocation("FIELD");
        }
      }
    },
    []
  );

  useEffect(() => {
    const currentStaff = getLoggedInStaff();

    if (!currentStaff?.id || !currentStaff?.userId) {
      router.replace("/login");
      return;
    }

    setStaff(currentStaff);

    void loadData(currentStaff)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load attendance."
        );
      })
      .finally(() => setLoading(false));
  }, [router, loadData]);

  /* ------------------------------------------------------------------------ */
  /* MONTH SUMMARY                                                            */
  /* ------------------------------------------------------------------------ */

  const monthSummary = useMemo(() => {
    const now = new Date();

    const rows =
      Array.isArray(data?.history)
        ? data?.history || []
        : [];

    const monthRows = rows.filter((row) => {
      if (!row.date) return false;

      const date = new Date(row.date);

      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    });

    const presentDays = monthRows.filter((row) => {
      const status = normalizedStatus(row.status);

      return ["PRESENT", "LATE", "HALF_DAY"].includes(status);
    }).length;

    const absentDays = monthRows.filter(
      (row) => normalizedStatus(row.status) === "ABSENT"
    ).length;

    const workingRows = monthRows.filter(
      (row) => Number(row.workingMinutes || 0) > 0
    );

    const averageMinutes = workingRows.length
      ? Math.round(
          workingRows.reduce(
            (total, row) => total + Number(row.workingMinutes || 0),
            0
          ) / workingRows.length
        )
      : 0;

    const leaveDays =
      data?.teamPresence?.find((member) => member.isMe)?.status === "ON_LEAVE"
        ? 1
        : 0;

    return {
      monthLabel: monthName(now),
      presentDays,
      absentDays,
      leaveDays,
      averageMinutes,
    };
  }, [data]);

  /* ------------------------------------------------------------------------ */
  /* LOCATION                                                                 */
  /* ------------------------------------------------------------------------ */

  function captureLocation() {
    if (!navigator.geolocation) {
      setError("GPS is not supported by this device/browser.");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        setLocationLoading(false);
      },
      (locationError) => {
        setError(locationError.message || "Unable to read GPS location.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CAMERA                                                                   */
  /* ------------------------------------------------------------------------ */

  function stopCamera() {
    const stream = cameraStreamRef.current;

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraStarting(false);
  }

  async function openCamera() {
    setError("");
    setCameraStarting(true);
    setCameraOpen(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported by this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: {
            ideal: 720,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStarting(false);
    } catch (cameraError) {
      stopCamera();

      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Unable to open camera."
      );
    }
  }

  async function captureSelfie() {
    const video = videoRef.current;

    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setError("Camera is not ready. Please wait and try again.");
      return;
    }

    setPhotoUploading(true);
    setError("");

    try {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const sourceX = Math.max(0, (video.videoWidth - size) / 2);
      const sourceY = Math.max(0, (video.videoHeight - size) / 2);

      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 720;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to capture selfie.");
      }

      context.translate(canvas.width, 0);
      context.scale(-1, 1);

      context.drawImage(
        video,
        sourceX,
        sourceY,
        size,
        size,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.88);
      });

      if (!blob) {
        throw new Error("Unable to create selfie image.");
      }

      setPhotoPreview(URL.createObjectURL(blob));

      const file = new File(
        [blob],
        `attendance-selfie-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
        }
      );

      const form = new FormData();

      form.append("file", file);
      form.append("folder", "other");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      let json: any = {};

      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        throw new Error(json.message || "Unable to upload selfie.");
      }

      const url = String(
        json.url ||
          json.fileUrl ||
          json.location ||
          json.data?.url ||
          json.data?.fileUrl ||
          ""
      ).trim();

      if (!url) {
        throw new Error("Selfie uploaded but no file URL was returned.");
      }

      setPhotoUrl(url);
      stopCamera();
    } catch (captureError) {
      setPhotoUrl("");

      setError(
        captureError instanceof Error
          ? captureError.message
          : "Unable to capture selfie."
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  useEffect(() => {
    return () => {
      const stream = cameraStreamRef.current;

      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* PUNCH                                                                    */
  /* ------------------------------------------------------------------------ */

  async function punch(action: "PUNCH_IN" | "PUNCH_OUT") {
    if (!staff?.id || !staff.userId) return;

    const setting = data?.setting;

    const photoRequired =
      action === "PUNCH_IN"
        ? Boolean(setting?.requireCheckInPhoto)
        : Boolean(setting?.requireCheckOutPhoto);

    const gpsRequired =
      Boolean(setting?.gpsAttendanceEnabled) &&
      (
        action === "PUNCH_IN"
          ? Boolean(setting?.requireGpsForCheckIn)
          : Boolean(setting?.requireGpsForCheckOut)
      );

    if (photoRequired && !photoUrl) {
      setError("Please capture your selfie first.");
      return;
    }

    if (gpsRequired && !location) {
      setError("Please capture your GPS location first.");
      return;
    }

    setActionLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/staff/my-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: staff.userId,
          staffId: staff.id,
          action,
          workLocation,
          photoUrl: photoUrl || null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          accuracy: location?.accuracy ?? null,
        }),
      });

      let json: any = {};

      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        throw new Error(json.message || "Unable to save attendance.");
      }

      setMessage(json.message || "Attendance updated.");
      setPhotoUrl("");
      setPhotoPreview("");
      setLocation(null);

      await loadData(staff);
      setTab("SUMMARY");
    } catch (punchError) {
      setError(
        punchError instanceof Error
          ? punchError.message
          : "Unable to save attendance."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const attendance = data?.attendance || null;
  const hasPunchedIn = Boolean(attendance?.checkIn);
  const hasPunchedOut = Boolean(attendance?.checkOut);

  const teamPresence = useMemo(
    () =>
      Array.isArray(data?.teamPresence)
        ? data?.teamPresence || []
        : [],
    [data]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="font-bold text-slate-500">
          Loading my attendance...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950">

      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/staff/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white font-black shadow-sm"
            >
              ←
            </Link>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Staff Portal
              </p>

              <h1 className="text-2xl font-black">
                My Attendance
              </h1>

              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                Summary, punch and attendance requests.
              </p>
            </div>

          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
            {staff?.staffCode}
          </span>

        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-5">

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* TABS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">

          <div className="grid grid-cols-2 gap-1">

            <button
              type="button"
              onClick={() => setTab("SUMMARY")}
              className={`rounded-xl px-4 py-3 text-sm font-black ${
                tab === "SUMMARY"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600"
              }`}
            >
              Summary
            </button>

            <button
              type="button"
              onClick={() => setTab("PUNCH")}
              className={`rounded-xl px-4 py-3 text-sm font-black ${
                tab === "PUNCH"
                  ? "bg-blue-700 text-white"
                  : "text-slate-600"
              }`}
            >
              Check In / Out
            </button>

          </div>

        </div>

        {tab === "SUMMARY" ? (
          <>
            {/* SUMMARY */}

            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="text-center">

                <p className="text-sm font-bold text-slate-500">
                  {monthSummary.monthLabel}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">

                  <SummaryMetric
                    value={String(monthSummary.leaveDays)}
                    label="Leave Days"
                    valueClass="text-violet-700"
                  />

                  <SummaryMetric
                    value={String(monthSummary.presentDays)}
                    label="Present Days"
                    valueClass="text-emerald-700"
                  />

                  <SummaryMetric
                    value={String(monthSummary.absentDays)}
                    label="Absent Days"
                    valueClass="text-red-700"
                  />

                  <SummaryMetric
                    value={formatMinutes(monthSummary.averageMinutes)}
                    label="Avg. Work Duration"
                    valueClass="text-blue-700"
                  />

                </div>

                <a
                  href="#history"
                  className="mt-6 inline-flex rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white"
                >
                  Attendance View
                </a>

              </div>

              <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-3">

                <InfoPanel
                  title="Shift"
                  lines={[
                    `${data?.setting?.officeStartTime || "09:30"} - ${
                      data?.setting?.officeEndTime || "18:00"
                    }`,
                    "Office",
                  ]}
                />

                <InfoPanel
                  title="Weekly Off"
                  lines={[
                    data?.setting?.weekOffDays?.length
                      ? data.setting.weekOffDays.map(readable).join(", ")
                      : "Sunday",
                  ]}
                />

                <InfoPanel
                  title="Attendance Policy"
                  lines={[
                    data?.setting?.gpsAttendanceEnabled
                      ? "GPS Verification"
                      : "Web Attendance",
                    data?.setting?.requireCheckInPhoto
                      ? "Selfie required at check-in"
                      : "Selfie optional",
                  ]}
                />

              </div>

            </section>

            {/* QUICK SELF SERVICE */}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              <Link
                href="/staff/my-regularization"
                className="rounded-2xl bg-blue-700 p-4 text-center font-black text-white shadow-sm"
              >
                📅 Update Attendance
              </Link>

              <Link
                href="/staff/my-leave"
                className="rounded-2xl bg-violet-700 p-4 text-center font-black text-white shadow-sm"
              >
                🌴 Apply Leave
              </Link>

            </div>

            {/* HISTORY */}

            <section
              id="history"
              className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >

              <div className="border-b border-slate-200 p-5">

                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                  Attendance History
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Recent Attendance
                </h2>

              </div>

              {!data?.history?.length ? (
                <div className="p-8 text-center font-bold text-slate-500">
                  No attendance history yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">

                  {data.history.map((row) => {
                    const dateInfo = dayParts(row.date);
                    const status = normalizedStatus(row.status);

                    return (
                      <div
                        key={row.id}
                        className="grid gap-3 px-4 py-4 md:grid-cols-[90px_1fr_auto] md:items-center"
                      >

                        <div className="flex gap-3 md:block">

                          <p className="text-2xl font-black text-slate-900">
                            {dateInfo.day}
                          </p>

                          <div>
                            <p className="text-sm font-black text-slate-600">
                              {dateInfo.month}
                            </p>

                            <p className="text-xs font-bold text-slate-400">
                              {dateInfo.weekDay}
                            </p>
                          </div>

                        </div>

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <p
                              className={`font-black ${
                                status === "ABSENT"
                                  ? "text-red-700"
                                  : status === "WEEK_OFF"
                                    ? "text-violet-700"
                                    : "text-slate-950"
                              }`}
                            >
                              {readable(row.status)}
                            </p>

                            {row.adminEdited && (
                              <span className="text-xs font-black text-emerald-700">
                                Attendance Request
                              </span>
                            )}

                          </div>

                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {formatTime(row.checkIn)}
                            {"  →  "}
                            {formatTime(row.checkOut)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {data?.setting?.officeStartTime || "09:30"} to{" "}
                            {data?.setting?.officeEndTime || "18:00"} ·{" "}
                            {readable(row.workLocation)}
                          </p>

                        </div>

                        <Link
                          href={`/staff/my-regularization?date=${encodeURIComponent(
                            toDateInput(row.date)
                          )}`}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-black text-blue-700"
                        >
                          Update
                        </Link>

                      </div>
                    );
                  })}

                </div>
              )}

            </section>

            {/* TEAM PRESENCE */}

            <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                    Team Presence Today
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    Coworker Availability
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Only basic availability is shown.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {teamPresence.length} Staff
                </span>

              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

                {teamPresence.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-black text-slate-950">
                        {member.name}
                        {member.isMe ? " (You)" : ""}
                      </p>

                      <p className="text-xs font-bold text-blue-700">
                        {member.staffCode}
                      </p>

                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${presenceStyle(
                        member.status
                      )}`}
                    >
                      {readable(member.status)}
                    </span>

                  </div>
                ))}

              </div>

            </section>
          </>
        ) : (
          <>
            {/* PUNCH */}

            <section className="mt-4 overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm">

              <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-5 text-white">

                <div className="flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">
                      Today&apos;s Attendance
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {staff?.name || "Staff Member"}
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-blue-100">
                      Status:{" "}
                      <span className="font-black text-white">
                        {attendance
                          ? readable(attendance.status)
                          : data?.holiday?.name
                            ? `Holiday - ${data.holiday.name}`
                            : data?.weekOff
                              ? "Weekly Off"
                              : "Not Punched"}
                      </span>
                    </p>

                  </div>

                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">

                    <p className="text-[10px] font-black uppercase text-blue-200">
                      Shift
                    </p>

                    <p className="mt-1 font-black">
                      {data?.setting?.officeStartTime || "09:30"} –{" "}
                      {data?.setting?.officeEndTime || "18:00"}
                    </p>

                  </div>

                </div>

              </div>

              <div className="p-5">

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

                  <PunchMetric
                    label="Punch In"
                    value={formatShortTime(attendance?.checkIn)}
                    valueClass="text-emerald-700"
                  />

                  <PunchMetric
                    label="Punch Out"
                    value={formatShortTime(attendance?.checkOut)}
                    valueClass="text-blue-700"
                  />

                  <PunchMetric
                    label="Late"
                    value={
                      attendance?.lateMinutes
                        ? `${attendance.lateMinutes} min`
                        : "—"
                    }
                    valueClass="text-amber-700"
                  />

                  <PunchMetric
                    label="Working"
                    value={formatMinutes(attendance?.workingMinutes)}
                    valueClass="text-violet-700"
                  />

                </div>

                {!hasPunchedOut &&
                  !data?.holiday &&
                  !data?.weekOff && (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                      <div className="grid gap-3 md:grid-cols-3">

                        <label>

                          <span className="mb-1 block text-xs font-black text-slate-600">
                            Location
                          </span>

                          <select
                            value={workLocation}
                            onChange={(event) =>
                              setWorkLocation(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-bold"
                          >
                            <option value="OFFICE">Office</option>
                            <option value="WORK_FROM_HOME">
                              Work From Home
                            </option>
                            <option value="FIELD">Out Duty / Field</option>
                          </select>

                        </label>

                        <div>

                          <span className="mb-1 block text-xs font-black text-slate-600">
                            GPS
                          </span>

                          <button
                            type="button"
                            onClick={captureLocation}
                            disabled={locationLoading}
                            className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-black text-blue-700 disabled:opacity-50"
                          >
                            {locationLoading
                              ? "Getting Location..."
                              : location
                                ? `✓ GPS ${Math.round(location.accuracy)}m`
                                : "📍 Capture GPS"}
                          </button>

                        </div>

                        <div>

                          <span className="mb-1 block text-xs font-black text-slate-600">
                            Selfie
                          </span>

                          <button
                            type="button"
                            onClick={() => void openCamera()}
                            disabled={cameraStarting || photoUploading}
                            className="w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-black text-violet-700 disabled:opacity-50"
                          >
                            {photoUploading
                              ? "Uploading..."
                              : photoUrl
                                ? "✓ Selfie Ready"
                                : "📸 Open Camera"}
                          </button>

                        </div>

                      </div>

                      {photoPreview && (
                        <div className="mt-3">

                          <img
                            src={photoPreview}
                            alt="Selfie preview"
                            className="h-24 w-24 rounded-2xl border object-cover"
                          />

                        </div>
                      )}

                      <div className="mt-4">

                        {!hasPunchedIn ? (
                          <button
                            type="button"
                            onClick={() => void punch("PUNCH_IN")}
                            disabled={actionLoading || photoUploading}
                            className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-50"
                          >
                            {actionLoading
                              ? "Saving..."
                              : "🟢 PUNCH IN"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void punch("PUNCH_OUT")}
                            disabled={actionLoading || photoUploading}
                            className="w-full rounded-2xl bg-red-700 px-5 py-4 text-lg font-black text-white shadow-sm disabled:opacity-50"
                          >
                            {actionLoading
                              ? "Saving..."
                              : "🔴 PUNCH OUT"}
                          </button>
                        )}

                      </div>

                    </div>
                  )}

              </div>

            </section>
          </>
        )}

      </section>

      {/* CAMERA MODAL */}

      {cameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">

          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b px-4 py-3">

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                  Attendance Selfie
                </p>

                <h2 className="font-black text-slate-950">
                  Front Camera
                </h2>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl bg-slate-100 px-3 py-2 font-black text-slate-700"
              >
                ✕
              </button>

            </div>

            <div className="bg-black p-3">

              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-950">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full scale-x-[-1] object-cover"
                />

                {cameraStarting && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                    Opening camera...
                  </div>
                )}

              </div>

            </div>

            <div className="p-4">

              <p className="mb-3 text-center text-xs font-semibold text-slate-500">
                Keep your face clearly visible and capture a live selfie.
              </p>

              <button
                type="button"
                onClick={() => void captureSelfie()}
                disabled={cameraStarting || photoUploading}
                className="w-full rounded-2xl bg-violet-700 px-5 py-3.5 font-black text-white disabled:opacity-50"
              >
                {photoUploading
                  ? "Saving Selfie..."
                  : "📸 Capture Selfie"}
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

function SummaryMetric({
  value,
  label,
  valueClass,
}: {
  value: string;
  label: string;
  valueClass: string;
}) {
  return (
    <div>

      <p className={`text-3xl font-black ${valueClass}`}>
        {value}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {label}
      </p>

    </div>
  );
}

function InfoPanel({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div>

      <p className="font-black text-slate-950">
        {title}
      </p>

      <div className="mt-2 space-y-1">

        {lines.map((line) => (
          <p
            key={line}
            className="text-sm font-semibold text-slate-600"
          >
            {line}
          </p>
        ))}

      </div>

    </div>
  );
}

function PunchMetric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className={`mt-1 text-xl font-black ${valueClass}`}>
        {value}
      </p>

    </div>
  );
}
