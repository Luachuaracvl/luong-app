import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth";
import { findUserById, updateUser } from "@/lib/db/users";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await findUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
    }

    const body = await request.json();
    const updates: {
      name?: string;
      passwordHash?: string;
      avatarUrl?: string | null;
    } = {};

    if (body.name?.trim()) {
      updates.name = body.name.trim();
    }

    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl === null || body.avatarUrl === "") {
        updates.avatarUrl = null;
      } else if (typeof body.avatarUrl === "string") {
        if (!body.avatarUrl.startsWith("data:image/")) {
          return NextResponse.json({ error: "Avatar không hợp lệ" }, { status: 400 });
        }
        if (body.avatarUrl.length > 500_000) {
          return NextResponse.json(
            { error: "Ảnh quá lớn, hãy chọn ảnh nhỏ hơn" },
            { status: 400 }
          );
        }
        updates.avatarUrl = body.avatarUrl;
      }
    }

    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Vui lòng nhập mật khẩu hiện tại" },
          { status: 400 }
        );
      }
      if (String(body.newPassword).length < 6) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có ít nhất 6 ký tự" },
          { status: 400 }
        );
      }

      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Mật khẩu hiện tại không đúng" },
          { status: 400 }
        );
      }

      updates.passwordHash = await bcrypt.hash(String(body.newPassword), 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
    }

    const updated = await updateUser(session.id, updates);

    return NextResponse.json({
      user: {
        id: updated?.id,
        username: updated?.username,
        name: updated?.name,
        role: updated?.role,
        avatarUrl: updated?.avatarUrl ?? null,
      },
      message: updates.passwordHash
        ? "Đã đổi mật khẩu"
        : "Đã cập nhật hồ sơ",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
