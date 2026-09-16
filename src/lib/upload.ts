import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/* -------------------------------------------------------------------------- */
/* UPLOAD TYPES                                                               */
/* -------------------------------------------------------------------------- */

export type UploadFolder =
  | "agent-logos"
  | "customers"
  | "generated"
  | "other"
  | "policies"
  | "posters"
  | "profiles"
  | "sub-agents";

/* -------------------------------------------------------------------------- */
/* SETTINGS                                                                   */
/* -------------------------------------------------------------------------- */

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

const MAX_PDF_PAGES =
  500;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

/* -------------------------------------------------------------------------- */
/* IMAGE SETTINGS                                                             */
/* -------------------------------------------------------------------------- */

type ImageOptimizationSettings = {
  width: number;
  height: number;
  quality: number;
};

const IMAGE_SETTINGS: Record<
  UploadFolder,
  ImageOptimizationSettings
> = {
  "agent-logos": {
    width: 1400,
    height: 1400,
    quality: 82,
  },

  customers: {
    width: 2200,
    height: 2800,
    quality: 80,
  },

  generated: {
    width: 2600,
    height: 3400,
    quality: 84,
  },

  other: {
    width: 2200,
    height: 2800,
    quality: 80,
  },

  policies: {
    width: 2200,
    height: 3000,
    quality: 78,
  },

  posters: {
    width: 2600,
    height: 3400,
    quality: 86,
  },

  profiles: {
    width: 1600,
    height: 1600,
    quality: 82,
  },

  "sub-agents": {
    width: 1800,
    height: 2200,
    quality: 80,
  },
};

/* -------------------------------------------------------------------------- */
/* ENV HELPERS                                                                */
/* -------------------------------------------------------------------------- */

function getRequiredEnv(
  key: string
): string {
  const value =
    process.env[
      key
    ]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }

  return value;
}

/* -------------------------------------------------------------------------- */
/* BASE FOLDER                                                                */
/* -------------------------------------------------------------------------- */

function getR2BaseFolder(): string {
  const baseFolder =
    process.env
      .R2_BASE_FOLDER
      ?.trim();

  if (!baseFolder) {
    return "";
  }

  return baseFolder
    .replace(
      /^\/+/,
      ""
    )
    .replace(
      /\/+$/,
      ""
    );
}

/* -------------------------------------------------------------------------- */
/* BUILD OBJECT KEY                                                           */
/* -------------------------------------------------------------------------- */

function buildObjectKey(
  folder:
    UploadFolder,
  fileName: string
): string {
  const baseFolder =
    getR2BaseFolder();

  if (baseFolder) {
    return `${baseFolder}/${folder}/${fileName}`;
  }

  return `${folder}/${fileName}`;
}

/* -------------------------------------------------------------------------- */
/* R2 CLIENT                                                                  */
/* -------------------------------------------------------------------------- */

function getR2Client(): S3Client {
  const accessKeyId =
    getRequiredEnv(
      "R2_ACCESS_KEY_ID"
    );

  const secretAccessKey =
    getRequiredEnv(
      "R2_SECRET_ACCESS_KEY"
    );

  const endpoint =
    getRequiredEnv(
      "R2_ENDPOINT"
    );

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* R2 BUCKET                                                                  */
/* -------------------------------------------------------------------------- */

function getR2Bucket(): string {
  return getRequiredEnv(
    "R2_BUCKET_NAME"
  );
}

/* -------------------------------------------------------------------------- */
/* PUBLIC URL                                                                 */
/* -------------------------------------------------------------------------- */

function getR2PublicUrl(): string {
  return getRequiredEnv(
    "R2_PUBLIC_URL"
  ).replace(
    /\/+$/,
    ""
  );
}

/* -------------------------------------------------------------------------- */
/* LEGACY HOSTINGER UPLOAD ROOT                                               */
/* -------------------------------------------------------------------------- */

export function getUploadRoot(): string {
  const customUploadRoot =
    process.env
      .UPLOAD_ROOT
      ?.trim();

  if (
    customUploadRoot
  ) {
    return path.resolve(
      customUploadRoot
    );
  }

  return path.join(
    process.cwd(),
    "public",
    "uploads"
  );
}

/* -------------------------------------------------------------------------- */
/* CLEAN FILE NAME                                                            */
/* -------------------------------------------------------------------------- */

function sanitizeFileName(
  fileName: string
): string {
  const extension =
    path
      .extname(
        fileName
      )
      .toLowerCase();

  const baseName =
    path
      .basename(
        fileName,
        extension
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9-_]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      );

  return `${baseName || "file"}${extension}`;
}

