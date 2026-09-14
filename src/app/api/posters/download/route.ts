import {
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function safeFileName(value: string) {
  return (
    value
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "poster"
  );
}

function getExtension(
  contentType: string,
  fileUrl: string
) {
  const type = contentType.toLowerCase();

  if (type.includes("png")) {
    return "png";
  }

  if (type.includes("webp")) {
    return "webp";
  }

  if (
    type.includes("jpeg") ||
    type.includes("jpg")
  ) {
    return "jpg";
  }

  const cleanUrl = fileUrl
    .split("?")[0]
    .toLowerCase();

  if (cleanUrl.endsWith(".png")) {
    return "png";
  }

  if (cleanUrl.endsWith(".webp")) {
    return "webp";
  }

  if (cleanUrl.endsWith(".jpeg")) {
    return "jpeg";
  }

  if (cleanUrl.endsWith(".jpg")) {
    return "jpg";
  }

  return "jpg";
}

function normalizeEndpoint(
  endpoint: string,
  bucketName: string
) {
  let value = endpoint.trim();

  while (value.endsWith("/")) {
    value = value.slice(0, -1);
  }

  const bucketSuffix = `/${bucketName}`;

  if (
    value
      .toLowerCase()
      .endsWith(
        bucketSuffix.toLowerCase()
      )
  ) {
    value = value.slice(
      0,
      -bucketSuffix.length
    );
  }

  return value;
}

function isCloudflareR2Url(
  fileUrl: string
) {
  try {
    const url = new URL(fileUrl);

    const host =
      url.hostname.toLowerCase();

    if (
      host.endsWith(".r2.dev")
    ) {
      return true;
    }

    if (
      host.includes(
        ".r2.cloudflarestorage.com"
      )
    ) {
      return true;
    }

    const publicUrl =
      String(
        process.env.R2_PUBLIC_URL ||
          ""
      )
        .trim()
        .replace(/\/+$/, "");

    if (
      publicUrl &&
      fileUrl.startsWith(
        `${publicUrl}/`
      )
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function getR2ObjectKey(
  fileUrl: string
) {
  const publicUrl =
    String(
      process.env.R2_PUBLIC_URL ||
        ""
    )
      .trim()
      .replace(/\/+$/, "");

  if (
    publicUrl &&
    fileUrl.startsWith(
      `${publicUrl}/`
    )
  ) {
    return decodeURIComponent(
      fileUrl
        .slice(
          publicUrl.length + 1
        )
        .split("?")[0]
    );
  }

  const url = new URL(fileUrl);

  return decodeURIComponent(
    url.pathname
      .replace(/^\/+/, "")
  );
}

function byteArrayToArrayBuffer(
  bytes: Uint8Array
) {
  const buffer =
    new ArrayBuffer(
      bytes.byteLength
    );

  new Uint8Array(
    buffer
  ).set(bytes);

  return buffer;
}

/* -------------------------------------------------------------------------- */
/* READ R2 OBJECT                                                             */
/* -------------------------------------------------------------------------- */

async function readR2Object(
  fileUrl: string
) {
  const endpoint =
    String(
      process.env.R2_ENDPOINT ||
        ""
    ).trim();

  const accessKeyId =
    String(
      process.env.R2_ACCESS_KEY_ID ||
        ""
    ).trim();

  const secretAccessKey =
    String(
      process.env.R2_SECRET_ACCESS_KEY ||
        ""
    ).trim();

  const bucketName =
    String(
      process.env.R2_BUCKET_NAME ||
        ""
    ).trim();

  if (
    !endpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName
  ) {
    throw new Error(
      "R2 server configuration is incomplete."
    );
  }

  const cleanEndpoint =
    normalizeEndpoint(
      endpoint,
      bucketName
    );

  const objectKey =
    getR2ObjectKey(
      fileUrl
    );

  if (!objectKey) {
    throw new Error(
      "Unable to determine R2 object key."
    );
  }

  console.log(
    "ADMIN R2 DOWNLOAD:",
    {
      bucket: bucketName,
      key: objectKey,
    }
  );

  const client =
    new S3Client({
      region: "auto",

      endpoint:
        cleanEndpoint,

      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

  const result =
    await client.send(
      new GetObjectCommand({
        Bucket:
          bucketName,

        Key:
          objectKey,
      })
    );

  if (!result.Body) {
    throw new Error(
      "R2 returned an empty object."
    );
  }

  const bytes =
    await result.Body
      .transformToByteArray();

  if (
    !bytes ||
    bytes.byteLength === 0
  ) {
    throw new Error(
      "R2 poster file is empty."
    );
  }

  return {
    bytes:
      new Uint8Array(
        bytes
      ),

    contentType:
      result.ContentType ||
      "application/octet-stream",
  };
}

/* -------------------------------------------------------------------------- */
/* READ OLD / LEGACY FILE                                                     */
/* -------------------------------------------------------------------------- */

async function readLegacyFile(
  fileUrl: string,
  request: NextRequest
) {
  let sourceUrl = "";

  if (
    fileUrl.startsWith(
      "https://"
    ) ||
    fileUrl.startsWith(
      "http://"
    )
  ) {
    sourceUrl = fileUrl;
  } else if (
    fileUrl.startsWith("/")
  ) {
    sourceUrl =
      new URL(
        fileUrl,
        request.nextUrl.origin
      ).toString();
  } else {
    throw new Error(
      "Poster file URL is invalid."
    );
  }

  console.log(
    "LEGACY POSTER DOWNLOAD:",
    sourceUrl
  );

  const response =
    await fetch(
      sourceUrl,
      {
        method: "GET",
        cache: "no-store",

        headers: {
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      }
    );

  if (!response.ok) {
    console.error(
      "LEGACY POSTER SOURCE ERROR:",
      response.status,
      response.statusText,
      sourceUrl
    );

    throw new Error(
      `Unable to retrieve poster image (${response.status}).`
    );
  }

  const data =
    await response.arrayBuffer();

  if (
    data.byteLength === 0
  ) {
    throw new Error(
      "Poster image is empty."
    );
  }

  return {
    bytes:
      new Uint8Array(
        data
      ),

    contentType:
      response.headers.get(
        "content-type"
      ) ||
      "application/octet-stream",
  };
}

/* -------------------------------------------------------------------------- */
/* GET DOWNLOAD                                                               */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    /* ---------------------------------------------------------------------- */
    /* POSTER ID                                                              */
    /* ---------------------------------------------------------------------- */

    const id =
      request.nextUrl
        .searchParams
        .get("id")
        ?.trim() || "";

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

    /* ---------------------------------------------------------------------- */
    /* FIND POSTER                                                            */
    /* ---------------------------------------------------------------------- */

    const poster =
      await prisma.media.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,
          fileUrl: true,
        },
      });

    if (!poster) {
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

    const fileUrl =
      String(
        poster.fileUrl ||
          ""
      ).trim();

    if (!fileUrl) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Poster file URL is missing.",
        },
        {
          status: 404,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* READ FILE                                                              */
    /* ---------------------------------------------------------------------- */

    let bytes:
      Uint8Array;

    let contentType =
      "application/octet-stream";

    if (
      isCloudflareR2Url(
        fileUrl
      )
    ) {
      const result =
        await readR2Object(
          fileUrl
        );

      bytes =
        result.bytes;

      contentType =
        result.contentType;
    } else {
      const result =
        await readLegacyFile(
          fileUrl,
          request
        );

      bytes =
        result.bytes;

      contentType =
        result.contentType;
    }

    /* ---------------------------------------------------------------------- */
    /* DOWNLOAD FILE NAME                                                     */
    /* ---------------------------------------------------------------------- */

    const extension =
      getExtension(
        contentType,
        fileUrl
      );

    const fileName =
      `${safeFileName(
        poster.title
      )}-original.${extension}`;

    /* ---------------------------------------------------------------------- */
    /* CONVERT TO ARRAYBUFFER                                                 */
    /* ---------------------------------------------------------------------- */

    const responseBuffer =
      byteArrayToArrayBuffer(
        bytes
      );

    /* ---------------------------------------------------------------------- */
    /* RETURN FILE                                                            */
    /* ---------------------------------------------------------------------- */

    return new NextResponse(
      responseBuffer,
      {
        status: 200,

        headers: {
          "Content-Type":
            contentType,

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Content-Length":
            String(
              responseBuffer.byteLength
            ),

          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "POSTER DOWNLOAD API ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to download poster.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}