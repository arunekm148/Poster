import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseDateOnly(value: string | null) {
  const raw = clean(value);

  const base =
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : new Date().toISOString().slice(0, 10);

  const start = new Date(`${base}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    key: base,
    start,
    end,
  };
}

function normalizeWeekDay(date: Date) {
  return date
    .toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    })
    .toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* GET TODAY / DATE ATTENDANCE                                                */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = clean(
      searchParams.get("userId")
    );

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const owner = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          message: "Agent account not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!owner.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Agent account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    const selected = parseDateOnly(
      searchParams.get("date")
    );

    const [
      staff,
      attendance,
      approvedLeaves,
      holiday,
      settings,
    ] = await Promise.all([
      prisma.staff.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: [
          {
            staffRole: "desc",
          },
          {
            name: "asc",
          },
        ],
        select: {
          id: true,
          staffCode: true,
          name: true,
          phone: true,
          staffRole: true,
          designation: true,
          department: true,
          supervisorId: true,
          workMode: true,
          loginEnabled: true,
          isActive: true,
          supervisor: {
            select: {
              id: true,
              staffCode: true,
              name: true,
            },
          },
        },
      }),

      prisma.staffAttendance.findMany({
        where: {
          userId,
          date: {
            gte: selected.start,
            lt: selected.end,
          },
        },
        select: {
          id: true,
          staffId: true,
          date: true,
          checkIn: true,
          checkOut: true,
          notes: true,
          status: true,
          workLocation: true,
          lateMinutes: true,
          workingMinutes: true,

          checkInIp: true,
          checkInPhotoUrl: true,
          checkInSource: true,
          checkInUserAgent: true,

          checkOutIp: true,
          checkOutPhotoUrl: true,
          checkOutSource: true,
          checkOutUserAgent: true,

          checkInLatitude: true,
          checkInLongitude: true,
          checkInAccuracyMeters: true,
          checkInDistanceMeters: true,
          checkInGeofencePassed: true,

          checkOutLatitude: true,
          checkOutLongitude: true,
          checkOutAccuracyMeters: true,
          checkOutDistanceMeters: true,
          checkOutGeofencePassed: true,

          adminEdited: true,
          adminEditedAt: true,
          adminEditedById: true,
        },
      }),

      prisma.leaveRequest.findMany({
        where: {
          userId,
          status: "APPROVED",
          fromDate: {
            lte: selected.start,
          },
          toDate: {
            gte: selected.start,
          },
        },
        select: {
          id: true,
          staffId: true,
          leaveType: true,
          fromDate: true,
          toDate: true,
          reason: true,
        },
      }),

      prisma.attendanceHoliday.findFirst({
        where: {
          userId,
          isActive: true,
          date: {
            gte: selected.start,
            lt: selected.end,
          },
        },
        select: {
          id: true,
          date: true,
          name: true,
          description: true,
        },
      }),

      prisma.attendanceSetting.findUnique({
        where: {
          userId,
        },
        select: {
          officeStartTime: true,
          officeEndTime: true,
          graceMinutes: true,
          halfDayCheckInTime: true,
          minimumFullDayMinutes: true,
          minimumHalfDayMinutes: true,
          timezone: true,
          weekOffDays: true,

          gpsAttendanceEnabled: true,
          requireGpsForCheckIn: true,
          requireGpsForCheckOut: true,
          maxGpsAccuracyMeters: true,
          officeLatitude: true,
          officeLongitude: true,
          officeRadiusMeters: true,

          requireCheckInPhoto: true,
          requireCheckOutPhoto: true,
          requireCheckInIp: true,
          requireCheckOutIp: true,

          checkInVerificationMode: true,
          checkOutVerificationMode: true,
          fieldVerificationMode: true,
          workFromHomeVerificationMode: true,
        },
      }),
    ]);

    const attendanceByStaffId = new Map(
      attendance.map((item) => [
        item.staffId,
        item,
      ])
    );

    const leaveByStaffId = new Map(
      approvedLeaves.map((item) => [
        item.staffId,
        item,
      ])
    );

    const weekDay = normalizeWeekDay(
      selected.start
    );

    const weekOff =
      settings?.weekOffDays
        ?.map((item) =>
          String(item).toUpperCase()
        )
        .includes(weekDay) ?? false;

    const nowKey =
      new Date().toLocaleDateString(
        "en-CA",
        {
          timeZone:
            settings?.timezone ||
            "Asia/Kolkata",
        }
      );

    const isToday =
      selected.key === nowKey;

    const rows = staff.map((member) => {
      const record =
        attendanceByStaffId.get(
          member.id
        ) || null;

      const leave =
        leaveByStaffId.get(
          member.id
        ) || null;

      let displayStatus:
        | "PRESENT"
        | "LATE"
        | "HALF_DAY"
        | "ABSENT"
        | "ON_LEAVE"
        | "WEEK_OFF"
        | "HOLIDAY"
        | "NOT_PUNCHED";

      if (record) {
        displayStatus =
          record.status;
      } else if (leave) {
        displayStatus =
          "ON_LEAVE";
      } else if (holiday) {
        displayStatus =
          "HOLIDAY";
      } else if (weekOff) {
        displayStatus =
          "WEEK_OFF";
      } else {
        displayStatus =
          isToday
            ? "NOT_PUNCHED"
            : "ABSENT";
      }

      return {
        staff: member,
        attendance: record,
        leave,
        displayStatus,
      };
    });

    const counts = {
      total: rows.length,
      present: rows.filter(
        (item) =>
          item.displayStatus ===
            "PRESENT" ||
          item.displayStatus ===
            "LATE" ||
          item.displayStatus ===
            "HALF_DAY"
      ).length,

      late: rows.filter(
        (item) =>
          item.displayStatus ===
          "LATE"
      ).length,

      halfDay: rows.filter(
        (item) =>
          item.displayStatus ===
          "HALF_DAY"
      ).length,

      absent: rows.filter(
        (item) =>
          item.displayStatus ===
          "ABSENT"
      ).length,

      onLeave: rows.filter(
        (item) =>
          item.displayStatus ===
          "ON_LEAVE"
      ).length,

      notPunched: rows.filter(
        (item) =>
          item.displayStatus ===
          "NOT_PUNCHED"
      ).length,

      weekOff: rows.filter(
        (item) =>
          item.displayStatus ===
          "WEEK_OFF"
      ).length,

      holiday: rows.filter(
        (item) =>
          item.displayStatus ===
          "HOLIDAY"
      ).length,

      checkedOut: rows.filter(
        (item) =>
          Boolean(
            item.attendance?.checkOut
          )
      ).length,
    };

    return NextResponse.json(
      {
        success: true,
        date: selected.key,
        counts,
        rows,
        holiday,
        weekOff,
        weekDay,
        settings,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET STAFF ATTENDANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load attendance.",
      },
      {
        status: 500,
      }
    );
  }
}
