import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    const uploadType = String(
      formData.get("type") || "poster"
    )
      .trim()
      .toLowerCase();

    // Validate file
    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a file.",
        },
        { status: 400 }
      );
    }

    // Empty file check
    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected file is empty.",
        },
        { status: 400 }
      );
    }

    // Maximum 10 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "File size must be below 10 MB.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // POLICY PDF
    // ============================================================

    if (uploadType === "policy") {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only PDF files are allowed for policy documents.",
          },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Check PDF signature: %PDF-
      if (
        buffer.length < 5 ||
        buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected file is not a valid PDF document.",
          },
          { status: 400 }
        );
      }

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.pdf`;

      const uploadDirectory = path.join(
        process.cwd(),
        "public",
        "uploads",
        "policies"
      );

      await mkdir(uploadDirectory, {
        recursive: true,
      });

      const filePath = path.join(
        uploadDirectory,
        fileName
      );

      await writeFile(filePath, buffer);

      const fileUrl =
        `/uploads/policies/${fileName}`;

      return NextResponse.json(
        {
          success: true,
          message: "Policy PDF uploaded successfully.",
          fileUrl,
          url: fileUrl,
        },
        { status: 201 }
      );
    }

    // ============================================================
    // POSTER IMAGE
    // ============================================================

    if (uploadType === "poster") {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Only JPG, PNG and WEBP images are allowed.",
          },
          { status: 400 }
        );
      }

      let extension = ".jpg";

      if (file.type === "image/png") {
        extension = ".png";
      }

      if (file.type === "image/webp") {
        extension = ".webp";
      }

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}${extension}`;

      const uploadDirectory = path.join(
        process.cwd(),
        "public",
        "uploads",
        "posters"
      );

      await mkdir(uploadDirectory, {
        recursive: true,
      });

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filePath = path.join(
        uploadDirectory,
        fileName
      );

      await writeFile(filePath, buffer);

      const fileUrl =
        `/uploads/posters/${fileName}`;

      return NextResponse.json(
        {
          success: true,
          message: "Poster image uploaded successfully.",
          fileUrl,
          url: fileUrl,
        },
        { status: 201 }
      );
    }

    // Invalid upload type
    return NextResponse.json(
      {
        success: false,
        message:
          'Invalid upload type. Use "poster" or "policy".',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("FILE UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to upload file.",
      },
      { status: 500 }
    );
  }
}