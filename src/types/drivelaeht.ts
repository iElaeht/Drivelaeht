export type Role = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "USER" | "GUEST";

export type UserStatus = "ONLINE" | "OFFLINE" | "BUSY" | "AWAY" | "INVISIBLE";

export type ClipboardType = "TEXT" | "URL" | "CODE";

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  status: UserStatus;
  role: Role;
  storageUsed: number;
  isEmailVerified: boolean;
  themePreference: string;
}

export interface ActiveSessionItem {
  id: string;
  deviceAgent: string | null;
  ipAddress: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  thumbnailPath: string | null;
  parentId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  thumbnailPath: string | null;
  folderId: string | null;
  isPublic: boolean;
  isStarred: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export interface ContactItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ClipboardItem {
  id: string;
  content: string;
  type: ClipboardType;
  createdAt: string;
}

export interface ShareLinkItem {
  id: string;
  fileId: string;
  token: string;
  expiresAt: string;
  viewsCount: number;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}