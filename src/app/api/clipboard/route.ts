import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createClipboardSchema } from "@/lib/validators";
import {
  createClipboardItem,
  deleteClipboardItem,
  listUserClipboardItems,
} from "@/services/clipboard.service";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || "50");
    const items = await listUserClipboardItems(
      user.id,
      Number.isFinite(limitParam) ? limitParam : 50
    );

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load clipboard items";
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
    const parsed = createClipboardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid clipboard payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const item = await createClipboardItem(
      user.id,
      parsed.data,
      getClientMeta(req)
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save clipboard item";
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

    const deleted = await deleteClipboardItem(user.id, id, getClientMeta(req));

    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Clipboard item deleted" }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete clipboard item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}