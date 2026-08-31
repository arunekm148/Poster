import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

/* -------------------------------------------------------------------------- */
/* LARGE IMAGE SETTINGS                                                       */
/* -------------------------------------------------------------------------- */

const POSTER_MAX_WIDTH = 3000;
const POSTER_MAX_HEIGHT = 4000;

const CUSTOMER_MAX_WIDTH = 2600;
const CUSTOMER_MAX_HEIGHT = 3400;

const POLICY_MAX_WIDTH = 2600;
const POLICY_MAX_HEIGHT = 3400;

/* -------------------------------------------------------------------------- */
/* ENV HELPERS                                                                */
/* -------------------------------------------------------------------------- */

function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();

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
    process.env.R2_BASE_FOLDER?.trim();

  if (!baseFolder) {
    return "";
  }

  return baseFolder
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

/* -------------------------------------------------------------------------- */
/* BUILD OBJECT KEY                                                           */
/* -------------------------------------------------------------------------- */

function buildObjectKey(
  folder: UploadFolder,
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
    getRequiredEnv("R2_ACCESS_KEY_ID");

  const secretAccessKey =
    getRequiredEnv("R2_SECRET_ACCESS_KEY");

  const endpoint =
    getRequiredEnv("R2_ENDPOINT");

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
  ).replace(/\/+$/, "");
}

/* -------------------------------------------------------------------------- */
/* LEGACY HOSTINGER UPLOAD ROOT                                               */
/* -------------------------------------------------------------------------- */

export function getUploadRoot(): string {
  const customUploadRoot =
    process.env.UPLOAD_ROOT?.trim();

  if (customUploadRoot) {
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
    path.extname(
      fileName
    ).toLowerCase();

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
  originalFileName: string
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
      .randomBytes(4)
      .toString("hex");

  return `${baseName}-${timestamp}-${random}${extension}`;
}

/* -------------------------------------------------------------------------- */
/* CREATE WEBP FILE NAME                                                      */
/* -------------------------------------------------------------------------- */

function createWebpFileName(
  originalFileName: string
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
    ) || "image";

  const timestamp =
    Date.now();

  const random =
    crypto
      .randomBytes(4)
      .toString("hex");

  return `${baseName}-${timestamp}-${random}.webp`;
}

/* -------------------------------------------------------------------------- */
/* VALIDATE FILE                                                              */
/* -------------------------------------------------------------------------- */

function validateFile(
  file: File
): void {
  if (!file) {
    throw new Error(
      "No file received."
    );
  }

  if (file.size <= 0) {
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
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
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
  originalFileName: string,
  folder: UploadFolder,
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
  originalFileName: string,
  folder: UploadFolder
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
/* OPTIMIZE LARGE IMAGE                                                       */
/* -------------------------------------------------------------------------- */

async function optimizeLargeImage(
  buffer: Buffer,
  options: {
    width: number;
    height: number;
  }
): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width:
        options.width,
      height:
        options.height,
      fit: "inside",
      withoutEnlargement:
        true,
    })
    .webp({
      quality: 96,
      effort: 4,
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
  folder: UploadFolder
): Promise<{
  fileName: string;
  relativePath: string;
  publicUrl: string;
  absolutePath: string;
}> {
  validateFile(
    file
  );

  const arrayBuffer =
    await file.arrayBuffer();

  const originalBuffer =
    Buffer.from(
      arrayBuffer
    );

  if (
    file.size <=
    COMPRESSION_THRESHOLD
  ) {
    return saveOriginalImage(
      originalBuffer,
      file.name,
      folder,
      file.type ||
        "application/octet-stream"
    );
  }

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

  try {
    let optimizationSettings:
      | {
          width: number;
          height: number;
        }
      | null = null;

    if (
      folder ===
      "posters"
    ) {
      optimizationSettings = {
        width:
          POSTER_MAX_WIDTH,
        height:
          POSTER_MAX_HEIGHT,
      };
    }

    if (
      folder ===
      "customers"
    ) {
      optimizationSettings = {
        width:
          CUSTOMER_MAX_WIDTH,
        height:
          CUSTOMER_MAX_HEIGHT,
      };
    }

    if (
      folder ===
      "policies"
    ) {
      optimizationSettings = {
        width:
          POLICY_MAX_WIDTH,
        height:
          POLICY_MAX_HEIGHT,
      };
    }

    if (
      !optimizationSettings
    ) {
      return saveOriginalImage(
        originalBuffer,
        file.name,
        folder,
        file.type ||
          "application/octet-stream"
      );
    }

    const optimizedBuffer =
      await optimizeLargeImage(
        originalBuffer,
        optimizationSettings
      );

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
  } catch (error) {
    console.error(
      "Image optimization failed. Uploading original instead:",
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
    file.size <= 0
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

  if (
    file.type !==
    "application/pdf"
  ) {
    throw new Error(
      "Only PDF files are allowed."
    );
  }

  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(
      bytes
    );

  if (
    buffer.length < 5 ||
    buffer
      .subarray(
        0,
        5
      )
      .toString(
        "ascii"
      ) !== "%PDF-"
  ) {
    throw new Error(
      "The uploaded file is not a valid PDF."
    );
  }

  const timestamp =
    Date.now();

  const random =
    crypto
      .randomBytes(4)
      .toString("hex");

  const fileName =
    `policy-${timestamp}-${random}.pdf`;

  const relativePath =
    buildObjectKey(
      "policies",
      fileName
    );

  await uploadBufferToR2(
    buffer,
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
  imageUrl: string
): string | null {
  try {
    const publicRoot =
      getR2PublicUrl();

    if (
      !imageUrl.startsWith(
        `${publicRoot}/`
      )
    ) {
      return null;
    }

    const objectKey =
      imageUrl
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
        Bucket: bucket,
        Key: objectKey,
      })
    );

    return true;
  } catch (error) {
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
  imageUrl: string
): Promise<boolean> {
  if (
    !imageUrl.startsWith(
      "/uploads/"
    )
  ) {
    return false;
  }

  try {
    const uploadRoot =
      getUploadRoot();

    const relativePath =
      imageUrl
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
      error as NodeJS.ErrnoException;

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
  imageUrl?: string | null
): Promise<boolean> {
  if (!imageUrl) {
    return false;
  }

  const r2ObjectKey =
    getR2ObjectKey(
      imageUrl
    );

  if (
    r2ObjectKey
  ) {
    return deleteR2Object(
      r2ObjectKey
    );
  }

  if (
    imageUrl.startsWith(
      "/uploads/"
    )
  ) {
    return deleteLegacyUploadedFile(
      imageUrl
    );
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* CHECK WHETHER URL IS OUR UPLOAD                                            */
/* -------------------------------------------------------------------------- */

export function isUploadedFileUrl(
  imageUrl?: string | null
): boolean {
  if (!imageUrl) {
    return false;
  }

  if (
    imageUrl.startsWith(
      "/uploads/"
    )
  ) {
    return true;
  }

  return Boolean(
    getR2ObjectKey(
      imageUrl
    )
  );
}