import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function date(value: unknown) {
  const text = clean(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const parsed = new Date(`${text}T00:00:00+05:30`);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

async function verifyStaff(userId: string, staffId: string) {
  return prisma.staff.findFirst({
    where: {
      id: staffId,
      userId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = clean(searchParams.get("userId"));
    const staffId = clean(searchParams.get("staffId"));

    if (!userId || !staffId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID and Staff ID are required.",
        },
        {
          status: 400,
        }
      );
    }

    const rows = await prisma.leaveRequest.findMany({
      where: {
        userId,
        staffId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      leaves: rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load leave requests.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = clean(body.userId);
    const staffId = clean(body.staffId);
    const leaveType = clean(body.leaveType).toUpperCase();
    const fromDate = date(body.fromDate);
    const toDate = date(body.toDate);
    const reason = clean(body.reason);

    if (
      !userId ||
      !staffId ||
      !fromDate ||
      !toDate ||
      !reason ||
      !leaveType
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Leave type, dates and reason are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (toDate.getTime() < fromDate.getTime()) {
      return NextResponse.json(
        {
          success: false,
          message: "To date cannot be before From date.",
        },
        {
          status: 400,
        }
      );
    }

    const staff = await verifyStaff(userId, staffId);

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff account not found.",
        },
        {
          status: 404,
        }
      );
    }

    const row = await prisma.leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        staffId,
        leaveType: leaveType as any,
        fromDate,
        toDate,
        reason,
        status: "PENDING",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Leave request submitted.",
        leave: row,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit leave request.",
      },
      {
        status: 500,
      }
    );
  }
}
