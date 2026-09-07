import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function cleanPhone(value: unknown): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const phone = String(value)
    .replace(/\D/g, "")
    .slice(-10);

  return phone || null;
}

function cleanPhonePrefix(value: unknown): string {
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

  const text = String(value).trim();

  return text || null;
}

function cleanId(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
}

/* -------------------------------------------------------------------------- */
/* MAIN AGENT                                                                 */
/* -------------------------------------------------------------------------- */

async function getMainAgent(
  userId: string
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

  if (!user) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Agent account not found.",
          },
          {
            status: 404,
          }
        ),
    };
  }

  if (!user.isActive) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Agent account is inactive.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

/* -------------------------------------------------------------------------- */
/* STAFF VALIDATION                                                           */
/* -------------------------------------------------------------------------- */

async function validateAssignedStaff(
  userId: string,
  staffId: string
) {
  const staff =
    await prisma.staff.findFirst({
      where: {
        id: staffId,
        userId,
      },

      select: {
        id: true,
        userId: true,
        staffCode: true,
        name: true,
        staffRole: true,
        designation: true,
        department: true,
        isActive: true,
        loginEnabled: true,
      },
    });

  if (!staff) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Selected Staff member was not found under this Agent.",
          },
          {
            status: 404,
          }
        ),
    };
  }

  if (!staff.isActive) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            success: false,
            message:
              "Selected Staff member is inactive.",
          },
          {
            status: 400,
          }
        ),
    };
  }

  return {
    ok: true as const,
    staff,
  };
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
/* COMMON SELECTS                                                             */
/* -------------------------------------------------------------------------- */

const assignedStaffSelect = {
  id: true,
  staffCode: true,
  name: true,
  staffRole: true,
  designation: true,
  department: true,
  isActive: true,
} as const;

const subAgentListSelect = {
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
  inactiveReason: true,
  inactiveAt: true,

  assignedStaffId: true,

  assignedStaff: {
    select:
      assignedStaffSelect,
  },

  createdAt: true,
  updatedAt: true,

  _count: {
    select: {
      customers: true,
      policies: true,
    },
  },
} as const;

const assignmentHistorySelect = {
  id: true,

  subAgentId: true,
  ownerUserId: true,

  fromStaffId: true,
  toStaffId: true,

  changedByType: true,
  changedByUserId: true,
  changedByStaffId: true,
  changedByName: true,

  reason: true,
  createdAt: true,

  fromStaff: {
    select: {
      id: true,
      staffCode: true,
      name: true,
      staffRole: true,
    },
  },

  toStaff: {
    select: {
      id: true,
      staffCode: true,
      name: true,
      staffRole: true,
    },
  },

  changedByStaff: {
    select: {
      id: true,
      staffCode: true,
      name: true,
      staffRole: true,
    },
  },
} as const;

