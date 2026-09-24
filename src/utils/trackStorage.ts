import { Track, LyricLine } from '../types';
import { generateP5CoverSvg } from './audioMetadata';

const DB_NAME = 'Persona5PlayerAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

export interface StoredTrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  format: string;
  sampleRate?: number;
  bitDepth?: number;
  bitrate?: string;
  fileSize?: number;
  fileBlob?: Blob;
  coverBlob?: Blob;
  coverUrl?: string;
  lyrics?: LyricLine[];
  isFavorite?: boolean;
  isDemo?: boolean;
  addedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('addedAt', 'addedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Converts a runtime Track into a persistable record with real audio & image Blobs
 */
async function trackToRecord(track: Track): Promise<StoredTrackRecord> {
  let fileBlob: Blob | undefined = track.file;

  // If track.file was somehow absent but blob URL exists, extract the blob
  if (!fileBlob && track.url && track.url.startsWith('blob:')) {
    try {
      const res = await fetch(track.url);
      fileBlob = await res.blob();
    } catch {
      // ignore
    }
  }

  let coverBlob: Blob | undefined = track.coverBlob;
  let coverUrl: string | undefined = track.coverUrl;

  // If coverUrl is a blob URL without a recorded coverBlob, grab the blob
  if (!coverBlob && coverUrl && coverUrl.startsWith('blob:')) {
    try {
      const res = await fetch(coverUrl);
      coverBlob = await res.blob();
    } catch {
      // ignore
    }
  }

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    format: track.format,
    sampleRate: track.sampleRate,
    bitDepth: track.bitDepth,
    bitrate: track.bitrate,
    fileSize: track.fileSize,
    fileBlob,
    coverBlob,
    coverUrl: coverUrl?.startsWith('data:') ? coverUrl : undefined,
    lyrics: track.lyrics,
    isFavorite: track.isFavorite,
    isDemo: track.isDemo,
    addedAt: track.addedAt || Date.now(),
  };
}

/**
 * Restores a stored database record into a live, playable Track with valid Object URLs
 */
function recordToTrack(record: StoredTrackRecord): Track {
  let url = '';
  let file: File | undefined;

  if (record.fileBlob) {
    url = URL.createObjectURL(record.fileBlob);
    file = new File([record.fileBlob], record.title, {
      type: record.fileBlob.type || 'audio/mpeg',
    });
  }

  let coverUrl = '';
  if (record.coverBlob) {
    coverUrl = URL.createObjectURL(record.coverBlob);
  } else if (record.coverUrl) {
    coverUrl = record.coverUrl;
  } else {
    coverUrl = generateP5CoverSvg(record.title, record.artist);
  }

  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    album: record.album,
    duration: record.duration,
    url,
    coverUrl,
    coverBlob: record.coverBlob,
    format: record.format,
    sampleRate: record.sampleRate,
    bitDepth: record.bitDepth,
    bitrate: record.bitrate,
    fileSize: record.fileSize,
    file,
    lyrics: record.lyrics,
    isFavorite: record.isFavorite ?? false,
    isDemo: record.isDemo ?? false,
    addedAt: record.addedAt,
  };
}

/**
 * Loads all stored tracks from IndexedDB, preserving all scanned music offline
 */
export async function loadStoredTracks(): Promise<Track[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records: StoredTrackRecord[] = req.result || [];
        // Preserve chronological sort or insertion order
        records.sort((a, b) => b.addedAt - a.addedAt);
        const restoredTracks = records.map(recordToTrack);
        resolve(restoredTracks);
      };

      req.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Persists an array of tracks (or batch scanned songs) into IndexedDB
 */
export async function saveTracksToStorage(tracks: Track[]): Promise<void> {
  if (!tracks || tracks.length === 0) return;
  try {
    const db = await openDB();
    const records = await Promise.all(tracks.map(trackToRecord));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const rec of records) {
        store.put(rec);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fail-safe
  }
}

/**
 * Saves or updates a single track
 */
export async function saveTrackToStorage(track: Track): Promise<void> {
  return saveTracksToStorage([track]);
}

/**
 * Deletes a track permanently from IndexedDB
 */
export async function deleteTrackFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fail-safe
  }
}

/**
 * Updates favorite status for a stored track
 */
export async function updateTrackFavoriteInStorage(id: string, isFavorite: boolean): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result as StoredTrackRecord | undefined;
        if (record) {
          record.isFavorite = isFavorite;
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    // Fail-safe
  }
}
