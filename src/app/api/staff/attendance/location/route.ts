import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function clean(value:unknown){return String(value??"").trim();}
function num(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null;}

export async function GET(request:NextRequest){
  try{
    const {searchParams}=new URL(request.url);
    const userId=clean(searchParams.get("userId"));
    if(!userId)return NextResponse.json({success:false,message:"User ID is required."},{status:400});
    const setting=await prisma.attendanceSetting.findUnique({where:{userId},select:{
      gpsAttendanceEnabled:true,officeLatitude:true,officeLongitude:true,officeRadiusMeters:true,maxGpsAccuracyMeters:true,
      requireGpsForCheckIn:true,requireGpsForCheckOut:true
    }});
    return NextResponse.json({success:true,setting});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Unable to load location settings."},{status:500});}
}

export async function PUT(request:NextRequest){
  try{
    const body=await request.json();
    const userId=clean(body.userId);
    if(!userId)return NextResponse.json({success:false,message:"User ID is required."},{status:400});

    const lat=num(body.officeLatitude), lng=num(body.officeLongitude);
    const data={
      gpsAttendanceEnabled:Boolean(body.gpsAttendanceEnabled),
      officeLatitude:lat,
      officeLongitude:lng,
      officeRadiusMeters:Number(body.officeRadiusMeters??200),
      maxGpsAccuracyMeters:Number(body.maxGpsAccuracyMeters??100),
      requireGpsForCheckIn:Boolean(body.requireGpsForCheckIn),
      requireGpsForCheckOut:Boolean(body.requireGpsForCheckOut),
      updatedAt:new Date(),
    };

    const setting=await prisma.attendanceSetting.upsert({
      where:{userId},
      update:data,
      create:{
        id:crypto.randomUUID(),userId,
        officeStartTime:"09:30",officeEndTime:"18:00",graceMinutes:15,halfDayCheckInTime:"13:00",
        minimumFullDayMinutes:480,minimumHalfDayMinutes:240,timezone:"Asia/Kolkata",weekOffDays:["SUNDAY"],
        requireCheckInPhoto:true,requireCheckOutPhoto:false,requireCheckInIp:true,requireCheckOutIp:true,
        checkInVerificationMode:"IP_AND_PHOTO",checkOutVerificationMode:"IP_ONLY",fieldVerificationMode:"PHOTO_ONLY",workFromHomeVerificationMode:"PHOTO_ONLY",
        isActive:true,
        ...data,
      }
    });
    return NextResponse.json({success:true,setting});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Unable to save location settings."},{status:500});}
}
