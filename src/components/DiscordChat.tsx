"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUICK_REACTIONS } from "@/lib/chat-room";
import { cacheAvatars } from "@/lib/avatar-cache";
import {
  IconChevronDown,
  IconChevronLeft,
  IconClose,
  IconDots,
  IconHash,
  IconPlus,
  IconSearch,
  IconSend,
  IconSmile,
  IconUsers,
} from "./Icons";
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

type MessageRow =
  | { kind: "date"; key: string; label: string }
  | { kind: "msg"; key: string; msg: ChatMessage; compact: boolean };

const GROUP_MS = 7 * 60_000;

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hôm nay";
  if (d.toDateString() === yesterday.toDateString()) return "Hôm qua";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function buildMessageRows(messages: ChatMessage[]): MessageRow[] {
  const rows: MessageRow[] = [];
  let lastDate = "";

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== lastDate) {
      lastDate = dateKey;
      rows.push({
        kind: "date",
        key: `date-${dateKey}`,
        label: formatDateDivider(msg.createdAt),
      });
    }

    const prev = messages[i - 1];
    const compact =
      !!prev &&
      prev.senderId === msg.senderId &&
      sameDay(prev.createdAt, msg.createdAt) &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;

    rows.push({ kind: "msg", key: msg.id, msg, compact });
  }

  return rows;
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
  const [mobilePane, setMobilePane] = useState<"list" | "room">("list");
  const [showMembers, setShowMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const lastSyncAtRef = useRef<string>(new Date().toISOString());
  const onlineCount = useOnlineCount();

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const messageRows = useMemo(
    () => buildMessageRows(filteredMessages),
    [filteredMessages]
  );

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const loadRoom = useCallback(async (nextView: ChatView) => {
    setLoading(true);
    setError("");
    setReplyTo(null);
    setEditingId(null);
    setShowSearch(false);
    setSearchQuery("");
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

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
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
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

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

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function autoResizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function reactToMessage(messageId: string, emoji: string) {
    if (messageId.startsWith("temp-")) return;
    setActionMsg(null);
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
    setActionMsg(null);
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
      openRoom({ type: "channel", channelId: data.channel.id, label: data.channel.name });
    } catch {
      setError("Không thể kết nối server");
    }
  }

  function openRoom(nextView: ChatView) {
    setView(nextView);
    setMobilePane("room");
    setShowMembers(false);
  }

  function selectChannel(channel: Channel) {
    openRoom({ type: "channel", channelId: channel.id, label: channel.name });
  }

  function selectDm(member: ChatMember) {
    openRoom({ type: "dm", userId: member.id, label: member.name });
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
      <div className="discord-message-body whitespace-pre-wrap break-words">
        {parts.map((part, i) =>
          part.startsWith("@") ? (
            <span key={i} className="discord-mention">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
    );
  }

  function renderMessageActions(msg: ChatMessage, isMe: boolean, mobile = false) {
    if (msg.recalled || editingId === msg.id) return null;
    const cls = mobile ? "discord-msg-actions-mobile" : "discord-msg-actions";

    return (
      <div className={cls}>
        {QUICK_REACTIONS.slice(0, mobile ? 4 : 6).map((emoji) => (
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
                setActionMsg(null);
              }}
            >
              Sửa
            </button>
            <button
              type="button"
              className="discord-action-btn"
              onClick={() => void recallMessage(msg.id)}
            >
              Thu hồi
            </button>
          </>
        )}
      </div>
    );
  }

  const channelDescription =
    view.type === "channel"
      ? channels.find((c) => c.id === view.channelId)?.description
      : "Tin nhắn riêng tư";

  const roomTitle =
    view.type === "channel" ? `#${view.label}` : `@${view.label}`;

  const sidebarPaneClass = mobilePane === "list" ? "discord-pane-active" : "";
  const mainPaneClass = mobilePane === "room" ? "discord-pane-active" : "";

  return (
    <div className="discord-chat">
      {/* Sidebar — channel list */}
      <aside className={`discord-sidebar ${sidebarPaneClass}`}>
        <div className="discord-sidebar-header">
          <p className="text-base font-bold text-slate-900">Tin nhắn</p>
          <p className="text-xs text-slate-500">{onlineCount} online</p>
        </div>

        <div className="discord-sidebar-section">
          <p className="discord-sidebar-label">Kênh</p>
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
              <IconHash className="discord-nav-hash h-5 w-5 shrink-0" />
              <span className="truncate">{ch.name}</span>
              {ch.adminOnly && (
                <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  Admin
                </span>
              )}
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
          <form
            onSubmit={createChannel}
            className="discord-sidebar-section border-t border-slate-200 p-3"
          >
            <p className="discord-sidebar-label mb-2">Tạo kênh mới</p>
            <input
              className="input mb-2 text-sm"
              placeholder="ten-kenh"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary w-full text-xs">
              <IconPlus className="h-4 w-4" />
              Tạo kênh
            </button>
          </form>
        )}
      </aside>

      {/* Main chat room */}
      <div className={`discord-main ${mainPaneClass}`}>
        <header className="discord-header">
          <button
            type="button"
            className="discord-header-back"
            onClick={() => setMobilePane("list")}
            aria-label="Danh sách kênh"
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>

          <div className="discord-header-title">
            <div className="discord-header-name">
              {view.type === "channel" ? (
                <IconHash className="h-5 w-5 shrink-0 text-slate-400" />
              ) : null}
              <span className="truncate">{roomTitle}</span>
              <IconChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
            </div>
            <div className="discord-header-meta">
              <span className="discord-header-dot" />
              <span>
                {onlineCount} online · {members.length} thành viên
              </span>
            </div>
          </div>

          <div className="discord-header-actions">
            <button
              type="button"
              className="discord-icon-btn"
              onClick={() => setShowSearch((v) => !v)}
              aria-label="Tìm kiếm"
            >
              <IconSearch className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="discord-icon-btn xl:hidden"
              onClick={() => setShowMembers(true)}
              aria-label="Thành viên"
            >
              <IconUsers className="h-5 w-5" />
            </button>
          </div>
        </header>

        {showSearch && (
          <div className="discord-search-bar">
            <input
              className="input py-2 text-sm"
              placeholder="Tìm trong cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="discord-main-body">
          <div className="discord-messages">
            {loading && (
              <div className="discord-empty">
                <p className="text-sm text-slate-400">Đang tải tin nhắn...</p>
              </div>
            )}

            {!loading && messages.length === 0 && (
              <div className="discord-empty">
                <div className="discord-empty-icon">
                  {view.type === "channel" ? "#" : "@"}
                </div>
                <p className="font-semibold text-slate-800">
                  Chào mừng đến {roomTitle}
                </p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  {channelDescription || "Đây là điểm bắt đầu cuộc trò chuyện của bạn."}
                </p>
              </div>
            )}

            {!loading && messages.length > 0 && filteredMessages.length === 0 && (
              <div className="discord-empty">
                <p className="text-sm text-slate-500">Không tìm thấy tin nhắn phù hợp.</p>
              </div>
            )}

            {messageRows.map((row) => {
              if (row.kind === "date") {
                return (
                  <div key={row.key} className="discord-date-divider">
                    <span>{row.label}</span>
                  </div>
                );
              }

              const { msg, compact } = row;
              const isMe = msg.senderId === currentUser.id;
              const isEditing = editingId === msg.id;

              return (
                <div
                  key={row.key}
                  className={`discord-message group ${compact ? "discord-message-compact" : ""}`}
                >
                  {compact ? (
                    <div className="discord-message-avatar-spacer" />
                  ) : (
                    <UserAvatar
                      name={msg.senderName}
                      avatarUrl={msg.senderAvatarUrl}
                      userId={msg.senderId}
                      size="sm"
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    {!compact && (
                      <div className="discord-message-header">
                        <span className="discord-message-name">{msg.senderName}</span>
                        {msg.senderRole === "ADMIN" && (
                          <span className="badge badge-blue py-0 text-[10px]">Admin</span>
                        )}
                        <span className="discord-message-time">{formatTime(msg.createdAt)}</span>
                        {msg.edited && !msg.recalled && (
                          <span className="text-[10px] text-slate-400">(đã sửa)</span>
                        )}
                        {msg._pending && (
                          <span className="text-[10px] text-slate-400">đang gửi...</span>
                        )}
                      </div>
                    )}

                    {compact && (
                      <span className="discord-message-time mb-0.5 hidden group-hover:inline">
                        {formatTime(msg.createdAt)}
                      </span>
                    )}

                    {msg.replyToName && !msg.recalled && (
                      <div className="discord-reply">
                        <span className="font-semibold text-indigo-700">{msg.replyToName}</span>
                        <span className="line-clamp-2 text-slate-500">{msg.replyToText}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="mt-1 space-y-2">
                        <textarea
                          className="input min-h-[40px] resize-none text-sm"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-primary px-3 py-1.5 text-xs"
                            onClick={() => void saveEdit(msg.id)}
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary px-3 py-1.5 text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      renderMessageText(msg)
                    )}

                    {!msg.recalled && Object.keys(msg.reactions ?? {}).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
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

                    {renderMessageActions(msg, isMe, false)}

                    <button
                      type="button"
                      className="discord-msg-more lg:hidden"
                      onClick={() => setActionMsg(msg)}
                      aria-label="Tùy chọn tin nhắn"
                    >
                      <IconDots className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <aside className="discord-members">
            <div className="sticky top-0 border-b border-slate-200/80 bg-slate-50/80 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Thành viên — {onlineCount} online
              </p>
            </div>
            <div className="p-2">
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
            </div>
          </aside>
        </div>

        {replyTo && (
          <div className="discord-reply-bar">
            <div className="min-w-0 flex-1 border-l-[3px] border-indigo-500 pl-2">
              <p className="text-xs font-semibold text-indigo-700">
                Trả lời {replyTo.senderName}
              </p>
              <p className="truncate text-xs text-slate-500">{replyTo.text}</p>
            </div>
            <button
              type="button"
              className="discord-icon-btn"
              onClick={() => setReplyTo(null)}
              aria-label="Hủy trả lời"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => void sendMessage(e)}
          className="discord-composer"
        >
          <button type="button" className="discord-composer-btn" tabIndex={-1} aria-hidden>
            <IconPlus className="h-5 w-5" />
          </button>

          <div className="discord-composer-field">
            <textarea
              ref={inputRef}
              className="discord-composer-input"
              placeholder={
                view.type === "channel"
                  ? `Nhắn #${view.label}`
                  : `Nhắn @${view.label}`
              }
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                autoResizeTextarea(e.target);
              }}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              maxLength={2000}
            />
            <button
              type="button"
              className="discord-composer-btn mr-0.5"
              onClick={() => setText((t) => t + "😊")}
              aria-label="Emoji"
            >
              <IconSmile className="h-5 w-5" />
            </button>
          </div>

          <button
            type="submit"
            className="discord-composer-send"
            disabled={!text.trim()}
            aria-label="Gửi"
          >
            <IconSend className="h-5 w-5" />
          </button>
        </form>
      </div>

      {/* Mobile members sheet */}
      {showMembers && (
        <>
          <button
            type="button"
            className="discord-overlay xl:hidden"
            onClick={() => setShowMembers(false)}
            aria-label="Đóng"
          />
          <div className="discord-members-sheet">
            <div className="discord-members-sheet-header">
              <p className="font-semibold text-slate-900">Thành viên</p>
              <button
                type="button"
                className="discord-icon-btn"
                onClick={() => setShowMembers(false)}
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id !== currentUser.id) selectDm(m);
                    setShowMembers(false);
                  }}
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
            </div>
          </div>
        </>
      )}

      {/* Mobile message action sheet */}
      {actionMsg && (
        <>
          <button
            type="button"
            className="discord-overlay"
            onClick={() => setActionMsg(null)}
            aria-label="Đóng"
          />
          <div className="discord-action-sheet">
            <div className="discord-action-sheet-handle" />
            <div className="px-4 pb-4">
              <p className="mb-3 text-center text-xs text-slate-500">
                {actionMsg.senderName} · {formatTime(actionMsg.createdAt)}
              </p>
              {renderMessageActions(actionMsg, actionMsg.senderId === currentUser.id, true)}
            </div>
          </div>
        </>
      )}

      {error && <p className="discord-toast-error">{error}</p>}
    </div>
  );
}

export const ChatPanel = DiscordChat;
