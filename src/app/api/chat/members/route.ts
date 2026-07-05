import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  getCachedMembers,
  setCachedMembers,
} from "@/lib/cache/chat-server-cache";
import { findAllUsersForChat } from "@/lib/db/users";

export async function GET() {
  try {
    await requireSession();

    const cached = getCachedMembers();
    if (cached) {
      return NextResponse.json({ members: cached });
    }

    const members = await findAllUsersForChat();
    setCachedMembers(members);
    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
