import { Track } from '../types';

/**
 * Lightweight pure-client-side audio metadata & cover extractor.
 * Zero network dependencies, zero bloated libraries, ultra-fast.
 */

// Generate specialized Chase Atlantic "Beauty in Death" album cover SVG matching the video exactly
export function generateBeautyInDeathCoverSvg(title: string = 'STRANGER THINGS'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <defs>
      <radialGradient id="oceanGlow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#00ffff" stop-opacity="0.95"/>
        <stop offset="25%" stop-color="#00a8e8" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="#003566" stop-opacity="0.95"/>
        <stop offset="90%" stop-color="#001428" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000814" stop-opacity="1"/>
      </radialGradient>
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.7  0 0 0 0 0.9  0 0 0 0.5 0"/>
        <feComposite in2="SourceGraphic" in="glitch" operator="arithmetic" k1="0.5" k2="0.8" k3="0.2" k4="0"/>
      </filter>
      <linearGradient id="bustGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d4edf8"/>
        <stop offset="35%" stop-color="#76a8c4"/>
        <stop offset="70%" stop-color="#244d6b"/>
        <stop offset="100%" stop-color="#0c2336"/>
      </linearGradient>
    </defs>

    <!-- Deep oceanic water background -->
    <rect width="500" height="500" fill="url(#oceanGlow)"/>

    <!-- Concentric wave ripples in cyan/white -->
    <ellipse cx="250" cy="250" rx="230" ry="230" fill="none" stroke="#00ffff" stroke-width="4" opacity="0.35"/>
    <ellipse cx="250" cy="250" rx="195" ry="195" fill="none" stroke="#64dfdf" stroke-width="6" opacity="0.45"/>
    <ellipse cx="250" cy="250" rx="160" ry="160" fill="none" stroke="#48cae4" stroke-width="8" opacity="0.55"/>
    <ellipse cx="250" cy="250" rx="125" ry="125" fill="none" stroke="#90e0ef" stroke-width="12" opacity="0.7"/>
    <ellipse cx="250" cy="250" rx="90" ry="90" fill="none" stroke="#ffffff" stroke-width="14" opacity="0.85"/>

    <!-- Central Sculpted Bust Silhouette (Beauty In Death Motif) -->
    <g transform="translate(160, 130) scale(0.72)">
      <!-- Head and hair profile -->
      <path d="M125 40 C70 40 40 85 45 135 C35 155 30 180 32 205 C25 220 20 250 35 270 C50 288 80 295 105 305 C115 330 110 365 100 400 L150 400 C145 365 140 330 150 305 C175 295 205 288 220 270 C235 250 230 220 223 205 C225 180 220 155 210 135 C215 85 185 40 125 40 Z" fill="url(#bustGrad)" opacity="0.95"/>
      <!-- Facial contour highlights -->
      <ellipse cx="125" cy="150" rx="45" ry="55" fill="#e8f4f8" opacity="0.65"/>
      <ellipse cx="125" cy="210" rx="35" ry="40" fill="#a4cbdf" opacity="0.55"/>
      <circle cx="105" cy="140" r="10" fill="#0e2a3f" opacity="0.8"/>
      <circle cx="145" cy="140" r="10" fill="#0e2a3f" opacity="0.8"/>
      <path d="M115 175 Q125 185 135 175" stroke="#0e2a3f" stroke-width="4" fill="none"/>
    </g>

    <!-- Subdued grid pattern -->
    <g stroke="rgba(255,255,255,0.08)" stroke-width="1">
      <line x1="0" y1="125" x2="500" y2="125"/>
      <line x1="0" y1="250" x2="500" y2="250"/>
      <line x1="0" y1="375" x2="500" y2="375"/>
      <line x1="125" y1="0" x2="125" y2="500"/>
      <line x1="250" y1="0" x2="250" y2="500"/>
      <line x1="375" y1="0" x2="375" y2="500"/>
    </g>

    <!-- Album Text Overlay -->
    <text x="35" y="445" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="3">
      CHASE ATLANTIC
    </text>
    <text x="35" y="470" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" fill="#64dfdf" letter-spacing="4">
      BEAUTY IN DEATH [DELUXE EDITION]
    </text>
    
    <!-- Parental Advisory / Warning Badge at bottom right -->
    <rect x="360" y="438" width="105" height="38" fill="#000000" stroke="#ffffff" stroke-width="1.5" rx="3"/>
    <text x="370" y="454" font-family="Arial, sans-serif" font-size="8" font-weight="900" fill="#ffffff" letter-spacing="1">
      PARENTAL
    </text>
    <text x="370" y="468" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#ffffff" letter-spacing="2">
      ADVISORY
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generate stylized Persona 5 procedural SVG covers when files don't have embedded art
export function generateP5CoverSvg(title: string, artist: string): string {
  const hash = (title + artist).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const angles = [12, -15, 25, -30, 45];
  const angle = angles[hash % angles.length];
  const redShades = ['#e60012', '#c90010', '#ff1a2b', '#b3000f'];
  const bgRed = redShades[hash % redShades.length];
  const shortTitle = title.substring(0, 16).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <rect width="500" height="500" fill="#0c0d12"/>
    <defs>
      <pattern id="p5dots_${hash}" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.06)"/>
        <circle cx="10" cy="10" r="1.5" fill="rgba(230,0,18,0.15)"/>
      </pattern>
    </defs>
    <rect width="500" height="500" fill="url(#p5dots_${hash})"/>
    
    <!-- Bold Angular Persona 5 Slashes -->
    <polygon points="0,${180 + (hash % 100)} 500,${80 + (hash % 80)} 500,${340 + (hash % 60)} 0,${420 - (hash % 60)}" fill="${bgRed}" />
    <polygon points="40,${200 + (hash % 80)} 460,${120 + (hash % 80)} 480,${160 + (hash % 80)} 20,${240 + (hash % 80)}" fill="#ffffff" opacity="0.95" />
    <polygon points="0,460 500,380 500,500 0,500" fill="#14151c" />

    <!-- Stars & Graphic Badges -->
    <g transform="translate(${380}, ${70}) rotate(${angle})">
      <polygon points="0,-24 7,-7 24,-7 10,4 15,22 0,11 -15,22 -10,4 -24,-7 -7,-7" fill="#ffd700"/>
    </g>
    <g transform="translate(${70}, ${390}) rotate(${-angle})">
      <polygon points="0,-18 5,-5 18,-5 8,3 11,16 0,8 -11,16 -8,3 -18,-5 -5,-5" fill="#ffffff"/>
    </g>

    <!-- Stylized Typographic Labels -->
    <text x="50" y="225" font-family="'Impact', 'Bebas Neue', sans-serif" font-size="44" font-weight="900" fill="#0c0d12" transform="rotate(${angle * 0.4} 250 250)">
      ${escapeXml(shortTitle)}
    </text>
    <text x="52" y="315" font-family="'Rajdhani', sans-serif" font-size="24" font-weight="700" fill="#ffffff" letter-spacing="2">
      ${escapeXml(artist.substring(0, 22).toUpperCase())}
    </text>
    <text x="50" y="470" font-family="'Rajdhani', sans-serif" font-size="14" font-weight="600" fill="#ffd700" letter-spacing="4">
      PHANTOM AUDIO SYSTEM // HI-RES
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Parses ID3v2 APIC (cover picture) & text tags if available in raw bytes
 */
export async function extractId3Metadata(file: File): Promise<{
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
}> {
  try {
    const buffer = await file.slice(0, 512 * 1024).arrayBuffer(); // Read first 512KB
    const view = new DataView(buffer);

    // Check "ID3" identifier
    if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
      const version = view.getUint8(3);
      // Syncsafe integer for size
      const tagSize =
        ((view.getUint8(6) & 0x7f) << 21) |
        ((view.getUint8(7) & 0x7f) << 14) |
        ((view.getUint8(8) & 0x7f) << 7) |
        (view.getUint8(9) & 0x7f);

      let offset = 10;
      let title: string | undefined;
      let artist: string | undefined;
      let album: string | undefined;
      let coverUrl: string | undefined;

      const decoder = new TextDecoder('utf-8');
      const latin1Decoder = new TextDecoder('iso-8859-1');

      while (offset < Math.min(buffer.byteLength, tagSize + 10)) {
        if (offset + 10 > buffer.byteLength) break;

        const frameId = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );

        if (!frameId.match(/^[A-Z0-9]{4}$/)) break;

        let frameSize = 0;
        if (version === 4) {
          frameSize =
            ((view.getUint8(offset + 4) & 0x7f) << 21) |
            ((view.getUint8(offset + 5) & 0x7f) << 14) |
            ((view.getUint8(offset + 6) & 0x7f) << 7) |
            (view.getUint8(offset + 7) & 0x7f);
        } else {
          frameSize = view.getUint32(offset + 4, false);
        }

        if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) {
          offset += 10 + Math.max(0, frameSize);
          continue;
        }

        const frameDataOffset = offset + 10;

        if (frameId === 'TIT2') {
          // Song Title
          const enc = view.getUint8(frameDataOffset);
          const raw = new Uint8Array(buffer, frameDataOffset + 1, frameSize - 1);
          title = (enc === 3 || enc === 1 ? decoder : latin1Decoder).decode(raw).replace(/\0/g, '').trim();
        } else if (frameId === 'TPE1') {
          // Artist
          const enc = view.getUint8(frameDataOffset);
          const raw = new Uint8Array(buffer, frameDataOffset + 1, frameSize - 1);
          artist = (enc === 3 || enc === 1 ? decoder : latin1Decoder).decode(raw).replace(/\0/g, '').trim();
        } else if (frameId === 'TALB') {
          // Album
          const enc = view.getUint8(frameDataOffset);
          const raw = new Uint8Array(buffer, frameDataOffset + 1, frameSize - 1);
          album = (enc === 3 || enc === 1 ? decoder : latin1Decoder).decode(raw).replace(/\0/g, '').trim();
        } else if (frameId === 'APIC') {
          // Embedded Picture
          try {
            const raw = new Uint8Array(buffer, frameDataOffset, frameSize);
            // Search for image/jpeg or image/png magic bytes (0xFF, 0xD8 or 0x89, 0x50)
            let imgStart = -1;
            let mimeType = 'image/jpeg';
            for (let i = 1; i < raw.length - 4; i++) {
              if (raw[i] === 0xff && raw[i + 1] === 0xd8 && raw[i + 2] === 0xff) {
                imgStart = i;
                mimeType = 'image/jpeg';
                break;
              }
              if (raw[i] === 0x89 && raw[i + 1] === 0x50 && raw[i + 2] === 0x4e && raw[i + 3] === 0x47) {
                imgStart = i;
                mimeType = 'image/png';
                break;
              }
            }
            if (imgStart !== -1) {
              const imgBytes = raw.subarray(imgStart);
              const blob = new Blob([imgBytes], { type: mimeType });
              coverUrl = URL.createObjectURL(blob);
            }
          } catch {
            // ignore error
          }
        }

        offset += 10 + frameSize;
      }

      return { title, artist, album, coverUrl };
    }
  } catch {
    // Return empty on non-id3 or unreadable
  }
  return {};
}

