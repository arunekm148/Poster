import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function phone(value: unknown) {
  return clean(value).replace(/\D/g, "");
}

function dateValue(value: unknown) {
  const text =
    clean(value);

  if (!text) {
    return null;
  }

  const date =
    new Date(
      `${text}T00:00:00`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function normalizeWorkMode(
  value: unknown
) {
  const mode =
    clean(value).toUpperCase();

  if (
    mode === "WORK_FROM_HOME" ||
    mode === "HYBRID" ||
    mode === "FIELD"
  ) {
    return mode;
  }

  return "OFFICE";
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const userId =
      clean(
        new URL(
          request.url
        ).searchParams.get(
          "userId"
        )
      );

    const staff =
      await prisma.staff.findFirst({
        where: {
          id,
          userId,
        },

        include: {
          office: true,
        },
      });

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff member was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load staff.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    const body =
      await request.json();

    const userId =
      clean(body.userId);

    const existing =
      await prisma.staff.findFirst({
        where: {
          id,
          userId,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff member was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const mode =
      normalizeWorkMode(
        body.workMode
      );

    const officeId =
      clean(
        body.officeId
      ) || null;

    if (officeId) {
      const office =
        await prisma.office.findFirst({
          where: {
            id: officeId,
            userId,
            isActive: true,
          },
          select: {
            id: true,
          },
        });

      if (!office) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected office is invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      (mode === "OFFICE" ||
        mode === "HYBRID") &&
      !officeId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Office or Hybrid staff must have an assigned office.",
        },
        {
          status: 400,
        }
      );
    }

    const staffRole =
      clean(
        body.staffRole
      ).toUpperCase() ===
      "SUPERVISOR"
        ? "SUPERVISOR"
        : "STAFF";

    const supervisorId =
      staffRole === "SUPERVISOR"
        ? null
        : clean(
            body.supervisorId
          ) || null;

    if (
      supervisorId === id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A Staff member cannot be their own supervisor.",
        },
        {
          status: 400,
        }
      );
    }

    if (supervisorId) {
      const supervisor =
        await prisma.staff.findFirst({
          where: {
            id: supervisorId,
            userId,
            isActive: true,
            staffRole:
              "SUPERVISOR",
          },
          select: {
            id: true,
          },
        });

      if (!supervisor) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected supervisor is invalid.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const staffCode =
      clean(
        body.staffCode
      ).toUpperCase();

    const name =
      clean(body.name);

    const mobile =
      phone(body.phone);

    if (!staffCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Staff name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        mobile
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    const duplicateCode =
      await prisma.staff.findFirst({
        where: {
          userId,
          staffCode,

          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (duplicateCode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This staff code is already used.",
        },
        {
          status: 409,
        }
      );
    }

    const duplicatePhone =
      await prisma.staff.findFirst({
        where: {
          phone: mobile,

          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

    if (duplicatePhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This mobile number is already used.",
        },
        {
          status: 409,
        }
      );
    }

    const isActive =
      body.isActive !== false;

    const updateData:
      Record<
        string,
        unknown
      > = {
        officeId,

        staffCode,
        name,

        phone: mobile,

        whatsapp:
          phone(
            body.whatsapp
          ) || null,

        email:
          clean(
            body.email
          ).toLowerCase() ||
          null,

        staffRole,

        workMode:
          mode,

        designation:
          clean(
            body.designation
          ) || null,

        department:
          clean(
            body.department
          ) || null,

        supervisorId,

        address:
          clean(
            body.address
          ) || null,

        district:
          clean(
            body.district
          ) || null,

        state:
          clean(
            body.state
          ) || null,

        pincode:
          clean(
            body.pincode
          ) || null,

        joiningDate:
          dateValue(
            body.joiningDate
          ),

        notes:
          clean(
            body.notes
          ) || null,

        loginEnabled:
          body.loginEnabled !== false,

        isActive,

        inactiveReason:
          !isActive
            ? clean(
                body.inactiveReason
              ) || null
            : null,

        inactiveAt:
          !isActive
            ? existing.inactiveAt ||
              new Date()
            : null,
      };

    const newPassword =
      String(
        body.password ??
          ""
      );

    if (newPassword) {
      if (
        newPassword.length <
        6
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Password must contain at least 6 characters.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.password =
        await bcrypt.hash(
          newPassword,
          10
        );
    }

    const staff =
      await prisma.staff.update({
        where: {
          id,
        },

        data:
          updateData as any,

        include: {
          office: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Staff updated successfully.",
      staff,
    });
  } catch (error) {
    console.error(
      "UPDATE STAFF ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to update staff.",
      },
      {
        status: 500,
      }
    );
  }
}