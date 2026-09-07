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
  Staff?: {
    staffCode: string;
    name: string;
    designation?: string | null;
  };
  StaffAttendance?: {
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string | null;
  } | null;
};

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:true });
}

export default function RegularizationPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [remarks, setRemarks] = useState<Record<string,string>>({});

  async function load(uid: string) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/staff/regularization?userId=${encodeURIComponent(uid)}`, { cache:"no-store" });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || "Unable to load requests.");
      setRows(Array.isArray(data.regularizations) ? data.regularizations : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agentUser");
      if (!raw) return router.replace("/login");
      const parsed = JSON.parse(raw);
      const uid = String(parsed.accountType === "STAFF" ? parsed.userId || "" : parsed.id || "");
      if (!uid) return router.replace("/login");
      setUserId(uid);
      void load(uid);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const visible = useMemo(
    () => filter === "ALL" ? rows : rows.filter(r => r.status === filter),
    [rows, filter]
  );

  async function review(id: string, action: "APPROVED" | "REJECTED") {
    if (!userId) return;
    const res = await fetch("/api/staff/regularization", {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        userId,
        id,
        action,
        reviewedById:userId,
        adminRemarks:remarks[id] || "",
      }),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      setMessage(data.message || "Unable to update request.");
      return;
    }
    setMessage(action === "APPROVED" ? "Regularization approved." : "Regularization rejected.");
    await load(userId);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/staff" className="rounded-xl border bg-white px-3 py-2 font-black">←</Link>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-violet-700">Attendance Management</p>
              <h1 className="text-2xl font-black">Regularization</h1>
              <p className="text-sm font-semibold text-slate-500">Review missed punch correction requests.</p>
            </div>
          </div>
          <Link href="/staff/attendance" className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">Today&apos;s Attendance</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-5">
        {message && <div className="mb-4 rounded-xl border bg-white p-3 text-sm font-bold text-slate-700">{message}</div>}

        <div className="mb-4 flex flex-wrap gap-2">
          {["PENDING","APPROVED","REJECTED","ALL"].map(item => (
            <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-4 py-2 text-xs font-black ${filter===item ? "bg-violet-700 text-white" : "border bg-white text-slate-700"}`}>
              {item.replaceAll("_"," ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-500">Loading requests...</div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-500">No regularization requests.</div>
        ) : (
          <div className="space-y-3">
            {visible.map(row => (
              <article key={row.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black text-slate-950">{row.Staff?.name || "Staff"}</h2>
                    <p className="text-xs font-bold text-blue-700">{row.Staff?.staffCode}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-600">Attendance: {fmt(row.attendanceDate)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{row.status}</span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Current</p><p className="mt-1 text-sm font-bold">In: {fmt(row.StaffAttendance?.checkIn)}<br/>Out: {fmt(row.StaffAttendance?.checkOut)}</p></div>
                  <div className="rounded-xl bg-blue-50 p-3"><p className="text-[10px] font-black uppercase text-blue-700">Requested</p><p className="mt-1 text-sm font-bold">In: {fmt(row.requestedCheckIn)}<br/>Out: {fmt(row.requestedCheckOut)}</p></div>
                  <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-black uppercase text-amber-700">Reason</p><p className="mt-1 text-sm font-bold">{row.reason}</p></div>
                </div>

                {row.status === "PENDING" && (
                  <div className="mt-4">
                    <textarea value={remarks[row.id] || ""} onChange={e => setRemarks(v => ({...v,[row.id]:e.target.value}))} rows={2} placeholder="Admin remarks (optional)" className="w-full rounded-xl border px-3 py-2 text-sm"/>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => void review(row.id,"APPROVED")} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white">Approve</button>
                      <button onClick={() => void review(row.id,"REJECTED")} className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white">Reject</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