/**
 * Scan a single File object into our Track model
 */
export async function parseAudioFile(file: File): Promise<Track> {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
  const format = ['FLAC', 'MP3', 'WAV', 'OGG', 'AAC', 'M4A', 'OPUS'].includes(ext) ? ext : 'AUDIO';

  // Fallback title / artist guessing from filename
  let cleanName = file.name.replace(/\.[^/.]+$/, '');
  let artist = 'Local Artist';
  let title = cleanName;

  // Pattern: "Artist - Title"
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }

  // Extract ID3 tags if available
  const id3 = await extractId3Metadata(file);
  if (id3.title && id3.title.length > 0) title = id3.title;
  if (id3.artist && id3.artist.length > 0) artist = id3.artist;
  const album = id3.album || 'Local Library';
  const coverUrl = id3.coverUrl || generateP5CoverSvg(title, artist);

  const objectUrl = URL.createObjectURL(file);

  // Measure duration asynchronously
  const duration = await getAudioDuration(objectUrl);

  const bitrate = format === 'FLAC' ? '1411 kbps (Lossless)' : format === 'WAV' ? '1536 kbps (PCM)' : '320 kbps (HQ)';

  return {
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title,
    artist,
    album,
    duration,
    url: objectUrl,
    coverUrl,
    format,
    sampleRate: format === 'FLAC' ? 96000 : 44100,
    bitDepth: format === 'FLAC' ? 24 : 16,
    bitrate,
    fileSize: file.size,
    file,
    isFavorite: false,
    addedAt: Date.now(),
  };
}

function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 180);
    };
    audio.onerror = () => {
      resolve(210); // Safe fallback
    };
    audio.src = url;
  });
}
