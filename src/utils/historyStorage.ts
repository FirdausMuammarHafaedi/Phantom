import { Track } from '../types';

export interface HistoryRecord {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  format: string;
  duration: number;
  playedAt: number; // Unix timestamp in ms
}

// Compact tuple format stored in localStorage: [trackId, unixSeconds, optionalShortTitle, optionalShortArtist]
// Example: ["p5-demo-1", 1727436000, "Wake Up", "Lyn"] (~35 bytes per entry!)
type CompactHistoryTuple = [string, number, string?, string?];

const STORAGE_KEY = 'p5_playback_history';
// Safe ceiling to protect against infinite runaway, while effectively unlimited (2,500 songs = ~80 KB, only 1.6% of localStorage's 5MB)
const MAX_COMPACT_CAPACITY = 2500;

/**
 * Parses raw localStorage data into standardized compact tuples,
 * seamlessly supporting both legacy verbose JSON and new compact tuple format.
 */
const readRawCompactHistory = (): CompactHistoryTuple[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): CompactHistoryTuple | null => {
        if (!item) return null;

        // 1. New compact tuple format: [id, t, title?, artist?]
        if (Array.isArray(item)) {
          const id = String(item[0] || '');
          const t = Number(item[1]) || Math.floor(Date.now() / 1000);
          const n = item[2] ? String(item[2]) : undefined;
          const a = item[3] ? String(item[3]) : undefined;
          return id ? [id, t, n, a] : null;
        }

        // 2. Compact object format: { id, t, n?, a? }
        if (typeof item === 'object' && 'id' in item) {
          const id = String(item.id || '');
          const t = Number(item.t) || Math.floor(Date.now() / 1000);
          const n = item.n ? String(item.n) : undefined;
          const a = item.a ? String(item.a) : undefined;
          return id ? [id, t, n, a] : null;
        }

        // 3. Legacy verbose format: { trackId, title, artist, album, coverUrl, ... }
        if (typeof item === 'object' && 'trackId' in item) {
          const id = String(item.trackId || '');
          const ms = Number(item.playedAt) || Date.now();
          const t = Math.floor(ms / 1000);
          const n = item.title ? String(item.title) : undefined;
          const a = item.artist ? String(item.artist) : undefined;
          return id ? [id, t, n, a] : null;
        }

        return null;
      })
      .filter((entry): entry is CompactHistoryTuple => entry !== null);
  } catch (err) {
    console.warn('Failed to parse compact playback history:', err);
    return [];
  }
};

/**
 * Retrieve playback history resolved with full track metadata from library if available.
 * Capacity is unbounded by default (up to 2,500 entries) while keeping localStorage footprint minuscule.
 */
export const getPlaybackHistory = (tracks: Track[] = []): HistoryRecord[] => {
  const compactList = readRawCompactHistory();
  const trackMap = new Map<string, Track>();
  for (const t of tracks) {
    trackMap.set(t.id, t);
  }

  return compactList.map(([trackId, unixSec, shortTitle, shortArtist]) => {
    const liveTrack = trackMap.get(trackId);
    const playedAtMs = unixSec * 1000;

    if (liveTrack) {
      return {
        trackId,
        title: liveTrack.title,
        artist: liveTrack.artist,
        album: liveTrack.album || 'Unknown Album',
        coverUrl: liveTrack.coverUrl || '',
        format: liveTrack.format || 'MP3',
        duration: liveTrack.duration || 0,
        playedAt: playedAtMs,
      };
    }

    // Fallback if track is no longer in library
    return {
      trackId,
      title: shortTitle || 'Archived Track',
      artist: shortArtist || 'Unknown Artist',
      album: 'Library',
      coverUrl: '',
      format: 'AUDIO',
      duration: 0,
      playedAt: playedAtMs,
    };
  });
};

/**
 * Add track to playback history in compact reference format (~35 bytes per entry).
 * Deduplicates and bumps the track to top (like Spotify), preserving unlimited capacity without bloat.
 */
export const recordPlaybackHistory = (track: Track, tracks: Track[] = []): HistoryRecord[] => {
  if (!track || !track.id) return getPlaybackHistory(tracks);

  try {
    const current = readRawCompactHistory();
    // Deduplicate: remove previous entry of the same track to keep history clean and compact
    const filtered = current.filter(([id]) => id !== track.id);

    const nowSec = Math.floor(Date.now() / 1000);
    const shortTitle = track.title ? track.title.slice(0, 50) : undefined;
    const shortArtist = track.artist ? track.artist.slice(0, 35) : undefined;

    const newTuple: CompactHistoryTuple = [track.id, nowSec, shortTitle, shortArtist];
    const updated = [newTuple, ...filtered].slice(0, MAX_COMPACT_CAPACITY);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const resolved = getPlaybackHistory(tracks.length > 0 ? tracks : [track]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p5_history_updated', { detail: resolved }));
    }

    return resolved;
  } catch (err) {
    console.warn('Failed to write compact playback history:', err);
    return getPlaybackHistory(tracks);
  }
};

/**
 * Remove a specific item from playback history
 */
export const removeHistoryItem = (trackId: string, tracks: Track[] = []): HistoryRecord[] => {
  try {
    const current = readRawCompactHistory();
    const updated = current.filter(([id]) => id !== trackId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    const resolved = getPlaybackHistory(tracks);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p5_history_updated', { detail: resolved }));
    }
    return resolved;
  } catch {
    return getPlaybackHistory(tracks);
  }
};

/**
 * Wipe all playback history
 */
export const clearPlaybackHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p5_history_updated', { detail: [] }));
    }
  } catch {
    // Ignored
  }
};

/**
 * Formats timestamp into lightweight human-readable relative time
 */
export const formatTimeAgo = (timestamp: number): string => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
};
