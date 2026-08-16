import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* GET SUPPORT MESSAGES                                                       */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const messages =
      await prisma.supportMessage.findMany({
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },

          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    return NextResponse.json(
      {
        success: true,
        messages,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ADMIN SUPPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load support messages.",
        messages: [],
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* ADMIN REPLY                                                                */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const agentId =
      String(
        body.agentId || ""
      ).trim();

    const adminId =
      String(
        body.adminId || ""
      ).trim();

    const message =
      String(
        body.message || ""
      ).trim();

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
    /* ---------------------------------------------------------------------- */

    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reply message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Message is too long.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK ADMIN                                                            */
    /* ---------------------------------------------------------------------- */

    const admin =
      await prisma.user.findFirst({
        where: {
          id: adminId,
          role: "ADMIN",
          isActive: true,
        },

        select: {
          id: true,
          name: true,
        },
      });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK AGENT                                                            */
    /* ---------------------------------------------------------------------- */

    const agent =
      await prisma.user.findFirst({
        where: {
          id: agentId,
          role: "AGENT",
        },

        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

    if (!agent) {
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

    /* ---------------------------------------------------------------------- */
    /* CREATE ADMIN MESSAGE                                                   */
    /* ---------------------------------------------------------------------- */

    const createdMessage =
      await prisma.supportMessage.create({
        data: {
          agentId,

          adminId,

          sender:
            "ADMIN",

          message,

          readByAdmin:
            true,

          readByAgent:
            false,
        },

        include: {
          agent: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },

          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    /* ---------------------------------------------------------------------- */
    /* MARK AGENT MESSAGES READ BY ADMIN                                      */
    /* ---------------------------------------------------------------------- */

    await prisma.supportMessage.updateMany({
      where: {
        agentId,

        sender:
          "AGENT",

        readByAdmin:
          false,
      },

      data: {
        readByAdmin:
          true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Reply sent successfully.",
        supportMessage:
          createdMessage,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN SUPPORT REPLY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to send support reply.",
      },
      {
        status: 500,
      }
    );
  }
}