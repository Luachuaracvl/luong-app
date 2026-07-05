import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { resolveRoom } from "@/lib/chat-room";
import {
  appendMessageToCache,
  getCachedRecentMessages,
  invalidateMessagesCache,
  mergeSinceIntoCache,
  setCachedRecentMessages,
  upsertMessagesInCache,
} from "@/lib/cache/chat-server-cache";
import { findChannelById } from "@/lib/db/channels";
import {
  createMessage,
  listMessagesSince,
  listMessagesUpdatedSince,
  listRecentMessages,
  messageToJson,
} from "@/lib/db/messages";

function getRoomFromRequest(url: URL, userId: string) {
  const channelId = url.searchParams.get("channelId");
  const dmUserId = url.searchParams.get("dmUserId");
  return resolveRoom({
    channelId: channelId ?? (dmUserId ? null : "general"),
    dmUserId,
    currentUserId: userId,
  });
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const room = getRoomFromRequest(url, session.id);
    if (!room) {
      return NextResponse.json({ error: "Phòng chat không hợp lệ" }, { status: 400 });
    }

    const since = url.searchParams.get("since");
    const syncSince = url.searchParams.get("syncSince");

    if (since) {
      const sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: "Tham số since không hợp lệ" }, { status: 400 });
      }

      const [newMessages, updatedMessages] = await Promise.all([
        listMessagesSince(room.roomKey, sinceDate),
        syncSince
          ? listMessagesUpdatedSince(new Date(syncSince), room.roomKey).catch(() => [])
          : Promise.resolve([]),
      ]);

      mergeSinceIntoCache(room.roomKey, sinceDate, newMessages);
      if (updatedMessages.length) {
        upsertMessagesInCache(room.roomKey, updatedMessages);
      }

      const merged = new Map<string, ReturnType<typeof messageToJson>>();
      for (const m of updatedMessages) merged.set(m.id, messageToJson(m));
      for (const m of newMessages) merged.set(m.id, messageToJson(m));

      return NextResponse.json({ messages: [...merged.values()], roomKey: room.roomKey });
    }

    const cached = getCachedRecentMessages(room.roomKey);
    if (cached) {
      return NextResponse.json({
        messages: cached.map(messageToJson),
        roomKey: room.roomKey,
      });
    }

    const messages = await listRecentMessages(room.roomKey, 80);
    setCachedRecentMessages(room.roomKey, messages);
    return NextResponse.json({
      messages: messages.map(messageToJson),
      roomKey: room.roomKey,
    });
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

    const room = resolveRoom({
      channelId: body.channelId ?? (body.dmUserId ? null : "general"),
      dmUserId: body.dmUserId ?? null,
      currentUserId: session.id,
    });
    if (!room) {
      return NextResponse.json({ error: "Phòng chat không hợp lệ" }, { status: 400 });
    }

    if (room.type === "channel") {
      const channel = await findChannelById(room.channelId);
      if (!channel) {
        return NextResponse.json({ error: "Kênh không tồn tại" }, { status: 404 });
      }
      if (channel.adminOnly && session.role !== "ADMIN") {
        return NextResponse.json({ error: "Chỉ admin gửi tin trong kênh này" }, { status: 403 });
      }
    }

    const created = await createMessage({
      senderId: session.id,
      senderName: session.name,
      senderRole: session.role,
      text,
      roomKey: room.roomKey,
      channelId: room.type === "channel" ? room.channelId : null,
      dmPeerId: room.type === "dm" ? room.peerId : null,
    });

    invalidateMessagesCache(room.roomKey);
    appendMessageToCache(created);

    return NextResponse.json({ message: messageToJson(created) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
