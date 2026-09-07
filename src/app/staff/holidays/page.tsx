"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Holiday={id:string;date:string;name:string;description?:string|null;isActive:boolean};

export default function HolidaysPage(){
  const router=useRouter();
  const [userId,setUserId]=useState("");
  const [rows,setRows]=useState<Holiday[]>([]);
  const [form,setForm]=useState({date:"",name:"",description:""});
  const [message,setMessage]=useState("");

  async function load(uid:string){
    const res=await fetch(`/api/staff/holidays?userId=${encodeURIComponent(uid)}`,{cache:"no-store"});
    const data=await res.json();
    if(res.ok&&data.success!==false) setRows(Array.isArray(data.holidays)?data.holidays:[]);
    else setMessage(data.message||"Unable to load holidays.");
  }

  useEffect(()=>{try{const raw=localStorage.getItem("agentUser");if(!raw)return router.replace("/login");const parsed=JSON.parse(raw);const uid=String(parsed.accountType==="STAFF"?parsed.userId||"":parsed.id||"");if(!uid)return router.replace("/login");setUserId(uid);void load(uid);}catch{router.replace("/login");}},[router]);

  async function add(){
    const res=await fetch("/api/staff/holidays",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,...form})});
    const data=await res.json(); if(!res.ok||data.success===false)return setMessage(data.message||"Unable to add holiday.");
    setForm({date:"",name:"",description:""});setMessage("Holiday added.");await load(userId);
  }

  async function remove(id:string){
    if(!window.confirm("Delete this holiday?"))return;
    const res=await fetch(`/api/staff/holidays?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(id)}`,{method:"DELETE"});
    const data=await res.json(); if(!res.ok||data.success===false)return setMessage(data.message||"Unable to delete holiday.");
    await load(userId);
  }

  return <main className="min-h-screen bg-slate-50 pb-20"><header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4"><Link href="/staff" className="rounded-xl border px-3 py-2 font-black">←</Link><div><p className="text-[11px] font-black uppercase tracking-wider text-violet-700">Attendance Management</p><h1 className="text-2xl font-black">Holiday Management</h1></div></div></header>
  <section className="mx-auto max-w-5xl px-4 py-5">{message&&<div className="mb-4 rounded-xl border bg-white p-3 font-bold">{message}</div>}
  <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black">Add Holiday</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><input type="date" value={form.date} onChange={e=>setForm(v=>({...v,date:e.target.value}))} className="rounded-xl border px-3 py-2"/><input placeholder="Holiday name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} className="rounded-xl border px-3 py-2"/><input placeholder="Description (optional)" value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} className="rounded-xl border px-3 py-2"/></div><button onClick={()=>void add()} className="mt-3 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-black text-white">Add Holiday</button></div>
  <div className="mt-4 space-y-3">{rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm"><div><p className="font-black">{row.name}</p><p className="text-sm font-semibold text-slate-500">{new Date(row.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p>{row.description&&<p className="mt-1 text-sm text-slate-600">{row.description}</p>}</div><button onClick={()=>void remove(row.id)} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">Delete</button></div>)}</div>
  </section></main>
}
