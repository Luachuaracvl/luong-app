export const ONLINE_THRESHOLD_MS = 60_000;

export function isOnlineByLastSeen(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  const ms = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms < ONLINE_THRESHOLD_MS;
}

export type PresenceInfo = {
  online: boolean;
  lastSeenAt: string | null;
};
