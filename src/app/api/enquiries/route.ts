import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_BUSINESS_TYPES = [
  "HEALTH",
  "MOTOR",
  "LIFE",
  "OTHER",
] as const;

const ALLOWED_ENQUIRY_STATUSES = [
  "NEW",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
  "CLOSED",
] as const;

type BusinessType = (typeof ALLOWED_BUSINESS_TYPES)[number];
type EnquiryStatus = (typeof ALLOWED_ENQUIRY_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const text = String(value).trim();
  if (!text) return null;

  // Handle both YYYY-MM-DD and full ISO strings safely
  const dateString = text.includes("T") ? text : `${text}T00:00:00.000Z`;
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function cleanNullableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

/* -------------------------------------------------------------------------- */
/* VALIDATE USER                                                              */
/* -------------------------------------------------------------------------- */

async function validateUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "Agent account not found." },
        { status: 404 }
      ),
    };
  }

  if (!user.isActive) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, message: "Agent account is inactive." },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, user };
}

/* -------------------------------------------------------------------------- */
/* GET ENQUIRIES / SINGLE ENQUIRY                                             */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId")?.trim() || "";
    const customerId = searchParams.get("customerId")?.trim() || "";
    const enquiryId = searchParams.get("id")?.trim() || "";

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    const userCheck = await validateUser(userId);
    if (!userCheck.ok) {
      return userCheck.response;
    }

    if (enquiryId) {
      const enquiry = await prisma.enquiry.findFirst({
        where: {
          id: enquiryId,
          userId,
          isActive: true,
        },
        include: {
          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          followUps: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!enquiry) {
        return NextResponse.json(
          { success: false, message: "Enquiry not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, enquiry },
        { status: 200 }
      );
    }

    const enquiries = await prisma.enquiry.findMany({
      where: {
        userId,
        isActive: true,
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        followUps: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, enquiries },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET ENQUIRIES ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load enquiries." },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE ENQUIRY                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userId = String(body.userId || "").trim();
    const customerId = String(body.customerId || "").trim();
    const businessType = String(body.businessType || "").trim().toUpperCase();

    const requirement = cleanNullableText(body.requirement);
    const remarks = cleanNullableText(body.remarks);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Customer is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUSINESS_TYPES.includes(businessType as BusinessType)) {
      return NextResponse.json(
        { success: false, message: "Please select Health, Motor, Life or Other." },
        { status: 400 }
      );
    }

    const validBusinessType = businessType as BusinessType;

    const userCheck = await validateUser(userId);
    if (!userCheck.ok) {
      return userCheck.response;
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        userId,
        isActive: true,
      },
      select: {
        id: true,
        customerId: true,
        name: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found for this agent." },
        { status: 404 }
      );
    }

    let nextFollowUpDate: Date | null = null;
    if (body.nextFollowUpDate !== undefined && body.nextFollowUpDate !== null && body.nextFollowUpDate !== "") {
      nextFollowUpDate = parseDate(body.nextFollowUpDate);
      if (!nextFollowUpDate) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid next follow-up date." },
          { status: 400 }
        );
      }
    }

    let enquiryDate = new Date();
    if (body.enquiryDate !== undefined && body.enquiryDate !== null && body.enquiryDate !== "") {
      const parsedEnquiryDate = parseDate(body.enquiryDate);
      if (!parsedEnquiryDate) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid enquiry date." },
          { status: 400 }
        );
      }
      enquiryDate = parsedEnquiryDate;
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        userId,
        customerId,
        businessType: validBusinessType,
        requirement,
        remarks,
        status: "NEW",
        enquiryDate,
        nextFollowUpDate,
        isActive: true,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        followUps: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Enquiry saved successfully.",
        enquiry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE ENQUIRY ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to save enquiry." },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE ENQUIRY                                                             */
/* -------------------------------------------------------------------------- */

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const id = String(body.id || "").trim();
    const userId = String(body.userId || "").trim();
    const businessType = String(body.businessType || "").trim().toUpperCase();
    const requestedStatus = String(body.status || "").trim().toUpperCase();

    const requirement = cleanNullableText(body.requirement);
    const remarks = cleanNullableText(body.remarks);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Enquiry ID is required." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUSINESS_TYPES.includes(businessType as BusinessType)) {
      return NextResponse.json(
        { success: false, message: "Please select Health, Motor, Life or Other." },
        { status: 400 }
      );
    }

    const validBusinessType = businessType as BusinessType;

    const userCheck = await validateUser(userId);
    if (!userCheck.ok) {
      return userCheck.response;
    }

    const existing = await prisma.enquiry.findFirst({
      where: {
        id,
        userId,
        isActive: true,
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        enquiryDate: true,
        nextFollowUpDate: true,
        convertedAt: true,
        closedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Enquiry not found." },
        { status: 404 }
      );
    }

    const statusToUse = requestedStatus || String(existing.status).toUpperCase();

    if (!ALLOWED_ENQUIRY_STATUSES.includes(statusToUse as EnquiryStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid enquiry status." },
        { status: 400 }
      );
    }

    const validStatus = statusToUse as EnquiryStatus;

    let enquiryDate = existing.enquiryDate;
    if (body.enquiryDate !== undefined && body.enquiryDate !== null && body.enquiryDate !== "") {
      const parsedEnquiryDate = parseDate(body.enquiryDate);
      if (!parsedEnquiryDate) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid enquiry date." },
          { status: 400 }
        );
      }
      enquiryDate = parsedEnquiryDate;
    }

    let nextFollowUpDate = existing.nextFollowUpDate;

    if (Object.prototype.hasOwnProperty.call(body, "nextFollowUpDate")) {
      if (body.nextFollowUpDate !== null && body.nextFollowUpDate !== "") {
        const parsedNextDate = parseDate(body.nextFollowUpDate);
        if (!parsedNextDate) {
          return NextResponse.json(
            { success: false, message: "Please enter a valid next follow-up date." },
            { status: 400 }
          );
        }
        nextFollowUpDate = parsedNextDate;
      } else {
        nextFollowUpDate = null;
      }
    }

    const now = new Date();
    let convertedAt = existing.convertedAt;
    let closedAt = existing.closedAt;

    if (validStatus === "CONVERTED") {
      convertedAt = existing.convertedAt || now;
      closedAt = existing.closedAt || now;
      nextFollowUpDate = null;
    }

    if (validStatus === "LOST" || validStatus === "CLOSED") {
      convertedAt = null;
      closedAt = existing.closedAt || now;
      nextFollowUpDate = null;
    }

    if (validStatus === "NEW" || validStatus === "FOLLOW_UP") {
      convertedAt = null;
      closedAt = null;
    }

    const enquiry = await prisma.enquiry.update({
      where: { id: existing.id },
      data: {
        businessType: validBusinessType,
        requirement,
        remarks,
        status: validStatus,
        enquiryDate,
        nextFollowUpDate,
        convertedAt,
        closedAt,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        followUps: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          validStatus === "CONVERTED"
            ? "Converted enquiry updated successfully."
            : "Enquiry updated successfully.",
        enquiry,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE ENQUIRY ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update enquiry." },
      { status: 500 }
    );
  }
}