import { NextResponse } from "next/server";
import { verifyPin } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();
    const valid = verifyPin(pin);
    if (valid) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
