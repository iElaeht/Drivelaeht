import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedFileBinary } from "@/services/file.service";
import { logActivity } from "@/services/auth.service";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { file, buffer } = await getAuthorizedFileBinary(user.id, id);

    await logActivity(user.id, "FILE_DOWNLOAD", getClientMeta(req));

    const safeFilename = file.filename.replace(/["\r\n]/g, "_");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(buffer.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download file";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}