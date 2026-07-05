import type { ChatMemberSummary } from "@/lib/db/users";
import type { ChatMessageDoc } from "@/lib/types";

type CachedMessages = (ChatMessageDoc & { id: string })[];

const MESSAGES_TTL_MS = 4_000;
const MEMBERS_TTL_MS = 30_000;

const messagesCache = new Map<string, { data: CachedMessages; expiresAt: number }>();
let membersCache: { data: ChatMemberSummary[]; expiresAt: number } | null = null;

export function getCachedRecentMessages(roomKey: string): CachedMessages | null {
  const cached = messagesCache.get(roomKey);
  if (!cached || Date.now() > cached.expiresAt) return null;
  return cached.data;
}

export function setCachedRecentMessages(roomKey: string, data: CachedMessages) {
  messagesCache.set(roomKey, { data, expiresAt: Date.now() + MESSAGES_TTL_MS });
}

export function getCachedMembers(): ChatMemberSummary[] | null {
  if (!membersCache || Date.now() > membersCache.expiresAt) return null;
  return membersCache.data;
}

export function setCachedMembers(data: ChatMemberSummary[]) {
  membersCache = { data, expiresAt: Date.now() + MEMBERS_TTL_MS };
}

export function invalidateMessagesCache(roomKey?: string) {
  if (roomKey) messagesCache.delete(roomKey);
  else messagesCache.clear();
}

export function appendMessageToCache(message: ChatMessageDoc & { id: string }) {
  const roomKey = message.roomKey ?? "channel:general";
  const cached = getCachedRecentMessages(roomKey);
  if (!cached) return;
  setCachedRecentMessages(roomKey, [...cached, message].slice(-80));
}

export function mergeSinceIntoCache(
  roomKey: string,
  since: Date,
  incoming: (ChatMessageDoc & { id: string })[]
) {
  if (!incoming.length) return;
  const cached = getCachedRecentMessages(roomKey);
  if (!cached) return;
  const sinceMs = since.getTime();
  const base = cached.filter((m) => (m.createdAt?.toMillis?.() ?? 0) <= sinceMs);
  const ids = new Set(base.map((m) => m.id));
  for (const m of incoming) {
    if (!ids.has(m.id)) base.push(m);
  }
  setCachedRecentMessages(roomKey, base.slice(-80));
}

export function upsertMessagesInCache(
  roomKey: string,
  incoming: (ChatMessageDoc & { id: string })[]
) {
  if (!incoming.length) return;
  const cached = getCachedRecentMessages(roomKey);
  if (!cached) return;
  const byId = new Map(cached.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  const next = [...byId.values()].sort(
    (a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
  );
  setCachedRecentMessages(roomKey, next.slice(-80));
}
