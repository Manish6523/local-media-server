/**
 * Filename Parser for VidLock
 *
 * Uses multiple standalone pattern checks (in priority order) to extract
 * structured metadata from video filenames. Handles every common naming
 * convention found in the wild, including:
 *
 *   S01E01, s1e2, S01E01-05          (standard)
 *   S01 E01, S01-E01, S01.E01        (separated S and E)
 *   02E01, 02 E01, 02-E01            (no S prefix)
 *   S2 - 06, S02 - 01                (S prefix, no E prefix)
 *   [S01-E05], [s01 e05]             (bracketed)
 *   01. Title, 02 - Title            (numbered prefix)
 *   E01, E02                         (episode only, no season)
 *   S03 E04 Euphoria                 (pattern before title)
 *   [SO] [03 - Hell's Paradise S02]  (episode before season)
 */

export interface ParsedFile {
  type: "movie" | "show";
  title: string;
  year: number | null;
  season: number | null;
  episode_start: number | null;
  episode_end: number | null;
}

interface EpisodeMatch {
  season: number | null;
  episodeStart: number;
  episodeEnd: number;
  fullMatch: string;
}

// ─── Episode Detection Patterns ──────────────────────────────────
// Each pattern is a standalone function. First match wins.

/**
 * Pattern 1: Standard SxxExx
 * Matches: S01E01, s1e2, S01E01-05, S01E01-E05, S01E01E02
 */
function tryStandardSxxExx(name: string): EpisodeMatch | null {
  const m = name.match(/[Ss](\d{1,2})[Ee](\d{1,3})(?:\s?[-–]\s?[Ee]?(\d{1,3}))?/);
  if (!m) return null;
  return {
    season: parseInt(m[1]),
    episodeStart: parseInt(m[2]),
    episodeEnd: m[3] ? parseInt(m[3]) : parseInt(m[2]),
    fullMatch: m[0],
  };
}

/**
 * Pattern 2: SxxExx with space/dash/dot separator between S and E
 * Matches: S01 E01, S03 E04, S01-E01, S01.E01, S01 - E05
 */
function trySxxSepExx(name: string): EpisodeMatch | null {
  const m = name.match(/[Ss](\d{1,2})\s+[-–.]?\s*[Ee](\d{1,3})(?:\s?[-–]\s?[Ee]?(\d{1,3}))?/);
  if (!m) return null;
  return {
    season: parseInt(m[1]),
    episodeStart: parseInt(m[2]),
    episodeEnd: m[3] ? parseInt(m[3]) : parseInt(m[2]),
    fullMatch: m[0],
  };
}

/**
 * Pattern 3: SxxExx with dash separator between S and E
 * Matches: S01-E01, s01-e05, S1-E2
 */
function trySxxDashExx(name: string): EpisodeMatch | null {
  const m = name.match(/[Ss](\d{1,2})\s?[-–]\s?[Ee](\d{1,3})(?:\s?[-–]\s?[Ee]?(\d{1,3}))?/);
  if (!m) return null;
  return {
    season: parseInt(m[1]),
    episodeStart: parseInt(m[2]),
    episodeEnd: m[3] ? parseInt(m[3]) : parseInt(m[2]),
    fullMatch: m[0],
  };
}

/**
 * Pattern 4: Season number without S prefix followed by Exx
 * Matches: 02E01, 02 E01, 02-E01, 02.E01, 03E01
 * Guard: season number must be ≤ 50 to avoid false positives on years/resolutions
 */
function tryNNExx(name: string): EpisodeMatch | null {
  const m = name.match(/(?:^|\s)(\d{1,2})\s?[-–.]?\s?[Ee](\d{1,3})(?:\s?[-–]\s?[Ee]?(\d{1,3}))?/);
  if (!m) return null;
  const season = parseInt(m[1]);
  if (season > 50 || season === 0) return null;
  return {
    season,
    episodeStart: parseInt(m[2]),
    episodeEnd: m[3] ? parseInt(m[3]) : parseInt(m[2]),
    fullMatch: m[0],
  };
}

