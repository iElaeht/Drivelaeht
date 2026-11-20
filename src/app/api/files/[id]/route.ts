import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateFileSchema } from "@/lib/validators";
import {
  deleteUserFilePermanently,
  trashUserFile,
  updateUserFile,
} from "@/services/file.service";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateFileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid file update payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const file = await updateUserFile(
      user.id,
      id,
      parsed.data,
      getClientMeta(req)
    );

    return NextResponse.json({ file }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update file";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    if (permanent) {
      const result = await deleteUserFilePermanently(
        user.id,
        id,
        getClientMeta(req)
      );
      return NextResponse.json({ result }, { status: 200 });
    }

    const result = await trashUserFile(user.id, id, getClientMeta(req));
    return NextResponse.json({ file: result }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete file";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}