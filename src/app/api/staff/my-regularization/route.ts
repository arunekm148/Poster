import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function dateAtStart(value: unknown) {
  const text = clean(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00+05:30`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function dateTime(value: unknown) {
  const text = clean(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function monthRange(month: string | null) {
  const raw = clean(month);

  const now = new Date();

  const year =
    /^\d{4}-\d{2}$/.test(raw)
      ? Number(raw.slice(0, 4))
      : now.getFullYear();

  const monthIndex =
    /^\d{4}-\d{2}$/.test(raw)
      ? Number(raw.slice(5, 7)) - 1
      : now.getMonth();

  const start = new Date(
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-01T00:00:00+05:30`
  );

  const nextMonth =
    monthIndex === 11
      ? new Date(`${year + 1}-01-01T00:00:00+05:30`)
      : new Date(
          `${year}-${String(monthIndex + 2).padStart(2, "0")}-01T00:00:00+05:30`
        );

  return {
    year,
    monthIndex,
    start,
    end: nextMonth,
  };
}

function dateKey(value: Date) {
  return value.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

async function verifyStaff(
  userId: string,
  staffId: string
) {
  return prisma.staff.findFirst({
    where: {
      id: staffId,
      userId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      staffCode: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const userId =
      clean(
        searchParams.get("userId")
      );

    const staffId =
      clean(
        searchParams.get("staffId")
      );

    const month =
      clean(
        searchParams.get("month")
      );

    if (!userId || !staffId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID and Staff ID are required.",
        },
        {
          status: 400,
        }
      );
    }

    const staff =
      await verifyStaff(
        userId,
        staffId
      );

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff account not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      start,
      end,
    } =
      monthRange(month);

    const [
      regularizations,
      attendanceRows,
      holidays,
      approvedLeaves,
      setting,
    ] =
      await Promise.all([
        prisma.attendanceRegularization.findMany({
          where: {
            userId,
            staffId,
          },
          orderBy: {
            createdAt:
              "desc",
          },
          take: 50,
        }),

        prisma.staffAttendance.findMany({
          where: {
            userId,
            staffId,
            date: {
              gte: start,
              lt: end,
            },
          },
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
            status: true,
          },
        }),

        prisma.attendanceHoliday.findMany({
          where: {
            userId,
            isActive: true,
            date: {
              gte: start,
              lt: end,
            },
          },
          orderBy: {
            date: "asc",
          },
          select: {
            id: true,
            date: true,
            name: true,
          },
        }),

        prisma.leaveRequest.findMany({
          where: {
            userId,
            staffId,
            status: "APPROVED",
            fromDate: {
              lt: end,
            },
            toDate: {
              gte: start,
            },
          },
          select: {
            id: true,
            fromDate: true,
            toDate: true,
            leaveType: true,
          },
        }),

        prisma.attendanceSetting.findUnique({
          where: {
            userId,
          },
          select: {
            weekOffDays: true,
            timezone: true,
          },
        }),
      ]);

    const holidayMap =
      new Map(
        holidays.map(
          (holiday) => [
            dateKey(
              holiday.date
            ),
            holiday.name,
          ]
        )
      );

    const attendanceMap =
      new Map(
        attendanceRows.map(
          (row) => [
            dateKey(
              row.date
            ),
            row,
          ]
        )
      );

    const leaveDates =
      new Set<string>();

    for (
      const leave of
      approvedLeaves
    ) {
      const cursor =
        new Date(
          leave.fromDate
        );

      const leaveEnd =
        new Date(
          leave.toDate
        );

      while (
        cursor.getTime() <=
        leaveEnd.getTime()
      ) {
        leaveDates.add(
          dateKey(
            cursor
          )
        );

        cursor.setDate(
          cursor.getDate() + 1
        );
      }
    }

    const weekOffDays =
      new Set(
        (
          setting?.weekOffDays ||
          ["SUNDAY"]
        ).map(
          (day) =>
            String(
              day
            ).toUpperCase()
        )
      );

    const markers: Array<{
      date: string;
      type:
        | "HOLIDAY"
        | "MISSED_PUNCH"
        | "LEAVE"
        | "WEEK_OFF"
        | "PRESENT";
      label: string;
    }> = [];

    const cursor =
      new Date(start);

    while (
      cursor.getTime() <
      end.getTime()
    ) {
      const key =
        dateKey(
          cursor
        );

      const holidayName =
        holidayMap.get(
          key
        );

      const attendance =
        attendanceMap.get(
          key
        );

      const weekDay =
        cursor
          .toLocaleDateString(
            "en-US",
            {
              weekday:
                "long",
              timeZone:
                setting?.timezone ||
                "Asia/Kolkata",
            }
          )
          .toUpperCase();

      if (holidayName) {
        markers.push({
          date: key,
          type:
            "HOLIDAY",
          label:
            holidayName,
        });
      } else if (
        leaveDates.has(
          key
        )
      ) {
        markers.push({
          date: key,
          type:
            "LEAVE",
          label:
            "Approved Leave",
        });
      } else if (
        weekOffDays.has(
          weekDay
        )
      ) {
        markers.push({
          date: key,
          type:
            "WEEK_OFF",
          label:
            "Weekly Off",
        });
      } else if (
        attendance
      ) {
        if (
          !attendance.checkIn ||
          !attendance.checkOut
        ) {
          markers.push({
            date: key,
            type:
              "MISSED_PUNCH",
            label:
              !attendance.checkIn &&
              !attendance.checkOut
                ? "Missing Check In & Check Out"
                : !attendance.checkIn
                  ? "Missing Check In"
                  : "Missing Check Out",
          });
        } else {
          markers.push({
            date: key,
            type:
              "PRESENT",
            label:
              "Attendance Complete",
          });
        }
      }

      cursor.setDate(
        cursor.getDate() +
          1
      );
    }

    return NextResponse.json({
      success: true,
      regularizations,
      markers,
      holidays,
    });
  } catch (error) {
    console.error(
      "GET MY REGULARIZATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load regularization requests.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      clean(body.userId);

    const staffId =
      clean(body.staffId);

    const attendanceDate =
      dateAtStart(
        body.attendanceDate
      );

    const requestedCheckIn =
      dateTime(
        body.requestedCheckIn
      );

    const requestedCheckOut =
      dateTime(
        body.requestedCheckOut
      );

    const reason =
      clean(body.reason);

    if (
      !userId ||
      !staffId ||
      !attendanceDate ||
      !reason
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Attendance date and reason are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !requestedCheckIn &&
      !requestedCheckOut
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter the requested check-in or check-out time.",
        },
        {
          status: 400,
        }
      );
    }

    const staff =
      await verifyStaff(
        userId,
        staffId
      );

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff account not found.",
        },
        {
          status: 404,
        }
      );
    }

    const dayStart =
      new Date(
        attendanceDate
      );

    const dayEnd =
      new Date(
        attendanceDate
      );

    dayEnd.setDate(
      dayEnd.getDate() +
        1
    );

    const attendance =
      await prisma.staffAttendance.findFirst({
        where: {
          userId,
          staffId,
          date: {
            gte:
              dayStart,
            lt:
              dayEnd,
          },
        },
        select: {
          id: true,
        },
      });

    const row =
      await prisma.attendanceRegularization.create({
        data: {
          id:
            crypto.randomUUID(),
          userId,
          staffId,
          attendanceId:
            attendance?.id ||
            null,
          attendanceDate,
          requestedCheckIn,
          requestedCheckOut,
          reason,
          status:
            "PENDING",
          updatedAt:
            new Date(),
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Attendance request submitted.",
        regularization:
          row,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE MY REGULARIZATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to submit attendance request.",
      },
      {
        status: 500,
      }
    );
  }
}
