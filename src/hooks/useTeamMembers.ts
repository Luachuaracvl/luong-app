"use client";

import { useEffect, useState } from "react";
import { cacheAvatars } from "@/lib/avatar-cache";
import type { TeamMember } from "@/components/TeamOnlinePanel";

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chat/members")
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          const list = (json.members ?? []) as TeamMember[];
          setMembers(list);
          cacheAvatars(list.map((m) => ({ userId: m.id, avatarUrl: m.avatarUrl })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { members, loading };
}
