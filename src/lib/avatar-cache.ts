const PREFIX = "luong-avatar-v1-";
const INDEX_KEY = "luong-avatar-index-v1";
const MAX_ENTRIES = 40;

type AvatarIndexEntry = { id: string; at: number };

function readIndex(): AvatarIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AvatarIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: AvatarIndexEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore */
  }
}

function touchIndex(userId: string) {
  const now = Date.now();
  const next = readIndex().filter((e) => e.id !== userId);
  next.push({ id: userId, at: now });
  writeIndex(next);
}

function removeFromIndex(userId: string) {
  writeIndex(readIndex().filter((e) => e.id !== userId));
}

function pruneOldEntries() {
  const index = readIndex();
  if (index.length <= MAX_ENTRIES) return;
  const sorted = [...index].sort((a, b) => a.at - b.at);
  const remove = sorted.slice(0, sorted.length - MAX_ENTRIES);
  for (const entry of remove) {
    try {
      localStorage.removeItem(PREFIX + entry.id);
    } catch {
      /* ignore */
    }
  }
  writeIndex(sorted.slice(-MAX_ENTRIES));
}

export function readAvatar(userId: string): string | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return localStorage.getItem(PREFIX + userId);
  } catch {
    return null;
  }
}

export function writeAvatar(userId: string, avatarUrl: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (!avatarUrl) {
      localStorage.removeItem(PREFIX + userId);
      removeFromIndex(userId);
      return;
    }
    localStorage.setItem(PREFIX + userId, avatarUrl);
    touchIndex(userId);
    pruneOldEntries();
  } catch {
    /* quota exceeded */
  }
}

export function cacheAvatars(
  entries: { userId: string; avatarUrl?: string | null }[]
) {
  for (const entry of entries) {
    if (entry.avatarUrl) writeAvatar(entry.userId, entry.avatarUrl);
  }
}

export function resolveAvatar(
  userId: string | undefined,
  avatarUrl?: string | null
): string | null {
  if (avatarUrl) return avatarUrl;
  if (!userId) return null;
  return readAvatar(userId);
}
