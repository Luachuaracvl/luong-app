/** Gửi heartbeat mỗi 15s → ngưỡng 35s (có buffer) */
export const HEARTBEAT_INTERVAL_MS = 15_000;
/** Poll server mỗi 3s để cập nhật trạng thái team */
export const PRESENCE_POLL_MS = 3_000;
/** Client tự kiểm tra hết hạn mỗi 5s (không cần reload) */
export const PRESENCE_TICK_MS = 5_000;
export const ONLINE_THRESHOLD_MS = 35_000;

export type PresenceInfo = {
  online: boolean;
  lastSeenAt: string | null;
};

export function isOnlineByLastSeen(
  lastSeenAt: string | null | undefined,
  thresholdMs = ONLINE_THRESHOLD_MS
) {
  if (!lastSeenAt) return false;
  const ms = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms < thresholdMs;
}

export function resolvePresence(
  lastSeenAt: string | null,
  explicitOnline?: boolean
): PresenceInfo {
  if (explicitOnline === false) {
    return { online: false, lastSeenAt };
  }
  return {
    online: isOnlineByLastSeen(lastSeenAt),
    lastSeenAt,
  };
}
