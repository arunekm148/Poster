import {
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type PosterSource =
  | "ADMIN"
  | "AGENT";

type PosterAction =
  | "APPROVE"
  | "REJECT"
  | "EDIT";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

async function findAdmin(
  userId?: string
) {
  if (!userId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "ADMIN",
      isActive: true,
    },

    select: {
      id: true,
      name: true,
    },
  });
}

function getCleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getCreditAmount(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

function slugifyCategory(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
|--------------------------------------------------------------------------
| FIND OR CREATE POSTER CATEGORY
|--------------------------------------------------------------------------
|
| Your database reset intentionally cleared Category records. Because the
| poster page sends categoryName such as "Health Insurance", the old API
| returned "Poster category not found." after a reset.
|
| This helper safely recreates the category when it is missing.
|
|--------------------------------------------------------------------------
*/

async function resolveCategory({
  categoryId,
  categoryName,
}: {
  categoryId?: string;
  categoryName?: string;
}) {
  const cleanId = getCleanString(categoryId);
  const cleanName = getCleanString(categoryName);

  if (cleanId) {
    const byId =
      await prisma.category.findFirst({
        where: {
          id: cleanId,
          isActive: true,
        },

        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

    if (byId) {
      return byId;
    }
  }

  if (!cleanName) {
    return null;
  }

  const byName =
    await prisma.category.findFirst({
      where: {
        name: {
          equals: cleanName,
          mode: "insensitive",
        },

        isActive: true,
      },

      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

  if (byName) {
    return byName;
  }

  const slug =
    slugifyCategory(cleanName);

  if (!slug) {
    return null;
  }

  /*
   * Upsert by slug prevents duplicates if two requests arrive together.
   */
  return prisma.category.upsert({
    where: {
      slug,
    },

    create: {
      name: cleanName,
      slug,
      isActive: true,
    },

    update: {
      name: cleanName,
      isActive: true,
    },

    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* GET POSTERS                                                                */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const categoryId =
      searchParams.get("categoryId")?.trim() || "";

    const companyId =
      searchParams.get("companyId")?.trim() || "";

    const source =
      searchParams.get("source")?.trim().toUpperCase() || "";

    const userId =
      searchParams.get("userId")?.trim() || "";

    const pending =
      searchParams.get("pending") === "true";

    const requestedStatus =
      searchParams.get("status")?.trim().toUpperCase() || "";

    if (pending) {
      const posters =
        await prisma.media.findMany({
          where: {
            isActive: true,
            approvalStatus: "PENDING",
          },

          include: {
            company: true,
            category: true,

            uploadedBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                logoUrl: true,
              },
            },

            approvedBy: {
              select: {
                id: true,
                name: true,
              },
            },

            _count: {
              select: {
                downloads: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      return NextResponse.json({
        success: true,
        posters,
      });
    }

    if (
      requestedStatus === "REJECTED" ||
      requestedStatus === "PENDING" ||
      requestedStatus === "APPROVED"
    ) {
      const posters =
        await prisma.media.findMany({
          where: {
            isActive: true,

            approvalStatus:
              requestedStatus as
                | "REJECTED"
                | "PENDING"
                | "APPROVED",

            ...(source === "ADMIN" || source === "AGENT"
              ? {
                  source:
                    source as PosterSource,
                }
              : {}),

            ...(userId
              ? {
                  uploadedByUserId:
                    userId,
                }
              : {}),
          },

          include: {
            company: true,
            category: true,

            uploadedBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                logoUrl: true,
              },
            },

            approvedBy: {
              select: {
                id: true,
                name: true,
              },
            },

            _count: {
              select: {
                downloads: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        });

      return NextResponse.json({
        success: true,
        posters,
      });
    }

    const posters =
      await prisma.media.findMany({
        where: {
          isActive: true,
          approvalStatus: "APPROVED",

          ...(categoryId
            ? {
                categoryId,
              }
            : {}),

          ...(companyId === "GENERAL"
            ? {
                companyId: null,
              }
            : companyId
            ? {
                companyId,
              }
            : {}),

          ...(source === "ADMIN" || source === "AGENT"
            ? {
                source:
                  source as PosterSource,
              }
            : {}),

          ...(userId
            ? {
                uploadedByUserId:
                  userId,
              }
            : {}),
        },

        include: {
          company: true,
          category: true,

          uploadedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              logoUrl: true,
            },
          },

          approvedBy: {
            select: {
              id: true,
              name: true,
            },
          },

          _count: {
            select: {
              downloads: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      posters,
    });
  } catch (error) {
    console.error(
      "GET POSTERS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load posters.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* CREATE POSTER                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const title =
      getCleanString(body.title);

    const fileUrl =
      getCleanString(body.fileUrl);

    const thumbnailUrl =
      getCleanString(body.thumbnailUrl);

    const companyId =
      getCleanString(body.companyId);

    const categoryId =
      getCleanString(body.categoryId);

    const companyName =
      getCleanString(body.companyName);

    const categoryName =
      getCleanString(body.categoryName);

    const uploadedByUserId =
      getCleanString(body.uploadedByUserId);

    const requestedSource =
      getCleanString(body.source).toUpperCase() ||
      "ADMIN";

    const source: PosterSource =
      requestedSource === "AGENT"
        ? "AGENT"
        : "ADMIN";

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Poster title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!fileUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Poster file URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    const category =
      await resolveCategory({
        categoryId,
        categoryName,
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Poster category is required.",
        },
        {
          status: 400,
        }
      );
    }

    let company:
      | {
          id: string;
          name: string;
        }
      | null = null;

    if (
      companyId &&
      companyId !== "GENERAL"
    ) {
      company =
        await prisma.company.findFirst({
          where: {
            id: companyId,
            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },
        });

      if (!company) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected insurance company was not found.",
          },
          {
            status: 400,
          }
        );
      }
    } else if (
      companyName &&
      companyName.toUpperCase() !== "GENERAL"
    ) {
      company =
        await prisma.company.findFirst({
          where: {
            name: {
              equals: companyName,
              mode: "insensitive",
            },

            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },
        });

      if (!company) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Selected insurance company was not found.",
          },
          {
            status: 400,
          }
        );
      }
    }

    let contributor:
      | {
          id: string;
          name: string;
        }
      | null = null;

    if (source === "AGENT") {
      if (!uploadedByUserId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Agent user ID is required for agent poster submission.",
          },
          {
            status: 400,
          }
        );
      }

      contributor =
        await prisma.user.findFirst({
          where: {
            id: uploadedByUserId,
            isActive: true,
            role: "AGENT",
          },

          select: {
            id: true,
            name: true,
          },
        });

      if (!contributor) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Agent account was not found.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const approvalStatus =
      source === "AGENT"
        ? "PENDING"
        : "APPROVED";

    const poster =
      await prisma.media.create({
        data: {
          title,
          fileUrl,

          thumbnailUrl:
            thumbnailUrl || null,

          categoryId:
            category.id,

          companyId:
            company?.id || null,

          source,

          uploadedByUserId:
            source === "AGENT"
              ? contributor?.id || null
              : null,

          approvalStatus,

          approvedAt:
            source === "ADMIN"
              ? new Date()
              : null,

          rejectionReason: null,
          creditAmount: null,
          creditedAt: null,
          isActive: true,
        },

        include: {
          company: true,
          category: true,

          uploadedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              logoUrl: true,
            },
          },

          _count: {
            select: {
              downloads: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,

        message:
          source === "AGENT"
            ? "Poster submitted successfully and is waiting for admin approval."
            : "Poster published successfully.",

        poster,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE POSTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add poster.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH POSTER                                                               */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const id =
      getCleanString(body.id);

    const action =
      getCleanString(body.action).toUpperCase() as PosterAction;

    const approvedByUserId =
      getCleanString(body.approvedByUserId);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Poster ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existingPoster =
      await prisma.media.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,
          fileUrl: true,
          thumbnailUrl: true,
          source: true,
          uploadedByUserId: true,
          approvalStatus: true,
          rejectionReason: true,
          categoryId: true,
          companyId: true,
          creditAmount: true,
          creditedAt: true,
          isActive: true,
          createdAt: true,
        },
      });

    if (!existingPoster) {
      return NextResponse.json(
        {
          success: false,
          message: "Poster not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (action === "EDIT") {
      const admin =
        await findAdmin(
          approvedByUserId
        );

      if (!admin) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Admin authorization failed.",
          },
          {
            status: 403,
          }
        );
      }

      const title =
        getCleanString(body.title);

      const fileUrl =
        getCleanString(body.fileUrl);

      const categoryId =
        getCleanString(body.categoryId);

      const categoryName =
        getCleanString(body.categoryName);

      const companyId =
        getCleanString(body.companyId);

      const companyName =
        getCleanString(body.companyName);

      if (!title) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Poster title is required.",
          },
          {
            status: 400,
          }
        );
      }

      const category =
        await resolveCategory({
          categoryId,
          categoryName,
        });

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Poster category is required.",
          },
          {
            status: 400,
          }
        );
      }

      let finalCompanyId:
        | string
        | null = null;

      if (
        companyId &&
        companyId !== "GENERAL"
      ) {
        const company =
          await prisma.company.findFirst({
            where: {
              id: companyId,
              isActive: true,
            },

            select: {
              id: true,
            },
          });

        if (!company) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Selected insurance company was not found.",
            },
            {
              status: 400,
            }
          );
        }

        finalCompanyId =
          company.id;
      } else if (
        companyName &&
        companyName.toUpperCase() !== "GENERAL"
      ) {
        const company =
          await prisma.company.findFirst({
            where: {
              name: {
                equals: companyName,
                mode: "insensitive",
              },

              isActive: true,
            },

            select: {
              id: true,
            },
          });

        if (!company) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Selected insurance company was not found.",
            },
            {
              status: 400,
            }
          );
        }

        finalCompanyId =
          company.id;
      }

      const poster =
        await prisma.media.update({
          where: {
            id,
          },

          data: {
            title,
            categoryId: category.id,
            companyId: finalCompanyId,

            ...(fileUrl
              ? {
                  fileUrl,
                  thumbnailUrl: null,
                }
              : {}),
          },

          include: {
            company: true,
            category: true,

            uploadedBy: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                logoUrl: true,
              },
            },

            approvedBy: {
              select: {
                id: true,
                name: true,
              },
            },

            _count: {
              select: {
                downloads: true,
              },
            },
          },
        });

      return NextResponse.json({
        success: true,

        message:
          fileUrl
            ? "Poster details and corrected image updated successfully. Contributor retained."
            : "Poster details updated successfully. Contributor retained.",

        poster,
      });
    }

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid poster action is required.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      await findAdmin(
        approvedByUserId
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authorization failed.",
        },
        {
          status: 403,
        }
      );
    }

    if (action === "APPROVE") {
      const requestedCredit =
        getCreditAmount(
          body.creditAmount
        );

      if (requestedCredit === null) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Enter a valid contributor credit amount.",
          },
          {
            status: 400,
          }
        );
      }

      const isAgentPoster =
        existingPoster.source === "AGENT" &&
        Boolean(
          existingPoster.uploadedByUserId
        );

      const alreadyCredited =
        Boolean(
          existingPoster.creditedAt
        );

      const creditToApply =
        isAgentPoster &&
        !alreadyCredited &&
        requestedCredit > 0
          ? requestedCredit
          : 0;

      const result =
        await prisma.$transaction(
          async (tx) => {
            const poster =
              await tx.media.update({
                where: {
                  id,
                },

                data: {
                  approvalStatus: "APPROVED",
                  approvedByUserId: admin.id,
                  approvedAt: new Date(),
                  rejectionReason: null,
                  isActive: true,

                  ...(isAgentPoster &&
                  !alreadyCredited
                    ? {
                        creditAmount:
                          requestedCredit,

                        creditedAt:
                          requestedCredit > 0
                            ? new Date()
                            : null,
                      }
                    : {}),
                },

                include: {
                  company: true,
                  category: true,

                  uploadedBy: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      email: true,
                      logoUrl: true,
                    },
                  },

                  approvedBy: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },

                  _count: {
                    select: {
                      downloads: true,
                    },
                  },
                },
              });

            if (
              creditToApply > 0 &&
              existingPoster.uploadedByUserId
            ) {
              const agentId =
                existingPoster.uploadedByUserId;

              await tx.agentCreditAccount.upsert({
                where: {
                  userId: agentId,
                },

                create: {
                  userId: agentId,
                  availableBalance: creditToApply,
                  totalEarned: creditToApply,
                  totalWithdrawn: 0,
                  totalPending: 0,
                },

                update: {
                  availableBalance: {
                    increment: creditToApply,
                  },

                  totalEarned: {
                    increment: creditToApply,
                  },
                },
              });

              await tx.creditTransaction.create({
                data: {
                  userId: agentId,
                  mediaId: id,
                  type: "EARN",
                  amount: creditToApply,

                  description:
                    `Poster approval credit: ${existingPoster.title}`,

                  referenceType:
                    "MEDIA_APPROVAL",

                  referenceId: id,
                },
              });
            }

            return poster;
          }
        );

      let responseMessage =
        "Poster approved and published successfully.";

      if (creditToApply > 0) {
        responseMessage =
          `Poster approved successfully. ₹${creditToApply.toLocaleString(
            "en-IN",
            {
              maximumFractionDigits: 2,
            }
          )} credited to the contributor.`;
      } else if (alreadyCredited) {
        responseMessage =
          "Poster approved successfully. Existing contributor credit was retained; no duplicate credit was added.";
      }

      return NextResponse.json({
        success: true,
        message: responseMessage,
        creditAdded: creditToApply,
        alreadyCredited,
        poster: result,
      });
    }

    const rejectionReason =
      getCleanString(
        body.rejectionReason
      );

    if (!rejectionReason) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Rejection reason is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (existingPoster.creditedAt) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This poster has already been credited to the contributor and cannot be rejected. Edit or disable it instead.",
        },
        {
          status: 409,
        }
      );
    }

    const poster =
      await prisma.media.update({
        where: {
          id,
        },

        data: {
          approvalStatus: "REJECTED",
          approvedByUserId: admin.id,
          approvedAt: new Date(),
          rejectionReason,
          isActive: true,
        },

        include: {
          company: true,
          category: true,

          uploadedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              logoUrl: true,
            },
          },

          approvedBy: {
            select: {
              id: true,
              name: true,
            },
          },

          _count: {
            select: {
              downloads: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Poster rejected successfully.",
      poster,
    });
  } catch (error) {
    console.error(
      "POSTER PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update poster.",
      },
      {
        status: 500,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const id =
      searchParams.get("id")?.trim() || "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Poster ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const existingPoster =
      await prisma.media.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          source: true,
          approvalStatus: true,
          creditedAt: true,
        },
      });

    if (!existingPoster) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Poster not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      existingPoster.source === "AGENT" &&
      existingPoster.creditedAt
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Credited Agent posters cannot be deleted because they are part of the contributor transaction history. Disable/edit them instead.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.media.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Poster deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE POSTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to delete poster.",
      },
      {
        status: 500,
      }
    );
  }
}
