import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "luong_session";
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-me"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/setup/seed"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp)$/)
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname === "/") return NextResponse.redirect(new URL("/login", request.url));
    if (pathname.startsWith("/admin") || pathname.startsWith("/employee")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;

    if (pathname === "/login") {
      return NextResponse.redirect(
        new URL(role === "ADMIN" ? "/admin" : "/employee", request.url)
      );
    }

    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(role === "ADMIN" ? "/admin" : "/employee", request.url)
      );
    }

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/employee", request.url));
    }

    if (pathname.startsWith("/employee") && role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
