import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  appendMessageToCache,
  getCachedRecentMessages,
  invalidateMessagesCache,
  mergeSinceIntoCache,
  setCachedRecentMessages,
  upsertMessagesInCache,
} from "@/lib/cache/chat-server-cache";
import {
  createMessage,
  listMessagesSince,
  listMessagesUpdatedSince,
  listRecentMessages,
  messageToJson,
} from "@/lib/db/messages";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const syncSince = searchParams.get("syncSince");

    if (since) {
      const sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: "Tham số since không hợp lệ" }, { status: 400 });
      }

      const [newMessages, updatedMessages] = await Promise.all([
        listMessagesSince(sinceDate),
        syncSince
          ? listMessagesUpdatedSince(new Date(syncSince)).catch(() => [])
          : Promise.resolve([]),
      ]);

      mergeSinceIntoCache(sinceDate, newMessages);
      if (updatedMessages.length) {
        upsertMessagesInCache(updatedMessages);
      }

      const merged = new Map<string, ReturnType<typeof messageToJson>>();
      for (const m of updatedMessages) merged.set(m.id, messageToJson(m));
      for (const m of newMessages) merged.set(m.id, messageToJson(m));

      return NextResponse.json({ messages: [...merged.values()] });
    }

    const cached = getCachedRecentMessages();
    if (cached) {
      return NextResponse.json({ messages: cached.map(messageToJson) });
    }

    const messages = await listRecentMessages(80);
    setCachedRecentMessages(messages);
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

    let avatarUrl: string | null = null;
    if (typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("data:image/")) {
      if (body.avatarUrl.length <= 500_000) {
        avatarUrl = body.avatarUrl;
      }
    }

    const created = await createMessage({
      senderId: session.id,
      senderName: session.name,
      senderRole: session.role,
      senderAvatarUrl: avatarUrl,
      text,
    });

    invalidateMessagesCache();
    appendMessageToCache(created);

    return NextResponse.json({ message: messageToJson(created) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
