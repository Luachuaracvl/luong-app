"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  HEARTBEAT_INTERVAL_MS,
  isOnlineByLastSeen,
  PRESENCE_POLL_MS,
  PRESENCE_TICK_MS,
  type PresenceInfo,
} from "@/lib/presence";

type RawPresence = {
  online?: boolean;
  lastSeenAt: string | null;
};

type PresenceMap = Map<string, RawPresence>;

const offlinePresence: PresenceInfo = { online: false, lastSeenAt: null };

const PresenceContext = createContext<{
  getPresence: (userId: string) => PresenceInfo;
  presenceMap: Map<string, PresenceInfo>;
  onlineCount: number;
}>({
  getPresence: () => offlinePresence,
  presenceMap: new Map(),
  onlineCount: 0,
});

function sendHeartbeat() {
  return fetch("/api/presence", { method: "POST" }).catch(() => {});
}

function sendOfflineBeacon() {
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/presence?offline=1", "");
    return;
  }
  fetch("/api/presence?offline=1", {
    method: "POST",
    keepalive: true,
  }).catch(() => {});
}

function toLivePresence(raw: RawPresence | undefined): PresenceInfo {
  if (!raw) return offlinePresence;
  if (raw.online === false) {
    return { online: false, lastSeenAt: raw.lastSeenAt };
  }
  return {
    online: isOnlineByLastSeen(raw.lastSeenAt),
    lastSeenAt: raw.lastSeenAt,
  };
}

export function PresenceProvider({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const [rawMap, setRawMap] = useState<PresenceMap>(new Map());
  const [tick, setTick] = useState(0);

  const refreshPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const entries = Object.entries(data.presence ?? {}) as [string, RawPresence][];
      setRawMap(new Map(entries));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    void sendHeartbeat();
    void refreshPresence();

    const heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const pollTimer = window.setInterval(() => {
      void refreshPresence();
    }, PRESENCE_POLL_MS);

    const tickTimer = window.setInterval(() => {
      setTick((n) => n + 1);
    }, PRESENCE_TICK_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
        void refreshPresence();
      }
    };

    const onPageHide = () => {
      sendOfflineBeacon();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
      window.clearInterval(tickTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onPageHide);
      sendOfflineBeacon();
    };
  }, [userId, refreshPresence]);

  const liveMap = useMemo(() => {
    void tick;
    const map = new Map<string, PresenceInfo>();
    for (const [id, raw] of rawMap) {
      map.set(id, toLivePresence(raw));
    }
    return map;
  }, [rawMap, tick]);

  const onlineCount = useMemo(
    () => [...liveMap.values()].filter((p) => p.online).length,
    [liveMap]
  );

  const getPresence = useCallback(
    (id: string): PresenceInfo => liveMap.get(id) ?? offlinePresence,
    [liveMap]
  );

  return (
    <PresenceContext.Provider
      value={{ getPresence, presenceMap: liveMap, onlineCount }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(userId?: string): PresenceInfo {
  const ctx = useContext(PresenceContext);
  if (!userId) return offlinePresence;
  return ctx.getPresence(userId);
}

export function useOnlineCount() {
  return useContext(PresenceContext).onlineCount;
}

export function usePresenceMap() {
  return useContext(PresenceContext).presenceMap;
}
