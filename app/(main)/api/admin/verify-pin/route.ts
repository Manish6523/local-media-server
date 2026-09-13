import { NextResponse } from "next/server";
import { verifyPin } from "@/lib/db";
import { adminToken } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const valid = verifyPin(pin);
    if (valid) {
      const expires = String(Date.now() + 3600000);
      const response = NextResponse.json({ success: true });
      response.cookies.set("vidlock_admin", `${expires}.${adminToken(expires)}`, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 3600, secure: new URL(request.url).protocol === "https:" });
      return response;
    }
    return NextResponse.json({ success: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
