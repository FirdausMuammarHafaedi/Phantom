import { Track } from '../types';
import { generateP5CoverSvg, generateBeautyInDeathCoverSvg } from './audioMetadata';

/**
 * Generates an actual playable audio Blob (offline 16-bit PCM WAV)
 * using Web Audio API synthesis so that demo tracks can play real audio
 * without requiring any internet connection or external downloads!
 */
export function generateSyntheticSongBlob(bpm: number = 110, durationSeconds: number = 60, mood: 'funk' | 'lofi' | 'rock' = 'funk'): string {
  const sampleRate = 22050; // Lightweight 22kHz sample rate for instant generation & minimal RAM
  const numSamples = sampleRate * durationSeconds;
  const numChannels = 2;
  const buffer = new Float32Array(numSamples);
  const bufferR = new Float32Array(numSamples);

  // Musical progressions
  const chordRoots = mood === 'funk' 
    ? [146.83, 174.61, 220.0, 196.0] // D3, F3, A3, G3
    : mood === 'rock' 
    ? [110.0, 130.81, 146.83, 164.81] // A2, C3, D3, E3
    : [130.81, 164.81, 174.61, 196.0]; // C3, E3, F3, G3

  const beatDuration = 60 / bpm;
  const subBeat = beatDuration / 4;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentChordIdx = Math.floor((t / (beatDuration * 4))) % chordRoots.length;
    const root = chordRoots[currentChordIdx];

    // Bassline (Funk slap / sub bass)
    const bassBeat = (t % (subBeat * 2)) / (subBeat * 2);
    const bassFreq = root / 2;
    const bassEnv = Math.max(0, Math.exp(-bassBeat * 4));
    const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.35 * bassEnv;

    // Electric Piano / Rhodes chord harmonics
    const chordTime = (t % (beatDuration * 2)) / (beatDuration * 2);
    const chordEnv = Math.max(0, Math.exp(-chordTime * 2.2));
    const chord1 = Math.sin(2 * Math.PI * root * t) * 0.15;
    const chord2 = Math.sin(2 * Math.PI * (root * 1.25) * t) * 0.12; // major/minor 3rd
    const chord3 = Math.sin(2 * Math.PI * (root * 1.5) * t) * 0.1;  // 5th
    const chord4 = Math.sin(2 * Math.PI * (root * 1.875) * t) * 0.08; // 7th
    const organ = (chord1 + chord2 + chord3 + chord4) * chordEnv;

    // Kick and Snare drum
    const barTime = t % beatDuration;
    let drum = 0;
    // Kick on beat 0 and 2
    const beatNum = Math.floor((t % (beatDuration * 4)) / beatDuration);
    if (barTime < 0.15 && (beatNum === 0 || beatNum === 2 || (beatNum === 3 && barTime > 0.3))) {
      const kickFreq = 120 * Math.exp(-barTime * 25);
      drum += Math.sin(2 * Math.PI * kickFreq * barTime) * Math.exp(-barTime * 15) * 0.45;
    }
    // Snare on beat 1 and 3
    if (barTime < 0.2 && (beatNum === 1 || beatNum === 3)) {
      const noise = (Math.random() * 2 - 1) * Math.exp(-barTime * 20) * 0.25;
      const snap = Math.sin(2 * Math.PI * 220 * barTime) * Math.exp(-barTime * 25) * 0.2;
      drum += noise + snap;
    }

    // Hi-hat tick every 16th note
    const hatTime = t % (subBeat);
    if (hatTime < 0.04) {
      drum += (Math.random() * 2 - 1) * Math.exp(-hatTime * 80) * 0.08;
    }

    const mixL = bass + organ + drum;
    const mixR = bass + organ * 0.9 + drum;

    buffer[i] = Math.max(-1, Math.min(1, mixL));
    bufferR[i] = Math.max(-1, Math.min(1, mixR));
  }

  // Convert Float32Array to 16-bit stereo WAV
  const wavBuffer = createWavFile([buffer, bufferR], sampleRate);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function createWavFile(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channels.length;
  const numFrames = channels[0].length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM 16-bit
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, val, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const INITIAL_DEMO_TRACKS: Track[] = [
  {
    id: 'demo_stranger_things',
    title: 'STRANGER THINGS',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH (DELUXE EDITION)',
    duration: 168,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('STRANGER THINGS'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: true,
    isDemo: true,
    addedAt: Date.now() - 50000,
    lyrics: [
      { time: 0, text: 'But stranger things have happened in the nighttime' },
      { time: 6, text: 'The way that things are going, shit, I might die...' },
      { time: 13, text: 'And these chemicals around me got me sky-high' },
      { time: 19, text: "I can't feel my face, yeah" },
      { time: 24, text: 'Stranger things have happened in the nighttime' },
      { time: 30, text: 'Rolling through the hills until the sun rise' },
      { time: 37, text: 'Lost inside the feeling, got me numb now' },
      { time: 44, text: "I don't wanna come down" },
    ],
  },
  {
    id: 'demo_slide',
    title: 'SLIDE',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH [DELUXE EDITION]',
    duration: 154,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('SLIDE'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: true,
    isDemo: true,
    addedAt: Date.now() - 45000,
    lyrics: [
      { time: 0, text: 'Slide into the midnight view' },
      { time: 6, text: 'Nothing else matters when I look at you' },
      { time: 12, text: 'Push the pedal down, watch the city fade' },
    ],
  },
  {
    id: 'demo_pleasexanny',
    title: 'PLEASEXANNY',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH [DELUXE EDITION]',
    duration: 142,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('PLEASEXANNY'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: false,
    isDemo: true,
    addedAt: Date.now() - 40000,
    lyrics: [
      { time: 0, text: 'Slow down the pace, catch the rhythm inside' },
      { time: 8, text: 'Floating in space where the shadows collide' },
    ],
  },
  {
    id: 'demo_wasted',
    title: 'WASTED',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH [DELUXE EDITION]',
    duration: 160,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('WASTED'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: true,
    isDemo: true,
    addedAt: Date.now() - 35000,
    lyrics: [
      { time: 0, text: "We don't need a reason to let go tonight" },
      { time: 6, text: 'Wasted in the glow of the neon blue light' },
    ],
  },
  {
    id: 'demo_please_stand_by',
    title: 'PLEASE STAND BY',
    artist: 'Chase Atlantic (feat. De’Wayne)',
    album: 'BEAUTY IN DEATH [DELUXE EDITION]',
    duration: 135,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('PLEASE STAND BY'),
    format: 'WAV',
    sampleRate: 44100,
    bitDepth: 16,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: false,
    isDemo: true,
    addedAt: Date.now() - 30000,
    lyrics: [
      { time: 0, text: 'Emergency transmission across the sound waves' },
      { time: 6, text: 'Stand by for the beat drop' },
    ],
  },
  {
    id: 'demo_beauty_in_death',
    title: 'BEAUTY IN DEATH',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH [DELUXE EDITION]',
    duration: 182,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('BEAUTY IN DEATH'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: true,
    isDemo: true,
    addedAt: Date.now() - 25000,
    lyrics: [
      { time: 0, text: 'There is beauty in the breakdown' },
      { time: 8, text: 'Watch the colors bleed into sound' },
    ],
  },
  {
    id: 'demo_paranoid',
    title: 'PARANOID',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH',
    duration: 156,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('PARANOID'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: false,
    isDemo: true,
    addedAt: Date.now() - 20000,
    lyrics: [
      { time: 0, text: 'Looking over my shoulder in the dark' },
      { time: 7, text: 'Electric pulse ignites the spark' },
    ],
  },
  {
    id: 'demo_call_me_back',
    title: 'CALL ME BACK',
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH',
    duration: 170,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg('CALL ME BACK'),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: false,
    isDemo: true,
    addedAt: Date.now() - 15000,
    lyrics: [
      { time: 0, text: 'Late night telephone ring echoes away' },
      { time: 8, text: 'Wish you would call me back someday' },
    ],
  },
  {
    id: 'demo_lost_again',
    title: "I THINK I'M LOST AGAIN",
    artist: 'Chase Atlantic',
    album: 'BEAUTY IN DEATH',
    duration: 165,
    url: '',
    coverUrl: generateBeautyInDeathCoverSvg("I THINK I'M LOST AGAIN"),
    format: 'FLAC',
    sampleRate: 96000,
    bitDepth: 24,
    bitrate: '1411 kbps (Lossless)',
    isFavorite: false,
    isDemo: true,
    addedAt: Date.now() - 10000,
    lyrics: [
      { time: 0, text: "I think I'm lost again inside the night" },
      { time: 7, text: 'Searching for the rhythm in the neon light' },
    ],
  },
];