/**
 * Pattern 5: S + season, then dash/space + plain episode number (no E prefix)
 * Matches: S2 - 06, S02 - 01, S1 06, S2-06
 * Guard: episode number must be ≤ 200 to avoid matching resolution numbers
 */
function trySxxDashNN(name: string): EpisodeMatch | null {
  const m = name.match(/[Ss](\d{1,2})\s?[-–]\s?(\d{1,3})(?!\d)/);
  if (!m) return null;
  const ep = parseInt(m[2]);
  if (ep > 200 || ep === 0) return null;
  return {
    season: parseInt(m[1]),
    episodeStart: ep,
    episodeEnd: ep,
    fullMatch: m[0],
  };
}

/**
 * Pattern 6: Numbered episode prefix at start of name
 * Matches: 01. Angels Of Death, 02 - Title, 03 Title
 * Only matches when the number is at the very start (after optional brackets)
 */
function tryNumberedPrefix(name: string): EpisodeMatch | null {
  // After normalization, "01. Title" becomes "01  Title" (dot→space + existing space)
  // So we match: start, digits, then multiple spaces OR dash/dot
  const m = name.match(/^(\d{1,3})\s{2,}/) || name.match(/^(\d{1,3})\s?[.\-–]\s/);
  if (!m) return null;
  const ep = parseInt(m[1]);
  if (ep > 200 || ep === 0) return null;
  return {
    season: null,
    episodeStart: ep,
    episodeEnd: ep,
    fullMatch: m[0],
  };
}

/**
 * Pattern 7: Episode only (Exx without any season)
 * Matches: E01, E02, E01-E05, E01-05
 * Does NOT match if preceded by "S" + digits (those are caught by earlier patterns)
 */
