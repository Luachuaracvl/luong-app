"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cacheAvatars } from "@/lib/avatar-cache";
import { useMobileChatViewport } from "@/hooks/useMobileChatViewport";
import { IconChevronLeft, IconSend } from "./Icons";
import { AvatarWithStatus } from "./OnlineStatus";
import { useOnlineCount } from "./PresenceProvider";
import { UserAvatar } from "./UserAvatar";

type ChatMember = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
  isActive: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "EMPLOYEE";
  senderAvatarUrl?: string | null;
  text: string;
  recalled?: boolean;
  createdAt: string;
  _pending?: boolean;
};

type Room =
  | { kind: "group" }
  | { kind: "dm"; userId: string; userName: string };

type MobileScreen = "chat" | "inbox";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function roomQuery(room: Room) {
  return room.kind === "group"
    ? "channelId=general"
    : `dmUserId=${encodeURIComponent(room.userId)}`;
}

function roomTitle(room: Room) {
  return room.kind === "group" ? "Chat chung" : room.userName;
}

function ChatSegment({
  room,
  mobileScreen,
  onGroup,
  onInbox,
}: {
  room: Room;
  mobileScreen: MobileScreen;
  onGroup: () => void;
  onInbox: () => void;
}) {
  return (
    <div className="chat-segment">
      <button
        type="button"
        className={`chat-segment-btn ${
          room.kind === "group" && mobileScreen === "chat" ? "chat-segment-btn-active" : ""
        }`}
        onClick={onGroup}
      >
        Chat chung
      </button>
      <button
        type="button"
        className={`chat-segment-btn ${
          mobileScreen === "inbox" || room.kind === "dm" ? "chat-segment-btn-active" : ""
        }`}
        onClick={onInbox}
      >
        Riêng tư
      </button>
    </div>
  );
}

