"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LocationPage(){
  const router=useRouter();
  const [userId,setUserId]=useState("");
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    gpsAttendanceEnabled:false,
    officeLatitude:"",
    officeLongitude:"",
    officeRadiusMeters:200,
    maxGpsAccuracyMeters:100,
    requireGpsForCheckIn:false,
    requireGpsForCheckOut:false,
  });

  useEffect(()=>{try{const raw=localStorage.getItem("agentUser");if(!raw)return router.replace("/login");const parsed=JSON.parse(raw);const uid=String(parsed.accountType==="STAFF"?parsed.userId||"":parsed.id||"");if(!uid)return router.replace("/login");setUserId(uid);fetch(`/api/staff/attendance/location?userId=${encodeURIComponent(uid)}`,{cache:"no-store"}).then(r=>r.json()).then(data=>{if(data.setting)setForm(v=>({...v,...data.setting,officeLatitude:data.setting.officeLatitude??"",officeLongitude:data.setting.officeLongitude??""}));});}catch{router.replace("/login");}},[router]);

  async function save(){
    setSaving(true);const res=await fetch("/api/staff/attendance/location",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,...form})});const data=await res.json();setSaving(false);setMessage(res.ok&&data.success!==false?"Location settings saved.":data.message||"Unable to save.");
  }

  function useCurrentLocation(){
    if(!navigator.geolocation)return setMessage("Geolocation is not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      pos=>setForm(v=>({...v,officeLatitude:String(pos.coords.latitude),officeLongitude:String(pos.coords.longitude)})),
      err=>setMessage(err.message),
      {enableHighAccuracy:true,timeout:15000}
    );
  }

  return <main className="min-h-screen bg-slate-50 pb-20"><header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4"><Link href="/staff" className="rounded-xl border px-3 py-2 font-black">←</Link><div><p className="text-[11px] font-black uppercase tracking-wider text-blue-700">Attendance Management</p><h1 className="text-2xl font-black">GPS & Office Location</h1></div></div></header>
  <section className="mx-auto max-w-5xl px-4 py-5">{message&&<div className="mb-4 rounded-xl border bg-white p-3 font-bold">{message}</div>}
  <div className="rounded-2xl border bg-white p-5 shadow-sm"><label className="flex items-center justify-between rounded-xl bg-blue-50 p-4"><span className="font-black">Enable GPS Attendance</span><input type="checkbox" checked={form.gpsAttendanceEnabled} onChange={e=>setForm(v=>({...v,gpsAttendanceEnabled:e.target.checked}))} className="h-5 w-5"/></label>
  <div className="mt-4 grid gap-3 md:grid-cols-2">
    <Field label="Office Latitude"><input value={form.officeLatitude} onChange={e=>setForm(v=>({...v,officeLatitude:e.target.value}))} className="w-full rounded-xl border px-3 py-2"/></Field>
    <Field label="Office Longitude"><input value={form.officeLongitude} onChange={e=>setForm(v=>({...v,officeLongitude:e.target.value}))} className="w-full rounded-xl border px-3 py-2"/></Field>
    <Field label="Allowed Radius (meters)"><input type="number" value={form.officeRadiusMeters} onChange={e=>setForm(v=>({...v,officeRadiusMeters:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2"/></Field>
    <Field label="Max GPS Accuracy (meters)"><input type="number" value={form.maxGpsAccuracyMeters} onChange={e=>setForm(v=>({...v,maxGpsAccuracyMeters:Number(e.target.value)}))} className="w-full rounded-xl border px-3 py-2"/></Field>
  </div>
  <div className="mt-4 grid gap-3 md:grid-cols-2"><Toggle label="Require GPS for Check-in" checked={form.requireGpsForCheckIn} onChange={x=>setForm(v=>({...v,requireGpsForCheckIn:x}))}/><Toggle label="Require GPS for Check-out" checked={form.requireGpsForCheckOut} onChange={x=>setForm(v=>({...v,requireGpsForCheckOut:x}))}/></div>
  <div className="mt-4 flex flex-wrap gap-2"><button onClick={useCurrentLocation} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700">📍 Use Current Location</button><button onClick={()=>void save()} disabled={saving} className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving?"Saving...":"Save Location"}</button></div>
  </div></section></main>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-1 block text-xs font-black text-slate-600">{label}</span>{children}</label>}
function Toggle({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="font-bold">{label}</span><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} className="h-5 w-5"/></label>}
