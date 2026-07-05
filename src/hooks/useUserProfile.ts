"use client";

import { useCallback, useEffect, useState } from "react";
import { readAvatar, writeAvatar } from "@/lib/avatar-cache";

type ProfileUser = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  username?: string;
  avatarUrl?: string | null;
};

export function useUserProfile(initialUser: ProfileUser) {
  const [user, setUserState] = useState<ProfileUser>(() => ({
    ...initialUser,
    avatarUrl: initialUser.avatarUrl ?? readAvatar(initialUser.id),
  }));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (initialUser.avatarUrl) {
      writeAvatar(initialUser.id, initialUser.avatarUrl);
    }
  }, [initialUser.avatarUrl, initialUser.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data.user || cancelled) return;

        if (data.user.avatarUrl) {
          writeAvatar(data.user.id, data.user.avatarUrl);
        }

        setUserState((prev) => ({
          ...prev,
          username: data.user.username ?? prev.username,
          name: data.user.name ?? prev.name,
          avatarUrl: data.user.avatarUrl ?? readAvatar(data.user.id),
        }));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [initialUser.id]);

  const setUser = useCallback(
    (patch: Partial<ProfileUser> | ((prev: ProfileUser) => ProfileUser)) => {
      setUserState((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        if (next.avatarUrl !== prev.avatarUrl) {
          writeAvatar(next.id, next.avatarUrl ?? null);
        }
        return next;
      });
    },
    []
  );

  return { user, setUser, profileLoaded: loaded };
}
