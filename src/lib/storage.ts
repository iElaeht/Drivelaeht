import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function getStorageRoot(): string {
  const configuredRoot = process.env.STORAGE_ROOT?.trim() || "./storage";
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), configuredRoot);
}

export function sanitizeEmailFolder(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

export function sanitizeFileName(filename: string): string {
  const baseName = path.basename(filename);
  const cleaned = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "file";
}

export function getUserStorageDir(email: string): string {
  const storageRoot = getStorageRoot();
  const safeFolder = sanitizeEmailFolder(email);
  const resolvedUserDir = path.resolve(
    /*turbopackIgnore: true*/ storageRoot,
    safeFolder
  );

  if (
    !resolvedUserDir.startsWith(storageRoot + path.sep) &&
    resolvedUserDir !== storageRoot
  ) {
    throw new Error("Invalid user storage path");
  }

  return resolvedUserDir;
}

export function ensureUserStorageDir(email: string): string {
  const userDir = getUserStorageDir(email);
  fs.mkdirSync(userDir, { recursive: true });
  return userDir;
}

export function resolveUserFolderPhysicalPath(
  email: string,
  folderSegments: string[]
): string {
  const userDir = ensureUserStorageDir(email);
  const safeSegments = folderSegments.map((segment) =>
    sanitizeFileName(segment)
  );
  const targetDir = path.resolve(
    /*turbopackIgnore: true*/ userDir,
    ...safeSegments
  );

  if (!targetDir.startsWith(userDir + path.sep) && targetDir !== userDir) {
    throw new Error("Invalid user folder path");
  }

  return targetDir;
}

export function ensurePhysicalUserFolder(
  email: string,
  folderSegments: string[]
): string {
  const targetDir = resolveUserFolderPhysicalPath(email, folderSegments);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

export function movePhysicalUserFolder(
  email: string,
  oldSegments: string[],
  newSegments: string[]
): void {
  const oldDir = resolveUserFolderPhysicalPath(email, oldSegments);
  const newDir = resolveUserFolderPhysicalPath(email, newSegments);

  if (oldDir === newDir || !fs.existsSync(oldDir)) {
    return;
  }

  fs.mkdirSync(path.dirname(newDir), { recursive: true });
  fs.renameSync(oldDir, newDir);
}

export function removePhysicalUserFolder(
  email: string,
  folderSegments: string[]
): void {
  const targetDir = resolveUserFolderPhysicalPath(email, folderSegments);
  const userDir = getUserStorageDir(email);

  if (targetDir === userDir) {
    throw new Error("Cannot delete root user directory");
  }

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
}

export function ensureUserThumbnailsDir(email: string): string {
  const userDir = ensureUserStorageDir(email);
  const thumbnailsDir = path.resolve(
    /*turbopackIgnore: true*/ userDir,
    ".thumbnails"
  );
  fs.mkdirSync(thumbnailsDir, { recursive: true });
  return thumbnailsDir;
}

export function buildStoredFileName(originalName: string): string {
  const safeName = sanitizeFileName(originalName);
  const id = crypto.randomUUID();
  return `${id}-${safeName}`;
}

export function toRelativeStoragePath(
  email: string,
  absoluteTargetPath: string
): string {
  const storageRoot = getStorageRoot();
  const userDir = getUserStorageDir(email);
  const resolvedTarget = path.resolve(
    /*turbopackIgnore: true*/ absoluteTargetPath
  );

  if (
    !resolvedTarget.startsWith(userDir + path.sep) &&
    resolvedTarget !== userDir
  ) {
    throw new Error("Target path escapes user storage directory");
  }

  const relativePath = path.relative(storageRoot, resolvedTarget);
  return relativePath.split(path.sep).join("/");
}

export function resolveStorageRelativePath(
  relativeStoragePath: string
): string {
  const storageRoot = getStorageRoot();
  const normalizedInput = relativeStoragePath.replace(/\\/g, "/");
  const resolvedPath = path.resolve(
    /*turbopackIgnore: true*/ storageRoot,
    normalizedInput
  );

  if (
    !resolvedPath.startsWith(storageRoot + path.sep) &&
    resolvedPath !== storageRoot
  ) {
    throw new Error("Invalid storage relative path");
  }

  return resolvedPath;
}

export function deletePhysicalFileIfExists(
  relativeStoragePath: string | null | undefined
): void {
  if (!relativeStoragePath) {
    return;
  }

  const fullPath = resolveStorageRelativePath(relativeStoragePath);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true });
  }
}

export function deleteUserStorageDir(email: string): void {
  const userDir = getUserStorageDir(email);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
}