/* -------------------------------------------------------------------------- */
/* CREATE UNIQUE FILE NAME                                                    */
/* -------------------------------------------------------------------------- */

function createUniqueFileName(
  originalFileName:
    string
): string {
  const cleanName =
    sanitizeFileName(
      originalFileName
    );

  const extension =
    path.extname(
      cleanName
    );

  const baseName =
    path.basename(
      cleanName,
      extension
    );

  const timestamp =
    Date.now();

  const random =
    crypto
      .randomBytes(
        4
      )
      .toString(
        "hex"
      );

  return `${baseName}-${timestamp}-${random}${extension}`;
}

/* -------------------------------------------------------------------------- */
/* CREATE WEBP FILE NAME                                                      */
/* -------------------------------------------------------------------------- */

function createWebpFileName(
  originalFileName:
    string
): string {
  const cleanName =
    sanitizeFileName(
      originalFileName
    );

  const extension =
    path.extname(
      cleanName
    );

  const baseName =
    path.basename(
      cleanName,
      extension
    ) ||
    "image";

  const timestamp =
    Date.now();

  const random =
    crypto
      .randomBytes(
        4
      )
      .toString(
        "hex"
      );

  return `${baseName}-${timestamp}-${random}.webp`;
}

/* -------------------------------------------------------------------------- */
/* CREATE POLICY PDF NAME                                                     */
/* -------------------------------------------------------------------------- */

function createPolicyPdfFileName(
  originalFileName:
    string
): string {
  const cleanName =
    sanitizeFileName(
      originalFileName
    );

  const originalExtension =
    path.extname(
      cleanName
    );

  const baseName =
    path.basename(
      cleanName,
      originalExtension
    ) ||
    "policy";

  const timestamp =
    Date.now();

  const random =
    crypto
      .randomBytes(
        4
      )
      .toString(
        "hex"
      );

  return `${baseName}-${timestamp}-${random}.pdf`;
}

/* -------------------------------------------------------------------------- */
/* VALIDATE IMAGE                                                             */
/* -------------------------------------------------------------------------- */

function validateImage(
  file: File
): void {
  if (!file) {
    throw new Error(
      "No file received."
    );
  }

  if (
    file.size <=
    0
  ) {
    throw new Error(
      "The uploaded file is empty."
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "File size must be 10 MB or less."
    );
  }

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type
    )
  ) {
    throw new Error(
      "Invalid file type. Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
    );
  }
}

/* -------------------------------------------------------------------------- */
/* BUILD PUBLIC URL                                                           */
/* -------------------------------------------------------------------------- */

function buildPublicUrl(
  objectKey: string
): string {
  const publicRoot =
    getR2PublicUrl();

  const cleanKey =
    objectKey.replace(
      /^\/+/,
      ""
    );

  return `${publicRoot}/${cleanKey}`;
}

/* -------------------------------------------------------------------------- */
/* UPLOAD BUFFER TO R2                                                        */
/* -------------------------------------------------------------------------- */

async function uploadBufferToR2(
  buffer: Buffer,
  objectKey: string,
  contentType: string
): Promise<void> {
  const client =
    getR2Client();

  const bucket =
    getR2Bucket();

  await client.send(
    new PutObjectCommand({
      Bucket:
        bucket,

      Key:
        objectKey,

      Body:
        buffer,

      ContentType:
        contentType,

      CacheControl:
        "public, max-age=31536000, immutable",
    })
  );
}

/* -------------------------------------------------------------------------- */
/* SAVE ORIGINAL IMAGE                                                        */
/* -------------------------------------------------------------------------- */

async function saveOriginalImage(
  buffer: Buffer,
  originalFileName:
    string,
  folder:
    UploadFolder,
  contentType: string
) {
  const fileName =
    createUniqueFileName(
      originalFileName
    );

  const relativePath =
    buildObjectKey(
      folder,
      fileName
    );

  await uploadBufferToR2(
    buffer,
    relativePath,
    contentType
  );

  const publicUrl =
    buildPublicUrl(
      relativePath
    );

  return {
    fileName,
    relativePath,
    publicUrl,
    absolutePath:
      relativePath,
  };
}

/* -------------------------------------------------------------------------- */
/* SAVE WEBP                                                                  */
/* -------------------------------------------------------------------------- */

async function saveWebpImage(
  buffer: Buffer,
  originalFileName:
    string,
  folder:
    UploadFolder
) {
  const fileName =
    createWebpFileName(
      originalFileName
    );

  const relativePath =
    buildObjectKey(
      folder,
      fileName
    );

  await uploadBufferToR2(
    buffer,
    relativePath,
    "image/webp"
  );

  const publicUrl =
    buildPublicUrl(
      relativePath
    );

  return {
    fileName,
    relativePath,
    publicUrl,
    absolutePath:
      relativePath,
  };
}

