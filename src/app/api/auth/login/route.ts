import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByUsername } from "@/lib/db/users";
import { createSession, setSessionCookie } from "@/lib/auth";
import { seedAdminIfNeeded } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    await seedAdminIfNeeded();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username.trim());

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const token = await createSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ error: "Đăng nhập thất bại" }, { status: 500 });
  }
}
