import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = [
  "AUTO",
  "POLICY",
  "OLD_POLICY",
  "RC",
  "AADHAAR",
] as const;

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file");
    const requestedType = String(
      incoming.get("documentType") || "AUTO"
    ).toUpperCase();

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a document to read.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected document is empty.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Document must be 12 MB or smaller.",
        },
        { status: 413 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const allowed =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      lowerName.endsWith(".pdf") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".webp");

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Use PDF, JPG, JPEG, PNG or WEBP documents.",
        },
        { status: 400 }
      );
    }

    const documentType =
      ALLOWED_DOCUMENT_TYPES.includes(
        requestedType as (typeof ALLOWED_DOCUMENT_TYPES)[number]
      )
        ? requestedType
        : "AUTO";

    const readerUrl =
      process.env.DOCUMENT_READER_URL?.trim() ||
      "http://127.0.0.1:8001/extract";

    const body = new FormData();
    body.append("file", file, file.name);
    body.append("documentType", documentType);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      120_000
    );

    let response: Response;

    try {
      response = await fetch(readerUrl, {
        method: "POST",
        body,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      const isAbort =
        error instanceof Error &&
        error.name === "AbortError";

      return NextResponse.json(
        {
          success: false,
          message: isAbort
            ? "Local document reader took too long. Please try again."
            : "Local document reader is not running. Start document-reader/start-reader.bat and try again.",
        },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || !payload?.success) {
      const detail =
        payload?.detail ||
        payload?.message ||
        "Unable to read this document locally.";

      return NextResponse.json(
        {
          success: false,
          message: String(detail),
        },
        {
          status:
            response.status || 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data:
        payload.data ||
        payload.result ||
        {},
    });
  } catch (error) {
    console.error(
      "LOCAL POLICY AUTOFILL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to read this document locally.",
      },
      { status: 500 }
    );
  }
}
