// Test script for parser.ts
// Run with: npx tsx scripts/test-parser.ts

import { parseFilename } from "../lib/parser";

const testFiles = [
  "The_Great_Indian_Kapil_Show_S04E14_The_Return_of_Samay_Raina.mp4",
  "13 Reasons Why S02E01-05 [720p] HEVC Hin Eng @ensembly.mkv",
  "13 Reasons Why S02E06-09 [720p] HEVC Hin Eng @ensembly.mkv",
  "13 Reasons Why S02E10-13 [720p] HEVC Hin Eng @ensembly.mkv",
  "13 Reasons Why S03E01-05 [720p] HEVC Hin Eng @ensembly.mkv",
  "13 Reasons Why S03E10-13 [720p] HEVC Hin Eng @ensembly.mkv",
  "13 Reasons Why S04E01-05 [720p] HEVC Hin Eng @ensembly.mkv",
  "13 Reasons Why S04E06-10 [720p] HEVC Hin Eng @ensembly.mkv",
  "Euphoria US S01E03 [1080px265] WEBRip PSA @ensembly.mkv",
  "Euphoria US S01E04 [1080px265] WEBRip PSA @ensembly.mkv",
  "Euphoria US S01E05 [1080px265] WEBRip PSA @ensembly.mkv",
  "Euphoria US S01E06 [1080px265] WEBRip PSA @ensembly.mkv",
  "Euphoria US S01E07 [1080px265] WEBRip PSA @ensembly.mkv",
  "Euphoria US S01E08 [1080px265] WEBRip PSA @ensembly.mkv",
  "The.Boys.2019.S05E03.1080p.10bit.WEBRip.6CH.x265.@ensembly.mkv",
];

console.log("=== Parser Test Results ===\n");

for (const file of testFiles) {
  const result = parseFilename(file);
  const epDisplay = result.episode_start === result.episode_end
    ? `E${String(result.episode_start).padStart(2, "0")}`
    : `E${String(result.episode_start).padStart(2, "0")}–E${String(result.episode_end).padStart(2, "0")}`;

  console.log(`File:    ${file}`);
  console.log(`  Type:    ${result.type}`);
  console.log(`  Title:   "${result.title}"`);
  console.log(`  Year:    ${result.year ?? "null"}`);
  if (result.type === "show") {
    console.log(`  Season:  ${result.season}`);
    console.log(`  Episode: ${epDisplay}`);
  }
  console.log("");
}