/* -------------------------------------------------------------------------- */
/* OPTIMIZE IMAGE                                                             */
/* -------------------------------------------------------------------------- */

async function optimizeImage(
  buffer: Buffer,
  settings:
    ImageOptimizationSettings
): Promise<Buffer> {
  return sharp(
    buffer,
    {
      failOn:
        "none",
    }
  )
    .rotate()
    .resize({
      width:
        settings.width,

      height:
        settings.height,

      fit:
        "inside",

      withoutEnlargement:
        true,
    })
    .webp({
      quality:
        settings.quality,

      effort:
        5,

      smartSubsample:
        true,
    })
    .toBuffer();
}

/* -------------------------------------------------------------------------- */
/* SAVE UPLOADED IMAGE                                                        */
/* -------------------------------------------------------------------------- */

export async function saveUploadedImage(
  file: File,
  folder:
    UploadFolder
): Promise<{
  fileName: string;
  relativePath: string;
  publicUrl: string;
  absolutePath: string;
}> {
  validateImage(
    file
  );

  const arrayBuffer =
    await file.arrayBuffer();

  const originalBuffer =
    Buffer.from(
      arrayBuffer
    );

  /*
   * Animated GIFs are stored as-is.
   * Re-encoding them as a normal image would remove animation.
   */

  if (
    file.type ===
    "image/gif"
  ) {
    return saveOriginalImage(
      originalBuffer,
      file.name,
      folder,
      file.type
    );
  }

  const settings =
    IMAGE_SETTINGS[
      folder
    ];

  try {
    const optimizedBuffer =
      await optimizeImage(
        originalBuffer,
        settings
      );

    /*
     * Never store a larger optimized file.
     */

    if (
      optimizedBuffer.length >=
      originalBuffer.length
    ) {
      return saveOriginalImage(
        originalBuffer,
        file.name,
        folder,
        file.type ||
          "application/octet-stream"
      );
    }

    return saveWebpImage(
      optimizedBuffer,
      file.name,
      folder
    );
  } catch (
    error
  ) {
    console.error(
      "Image compression failed. Uploading original instead:",
      error
    );

    return saveOriginalImage(
      originalBuffer,
      file.name,
      folder,
      file.type ||
        "application/octet-stream"
    );
  }
}

/* -------------------------------------------------------------------------- */
/* OPTIMIZE PDF                                                               */
/* -------------------------------------------------------------------------- */

async function optimizePdf(
  inputBuffer:
    Buffer
): Promise<Buffer> {
  try {
    const pdf =
      await PDFDocument.load(
        inputBuffer,
        {
          ignoreEncryption:
            true,

          updateMetadata:
            false,
        }
      );

    if (
      pdf.getPageCount() >
      MAX_PDF_PAGES
    ) {
      return inputBuffer;
    }

    /*
     * pdf-lib can reduce structural overhead and remove unused objects when
     * rewriting the file. It does not aggressively recompress every embedded
     * scanned image, so scanned PDFs may only shrink slightly.
     */

    const optimizedBytes =
      await pdf.save({
        useObjectStreams:
          true,

        addDefaultPage:
          false,

        objectsPerTick:
          100,
      });

    const optimizedBuffer =
      Buffer.from(
        optimizedBytes
      );

    if (
      optimizedBuffer.length >=
      inputBuffer.length
    ) {
      return inputBuffer;
    }

    return optimizedBuffer;
  } catch (
    error
  ) {
    console.error(
      "PDF optimization failed. Uploading original instead:",
      error
    );

    return inputBuffer;
  }
}

/* -------------------------------------------------------------------------- */
/* SAVE POLICY PDF                                                            */
/* -------------------------------------------------------------------------- */

