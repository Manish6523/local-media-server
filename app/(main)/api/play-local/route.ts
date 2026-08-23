import { NextRequest, NextResponse } from "next/server";
import { getMediaById, getConfig } from "@/lib/db";
import { exec } from "child_process";
import fs from "fs";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const { mediaId, player, startTime = 0 } = await request.json();

    if (!mediaId) {
      return NextResponse.json({ error: "Missing mediaId" }, { status: 400 });
    }

    const media = getMediaById(Number(mediaId));
    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const filepath = media.filepath;
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "File does not exist on disk" }, { status: 404 });
    }

    const platform = os.platform();
    let command = "";
    
    // Helper to append start time arguments based on player type
    const getStartTimeArg = (execPath: string, time: number) => {
      if (time <= 0) return "";
      const lower = execPath.toLowerCase();
      if (lower.includes("vlc")) return ` --start-time=${time}`;
      if (lower.includes("mpv")) return ` --start=${time}`;
      if (lower.includes("mpc-hc")) return ` /start ${time * 1000}`;
      return ""; // Unknown custom player, don't break it
    };

    if (player === "vlc") {
      let vlcPath = "vlc"; // Fallback to PATH (works on Linux and sometimes Mac/Win)
      
      if (platform === "win32") {
        const vlcPaths = [
          `C:\\Program Files\\VideoLAN\\VLC\\vlc.exe`,
          `C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe`
        ];
        for (const p of vlcPaths) {
          if (fs.existsSync(p)) {
            vlcPath = `"${p}"`;
            break;
          }
        }
      } else if (platform === "darwin") {
        const macVlc = "/Applications/VLC.app/Contents/MacOS/VLC";
        if (fs.existsSync(macVlc)) {
          vlcPath = `"${macVlc}"`;
        }
      }
      
      command = `${vlcPath} "${filepath}"${getStartTimeArg("vlc", startTime)}`;
    } else if (player === "default") {
      // Default player depending on OS (most OS default open commands don't support start times)
      if (platform === "win32") {
        command = `start "" "${filepath}"`;
      } else if (platform === "darwin") {
        command = `open "${filepath}"`;
      } else {
        command = `xdg-open "${filepath}"`;
      }
    } else {
      // Check for custom player ID
      const customVideoPlayersStr = getConfig("custom_video_players");
      if (customVideoPlayersStr) {
        try {
          const players = JSON.parse(customVideoPlayersStr);
          const customPlayer = players.find((p: any) => p.id === player);
          if (customPlayer && customPlayer.path) {
            command = `"${customPlayer.path}" "${filepath}"${getStartTimeArg(customPlayer.path, startTime)}`;
          }
        } catch (e) {
          console.error("[PlayLocal] Failed to parse custom players:", e);
        }
      }
      
      if (!command) {
        return NextResponse.json({ error: "Player configuration not found" }, { status: 404 });
      }
    }

    exec(command, (error) => {
      if (error) {
        console.error("[PlayLocal] Failed to launch player:", error);
      }
    });

    return NextResponse.json({ success: true, command });
  } catch (error: any) {
    console.error("[PlayLocal] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
