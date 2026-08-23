import fs from "fs";
import path from "path";

const API_KEY = process.env.OPENSUBTITLES_API_KEY;
const BASE_URL = "https://api.opensubtitles.com/api/v1";

export interface OSSubtitle {
  id: string;
  file_id: number;
  language: string;
  name: string;
  downloads: number;
}

export async function searchSubtitles(filename: string): Promise<OSSubtitle[]> {
  if (!API_KEY) {
    throw new Error("OPENSUBTITLES_API_KEY is not set in .env");
  }

  // Strip extension and try to clean up filename slightly for better search results
  let query = path.basename(filename, path.extname(filename));
  // Clean up common release tags from query to improve matches
  query = query.replace(/(1080p|720p|2160p|4k|x264|x265|hevc|bluray|webrip|hdrip|ddp|10bit|hindi|english|dual|audio)/gi, '').trim();

  // OpenSubtitles Best Practices:
  // 1. Sort parameters alphabetically (languages before query)
  // 2. Use + instead of %20
  // 3. Lowercase parameters
  const encodedQuery = encodeURIComponent(query.toLowerCase()).replace(/%20/g, "+");

  const res = await fetch(`${BASE_URL}/subtitles?languages=en,hi,es,fr,de,ja,ko&query=${encodedQuery}`, {
    headers: {
      "Api-Key": API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "VidLock v1.0",
      "X-User-Agent": "VidLock v1.0",
    },
  });

  if (!res.ok) {
    console.error("OpenSubtitles API Error:", await res.text());
    throw new Error(`Failed to search subtitles: ${res.statusText}`);
  }

  const data = await res.json();
  const results: OSSubtitle[] = [];

  for (const item of data.data || []) {
    // Each item can have multiple files (CD1, CD2, etc), we just take the first one
    if (item.attributes?.files?.length > 0) {
      const file = item.attributes.files[0];
      results.push({
        id: item.id,
        file_id: file.file_id,
        language: item.attributes.language,
        name: file.file_name,
        downloads: item.attributes.download_count,
      });
    }
  }

  // Sort by downloads
  return results.sort((a, b) => b.downloads - a.downloads).slice(0, 20);
}

export async function downloadSubtitle(file_id: number, savePath: string): Promise<void> {
  if (!API_KEY) {
    throw new Error("OPENSUBTITLES_API_KEY is not set in .env");
  }

  // 1. Get download link
  const linkRes = await fetch(`${BASE_URL}/download`, {
    method: "POST",
    headers: {
      "Api-Key": API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "VidLock v1.0",
    },
    body: JSON.stringify({ file_id }),
  });

  if (!linkRes.ok) {
    console.error("OpenSubtitles Download API Error:", await linkRes.text());
    throw new Error(`Failed to get subtitle download link: ${linkRes.statusText}`);
  }

  const linkData = await linkRes.json();
  if (!linkData.link) {
    throw new Error("No download link returned from OpenSubtitles");
  }

  // 2. Download actual file
  const fileRes = await fetch(linkData.link);
  if (!fileRes.ok) {
    throw new Error(`Failed to download subtitle file: ${fileRes.statusText}`);
  }

  const content = await fileRes.text();

  // 3. Save to disk
  fs.writeFileSync(savePath, content, "utf-8");
}
