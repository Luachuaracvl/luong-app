"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "EMPLOYEE";
  text: string;
  createdAt: string;
  _pending?: boolean;
};

type ChatMember = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
  isActive: boolean;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return prev;
  const ids = new Set(prev.map((m) => m.id));
  const merged = [...prev];
  for (const m of incoming) {
    if (!ids.has(m.id)) merged.push(m);
  }
  return merged;
}

export function ChatPanel({
  currentUser,
}: {
  currentUser: {
    id: string;
    name: string;
    role: "ADMIN" | "EMPLOYEE";
    avatarUrl?: string | null;
  };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  const avatarByUserId = useMemo(
    () => new Map(members.map((m) => [m.id, m.avatarUrl ?? null])),
    [members]
  );

  const getAvatar = useCallback(
    (userId: string) => {
      if (userId === currentUser.id) {
        return currentUser.avatarUrl ?? avatarByUserId.get(userId) ?? null;
      }
      return avatarByUserId.get(userId) ?? null;
    },
    [avatarByUserId, currentUser.avatarUrl, currentUser.id]
  );

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) {
          if (!cancelled) setError("Không thể tải tin nhắn");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setMessages(data.messages ?? []);
        setMembers(data.members ?? []);
        const last = (data.messages as ChatMessage[] | undefined)?.at(-1);
        lastMessageAtRef.current = last?.createdAt ?? null;
      } catch {
        if (!cancelled) setError("Không thể kết nối server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const pollMessages = async () => {
      const since = lastMessageAtRef.current;
      const url = since
        ? `/api/chat?since=${encodeURIComponent(since)}`
        : "/api/chat";

      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        if (since) {
          if (!data.messages?.length) return;
          setMessages((prev) => {
            const merged = mergeMessages(prev, data.messages);
            const last = merged.filter((m) => !m._pending).at(-1);
            lastMessageAtRef.current = last?.createdAt ?? since;
            return merged;
          });
          return;
        }

        setMessages(data.messages ?? []);
        setMembers(data.members ?? []);
        const last = (data.messages as ChatMessage[] | undefined)?.at(-1);
        lastMessageAtRef.current = last?.createdAt ?? null;
      } catch {
        /* ignore poll errors */
      }
    };

    const messageTimer = window.setInterval(pollMessages, 4000);
    return () => window.clearInterval(messageTimer);
  }, []);

  useEffect(() => {
    const refreshMembers = async () => {
      try {
        const res = await fetch("/api/chat/members");
        if (!res.ok) return;
        const data = await res.json();
        setMembers(data.members ?? []);
      } catch {
        /* ignore */
      }
    };

    const memberTimer = window.setInterval(refreshMembers, 60_000);
    return () => window.clearInterval(memberTimer);
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError("");
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: trimmed,
      createdAt: new Date().toISOString(),
      _pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(trimmed);
        setError(data.error || "Gửi tin nhắn thất bại");
        return;
      }
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? data.message : m));
        const last = next.filter((m) => !m._pending).at(-1);
        lastMessageAtRef.current = last?.createdAt ?? lastMessageAtRef.current;
        return next;
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
      setError("Không thể kết nối server");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <div className="chat-shell">
        <div className="chat-members">
          {members.length === 0 && loading ? (
            <p className="text-xs text-slate-400">Đang tải thành viên...</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="chat-member" title={m.name}>
                <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                <span className="chat-member-name">{m.name.split(" ")[0]}</span>
              </div>
            ))
          )}
        </div>

        <div className="chat-messages">
          {loading && (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-14 animate-pulse rounded-2xl bg-slate-100 ${i % 2 === 0 ? "ml-auto w-2/5" : "w-3/5"}`}
                />
              ))}
            </div>
          )}
          {!loading && messages.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Chưa có tin nhắn. Hãy bắt đầu trò chuyện với team!
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`chat-bubble-row ${isMe ? "chat-bubble-row-me" : ""}`}
              >
                {!isMe && (
                  <UserAvatar
                    name={msg.senderName}
                    avatarUrl={getAvatar(msg.senderId)}
                    size="sm"
                  />
                )}
                <div
                  className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-other"} ${msg._pending ? "opacity-70" : ""}`}
                >
                  {!isMe && (
                    <p className="chat-meta chat-meta-other">
                      {msg.senderName}
                      {msg.senderRole === "ADMIN" && (
                        <span className="badge badge-blue ml-1 py-0">Admin</span>
                      )}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`chat-time ${isMe ? "text-indigo-100" : "text-slate-400"}`}>
                    {formatTime(msg.createdAt)}
                    {msg._pending ? " · đang gửi" : ""}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-bar">
          <input
            className="input"
            placeholder="Nhập tin nhắn..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            disabled={sending || loading}
          />
          <button
            type="submit"
            className="btn btn-primary shrink-0"
            disabled={sending || loading || !text.trim()}
          >
            Gửi
          </button>
        </form>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