/* -------------------------------------------------------------------------- */
/* GET SUB-AGENTS                                                             */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

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

    const assignedStaffId =
      searchParams
        .get("assignedStaffId")
        ?.trim() || "";

    const agentDirectOnly =
      searchParams.get(
        "agentDirectOnly"
      ) === "true";

    const includeHistory =
      searchParams.get(
        "includeHistory"
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

    const userCheck =
      await getMainAgent(
        userId
      );

    if (!userCheck.ok) {
      return userCheck.response;
    }

    /* ---------------------------------------------------------------------- */
    /* GET ONE SUB-AGENT                                                      */
    /* ---------------------------------------------------------------------- */

    if (subAgentId) {
      const subAgent =
        await prisma.subAgent.findFirst({
          where: {
            id: subAgentId,
            userId,
          },

          select:
            subAgentListSelect,
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

      const assignmentHistory =
        includeHistory
          ? await prisma.subAgentAssignmentHistory.findMany({
              where: {
                subAgentId:
                  subAgent.id,

                ownerUserId:
                  userId,
              },

              select:
                assignmentHistorySelect,

              orderBy: {
                createdAt:
                  "desc",
              },
            })
          : [];

      return NextResponse.json(
        {
          success: true,

          subAgent: {
            ...subAgent,

            assignmentType:
              subAgent.assignedStaffId
                ? "STAFF"
                : "AGENT_DIRECT",

            assignmentHistory,
          },
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
            userId,

            ...(activeOnly
              ? {
                  isActive: true,
                }
              : {}),

            ...(assignedStaffId
              ? {
                  assignedStaffId,
                }
              : {}),

            ...(agentDirectOnly
              ? {
                  assignedStaffId:
                    null,
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

          select:
            subAgentListSelect,

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
          (subAgent) =>
            subAgent.name
              .trim()
              .toLowerCase() ===
            normalizedName
        );

      const exactPhoneMatch =
        phonePrefix.length ===
          10 &&
        subAgents.some(
          (subAgent) =>
            subAgent.phone ===
              phonePrefix ||
            subAgent.whatsapp ===
              phonePrefix
        );

      return NextResponse.json(
        {
          success: true,

          subAgents:
            subAgents.map(
              (subAgent) => ({
                ...subAgent,

                assignmentType:
                  subAgent.assignedStaffId
                    ? "STAFF"
                    : "AGENT_DIRECT",
              })
            ),

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
          userId,

          ...(activeOnly
            ? {
                isActive: true,
              }
            : {}),

          ...(assignedStaffId
            ? {
                assignedStaffId,
              }
            : {}),

          ...(agentDirectOnly
            ? {
                assignedStaffId:
                  null,
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
                  {
                    assignedStaff: {
                      is: {
                        name: {
                          contains:
                            search,
                          mode:
                            "insensitive",
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },

        select:
          subAgentListSelect,

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

        subAgents:
          subAgents.map(
            (subAgent) => ({
              ...subAgent,

              assignmentType:
                subAgent.assignedStaffId
                  ? "STAFF"
                  : "AGENT_DIRECT",
            })
          ),

        count:
          subAgents.length,

        assignedToStaffCount:
          subAgents.filter(
            (item) =>
              Boolean(
                item.assignedStaffId
              )
          ).length,

        agentDirectCount:
          subAgents.filter(
            (item) =>
              !item.assignedStaffId
          ).length,
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

    const assignedStaffId =
      cleanId(
        body.assignedStaffId
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

    const userCheck =
      await getMainAgent(
        userId
      );

    if (!userCheck.ok) {
      return userCheck.response;
    }

    const mainAgent =
      userCheck.user;

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
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

    let assignedStaff:
      | {
          id: string;
          staffCode: string;
          name: string;
          staffRole: string;
        }
      | null =
      null;

    if (assignedStaffId) {
      const staffCheck =
        await validateAssignedStaff(
          userId,
          assignedStaffId
        );

      if (!staffCheck.ok) {
        return staffCheck.response;
      }

      assignedStaff = {
        id:
          staffCheck.staff.id,

        staffCode:
          staffCheck.staff.staffCode,

        name:
          staffCheck.staff.name,

        staffRole:
          String(
            staffCheck.staff.staffRole
          ),
      };
    }

    /* ---------------------------------------------------------------------- */
    /* DUPLICATES                                                             */
    /* ---------------------------------------------------------------------- */

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
          duplicate: true,

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
          duplicate: true,

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
    /* CREATE                                                                 */
    /* ---------------------------------------------------------------------- */

    const code =
      await generateSubAgentCode(
        userId
      );

    const subAgent =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.subAgent.create({
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

                assignedStaffId,

                isActive:
                  true,
              },

              select:
                subAgentListSelect,
            });

          /*
           * Only create an assignment-history row when the
           * Sub-Agent is initially assigned to Staff.
           *
           * Agent Direct is the default relationship and does
           * not require an artificial transfer record.
           */

          if (
            assignedStaffId &&
            assignedStaff
          ) {
            await tx.subAgentAssignmentHistory.create({
              data: {
                subAgentId:
                  created.id,

                ownerUserId:
                  userId,

                fromStaffId:
                  null,

                toStaffId:
                  assignedStaffId,

                changedByType:
                  "AGENT",

                changedByUserId:
                  userId,

                changedByStaffId:
                  null,

                changedByName:
                  mainAgent.name,

                reason:
                  `Initial assignment to ${assignedStaff.staffCode} - ${assignedStaff.name}`,
              },
            });
          }

          return created;
        }
      );

    return NextResponse.json(
      {
        success: true,

        message:
          assignedStaff
            ? `Sub-Agent ${code} created and assigned to ${assignedStaff.name}.`
            : `Sub-Agent ${code} created successfully.`,

        subAgent: {
          ...subAgent,

          assignmentType:
            subAgent.assignedStaffId
              ? "STAFF"
              : "AGENT_DIRECT",
        },
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
/* UPDATE / ASSIGN / TRANSFER SUB-AGENT                                       */
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

    const action =
      String(
        body.action || "EDIT"
      )
        .trim()
        .toUpperCase();

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

    const userCheck =
      await getMainAgent(
        userId
      );

    if (!userCheck.ok) {
      return userCheck.response;
    }

    const mainAgent =
      userCheck.user;

    const existing =
      await prisma.subAgent.findFirst({
        where: {
          id:
            subAgentId,

          userId,
        },

        select: {
          id: true,
          userId: true,

          code: true,
          name: true,

          assignedStaffId:
            true,

          assignedStaff: {
            select:
              assignedStaffSelect,
          },
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
    /* ASSIGN / TRANSFER                                                      */
    /* ---------------------------------------------------------------------- */

    if (
      action ===
        "ASSIGN_STAFF" ||
      action ===
        "TRANSFER_STAFF" ||
      action ===
        "ASSIGNMENT"
    ) {
      const toStaffId =
        cleanId(
          body.assignedStaffId ??
          body.toStaffId
        );

      const reason =
        cleanOptionalText(
          body.reason
        );

      let toStaff:
        | {
            id: string;
            staffCode: string;
            name: string;
            staffRole: string;
          }
        | null =
        null;

      /*
       * null assignedStaffId means:
       * move the Sub-Agent back to Agent Direct.
       */

      if (toStaffId) {
        const staffCheck =
          await validateAssignedStaff(
            userId,
            toStaffId
          );

        if (!staffCheck.ok) {
          return staffCheck.response;
        }

        toStaff = {
          id:
            staffCheck.staff.id,

          staffCode:
            staffCheck.staff.staffCode,

          name:
            staffCheck.staff.name,

          staffRole:
            String(
              staffCheck.staff.staffRole
            ),
        };
      }

      const fromStaffId =
        existing.assignedStaffId ||
        null;

      if (
        fromStaffId ===
        toStaffId
      ) {
        return NextResponse.json(
          {
            success: true,

            unchanged:
              true,

            message:
              toStaff
                ? `${existing.code} - ${existing.name} is already assigned to ${toStaff.name}.`
                : `${existing.code} - ${existing.name} is already under Agent Direct.`,

            subAgent:
              await prisma.subAgent.findUnique({
                where: {
                  id:
                    existing.id,
                },

                select:
                  subAgentListSelect,
              }),
          },
          {
            status: 200,
          }
        );
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const updated =
              await tx.subAgent.update({
                where: {
                  id:
                    existing.id,
                },

                data: {
                  assignedStaffId:
                    toStaffId,
                },

                select:
                  subAgentListSelect,
              });

            const history =
              await tx.subAgentAssignmentHistory.create({
                data: {
                  subAgentId:
                    existing.id,

                  ownerUserId:
                    userId,

                  fromStaffId,

                  toStaffId,

                  changedByType:
                    "AGENT",

                  changedByUserId:
                    userId,

                  changedByStaffId:
                    null,

                  changedByName:
                    mainAgent.name,

                  reason,
                },

                select:
                  assignmentHistorySelect,
              });

            return {
              updated,
              history,
            };
          }
        );

      const fromName =
        existing.assignedStaff
          ? `${existing.assignedStaff.staffCode} - ${existing.assignedStaff.name}`
          : "Agent Direct";

      const toName =
        toStaff
          ? `${toStaff.staffCode} - ${toStaff.name}`
          : "Agent Direct";

      return NextResponse.json(
        {
          success: true,

          message:
            `${existing.code} - ${existing.name} transferred from ${fromName} to ${toName}.`,

          subAgent: {
            ...result.updated,

            assignmentType:
              result.updated.assignedStaffId
                ? "STAFF"
                : "AGENT_DIRECT",
          },

          assignmentHistory:
            result.history,
        },
        {
          status: 200,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* NORMAL PROFILE EDIT                                                    */
    /* ---------------------------------------------------------------------- */

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
          duplicate: true,

          message:
            `This mobile number is already used by ${duplicatePhone.code} - ${duplicatePhone.name} under this Agent.`,
        },
        {
          status: 409,
        }
      );
    }

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
          duplicate: true,

          message:
            `Another Sub-Agent already exists as ${duplicateName.code} - ${duplicateName.name} under this Agent.`,
        },
        {
          status: 409,
        }
      );
    }

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

        select:
          subAgentListSelect,
      });

    return NextResponse.json(
      {
        success: true,

        message:
          `${updatedSubAgent.code} - ${updatedSubAgent.name} updated successfully.`,

        subAgent: {
          ...updatedSubAgent,

          assignmentType:
            updatedSubAgent.assignedStaffId
              ? "STAFF"
              : "AGENT_DIRECT",
        },
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
