import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function clean(value: unknown) {
  return String(value ?? "").trim();
}
function parseDate(value: unknown) {
  const t = clean(value);
  if (!t) return null;
  const d = new Date(`${t}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = clean(searchParams.get("userId"));
    if (!userId) return NextResponse.json({ success:false, message:"User ID is required." }, { status:400 });

    const leaves = await prisma.leaveRequest.findMany({
      where:{ userId },
      orderBy:{ createdAt:"desc" },
      include:{
        Staff:{
          select:{ id:true, staffCode:true, name:true, staffRole:true, designation:true }
        }
      }
    });

    return NextResponse.json({ success:true, leaves });
  } catch (error) {
    console.error("GET LEAVES ERROR:", error);
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Unable to load leave requests." }, { status:500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = clean(body.userId);
    const staffId = clean(body.staffId);
    const leaveType = clean(body.leaveType).toUpperCase() || "CASUAL";
    const fromDate = parseDate(body.fromDate);
    const toDate = parseDate(body.toDate);
    const reason = clean(body.reason);

    if (!userId || !staffId || !fromDate || !toDate || !reason) {
      return NextResponse.json({ success:false, message:"User, Staff, dates and reason are required." }, { status:400 });
    }

    const row = await prisma.leaveRequest.create({
      data:{
        id:crypto.randomUUID(),
        userId,
        staffId,
        leaveType:leaveType as any,
        fromDate,
        toDate,
        reason,
        status:"PENDING",
        updatedAt:new Date(),
      }
    });

    return NextResponse.json({ success:true, leave:row }, { status:201 });
  } catch (error) {
    console.error("CREATE LEAVE ERROR:", error);
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Unable to create leave request." }, { status:500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = clean(body.userId);
    const id = clean(body.id);
    const action = clean(body.action).toUpperCase();
    const adminRemarks = clean(body.adminRemarks);

    if (!userId || !id || !["APPROVED","REJECTED","CANCELLED"].includes(action)) {
      return NextResponse.json({ success:false, message:"Valid user, request and action are required." }, { status:400 });
    }

    const existing = await prisma.leaveRequest.findFirst({ where:{ id, userId } });
    if (!existing) return NextResponse.json({ success:false, message:"Leave request not found." }, { status:404 });

    const updated = await prisma.leaveRequest.update({
      where:{ id },
      data:{
        status:action as any,
        reviewedById:userId,
        reviewedAt:new Date(),
        adminRemarks:adminRemarks || null,
        updatedAt:new Date(),
      }
    });

    return NextResponse.json({ success:true, leave:updated });
  } catch (error) {
    console.error("REVIEW LEAVE ERROR:", error);
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Unable to review leave request." }, { status:500 });
  }
}