function tryEpisodeOnly(name: string): EpisodeMatch | null {
  const m = name.match(/(?<![Ss]\d{1,2}\s?)(?:^|\s|[.\-_[\(])([Ee](\d{1,3})(?:\s?[-–]\s?[Ee]?(\d{1,3}))?)/);
  if (!m) return null;
  return {
    season: null,
    episodeStart: parseInt(m[2]),
    episodeEnd: m[3] ? parseInt(m[3]) : parseInt(m[2]),
    fullMatch: m[1],
  };
}

/**
 * Pattern 8: Bracketed episode + separate season elsewhere
 * Matches: [SO] [03 - Hell's Paradise S02], where episode is 03 and season is S02
 * This catches patterns where the episode number is inside brackets before the title
 */
function tryBracketedEpisodePlusSeason(name: string): EpisodeMatch | null {
  // Look for a standalone season marker anywhere in the string
  const seasonMatch = name.match(/[Ss](\d{1,2})(?!\s?[Ee])/);
  if (!seasonMatch) return null;

  // Look for a bracketed standalone episode number
  const epMatch = name.match(/\[(\d{1,3})\s?[-–]/);
  if (!epMatch) return null;

  const ep = parseInt(epMatch[1]);
  if (ep > 200 || ep === 0) return null;

  return {
    season: parseInt(seasonMatch[1]),
    episodeStart: ep,
    episodeEnd: ep,
    fullMatch: epMatch[0] + "..." + seasonMatch[0],
  };
}

/**
 * Master detection function. Tries every pattern in priority order.
 */
function detectEpisode(name: string): EpisodeMatch | null {
  return (
    tryStandardSxxExx(name) ||
    trySxxSepExx(name) ||
    trySxxDashExx(name) ||
    tryNNExx(name) ||
    trySxxDashNN(name) ||
    tryNumberedPrefix(name) ||
    tryEpisodeOnly(name) ||
    tryBracketedEpisodePlusSeason(name) ||
    null
  );
}

// ─── Junk / Cleanup Constants ────────────────────────────────────

const JUNK_BRACKET_PATTERNS = [
  /\[.*?\]/g,           // [anything in brackets]
  /\{.*?\}/g,           // {anything in braces}
  /\(.*?\)/g,           // (anything in parentheses)
];

const JUNK_TAGS = [
  "1080px265", "2160p", "1080p", "720p", "480p", "4K",
  "BluRay", "Bluray", "WEBRip", "WEB-DL", "WEB DL", "HDRip", "HDTV", "DVDRip", "BrRip", "BDRip",
  "HEVC", "x265", "x264", "H264", "H265", "H 264", "H 265", "10bit", "AAC", "AC3", "6CH", "DDP5", "DD5", "DTS",
  "Hin", "Hindi", "Eng", "English", "Multi", "Dual", "Japanese", "Tamil", "Telugu",
  "ESub", "Esub", "REMASTERED",
  "@ensembly", "YIFY", "YTS", "RARBG", "PSA", "ensembly", "BollyFlix", "TinyMkv",
  "Anime_Coll", "Anime_Gall", "Stash_Com", "Movies_Dist",
  "part001", "part002", "part003",
];

const COUNTRY_CODES = ["US", "UK", "AU", "IN", "CA", "NZ"];
const YEAR_REGEX = /\b(19\d{2}|20\d{2})\b/;

// ─── Main Parser ─────────────────────────────────────────────────

export function parseFilename(filename: string): ParsedFile {
  // Remove file extension
  let name = filename.replace(/\.\w{2,4}$/, "");

  // Separator normalisation — replace . and _ with spaces
  name = name.replace(/[._]/g, " ");

  // Detect episode info using multiple standalone patterns
  const episodeInfo = detectEpisode(name);
  const type: "movie" | "show" = episodeInfo ? "show" : "movie";

  let season: number | null = null;
  let episodeStart: number | null = null;
  let episodeEnd: number | null = null;
  let titlePart = name;

  if (episodeInfo) {
    season = episodeInfo.season;
    episodeStart = episodeInfo.episodeStart;
    episodeEnd = episodeInfo.episodeEnd;

    // Strip all episode/season markers from the title string
    // Remove the primary matched text
    titlePart = titlePart.replace(episodeInfo.fullMatch, " ");

    // Also strip any remaining standalone Sxx or SxxExx fragments that weren't in fullMatch
    titlePart = titlePart.replace(/[Ss]\d{1,2}\s?[Ee]\d{1,3}(?:\s?[-–]\s?[Ee]?\d{1,3})?/g, " ");
    titlePart = titlePart.replace(/(?:^|\s)[Ss]\d{1,2}(?=\s|$|\])/g, " ");
  }

  // Strip junk bracket/brace/paren patterns
  for (const pattern of JUNK_BRACKET_PATTERNS) {
    titlePart = titlePart.replace(pattern, " ");
  }

  // Strip junk tags — remove everything after first junk tag match
  const junkRegex = new RegExp(
    "\\b(" + JUNK_TAGS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
    "i"
  );
  const junkMatch = titlePart.match(junkRegex);
  if (junkMatch && junkMatch.index !== undefined) {
    titlePart = titlePart.substring(0, junkMatch.index);
  }

  // Handle @username style tags
  const atMatch = titlePart.match(/@\w+/);
  if (atMatch && atMatch.index !== undefined) {
    titlePart = titlePart.substring(0, atMatch.index);
  }

  // Country code removal for shows
  if (type === "show") {
    for (const code of COUNTRY_CODES) {
      const codeRegex = new RegExp(`\\b${code}\\b\\s*$`, "i");
      titlePart = titlePart.replace(codeRegex, "");
    }
  }

  // Year extraction
  let year: number | null = null;
  const yearMatch = titlePart.match(YEAR_REGEX);
  if (yearMatch) {
    const possibleYear = parseInt(yearMatch[1], 10);
    if (possibleYear >= 1900 && possibleYear <= 2099) {
      year = possibleYear;
      titlePart = titlePart.replace(YEAR_REGEX, "");
    }
  }

  // Final title cleanup
  let title = titlePart
    .replace(/[-–—]+/g, " ")     // Replace dashes with spaces
    .replace(/\s+/g, " ")        // Collapse multiple spaces
    .trim();

  title = toTitleCase(title);

  // Ensure we have at least something for the title
  if (!title) {
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
