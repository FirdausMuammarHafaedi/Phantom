import { LyricLine } from '../types';
import { parseLrcString } from './lrcParser';

export interface OnlineLyricsResult {
  source: 'lrclib' | 'none';
  synced: boolean;
  lyrics: LyricLine[];
  rawText: string;
  trackName?: string;
  artistName?: string;
  duration?: number;
}

/**
 * Clean track title by removing track numbers, audio/video tags, and file extensions
 */
export function cleanTrackTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\.(mp3|wav|ogg|flac|m4a|aac|opus|webm)$/i, '')
    .replace(/^(\d{1,3}[\s.\-_]+)+/g, '') // remove leading track numbers like "01 - " or "1. "
    .replace(/\s*[\(\[](official\s*(audio|video|music\s*video|hd|hq|lyric\s*video|lyrics)?|remaster(ed)?\s*\d*|deluxe|live|radio\s*edit|bonus\s*track)[\)\]]/gi, '')
    .trim();
}

/**
 * Clean artist name
 */
export function cleanArtistName(rawArtist: string): string {
  if (!rawArtist) return '';
  if (rawArtist.toLowerCase() === 'unknown artist' || rawArtist.toLowerCase() === 'phantom') {
    return '';
  }
  return rawArtist
    .replace(/\s*[\(\[](official|hd|hq)[\)\]]/gi, '')
    .trim();
}

/**
 * Stream/fetch online synchronized lyrics using LRCLIB API.
 * Free, open, no API key required, supports full CORS in web browsers.
 */
export async function fetchOnlineLyrics(
  title: string,
  artist: string = '',
  duration?: number,
  signal?: AbortSignal
): Promise<OnlineLyricsResult | null> {
  const cleanTitle = cleanTrackTitle(title);
  const cleanArtist = cleanArtistName(artist);

  if (!cleanTitle) return null;

  // 1. Try exact match first via LRCLIB /api/get
  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
    });
    if (cleanArtist) params.append('artist_name', cleanArtist);
    if (duration && duration > 0) params.append('duration', Math.round(duration).toString());

    const getUrl = `https://lrclib.net/api/get?${params.toString()}`;
    const res = await fetch(getUrl, {
      signal,
      headers: {
        'Lrclib-Client': 'Persona5MusicPlayer (https://github.com/ai-studio)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedLyrics || data.plainLyrics) {
        const raw = data.syncedLyrics || data.plainLyrics;
        const parsed = parseLrcString(raw, duration || data.duration || 180);
        if (parsed.length > 0) {
          return {
            source: 'lrclib',
            synced: !!data.syncedLyrics,
            lyrics: parsed,
            rawText: raw,
            trackName: data.trackName,
            artistName: data.artistName,
            duration: data.duration,
          };
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    // Fallback to search endpoint
  }

  // 2. Try search endpoint via LRCLIB /api/search with query
  try {
    const query = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;

    const res = await fetch(searchUrl, {
      signal,
      headers: {
        'Lrclib-Client': 'Persona5MusicPlayer (https://github.com/ai-studio)',
      },
    });

    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        // Find best match: preferably synced lyrics and closest duration if known
        let best = results.find((r) => !!r.syncedLyrics);
        if (!best) best = results[0];

        if (best && (best.syncedLyrics || best.plainLyrics)) {
          const raw = best.syncedLyrics || best.plainLyrics;
          const parsed = parseLrcString(raw, duration || best.duration || 180);
          if (parsed.length > 0) {
            return {
              source: 'lrclib',
              synced: !!best.syncedLyrics,
              lyrics: parsed,
              rawText: raw,
              trackName: best.trackName,
              artistName: best.artistName,
              duration: best.duration,
            };
          }
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
  }

  return null;
}
