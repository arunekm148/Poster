import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function clean(value: unknown) { return String(value ?? "").trim(); }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = clean(searchParams.get("userId"));
    if (!userId) return NextResponse.json({ success:false, message:"User ID is required." }, { status:400 });

    const setting = await prisma.attendanceSetting.findUnique({ where:{ userId } });
    return NextResponse.json({ success:true, setting });
  } catch (error) {
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Unable to load attendance settings." }, { status:500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = clean(body.userId);
    if (!userId) return NextResponse.json({ success:false, message:"User ID is required." }, { status:400 });

    const data = {
      officeStartTime: clean(body.officeStartTime) || "09:30",
      officeEndTime: clean(body.officeEndTime) || "18:00",
      graceMinutes: Number(body.graceMinutes ?? 15),
      halfDayCheckInTime: clean(body.halfDayCheckInTime) || "13:00",
      minimumFullDayMinutes: Number(body.minimumFullDayMinutes ?? 480),
      minimumHalfDayMinutes: Number(body.minimumHalfDayMinutes ?? 240),
      timezone: clean(body.timezone) || "Asia/Kolkata",
      weekOffDays: Array.isArray(body.weekOffDays) ? body.weekOffDays : ["SUNDAY"],

      requireCheckInPhoto: Boolean(body.requireCheckInPhoto),
      requireCheckOutPhoto: Boolean(body.requireCheckOutPhoto),
      requireCheckInIp: Boolean(body.requireCheckInIp),
      requireCheckOutIp: Boolean(body.requireCheckOutIp),

      checkInVerificationMode: clean(body.checkInVerificationMode || "IP_AND_PHOTO") as any,
      checkOutVerificationMode: clean(body.checkOutVerificationMode || "IP_ONLY") as any,
      fieldVerificationMode: clean(body.fieldVerificationMode || "PHOTO_ONLY") as any,
      workFromHomeVerificationMode: clean(body.workFromHomeVerificationMode || "PHOTO_ONLY") as any,

      isActive: body.isActive !== false,
      updatedAt: new Date(),
    };

    const setting = await prisma.attendanceSetting.upsert({
      where:{ userId },
      update:data,
      create:{
        id:crypto.randomUUID(),
        userId,
        ...data,
      },
    });

    return NextResponse.json({ success:true, setting });
  } catch (error) {
    console.error("SAVE ATTENDANCE SETTINGS ERROR:", error);
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Unable to save attendance settings." }, { status:500 });
  }
}
