import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await findUserById(session.id);
  return NextResponse.json({
    user: {
      ...session,
      avatarUrl: user?.avatarUrl ?? null,
    },
  });
}
