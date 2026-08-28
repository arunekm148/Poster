import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/*
 * Files up to 2 MB are stored exactly as uploaded.
 * Only larger files are optimized.
 */
const COMPRESSION_THRESHOLD = 2 * 1024 * 1024; // 2 MB

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
/* GET UPLOAD ROOT                                                            */
/* -------------------------------------------------------------------------- */

export function getUploadRoot(): string {
  const customUploadRoot = process.env.UPLOAD_ROOT?.trim();

  if (customUploadRoot) {
    return path.resolve(customUploadRoot);
  }

  return path.join(process.cwd(), "public", "uploads");
}

/* -------------------------------------------------------------------------- */
/* CLEAN FILE NAME                                                            */
/* -------------------------------------------------------------------------- */

function sanitizeFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();

  const baseName = path
    .basename(fileName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${baseName || "file"}${extension}`;
}

/* -------------------------------------------------------------------------- */
/* CREATE UNIQUE FILE NAME                                                    */
/* -------------------------------------------------------------------------- */

function createUniqueFileName(originalFileName: string): string {
  const cleanName = sanitizeFileName(originalFileName);

  const extension = path.extname(cleanName);
  const baseName = path.basename(cleanName, extension);

  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");

  return `${baseName}-${timestamp}-${random}${extension}`;
}

/* -------------------------------------------------------------------------- */
/* CREATE WEBP FILE NAME                                                      */
/* -------------------------------------------------------------------------- */

function createWebpFileName(originalFileName: string): string {
  const cleanName = sanitizeFileName(originalFileName);

  const originalExtension = path.extname(cleanName);

  const baseName =
    path.basename(cleanName, originalExtension) || "image";

  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");

  return `${baseName}-${timestamp}-${random}.webp`;
}

/* -------------------------------------------------------------------------- */
/* VALIDATE FILE                                                              */
/* -------------------------------------------------------------------------- */

function validateFile(file: File): void {
  if (!file) {
    throw new Error("No file received.");
  }

  if (file.size <= 0) {
    throw new Error("The uploaded file is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be 10 MB or less.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "Invalid file type. Only JPG, JPEG, PNG, WEBP and GIF images are allowed."
    );
  }
}

/* -------------------------------------------------------------------------- */
/* ENSURE FOLDER EXISTS                                                       */
/* -------------------------------------------------------------------------- */

async function ensureUploadFolder(
  folder: UploadFolder
): Promise<string> {
  const uploadRoot = getUploadRoot();

  const destinationFolder = path.join(
    uploadRoot,
    folder
  );

  await fs.mkdir(destinationFolder, {
    recursive: true,
  });

  return destinationFolder;
}

/* -------------------------------------------------------------------------- */
/* SAVE ORIGINAL FILE                                                         */
/* -------------------------------------------------------------------------- */

async function saveOriginalImage(
  buffer: Buffer,
  originalFileName: string,
  destinationFolder: string,
  folder: UploadFolder
) {
  const fileName =
    createUniqueFileName(originalFileName);

  const absolutePath = path.join(
    destinationFolder,
    fileName
  );

  await fs.writeFile(
    absolutePath,
    buffer
  );

  const relativePath =
    `${folder}/${fileName}`;

  const publicUrl =
    `/uploads/${relativePath}`;

  return {
    fileName,
    relativePath,
    publicUrl,
    absolutePath,
  };
}

/* -------------------------------------------------------------------------- */
/* SAVE WEBP                                                                  */
/* -------------------------------------------------------------------------- */

async function saveWebpImage(
  buffer: Buffer,
  originalFileName: string,
  destinationFolder: string,
  folder: UploadFolder
) {
  const fileName =
    createWebpFileName(originalFileName);

  const absolutePath = path.join(
    destinationFolder,
    fileName
  );

  await fs.writeFile(
    absolutePath,
    buffer
  );

  const relativePath =
    `${folder}/${fileName}`;

  const publicUrl =
    `/uploads/${relativePath}`;

  return {
    fileName,
    relativePath,
    publicUrl,
    absolutePath,
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
      width: options.width,
      height: options.height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 96,
      effort: 4,
      smartSubsample: true,
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
  validateFile(file);

  const destinationFolder =
    await ensureUploadFolder(folder);

  const arrayBuffer = await file.arrayBuffer();

  const originalBuffer =
    Buffer.from(arrayBuffer);

  /* ------------------------------------------------------------------------ */
  /* DO NOT COMPRESS SMALL FILES                                              */
  /* ------------------------------------------------------------------------ */

  if (file.size <= COMPRESSION_THRESHOLD) {
    return saveOriginalImage(
      originalBuffer,
      file.name,
      destinationFolder,
      folder
    );
  }

  /* ------------------------------------------------------------------------ */
  /* DO NOT TOUCH GIF                                                         */
  /* ------------------------------------------------------------------------ */

  if (file.type === "image/gif") {
    return saveOriginalImage(
      originalBuffer,
      file.name,
      destinationFolder,
      folder
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ONLY COMPRESS SELECTED LARGE FILES                                       */
  /* ------------------------------------------------------------------------ */

  try {
    let optimizationSettings:
      | {
          width: number;
          height: number;
        }
      | null = null;

    if (folder === "posters") {
      optimizationSettings = {
        width: POSTER_MAX_WIDTH,
        height: POSTER_MAX_HEIGHT,
      };
    }

    if (folder === "customers") {
      optimizationSettings = {
        width: CUSTOMER_MAX_WIDTH,
        height: CUSTOMER_MAX_HEIGHT,
      };
    }

    if (folder === "policies") {
      optimizationSettings = {
        width: POLICY_MAX_WIDTH,
        height: POLICY_MAX_HEIGHT,
      };
    }

    /*
     * Other image types remain untouched.
     */
    if (!optimizationSettings) {
      return saveOriginalImage(
        originalBuffer,
        file.name,
        destinationFolder,
        folder
      );
    }

    const optimizedBuffer =
      await optimizeLargeImage(
        originalBuffer,
        optimizationSettings
      );

    /*
     * Important:
     *
     * If optimization somehow creates a file that is not
     * smaller than the original, keep the original instead.
     */
    if (
      optimizedBuffer.length >= originalBuffer.length
    ) {
      return saveOriginalImage(
        originalBuffer,
        file.name,
        destinationFolder,
        folder
      );
    }

    return saveWebpImage(
      optimizedBuffer,
      file.name,
      destinationFolder,
      folder
    );
  } catch (error) {
    console.error(
      "Image optimization failed. Saving original instead:",
      error
    );

    /*
     * Fallback:
     * Never reject a valid upload simply because compression failed.
     */
    return saveOriginalImage(
      originalBuffer,
      file.name,
      destinationFolder,
      folder
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
    throw new Error("No file received.");
  }

  if (file.size <= 0) {
    throw new Error("The uploaded PDF is empty.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("PDF size must be 10 MB or less.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

  const bytes = await file.arrayBuffer();

  const buffer = Buffer.from(bytes);

  if (
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error(
      "The uploaded file is not a valid PDF."
    );
  }

  const destinationFolder =
    await ensureUploadFolder("policies");

  const timestamp = Date.now();
  const random =
    crypto.randomBytes(4).toString("hex");

  const fileName =
    `policy-${timestamp}-${random}.pdf`;

  const absolutePath = path.join(
    destinationFolder,
    fileName
  );

  /*
   * PDF is stored exactly as uploaded.
   * No PDF quality reduction is performed here.
   */
  await fs.writeFile(
    absolutePath,
    buffer
  );

  const relativePath =
    `policies/${fileName}`;

  const publicUrl =
    `/uploads/${relativePath}`;

  return {
    fileName,
    relativePath,
    publicUrl,
    absolutePath,
  };
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

  if (!imageUrl.startsWith("/uploads/")) {
    return false;
  }

  try {
    const uploadRoot = getUploadRoot();

    const relativePath = imageUrl
      .replace(/^\/uploads\//, "")
      .replace(/\\/g, "/");

    if (
      relativePath.includes("..") ||
      relativePath.startsWith("/") ||
      relativePath.startsWith("\\")
    ) {
      return false;
    }

    const absolutePath = path.resolve(
      uploadRoot,
      relativePath
    );

    const resolvedUploadRoot =
      path.resolve(uploadRoot);

    if (
      absolutePath !== resolvedUploadRoot &&
      !absolutePath.startsWith(
        `${resolvedUploadRoot}${path.sep}`
      )
    ) {
      return false;
    }

    await fs.unlink(absolutePath);

    return true;
  } catch (error: unknown) {
    const nodeError =
      error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT") {
      return false;
    }

    console.error(
      "Error deleting uploaded file:",
      error
    );

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* CHECK WHETHER URL IS OUR UPLOAD                                            */
/* -------------------------------------------------------------------------- */

export function isUploadedFileUrl(
  imageUrl?: string | null
): boolean {
  return Boolean(
    imageUrl?.startsWith("/uploads/")
  );
}