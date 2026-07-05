"use client";

import { useEffect, useState } from "react";
import { readAvatar, writeAvatar } from "@/lib/avatar-cache";

const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

function gradientForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
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
  const gradient = gradientForName(name);

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
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm`}
        onError={() => {
          setSrc(null);
          if (userId) writeAvatar(userId, null);
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-semibold text-white ring-2 ring-white shadow-sm`}
    >
      {initial}
    </div>
  );
}