export async function saveUploadedPolicyPdf(
  file: File
): Promise<{
  fileName: string;
  relativePath: string;
  publicUrl: string;
  absolutePath: string;
}> {
  if (!file) {
    throw new Error(
      "No file received."
    );
  }

  if (
    file.size <=
    0
  ) {
    throw new Error(
      "The uploaded PDF is empty."
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      "PDF size must be 10 MB or less."
    );
  }

  const isPdf =
    file.type ===
      "application/pdf" ||
    file.name
      .toLowerCase()
      .endsWith(
        ".pdf"
      );

  if (!isPdf) {
    throw new Error(
      "Only PDF files are allowed."
    );
  }

  const bytes =
    await file.arrayBuffer();

  const originalBuffer =
    Buffer.from(
      bytes
    );

  if (
    originalBuffer.length <
      5 ||
    originalBuffer
      .subarray(
        0,
        5
      )
      .toString(
        "ascii"
      ) !==
      "%PDF-"
  ) {
    throw new Error(
      "The uploaded file is not a valid PDF."
    );
  }

  const optimizedBuffer =
    await optimizePdf(
      originalBuffer
    );

  const fileName =
    createPolicyPdfFileName(
      file.name
    );

  const relativePath =
    buildObjectKey(
      "policies",
      fileName
    );

  await uploadBufferToR2(
    optimizedBuffer,
    relativePath,
    "application/pdf"
  );

  const publicUrl =
    buildPublicUrl(
      relativePath
    );

  return {
    fileName,
    relativePath,
    publicUrl,
    absolutePath:
      relativePath,
  };
}

/* -------------------------------------------------------------------------- */
/* EXTRACT R2 OBJECT KEY                                                      */
/* -------------------------------------------------------------------------- */

function getR2ObjectKey(
  fileUrl: string
): string | null {
  try {
    const publicRoot =
      getR2PublicUrl();

    if (
      !fileUrl.startsWith(
        `${publicRoot}/`
      )
    ) {
      return null;
    }

    const objectKey =
      fileUrl
        .slice(
          publicRoot.length +
            1
        )
        .replace(
          /^\/+/,
          ""
        );

    if (
      !objectKey ||
      objectKey.includes(
        ".."
      )
    ) {
      return null;
    }

    return objectKey;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE R2 OBJECT                                                           */
/* -------------------------------------------------------------------------- */

async function deleteR2Object(
  objectKey: string
): Promise<boolean> {
  try {
    const client =
      getR2Client();

    const bucket =
      getR2Bucket();

    await client.send(
      new DeleteObjectCommand({
        Bucket:
          bucket,

        Key:
          objectKey,
      })
    );

    return true;
  } catch (
    error
  ) {
    console.error(
      "Error deleting R2 object:",
      error
    );

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE LEGACY HOSTINGER FILE                                               */
/* -------------------------------------------------------------------------- */

async function deleteLegacyUploadedFile(
  fileUrl: string
): Promise<boolean> {
  if (
    !fileUrl.startsWith(
      "/uploads/"
    )
  ) {
    return false;
  }

  try {
    const uploadRoot =
      getUploadRoot();

    const relativePath =
      fileUrl
        .replace(
          /^\/uploads\//,
          ""
        )
        .replace(
          /\\/g,
          "/"
        );

    if (
      relativePath.includes(
        ".."
      ) ||
      relativePath.startsWith(
        "/"
      ) ||
      relativePath.startsWith(
        "\\"
      )
    ) {
      return false;
    }

    const absolutePath =
      path.resolve(
        uploadRoot,
        relativePath
      );

    const resolvedUploadRoot =
      path.resolve(
        uploadRoot
      );

    if (
      absolutePath !==
        resolvedUploadRoot &&
      !absolutePath.startsWith(
        `${resolvedUploadRoot}${path.sep}`
      )
    ) {
      return false;
    }

    await fs.unlink(
      absolutePath
    );

    return true;
  } catch (
    error: unknown
  ) {
    const nodeError =
      error as
        NodeJS.ErrnoException;

    if (
      nodeError?.code ===
      "ENOENT"
    ) {
      return false;
    }

    console.error(
      "Error deleting legacy uploaded file:",
      error
    );

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE UPLOADED FILE                                                       */
/* -------------------------------------------------------------------------- */

export async function deleteUploadedImage(
  fileUrl?:
    | string
    | null
): Promise<boolean> {
  if (!fileUrl) {
    return false;
  }

  const r2ObjectKey =
    getR2ObjectKey(
      fileUrl
    );

  if (
    r2ObjectKey
  ) {
    return deleteR2Object(
      r2ObjectKey
    );
  }

  if (
    fileUrl.startsWith(
      "/uploads/"
    )
  ) {
    return deleteLegacyUploadedFile(
      fileUrl
    );
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* CHECK WHETHER URL IS OUR UPLOAD                                            */
/* -------------------------------------------------------------------------- */

export function isUploadedFileUrl(
  fileUrl?:
    | string
    | null
): boolean {
  if (!fileUrl) {
    return false;
  }

  if (
    fileUrl.startsWith(
      "/uploads/"
    )
  ) {
    return true;
  }

  return Boolean(
    getR2ObjectKey(
      fileUrl
    )
  );
}
