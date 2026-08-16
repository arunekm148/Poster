import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  // Accept YYYY-MM-DD safely
  const simpleDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  const date = simpleDatePattern.test(text)
    ? new Date(`${text}T00:00:00.000Z`)
    : new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function cleanOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

/*
|--------------------------------------------------------------------------
| GET EMI FOLLOW-UPS
|--------------------------------------------------------------------------
|
| Examples:
|
| /api/emi-follow-ups?userId=USER_ID
|
| /api/emi-follow-ups?userId=USER_ID&customerId=CUSTOMER_ID
|
| /api/emi-follow-ups?userId=USER_ID&policyId=POLICY_ID
|
| /api/emi-follow-ups?userId=USER_ID&installmentId=INSTALLMENT_ID
|
|--------------------------------------------------------------------------
*/

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId")?.trim() || "";

    const customerId =
      searchParams.get("customerId")?.trim() || "";

    const policyId =
      searchParams.get("policyId")?.trim() || "";

    const installmentId =
      searchParams.get("installmentId")?.trim() || "";

    const status =
      searchParams.get("status")?.trim().toUpperCase() || "";

    /*
    |--------------------------------------------------------------------------
    | USER REQUIRED
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | CHECK USER
    |--------------------------------------------------------------------------
    */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
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

    if (!user.isActive) {
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

    /*
    |--------------------------------------------------------------------------
    | VALIDATE STATUS
    |--------------------------------------------------------------------------
    */

    const allowedStatuses = [
      "PENDING",
      "COMPLETED",
      "CANCELLED",
    ] as const;

    if (
      status &&
      !allowedStatuses.includes(
        status as (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid follow-up status.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD EMI FOLLOW-UPS
    |--------------------------------------------------------------------------
    */

    const followUps = await prisma.emiFollowUp.findMany({
      where: {
        userId,

        ...(customerId
          ? {
              customerId,
            }
          : {}),

        ...(policyId
          ? {
              policyId,
            }
          : {}),

        ...(installmentId
          ? {
              installmentId,
            }
          : {}),

        ...(status
          ? {
              status:
                status as
                  | "PENDING"
                  | "COMPLETED"
                  | "CANCELLED",
            }
          : {}),
      },

      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
            email: true,
            district: true,
            state: true,
          },
        },

        policy: {
          select: {
            id: true,
            policyNumber: true,
            companyName: true,
            productName: true,
            policyType: true,
            paymentType: true,
            financier: true,
            financedAmount: true,
            emiAmount: true,
            emiTenure: true,
            firstEmiDate: true,
          },
        },

        installment: {
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            amount: true,
            status: true,
            collectedDate: true,
            collectedAmount: true,
            remarks: true,
          },
        },
      },

      orderBy: [
        {
          followUpDate: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        followUps,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("GET EMI FOLLOW-UPS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load EMI follow-ups.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| CREATE EMI FOLLOW-UP
|--------------------------------------------------------------------------
|
| POST /api/emi-follow-ups
|
| Expected body:
|
| {
|   userId,
|   customerId,
|   policyId,
|   installmentId,
|   comment,
|   followUpDate,
|   nextFollowUpDate
| }
|
|--------------------------------------------------------------------------
*/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    /*
    |--------------------------------------------------------------------------
    | VALUES
    |--------------------------------------------------------------------------
    */

    const userId = String(body.userId || "").trim();

    const customerId = String(body.customerId || "").trim();

    const policyId = String(body.policyId || "").trim();

    const installmentId =
      String(body.installmentId || "").trim();

    const comment = String(body.comment || "").trim();

    const followUpDate = parseDate(body.followUpDate);

    const nextFollowUpDate = body.nextFollowUpDate
      ? parseDate(body.nextFollowUpDate)
      : null;

    /*
    |--------------------------------------------------------------------------
    | REQUIRED VALUES
    |--------------------------------------------------------------------------
    */

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

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!policyId) {
      return NextResponse.json(
        {
          success: false,
          message: "Policy is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!installmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "EMI installment is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up comment is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!followUpDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a valid follow-up date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.nextFollowUpDate &&
      !nextFollowUpDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid next follow-up date.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK USER
    |--------------------------------------------------------------------------
    */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
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

    if (!user.isActive) {
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

    /*
    |--------------------------------------------------------------------------
    | CHECK CUSTOMER
    |--------------------------------------------------------------------------
    */

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId,
        isActive: true,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found for this agent.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK EMI POLICY
    |--------------------------------------------------------------------------
    */

    const policy = await prisma.policy.findFirst({
      where: {
        id: policyId,
        userId,
        customerId,
        isActive: true,
        paymentType: "EMI",
      },

      select: {
        id: true,
        policyNumber: true,
      },
    });

    if (!policy) {
      return NextResponse.json(
        {
          success: false,
          message:
            "EMI policy not found for this customer.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK INSTALLMENT
    |--------------------------------------------------------------------------
    */

    const installment =
      await prisma.emiInstallment.findFirst({
        where: {
          id: installmentId,
          policyId,
        },

        select: {
          id: true,
          installmentNumber: true,
          status: true,
          dueDate: true,
          amount: true,
        },
      });

    if (!installment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "EMI installment not found for this policy.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | DO NOT FOLLOW UP COLLECTED EMI
    |--------------------------------------------------------------------------
    */

    if (installment.status === "COLLECTED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This EMI installment is already collected.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE FOLLOW-UP
    |--------------------------------------------------------------------------
    */

    const followUp = await prisma.emiFollowUp.create({
      data: {
        userId,
        customerId,
        policyId,
        installmentId,

        comment,

        followUpDate,

        nextFollowUpDate,

        status: "PENDING",
      },

      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
          },
        },

        policy: {
          select: {
            id: true,
            policyNumber: true,
            companyName: true,
            productName: true,
            financier: true,
            emiAmount: true,
          },
        },

        installment: {
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "EMI follow-up added successfully.",
        followUp,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("CREATE EMI FOLLOW-UP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create EMI follow-up.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE EMI FOLLOW-UP
|--------------------------------------------------------------------------
|
| PATCH /api/emi-follow-ups
|
| Example:
|
| {
|   id: "...",
|   userId: "...",
|   status: "COMPLETED",
|   comment: "...",
|   followUpDate: "2026-08-03",
|   nextFollowUpDate: "2026-08-10"
| }
|
|--------------------------------------------------------------------------
*/

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const id = String(body.id || "").trim();

    const userId = String(body.userId || "").trim();

    /*
    |--------------------------------------------------------------------------
    | REQUIRED
    |--------------------------------------------------------------------------
    */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up ID is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    /*
    |--------------------------------------------------------------------------
    | FIND FOLLOW-UP
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.emiFollowUp.findFirst({
      where: {
        id,
        userId,
      },

      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "EMI follow-up not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD UPDATE
    |--------------------------------------------------------------------------
    */

    const updateData: {
      comment?: string;
      followUpDate?: Date;
      nextFollowUpDate?: Date | null;
      status?: "PENDING" | "COMPLETED" | "CANCELLED";
      completedAt?: Date | null;
    } = {};

    /*
    | Comment
    */

    if (body.comment !== undefined) {
      const comment =
        cleanOptionalString(body.comment);

      if (!comment) {
        return NextResponse.json(
          {
            success: false,
            message: "Comment cannot be empty.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.comment = comment;
    }

    /*
    | Follow-up date
    */

    if (body.followUpDate !== undefined) {
      const followUpDate =
        parseDate(body.followUpDate);

      if (!followUpDate) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid follow-up date.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.followUpDate =
        followUpDate;
    }

    /*
    | Next follow-up date
    */

    if (body.nextFollowUpDate !== undefined) {
      if (
        body.nextFollowUpDate === null ||
        body.nextFollowUpDate === ""
      ) {
        updateData.nextFollowUpDate = null;
      } else {
        const nextFollowUpDate =
          parseDate(body.nextFollowUpDate);

        if (!nextFollowUpDate) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid next follow-up date.",
            },
            {
              status: 400,
            }
          );
        }

        updateData.nextFollowUpDate =
          nextFollowUpDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    if (body.status !== undefined) {
      const status = String(body.status)
        .trim()
        .toUpperCase();

      if (
        status !== "PENDING" &&
        status !== "COMPLETED" &&
        status !== "CANCELLED"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid follow-up status.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.status = status;

      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    const followUp = await prisma.emiFollowUp.update({
      where: {
        id,
      },

      data: updateData,

      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
          },
        },

        policy: {
          select: {
            id: true,
            policyNumber: true,
            companyName: true,
            productName: true,
            financier: true,
          },
        },

        installment: {
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            amount: true,
            status: true,
            collectedDate: true,
            collectedAmount: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "EMI follow-up updated successfully.",
        followUp,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("UPDATE EMI FOLLOW-UP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update EMI follow-up.",
      },
      {
        status: 500,
      }
    );
  }
}