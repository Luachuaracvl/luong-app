"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readChatClientCache,
  writeChatClientCache,
  type CachedChatMember,
  type CachedChatMessage,
} from "@/lib/chat-client-cache";
import { UserAvatar } from "./UserAvatar";

type ChatMessage = CachedChatMessage & { _pending?: boolean };
type ChatMember = CachedChatMember;

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  if (!incoming.length) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) {
    byId.set(m.id, m);
  }
  return sortMessages([...byId.values()]);
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
  const initialCacheRef = useRef(readChatClientCache(currentUser.id));
  const initialCache = initialCacheRef.current;
  const [messages, setMessages] = useState<ChatMessage[]>(initialCache?.messages ?? []);
  const [members, setMembers] = useState<ChatMember[]>(initialCache?.members ?? []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(!initialCache?.messages.length);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageAtRef = useRef<string | null>(
    initialCache?.messages.at(-1)?.createdAt ?? null
  );
  const lastSyncAtRef = useRef<string>(new Date().toISOString());
  const membersRef = useRef(members);
  membersRef.current = members;

  const persistCache = useCallback(
    (nextMessages: ChatMessage[], nextMembers: ChatMember[]) => {
      writeChatClientCache(currentUser.id, nextMessages, nextMembers);
    },
    [currentUser.id]
  );

  const updateMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        persistCache(next, membersRef.current);
        const last = next.filter((m) => !m._pending && !m.recalled).at(-1)
          ?? next.filter((m) => !m._pending).at(-1);
        if (last) lastMessageAtRef.current = last.createdAt;
        return next;
      });
    },
    [persistCache]
  );

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshFromServer() {
      if (!initialCache?.messages.length) setLoading(true);
      else setSyncing(true);

      try {
        const [membersRes, messagesRes] = await Promise.all([
          fetch("/api/chat/members"),
          fetch("/api/chat"),
        ]);

        if (cancelled) return;

        let nextMembers: ChatMember[] | undefined;
        let nextMessages: ChatMessage[] | undefined;

        if (membersRes.ok) {
          const data = await membersRes.json();
          nextMembers = (data.members ?? []) as ChatMember[];
          setMembers(nextMembers);
        }

        if (messagesRes.ok) {
          const data = await messagesRes.json();
          nextMessages = (data.messages ?? []) as ChatMessage[];
          setMessages(nextMessages);
          const last = nextMessages.at(-1);
          lastMessageAtRef.current = last?.createdAt ?? null;
          lastSyncAtRef.current = new Date().toISOString();
        } else if (!initialCache?.messages.length) {
          setError("Không thể tải tin nhắn");
        }

        if (nextMembers && nextMessages) {
          persistCache(nextMessages, nextMembers);
        }
      } catch {
        if (!cancelled && !initialCache?.messages.length) {
          setError("Không thể kết nối server");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSyncing(false);
        }
      }
    }

    refreshFromServer();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  useEffect(() => {
    if (!loading) scrollToBottom(false);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const pollMessages = async () => {
      const since = lastMessageAtRef.current;
      const syncSince = lastSyncAtRef.current;
      const url = since
        ? `/api/chat?since=${encodeURIComponent(since)}&syncSince=${encodeURIComponent(syncSince)}`
        : "/api/chat";

      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        lastSyncAtRef.current = new Date().toISOString();

        if (since) {
          if (!data.messages?.length) return;
          updateMessages((prev) => mergeMessages(prev, data.messages));
          return;
        }

        const nextMessages = (data.messages ?? []) as ChatMessage[];
        setMessages(nextMessages);
        const last = nextMessages.at(-1);
        lastMessageAtRef.current = last?.createdAt ?? null;
        persistCache(nextMessages, membersRef.current);
      } catch {
        /* ignore poll errors */
      }
    };

    const timer = window.setInterval(pollMessages, 3000);
    return () => window.clearInterval(timer);
  }, [persistCache, updateMessages]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setError("");
    setText("");

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

    updateMessages((prev) => [...prev, optimistic]);

    void (async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            avatarUrl: currentUser.avatarUrl ?? null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          updateMessages((prev) => prev.filter((m) => m.id !== tempId));
          setText(trimmed);
          setError(data.error || "Gửi tin nhắn thất bại");
          return;
        }
        updateMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data.message as ChatMessage) : m))
        );
      } catch {
        updateMessages((prev) => prev.filter((m) => m.id !== tempId));
        setText(trimmed);
        setError("Không thể kết nối server");
      }
    })();
  }

  async function recallMessage(messageId: string) {
    if (messageId.startsWith("temp-")) {
      updateMessages((prev) => prev.filter((m) => m.id !== messageId));
      return;
    }

    const previous = messages.find((m) => m.id === messageId);
    if (!previous || previous.recalled) return;

    updateMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, recalled: true, text: "" } : m
      )
    );

    try {
      const res = await fetch(`/api/chat/${messageId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        updateMessages((prev) =>
          prev.map((m) => (m.id === messageId ? previous : m))
        );
        setError(data.error || "Không thể thu hồi tin nhắn");
        return;
      }
      updateMessages((prev) =>
        prev.map((m) => (m.id === messageId ? (data.message as ChatMessage) : m))
      );
    } catch {
      updateMessages((prev) =>
        prev.map((m) => (m.id === messageId ? previous : m))
      );
      setError("Không thể kết nối server");
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

        <div className="chat-messages">
          {loading && (
            <p className="text-center text-sm text-slate-400">Đang tải tin nhắn...</p>
          )}
          {syncing && !loading && (
            <p className="text-center text-xs text-slate-400">Đang đồng bộ...</p>
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
                  {msg.recalled ? (
                    <p className="chat-recalled">Tin nhắn đã được thu hồi</p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  )}
                  <div className={`chat-footer ${isMe ? "chat-footer-me" : ""}`}>
                    <p className={`chat-time ${isMe ? "text-indigo-100" : "text-slate-400"}`}>
                      {formatTime(msg.createdAt)}
                      {msg._pending ? " · đang gửi" : ""}
                    </p>
                    {isMe && !msg._pending && !msg.recalled && (
                      <button
                        type="button"
                        onClick={() => void recallMessage(msg.id)}
                        className="chat-recall-btn"
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
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
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={!text.trim()}>
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
