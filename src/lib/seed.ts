import bcrypt from "bcryptjs";
import { createAdminUser } from "@/lib/db/users";

export async function seedAdminIfNeeded() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await createAdminUser(passwordHash);
  return admin ? { created: true } : { created: false };
}
