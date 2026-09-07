import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseDateTime(value: unknown): Date | null {
  const text = clean(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = clean(searchParams.get("userId"));
    const status = clean(searchParams.get("status")).toUpperCase();

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
    }

    const rows = await prisma.attendanceRegularization.findMany({
      where: {
        userId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        Staff: {
          select: {
            id: true,
            staffCode: true,
            name: true,
            staffRole: true,
            designation: true,
          },
        },
        StaffAttendance: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, regularizations: rows });
  } catch (error) {
    console.error("GET REGULARIZATION ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to load regularization requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = clean(body.userId);
    const staffId = clean(body.staffId);
    const attendanceId = clean(body.attendanceId);
    const attendanceDate = parseDateTime(body.attendanceDate);
    const requestedCheckIn = parseDateTime(body.requestedCheckIn);
    const requestedCheckOut = parseDateTime(body.requestedCheckOut);
    const reason = clean(body.reason);

    if (!userId || !staffId || !attendanceDate || !reason) {
      return NextResponse.json(
        { success: false, message: "User, Staff, attendance date and reason are required." },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, userId },
      select: { id: true },
    });

    if (!staff) {
      return NextResponse.json({ success: false, message: "Staff not found." }, { status: 404 });
    }

    const row = await prisma.attendanceRegularization.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        staffId,
        attendanceId: attendanceId || null,
        attendanceDate,
        requestedCheckIn,
        requestedCheckOut,
        reason,
        status: "PENDING",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, regularization: row }, { status: 201 });
  } catch (error) {
    console.error("CREATE REGULARIZATION ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to create regularization request." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = clean(body.userId);
    const id = clean(body.id);
    const action = clean(body.action).toUpperCase();
    const reviewedById = clean(body.reviewedById);
    const adminRemarks = clean(body.adminRemarks);

    if (!userId || !id || !["APPROVED", "REJECTED", "CANCELLED"].includes(action)) {
      return NextResponse.json({ success: false, message: "Valid request, user and action are required." }, { status: 400 });
    }

    const existing = await prisma.attendanceRegularization.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Regularization request not found." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.attendanceRegularization.update({
        where: { id },
        data: {
          status: action as any,
          reviewedById: reviewedById || userId,
          reviewedAt: new Date(),
          adminRemarks: adminRemarks || null,
          updatedAt: new Date(),
        },
      });

      if (action === "APPROVED") {
        const attendanceDate = new Date(existing.attendanceDate);
        const start = new Date(attendanceDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const attendance = await tx.staffAttendance.findFirst({
          where: {
            staffId: existing.staffId,
            date: { gte: start, lt: end },
          },
        });

        const checkIn = existing.requestedCheckIn || attendance?.checkIn || null;
        const checkOut = existing.requestedCheckOut || attendance?.checkOut || null;

        let workingMinutes: number | null = attendance?.workingMinutes ?? null;
        if (checkIn && checkOut) {
          workingMinutes = Math.max(
            0,
            Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)
          );
        }

        if (attendance) {
          await tx.staffAttendance.update({
            where: { id: attendance.id },
            data: {
              checkIn,
              checkOut,
              workingMinutes,
              adminEdited: true,
              adminEditedAt: new Date(),
              adminEditedById: reviewedById || userId,
            },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ success: true, regularization: result });
  } catch (error) {
    console.error("REVIEW REGULARIZATION ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to review request." },
      { status: 500 }
    );
  }
}
