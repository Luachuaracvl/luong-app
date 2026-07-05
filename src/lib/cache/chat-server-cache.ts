import type { ChatMemberSummary } from "@/lib/db/users";
import type { ChatMessageDoc } from "@/lib/types";

type CachedMessages = (ChatMessageDoc & { id: string })[];

const MESSAGES_TTL_MS = 4_000;
const MEMBERS_TTL_MS = 30_000;

let messagesCache: { data: CachedMessages; expiresAt: number } | null = null;
let membersCache: { data: ChatMemberSummary[]; expiresAt: number } | null = null;

export function getCachedRecentMessages(): CachedMessages | null {
  if (!messagesCache || Date.now() > messagesCache.expiresAt) return null;
  return messagesCache.data;
}

export function setCachedRecentMessages(data: CachedMessages) {
  messagesCache = { data, expiresAt: Date.now() + MESSAGES_TTL_MS };
}

export function getCachedMembers(): ChatMemberSummary[] | null {
  if (!membersCache || Date.now() > membersCache.expiresAt) return null;
  return membersCache.data;
}

export function setCachedMembers(data: ChatMemberSummary[]) {
  membersCache = { data, expiresAt: Date.now() + MEMBERS_TTL_MS };
}

export function invalidateMessagesCache() {
  messagesCache = null;
}

export function appendMessageToCache(message: ChatMessageDoc & { id: string }) {
  const cached = getCachedRecentMessages();
  if (!cached) return;
  const next = [...cached, message].slice(-80);
  setCachedRecentMessages(next);
}

export function mergeSinceIntoCache(
  since: Date,
  incoming: (ChatMessageDoc & { id: string })[]
) {
  if (!incoming.length) return;
  const cached = getCachedRecentMessages();
  if (!cached) return;
  const sinceMs = since.getTime();
  const base = cached.filter((m) => {
    const ms = m.createdAt?.toMillis?.() ?? 0;
    return ms <= sinceMs;
  });
  const ids = new Set(base.map((m) => m.id));
  for (const m of incoming) {
    if (!ids.has(m.id)) base.push(m);
  }
  setCachedRecentMessages(base.slice(-80));
}
