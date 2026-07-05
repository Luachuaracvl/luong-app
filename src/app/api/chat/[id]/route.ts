import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  invalidateMessagesCache,
  upsertMessagesInCache,
} from "@/lib/cache/chat-server-cache";
import {
  editMessage,
  messageToJson,
  recallMessage,
  toggleReaction,
} from "@/lib/db/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();

    if (body.action === "react") {
      const emoji = String(body.emoji ?? "").trim();
      if (!emoji) {
        return NextResponse.json({ error: "Thiếu emoji" }, { status: 400 });
      }
      const updated = await toggleReaction(id, session.id, emoji);
      if (!updated) {
        return NextResponse.json({ error: "Không tìm thấy tin nhắn" }, { status: 404 });
      }
      invalidateMessagesCache(updated.roomKey);
      upsertMessagesInCache(updated.roomKey, [updated]);
      return NextResponse.json({ message: messageToJson(updated) });
    }

    const text = String(body.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Nội dung không được trống" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Tin nhắn tối đa 2000 ký tự" }, { status: 400 });
    }

    const updated = await editMessage(id, session.id, text);
    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn" }, { status: 404 });
    }

    invalidateMessagesCache(updated.roomKey);
    upsertMessagesInCache(updated.roomKey, [updated]);
    return NextResponse.json({ message: messageToJson(updated) });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "RECALLED") {
      return NextResponse.json({ error: "Tin nhắn đã thu hồi" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const recalled = await recallMessage(id, session.id);
    if (!recalled) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn" }, { status: 404 });
    }

    invalidateMessagesCache(recalled.roomKey);
    upsertMessagesInCache(recalled.roomKey, [recalled]);

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
