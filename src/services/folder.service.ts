import { prisma } from "@/lib/prisma";
import {
  deletePhysicalFileIfExists,
  ensurePhysicalUserFolder,
  movePhysicalUserFolder,
  removePhysicalUserFolder,
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

export async function listUserFolders(
  userId: string,
  options: { parentId?: string | null; trashedOnly?: boolean } = {}
) {
  const folders = await prisma.folder.findMany({
    where: {
      userId,
      deletedAt: options.trashedOnly ? { not: null } : null,
      ...(options.trashedOnly ? {} : { parentId: options.parentId ?? null }),
    },
    orderBy: [{ name: "asc" }],
  });

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    thumbnailPath: folder.thumbnailPath,
    parentId: folder.parentId,
    deletedAt: folder.deletedAt ? folder.deletedAt.toISOString() : null,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }));
}

export async function createFolder(
  userId: string,
  input: { name: string; parentId?: string | null },
  meta: RequestMeta = {}
) {
  if (input.parentId) {
    const parent = await prisma.folder.findFirst({
      where: {
        id: input.parentId,
        userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!parent) {
      throw new Error("Parent folder not found");
    }
  }

  const trimmedName = input.name.trim();

  const folder = await prisma.folder.create({
    data: {
      userId,
      name: trimmedName,
      parentId: input.parentId ?? null,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user) {
    const parentSegments = await getFolderPathSegments(
      userId,
      input.parentId ?? null
    );
    ensurePhysicalUserFolder(user.email, [...parentSegments, trimmedName]);
  }

  await logActivity(userId, "FOLDER_CREATE", meta);

  return {
    id: folder.id,
    name: folder.name,
    thumbnailPath: folder.thumbnailPath,
    parentId: folder.parentId,
    deletedAt: null,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

async function isDescendantFolder(
  userId: string,
  folderId: string,
  targetParentId: string
): Promise<boolean> {
  let cursorId: string | null = targetParentId;
  const visited = new Set<string>();

  while (cursorId) {
    if (cursorId === folderId) {
      return true;
    }
    if (visited.has(cursorId)) {
      break;
    }
    visited.add(cursorId);

    const current: { parentId: string | null } | null =
      await prisma.folder.findFirst({
        where: { id: cursorId, userId },
        select: { parentId: true },
      });

    cursorId = current?.parentId ?? null;
  }

  return false;
}

export async function updateFolder(
  userId: string,
  folderId: string,
  input: { name?: string; parentId?: string | null; restore?: boolean },
  meta: RequestMeta = {}
) {
  const existing = await prisma.folder.findFirst({
    where: { id: folderId, userId },
  });

  if (!existing) {
    throw new Error("Folder not found");
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === folderId) {
      throw new Error("Folder cannot be its own parent");
    }

    const parentExists = await prisma.folder.findFirst({
      where: { id: input.parentId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!parentExists) {
      throw new Error("Target parent folder not found");
    }

    const circular = await isDescendantFolder(userId, folderId, input.parentId);
    if (circular) {
      throw new Error("Cannot move folder into its own descendant");
    }
  }

  const oldSegments = await getFolderPathSegments(userId, folderId);

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.restore === true ? { deletedAt: null } : {}),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user) {
    const newSegments = await getFolderPathSegments(userId, folderId);
    movePhysicalUserFolder(user.email, oldSegments, newSegments);
  }

  await logActivity(userId, "FOLDER_UPDATE", meta);

  return {
    id: updated.id,
    name: updated.name,
    thumbnailPath: updated.thumbnailPath,
    parentId: updated.parentId,
    deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function trashFolder(
  userId: string,
  folderId: string,
  meta: RequestMeta = {}
) {
  const existing = await prisma.folder.findFirst({
    where: { id: folderId, userId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("Folder not found");
  }

  const now = new Date();
  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: { deletedAt: now },
  });

  await logActivity(userId, "FOLDER_TRASH", meta);

  return {
    id: updated.id,
    deletedAt: updated.deletedAt?.toISOString() ?? null,
  };
}

async function collectDescendantFolderIds(
  userId: string,
  rootFolderId: string
): Promise<string[]> {
  const collected: string[] = [rootFolderId];
  let frontier: string[] = [rootFolderId];

  while (frontier.length > 0) {
    const children = await prisma.folder.findMany({
      where: {
        userId,
        parentId: { in: frontier },
      },
      select: { id: true },
    });

    const nextIds = children
      .map((c) => c.id)
      .filter((id) => !collected.includes(id));

    collected.push(...nextIds);
    frontier = nextIds;
  }

  return collected;
}

export async function deleteFolderPermanently(
  userId: string,
  folderId: string,
  meta: RequestMeta = {}
) {
  const existing = await prisma.folder.findFirst({
    where: { id: folderId, userId },
  });

  if (!existing) {
    throw new Error("Folder not found");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const folderSegments = await getFolderPathSegments(userId, folderId);
  const folderIds = await collectDescendantFolderIds(userId, folderId);

  const filesToDelete = await prisma.file.findMany({
    where: {
      userId,
      folderId: { in: folderIds },
    },
    select: {
      id: true,
      size: true,
      path: true,
      thumbnailPath: true,
    },
  });

  let freedBytes = 0;
  for (const file of filesToDelete) {
    freedBytes += Number(file.size);
    deletePhysicalFileIfExists(file.path);
    deletePhysicalFileIfExists(file.thumbnailPath);
  }

  deletePhysicalFileIfExists(existing.thumbnailPath);

  await prisma.$transaction(async (tx) => {
    if (filesToDelete.length > 0) {
      await tx.file.deleteMany({
        where: {
          id: { in: filesToDelete.map((f) => f.id) },
          userId,
        },
      });
    }

    await tx.folder.deleteMany({
      where: {
        id: { in: folderIds },
        userId,
      },
    });

    if (freedBytes > 0) {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { storageUsed: true },
      });

      const nextStorage = Math.max(
        0,
        Number(currentUser?.storageUsed ?? 0) - freedBytes
      );

      await tx.user.update({
        where: { id: userId },
        data: { storageUsed: nextStorage },
      });
    }
  });

  if (user && folderSegments.length > 0) {
    removePhysicalUserFolder(user.email, folderSegments);
  }

  await logActivity(userId, "FOLDER_DELETE_PERMANENT", meta);

  return { deletedFolderCount: folderIds.length, freedBytes };
}