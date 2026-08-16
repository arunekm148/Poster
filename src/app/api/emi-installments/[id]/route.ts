import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

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

function parseMoney(value: unknown): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (amount < 0) {
    return null;
  }

  return amount;
}

/* -------------------------------------------------------------------------- */
/* GET ONE EMI INSTALLMENT                                                    */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const installmentId = String(id || "").trim();

    const { searchParams } = new URL(request.url);

    const userId =
      searchParams.get("userId")?.trim() || "";

    if (!installmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "EMI installment ID is required.",
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

    const installment =
      await prisma.emiInstallment.findFirst({
        where: {
          id: installmentId,

          policy: {
            userId,
          },
        },

        include: {
          policy: {
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

              installments: {
                orderBy: {
                  installmentNumber: "asc",
                },

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
          },

          followUps: {
            where: {
              userId,
            },

            orderBy: {
              createdAt: "desc",
            },

            select: {
              id: true,
              comment: true,
              followUpDate: true,
              nextFollowUpDate: true,
              status: true,
              completedAt: true,
              createdAt: true,
            },
          },
        },
      });

    if (!installment) {
      return NextResponse.json(
        {
          success: false,
          message: "EMI installment not found.",
        },
        {
          status: 404,
        }
      );
    }

    const installments =
      installment.policy.installments || [];

    const totalInstallments = installments.length;

    const collectedInstallments =
      installments.filter(
        (item) => item.status === "COLLECTED"
      ).length;

    const pendingInstallments =
      installments.filter(
        (item) => item.status !== "COLLECTED"
      ).length;

    const pendingAmount =
      installments.reduce((total, item) => {
        if (item.status === "COLLECTED") {
          return total;
        }

        return total + Number(item.amount || 0);
      }, 0);

    const collectedAmount =
      installments.reduce((total, item) => {
        if (item.status !== "COLLECTED") {
          return total;
        }

        return (
          total +
          Number(
            item.collectedAmount ??
              item.amount ??
              0
          )
        );
      }, 0);

    return NextResponse.json(
      {
        success: true,

        installment,

        summary: {
          totalInstallments,
          collectedInstallments,
          pendingInstallments,
          pendingAmount,
          collectedAmount,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET EMI INSTALLMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load EMI installment.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE / COLLECT EMI INSTALLMENT                                           */
/* -------------------------------------------------------------------------- */
/*
|--------------------------------------------------------------------------
| PATCH /api/emi-installments/[id]
|--------------------------------------------------------------------------
|
| Mark collected:
|
| {
|   "userId": "...",
|   "status": "COLLECTED",
|   "collectedDate": "2026-08-06",
|   "collectedAmount": 4800,
|   "remarks": "Cash collected"
| }
|
| Mark pending:
|
| {
|   "userId": "...",
|   "status": "PENDING"
| }
|
| Mark missed:
|
| {
|   "userId": "...",
|   "status": "MISSED"
| }
|
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await context.params;

    const installmentId = String(id || "").trim();

    const body = await request.json();

    const userId = String(body.userId || "").trim();

    if (!installmentId) {
      return NextResponse.json(
        {
          success: false,
          message: "EMI installment ID is required.",
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

    /* ---------------------------------------------------------------------- */
    /* CHECK USER                                                             */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* FIND INSTALLMENT                                                       */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.emiInstallment.findFirst({
        where: {
          id: installmentId,

          policy: {
            userId,
          },
        },

        include: {
          policy: {
            select: {
              id: true,
              userId: true,
              customerId: true,
              policyNumber: true,
              companyName: true,
              productName: true,
              paymentType: true,
              emiTenure: true,
              isActive: true,

              customer: {
                select: {
                  id: true,
                  customerId: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "EMI installment not found for this agent.",
        },
        {
          status: 404,
        }
      );
    }

    if (existing.policy.paymentType !== "EMI") {
      return NextResponse.json(
        {
          success: false,
          message: "This policy is not an EMI policy.",
        },
        {
          status: 400,
        }
      );
    }

    if (!existing.policy.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "This policy is inactive.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* STATUS                                                                 */
    /* ---------------------------------------------------------------------- */

    const requestedStatus =
      body.status !== undefined
        ? String(body.status).trim().toUpperCase()
        : existing.status;

    if (
      requestedStatus !== "PENDING" &&
      requestedStatus !== "COLLECTED" &&
      requestedStatus !== "MISSED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid EMI status.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE DATA                                                            */
    /* ---------------------------------------------------------------------- */

    const updateData: {
      status?: "PENDING" | "COLLECTED" | "MISSED";
      collectedDate?: Date | null;
      collectedAmount?: number | null;
      remarks?: string | null;
    } = {};

    updateData.status = requestedStatus;

    /* ---------------------------------------------------------------------- */
    /* COLLECTED                                                              */
    /* ---------------------------------------------------------------------- */

    if (requestedStatus === "COLLECTED") {
      let collectedDate: Date;

      if (body.collectedDate) {
        const parsedCollectedDate =
          parseDate(body.collectedDate);

        if (!parsedCollectedDate) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid collection date.",
            },
            {
              status: 400,
            }
          );
        }

        collectedDate = parsedCollectedDate;
      } else {
        collectedDate = new Date();
      }

      let collectedAmount: number;

      if (
        body.collectedAmount !== undefined &&
        body.collectedAmount !== null &&
        body.collectedAmount !== ""
      ) {
        const parsedAmount =
          parseMoney(body.collectedAmount);

        if (
          parsedAmount === null ||
          parsedAmount <= 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Collected amount must be greater than zero.",
            },
            {
              status: 400,
            }
          );
        }

        collectedAmount = parsedAmount;
      } else {
        collectedAmount = Number(existing.amount);
      }

      updateData.collectedDate = collectedDate;
      updateData.collectedAmount = collectedAmount;
    }

    /* ---------------------------------------------------------------------- */
    /* PENDING / MISSED                                                       */
    /* ---------------------------------------------------------------------- */

    if (
      requestedStatus === "PENDING" ||
      requestedStatus === "MISSED"
    ) {
      updateData.collectedDate = null;
      updateData.collectedAmount = null;
    }

    /* ---------------------------------------------------------------------- */
    /* REMARKS                                                                */
    /* ---------------------------------------------------------------------- */

    if (body.remarks !== undefined) {
      updateData.remarks =
        cleanOptionalString(body.remarks);
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE INSTALLMENT                                                     */
    /* ---------------------------------------------------------------------- */

    const updatedInstallment =
      await prisma.emiInstallment.update({
        where: {
          id: installmentId,
        },

        data: updateData,

        include: {
          policy: {
            select: {
              id: true,
              policyNumber: true,
              companyName: true,
              productName: true,
              paymentType: true,
              financier: true,
              financedAmount: true,
              emiAmount: true,
              emiTenure: true,
              firstEmiDate: true,

              customer: {
                select: {
                  id: true,
                  customerId: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      });

    /* ---------------------------------------------------------------------- */
    /* COMPLETE PENDING FOLLOW-UPS WHEN EMI COLLECTED                         */
    /* ---------------------------------------------------------------------- */

    if (requestedStatus === "COLLECTED") {
      await prisma.emiFollowUp.updateMany({
        where: {
          userId,
          installmentId,
          status: "PENDING",
        },

        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    /* ---------------------------------------------------------------------- */
    /* POLICY EMI SUMMARY                                                     */
    /* ---------------------------------------------------------------------- */

    const allInstallments =
      await prisma.emiInstallment.findMany({
        where: {
          policyId: existing.policyId,
        },

        orderBy: {
          installmentNumber: "asc",
        },

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
      });

    const totalInstallments = allInstallments.length;

    const collectedInstallments =
      allInstallments.filter(
        (item) => item.status === "COLLECTED"
      ).length;

    const pendingInstallments =
      allInstallments.filter(
        (item) => item.status !== "COLLECTED"
      ).length;

    const pendingAmount =
      allInstallments.reduce((total, item) => {
        if (item.status === "COLLECTED") {
          return total;
        }

        return total + Number(item.amount || 0);
      }, 0);

    const totalCollectedAmount =
      allInstallments.reduce((total, item) => {
        if (item.status !== "COLLECTED") {
          return total;
        }

        return (
          total +
          Number(
            item.collectedAmount ??
              item.amount ??
              0
          )
        );
      }, 0);

    /* ---------------------------------------------------------------------- */
    /* RESPONSE                                                               */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          requestedStatus === "COLLECTED"
            ? `Installment #${existing.installmentNumber} collected successfully.`
            : `Installment #${existing.installmentNumber} updated successfully.`,

        installment: updatedInstallment,

        installments: allInstallments,

        summary: {
          totalInstallments,
          collectedInstallments,
          pendingInstallments,
          pendingAmount,
          collectedAmount: totalCollectedAmount,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE EMI INSTALLMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update EMI installment.",
      },
      {
        status: 500,
      }
    );
  }
}