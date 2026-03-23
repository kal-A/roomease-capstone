import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

type RemoveBlockerBody = {
  blockerId: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const isAdmin = Boolean(session?.user?.isAdmin) || (email ?? "").toLowerCase() === ADMIN_EMAIL;

  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: RemoveBlockerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const blockerId = String(body?.blockerId ?? "").trim();
  if (!blockerId) return NextResponse.json({ error: "Missing blockerId" }, { status: 400 });

  const sb = supabaseServer();

  const { error } = await sb
    .from("room_blockers")
    .update({ is_active: false })
    .eq("id", blockerId);

  if (error) {
    return NextResponse.json({ error: `Failed to remove blocker: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

