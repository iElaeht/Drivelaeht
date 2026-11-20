import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { createShareLinkSchema } from "@/lib/validators";
import { logActivity } from "@/services/auth.service";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const links = await prisma.shareLink.findMany({
      where: {
        file: {
          userId: user.id,
          deletedAt: null,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        links: links.map((link) => ({
          id: link.id,
          fileId: link.fileId,
          token: link.token,
          expiresAt: link.expiresAt.toISOString(),
          viewsCount: link.viewsCount,
          createdAt: link.createdAt.toISOString(),
          file: {
            id: link.file.id,
            filename: link.file.filename,
            mimeType: link.file.mimeType,
            size: Number(link.file.size),
          },
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load share links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createShareLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid share link payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ownedFile = await prisma.file.findFirst({
      where: {
        id: parsed.data.fileId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!ownedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(
      Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000
    );

    const link = await prisma.shareLink.create({
      data: {
        fileId: ownedFile.id,
        token,
        expiresAt,
      },
    });

    await logActivity(user.id, "SHARE_LINK_CREATED", getClientMeta(req));

    return NextResponse.json(
      {
        link: {
          id: link.id,
          fileId: link.fileId,
          token: link.token,
          expiresAt: link.expiresAt.toISOString(),
          viewsCount: link.viewsCount,
          createdAt: link.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create share link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const link = await prisma.shareLink.findFirst({
      where: {
        id,
        file: { userId: user.id },
      },
      select: { id: true },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      );
    }

    await prisma.shareLink.delete({ where: { id: link.id } });
    await logActivity(user.id, "SHARE_LINK_REVOKED", getClientMeta(req));

    return NextResponse.json({ message: "Share link revoked" }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke share link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}