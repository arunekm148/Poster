import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  createClient,
} from "@supabase/supabase-js";

import prisma from "@/lib/prisma";

/* -------------------------------------------------------------------------- */
/* SUPABASE                                                                   */
/* -------------------------------------------------------------------------- */

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL is missing."
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY is missing."
  );
}

const supabase =
  createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    }
  );

const BUCKET_NAME =
  "agent-logos";

/* -------------------------------------------------------------------------- */
/* GET OLD SUPABASE STORAGE PATH                                              */
/* -------------------------------------------------------------------------- */

function getStoragePathFromUrl(
  url:
    | string
    | null
    | undefined
) {
  if (!url) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${BUCKET_NAME}/`;

  const markerIndex =
    url.indexOf(
      marker
    );

  if (
    markerIndex === -1
  ) {
    return null;
  }

  const path =
    url.slice(
      markerIndex +
        marker.length
    );

  if (!path) {
    return null;
  }

  try {
    return decodeURIComponent(
      path
    );
  } catch {
    return path;
  }
}

/* -------------------------------------------------------------------------- */
/* UPDATE OWN PROFILE PHOTO                                                   */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request:
    NextRequest
) {
  let newStoragePath:
    | string
    | null = null;

  try {
    /* ---------------------------------------------------------------------- */
    /* FORM DATA                                                              */
    /* ---------------------------------------------------------------------- */

    const formData =
      await request.formData();

    const userId =
      String(
        formData.get(
          "userId"
        ) || ""
      ).trim();

    const logo =
      formData.get(
        "logo"
      );

    /* ---------------------------------------------------------------------- */
    /* USER ID                                                                */
    /* ---------------------------------------------------------------------- */

    if (!userId) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "User information is required.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FILE                                                                   */
    /* ---------------------------------------------------------------------- */

    if (
      !(logo instanceof File) ||
      logo.size <= 0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Please select a profile photo.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* TYPE                                                                   */
    /* ---------------------------------------------------------------------- */

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        logo.type
      )
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Photo must be JPG, PNG or WEBP.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* SIZE                                                                   */
    /* ---------------------------------------------------------------------- */

    const maxSize =
      5 *
      1024 *
      1024;

    if (
      logo.size >
      maxSize
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Photo size must be below 5 MB.",
        },
        {
          status:
            400,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FIND USER                                                              */
    /* ---------------------------------------------------------------------- */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id:
            userId,
        },

        select: {
          id:
            true,

          isActive:
            true,

          logoUrl:
            true,
        },
      });

    if (!existingUser) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "User account was not found.",
        },
        {
          status:
            404,
        }
      );
    }

    if (
      !existingUser.isActive
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "This account is inactive.",
        },
        {
          status:
            403,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* FILE NAME                                                              */
    /* ---------------------------------------------------------------------- */

    let extension =
      "webp";

    if (
      logo.type ===
      "image/jpeg"
    ) {
      extension =
        "jpg";
    }

    if (
      logo.type ===
      "image/png"
    ) {
      extension =
        "png";
    }

    const fileName =
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    newStoragePath =
      `agents/${existingUser.id}/${fileName}`;

    /* ---------------------------------------------------------------------- */
    /* BUFFER                                                                 */
    /* ---------------------------------------------------------------------- */

    const bytes =
      await logo.arrayBuffer();

    const buffer =
      Buffer.from(
        bytes
      );

    /* ---------------------------------------------------------------------- */
    /* UPLOAD                                                                 */
    /* ---------------------------------------------------------------------- */

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          BUCKET_NAME
        )
        .upload(
          newStoragePath,
          buffer,
          {
            contentType:
              logo.type,

            cacheControl:
              "3600",

            upsert:
              false,
          }
        );

    if (uploadError) {
      console.error(
        "PROFILE PHOTO UPLOAD ERROR:",
        uploadError
      );

      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unable to upload profile photo.",
        },
        {
          status:
            500,
        }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* PUBLIC URL                                                             */
    /* ---------------------------------------------------------------------- */

    const {
      data:
        publicUrlData,
    } =
      supabase.storage
        .from(
          BUCKET_NAME
        )
        .getPublicUrl(
          newStoragePath
        );

    const logoUrl =
      publicUrlData
        .publicUrl;

    if (!logoUrl) {
      throw new Error(
        "Unable to create public image URL."
      );
    }

    /* ---------------------------------------------------------------------- */
    /* UPDATE DATABASE                                                        */
    /* ---------------------------------------------------------------------- */

    await prisma.user.update({
      where: {
        id:
          existingUser.id,
      },

      data: {
        logoUrl,
      },
    });

    /* ---------------------------------------------------------------------- */
    /* REMOVE OLD SUPABASE IMAGE                                              */
    /* ---------------------------------------------------------------------- */

    const oldStoragePath =
      getStoragePathFromUrl(
        existingUser.logoUrl
      );

    if (
      oldStoragePath &&
      oldStoragePath !==
        newStoragePath
    ) {
      const {
        error:
          removeError,
      } =
        await supabase.storage
          .from(
            BUCKET_NAME
          )
          .remove([
            oldStoragePath,
          ]);

      if (removeError) {
        console.warn(
          "OLD PROFILE PHOTO CLEANUP WARNING:",
          removeError
        );
      }
    }

    /* ---------------------------------------------------------------------- */
    /* SUCCESS                                                                */
    /* ---------------------------------------------------------------------- */

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Profile photo updated successfully.",

        logoUrl,
      },
      {
        status:
          200,
      }
    );
  } catch (error) {
    console.error(
      "PROFILE PHOTO UPDATE ERROR:",
      error
    );

    /* ---------------------------------------------------------------------- */
    /* CLEAN NEW FILE IF DATABASE UPDATE FAILED                               */
    /* ---------------------------------------------------------------------- */

    if (
      newStoragePath
    ) {
      try {
        await supabase.storage
          .from(
            BUCKET_NAME
          )
          .remove([
            newStoragePath,
          ]);
      } catch {
        // Ignore cleanup failure
      }
    }

    return NextResponse.json(
      {
        success:
          false,

        message:
          "Unable to update profile photo.",
      },
      {
        status:
          500,
      }
    );
  }
}