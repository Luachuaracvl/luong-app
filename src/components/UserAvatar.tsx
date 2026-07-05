"use client";

import { useEffect, useState } from "react";
import { readAvatar, writeAvatar } from "@/lib/avatar-cache";

const AVATAR_COLORS = ["#3f3f46", "#52525b", "#404040", "#57534e", "#44403c"];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function UserAvatar({
  name,
  avatarUrl,
  userId,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  userId?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-sm"
      : size === "lg"
        ? "h-20 w-20 text-2xl"
        : "h-11 w-11 text-base";

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const bgColor = colorForName(name);

  const [src, setSrc] = useState<string | null>(() => {
    if (avatarUrl) return avatarUrl;
    if (userId) return readAvatar(userId);
    return null;
  });

  useEffect(() => {
    const cached = userId ? readAvatar(userId) : null;
    const next = avatarUrl ?? cached ?? null;
    setSrc(next);
    if (userId && avatarUrl) {
      writeAvatar(userId, avatarUrl);
    }
  }, [avatarUrl, userId]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-[var(--border-strong)]`}
        onError={() => {
          setSrc(null);
          if (userId) writeAvatar(userId, null);
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-medium text-white`}
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  );
}
