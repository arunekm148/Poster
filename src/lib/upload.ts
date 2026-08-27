import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

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

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

/* -------------------------------------------------------------------------- */
/* GET UPLOAD ROOT                                                            */
/* -------------------------------------------------------------------------- */

export function getUploadRoot(): string {
  /*
   * LOCAL:
   * If UPLOAD_ROOT is not configured, files are stored in:
   * public/uploads
   *
   * LIVE HOSTINGER:
   * Later we can set UPLOAD_ROOT in Hostinger environment variables
   * to a permanent folder.
   */

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

async function ensureUploadFolder(folder: UploadFolder): Promise<string> {
  const uploadRoot = getUploadRoot();

  const destinationFolder = path.join(uploadRoot, folder);

  await fs.mkdir(destinationFolder, {
    recursive: true,
  });

  return destinationFolder;
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

  const destinationFolder = await ensureUploadFolder(folder);

  const uniqueFileName = createUniqueFileName(file.name);

  const absolutePath = path.join(destinationFolder, uniqueFileName);

  const arrayBuffer = await file.arrayBuffer();

  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(absolutePath, buffer);

  const relativePath = `${folder}/${uniqueFileName}`;

  const publicUrl = `/uploads/${relativePath}`;

  return {
    fileName: uniqueFileName,
    relativePath,
    publicUrl,
    absolutePath,
  };
}

/* -------------------------------------------------------------------------- */
/* DELETE UPLOADED IMAGE                                                      */
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

    /*
     * Security:
     * Prevent paths such as ../../secret-file
     */

    if (
      relativePath.includes("..") ||
      relativePath.startsWith("/") ||
      relativePath.startsWith("\\")
    ) {
      return false;
    }

    const absolutePath = path.resolve(uploadRoot, relativePath);

    const resolvedUploadRoot = path.resolve(uploadRoot);

    if (
      absolutePath !== resolvedUploadRoot &&
      !absolutePath.startsWith(`${resolvedUploadRoot}${path.sep}`)
    ) {
      return false;
    }

    await fs.unlink(absolutePath);

    return true;
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT") {
      return false;
    }

    console.error("Error deleting uploaded image:", error);

    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* CHECK WHETHER URL IS OUR UPLOAD                                            */
/* -------------------------------------------------------------------------- */

export function isUploadedFileUrl(
  imageUrl?: string | null
): boolean {
  return Boolean(imageUrl?.startsWith("/uploads/"));
}