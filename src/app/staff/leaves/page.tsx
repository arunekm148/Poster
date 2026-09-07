"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Leave = {
  id:string;
  leaveType:string;
  fromDate:string;
  toDate:string;
  reason:string;
  status:string;
  adminRemarks?:string|null;
  Staff?:{ staffCode:string; name:string; designation?:string|null };
};

function date(value:string) {
  return new Date(value).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}

export default function LeavePage() {
  const router = useRouter();
  const [userId,setUserId] = useState("");
  const [rows,setRows] = useState<Leave[]>([]);
  const [filter,setFilter] = useState("PENDING");
  const [loading,setLoading] = useState(true);
  const [remarks,setRemarks] = useState<Record<string,string>>({});
  const [message,setMessage] = useState("");

  async function load(uid:string) {
    setLoading(true);
    const res = await fetch(`/api/staff/leaves?userId=${encodeURIComponent(uid)}`,{cache:"no-store"});
    const data = await res.json();
    if (res.ok && data.success !== false) setRows(Array.isArray(data.leaves) ? data.leaves : []);
    else setMessage(data.message || "Unable to load leave requests.");
    setLoading(false);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("agentUser");
      if (!raw) return router.replace("/login");
      const parsed = JSON.parse(raw);
      const uid = String(parsed.accountType==="STAFF" ? parsed.userId || "" : parsed.id || "");
      if (!uid) return router.replace("/login");
      setUserId(uid);
      void load(uid);
    } catch { router.replace("/login"); }
  },[router]);

  const visible = useMemo(() => filter==="ALL" ? rows : rows.filter(r=>r.status===filter),[rows,filter]);

  async function review(id:string,action:"APPROVED"|"REJECTED") {
    const res = await fetch("/api/staff/leaves",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,id,action,adminRemarks:remarks[id]||""})});
    const data = await res.json();
    if (!res.ok || data.success===false) return setMessage(data.message || "Unable to update leave.");
    setMessage(action==="APPROVED" ? "Leave approved." : "Leave rejected.");
    await load(userId);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/staff" className="rounded-xl border bg-white px-3 py-2 font-black">←</Link>
            <div><p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Attendance Management</p><h1 className="text-2xl font-black">Leave Approvals</h1><p className="text-sm font-semibold text-slate-500">Approve or reject Staff leave requests.</p></div>
          </div>
          <Link href="/staff/attendance" className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">Attendance</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-5">
        {message && <div className="mb-4 rounded-xl border bg-white p-3 text-sm font-bold">{message}</div>}
        <div className="mb-4 flex flex-wrap gap-2">{["PENDING","APPROVED","REJECTED","ALL"].map(x=><button key={x} onClick={()=>setFilter(x)} className={`rounded-xl px-4 py-2 text-xs font-black ${filter===x ? "bg-emerald-700 text-white":"border bg-white"}`}>{x}</button>)}</div>

        {loading ? <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-500">Loading leaves...</div> :
        visible.length===0 ? <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-500">No leave requests.</div> :
        <div className="space-y-3">
          {visible.map(row=>(
            <article key={row.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-black">{row.Staff?.name || "Staff"}</h2><p className="text-xs font-bold text-blue-700">{row.Staff?.staffCode}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{row.status}</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Leave Type</p><p className="mt-1 font-black">{row.leaveType}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Dates</p><p className="mt-1 font-black">{date(row.fromDate)} → {date(row.toDate)}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">Reason</p><p className="mt-1 font-black">{row.reason}</p></div>
              </div>
              {row.status==="PENDING" && <div className="mt-4"><textarea rows={2} value={remarks[row.id]||""} onChange={e=>setRemarks(v=>({...v,[row.id]:e.target.value}))} placeholder="Admin remarks (optional)" className="w-full rounded-xl border px-3 py-2"/><div className="mt-2 flex gap-2"><button onClick={()=>void review(row.id,"APPROVED")} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white">Approve</button><button onClick={()=>void review(row.id,"REJECTED")} className="rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white">Reject</button></div></div>}
            </article>
          ))}
        </div>}
      </section>
    </main>
  );
}
