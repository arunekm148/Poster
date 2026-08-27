import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import {
  getUploadRoot,
  saveUploadedImage,
  type UploadFolder,
} from "@/lib/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/* -------------------------------------------------------------------------- */
/* SAVE PDF                                                                   */
/* -------------------------------------------------------------------------- */

async function savePolicyPdf(file: File) {
  if (file.size <= 0) {
    throw new Error("Selected file is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be below 10 MB.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed for policy documents.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error("The selected file is not a valid PDF document.");
  }

  const uploadDirectory = path.join(
    getUploadRoot(),
    "policies"
  );

  await fs.mkdir(uploadDirectory, {
    recursive: true,
  });

  const fileName = `${Date.now()}-${crypto.randomUUID()}.pdf`;

  const filePath = path.join(
    uploadDirectory,
    fileName
  );

  await fs.writeFile(filePath, buffer);

  const fileUrl = `/uploads/policies/${fileName}`;

  return {
    fileName,
    fileUrl,
  };
}

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
    /* POLICY PDF                                                             */
    /* ---------------------------------------------------------------------- */

    if (
      uploadType === "policy" ||
      uploadType === "policies"
    ) {
      try {
        const uploaded = await savePolicyPdf(file);

        return NextResponse.json(
          {
            success: true,
            message: "Policy PDF uploaded successfully.",
            fileName: uploaded.fileName,
            fileUrl: uploaded.fileUrl,
            url: uploaded.fileUrl,
          },
          {
            status: 201,
          }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to upload policy PDF.";

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
    /* IMAGE                                                                  */
    /* ---------------------------------------------------------------------- */

    const folder = getImageFolder(uploadType);

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
      const uploaded = await saveUploadedImage(
        file,
        folder
      );

      return NextResponse.json(
        {
          success: true,
          message: "File uploaded successfully.",
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
    console.error("FILE UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to upload file.",
      },
      {
        status: 500,
      }
    );
  }
}