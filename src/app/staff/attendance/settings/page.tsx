"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const weekDays = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

export default function AttendanceSettingsPage() {
  const router = useRouter();
  const [userId,setUserId] = useState("");
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState(false);
  const [form,setForm] = useState({
    officeStartTime:"09:30", officeEndTime:"18:00", graceMinutes:15,
    halfDayCheckInTime:"13:00", minimumFullDayMinutes:480, minimumHalfDayMinutes:240,
    timezone:"Asia/Kolkata", weekOffDays:["SUNDAY"] as string[],
    requireCheckInPhoto:true, requireCheckOutPhoto:false, requireCheckInIp:true, requireCheckOutIp:true,
    checkInVerificationMode:"IP_AND_PHOTO", checkOutVerificationMode:"IP_ONLY",
    fieldVerificationMode:"PHOTO_ONLY", workFromHomeVerificationMode:"PHOTO_ONLY",
  });

  useEffect(()=>{
    try{
      const raw=localStorage.getItem("agentUser");
      if(!raw) return router.replace("/login");
      const parsed=JSON.parse(raw);
      const uid=String(parsed.accountType==="STAFF" ? parsed.userId||"" : parsed.id||"");
      if(!uid) return router.replace("/login");
      setUserId(uid);
      fetch(`/api/staff/attendance/settings?userId=${encodeURIComponent(uid)}`,{cache:"no-store"})
        .then(r=>r.json()).then(data=>{ if(data.setting) setForm(v=>({...v,...data.setting})); });
    }catch{router.replace("/login");}
  },[router]);

  async function save(){
    setSaving(true); setMessage("");
    const res=await fetch("/api/staff/attendance/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,...form})});
    const data=await res.json();
    setSaving(false);
    setMessage(res.ok && data.success!==false ? "Attendance settings saved." : data.message || "Unable to save settings.");
  }

  function toggleDay(day:string){
    setForm(v=>({...v,weekOffDays:v.weekOffDays.includes(day) ? v.weekOffDays.filter(x=>x!==day) : [...v.weekOffDays,day]}));
  }

  return <main className="min-h-screen bg-slate-50 pb-20">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4"><Link href="/staff" className="rounded-xl border px-3 py-2 font-black">←</Link><div><p className="text-[11px] font-black uppercase tracking-wider text-blue-700">Attendance Management</p><h1 className="text-2xl font-black">Attendance Settings</h1></div></div></header>
    <section className="mx-auto max-w-5xl px-4 py-5">
      {message && <div className="mb-4 rounded-xl border bg-white p-3 font-bold">{message}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black">Office Timing</h2><div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Start Time"><input type="time" value={form.officeStartTime} onChange={e=>setForm(v=>({...v,officeStartTime:e.target.value}))} className="w-full rounded-xl border px-3 py-2"/></Field>
          <Field label="End Time"><input type="time" value={form.officeEndTime} onChange={e=>setForm(v=>({...v,officeEndTime:e.target.value}))} className="w-full rounded-xl border px-3 py-2"/></Field>
          <Field label="Grace Minutes"><input type="number" value={form.graceMinutes} onChange={e=>setForm(v=>({...v,graceMinutes:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2"/></Field>
          <Field label="Half Day Check-in"><input type="time" value={form.halfDayCheckInTime} onChange={e=>setForm(v=>({...v,halfDayCheckInTime:e.target.value}))} className="w-full rounded-xl border px-3 py-2"/></Field>
          <Field label="Full Day Minutes"><input type="number" value={form.minimumFullDayMinutes} onChange={e=>setForm(v=>({...v,minimumFullDayMinutes:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2"/></Field>
          <Field label="Half Day Minutes"><input type="number" value={form.minimumHalfDayMinutes} onChange={e=>setForm(v=>({...v,minimumHalfDayMinutes:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2"/></Field>
        </div></div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black">Verification</h2><div className="mt-4 space-y-3">
          <Toggle label="Require Check-in Photo" checked={form.requireCheckInPhoto} onChange={x=>setForm(v=>({...v,requireCheckInPhoto:x}))}/>
          <Toggle label="Require Check-out Photo" checked={form.requireCheckOutPhoto} onChange={x=>setForm(v=>({...v,requireCheckOutPhoto:x}))}/>
          <Toggle label="Require Check-in IP" checked={form.requireCheckInIp} onChange={x=>setForm(v=>({...v,requireCheckInIp:x}))}/>
          <Toggle label="Require Check-out IP" checked={form.requireCheckOutIp} onChange={x=>setForm(v=>({...v,requireCheckOutIp:x}))}/>
        </div></div>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black">Weekly Off</h2><div className="mt-3 flex flex-wrap gap-2">{weekDays.map(day=><button key={day} type="button" onClick={()=>toggleDay(day)} className={`rounded-xl px-3 py-2 text-xs font-black ${form.weekOffDays.includes(day) ? "bg-blue-700 text-white":"border bg-white"}`}>{day.slice(0,3)}</button>)}</div></div>

      <button onClick={()=>void save()} disabled={saving} className="mt-5 rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:opacity-50">{saving ? "Saving..." : "Save Settings"}</button>
    </section>
  </main>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-1 block text-xs font-black text-slate-600">{label}</span>{children}</label>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="font-bold">{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-5 w-5"/></label>}
