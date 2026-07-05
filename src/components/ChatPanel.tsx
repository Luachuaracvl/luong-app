"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "EMPLOYEE";
  senderAvatarUrl?: string | null;
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
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const loadMessages = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const last = messages[messages.length - 1];
      const url =
        !initial && last && !last._pending
          ? `/api/chat?since=${encodeURIComponent(last.createdAt)}`
          : "/api/chat";

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (initial) {
        setMessages(data.messages ?? []);
      } else if (data.messages?.length) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of data.messages as ChatMessage[]) {
            if (!ids.has(m.id)) merged.push(m);
          }
          return merged;
        });
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    fetch("/api/chat/members")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members ?? []);
        }
      })
      .catch(() => {});

    fetch("/api/chat")
      .then(async (res) => {
        if (!res.ok) {
          setError("Không thể tải tin nhắn");
          return;
        }
        const data = await res.json();
        setMessages(data.messages ?? []);
      })
      .catch(() => setError("Không thể kết nối server"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const last = messages.filter((m) => !m._pending).at(-1);
      const url = last
        ? `/api/chat?since=${encodeURIComponent(last.createdAt)}`
        : "/api/chat";
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.messages?.length) return;
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of data.messages as ChatMessage[]) {
            if (!ids.has(m.id)) merged.push(m);
          }
          return merged;
        });
      } catch {
        /* ignore poll errors */
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [messages]);

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
      senderAvatarUrl: currentUser.avatarUrl,
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
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m))
      );
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
          {members.map((m) => (
            <div key={m.id} className="chat-member" title={m.name}>
              <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
              <span className="chat-member-name">{m.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        <div ref={listRef} className="chat-messages">
          {loading && (
            <p className="text-center text-sm text-slate-400">Đang tải tin nhắn...</p>
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
                    avatarUrl={msg.senderAvatarUrl}
                    size="sm"
                  />
                )}
                <div className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-other"} ${msg._pending ? "opacity-70" : ""}`}>
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
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={sending || !text.trim()}>
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
