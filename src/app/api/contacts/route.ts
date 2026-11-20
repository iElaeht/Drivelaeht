import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createContactSchema } from "@/lib/validators";
import {
  createUserContact,
  deleteUserContact,
  listUserContacts,
} from "@/services/contact.service";

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
    const q = searchParams.get("q") || undefined;
    const contacts = await listUserContacts(user.id, q);

    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load contacts";
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
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid contact payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const contact = await createUserContact(
      user.id,
      parsed.data,
      getClientMeta(req)
    );

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create contact";
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

    const deleted = await deleteUserContact(user.id, id, getClientMeta(req));

    if (!deleted) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Contact deleted" }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete contact";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}