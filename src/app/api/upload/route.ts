import { NextResponse } from "next/server";

import {
  saveUploadedImage,
  saveUploadedPolicyPdf,
  type UploadFolder,
} from "@/lib/upload";

export const runtime = "nodejs";

/* -------------------------------------------------------------------------- */
/* GET IMAGE FOLDER                                                           */
/* -------------------------------------------------------------------------- */

function getImageFolder(type: string): UploadFolder | null {
  switch (type) {
    case "poster":
    case "posters":
      return "posters";

    case "profile":
    case "profiles":
    case "profile-photo":
    case "profile-picture":
      return "profiles";

    case "logo":
    case "agent-logo":
    case "agent-logos":
      return "agent-logos";

    case "customer":
    case "customers":
      return "customers";

    case "sub-agent":
    case "sub-agents":
      return "sub-agents";

    case "generated":
      return "generated";

    case "other":
      return "other";

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* CHECK POLICY IMAGE TYPE                                                    */
/* -------------------------------------------------------------------------- */

function isPolicyImage(file: File): boolean {
  return [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ].includes(file.type);
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    const uploadType = String(
      formData.get("type") || "poster"
    )
      .trim()
      .toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a file.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* POLICY                                                                 */
    /* ---------------------------------------------------------------------- */

    if (
      uploadType === "policy" ||
      uploadType === "policies"
    ) {
      try {
        /* ------------------------------------------------------------------ */
        /* POLICY PDF                                                         */
        /* ------------------------------------------------------------------ */

        if (file.type === "application/pdf") {
          const uploaded =
            await saveUploadedPolicyPdf(file);

          return NextResponse.json(
            {
              success: true,
              message:
                "Policy PDF uploaded successfully.",
              fileName: uploaded.fileName,
              fileUrl: uploaded.publicUrl,
              url: uploaded.publicUrl,
              fileType: "pdf",
            },
            {
              status: 201,
            }
          );
        }

        /* ------------------------------------------------------------------ */
        /* POLICY IMAGE                                                       */
        /* ------------------------------------------------------------------ */

        if (isPolicyImage(file)) {
          const uploaded =
            await saveUploadedImage(
              file,
              "policies"
            );

          return NextResponse.json(
            {
              success: true,
              message:
                "Policy image uploaded and compressed successfully.",
              fileName: uploaded.fileName,
              fileUrl: uploaded.publicUrl,
              url: uploaded.publicUrl,
              fileType: "image",
            },
            {
              status: 201,
            }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message:
              "Policy document must be PDF, JPG, JPEG, PNG or WEBP.",
          },
          {
            status: 400,
          }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to upload policy document.";

        return NextResponse.json(
          {
            success: false,
            message,
          },
          {
            status: 400,
          }
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* NORMAL IMAGE UPLOAD                                                    */
    /* ---------------------------------------------------------------------- */

    const folder =
      getImageFolder(uploadType);

    if (!folder) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid upload type. Use poster, policy, profile, logo, customer, sub-agent, generated or other.",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const uploaded =
        await saveUploadedImage(
          file,
          folder
        );

      return NextResponse.json(
        {
          success: true,
          message:
            folder === "posters"
              ? "Poster uploaded and compressed successfully."
              : folder === "customers"
                ? "Customer image uploaded and compressed successfully."
                : "File uploaded successfully.",
          fileName: uploaded.fileName,
          fileUrl: uploaded.publicUrl,
          url: uploaded.publicUrl,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to upload image.";

      return NextResponse.json(
        {
          success: false,
          message,
        },
        {
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error(
      "FILE UPLOAD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to upload file.",
      },
      {
        status: 500,
      }
    );
  }
}