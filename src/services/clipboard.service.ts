import { prisma } from "@/lib/prisma";
import { logActivity } from "@/services/auth.service";
import type { ClipboardType } from "@/types/drivelaeht";

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function listUserClipboardItems(userId: string, limit = 50) {
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const items = await prisma.clipboard.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  return items.map((item) => ({
    id: item.id,
    content: item.content,
    type: item.type as ClipboardType,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function createClipboardItem(
  userId: string,
  input: { content: string; type?: ClipboardType },
  meta: RequestMeta = {}
) {
  const created = await prisma.clipboard.create({
    data: {
      userId,
      content: input.content,
      type: input.type ?? "TEXT",
    },
  });

  await logActivity(userId, "CLIPBOARD_CREATE", meta);

  return {
    id: created.id,
    content: created.content,
    type: created.type as ClipboardType,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteClipboardItem(
  userId: string,
  itemId: string,
  meta: RequestMeta = {}
): Promise<boolean> {
  const result = await prisma.clipboard.deleteMany({
    where: {
      id: itemId,
      userId,
    },
  });

  if (result.count > 0) {
    await logActivity(userId, "CLIPBOARD_DELETE", meta);
    return true;
  }

  return false;
}