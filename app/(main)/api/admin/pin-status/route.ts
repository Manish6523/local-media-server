import { NextResponse } from "next/server";
import { getPinEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: getPinEnabled() });
}
