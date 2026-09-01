import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* PATCH - UPDATE AGENT PROFILE                                               */
/* -------------------------------------------------------------------------- */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      name,
      email,
      address,
      district,
      state,
      pincode,
    } = body ?? {};

    /* ---------------------------------------------------------------------- */
    /* USER ID                                                                */
    /* ---------------------------------------------------------------------- */

    if (
      !userId ||
      typeof userId !== "string" ||
      !userId.trim()
    ) {
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
    /* NAME                                                                   */
    /* ---------------------------------------------------------------------- */

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Full Name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanName = name.trim();

    if (cleanName.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid full name.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* EMAIL                                                                  */
    /* ---------------------------------------------------------------------- */

    let cleanEmail: string | null = null;

    if (
      typeof email === "string" &&
      email.trim()
    ) {
      cleanEmail = email
        .trim()
        .toLowerCase();

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(cleanEmail)) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter a valid email address.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK USER                                                             */
    /* ---------------------------------------------------------------------- */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId.trim(),
        },

        select: {
          id: true,
          phone: true,
          role: true,
        },
      });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CHECK DUPLICATE EMAIL                                                  */
    /* ---------------------------------------------------------------------- */

    if (cleanEmail) {
      const emailOwner =
        await prisma.user.findUnique({
          where: {
            email: cleanEmail,
          },

          select: {
            id: true,
          },
        });

      if (
        emailOwner &&
        emailOwner.id !== existingUser.id
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This email address is already registered with another account.",
          },
          {
            status: 409,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* OPTIONAL FIELDS                                                        */
    /* ---------------------------------------------------------------------- */

    const cleanAddress =
      typeof address === "string" &&
      address.trim()
        ? address.trim()
        : null;

    const cleanDistrict =
      typeof district === "string" &&
      district.trim()
        ? district.trim()
        : null;

    const cleanState =
      typeof state === "string" &&
      state.trim()
        ? state.trim()
        : null;

    const cleanPincode =
      typeof pincode === "string" &&
      pincode.trim()
        ? pincode.trim()
        : null;

    /* ---------------------------------------------------------------------- */
    /* UPDATE PROFILE                                                         */
    /* ---------------------------------------------------------------------- */
    /*
       IMPORTANT:

       phone is NOT updated.
       role is NOT updated.

       Therefore Mobile Number and Role remain locked.
    */

    const updatedUser =
      await prisma.user.update({
        where: {
          id: existingUser.id,
        },

        data: {
          name: cleanName,
          email: cleanEmail,
          address: cleanAddress,
          district: cleanDistrict,
          state: cleanState,
          pincode: cleanPincode,
        },

        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          accountMode: true,
          logoUrl: true,
          address: true,
          district: true,
          state: true,
          pincode: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully.",
        user: updatedUser,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error(
      "PROFILE UPDATE ERROR:",
      error
    );

    /* ---------------------------------------------------------------------- */
    /* UNIQUE DATABASE ERROR                                                  */
    /* ---------------------------------------------------------------------- */

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The email address is already being used by another account.",
        },
        {
          status: 409,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* GENERAL ERROR                                                          */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to update profile. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}