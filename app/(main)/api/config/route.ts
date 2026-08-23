import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getConfig, setConfig, getShowOfflineMedia, setShowOfflineMedia, setPin, disablePin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const localPath = getConfig("local_path");
    const hddPath = getConfig("hdd_path");
    const lastScan = getConfig("last_scan");
    const showOfflineMedia = getShowOfflineMedia();
    const customVideoPlayers = getConfig("custom_video_players");
    console.log('[Config] GET customVideoPlayers:', customVideoPlayers);
    return NextResponse.json({ 
      localPath, 
      hddPath, 
      lastScan, 
      showOfflineMedia, 
      customVideoPlayers: customVideoPlayers ? JSON.parse(customVideoPlayers) : []
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Config] Received POST body:', body);
    const { localPath, hddPath, showOfflineMedia, customVideoPlayers } = body;

    if (localPath) setConfig("local_path", path.normalize(localPath));
    if (hddPath) setConfig("hdd_path", path.normalize(hddPath));
    if (showOfflineMedia !== undefined) {
      console.log('[Config] Saving showOfflineMedia:', showOfflineMedia);
      setShowOfflineMedia(showOfflineMedia);
    }
    if (customVideoPlayers !== undefined) {
      setConfig("custom_video_players", JSON.stringify(customVideoPlayers));
    }
    
    if (body.action === 'set-pin' && body.pin) {
      setPin(body.pin);
    }
    
    if (body.action === 'disable-pin') {
      disablePin();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
