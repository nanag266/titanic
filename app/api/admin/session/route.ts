import { NextResponse } from "next/server";
import { adminCookie, createSessionToken, isAdminRequest, secureCompare } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = async () =>
  NextResponse.json({ authenticated: await isAdminRequest() });

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!expectedEmail || !expectedPassword || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Admin access has not been configured on the server." }, { status: 503 });
  }

  if (!secureCompare(email, expectedEmail) || !secureCompare(password, expectedPassword)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookie.name, createSessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminCookie.maxAge
  });
  return response;
};

export const DELETE = async () => {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookie.name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
};
