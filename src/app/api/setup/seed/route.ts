import { NextResponse } from "next/server";
import { seedAdminIfNeeded } from "@/lib/seed";

async function runSeed() {
  const result = await seedAdminIfNeeded();
  return NextResponse.json({
    ok: true,
    message: result.created
      ? "Đã tạo admin: admin / admin123"
      : "Admin đã tồn tại",
  });
}

export async function GET() {
  try {
    return await runSeed();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể khởi tạo admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    return await runSeed();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể khởi tạo admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
