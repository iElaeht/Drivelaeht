import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createFolderSchema } from "@/lib/validators";
import { createFolder, listUserFolders } from "@/services/folder.service";

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
    const parentId = searchParams.get("parentId");
    const trashedOnly = searchParams.get("trashed") === "true";

    const folders = await listUserFolders(user.id, {
      parentId: parentId || null,
      trashedOnly,
    });

    return NextResponse.json({ folders }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load folders";
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
    const parsed = createFolderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid folder payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const folder = await createFolder(user.id, parsed.data, getClientMeta(req));

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}