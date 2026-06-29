import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getMediaById } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".wmv": "video/x-ms-wmv",
};

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function nodeStreamToWeb(stream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk as Buffer));
      });
      stream.on("end", () => {
        controller.close();
      });
      stream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      stream.destroy();
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing id parameter", { status: 400 });
    }

    const media = getMediaById(parseInt(id, 10));
    if (!media) {
      return new NextResponse("Media not found", { status: 404 });
    }

    if (!media.available) {
      return new NextResponse("File not available (HDD disconnected)", { status: 404 });
    }

    const filepath = media.filepath;
    if (!fs.existsSync(filepath)) {
      return new NextResponse("File not found on disk", { status: 404 });
    }

    const stat = fs.statSync(filepath);
    const fileSize = Number(stat.size); // Explicit Number() for large files
    const mimeType = getMimeType(filepath);
    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace("bytes=", "").split("-");
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Clamp values to valid range
      start = Math.max(0, Math.min(start, fileSize - 1));
      end = Math.max(start, Math.min(end, fileSize - 1));

      // Validate — return 416 if range is still nonsensical
      if (start > end || start >= fileSize) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(filepath, {
        start,
        end,
        highWaterMark: 64 * 1024,
      });

      return new NextResponse(nodeStreamToWeb(stream), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
          "Cache-Control": "no-cache, no-store",
          "X-Content-Type-Options": "nosniff",
          "Connection": "keep-alive",
        },
      });
    }

    // No Range header — return full file with Content-Length
    // so browser knows total size = total duration
    const stream = fs.createReadStream(filepath, {
      highWaterMark: 64 * 1024,
    });

    return new NextResponse(nodeStreamToWeb(stream), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("[Stream] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
