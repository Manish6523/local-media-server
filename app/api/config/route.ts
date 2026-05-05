import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getConfig, setConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const localPath = getConfig("local_path");
    const hddPath = getConfig("hdd_path");
    const lastScan = getConfig("last_scan");
    return NextResponse.json({ localPath, hddPath, lastScan });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localPath, hddPath } = body;

    if (localPath) setConfig("local_path", path.normalize(localPath));
    if (hddPath) setConfig("hdd_path", path.normalize(hddPath));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
