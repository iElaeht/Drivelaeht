import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listUserFiles } from "@/services/file.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const starredOnly = searchParams.get("starred") === "true";
    const trashedOnly = searchParams.get("trashed") === "true";

    const files = await listUserFiles(user.id, {
      folderId: folderId || null,
      starredOnly,
      trashedOnly,
    });

    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}