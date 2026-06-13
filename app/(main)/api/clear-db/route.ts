import { NextResponse } from "next/server";
import { clearMediaLibrary, setConfig } from "@/lib/db";

export async function POST() {
  try {
    clearMediaLibrary();
    setConfig("last_scan", null);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
