/**
 * Filename Parser for VidLock
 *
 * Implements all 8 rules from the spec to extract structured metadata
 * from video filenames. The filename (NOT folder name) is the source of truth.
 */

export interface ParsedFile {
  type: "movie" | "show";
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
}

// Rule 1 & 2: SxxExx pattern with optional multi-episode range
// Matches: S02E01-05, S02E01-E05, S01E03, S04E14
const SXXEXX_REGEX = /S(\d{1,2})E(\d{1,2})(?:-E?(\d{1,2}))?/i;

// Rule 3: Junk tags to strip (order matters — match before title extraction)
const JUNK_PATTERNS = [
  /\[.*?\]/g,           // [anything in brackets]
  /\{.*?\}/g,           // {anything in braces}
  /\(.*?\)/g,           // (anything in parentheses)
];

// Tags that indicate start of junk — everything after first match gets removed
const JUNK_TAGS = [
  "1080px265", "2160p", "1080p", "720p", "480p", "4K",
  "BluRay", "WEBRip", "WEB-DL", "HDRip", "HDTV", "DVDRip",
  "HEVC", "x265", "x264", "H264", "H265", "10bit", "AAC", "AC3", "6CH",
  "Hin", "Eng", "Multi", "Dual",
  "@ensembly", "YIFY", "YTS", "RARBG", "PSA", "ensembly",
];

// Rule 4: Country codes to strip (only if immediately before SxxExx)
const COUNTRY_CODES = ["US", "UK", "AU", "IN", "CA", "NZ"];

// Rule 6: Year regex (1900-2099)
const YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/;

/**
 * Parse a video filename into structured metadata.
 * This is the main entry point.
 */
export function parseFilename(filename: string): ParsedFile {
  // Remove file extension
  let name = filename.replace(/\.\w{2,4}$/, "");

  // Rule 5: Separator normalisation — replace . and _ with spaces
  name = name.replace(/[._]/g, " ");

  // Rule 1: Detect type by SxxExx pattern
  const sxxexxMatch = name.match(SXXEXX_REGEX);
  const type: "movie" | "show" = sxxexxMatch ? "show" : "movie";

  // Rule 2: Extract season and episode info
  let season: number | null = null;
  let episodeStart: number | null = null;
  let episodeEnd: number | null = null;

  if (sxxexxMatch) {
    season = parseInt(sxxexxMatch[1], 10);
    episodeStart = parseInt(sxxexxMatch[2], 10);
    episodeEnd = sxxexxMatch[3] ? parseInt(sxxexxMatch[3], 10) : episodeStart;
  }

  // Get the portion before the SxxExx match for title extraction
  let titlePart = name;
  if (sxxexxMatch && sxxexxMatch.index !== undefined) {
    titlePart = name.substring(0, sxxexxMatch.index);
  }

  // Rule 3: Strip junk bracket/brace/paren patterns
  for (const pattern of JUNK_PATTERNS) {
    titlePart = titlePart.replace(pattern, " ");
  }

  // Rule 3: Strip junk tags — remove everything after first junk tag match
  // Build a case-insensitive regex that matches any junk tag as a whole word
  const junkRegex = new RegExp(
    "\\b(" + JUNK_TAGS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
    "i"
  );
  const junkMatch = titlePart.match(junkRegex);
  if (junkMatch && junkMatch.index !== undefined) {
    titlePart = titlePart.substring(0, junkMatch.index);
  }

  // Also handle @ensembly style tags that don't have word boundaries
  const atMatch = titlePart.match(/@\w+/);
  if (atMatch && atMatch.index !== undefined) {
    titlePart = titlePart.substring(0, atMatch.index);
  }

  // Rule 4: Country code removal (only if show type — strip standalone 2-letter country codes)
  if (type === "show") {
    for (const code of COUNTRY_CODES) {
      // Only strip if the code appears at the end of the title part
      const codeRegex = new RegExp(`\\b${code}\\b\\s*$`, "i");
      titlePart = titlePart.replace(codeRegex, "");
    }
  }

  // Rule 6: Year extraction
  let year: number | null = null;
  const yearMatch = titlePart.match(YEAR_REGEX);
  if (yearMatch) {
    const possibleYear = parseInt(yearMatch[1], 10);
    // Validate it's a reasonable year
    if (possibleYear >= 1900 && possibleYear <= 2099) {
      year = possibleYear;
      // Remove year from title
      titlePart = titlePart.replace(YEAR_REGEX, "");
    }
  }

  // Rule 7: Final title cleanup
  let title = titlePart
    .replace(/[-–—]+/g, " ")     // Replace dashes with spaces
    .replace(/\s+/g, " ")        // Collapse multiple spaces
    .trim();

  // Title case the result
  title = toTitleCase(title);

  // Ensure we have at least something for the title
  if (!title) {
    // Fallback: use the filename without extension
    title = filename.replace(/\.\w{2,4}$/, "").replace(/[._]/g, " ").trim();
    title = toTitleCase(title);
  }

  return {
    type,
    title,
    year,
    season,
    episode_start: episodeStart,
    episode_end: episodeEnd,
  };
}

/**
 * Convert a string to Title Case, handling common articles/prepositions.
 */
function toTitleCase(str: string): string {
  if (!str) return str;

  const smallWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "in", "of", "by", "is"]);

  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index === 0 || !smallWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}
