import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getIndiaDateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

function getIndiaDayRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00+05:30`);
  const end = new Date(`${dateKey}T23:59:59.999+05:30`);

  return {
    start,
    end,
  };
}

function minutesFromTime(value: string | null | undefined) {
  const text = clean(value);

  const match = /^(\d{1,2}):(\d{2})$/.exec(text);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function indiaMinutesNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(
    parts.find((item) => item.type === "hour")?.value || 0
  );

  const minute = Number(
    parts.find((item) => item.type === "minute")?.value || 0
  );

  return hour * 60 + minute;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadius = 6371000;

  const toRad = (value: number) =>
    (value * Math.PI) / 180;

  const dLat =
    toRad(lat2 - lat1);

  const dLon =
    toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}

function getRequestIp(request: NextRequest) {
  const forwarded =
    request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
}

async function resolveStaff(
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
      userId: true,
      staffCode: true,
      name: true,
      phone: true,
      staffRole: true,
      designation: true,
      department: true,
      workMode: true,
      supervisorId: true,
    },
  });
}

async function getAttendanceSetting(
  userId: string
) {
  return prisma.attendanceSetting.findUnique({
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
    },
  });
}

function getGpsVerification({
  latitude,
  longitude,
  accuracy,
  setting,
}: {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  setting: Awaited<
    ReturnType<typeof getAttendanceSetting>
  >;
}) {
  const officeLatitude =
    numberOrNull(setting?.officeLatitude);

  const officeLongitude =
    numberOrNull(setting?.officeLongitude);

  const radius =
    Number(
      setting?.officeRadiusMeters ??
      200
    );

  const maxAccuracy =
    Number(
      setting?.maxGpsAccuracyMeters ??
      100
    );

  if (
    latitude === null ||
    longitude === null
  ) {
    return {
      distance: null,
      geofencePassed: null,
      accuracyPassed: null,
    };
  }

  const distance =
    officeLatitude !== null &&
    officeLongitude !== null
      ? Math.round(
          haversineMeters(
            latitude,
            longitude,
            officeLatitude,
            officeLongitude
          )
        )
      : null;

  const accuracyPassed =
    accuracy === null
      ? null
      : accuracy <= maxAccuracy;

  const geofencePassed =
    distance === null
      ? null
      : distance <= radius;

  return {
    distance,
    geofencePassed,
    accuracyPassed,
  };
}

/* -------------------------------------------------------------------------- */
/* GET - MY ATTENDANCE + SAFE TEAM PRESENCE                                   */
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
      await resolveStaff(
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

    const dateKey =
      clean(
        searchParams.get("date")
      ) || getIndiaDateKey();

    const {
      start,
      end,
    } =
      getIndiaDayRange(
        dateKey
      );

    const historyStart =
      new Date(start);

    historyStart.setDate(
      historyStart.getDate() -
        30
    );

    const [
      setting,
      myAttendance,
      myHistory,
      coworkers,
      todayAttendance,
      approvedLeaves,
      holiday,
    ] =
      await Promise.all([
        getAttendanceSetting(
          userId
        ),

        prisma.staffAttendance.findFirst({
          where: {
            userId,
            staffId,
            date: {
              gte: start,
              lte: end,
            },
          },
          orderBy: {
            date: "desc",
          },
        }),

        prisma.staffAttendance.findMany({
          where: {
            userId,
            staffId,
            date: {
              gte:
                historyStart,
              lte: end,
            },
          },
          orderBy: {
            date: "desc",
          },
          take: 31,
          select: {
            id: true,
            date: true,
            checkIn: true,
            checkOut: true,
            status: true,
            workLocation: true,
            lateMinutes: true,
            workingMinutes: true,
            adminEdited: true,
          },
        }),

        prisma.staff.findMany({
          where: {
            userId,
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            staffCode: true,
            name: true,
          },
        }),

        prisma.staffAttendance.findMany({
          where: {
            userId,
            date: {
              gte: start,
              lte: end,
            },
          },
          select: {
            staffId: true,
            status: true,
            checkIn: true,
          },
        }),

        prisma.leaveRequest.findMany({
          where: {
            userId,
            status: "APPROVED",
            fromDate: {
              lte: end,
            },
            toDate: {
              gte: start,
            },
          },
          select: {
            staffId: true,
          },
        }),

        prisma.attendanceHoliday.findFirst({
          where: {
            userId,
            isActive: true,
            date: {
              gte: start,
              lte: end,
            },
          },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

    const attendanceByStaff =
      new Map(
        todayAttendance.map(
          (item) => [
            item.staffId,
            item,
          ]
        )
      );

    const leaveStaffIds =
      new Set(
        approvedLeaves.map(
          (item) =>
            item.staffId
        )
      );

    const weekDay =
      new Date(start)
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

    const weekOff =
      setting?.weekOffDays
        ?.map((item) =>
          String(
            item
          ).toUpperCase()
        )
        .includes(
          weekDay
        ) ?? false;

    const isToday =
      dateKey ===
      getIndiaDateKey();

    /*
     * Coworker view is intentionally privacy-minimal:
     * only name, staff code and broad status.
     * No punch times, IP, GPS, photos, late minutes,
     * working hours, leave reason or history.
     */
    const teamPresence =
      coworkers.map(
        (member) => {
          const record =
            attendanceByStaff.get(
              member.id
            );

          let status:
            | "PRESENT"
            | "ON_LEAVE"
            | "NOT_PUNCHED"
            | "ABSENT"
            | "WEEK_OFF"
            | "HOLIDAY";

          if (record?.checkIn) {
            status =
              "PRESENT";
          } else if (
            leaveStaffIds.has(
              member.id
            )
          ) {
            status =
              "ON_LEAVE";
          } else if (
            holiday
          ) {
            status =
              "HOLIDAY";
          } else if (
            weekOff
          ) {
            status =
              "WEEK_OFF";
          } else {
            status =
              isToday
                ? "NOT_PUNCHED"
                : "ABSENT";
          }

          return {
            id:
              member.id,
            staffCode:
              member.staffCode,
            name:
              member.name,
            status,
            isMe:
              member.id ===
              staffId,
          };
        }
      );

    return NextResponse.json({
      success: true,
      date:
        dateKey,
      staff,
      attendance:
        myAttendance,
      history:
        myHistory,
      setting,
      holiday,
      weekOff,
      teamPresence,
    });
  } catch (error) {
    console.error(
      "GET MY ATTENDANCE ERROR:",
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

/* -------------------------------------------------------------------------- */
/* POST - PUNCH IN / PUNCH OUT                                                */
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

    const action =
      clean(body.action)
        .toUpperCase();

    const workLocation =
      clean(
        body.workLocation
      ) || "OFFICE";

    const photoUrl =
      clean(
        body.photoUrl
      ) || null;

    const latitude =
      numberOrNull(
        body.latitude
      );

    const longitude =
      numberOrNull(
        body.longitude
      );

    const accuracy =
      numberOrNull(
        body.accuracy
      );

    if (
      !userId ||
      !staffId ||
      ![
        "PUNCH_IN",
        "PUNCH_OUT",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid Staff and attendance action are required.",
        },
        {
          status: 400,
        }
      );
    }

    const staff =
      await resolveStaff(
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

    const setting =
      await getAttendanceSetting(
        userId
      );

    const now =
      new Date();

    const dateKey =
      getIndiaDateKey(
        now
      );

    const {
      start,
      end,
    } =
      getIndiaDayRange(
        dateKey
      );

    const existing =
      await prisma.staffAttendance.findFirst({
        where: {
          userId,
          staffId,
          date: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          createdAt:
            "desc",
        },
      });

    const ip =
      getRequestIp(
        request
      );

    const userAgent =
      request.headers.get(
        "user-agent"
      );

    const verification =
      getGpsVerification({
        latitude,
        longitude,
        accuracy,
        setting,
      });

    if (
      action ===
      "PUNCH_IN"
    ) {
      if (
        existing?.checkIn
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You have already punched in today.",
          },
          {
            status: 409,
          }
        );
      }

      if (
        setting?.requireCheckInPhoto &&
        !photoUrl
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Check-in selfie is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        setting?.requireCheckInIp &&
        !ip
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to verify check-in IP address.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        setting?.gpsAttendanceEnabled &&
        setting?.requireGpsForCheckIn &&
        (
          latitude ===
            null ||
          longitude ===
            null
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "GPS location is required for check-in.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        setting?.gpsAttendanceEnabled &&
        setting?.requireGpsForCheckIn &&
        verification.accuracyPassed ===
          false
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "GPS accuracy is too low. Please move to an open area and try again.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        setting?.gpsAttendanceEnabled &&
        setting?.requireGpsForCheckIn &&
        workLocation ===
          "OFFICE" &&
        verification.geofencePassed ===
          false
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are outside the allowed office attendance radius.",
          },
          {
            status: 400,
          }
        );
      }

      const officeStart =
        minutesFromTime(
          setting?.officeStartTime
        ) ?? 570;

      const grace =
        Number(
          setting?.graceMinutes ??
          15
        );

      const currentMinutes =
        indiaMinutesNow(
          now
        );

      const lateMinutes =
        Math.max(
          0,
          currentMinutes -
            officeStart -
            grace
        );

      const status =
        lateMinutes > 0
          ? "LATE"
          : "PRESENT";

      const attendance =
        existing
          ? await prisma.staffAttendance.update({
              where: {
                id:
                  existing.id,
              },
              data: {
                checkIn:
                  now,
                status:
                  status as any,
                lateMinutes,
                workLocation:
                  workLocation as any,

                checkInIp:
                  ip,
                checkInPhotoUrl:
                  photoUrl,
                checkInSource:
                  "WEB",
                checkInUserAgent:
                  userAgent,

                checkInLatitude:
                  latitude,
                checkInLongitude:
                  longitude,
                checkInAccuracyMeters:
                  accuracy,
                checkInDistanceMeters:
                  verification.distance,
                checkInGeofencePassed:
                  verification.geofencePassed,
              },
            })
          : await prisma.staffAttendance.create({
              data: {
                userId,
                staffId,
                date:
                  start,
                checkIn:
                  now,
                status:
                  status as any,
                lateMinutes,
                workLocation:
                  workLocation as any,

                checkInIp:
                  ip,
                checkInPhotoUrl:
                  photoUrl,
                checkInSource:
                  "WEB",
                checkInUserAgent:
                  userAgent,

                checkInLatitude:
                  latitude,
                checkInLongitude:
                  longitude,
                checkInAccuracyMeters:
                  accuracy,
                checkInDistanceMeters:
                  verification.distance,
                checkInGeofencePassed:
                  verification.geofencePassed,
              },
            });

      return NextResponse.json({
        success: true,
        message:
          lateMinutes > 0
            ? `Punch-in recorded. You are ${lateMinutes} minute(s) late.`
            : "Punch-in recorded successfully.",
        attendance,
      });
    }

    /* PUNCH OUT */

    if (
      !existing?.checkIn
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please punch in before punching out.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      existing.checkOut
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already punched out today.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      setting?.requireCheckOutPhoto &&
      !photoUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Check-out selfie is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      setting?.requireCheckOutIp &&
      !ip
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to verify check-out IP address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      setting?.gpsAttendanceEnabled &&
      setting?.requireGpsForCheckOut &&
      (
        latitude ===
          null ||
        longitude ===
          null
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "GPS location is required for check-out.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      setting?.gpsAttendanceEnabled &&
      setting?.requireGpsForCheckOut &&
      verification.accuracyPassed ===
        false
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "GPS accuracy is too low. Please try again.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      setting?.gpsAttendanceEnabled &&
      setting?.requireGpsForCheckOut &&
      workLocation ===
        "OFFICE" &&
      verification.geofencePassed ===
        false
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are outside the allowed office attendance radius.",
        },
        {
          status: 400,
        }
      );
    }

    const workingMinutes =
      Math.max(
        0,
        Math.round(
          (
            now.getTime() -
            new Date(
              existing.checkIn
            ).getTime()
          ) /
            60000
        )
      );

    let finalStatus =
      existing.status;

    if (
      setting?.minimumFullDayMinutes &&
      workingMinutes <
        Number(
          setting.minimumFullDayMinutes
        )
    ) {
      if (
        setting?.minimumHalfDayMinutes &&
        workingMinutes >=
          Number(
            setting.minimumHalfDayMinutes
          )
      ) {
        finalStatus =
          "HALF_DAY" as any;
      }
    }

    const attendance =
      await prisma.staffAttendance.update({
        where: {
          id:
            existing.id,
        },
        data: {
          checkOut:
            now,
          workingMinutes,
          status:
            finalStatus,
          workLocation:
            workLocation as any,

          checkOutIp:
            ip,
          checkOutPhotoUrl:
            photoUrl,
          checkOutSource:
            "WEB",
          checkOutUserAgent:
            userAgent,

          checkOutLatitude:
            latitude,
          checkOutLongitude:
            longitude,
          checkOutAccuracyMeters:
            accuracy,
          checkOutDistanceMeters:
            verification.distance,
          checkOutGeofencePassed:
            verification.geofencePassed,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Punch-out recorded successfully.",
      attendance,
    });
  } catch (error) {
    console.error(
      "MY ATTENDANCE PUNCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to save attendance.",
      },
      {
        status: 500,
      }
    );
  }
}
