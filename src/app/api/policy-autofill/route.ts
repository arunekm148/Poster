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

type AllowedDocumentType =
  (typeof ALLOWED_DOCUMENT_TYPES)[number];

function getReaderConfig() {
  const configuredUrl =
    process.env.DOCUMENT_READER_URL?.trim();

  const token =
    process.env.DOCUMENT_READER_TOKEN?.trim();

  const isProduction =
    process.env.NODE_ENV === "production";

  const url =
    configuredUrl ||
    (isProduction
      ? ""
      : "http://127.0.0.1:8001/extract");

  return {
    url,
    token,
    isProduction,
  };
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();

    const file = incoming.get("file");

    const requestedType = String(
      incoming.get("documentType") || "AUTO"
    ).toUpperCase();

    /* ---------------------------------------------------------------------- */
    /* VALIDATE FILE                                                          */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* DOCUMENT TYPE                                                          */
    /* ---------------------------------------------------------------------- */

    const documentType: AllowedDocumentType =
      ALLOWED_DOCUMENT_TYPES.includes(
        requestedType as AllowedDocumentType
      )
        ? (requestedType as AllowedDocumentType)
        : "AUTO";

    /* ---------------------------------------------------------------------- */
    /* READER CONFIG                                                          */
    /* ---------------------------------------------------------------------- */

    const reader = getReaderConfig();

    if (!reader.url) {
      console.error(
        "POLICY AUTOFILL: DOCUMENT_READER_URL is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Document reader URL is not configured on the server.",
        },
        { status: 503 }
      );
    }

    if (reader.isProduction && !reader.token) {
      console.error(
        "POLICY AUTOFILL: DOCUMENT_READER_TOKEN is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Document reader authentication is not configured on the server.",
        },
        { status: 503 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* CREATE OCR REQUEST                                                     */
    /* ---------------------------------------------------------------------- */

    const body = new FormData();

    body.append(
      "file",
      file,
      file.name || "document"
    );

    body.append(
      "documentType",
      documentType
    );

    const headers: Record<string, string> = {};

    if (reader.token) {
      headers["X-AgentsIndia-Token"] =
        reader.token;
    }

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      120_000
    );

    let response: Response;

    try {
      response = await fetch(reader.url, {
        method: "POST",
        headers,
        body,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      const isAbort =
        error instanceof Error &&
        error.name === "AbortError";

      console.error(
        "POLICY AUTOFILL READER CONNECTION ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message: isAbort
            ? "Document reading took too long. Please try again."
            : "Unable to connect to the document reader. Please try again shortly.",
        },
        { status: 503 }
      );
    } finally {
      clearTimeout(timeout);
    }

    /* ---------------------------------------------------------------------- */
    /* PARSE OCR RESPONSE                                                     */
    /* ---------------------------------------------------------------------- */

    const payload = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      const detail =
        payload?.detail ||
        payload?.message ||
        `Document reader returned HTTP ${response.status}.`;

      console.error(
        "POLICY AUTOFILL READER ERROR:",
        response.status,
        detail
      );

      return NextResponse.json(
        {
          success: false,
          message: String(detail),
        },
        {
          status:
            response.status >= 400 &&
            response.status <= 599
              ? response.status
              : 500,
        }
      );
    }

    if (!payload?.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            payload?.detail ||
            payload?.message ||
            "Unable to read this document.",
        },
        { status: 422 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json({
      success: true,
      data:
        payload.data ||
        payload.result ||
        {},
    });
  } catch (error) {
    console.error(
      "POLICY AUTOFILL ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to read this document.",
      },
      { status: 500 }
    );
  }
}