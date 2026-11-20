import fs from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveStorageRelativePath } from "@/lib/storage";
import { saveFileThumbnail } from "@/services/file.service";

const MAX_THUMB_BYTES = 5 * 1024 * 1024;
const ALLOWED_THUMB_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const file = await prisma.file.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      select: { thumbnailPath: true },
    });

    if (!file || !file.thumbnailPath) {
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    const absolutePath = resolveStorageRelativePath(file.thumbnailPath);
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "Thumbnail file missing on disk" },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(absolutePath);
    const lower = file.thumbnailPath.toLowerCase();
    const contentType = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : lower.endsWith(".gif")
          ? "image/gif"
          : "image/jpeg";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load thumbnail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const formData = await req.formData();
    const entry = formData.get("thumbnail");

    if (!entry || !(entry instanceof File)) {
      return NextResponse.json(
        { error: "Thumbnail file is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_THUMB_TYPES.has(entry.type)) {
      return NextResponse.json(
        { error: "Unsupported thumbnail image format" },
        { status: 400 }
      );
    }

    if (entry.size === 0 || entry.size > MAX_THUMB_BYTES) {
      return NextResponse.json(
        { error: "Invalid thumbnail size" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await entry.arrayBuffer());
    const result = await saveFileThumbnail(
      user.id,
      user.email,
      id,
      { filename: entry.name, buffer },
      getClientMeta(req)
    );

    return NextResponse.json({ thumbnail: result }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload thumbnail";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}