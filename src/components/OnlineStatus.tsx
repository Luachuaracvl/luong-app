"use client";

import { UserAvatar } from "./UserAvatar";
import { usePresence } from "./PresenceProvider";

export function OnlineDot({
  userId,
  online,
  className = "",
}: {
  userId?: string;
  online?: boolean;
  className?: string;
}) {
  const presence = usePresence(userId);
  const isOnline = online ?? presence.online;

  return (
    <span
      className={`inline-block rounded-full border-2 border-white ${
        isOnline ? "bg-emerald-500" : "bg-slate-300"
      } ${className}`}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}

export function AvatarWithStatus({
  userId,
  name,
  avatarUrl,
  size = "md",
  online,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const dotSize =
    size === "lg" ? "h-3.5 w-3.5" : size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className="relative shrink-0">
      <UserAvatar name={name} avatarUrl={avatarUrl} userId={userId} size={size} />
      <OnlineDot
        userId={userId}
        online={online}
        className={`absolute bottom-0 right-0 ${dotSize}`}
      />
    </div>
  );
}
