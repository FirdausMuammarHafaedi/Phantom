import { LyricLine } from '../types';

/**
 * Robust LRC & plain text lyric parser
 * Supports standard [mm:ss.xx] and [mm:ss] timestamped lines,
 * multi-timestamp lines, and gracefully converts plain text into timed lines.
 */
export function parseLrcString(lrcText: string, trackDuration: number = 180): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const rawLines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata header tags like [ti:Title], [ar:Artist], [al:Album], [length:...]
    if (trimmed.match(/^\[(ti|ar|al|by|offset|length|re|ve):/i)) {
      continue;
    }

    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length > 0) {
      const lyricText = trimmed.replace(timeRegex, '').trim();
      if (!lyricText) continue; // Skip empty timestamp lines

      for (const match of matches) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fraction = match[3]
          ? parseFloat(match[3].length === 3 ? `0.${match[3]}` : `0.${match[3]}`)
          : 0;
        const totalSeconds = minutes * 60 + seconds + fraction;
        result.push({ time: Math.round(totalSeconds * 100) / 100, text: lyricText });
      }
    }
  }

  // If no timestamp tags were found, treat as plain text lyrics and distribute evenly
  if (result.length === 0) {
    const plainLines = rawLines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('['));
    if (plainLines.length === 0) return [];

    const interval = Math.max(2.5, Math.min(5.5, trackDuration / (plainLines.length + 1)));
    return plainLines.map((text, idx) => ({
      time: Math.round((idx + 0.8) * interval),
      text,
    }));
  }

  // Sort chronologically
  result.sort((a, b) => a.time - b.time);
  return result;
}
