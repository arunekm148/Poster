import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function clean(value: unknown){ return String(value ?? "").trim(); }
function date(value: unknown){ const t=clean(value); if(!t) return null; const d=new Date(`${t}T00:00:00`); return Number.isNaN(d.getTime())?null:d; }

export async function GET(request:NextRequest){
  try{
    const {searchParams}=new URL(request.url);
    const userId=clean(searchParams.get("userId"));
    if(!userId) return NextResponse.json({success:false,message:"User ID is required."},{status:400});
    const holidays=await prisma.attendanceHoliday.findMany({where:{userId},orderBy:{date:"asc"}});
    return NextResponse.json({success:true,holidays});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Unable to load holidays."},{status:500});}
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const userId=clean(body.userId), name=clean(body.name), description=clean(body.description);
    const holidayDate=date(body.date);
    if(!userId||!name||!holidayDate) return NextResponse.json({success:false,message:"User, date and holiday name are required."},{status:400});
    const holiday=await prisma.attendanceHoliday.create({data:{id:crypto.randomUUID(),userId,date:holidayDate,name,description:description||null,isActive:true,updatedAt:new Date()}});
    return NextResponse.json({success:true,holiday},{status:201});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Unable to create holiday."},{status:500});}
}

export async function PATCH(request:NextRequest){
  try{
    const body=await request.json();
    const userId=clean(body.userId), id=clean(body.id), name=clean(body.name), description=clean(body.description);
    const holidayDate=date(body.date);
    if(!userId||!id) return NextResponse.json({success:false,message:"User and holiday ID are required."},{status:400});
    const existing=await prisma.attendanceHoliday.findFirst({where:{id,userId}});
    if(!existing) return NextResponse.json({success:false,message:"Holiday not found."},{status:404});
    const holiday=await prisma.attendanceHoliday.update({where:{id},data:{...(holidayDate?{date:holidayDate}:{}),...(name?{name}:{}),description:description||null,isActive:body.isActive!==false,updatedAt:new Date()}});
    return NextResponse.json({success:true,holiday});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Unable to update holiday."},{status:500});}
}

export async function DELETE(request:NextRequest){
  try{
    const {searchParams}=new URL(request.url);
    const userId=clean(searchParams.get("userId")), id=clean(searchParams.get("id"));
    if(!userId||!id) return NextResponse.json({success:false,message:"User and holiday ID are required."},{status:400});
    const existing=await prisma.attendanceHoliday.findFirst({where:{id,userId}});
    if(!existing) return NextResponse.json({success:false,message:"Holiday not found."},{status:404});
    await prisma.attendanceHoliday.delete({where:{id}});
    return NextResponse.json({success:true});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Unable to delete holiday."},{status:500});}
}
