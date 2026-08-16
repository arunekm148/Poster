import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanPhone(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const phone =
    String(value)
      .replace(/\D/g, "")
      .slice(-10);

  return phone || null;
}

function cleanPhonePrefix(
  value: unknown
): string {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);
}

function cleanOptionalText(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

/* -------------------------------------------------------------------------- */
/* GENERATE SUB-AGENT CODE                                                    */
/* -------------------------------------------------------------------------- */

async function generateSubAgentCode(
  userId: string
) {
  const count =
    await prisma.subAgent.count({
      where: {
        userId,
      },
    });

  let number =
    count + 1;

  while (true) {
    const code =
      `SA-${String(
        number
      ).padStart(
        4,
        "0"
      )}`;

    const exists =
      await prisma.subAgent.findFirst({
        where: {
          userId,
          code,
        },

        select: {
          id: true,
        },
      });

    if (!exists) {
      return code;
    }

    number += 1;
  }
}

/* -------------------------------------------------------------------------- */
/* GET SUB-AGENTS                                                             */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const userId =
      searchParams
        .get("userId")
        ?.trim() || "";

    const subAgentId =
      searchParams
        .get("subAgentId")
        ?.trim() || "";

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const namePrefix =
      searchParams
        .get("namePrefix")
        ?.trim() || "";

    const phonePrefix =
      cleanPhonePrefix(
        searchParams.get(
          "phonePrefix"
        )
      );

    const activeOnly =
      searchParams.get(
        "activeOnly"
      ) !== "false";

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
    /* CHECK MAIN AGENT                                                       */
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
    /* GET ONE SUB-AGENT                                                      */
    /* ---------------------------------------------------------------------- */

    if (subAgentId) {
      const subAgent =
        await prisma.subAgent.findFirst({
          where: {
            id: subAgentId,

            /*
             * IMPORTANT
             *
             * Only allow this main Agent
             * to access his own Sub-Agent.
             */

            userId,
          },

          select: {
            id: true,
            userId: true,

            code: true,
            name: true,

            phone: true,
            whatsapp: true,
            email: true,

            address: true,
            district: true,
            state: true,
            pincode: true,

            notes: true,

            isActive: true,

            createdAt: true,
            updatedAt: true,

            _count: {
              select: {
                customers: true,
              },
            },
          },
        });

      if (!subAgent) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Sub-Agent not found.",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          subAgent,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* AUTOCOMPLETE LOOKUP                                                    */
    /* ---------------------------------------------------------------------- */

    if (
      namePrefix ||
      phonePrefix
    ) {
      if (
        namePrefix &&
        namePrefix.length < 2 &&
        !phonePrefix
      ) {
        return NextResponse.json(
          {
            success: true,

            subAgents: [],

            exactNameMatch:
              false,

            exactPhoneMatch:
              false,

            count: 0,
          },
          {
            status: 200,
          }
        );
      }

      if (
        phonePrefix &&
        phonePrefix.length < 7 &&
        !namePrefix
      ) {
        return NextResponse.json(
          {
            success: true,

            subAgents: [],

            exactNameMatch:
              false,

            exactPhoneMatch:
              false,

            count: 0,
          },
          {
            status: 200,
          }
        );
      }

      const subAgents =
        await prisma.subAgent.findMany({
          where: {
            /*
             * IMPORTANT
             *
             * Search only this Agent's
             * own Sub-Agents.
             */

            userId,

            ...(activeOnly
              ? {
                  isActive:
                    true,
                }
              : {}),

            ...(namePrefix &&
            phonePrefix
              ? {
                  OR: [
                    {
                      name: {
                        contains:
                          namePrefix,

                        mode:
                          "insensitive",
                      },
                    },

                    {
                      phone: {
                        startsWith:
                          phonePrefix,
                      },
                    },

                    {
                      whatsapp: {
                        startsWith:
                          phonePrefix,
                      },
                    },
                  ],
                }
              : namePrefix
              ? {
                  name: {
                    contains:
                      namePrefix,

                    mode:
                      "insensitive",
                  },
                }
              : phonePrefix
              ? {
                  OR: [
                    {
                      phone: {
                        startsWith:
                          phonePrefix,
                      },
                    },

                    {
                      whatsapp: {
                        startsWith:
                          phonePrefix,
                      },
                    },
                  ],
                }
              : {}),
          },

          select: {
            id: true,
            userId: true,

            code: true,
            name: true,

            phone: true,
            whatsapp: true,
            email: true,

            address: true,
            district: true,
            state: true,
            pincode: true,

            notes: true,

            isActive: true,

            createdAt: true,
            updatedAt: true,

            _count: {
              select: {
                customers: true,
              },
            },
          },

          orderBy: [
            {
              isActive:
                "desc",
            },

            {
              name:
                "asc",
            },
          ],

          take: 20,
        });

      const normalizedName =
        namePrefix
          .trim()
          .toLowerCase();

      const exactNameMatch =
        Boolean(
          normalizedName
        ) &&
        subAgents.some(
          (
            subAgent
          ) =>
            subAgent.name
              .trim()
              .toLowerCase() ===
            normalizedName
        );

      const exactPhoneMatch =
        phonePrefix.length ===
          10 &&
        subAgents.some(
          (
            subAgent
          ) =>
            subAgent.phone ===
              phonePrefix ||
            subAgent.whatsapp ===
              phonePrefix
        );

      return NextResponse.json(
        {
          success: true,

          subAgents,

          exactNameMatch,

          exactPhoneMatch,

          count:
            subAgents.length,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* NORMAL SUB-AGENT LIST                                                  */
    /* ---------------------------------------------------------------------- */

    const subAgents =
      await prisma.subAgent.findMany({
        where: {
          /*
           * IMPORTANT
           *
           * Only Sub-Agents belonging
           * to this main Agent.
           */

          userId,

          ...(activeOnly
            ? {
                isActive:
                  true,
              }
            : {}),

          ...(search
            ? {
                OR: [
                  {
                    code: {
                      contains:
                        search,

                      mode:
                        "insensitive",
                    },
                  },

                  {
                    name: {
                      contains:
                        search,

                      mode:
                        "insensitive",
                    },
                  },

                  {
                    phone: {
                      contains:
                        search,
                    },
                  },

                  {
                    whatsapp: {
                      contains:
                        search,
                    },
                  },

                  {
                    email: {
                      contains:
                        search,

                      mode:
                        "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },

        select: {
          id: true,
          userId: true,

          code: true,
          name: true,

          phone: true,
          whatsapp: true,
          email: true,

          address: true,
          district: true,
          state: true,
          pincode: true,

          notes: true,

          isActive: true,

          createdAt: true,
          updatedAt: true,

          _count: {
            select: {
              customers: true,
            },
          },
        },

        orderBy: [
          {
            isActive:
              "desc",
          },

          {
            name:
              "asc",
          },
        ],
      });

    return NextResponse.json(
      {
        success: true,

        subAgents,

        count:
          subAgents.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET SUB AGENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to load Sub-Agents.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE SUB-AGENT                                                           */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      String(
        body.userId || ""
      ).trim();

    const name =
      String(
        body.name || ""
      ).trim();

    const phone =
      cleanPhone(
        body.phone
      );

    let whatsapp =
      cleanPhone(
        body.whatsapp
      );

    const email =
      body.email
        ? String(
            body.email
          )
            .trim()
            .toLowerCase()
        : null;

    const address =
      cleanOptionalText(
        body.address
      );

    const district =
      cleanOptionalText(
        body.district
      );

    const state =
      cleanOptionalText(
        body.state
      );

    const pincode =
      body.pincode
        ? String(
            body.pincode
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(
              0,
              6
            )
        : null;

    const notes =
      cleanOptionalText(
        body.notes
      );

    /* ---------------------------------------------------------------------- */
    /* MAIN AGENT REQUIRED                                                    */
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
    /* CHECK MAIN AGENT                                                       */
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
    /* NAME                                                                   */
    /* ---------------------------------------------------------------------- */

    if (
      !name ||
      name.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid Sub-Agent name.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* MOBILE MANDATORY                                                       */
    /* ---------------------------------------------------------------------- */

    if (!phone) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sub-Agent mobile number is mandatory.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* WHATSAPP                                                               */
    /* ---------------------------------------------------------------------- */

    if (!whatsapp) {
      whatsapp =
        phone;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        whatsapp
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 10 digit WhatsApp number.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EMAIL                                                                  */
    /* ---------------------------------------------------------------------- */

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PINCODE                                                                */
    /* ---------------------------------------------------------------------- */

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE MOBILE                                                       */
    /* ---------------------------------------------------------------------- */
    /*
     * IMPORTANT:
     *
     * userId is included here.
     *
     * This means:
     *
     * Agent A can have Ravi 9876543210
     * Agent B can also have Ravi 9876543210
     *
     * No conflict.
     *
     * Only duplicates inside the SAME
     * main Agent account are blocked.
     */

    const duplicatePhone =
      await prisma.subAgent.findFirst({
        where: {
          userId,

          OR: [
            {
              phone,
            },

            {
              whatsapp:
                phone,
            },
          ],
        },

        select: {
          id: true,

          code: true,

          name: true,

          phone: true,

          whatsapp: true,

          email: true,
        },
      });

    if (
      duplicatePhone
    ) {
      return NextResponse.json(
        {
          success: false,

          duplicate:
            true,

          message:
            `This mobile number is already linked to Sub-Agent ${duplicatePhone.code} - ${duplicatePhone.name} under this Agent.`,

          subAgent:
            duplicatePhone,
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE NAME                                                         */
    /* ---------------------------------------------------------------------- */
    /*
     * Same rule:
     * duplicate name is checked only
     * inside the SAME Agent.
     */

    const duplicateName =
      await prisma.subAgent.findFirst({
        where: {
          userId,

          name: {
            equals:
              name,

            mode:
              "insensitive",
          },
        },

        select: {
          id: true,

          code: true,

          name: true,

          phone: true,

          whatsapp: true,

          email: true,
        },
      });

    if (
      duplicateName
    ) {
      return NextResponse.json(
        {
          success: false,

          duplicate:
            true,

          message:
            `A Sub-Agent named ${duplicateName.name} already exists as ${duplicateName.code} under this Agent.`,

          subAgent:
            duplicateName,
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* GENERATE CODE                                                          */
    /* ---------------------------------------------------------------------- */

    const code =
      await generateSubAgentCode(
        userId
      );

    /* ---------------------------------------------------------------------- */
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const subAgent =
      await prisma.subAgent.create({
        data: {
          userId,

          code,

          name,

          phone,

          whatsapp,

          email,

          address,

          district,

          state,

          pincode,

          notes,

          isActive:
            true,
        },

        select: {
          id: true,

          userId: true,

          code: true,

          name: true,

          phone: true,

          whatsapp: true,

          email: true,

          address: true,

          district: true,

          state: true,

          pincode: true,

          notes: true,

          isActive: true,

          createdAt: true,

          updatedAt: true,
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          `Sub-Agent ${code} created successfully.`,

        subAgent,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE SUB AGENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to create Sub-Agent.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE SUB-AGENT                                                           */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      String(
        body.userId || ""
      ).trim();

    const subAgentId =
      String(
        body.subAgentId || ""
      ).trim();

    const name =
      String(
        body.name || ""
      ).trim();

    const phone =
      cleanPhone(
        body.phone
      );

    let whatsapp =
      cleanPhone(
        body.whatsapp
      );

    const email =
      body.email
        ? String(
            body.email
          )
            .trim()
            .toLowerCase()
        : null;

    const address =
      cleanOptionalText(
        body.address
      );

    const district =
      cleanOptionalText(
        body.district
      );

    const state =
      cleanOptionalText(
        body.state
      );

    const pincode =
      body.pincode
        ? String(
            body.pincode
          )
            .replace(
              /\D/g,
              ""
            )
            .slice(
              0,
              6
            )
        : null;

    const notes =
      cleanOptionalText(
        body.notes
      );

    /* ---------------------------------------------------------------------- */
    /* REQUIRED                                                               */
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

    if (!subAgentId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sub-Agent ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK MAIN AGENT                                                       */
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
    /* CHECK SUB AGENT BELONGS TO THIS AGENT                                  */
    /* ---------------------------------------------------------------------- */

    const existing =
      await prisma.subAgent.findFirst({
        where: {
          id:
            subAgentId,

          /*
           * Very important.
           *
           * Prevent one Agent editing
           * another Agent's Sub-Agent.
           */

          userId,
        },

        select: {
          id: true,

          code: true,

          name: true,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sub-Agent not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* NAME                                                                   */
    /* ---------------------------------------------------------------------- */

    if (
      !name ||
      name.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid Sub-Agent name.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* MOBILE MANDATORY                                                       */
    /* ---------------------------------------------------------------------- */

    if (!phone) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Sub-Agent mobile number is mandatory.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[6-9]\d{9}$/.test(
        phone
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 10 digit mobile number.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* WHATSAPP                                                               */
    /* ---------------------------------------------------------------------- */

    if (!whatsapp) {
      whatsapp =
        phone;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        whatsapp
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 10 digit WhatsApp number.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EMAIL                                                                  */
    /* ---------------------------------------------------------------------- */

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PINCODE                                                                */
    /* ---------------------------------------------------------------------- */

    if (
      pincode &&
      !/^\d{6}$/.test(
        pincode
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid 6 digit pincode.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE MOBILE                                                       */
    /* ---------------------------------------------------------------------- */
    /*
     * IMPORTANT:
     *
     * userId = SAME main Agent only
     *
     * id not subAgentId =
     * ignore the record being edited
     */

    const duplicatePhone =
      await prisma.subAgent.findFirst({
        where: {
          userId,

          id: {
            not:
              subAgentId,
          },

          OR: [
            {
              phone,
            },

            {
              whatsapp:
                phone,
            },
          ],
        },

        select: {
          id: true,

          code: true,

          name: true,
        },
      });

    if (
      duplicatePhone
    ) {
      return NextResponse.json(
        {
          success: false,

          duplicate:
            true,

          message:
            `This mobile number is already used by ${duplicatePhone.code} - ${duplicatePhone.name} under this Agent.`,
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATE NAME                                                         */
    /* ---------------------------------------------------------------------- */

    const duplicateName =
      await prisma.subAgent.findFirst({
        where: {
          userId,

          id: {
            not:
              subAgentId,
          },

          name: {
            equals:
              name,

            mode:
              "insensitive",
          },
        },

        select: {
          id: true,

          code: true,

          name: true,
        },
      });

    if (
      duplicateName
    ) {
      return NextResponse.json(
        {
          success: false,

          duplicate:
            true,

          message:
            `Another Sub-Agent already exists as ${duplicateName.code} - ${duplicateName.name} under this Agent.`,
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const updatedSubAgent =
      await prisma.subAgent.update({
        where: {
          id:
            subAgentId,
        },

        data: {
          name,

          phone,

          whatsapp,

          email,

          address,

          district,

          state,

          pincode,

          notes,
        },

        select: {
          id: true,

          userId: true,

          code: true,

          name: true,

          phone: true,

          whatsapp: true,

          email: true,

          address: true,

          district: true,

          state: true,

          pincode: true,

          notes: true,

          isActive: true,

          createdAt: true,

          updatedAt: true,
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          `${updatedSubAgent.code} - ${updatedSubAgent.name} updated successfully.`,

        subAgent:
          updatedSubAgent,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE SUB AGENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Unable to update Sub-Agent.",
      },
      {
        status: 500,
      }
    );
  }
}