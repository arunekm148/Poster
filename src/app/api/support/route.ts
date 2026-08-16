import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* GET AGENT SUPPORT MESSAGES                                                 */
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

    const agentId =
      searchParams
        .get("agentId")
        ?.trim() || "";

    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent ID is required.",
          messages: [],
        },
        {
          status: 400,
        }
      );
    }

    const agent =
      await prisma.user.findUnique({
        where: {
          id: agentId,
        },

        select: {
          id: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account not found.",
          messages: [],
        },
        {
          status: 404,
        }
      );
    }

    if (!agent.isActive) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Agent account is inactive.",
          messages: [],
        },
        {
          status: 403,
        }
      );
    }

    const messages =
      await prisma.supportMessage.findMany({
        where: {
          agentId,
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    /*
     * When the agent opens the chat,
     * mark Admin replies as read.
     */
    await prisma.supportMessage.updateMany({
      where: {
        agentId,

        sender: "ADMIN",

        readByAgent:
          false,
      },

      data: {
        readByAgent:
          true,
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
      "GET AGENT SUPPORT ERROR:",
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
/* SEND MESSAGE FROM AGENT                                                    */
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

    const message =
      String(
        body.message || ""
      ).trim();

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

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      message.length >
      2000
    ) {
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

    const agent =
      await prisma.user.findUnique({
        where: {
          id: agentId,
        },

        select: {
          id: true,
          name: true,
          role: true,
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

    if (!agent.isActive) {
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

    const supportMessage =
      await prisma.supportMessage.create({
        data: {
          agentId,

          sender:
            "AGENT",

          message,

          adminId:
            null,

          readByAdmin:
            false,

          readByAgent:
            true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Message sent to Admin.",
        supportMessage,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "SEND AGENT SUPPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to send support message.",
      },
      {
        status: 500,
      }
    );
  }
}