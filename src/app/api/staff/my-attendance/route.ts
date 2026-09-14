import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  getSessionFromRequest,
  isStaffSession,
} from "@/lib/session";

/* -------------------------------------------------------------------------- */
/* SECURITY CONSTANTS                                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_OFFICE_RADIUS_METERS = 100;
const DEFAULT_MAX_GPS_ACCURACY_METERS = 100;

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function numberOrNull(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const valueNumber =
    Number(value);

  return Number.isFinite(valueNumber)
    ? valueNumber
    : null;
}

function getIndiaDateKey(
  date = new Date()
) {
  return date.toLocaleDateString(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",
    }
  );
}

function getIndiaDayRange(
  dateKey: string
) {
  const start =
    new Date(
      `${dateKey}T00:00:00+05:30`
    );

  const end =
    new Date(
      `${dateKey}T23:59:59.999+05:30`
    );

  return {
    start,
    end,
  };
}

function minutesFromTime(
  value:
    | string
    | null
    | undefined
) {
  const text =
    clean(value);

  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      text
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

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

  return (
    hour * 60 +
    minute
  );
}

function indiaMinutesNow(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Asia/Kolkata",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      }
    ).formatToParts(
      date
    );

  const hour =
    Number(
      parts.find(
        (item) =>
          item.type ===
          "hour"
      )?.value || 0
    );

  const minute =
    Number(
      parts.find(
        (item) =>
          item.type ===
          "minute"
      )?.value || 0
    );

  return (
    hour * 60 +
    minute
  );
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadius =
    6371000;

  const toRad = (
    value: number
  ) =>
    (value *
      Math.PI) /
    180;

  const dLat =
    toRad(
      lat2 -
        lat1
    );

  const dLon =
    toRad(
      lon2 -
        lon1
    );

  const a =
    Math.sin(
      dLat / 2
    ) *
      Math.sin(
        dLat / 2
      ) +
    Math.cos(
      toRad(lat1)
    ) *
      Math.cos(
        toRad(lat2)
      ) *
      Math.sin(
        dLon / 2
      ) *
      Math.sin(
        dLon / 2
      );

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(
        1 - a
      )
    );

  return (
    earthRadius *
    c
  );
}

/* -------------------------------------------------------------------------- */
/* IP                                                                         */
/* -------------------------------------------------------------------------- */

function getRequestIp(
  request: NextRequest
) {
  /*
   * Cloudflare should be preferred because the live site
   * is behind Cloudflare / Hostinger.
   */

  const cloudflareIp =
    clean(
      request.headers.get(
        "cf-connecting-ip"
      )
    );

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwarded =
    clean(
      request.headers.get(
        "x-forwarded-for"
      )
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() ||
      null
    );
  }

  const realIp =
    clean(
      request.headers.get(
        "x-real-ip"
      )
    );

  return (
    realIp ||
    null
  );
}

/* -------------------------------------------------------------------------- */
/* STAFF                                                                      */
/* -------------------------------------------------------------------------- */

async function resolveLoggedInStaff(
  request: NextRequest
) {
  const session =
    getSessionFromRequest(
      request
    );

  if (
    !session ||
    !isStaffSession(
      session
    ) ||
    !session.staffId
  ) {
    return null;
  }

  const staff =
    await prisma.staff.findFirst({
      where: {
        id:
          session.staffId,

        userId:
          session.userId,

        isActive:
          true,

        loginEnabled:
          true,
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
        officeId: true,

        office: {
          select: {
            id: true,
            code: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
            isHeadOffice: true,
            isActive: true,
          },
        },
      },
    });

  if (!staff) {
    return null;
  }

  return {
    session,
    staff,
  };
}

/* -------------------------------------------------------------------------- */
/* SETTINGS                                                                   */
/* -------------------------------------------------------------------------- */

