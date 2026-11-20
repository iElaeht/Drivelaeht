import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateFolderSchema } from "@/lib/validators";
import {
  deleteFolderPermanently,
  trashFolder,
  updateFolder,
} from "@/services/folder.service";

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
    const parsed = updateFolderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid folder update payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const folder = await updateFolder(
      user.id,
      id,
      parsed.data,
      getClientMeta(req)
    );

    return NextResponse.json({ folder }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update folder";

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
      const result = await deleteFolderPermanently(
        user.id,
        id,
        getClientMeta(req)
      );
      return NextResponse.json({ result }, { status: 200 });
    }

    const result = await trashFolder(user.id, id, getClientMeta(req));
    return NextResponse.json({ folder: result }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete folder";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}