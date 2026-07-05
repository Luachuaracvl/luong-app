"use client";

import { useMemo } from "react";
import { AvatarWithStatus } from "./OnlineStatus";
import { useOnlineCount, usePresence } from "./PresenceProvider";

export type TeamMember = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  avatarUrl?: string | null;
  isActive?: boolean;
};

function TeamMemberRow({ member }: { member: TeamMember }) {
  const presence = usePresence(member.id);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
      <AvatarWithStatus
        userId={member.id}
        name={member.name}
        avatarUrl={member.avatarUrl}
        size="sm"
        online={presence.online}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{member.name}</p>
        <p className="text-xs text-slate-500">
          {member.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
          {member.isActive === false ? " · Tạm ngưng" : ""}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          presence.online
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {presence.online ? "Đang online" : "Offline"}
      </span>
    </div>
  );
}

export function TeamOnlinePanel({ members }: { members: TeamMember[] }) {
  const onlineCount = useOnlineCount();

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role !== b.role) return a.role === "ADMIN" ? -1 : 1;
        return a.name.localeCompare(b.name, "vi");
      }),
    [members]
  );

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">Trạng thái team</h3>
          <p className="text-xs text-slate-500">
            {onlineCount} / {members.length} đang online
          </p>
        </div>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {sorted.map((member) => (
          <TeamMemberRow key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
