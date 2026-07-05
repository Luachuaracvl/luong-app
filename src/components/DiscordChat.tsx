"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QUICK_REACTIONS } from "@/lib/chat-room";
import { cacheAvatars } from "@/lib/avatar-cache";
import { AvatarWithStatus } from "./OnlineStatus";
import { useOnlineCount } from "./PresenceProvider";
import { UserAvatar } from "./UserAvatar";

type ChatMember = {
  id: string;
  name: string;
  username?: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
  isActive: boolean;
};

type Channel = {
  id: string;
  name: string;
  slug: string;
  description: string;
  adminOnly: boolean;
  isDefault?: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "EMPLOYEE";
  senderAvatarUrl?: string | null;
  text: string;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToText?: string | null;
  mentions?: string[];
  reactions?: Record<string, string[]>;
  edited?: boolean;
  recalled?: boolean;
  createdAt: string;
  _pending?: boolean;
};

type ChatView =
  | { type: "channel"; channelId: string; label: string }
  | { type: "dm"; userId: string; label: string };

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
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

function chatQuery(view: ChatView) {
  return view.type === "channel"
    ? `channelId=${encodeURIComponent(view.channelId)}`
    : `dmUserId=${encodeURIComponent(view.userId)}`;
}

export function DiscordChat({
  currentUser,
}: {
  currentUser: {
    id: string;
    name: string;
    role: "ADMIN" | "EMPLOYEE";
    avatarUrl?: string | null;
  };
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [view, setView] = useState<ChatView>({
    type: "channel",
    channelId: "general",
    label: "chung",
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const lastSyncAtRef = useRef<string>(new Date().toISOString());
  const onlineCount = useOnlineCount();

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const loadRoom = useCallback(async (nextView: ChatView) => {
    setLoading(true);
    setError("");
    setReplyTo(null);
    setEditingId(null);
    lastMessageAtRef.current = null;
    lastSyncAtRef.current = new Date().toISOString();

    try {
      const res = await fetch(`/api/chat?${chatQuery(nextView)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải tin nhắn");
        setMessages([]);
        return;
      }
      const list = (data.messages ?? []) as ChatMessage[];
      setMessages(list);
      const last = list.at(-1);
      lastMessageAtRef.current = last?.createdAt ?? null;
    } catch {
      setError("Không thể kết nối server");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetch("/api/chat/channels"), fetch("/api/chat/members")])
      .then(async ([chRes, memRes]) => {
        if (chRes.ok) {
          const chData = await chRes.json();
          setChannels(chData.channels ?? []);
        }
        if (memRes.ok) {
          const memData = await memRes.json();
          const list = memData.members ?? [];
          setMembers(list);
          cacheAvatars(list.map((m: ChatMember) => ({ userId: m.id, avatarUrl: m.avatarUrl })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRoom(view);
  }, [view, loadRoom]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, view, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const poll = async () => {
      const since = lastMessageAtRef.current;
      const syncSince = lastSyncAtRef.current;
      const base = chatQuery(view);
      const url = since
        ? `/api/chat?${base}&since=${encodeURIComponent(since)}&syncSince=${encodeURIComponent(syncSince)}`
        : `/api/chat?${base}`;

      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        lastSyncAtRef.current = new Date().toISOString();
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
  }, [view]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const reply = replyTo;
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatarUrl: currentUser.avatarUrl,
      text: trimmed,
      replyToId: reply?.id ?? null,
      replyToName: reply?.senderName ?? null,
      replyToText: reply?.text?.slice(0, 120) ?? null,
      reactions: {},
      createdAt: new Date().toISOString(),
      _pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setReplyTo(null);
    setError("");

    try {
      const body: Record<string, unknown> = {
        text: trimmed,
        avatarUrl: currentUser.avatarUrl ?? null,
        replyToId: reply?.id ?? null,
      };
      if (view.type === "channel") body.channelId = view.channelId;
      else body.dmUserId = view.userId;

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
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setError("Không thể kết nối server");
    }
  }

  async function reactToMessage(messageId: string, emoji: string) {
    if (messageId.startsWith("temp-")) return;
    try {
      const res = await fetch(`/api/chat/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", emoji }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? (data.message as ChatMessage) : m))
        );
      }
    } catch {
      /* ignore */
    }
  }

  async function saveEdit(messageId: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/chat/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể sửa tin nhắn");
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? (data.message as ChatMessage) : m))
      );
      setEditingId(null);
      setEditText("");
    } catch {
      setError("Không thể kết nối server");
    }
  }

  async function recallMessage(messageId: string) {
    if (messageId.startsWith("temp-")) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      return;
    }
    const prevMsg = messages.find((m) => m.id === messageId);
    if (!prevMsg) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, recalled: true, text: "" } : m))
    );
    try {
      const res = await fetch(`/api/chat/${messageId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? prevMsg : m)));
        setError(data.error || "Không thể thu hồi");
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? (data.message as ChatMessage) : m))
        );
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? prevMsg : m)));
    }
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo kênh");
        return;
      }
      setChannels((prev) => [...prev, data.channel]);
      setNewChannelName("");
      setView({ type: "channel", channelId: data.channel.id, label: data.channel.name });
      setShowMobileSidebar(false);
    } catch {
      setError("Không thể kết nối server");
    }
  }

  function selectChannel(channel: Channel) {
    setView({ type: "channel", channelId: channel.id, label: channel.name });
    setShowMobileSidebar(false);
  }

  function selectDm(member: ChatMember) {
    setView({ type: "dm", userId: member.id, label: member.name });
    setShowMobileSidebar(false);
  }

  function renderMessageText(msg: ChatMessage) {
    if (msg.recalled) {
      return <p className="discord-msg-recalled">Tin nhắn đã được thu hồi</p>;
    }
    let content = msg.text;
    for (const member of members) {
      if (!member.username) continue;
      content = content.replace(
        new RegExp(`@${member.username}\\b`, "gi"),
        `@${member.name}`
      );
    }
    const parts = content.split(/(@[^\s]+)/g);
    return (
      <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
        {parts.map((part, i) =>
          part.startsWith("@") ? (
            <span key={i} className="discord-mention">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  }

  const channelDescription =
    view.type === "channel"
      ? channels.find((c) => c.id === view.channelId)?.description
      : "Tin nhắn riêng tư";

  return (
    <div className="discord-chat">
      {showMobileSidebar && (
        <button
          type="button"
          className="discord-overlay lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
          aria-label="Đóng menu"
        />
      )}

      <aside className={`discord-sidebar ${showMobileSidebar ? "discord-sidebar-open" : ""}`}>
        <div className="discord-sidebar-header">
          <p className="font-bold text-slate-900">Chat nhóm</p>
          <p className="text-xs text-slate-500">{onlineCount} đang online</p>
        </div>

        <div className="discord-sidebar-section">
          <p className="discord-sidebar-label">Kênh văn bản</p>
          {channels.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => selectChannel(ch)}
              className={`discord-nav-item ${
                view.type === "channel" && view.channelId === ch.id
                  ? "discord-nav-item-active"
                  : ""
              }`}
            >
              <span className="text-slate-400">#</span>
              {ch.name}
              {ch.adminOnly && <span className="ml-auto text-[10px] text-amber-600">Admin</span>}
            </button>
          ))}
        </div>

        <div className="discord-sidebar-section">
          <p className="discord-sidebar-label">Tin nhắn riêng</p>
          {members
            .filter((m) => m.id !== currentUser.id)
            .map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectDm(m)}
                className={`discord-nav-item ${
                  view.type === "dm" && view.userId === m.id ? "discord-nav-item-active" : ""
                }`}
              >
                <AvatarWithStatus userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                <span className="truncate">{m.name}</span>
              </button>
            ))}
        </div>

        {currentUser.role === "ADMIN" && (
          <form onSubmit={createChannel} className="discord-sidebar-section border-t border-slate-200 p-3">
            <p className="discord-sidebar-label mb-2">Tạo kênh mới</p>
            <input
              className="input mb-2"
              placeholder="ten-kenh"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary w-full text-xs">
              + Tạo kênh
            </button>
          </form>
        )}
      </aside>

      <div className="discord-main">
        <header className="discord-header">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary px-2 py-1 text-xs lg:hidden"
              onClick={() => setShowMobileSidebar(true)}
            >
              ☰
            </button>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {view.type === "channel" ? `# ${view.label}` : `@ ${view.label}`}
              </p>
              <p className="truncate text-xs text-slate-500">{channelDescription}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary px-2 py-1 text-xs md:hidden"
            onClick={() => setShowMembers((v) => !v)}
          >
            👥
          </button>
        </header>

        <div className="discord-main-body">
          <div className="discord-messages">
            {loading && (
              <p className="py-8 text-center text-sm text-slate-400">Đang tải tin nhắn...</p>
            )}
            {!loading && messages.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
              </p>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const isEditing = editingId === msg.id;
              return (
                <div key={msg.id} className="discord-message group">
                  <UserAvatar
                    name={msg.senderName}
                    avatarUrl={msg.senderAvatarUrl}
                    userId={msg.senderId}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">{msg.senderName}</span>
                      {msg.senderRole === "ADMIN" && (
                        <span className="badge badge-blue py-0 text-[10px]">Admin</span>
                      )}
                      <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                      {msg.edited && !msg.recalled && (
                        <span className="text-[10px] text-slate-400">(đã sửa)</span>
                      )}
                      {msg._pending && (
                        <span className="text-[10px] text-slate-400">đang gửi...</span>
                      )}
                    </div>

                    {msg.replyToName && !msg.recalled && (
                      <div className="discord-reply">
                        <span className="font-medium">{msg.replyToName}</span>
                        <span className="line-clamp-1 text-slate-500">{msg.replyToText}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="mt-1 space-y-2">
                        <input
                          className="input"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-primary px-2 py-1 text-xs" onClick={() => void saveEdit(msg.id)}>
                            Lưu
                          </button>
                          <button type="button" className="btn btn-secondary px-2 py-1 text-xs" onClick={() => setEditingId(null)}>
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      renderMessageText(msg)
                    )}

                    {!msg.recalled && Object.keys(msg.reactions ?? {}).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(msg.reactions ?? {}).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => void reactToMessage(msg.id, emoji)}
                            className={`discord-reaction ${
                              users.includes(currentUser.id) ? "discord-reaction-active" : ""
                            }`}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}

                    {!msg.recalled && !isEditing && (
                      <div className="discord-msg-actions">
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="discord-action-btn"
                            onClick={() => void reactToMessage(msg.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button type="button" className="discord-action-btn" onClick={() => setReplyTo(msg)}>
                          Trả lời
                        </button>
                        {isMe && !msg._pending && (
                          <>
                            <button
                              type="button"
                              className="discord-action-btn"
                              onClick={() => {
                                setEditingId(msg.id);
                                setEditText(msg.text);
                              }}
                            >
                              Sửa
                            </button>
                            <button type="button" className="discord-action-btn" onClick={() => void recallMessage(msg.id)}>
                              Thu hồi
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <aside className={`discord-members ${showMembers ? "discord-members-open" : ""}`}>
            <p className="discord-sidebar-label mb-3 px-2">Thành viên — {onlineCount} online</p>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => m.id !== currentUser.id && selectDm(m)}
                className="discord-member-row"
              >
                <AvatarWithStatus userId={m.id} name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {m.role === "ADMIN" ? "Admin" : "Nhân viên"}
                  </p>
                </div>
              </button>
            ))}
          </aside>
        </div>

        {replyTo && (
          <div className="discord-reply-bar">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-indigo-700">Trả lời {replyTo.senderName}</p>
              <p className="truncate text-xs text-slate-500">{replyTo.text}</p>
            </div>
            <button type="button" className="btn btn-secondary px-2 py-1 text-xs" onClick={() => setReplyTo(null)}>
              ✕
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="discord-input-bar">
          <input
            className="input"
            placeholder={
              view.type === "channel"
                ? `Nhắn tin #${view.label} · @username để tag`
                : `Nhắn tin @${view.label}`
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={!text.trim()}>
            Gửi
          </button>
        </form>
      </div>

      {error && (
        <p className="absolute bottom-16 left-4 right-4 z-10 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 shadow-sm ring-1 ring-red-100 lg:bottom-4">
          {error}
        </p>
      )}
    </div>
  );
}

export const ChatPanel = DiscordChat;
