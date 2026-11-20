import { prisma } from "@/lib/prisma";
import { logActivity } from "@/services/auth.service";

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function listUserContacts(userId: string, search?: string) {
  const query = search?.trim();

  const contacts = await prisma.contact.findMany({
    where: {
      userId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    notes: contact.notes,
    createdAt: contact.createdAt.toISOString(),
  }));
}

export async function createUserContact(
  userId: string,
  input: {
    name: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
  },
  meta: RequestMeta = {}
) {
  const created = await prisma.contact.create({
    data: {
      userId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      notes: input.notes?.trim() || null,
    },
  });

  await logActivity(userId, "CONTACT_CREATE", meta);

  return {
    id: created.id,
    name: created.name,
    phone: created.phone,
    email: created.email,
    notes: created.notes,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function deleteUserContact(
  userId: string,
  contactId: string,
  meta: RequestMeta = {}
): Promise<boolean> {
  const result = await prisma.contact.deleteMany({
    where: {
      id: contactId,
      userId,
    },
  });

  if (result.count > 0) {
    await logActivity(userId, "CONTACT_DELETE", meta);
    return true;
  }

  return false;
}