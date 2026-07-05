export function buildChannelRoomKey(channelId: string) {
  return `channel:${channelId}`;
}

export function buildDmRoomKey(userIdA: string, userIdB: string) {
  return `dm:${[userIdA, userIdB].sort().join("_")}`;
}

export function getDmPeerId(roomKey: string, currentUserId: string) {
  if (!roomKey.startsWith("dm:")) return null;
  const ids = roomKey.slice(3).split("_");
  return ids.find((id) => id !== currentUserId) ?? null;
}

export type ChatRoom =
  | { type: "channel"; channelId: string; roomKey: string }
  | { type: "dm"; peerId: string; roomKey: string };

export function resolveRoom(params: {
  channelId?: string | null;
  dmUserId?: string | null;
  currentUserId: string;
}): ChatRoom | null {
  if (params.dmUserId) {
    if (params.dmUserId === params.currentUserId) return null;
    return {
      type: "dm",
      peerId: params.dmUserId,
      roomKey: buildDmRoomKey(params.currentUserId, params.dmUserId),
    };
  }
  if (params.channelId) {
    return {
      type: "channel",
      channelId: params.channelId,
      roomKey: buildChannelRoomKey(params.channelId),
    };
  }
  return null;
}

export function parseMentions(
  text: string,
  members: { id: string; username: string; name: string }[]
) {
  const ids = new Set<string>();
  for (const member of members) {
    const patterns = [
      new RegExp(`@${member.username}\\b`, "i"),
      new RegExp(`@${member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
    ];
    if (patterns.some((p) => p.test(text))) ids.add(member.id);
  }
  return [...ids];
}

export function renderMentionText(
  text: string,
  members: { id: string; username: string; name: string }[]
) {
  let result = text;
  for (const member of members) {
    result = result.replace(
      new RegExp(`@${member.username}\\b`, "gi"),
      `@${member.name}`
    );
  }
  return result;
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "✅", "👀"];
