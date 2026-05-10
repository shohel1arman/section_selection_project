import { NextResponse } from "next/server";
import { createSessionCookie, clearSessionCookie } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured on server" },
      { status: 500 },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password !== expected) {
    return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 401 });
  }

  const cookie = await createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}

export async function DELETE() {
  const cookie = clearSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
