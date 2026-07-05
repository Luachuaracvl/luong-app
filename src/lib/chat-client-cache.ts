export type CachedChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "EMPLOYEE";
  senderAvatarUrl?: string | null;
  text: string;
  createdAt: string;
  recalled?: boolean;
};

export type CachedChatMember = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
  isActive: boolean;
};

type ChatClientCache = {
  messages: CachedChatMessage[];
  members: CachedChatMember[];
  savedAt: number;
};

const CACHE_VERSION = "v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function cacheKey(userId: string) {
  return `luong-chat-${CACHE_VERSION}-${userId}`;
}

export function readChatClientCache(userId: string): ChatClientCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatClientCache;
    if (!parsed?.messages || !parsed?.members) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(cacheKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeChatClientCache(
  userId: string,
  messages: CachedChatMessage[],
  members: CachedChatMember[]
) {
  if (typeof window === "undefined") return;
  try {
    const payload: ChatClientCache = {
      messages: messages.filter((m) => !String(m.id).startsWith("temp-")),
      members,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(payload));
  } catch {
    /* quota exceeded — ignore */
  }
}
