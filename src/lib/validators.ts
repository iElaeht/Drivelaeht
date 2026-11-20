import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username contains invalid characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const verifyTwoFactorSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Code must be a 6-digit number"),
});

export const createFolderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Folder name is required")
    .max(120, "Folder name is too long"),
  parentId: z.string().trim().min(1).optional().nullable(),
});

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parentId: z.string().trim().min(1).optional().nullable(),
  restore: z.boolean().optional(),
});

export const updateFileSchema = z.object({
  filename: z.string().trim().min(1).max(255).optional(),
  folderId: z.string().trim().min(1).optional().nullable(),
  isPublic: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  restore: z.boolean().optional(),
});

export const createContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createClipboardSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  type: z.enum(["TEXT", "URL", "CODE"]).default("TEXT"),
});

export const createShareLinkSchema = z.object({
  fileId: z.string().trim().min(1, "File ID is required"),
  expiresInHours: z.number().int().min(1).max(720).default(24),
});