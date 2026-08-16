import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  const date =
    new Date(
      `${text}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function optionalNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }

  return number;
}

function optionalInteger(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isInteger(
      number
    )
  ) {
    return null;
  }

  return number;
}

function optionalText(
  value: unknown
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function addMonthsSafe(
  sourceDate: Date,
  months: number
): Date {
  const year =
    sourceDate.getUTCFullYear();

  const month =
    sourceDate.getUTCMonth();

  const day =
    sourceDate.getUTCDate();

  const target =
    new Date(
      Date.UTC(
        year,
        month + months,
        1
      )
    );

  const lastDay =
    new Date(
      Date.UTC(
        target.getUTCFullYear(),
        target.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();

  target.setUTCDate(
    Math.min(
      day,
      lastDay
    )
  );

  return target;
}

/* -------------------------------------------------------------------------- */
/* GET POLICIES                                                               */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const userId =
      searchParams
        .get("userId")
        ?.trim() || "";

    const customerId =
      searchParams
        .get("customerId")
        ?.trim() || "";

    const policyId =
      searchParams
        .get("policyId")
        ?.trim() || "";

    const paymentType =
      searchParams
        .get("paymentType")
        ?.trim()
        .toUpperCase() || "";

    const policyType =
      searchParams
        .get("policyType")
        ?.trim()
        .toUpperCase() || "";

    const customerSource =
      searchParams
        .get("customerSource")
        ?.trim()
        .toUpperCase() || "";

    const placementSource =
      searchParams
        .get("placementSource")
        ?.trim()
        .toUpperCase() || "";

    const subAgentId =
      searchParams
        .get("subAgentId")
        ?.trim() || "";

    const consultantId =
      searchParams
        .get("consultantId")
        ?.trim() || "";

    const healthBusinessType =
      searchParams
        .get("healthBusinessType")
        ?.trim()
        .toUpperCase() || "";

    const motorVehicleClass =
      searchParams
        .get("motorVehicleClass")
        ?.trim()
        .toUpperCase() || "";

    const motorCoverType =
      searchParams
        .get("motorCoverType")
        ?.trim()
        .toUpperCase() || "";

    const lifeProductType =
      searchParams
        .get("lifeProductType")
        ?.trim()
        .toUpperCase() || "";

    const policyStage =
      searchParams
        .get("policyStage")
        ?.trim()
        .toUpperCase() || "";

    const currentOnly =
      searchParams.get(
        "currentOnly"
      ) === "true";

    /* ---------------------------------------------------------------------- */
    /* USER REQUIRED                                                          */
    /* ---------------------------------------------------------------------- */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK USER                                                             */
    /* ---------------------------------------------------------------------- */

    const user =
      await prisma.user.findUnique({
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
          message:
            "Agent account not found.",
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
          message:
            "Agent account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SINGLE POLICY                                                          */
    /* ---------------------------------------------------------------------- */

    if (policyId) {
      const policy =
        await prisma.policy.findFirst({
          where: {
            id: policyId,
            userId,
          },

          include: {
            customer: {
              select: {
                id: true,
                customerId: true,
                name: true,
                phone: true,
                email: true,
                sourceType: true,

                subAgent: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    phone: true,
                    whatsapp: true,
                  },
                },
              },
            },

            subAgent: {
              select: {
                id: true,
                code: true,
                name: true,
                phone: true,
                whatsapp: true,
                email: true,
              },
            },

            consultant: {
              select: {
                id: true,
                code: true,
                name: true,
                contactPerson: true,
                phone: true,
                whatsapp: true,
                email: true,
              },
            },

            installments: {
              orderBy: {
                installmentNumber:
                  "asc",
              },
            },

            emiFollowUps: {
              orderBy: {
                createdAt:
                  "desc",
              },
            },
          },
        });

      if (!policy) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Policy not found.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          policy,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* POLICY LIST                                                            */
    /* ---------------------------------------------------------------------- */

    const policies =
      await prisma.policy.findMany({
        where: {
          userId,

          ...(customerId
            ? {
                customerId,
              }
            : {}),

          ...(paymentType ===
            "FULL" ||
          paymentType === "EMI"
            ? {
                paymentType:
                  paymentType as
                    | "FULL"
                    | "EMI",
              }
            : {}),

          ...([
            "HEALTH",
            "MOTOR",
            "LIFE",
            "OTHER",
          ].includes(
            policyType
          )
            ? {
                policyType:
                  policyType as
                    | "HEALTH"
                    | "MOTOR"
                    | "LIFE"
                    | "OTHER",
              }
            : {}),

          ...([
            "SELF",
            "SUB_AGENT",
          ].includes(
            customerSource
          )
            ? {
                customerSource:
                  customerSource as
                    | "SELF"
                    | "SUB_AGENT",
              }
            : {}),

          ...([
            "SELF",
            "CONSULTANT",
          ].includes(
            placementSource
          )
            ? {
                placementSource:
                  placementSource as
                    | "SELF"
                    | "CONSULTANT",
              }
            : {}),

          ...(subAgentId
            ? {
                subAgentId,
              }
            : {}),

          ...(consultantId
            ? {
                consultantId,
              }
            : {}),

          ...([
            "FRESH",
            "PORTABILITY",
            "MIGRATION",
          ].includes(
            healthBusinessType
          )
            ? {
                healthBusinessType:
                  healthBusinessType as
                    | "FRESH"
                    | "PORTABILITY"
                    | "MIGRATION",
              }
            : {}),

          ...([
            "TWO_WHEELER",
            "PRIVATE_CAR",
            "PASSENGER_CARRYING",
            "GOODS_CARRYING",
            "MISC_SPECIAL",
          ].includes(
            motorVehicleClass
          )
            ? {
                motorVehicleClass:
                  motorVehicleClass as
                    | "TWO_WHEELER"
                    | "PRIVATE_CAR"
                    | "PASSENGER_CARRYING"
                    | "GOODS_CARRYING"
                    | "MISC_SPECIAL",
              }
            : {}),

          ...([
            "COMPREHENSIVE",
            "THIRD_PARTY",
            "STANDALONE_OD",
            "STANDARD",
          ].includes(
            motorCoverType
          )
            ? {
                motorCoverType:
                  motorCoverType as
                    | "COMPREHENSIVE"
                    | "THIRD_PARTY"
                    | "STANDALONE_OD"
                    | "STANDARD",
              }
            : {}),

          ...([
            "TRADITIONAL",
            "UNIT_LINKED",
            "TERM",
            "PENSION_ANNUITY",
            "OTHER",
          ].includes(
            lifeProductType
          )
            ? {
                lifeProductType:
                  lifeProductType as
                    | "TRADITIONAL"
                    | "UNIT_LINKED"
                    | "TERM"
                    | "PENSION_ANNUITY"
                    | "OTHER",
              }
            : {}),

          ...([
            "QUOTE",
            "PROPOSAL",
            "ISSUED",
            "RENEWAL_DUE",
            "EXPIRED",
            "CANCELLED",
          ].includes(
            policyStage
          )
            ? {
                policyStage:
                  policyStage as
                    | "QUOTE"
                    | "PROPOSAL"
                    | "ISSUED"
                    | "RENEWAL_DUE"
                    | "EXPIRED"
                    | "CANCELLED",
              }
            : {}),

          ...(currentOnly
            ? {
                isActive: true,
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
              sourceType: true,
            },
          },

          subAgent: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
              whatsapp: true,
            },
          },

          consultant: {
            select: {
              id: true,
              code: true,
              name: true,
              phone: true,
            },
          },

          installments: {
            orderBy: {
              installmentNumber:
                "asc",
            },
          },
        },

        orderBy: [
          {
            isActive: "desc",
          },
          {
            startDate: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

    return NextResponse.json(
      {
        success: true,
        policies,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET POLICIES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load policies.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE POLICY                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    /* ---------------------------------------------------------------------- */
    /* BASIC VALUES                                                           */
    /* ---------------------------------------------------------------------- */

    const userId =
      String(
        body.userId || ""
      ).trim();

    const customerId =
      String(
        body.customerId || ""
      ).trim();

    const policyNumber =
      String(
        body.policyNumber || ""
      ).trim();

    const companyName =
      String(
        body.companyName || ""
      ).trim();

    const productName =
      optionalText(
        body.productName
      );

    const notes =
      optionalText(
        body.notes
      );

    const policyPdfUrl =
      optionalText(
        body.policyPdfUrl
      );

    const rawPolicyType =
      String(
        body.policyType || ""
      )
        .trim()
        .toUpperCase();

    const rawPaymentType =
      String(
        body.paymentType ||
          "FULL"
      )
        .trim()
        .toUpperCase();

    const rawPlacementSource =
      String(
        body.placementSource ||
          "SELF"
      )
        .trim()
        .toUpperCase();

    const rawPolicyStage =
      String(
        body.policyStage ||
          "ISSUED"
      )
        .trim()
        .toUpperCase();

    const consultantId =
      String(
        body.consultantId ||
          ""
      ).trim();

    /* ---------------------------------------------------------------------- */
    /* RENEWAL                                                                */
    /* ---------------------------------------------------------------------- */

    const renewFrom =
      String(
        body.renewFrom ||
          body.renewalOfPolicyId ||
          ""
      ).trim();

    const isRenewal =
      Boolean(
        renewFrom
      );

    /* ---------------------------------------------------------------------- */
    /* REQUIRED VALUES                                                        */
    /* ---------------------------------------------------------------------- */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "User ID is required.",
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
          message:
            "Customer is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!policyNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Policy number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!companyName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Insurance company is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* POLICY TYPE                                                            */
    /* ---------------------------------------------------------------------- */

    const allowedPolicyTypes = [
      "HEALTH",
      "MOTOR",
      "LIFE",
      "OTHER",
    ] as const;

    if (
      !allowedPolicyTypes.includes(
        rawPolicyType as
          (typeof allowedPolicyTypes)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid insurance type.",
        },
        {
          status: 400,
        }
      );
    }

    const policyType =
      rawPolicyType as
        (typeof allowedPolicyTypes)[number];

    /* ---------------------------------------------------------------------- */
    /* PAYMENT TYPE                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      rawPaymentType !==
        "FULL" &&
      rawPaymentType !==
        "EMI"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment type.",
        },
        {
          status: 400,
        }
      );
    }

    const paymentType =
      rawPaymentType as
        | "FULL"
        | "EMI";

    /* ---------------------------------------------------------------------- */
    /* POLICY STAGE                                                           */
    /* ---------------------------------------------------------------------- */

    const allowedPolicyStages = [
      "QUOTE",
      "PROPOSAL",
      "ISSUED",
      "RENEWAL_DUE",
      "EXPIRED",
      "CANCELLED",
    ] as const;

    if (
      !allowedPolicyStages.includes(
        rawPolicyStage as
          (typeof allowedPolicyStages)[number]
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid policy stage.",
        },
        {
          status: 400,
        }
      );
    }

    const policyStage =
      rawPolicyStage as
        (typeof allowedPolicyStages)[number];

    /* ---------------------------------------------------------------------- */
    /* PLACEMENT SOURCE                                                       */
    /* ---------------------------------------------------------------------- */

    if (
      rawPlacementSource !==
        "SELF" &&
      rawPlacementSource !==
        "CONSULTANT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid policy placement source.",
        },
        {
          status: 400,
        }
      );
    }

    const placementSource =
      rawPlacementSource as
        | "SELF"
        | "CONSULTANT";

    if (
      placementSource ===
        "CONSULTANT" &&
      !consultantId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select consultant.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DATES                                                                  */
    /* ---------------------------------------------------------------------- */

    const startDate =
      parseDate(
        body.startDate
      );

    const expiryDate =
      parseDate(
        body.expiryDate
      );

    if (!startDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid policy start date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!expiryDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid policy expiry date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      expiryDate.getTime() <
      startDate.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Policy expiry date cannot be before start date.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PREMIUM / MONEY                                                        */
    /* ---------------------------------------------------------------------- */

    const sumInsured =
      optionalNumber(
        body.sumInsured
      );

    const actualPremium =
      optionalNumber(
        body.actualPremium ??
          body.premium
      );

    const agentPayable =
      optionalNumber(
        body.agentPayable
      );

    const customerPremium =
      optionalNumber(
        body.customerPremium ??
          actualPremium
      );

    const commissionIncome =
      optionalNumber(
        body.commissionIncome
      );

    if (
      sumInsured !== null &&
      sumInsured < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sum insured cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      actualPremium !== null &&
      actualPremium < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Actual premium cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      agentPayable !== null &&
      agentPayable < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent payable cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      customerPremium !== null &&
      customerPremium < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer premium cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      commissionIncome !== null &&
      commissionIncome < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Commission income cannot be negative.",
        },
        {
          status: 400,
        }
      );
    }

    const customerDiscount =
      actualPremium !== null &&
      customerPremium !== null
        ? actualPremium -
          customerPremium
        : null;

    const agentMargin =
      customerPremium !== null &&
      agentPayable !== null
        ? customerPremium -
          agentPayable
        : null;

    /* ---------------------------------------------------------------------- */
    /* CHECK USER                                                             */
    /* ---------------------------------------------------------------------- */

    const user =
      await prisma.user.findUnique({
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
          message:
            "Agent account not found.",
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
          message:
            "Agent account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK CUSTOMER                                                         */
    /* ---------------------------------------------------------------------- */

    const customer =
      await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId,
          isActive: true,
        },

        select: {
          id: true,
          name: true,
          sourceType: true,
          subAgentId: true,
        },
      });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer not found for this agent.",
        },
        {
          status: 404,
        }
      );
    }

    const customerSource =
      customer.sourceType;

    const subAgentId =
      customer.sourceType ===
        "SUB_AGENT"
        ? customer.subAgentId
        : null;

    if (
      customerSource ===
        "SUB_AGENT" &&
      !subAgentId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer is marked as Sub-Agent business but no Sub-Agent is linked.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK CONSULTANT                                                       */
    /* ---------------------------------------------------------------------- */

    let validConsultantId:
      | string
      | null = null;

    if (
      placementSource ===
      "CONSULTANT"
    ) {
      const consultant =
        await prisma.consultant.findFirst({
          where: {
            id: consultantId,
            userId,
            isActive: true,
          },

          select: {
            id: true,
          },
        });

      if (!consultant) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected consultant was not found or is inactive.",
          },
          {
            status: 404,
          }
        );
      }

      validConsultantId =
        consultant.id;
    }

    /* ---------------------------------------------------------------------- */
    /* MOTOR VALUES                                                           */
    /* ---------------------------------------------------------------------- */

    let motorVehicleClass:
      | "TWO_WHEELER"
      | "PRIVATE_CAR"
      | "PASSENGER_CARRYING"
      | "GOODS_CARRYING"
      | "MISC_SPECIAL"
      | null = null;

    let motorCoverType:
      | "COMPREHENSIVE"
      | "THIRD_PARTY"
      | "STANDALONE_OD"
      | "STANDARD"
      | null = null;

    let motorVehicleSubClass:
      | string
      | null = null;

    let motorOtherVehicleType:
      | string
      | null = null;

    let vehicleRegistrationNumber:
      | string
      | null = null;

    let vehicleMake:
      | string
      | null = null;

    let vehicleModel:
      | string
      | null = null;

    let vehicleYear:
      | number
      | null = null;

    let vehicleIdv:
      | number
      | null = null;

    let vehicleNcbPercent:
      | number
      | null = null;

    if (
      policyType ===
      "MOTOR"
    ) {
      const rawMotorClass =
        String(
          body.motorVehicleClass ||
            ""
        )
          .trim()
          .toUpperCase();

      const allowedMotorClasses = [
        "TWO_WHEELER",
        "PRIVATE_CAR",
        "PASSENGER_CARRYING",
        "GOODS_CARRYING",
        "MISC_SPECIAL",
      ] as const;

      if (
        !allowedMotorClasses.includes(
          rawMotorClass as
            (typeof allowedMotorClasses)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid motor vehicle classification.",
          },
          {
            status: 400,
          }
        );
      }

      motorVehicleClass =
        rawMotorClass as
          (typeof allowedMotorClasses)[number];

      const rawCoverType =
        String(
          body.motorCoverType ||
            ""
        )
          .trim()
          .toUpperCase();

      const allowedCoverTypes = [
        "COMPREHENSIVE",
        "THIRD_PARTY",
        "STANDALONE_OD",
        "STANDARD",
      ] as const;

      if (
        !allowedCoverTypes.includes(
          rawCoverType as
            (typeof allowedCoverTypes)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid motor cover type.",
          },
          {
            status: 400,
          }
        );
      }

      motorCoverType =
        rawCoverType as
          (typeof allowedCoverTypes)[number];

      motorVehicleSubClass =
        optionalText(
          body.motorVehicleSubClass
        );

      motorOtherVehicleType =
        optionalText(
          body.motorOtherVehicleType
        );

      vehicleRegistrationNumber =
        optionalText(
          body.vehicleRegistrationNumber
        );

      vehicleMake =
        optionalText(
          body.vehicleMake
        );

      vehicleModel =
        optionalText(
          body.vehicleModel
        );

      vehicleYear =
        optionalInteger(
          body.vehicleYear
        );

      vehicleIdv =
        optionalNumber(
          body.vehicleIdv
        );

      vehicleNcbPercent =
        optionalNumber(
          body.vehicleNcbPercent
        );

      if (
        vehicleYear !== null &&
        (
          vehicleYear < 1900 ||
          vehicleYear >
            new Date()
              .getFullYear() +
              1
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter a valid vehicle year.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        vehicleIdv !== null &&
        vehicleIdv < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vehicle IDV cannot be negative.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        vehicleNcbPercent !==
          null &&
        (
          vehicleNcbPercent <
            0 ||
          vehicleNcbPercent >
            100
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Vehicle NCB percentage must be between 0 and 100.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* HEALTH VALUES                                                          */
    /* ---------------------------------------------------------------------- */

    let healthBusinessType:
      | "FRESH"
      | "PORTABILITY"
      | "MIGRATION"
      | null = null;

    let previousInsurerName:
      | string
      | null = null;

    let previousPolicyNumber:
      | string
      | null = null;

    let previousSumInsured:
      | number
      | null = null;

    let previousPolicyExpiry:
      | Date
      | null = null;

    let continuousCoverYears:
      | number
      | null = null;

    if (
      policyType ===
      "HEALTH"
    ) {
      const rawHealthType =
        String(
          body.healthBusinessType ||
            ""
        )
          .trim()
          .toUpperCase();

      const allowedHealthTypes = [
        "FRESH",
        "PORTABILITY",
        "MIGRATION",
      ] as const;

      if (
        !allowedHealthTypes.includes(
          rawHealthType as
            (typeof allowedHealthTypes)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select Fresh, Portability or Migration.",
          },
          {
            status: 400,
          }
        );
      }

      healthBusinessType =
        rawHealthType as
          (typeof allowedHealthTypes)[number];

      previousInsurerName =
        optionalText(
          body.previousInsurerName
        );

      previousPolicyNumber =
        optionalText(
          body.previousPolicyNumber
        );

      previousSumInsured =
        optionalNumber(
          body.previousSumInsured
        );

      previousPolicyExpiry =
        parseDate(
          body.previousPolicyExpiry
        );

      continuousCoverYears =
        optionalInteger(
          body.continuousCoverYears
        );

      if (
        previousSumInsured !==
          null &&
        previousSumInsured < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Previous sum insured cannot be negative.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        continuousCoverYears !==
          null &&
        continuousCoverYears < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Continuous cover years cannot be negative.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* LIFE VALUES                                                            */
    /* ---------------------------------------------------------------------- */

    let lifeProductType:
      | "TRADITIONAL"
      | "UNIT_LINKED"
      | "TERM"
      | "PENSION_ANNUITY"
      | "OTHER"
      | null = null;

    let otherLifeProductName:
      | string
      | null = null;

    if (
      policyType ===
      "LIFE"
    ) {
      const rawLifeType =
        String(
          body.lifeProductType ||
            ""
        )
          .trim()
          .toUpperCase();

      const allowedLifeTypes = [
        "TRADITIONAL",
        "UNIT_LINKED",
        "TERM",
        "PENSION_ANNUITY",
        "OTHER",
      ] as const;

      if (
        !allowedLifeTypes.includes(
          rawLifeType as
            (typeof allowedLifeTypes)[number]
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid life product type.",
          },
          {
            status: 400,
          }
        );
      }

      lifeProductType =
        rawLifeType as
          (typeof allowedLifeTypes)[number];

      otherLifeProductName =
        optionalText(
          body.otherLifeProductName
        );

      if (
        lifeProductType ===
          "OTHER" &&
        !otherLifeProductName
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please enter the other life product name.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* RENEWAL CHECK                                                          */
    /* ---------------------------------------------------------------------- */

    let oldPolicy:
      | {
          id: string;
          customerId: string;
          policyNumber: string;
          isActive: boolean;
        }
      | null = null;

    if (isRenewal) {
      oldPolicy =
        await prisma.policy.findFirst({
          where: {
            id: renewFrom,
            userId,
          },

          select: {
            id: true,
            customerId: true,
            policyNumber: true,
            isActive: true,
          },
        });

      if (!oldPolicy) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Previous policy for renewal was not found.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        oldPolicy.customerId !==
        customerId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Renewal must be created for the same customer.",
          },
          {
            status: 400,
          }
        );
      }

      if (!oldPolicy.isActive) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This policy has already been renewed or is no longer active.",
          },
          {
            status: 409,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE POLICY NUMBER                                                */
    /* ---------------------------------------------------------------------- */

    const duplicatePolicy =
      await prisma.policy.findFirst({
        where: {
          userId,
          policyNumber,
          isActive: true,

          ...(isRenewal
            ? {
                id: {
                  not: renewFrom,
                },
              }
            : {}),
        },

        select: {
          id: true,
        },
      });

    if (duplicatePolicy) {
      return NextResponse.json(
        {
          success: false,

          message:
            isRenewal
              ? "Another active policy already uses this policy number."
              : "This policy number already exists.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* COMMON POLICY DATA                                                     */
    /* ---------------------------------------------------------------------- */

    const commonPolicyData = {
      userId,
      customerId,

      policyNumber,
      companyName,
      productName,

      policyType,
      policyStage,

      customerSource,
      subAgentId,

      placementSource,
      consultantId:
        validConsultantId,

      motorVehicleClass,
      motorVehicleSubClass,
      motorCoverType,
      motorOtherVehicleType,

      vehicleRegistrationNumber,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleIdv,
      vehicleNcbPercent,

      healthBusinessType,

      previousInsurerName,
      previousPolicyNumber,
      previousSumInsured,
      previousPolicyExpiry,
      continuousCoverYears,

      lifeProductType,
      otherLifeProductName,

      sumInsured,

      /*
       * Keep existing premium field
       * for old pages / reports.
       */
      premium:
        actualPremium,

      actualPremium,
      agentPayable,
      customerPremium,
      customerDiscount,
      agentMargin,
      commissionIncome,

      startDate,
      expiryDate,

      policyPdfUrl,

      notes,

      isActive: true,
    };

    /* ---------------------------------------------------------------------- */
    /* FULL PAYMENT                                                           */
    /* ---------------------------------------------------------------------- */

    if (
      paymentType ===
      "FULL"
    ) {
      /* -------------------------------------------------------------------- */
      /* FULL PAYMENT RENEWAL                                                 */
      /* -------------------------------------------------------------------- */

      if (isRenewal) {
        const result =
          await prisma.$transaction(
            async (tx) => {
              const newPolicy =
                await tx.policy.create({
                  data: {
                    ...commonPolicyData,

                    paymentType:
                      "FULL",

                    financier:
                      null,

                    financedAmount:
                      null,

                    emiAmount:
                      null,

                    emiTenure:
                      null,

                    firstEmiDate:
                      null,
                  },

                  include: {
                    customer: {
                      select: {
                        id: true,
                        customerId:
                          true,
                        name: true,
                        phone: true,
                        email: true,
                      },
                    },

                    subAgent:
                      true,

                    consultant:
                      true,

                    installments:
                      true,
                  },
                });

              /*
               * Keep old policy
               * in permanent history.
               */

              await tx.policy.update({
                where: {
                  id: renewFrom,
                },

                data: {
                  isActive:
                    false,
                },
              });

              return newPolicy;
            }
          );

        return NextResponse.json(
          {
            success: true,

            message:
              "Policy renewed successfully.",

            policy:
              result,

            renewal:
              true,

            previousPolicyId:
              renewFrom,
          },
          {
            status: 201,
          }
        );
      }

      /* -------------------------------------------------------------------- */
      /* NORMAL FULL PAYMENT POLICY                                           */
      /* -------------------------------------------------------------------- */

      const policy =
        await prisma.policy.create({
          data: {
            ...commonPolicyData,

            paymentType:
              "FULL",

            financier:
              null,

            financedAmount:
              null,

            emiAmount:
              null,

            emiTenure:
              null,

            firstEmiDate:
              null,
          },

          include: {
            customer: {
              select: {
                id: true,
                customerId:
                  true,
                name: true,
                phone: true,
                email: true,
              },
            },

            subAgent:
              true,

            consultant:
              true,

            installments:
              true,
          },
        });

      return NextResponse.json(
        {
          success: true,

          message:
            "Policy added successfully.",

          policy,

          renewal:
            false,

          previousPolicyId:
            null,
        },
        {
          status: 201,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EMI VALUES                                                             */
    /* ---------------------------------------------------------------------- */

    const financier =
      String(
        body.financier ||
          ""
      ).trim();

    const financedAmount =
      optionalNumber(
        body.financedAmount
      );

    const emiAmount =
      optionalNumber(
        body.emiAmount
      );

    const emiTenure =
      Number(
        body.emiTenure
      );

    const firstEmiDate =
      parseDate(
        body.firstEmiDate
      );

    /* ---------------------------------------------------------------------- */
    /* EMI VALIDATION                                                         */
    /* ---------------------------------------------------------------------- */

    if (!financier) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Financier is required for EMI policy.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      financedAmount ===
        null ||
      financedAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid financed amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      emiAmount === null ||
      emiAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid EMI amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        emiTenure
      ) ||
      emiTenure <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter a valid EMI tenure.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      emiTenure > 120
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "EMI tenure cannot exceed 120 months.",
        },
        {
          status: 400,
        }
      );
    }

    if (!firstEmiDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid first EMI date is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE EMI POLICY                                                      */
    /* ---------------------------------------------------------------------- */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /* ---------------------------------------------------------------- */
          /* CREATE POLICY                                                    */
          /* ---------------------------------------------------------------- */

          const policy =
            await tx.policy.create({
              data: {
                ...commonPolicyData,

                paymentType:
                  "EMI",

                financier,

                financedAmount,

                emiAmount,

                emiTenure,

                firstEmiDate,
              },
            });

          /* ---------------------------------------------------------------- */
          /* CREATE EMI INSTALLMENTS                                          */
          /* ---------------------------------------------------------------- */

          const installments =
            Array.from(
              {
                length:
                  emiTenure,
              },
              (
                _,
                index
              ) => {
                const dueDate =
                  addMonthsSafe(
                    firstEmiDate,
                    index
                  );

                return {
                  policyId:
                    policy.id,

                  installmentNumber:
                    index + 1,

                  dueDate,

                  amount:
                    emiAmount,

                  status:
                    "PENDING" as const,
                };
              }
            );

          await tx.emiInstallment.createMany({
            data:
              installments,
          });

          /* ---------------------------------------------------------------- */
          /* RENEWAL - KEEP OLD POLICY                                        */
          /* ---------------------------------------------------------------- */

          if (isRenewal) {
            await tx.policy.update({
              where: {
                id:
                  renewFrom,
              },

              data: {
                isActive:
                  false,
              },
            });
          }

          /* ---------------------------------------------------------------- */
          /* RETURN COMPLETE POLICY                                           */
          /* ---------------------------------------------------------------- */

          const completePolicy =
            await tx.policy.findUnique({
              where: {
                id:
                  policy.id,
              },

              include: {
                customer: {
                  select: {
                    id: true,
                    customerId:
                      true,
                    name: true,
                    phone: true,
                    email: true,
                  },
                },

                subAgent:
                  true,

                consultant:
                  true,

                installments: {
                  orderBy: {
                    installmentNumber:
                      "asc",
                  },
                },
              },
            });

          return completePolicy;
        }
      );

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          isRenewal
            ? "Policy renewed and EMI schedule added successfully."
            : "Policy and EMI schedule added successfully.",

        policy:
          result,

        renewal:
          isRenewal,

        previousPolicyId:
          isRenewal
            ? renewFrom
            : null,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE POLICY ERROR:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error";

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to create policy.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}