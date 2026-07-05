import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  invalidateMessagesCache,
  upsertMessagesInCache,
} from "@/lib/cache/chat-server-cache";
import { messageToJson, recallMessage } from "@/lib/db/messages";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Thiếu id tin nhắn" }, { status: 400 });
    }

    const recalled = await recallMessage(id, session.id);
    if (!recalled) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn" }, { status: 404 });
    }

    invalidateMessagesCache();
    upsertMessagesInCache([recalled]);

    return NextResponse.json({ message: messageToJson(recalled) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Chỉ được thu hồi tin nhắn của bạn" }, { status: 403 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
