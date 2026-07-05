import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type { ChatChannelDoc } from "@/lib/types";

const COLLECTION = "chatChannels";

const REMOVED_CHANNEL_IDS = ["thong-bao"];

const DEFAULT_CHANNELS: Omit<ChatChannelDoc, "createdAt">[] = [
  {
    slug: "general",
    name: "chung",
    description: "Trao đổi chung toàn team",
    isDefault: true,
    adminOnly: false,
  },
];

async function purgeRemovedChannels() {
  const db = getDb();
  for (const id of REMOVED_CHANNEL_IDS) {
    try {
      await db.collection(COLLECTION).doc(id).delete();
    } catch {
      /* ignore */
    }
  }
}

export async function ensureDefaultChannels() {
  await purgeRemovedChannels();
  const db = getDb();
  const snap = await db.collection(COLLECTION).limit(1).get();
  if (!snap.empty) {
    return listChannels();
  }

  const batch = db.batch();
  for (const channel of DEFAULT_CHANNELS) {
    const ref = db.collection(COLLECTION).doc(channel.slug);
    batch.set(ref, {
      ...channel,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return listChannels();
}

export async function listChannels() {
  await purgeRemovedChannels();
  const snap = await getDb().collection(COLLECTION).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as ChatChannelDoc) }))
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name, "vi");
    });
}

export async function createChannel(data: {
  slug: string;
  name: string;
  description?: string;
  adminOnly?: boolean;
}) {
  const slug = data.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (!slug) throw new Error("INVALID_SLUG");

  const ref = getDb().collection(COLLECTION).doc(slug);
  const existing = await ref.get();
  if (existing.exists) throw new Error("DUPLICATE");

  await ref.set({
    name: data.name.trim() || slug,
    slug,
    description: data.description?.trim() || "",
    adminOnly: data.adminOnly ?? false,
    isDefault: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  return { id: created.id, ...(created.data() as ChatChannelDoc) };
}

export async function findChannelById(id: string) {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as ChatChannelDoc) };
}

export function channelToJson(channel: ChatChannelDoc & { id: string }) {
  return {
    id: channel.id,
    name: channel.name,
    slug: channel.slug,
    description: channel.description ?? "",
    isDefault: channel.isDefault ?? false,
    adminOnly: channel.adminOnly ?? false,
  };
}
