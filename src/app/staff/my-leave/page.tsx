"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type StaffUser = {
  id?: string;
  userId?: string;
  staffCode?: string;
  name?: string;
};

type LeaveRow = {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
  adminRemarks?: string | null;
};

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

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function MyLeavePage() {
  const router = useRouter();

  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [rows, setRows] = useState<LeaveRow[]>([]);

  const [leaveType, setLeaveType] = useState("CASUAL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    async (currentStaff: StaffUser) => {
      const response = await fetch(
        `/api/staff/my-leave?userId=${encodeURIComponent(
          String(currentStaff.userId || "")
        )}&staffId=${encodeURIComponent(String(currentStaff.id || ""))}`,
        {
          cache: "no-store",
        }
      );

      let json: any = {};

      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        throw new Error(json.message || "Unable to load leave requests.");
      }

      setRows(Array.isArray(json.leaves) ? json.leaves : []);
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

    void load(currentStaff)
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load leave requests."
        );
      })
      .finally(() => setLoading(false));
  }, [router, load]);

  async function submit() {
    if (!staff?.id || !staff.userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/staff/my-leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: staff.userId,
          staffId: staff.id,
          leaveType,
          fromDate,
          toDate,
          reason,
        }),
      });

      let json: any = {};

      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (!response.ok || json.success === false) {
        throw new Error(json.message || "Unable to submit leave.");
      }

      setMessage(json.message || "Leave request submitted.");
      setFromDate("");
      setToDate("");
      setReason("");

      await load(staff);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit leave."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4">

          <div className="flex items-center gap-3">

            <Link
              href="/staff/my-attendance"
              className="rounded-xl border bg-white px-3 py-2 font-black"
            >
              ←
            </Link>

            <div>

              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">
                Staff Portal
              </p>

              <h1 className="text-2xl font-black">
                Apply Leave
              </h1>

              <p className="text-sm font-semibold text-slate-500">
                Submit leave and track approval status.
              </p>

            </div>

          </div>

          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
            {staff?.staffCode}
          </span>

        </div>

      </header>

      <section className="mx-auto max-w-4xl px-4 py-5">

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

        <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm">

          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">
            New Leave Request
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">

            <label>

              <span className="mb-1 block text-xs font-black text-slate-600">
                Leave Type
              </span>

              <select
                value={leaveType}
                onChange={(event) =>
                  setLeaveType(event.target.value)
                }
                className="w-full rounded-xl border px-3 py-3"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
                <option value="OTHER">Other</option>
              </select>

            </label>

            <label>

              <span className="mb-1 block text-xs font-black text-slate-600">
                From
              </span>

              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
                className="w-full rounded-xl border px-3 py-3"
              />

            </label>

            <label>

              <span className="mb-1 block text-xs font-black text-slate-600">
                To
              </span>

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
                className="w-full rounded-xl border px-3 py-3"
              />

            </label>

          </div>

          <label className="mt-4 block">

            <span className="mb-1 block text-xs font-black text-slate-600">
              Type your message
            </span>

            <textarea
              rows={4}
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Enter leave reason..."
              className="w-full rounded-xl border px-3 py-3"
            />

          </label>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="mt-5 w-full rounded-2xl bg-violet-700 px-5 py-4 text-lg font-black text-white disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit"}
          </button>

        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border bg-white shadow-sm">

          <div className="border-b p-5">

            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              My Requests
            </p>

            <h2 className="mt-1 text-xl font-black">
              Leave History
            </h2>

          </div>

          {loading ? (
            <div className="p-8 text-center font-bold text-slate-500">
              Loading leave requests...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center font-bold text-slate-500">
              No leave requests yet.
            </div>
          ) : (
            <div className="space-y-3 p-4">

              {rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border bg-slate-50 p-4"
                >

                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div>

                      <p className="font-black">
                        {row.leaveType}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {formatDate(row.fromDate)}
                        {"  →  "}
                        {formatDate(row.toDate)}
                      </p>

                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                      {row.status}
                    </span>

                  </div>

                  <p className="mt-3 text-sm font-semibold">
                    {row.reason}
                  </p>

                  {row.adminRemarks && (
                    <div className="mt-3 rounded-xl bg-white p-3">

                      <p className="text-[10px] font-black uppercase text-slate-500">
                        Admin Remarks
                      </p>

                      <p className="mt-1 text-sm font-bold">
                        {row.adminRemarks}
                      </p>

                    </div>
                  )}

                </article>
              ))}

            </div>
          )}

        </section>

      </section>

    </main>
  );
}
