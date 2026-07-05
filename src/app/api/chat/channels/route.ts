import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  channelToJson,
  createChannel,
  ensureDefaultChannels,
} from "@/lib/db/channels";

export async function GET() {
  try {
    await requireSession();
    const channels = await ensureDefaultChannels();
    return NextResponse.json({ channels: channels.map(channelToJson) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json();
    const slug = String(body.slug ?? body.name ?? "").trim();
    const name = String(body.name ?? slug).trim();

    if (!slug) {
      return NextResponse.json({ error: "Tên kênh không hợp lệ" }, { status: 400 });
    }

    const created = await createChannel({
      slug,
      name,
      description: body.description,
      adminOnly: Boolean(body.adminOnly),
    });

    return NextResponse.json({ channel: channelToJson(created) });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE") {
      return NextResponse.json({ error: "Kênh đã tồn tại" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Chỉ admin mới tạo kênh" }, { status: 403 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