export function SimpleChat({
  currentUser,
}: {
  currentUser: {
    id: string;
    name: string;
    role: "ADMIN" | "EMPLOYEE";
    avatarUrl?: string | null;
  };
}) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [room, setRoom] = useState<Room>({ kind: "group" });
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const onlineCount = useOnlineCount();

  useMobileChatViewport(mobileScreen === "chat");

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    fetch("/api/chat/members")
      .then((r) => r.json())
      .then((data) => {
        if (data.members) {
          const list = (data.members as ChatMember[]).filter(
            (m) => m.isActive && m.id !== currentUser.id
          );
          setMembers(list);
          cacheAvatars(list.map((m) => ({ userId: m.id, avatarUrl: m.avatarUrl })));
        }
      })
      .catch(() => {});
  }, [currentUser.id]);

  const loadRoom = useCallback(async (nextRoom: Room) => {
    setLoading(true);
    setError("");
    lastMessageAtRef.current = null;

    try {
      const res = await fetch(`/api/chat?${roomQuery(nextRoom)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải tin nhắn");
        setMessages([]);
        return;
      }
      const list = (data.messages ?? []) as ChatMessage[];
      setMessages(list);
      const last = list.at(-1);
      if (last) lastMessageAtRef.current = last.createdAt;
    } catch {
      setError("Không thể kết nối server");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoom(room);
  }, [room, loadRoom]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, room, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => {
      window.setTimeout(() => scrollToBottom(false), 150);
    };
    el.addEventListener("focus", onFocus);
    return () => el.removeEventListener("focus", onFocus);
  }, [scrollToBottom, room]);

  useEffect(() => {
    const poll = async () => {
      const since = lastMessageAtRef.current;
      const url = since
        ? `/api/chat?${roomQuery(room)}&since=${encodeURIComponent(since)}`
        : `/api/chat?${roomQuery(room)}`;

      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (since && !data.messages?.length) return;
        setMessages((prev) =>
          since ? mergeMessages(prev, data.messages ?? []) : (data.messages ?? [])
        );
        if (data.messages?.length) {
          const last = (data.messages as ChatMessage[]).at(-1);
          if (last) lastMessageAtRef.current = last.createdAt;
        }
      } catch {
        /* ignore */
      }
    };

    const timer = window.setInterval(poll, 3000);
    return () => window.clearInterval(timer);
  }, [room]);

  function selectGroup() {
    setRoom({ kind: "group" });
    setMobileScreen("chat");
    setError("");
  }

  function openInbox() {
    setMobileScreen("inbox");
    setError("");
  }

  function selectDm(member: ChatMember) {
    setRoom({ kind: "dm", userId: member.id, userName: member.name });
    setMobileScreen("chat");
    setError("");
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarUrl: currentUser.avatarUrl,
      text: trimmed,
      createdAt: new Date().toISOString(),
      _pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setError("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const body: Record<string, string> = { text: trimmed };
      if (room.kind === "group") body.channelId = "general";
      else body.dmUserId = room.userId;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(trimmed);
        setError(data.error || "Gửi tin nhắn thất bại");
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (data.message as ChatMessage) : m))
      );
      lastMessageAtRef.current = (data.message as ChatMessage).createdAt;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setError("Không thể kết nối server");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function resizeInput(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  const inboxOpen = mobileScreen === "inbox";
  const chatOpen = mobileScreen === "chat";
  const visibleMessages = messages.filter((m) => !m.recalled && m.text.trim());

  const sidebarList = (
    <div className="space-y-1 p-2">
      <button
        type="button"
        onClick={selectGroup}
        className={`chat-sidebar-item ${
          room.kind === "group" ? "chat-sidebar-item-active" : ""
        }`}
      >
        <span className="chat-group-icon">#</span>
        <span className="min-w-0">
          <span className="block truncate font-medium">Chat chung</span>
          <span className="block truncate text-xs text-muted">Trao đổi với cả team</span>
        </span>
      </button>

      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        Tin nhắn riêng
      </p>

      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => selectDm(m)}
          className={`chat-sidebar-item ${
            room.kind === "dm" && room.userId === m.id ? "chat-sidebar-item-active" : ""
          }`}
        >
          <AvatarWithStatus userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
          <span className="min-w-0 truncate font-medium">{m.name}</span>
        </button>
      ))}

      {members.length === 0 && (
        <p className="px-3 py-2 text-sm text-subtle">Chưa có thành viên khác.</p>
      )}
    </div>
  );

  return (
    <div className="chat-app">
      <aside className={`chat-sidebar ${inboxOpen ? "chat-sidebar-open" : ""}`}>
        <div className="chat-mobile-bar lg:hidden">
          <ChatSegment
            room={room}
            mobileScreen={mobileScreen}
            onGroup={selectGroup}
            onInbox={openInbox}
          />
        </div>
        <div className="chat-sidebar-header">
          <p className="text-sm font-semibold text-fg">Tin nhắn</p>
          <p className="text-xs text-muted">{onlineCount} đang online</p>
        </div>
        {sidebarList}
      </aside>

      <div className={`chat-shell ${chatOpen ? "chat-shell-open" : ""}`}>
        <div className="chat-mobile-bar">
          <ChatSegment
            room={room}
            mobileScreen={mobileScreen}
            onGroup={selectGroup}
            onInbox={openInbox}
          />
        </div>

        <header className="chat-header">
          {room.kind === "dm" && (
            <button
              type="button"
              className="chat-back-btn lg:hidden"
              onClick={openInbox}
              aria-label="Danh sách"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{roomTitle(room)}</p>
            <p className="truncate text-[11px] text-muted">
              {room.kind === "group"
                ? `${onlineCount} online · ${members.length + 1} thành viên`
                : "Tin nhắn riêng tư"}
            </p>
          </div>
        </header>

        <div className="chat-body">
          <div className="chat-messages">
            {loading && (
              <p className="py-8 text-center text-sm text-subtle">Đang tải...</p>
            )}

            {!loading && visibleMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="chat-empty-icon">💬</div>
                <p className="mt-3 text-sm font-medium text-fg">
                  {room.kind === "group"
                    ? "Bắt đầu trò chuyện với team"
                    : `Nhắn riêng với ${room.kind === "dm" ? room.userName : "..."}`}
                </p>
                <p className="mt-1 text-xs text-muted">Gửi tin nhắn đầu tiên bên dưới.</p>
              </div>
            )}

            {visibleMessages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${isMe ? "chat-bubble-row-me" : ""}`}
                >
                  {!isMe && (
                    <UserAvatar
                      name={msg.senderName}
                      avatarUrl={msg.senderAvatarUrl}
                      userId={msg.senderId}
                      size="sm"
                    />
                  )}
                  <div
                    className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-other"}`}
                  >
                    {!isMe && (
                      <p className="chat-meta chat-meta-other">{msg.senderName}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className="chat-time">
                      {formatTime(msg.createdAt)}
                      {msg._pending ? " · đang gửi" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={(e) => void sendMessage(e)} className="chat-input-bar">
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              maxLength={2000}
              placeholder={
                room.kind === "group" ? "Nhắn chat chung..." : "Nhắn tin riêng..."
              }
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                resizeInput(e.target);
              }}
              onKeyDown={handleKeyDown}
              enterKeyHint="send"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!text.trim()}
              aria-label="Gửi"
            >
              <IconSend className="h-5 w-5" />
            </button>
          </form>

          {error && <p className="chat-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export const ChatPanel = SimpleChat;
