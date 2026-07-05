import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getAllPresence,
  markPresenceOffline,
  presenceMapToJson,
  touchPresence,
} from "@/lib/db/presence";

export async function GET() {
  try {
    await requireSession();
    const presence = await getAllPresence();
    return NextResponse.json(
      { presence: presenceMapToJson(presence) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const offline = new URL(request.url).searchParams.get("offline") === "1";

    if (offline) {
      await markPresenceOffline(session.id);
      return NextResponse.json({ ok: true, online: false });
    }

    await touchPresence(session.id, session.name, session.role);
    return NextResponse.json({ ok: true, online: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
