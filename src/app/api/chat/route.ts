import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";
import {
  createMessage,
  listMessagesSince,
  listRecentMessages,
  messageToJson,
} from "@/lib/db/messages";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    if (since) {
      const sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: "Tham số since không hợp lệ" }, { status: 400 });
      }
      const messages = await listMessagesSince(sinceDate);
      return NextResponse.json({ messages: messages.map(messageToJson) });
    }

    const messages = await listRecentMessages(80);
    return NextResponse.json({ messages: messages.map(messageToJson) });
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
    const body = await request.json();
    const text = String(body.text ?? "").trim();

    if (!text) {
      return NextResponse.json({ error: "Nội dung không được trống" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Tin nhắn tối đa 2000 ký tự" }, { status: 400 });
    }

    const user = await findUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    }

    const created = await createMessage({
      senderId: session.id,
      senderName: user.name,
      senderRole: user.role,
      senderAvatarUrl: user.avatarUrl ?? null,
      text,
    });

    return NextResponse.json({ message: messageToJson(created) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
