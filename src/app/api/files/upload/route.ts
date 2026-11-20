import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { uploadUserFile } from "@/services/file.service";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const entry = formData.get("file");
    const folderIdRaw = formData.get("folderId");
    const folderId =
      typeof folderIdRaw === "string" && folderIdRaw.trim().length > 0
        ? folderIdRaw.trim()
        : null;

    if (!entry || !(entry instanceof File)) {
      return NextResponse.json(
        { error: "File field is required" },
        { status: 400 }
      );
    }

    if (entry.size === 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    if (entry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum upload limit" },
        { status: 413 }
      );
    }

    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const file = await uploadUserFile(
      user.id,
      user.email,
      {
        filename: entry.name,
        mimeType: entry.type || "application/octet-stream",
        buffer,
        folderId,
      },
      getClientMeta(req)
    );

    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload file";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}