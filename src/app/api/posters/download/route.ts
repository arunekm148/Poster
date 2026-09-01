import { NextRequest, NextResponse } from "next/server";
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

/* -------------------------------------------------------------------------- */
/* GET DOWNLOAD                                                               */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  try {
    const id =
      request.nextUrl.searchParams
        .get("id")
        ?.trim() || "";

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
          message: "Poster not found.",
        },
        {
          status: 404,
        }
      );
    }

    const fileUrl = String(
      poster.fileUrl || ""
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
    /* PREPARE SOURCE URL                                                     */
    /* ---------------------------------------------------------------------- */

    let sourceUrl = "";

    if (
      fileUrl.startsWith("https://") ||
      fileUrl.startsWith("http://")
    ) {
      /*
       * New Cloudflare R2 poster.
       *
       * Example:
       * https://pub-xxxxx.r2.dev/live/posters/file.jpg
       */
      sourceUrl = fileUrl;
    } else if (
      fileUrl.startsWith("/")
    ) {
      /*
       * Old Hostinger poster.
       *
       * Example:
       * /uploads/posters/file.jpg
       *
       * This converts it to:
       * https://agentsindia.org/uploads/posters/file.jpg
       */
      sourceUrl = new URL(
        fileUrl,
        request.nextUrl.origin
      ).toString();
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            "Poster file URL is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SERVER FETCH                                                           */
    /* ---------------------------------------------------------------------- */

    console.log(
      "POSTER DOWNLOAD SOURCE:",
      sourceUrl
    );

    const upstream = await fetch(
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

    if (!upstream.ok) {
      console.error(
        "POSTER DOWNLOAD SOURCE ERROR:",
        upstream.status,
        upstream.statusText,
        sourceUrl
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to retrieve poster image.",
        },
        {
          status: 502,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* READ FILE                                                              */
    /* ---------------------------------------------------------------------- */

    const contentType =
      upstream.headers.get(
        "content-type"
      ) ||
      "application/octet-stream";

    const bytes =
      await upstream.arrayBuffer();

    if (bytes.byteLength === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Poster image is empty.",
        },
        {
          status: 502,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* DOWNLOAD NAME                                                          */
    /* ---------------------------------------------------------------------- */

    const extension =
      getExtension(
        contentType,
        fileUrl
      );

    const fileName = `${safeFileName(
      poster.title
    )}-original.${extension}`;

    /* ---------------------------------------------------------------------- */
    /* RETURN IMAGE                                                           */
    /* ---------------------------------------------------------------------- */

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition":
          `attachment; filename="${fileName}"`,
        "Content-Length":
          String(bytes.byteLength),
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error(
      "POSTER DOWNLOAD API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to download poster.",
      },
      {
        status: 500,
      }
    );
  }
}