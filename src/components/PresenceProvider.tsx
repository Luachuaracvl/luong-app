"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PresenceInfo } from "@/lib/presence";

type PresenceMap = Map<string, PresenceInfo>;

const PresenceContext = createContext<{
  getPresence: (userId: string) => PresenceInfo;
  onlineCount: number;
}>({
  getPresence: () => ({ online: false, lastSeenAt: null }),
  onlineCount: 0,
});

function pingOnline() {
  return fetch("/api/presence", { method: "POST" }).catch(() => {});
}

function pingOffline() {
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/presence?offline=1", "");
    return;
  }
  fetch("/api/presence?offline=1", {
    method: "POST",
    keepalive: true,
  }).catch(() => {});
}

export function PresenceProvider({
  userId,
  children,
}: {
  userId?: string;
  children: React.ReactNode;
}) {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>(new Map());

  const refreshPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence");
      if (!res.ok) return;
      const data = await res.json();
      const entries = Object.entries(data.presence ?? {}) as [string, PresenceInfo][];
      setPresenceMap(new Map(entries));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    pingOnline();
    refreshPresence();

    const heartbeatTimer = window.setInterval(pingOnline, 25_000);
    const pollTimer = window.setInterval(refreshPresence, 15_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        pingOnline();
        refreshPresence();
      } else {
        pingOffline();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pingOffline);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pingOffline);
      pingOffline();
    };
  }, [userId, refreshPresence]);

  const onlineCount = useMemo(
    () => [...presenceMap.values()].filter((p) => p.online).length,
    [presenceMap]
  );

  const getPresence = useCallback(
    (id: string): PresenceInfo =>
      presenceMap.get(id) ?? { online: false, lastSeenAt: null },
    [presenceMap]
  );

  return (
    <PresenceContext.Provider value={{ getPresence, onlineCount }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(userId?: string) {
  const ctx = useContext(PresenceContext);
  if (!userId) return { online: false, lastSeenAt: null as string | null };
  return ctx.getPresence(userId);
}

export function useOnlineCount() {
  return useContext(PresenceContext).onlineCount;
}
