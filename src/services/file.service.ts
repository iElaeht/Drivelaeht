import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  buildStoredFileName,
  deletePhysicalFileIfExists,
  ensurePhysicalUserFolder,
  ensureUserStorageDir,
  ensureUserThumbnailsDir,
  resolveStorageRelativePath,
  resolveUserFolderPhysicalPath,
  sanitizeFileName,
  toRelativeStoragePath,
} from "@/lib/storage";
import { logActivity } from "@/services/auth.service";

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

async function getFolderPathSegments(
  userId: string,
  folderId: string | null
): Promise<string[]> {
  const segments: string[] = [];
  let cursorId: string | null = folderId;
  const visited = new Set<string>();

  while (cursorId) {
    if (visited.has(cursorId)) break;
    visited.add(cursorId);

    const current: { name: string; parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: cursorId, userId },
        select: { name: true, parentId: true },
      });

    if (!current) break;
    segments.unshift(current.name);
    cursorId = current.parentId;
  }

  return segments;
}

export async function listUserFiles(
  userId: string,
  options: {
    folderId?: string | null;
    starredOnly?: boolean;
    trashedOnly?: boolean;
  } = {}
) {
  const files = await prisma.file.findMany({
    where: {
      userId,
      deletedAt: options.trashedOnly ? { not: null } : null,
      ...(options.starredOnly ? { isStarred: true } : {}),
      ...(options.trashedOnly || options.starredOnly
        ? {}
        : { folderId: options.folderId ?? null }),
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return files.map((file) => ({
    id: file.id,
    filename: file.filename,
    storedName: file.storedName,
    mimeType: file.mimeType,
    size: Number(file.size),
    path: file.path,
    thumbnailPath: file.thumbnailPath,
    folderId: file.folderId,
    isPublic: file.isPublic,
    isStarred: file.isStarred,
    deletedAt: file.deletedAt ? file.deletedAt.toISOString() : null,
    createdAt: file.createdAt.toISOString(),
  }));
}

export async function uploadUserFile(
  userId: string,
  userEmail: string,
  input: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
    folderId?: string | null;
  },
  meta: RequestMeta = {}
) {
  if (input.folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: input.folderId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!folder) {
      throw new Error("Target folder not found");
    }
  }

  const folderSegments = input.folderId
    ? await getFolderPathSegments(userId, input.folderId)
    : [];

  const targetDir =
    folderSegments.length > 0
      ? ensurePhysicalUserFolder(userEmail, folderSegments)
      : ensureUserStorageDir(userEmail);

  const storedName = buildStoredFileName(input.filename);
  const absoluteFilePath = path.resolve(
    /*turbopackIgnore: true*/ targetDir,
    storedName
  );

  fs.writeFileSync(absoluteFilePath, input.buffer);

  const relativePath = toRelativeStoragePath(userEmail, absoluteFilePath);
  const fileSize = input.buffer.byteLength;

  const created = await prisma.$transaction(async (tx) => {
    const fileRecord = await tx.file.create({
      data: {
        userId,
        folderId: input.folderId ?? null,
        filename: sanitizeFileName(input.filename),
        storedName,
        mimeType: input.mimeType || "application/octet-stream",
        size: fileSize,
        path: relativePath,
        isPublic: false,
        isStarred: false,
      },
    });

    const userRecord = await tx.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true },
    });

    const nextUsed = Number(userRecord?.storageUsed ?? 0) + fileSize;

    await tx.user.update({
      where: { id: userId },
      data: { storageUsed: nextUsed },
    });

    return fileRecord;
  });

  await logActivity(userId, "FILE_UPLOAD", meta);

  return {
    id: created.id,
    filename: created.filename,
    storedName: created.storedName,
    mimeType: created.mimeType,
    size: Number(created.size),
    path: created.path,
    thumbnailPath: created.thumbnailPath,
    folderId: created.folderId,
    isPublic: created.isPublic,
    isStarred: created.isStarred,
    deletedAt: null,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function updateUserFile(
  userId: string,
  fileId: string,
  input: {
    filename?: string;
    folderId?: string | null;
    isPublic?: boolean;
    isStarred?: boolean;
    restore?: boolean;
  },
  meta: RequestMeta = {}
) {
  const existing = await prisma.file.findFirst({
    where: { id: fileId, userId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  if (input.folderId !== undefined && input.folderId !== null) {
    const folder = await prisma.folder.findFirst({
      where: { id: input.folderId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!folder) {
      throw new Error("Target folder not found");
    }
  }

  let nextStoragePath = existing.path;

  if (
    input.folderId !== undefined &&
    input.folderId !== existing.folderId &&
    existing.user?.email
  ) {
    const currentAbsPath = resolveStorageRelativePath(existing.path);
    const destSegments = input.folderId
      ? await getFolderPathSegments(userId, input.folderId)
      : [];

    const destDir =
      destSegments.length > 0
        ? ensurePhysicalUserFolder(existing.user.email, destSegments)
        : ensureUserStorageDir(existing.user.email);

    const destAbsPath = path.resolve(
      /*turbopackIgnore: true*/ destDir,
      existing.storedName
    );

    if (fs.existsSync(currentAbsPath) && currentAbsPath !== destAbsPath) {
      fs.renameSync(currentAbsPath, destAbsPath);
      nextStoragePath = toRelativeStoragePath(existing.user.email, destAbsPath);
    } else {
      const resolvedCheck = resolveUserFolderPhysicalPath(
        existing.user.email,
        destSegments
      );
      nextStoragePath = toRelativeStoragePath(
        existing.user.email,
        path.resolve(/*turbopackIgnore: true*/ resolvedCheck, existing.storedName)
      );
    }
  }

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: {
      ...(input.filename !== undefined
        ? { filename: sanitizeFileName(input.filename) }
        : {}),
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      ...(nextStoragePath !== existing.path ? { path: nextStoragePath } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
      ...(input.isStarred !== undefined ? { isStarred: input.isStarred } : {}),
      ...(input.restore === true ? { deletedAt: null } : {}),
    },
  });

  await logActivity(userId, "FILE_UPDATE", meta);

  return {
    id: updated.id,
    filename: updated.filename,
    storedName: updated.storedName,
    mimeType: updated.mimeType,
    size: Number(updated.size),
    path: updated.path,
    thumbnailPath: updated.thumbnailPath,
    folderId: updated.folderId,
    isPublic: updated.isPublic,
    isStarred: updated.isStarred,
    deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function trashUserFile(
  userId: string,
  fileId: string,
  meta: RequestMeta = {}
) {
  const existing = await prisma.file.findFirst({
    where: { id: fileId, userId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });

  await logActivity(userId, "FILE_TRASH", meta);

  return {
    id: updated.id,
    deletedAt: updated.deletedAt?.toISOString() ?? null,
  };
}

export async function deleteUserFilePermanently(
  userId: string,
  fileId: string,
  meta: RequestMeta = {}
) {
  const existing = await prisma.file.findFirst({
    where: { id: fileId, userId },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  const freedBytes = Number(existing.size);
  deletePhysicalFileIfExists(existing.path);
  deletePhysicalFileIfExists(existing.thumbnailPath);

  await prisma.$transaction(async (tx) => {
    await tx.file.delete({ where: { id: fileId } });

    const userRecord = await tx.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true },
    });

    const nextUsed = Math.max(0, Number(userRecord?.storageUsed ?? 0) - freedBytes);

    await tx.user.update({
      where: { id: userId },
      data: { storageUsed: nextUsed },
    });
  });

  await logActivity(userId, "FILE_DELETE_PERMANENT", meta);

  return { deletedId: fileId, freedBytes };
}

export async function saveFileThumbnail(
  userId: string,
  userEmail: string,
  fileId: string,
  input: { filename: string; buffer: Buffer },
  meta: RequestMeta = {}
) {
  const existing = await prisma.file.findFirst({
    where: { id: fileId, userId },
  });

  if (!existing) {
    throw new Error("File not found");
  }

  deletePhysicalFileIfExists(existing.thumbnailPath);

  const thumbsDir = ensureUserThumbnailsDir(userEmail);
  const thumbStoredName = `thumb-${buildStoredFileName(input.filename)}`;
  const absoluteThumbPath = path.resolve(
    /*turbopackIgnore: true*/ thumbsDir,
    thumbStoredName
  );

  fs.writeFileSync(absoluteThumbPath, input.buffer);

  const relativeThumbPath = toRelativeStoragePath(userEmail, absoluteThumbPath);

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { thumbnailPath: relativeThumbPath },
  });

  await logActivity(userId, "FILE_THUMBNAIL_UPDATE", meta);

  return {
    id: updated.id,
    thumbnailPath: updated.thumbnailPath,
  };
}

export async function getAuthorizedFileBinary(userId: string, fileId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, deletedAt: null },
  });

  if (!file) {
    throw new Error("File not found");
  }

  const absolutePath = resolveStorageRelativePath(file.path);
  if (!fs.existsSync(absolutePath)) {
    throw new Error("File content not found on storage");
  }

  return {
    file,
    buffer: fs.readFileSync(absolutePath),
  };
}