async function getAttendanceSetting(
  userId: string
) {
  return prisma.attendanceSetting.findUnique({
    where: {
      userId,
    },

    select: {
      officeStartTime:
        true,

      officeEndTime:
        true,

      graceMinutes:
        true,

      halfDayCheckInTime:
        true,

      minimumFullDayMinutes:
        true,

      minimumHalfDayMinutes:
        true,

      timezone:
        true,

      weekOffDays:
        true,

      gpsAttendanceEnabled:
        true,

      requireGpsForCheckIn:
        true,

      requireGpsForCheckOut:
        true,

      maxGpsAccuracyMeters:
        true,

      officeLatitude:
        true,

      officeLongitude:
        true,

      officeRadiusMeters:
        true,

      requireCheckInPhoto:
        true,

      requireCheckOutPhoto:
        true,

      requireCheckInIp:
        true,

      requireCheckOutIp:
        true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* WORK LOCATION SECURITY                                                     */
/* -------------------------------------------------------------------------- */

type AttendanceLocation =
  | "OFFICE"
  | "HOME"
  | "FIELD";

function getAllowedWorkLocation(
  staffWorkMode:
    | string
    | null
    | undefined,

  requestedLocation:
    string
) {
  const mode =
    clean(
      staffWorkMode
    ).toUpperCase();

  const requested =
    clean(
      requestedLocation
    ).toUpperCase();

  /*
   * OFFICE employee can never bypass office geofence.
   */
  if (
    mode ===
    "OFFICE"
  ) {
    return {
      location:
        "OFFICE" as AttendanceLocation,

      canChoose:
        false,
    };
  }

  if (
    mode ===
    "WORK_FROM_HOME"
  ) {
    return {
      location:
        "HOME" as AttendanceLocation,

      canChoose:
        false,
    };
  }

  if (
    mode ===
    "FIELD"
  ) {
    return {
      location:
        "FIELD" as AttendanceLocation,

      canChoose:
        false,
    };
  }

  /*
   * HYBRID may choose.
   */
  if (
    mode ===
    "HYBRID"
  ) {
    if (
      requested ===
      "HOME"
    ) {
      return {
        location:
          "HOME" as AttendanceLocation,

        canChoose:
          true,
      };
    }

    if (
      requested ===
      "FIELD"
    ) {
      return {
        location:
          "FIELD" as AttendanceLocation,

        canChoose:
          true,
      };
    }

    return {
      location:
        "OFFICE" as AttendanceLocation,

      canChoose:
        true,
    };
  }

  /*
   * Unknown/legacy values fail safely to OFFICE.
   */
  return {
    location:
      "OFFICE" as AttendanceLocation,

    canChoose:
      false,
  };
}

/* -------------------------------------------------------------------------- */
/* GPS                                                                        */
/* -------------------------------------------------------------------------- */

function verifyGps({
  latitude,
  longitude,
  accuracy,
  officeLatitude,
  officeLongitude,
  officeRadiusMeters,
  maxGpsAccuracyMeters,
}: {
  latitude:
    number | null;

  longitude:
    number | null;

  accuracy:
    number | null;

  officeLatitude:
    number | null;

  officeLongitude:
    number | null;

  officeRadiusMeters:
    number;

  maxGpsAccuracyMeters:
    number;
}) {
  if (
    latitude === null ||
    longitude === null
  ) {
    return {
      distance:
        null,

      accuracyPassed:
        false,

      geofencePassed:
        false,
    };
  }

  const accuracyPassed =
    accuracy !== null &&
    accuracy <=
      maxGpsAccuracyMeters;

  let distance:
    number | null =
    null;

  if (
    officeLatitude !==
      null &&
    officeLongitude !==
      null
  ) {
    distance =
      Math.round(
        haversineMeters(
          latitude,
          longitude,
          officeLatitude,
          officeLongitude
        )
      );
  }

  const geofencePassed =
    distance !== null &&
    distance <=
      officeRadiusMeters;

  return {
    distance,
    accuracyPassed,
    geofencePassed,
  };
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const identity =
      await resolveLoggedInStaff(
        request
      );

    if (!identity) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Staff session is invalid or expired. Please login again.",
        },
        {
          status:
            401,
        }
      );
    }

    const {
      staff,
    } =
      identity;

    const userId =
      staff.userId;

    const staffId =
      staff.id;

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const dateKey =
      clean(
        searchParams.get(
          "date"
        )
      ) ||
      getIndiaDateKey();

    const {
      start,
      end,
    } =
      getIndiaDayRange(
        dateKey
      );

    const historyStart =
      new Date(
        start
      );

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
              gte:
                start,

              lte:
                end,
            },
          },

          orderBy: {
            date:
              "desc",
          },
        }),

        prisma.staffAttendance.findMany({
          where: {
            userId,
            staffId,

            date: {
              gte:
                historyStart,

              lte:
                end,
            },
          },

          orderBy: {
            date:
              "desc",
          },

          take:
            31,

          select: {
            id:
              true,

            date:
              true,

            checkIn:
              true,

            checkOut:
              true,

            status:
              true,

            workLocation:
              true,

            lateMinutes:
              true,

            workingMinutes:
              true,

            adminEdited:
              true,
          },
        }),

        prisma.staff.findMany({
          where: {
            userId,
            isActive:
              true,
          },

          orderBy: {
            name:
              "asc",
          },

          select: {
            id:
              true,

            staffCode:
              true,

            name:
              true,
          },
        }),

        prisma.staffAttendance.findMany({
          where: {
            userId,

            date: {
              gte:
                start,

              lte:
                end,
            },
          },

          select: {
            staffId:
              true,

            status:
              true,

            checkIn:
              true,
          },
        }),

        prisma.leaveRequest.findMany({
          where: {
            userId,

            status:
              "APPROVED",

            fromDate: {
              lte:
                end,
            },

            toDate: {
              gte:
                start,
            },
          },

          select: {
            staffId:
              true,
          },
        }),

        prisma.attendanceHoliday.findFirst({
          where: {
            userId,

            isActive:
              true,

            date: {
              gte:
                start,

              lte:
                end,
            },
          },

          select: {
            id:
              true,

            name:
              true,
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
      new Date(
        start
      )
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
        ?.map(
          (item) =>
            String(
              item
            ).toUpperCase()
        )
        .includes(
          weekDay
        ) ??
      false;

    const isToday =
      dateKey ===
      getIndiaDateKey();

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

          if (
            record?.checkIn
          ) {
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
      success:
        true,

      date:
        dateKey,

      staff,

      attendance:
        myAttendance,

      history:
        myHistory,

      setting: {
        ...setting,

        /*
         * Office attendance now uses the Staff member's assigned Office.
         * Legacy AttendanceSetting office coordinates are no longer used
         * for OFFICE punches.
         */
        officeRadiusMeters:
          Number(
            staff.office?.radiusMeters ??
            DEFAULT_OFFICE_RADIUS_METERS
          ),

        maxGpsAccuracyMeters:
          Math.min(
            Number(
              setting?.maxGpsAccuracyMeters ??
              DEFAULT_MAX_GPS_ACCURACY_METERS
            ),
            DEFAULT_MAX_GPS_ACCURACY_METERS
          ),
      },

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
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to load attendance.",
      },
      {
        status:
          500,
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
    const identity =
      await resolveLoggedInStaff(
        request
      );

    if (!identity) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Staff session is invalid or expired. Please login again.",
        },
        {
          status:
            401,
        }
      );
    }

    const {
      staff,
    } =
      identity;

    const userId =
      staff.userId;

    const staffId =
      staff.id;

    const body =
      await request.json();

    const action =
      clean(
        body.action
      ).toUpperCase();

    if (
      ![
        "PUNCH_IN",
        "PUNCH_OUT",
      ].includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Invalid attendance action.",
        },
        {
          status:
            400,
        }
      );
    }

    const requestedLocation =
      clean(
        body.workLocation
      );

    const requestedResolvedLocation =
      getAllowedWorkLocation(
        staff.workMode,
        requestedLocation
      );

    const photoUrl =
      clean(
        body.photoUrl
      ) ||
      null;

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

    const setting =
      await getAttendanceSetting(
        userId
      );

    const assignedOffice =
      staff.office &&
      staff.office.isActive
        ? staff.office
        : null;

    const officeRadiusMeters =
      Number(
        assignedOffice?.radiusMeters ??
        DEFAULT_OFFICE_RADIUS_METERS
      );

    const maxGpsAccuracyMeters =
      Math.min(
        Number(
          setting?.maxGpsAccuracyMeters ??
          DEFAULT_MAX_GPS_ACCURACY_METERS
        ),
        DEFAULT_MAX_GPS_ACCURACY_METERS
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
            gte:
              start,

            lte:
              end,
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },
      });

    /*
     * Punch-out must use the location category saved at punch-in.
     * A Hybrid employee cannot punch in at OFFICE and then choose HOME/FIELD
     * on punch-out to bypass the office geofence.
     */
    const workLocation =
      action === "PUNCH_OUT" &&
      existing?.workLocation
        ? clean(
            existing.workLocation
          ).toUpperCase() as AttendanceLocation
        : requestedResolvedLocation.location;

    let attendanceOffice =
      assignedOffice;

    if (
      action === "PUNCH_OUT" &&
      workLocation === "OFFICE" &&
      existing?.officeId &&
      existing.officeId !== assignedOffice?.id
    ) {
      attendanceOffice =
        await prisma.office.findFirst({
          where: {
            id: existing.officeId,
            userId,
          },
          select: {
            id: true,
            code: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
            isHeadOffice: true,
            isActive: true,
          },
        });
    }

    const effectiveOfficeRadiusMeters =
      Number(
        attendanceOffice?.radiusMeters ??
        officeRadiusMeters
      );

    const ip =
      getRequestIp(
        request
      );

    const userAgent =
      request.headers.get(
        "user-agent"
      );

    /*
     * OFFICE staff are always GPS secured,
     * even if an old settings record has GPS disabled.
     */
    const officeMode =
      workLocation ===
      "OFFICE";

    const gpsRequired =
      officeMode ||
      Boolean(
        setting?.gpsAttendanceEnabled
      );

    if (
      gpsRequired &&
      (
        latitude === null ||
        longitude === null
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "GPS location is required before attendance can be recorded.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * OFFICE punches must use the Staff member's assigned Office.
     * Fail closed if the Staff member has no active office assignment
     * or that Office has no GPS coordinates.
     */
    if (
      officeMode &&
      !attendanceOffice
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "No active office is assigned to your Staff profile. Please contact your administrator.",
        },
        {
          status:
            400,
        }
      );
    }

    const officeLatitude =
      numberOrNull(
        attendanceOffice?.latitude
      );

    const officeLongitude =
      numberOrNull(
        attendanceOffice?.longitude
      );

    if (
      officeMode &&
      (
        officeLatitude ===
          null ||
        officeLongitude ===
          null
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "GPS location is not configured for your assigned office. Please contact your administrator.",
        },
        {
          status:
            400,
        }
      );
    }

    const verification =
      verifyGps({
        latitude,
        longitude,
        accuracy,
        officeLatitude,
        officeLongitude,
        officeRadiusMeters: effectiveOfficeRadiusMeters,
        maxGpsAccuracyMeters,
      });

    /*
     * OFFICE staff: GPS accuracy <= 100 metres.
     */
    if (
      officeMode &&
      !verification.accuracyPassed
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            `GPS accuracy must be within ${maxGpsAccuracyMeters} metres. Please move to an open area, refresh GPS and try again.`,
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * OFFICE staff: physical distance <= 100 metres.
     */
    if (
      officeMode &&
      !verification.geofencePassed
    ) {
      const distanceText =
        verification.distance !==
        null
          ? ` You are approximately ${verification.distance} metres away from the registered office.`
          : "";

      return NextResponse.json(
        {
          success:
            false,

          message:
            `Attendance is blocked outside the ${effectiveOfficeRadiusMeters} metre radius of ${attendanceOffice?.name || "your assigned office"}.${distanceText}`,
        },
        {
          status:
            403,
        }
      );
    }

    /*
     * IP is automatically captured.
     * If policy says IP is compulsory and proxy does not provide it,
     * fail safely.
     */
    if (
      action ===
        "PUNCH_IN" &&
      setting?.requireCheckInIp &&
      !ip
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unable to identify your check-in IP address. Please retry or contact the administrator.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      action ===
        "PUNCH_OUT" &&
      setting?.requireCheckOutIp &&
      !ip
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unable to identify your check-out IP address. Please retry or contact the administrator.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PUNCH IN                                                               */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
      "PUNCH_IN"
    ) {
      if (
        existing?.checkIn
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "You have already punched in today.",
          },
          {
            status:
              409,
          }
        );
      }

      if (
        setting?.requireCheckInPhoto &&
        !photoUrl
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Check-in selfie is required.",
          },
          {
            status:
              400,
          }
        );
      }

      const officeStart =
        minutesFromTime(
          setting?.officeStartTime
        ) ??
        570;

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
                officeId:
                  officeMode
                    ? attendanceOffice?.id || null
                    : existing.officeId,

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
                  officeMode
                    ? verification.distance
                    : null,

                checkInGeofencePassed:
                  officeMode
                    ? verification.geofencePassed
                    : null,
              },
            })
          : await prisma.staffAttendance.create({
              data: {
                userId,
                staffId,

                officeId:
                  officeMode
                    ? attendanceOffice?.id || null
                    : null,

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
                  officeMode
                    ? verification.distance
                    : null,

                checkInGeofencePassed:
                  officeMode
                    ? verification.geofencePassed
                    : null,
              },
            });

      return NextResponse.json({
        success:
          true,

        message:
          lateMinutes > 0
            ? `Punch-in recorded. You are ${lateMinutes} minute(s) late.`
            : "Punch-in recorded successfully.",

        attendance,
      });
    }

    /* ---------------------------------------------------------------------- */
    /* PUNCH OUT                                                              */
    /* ---------------------------------------------------------------------- */

    if (
      !existing?.checkIn
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please punch in before punching out.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      existing.checkOut
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "You have already punched out today.",
        },
        {
          status:
            409,
        }
      );
    }

    if (
      setting?.requireCheckOutPhoto &&
      !photoUrl
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Check-out selfie is required.",
        },
        {
          status:
            400,
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

          /*
           * Keep the same work location used on punch-in.
           * Staff cannot change the attendance category during punch-out.
           */
          workLocation:
            existing.workLocation,

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
            officeMode
              ? verification.distance
              : null,

          checkOutGeofencePassed:
            officeMode
              ? verification.geofencePassed
              : null,
        },
      });

    return NextResponse.json({
      success:
        true,

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
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Unable to save attendance.",
      },
      {
        status:
          500,
      }
    );
  }
}