export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  url: string; // Object URL or synthetic source
  coverUrl: string;
  coverBlob?: Blob;
  format: string; // 'FLAC' | 'MP3' | 'WAV' | 'OGG' | 'AAC' | 'M4A' | 'OPUS'
  sampleRate?: number; // e.g. 44100 or 96000
  bitDepth?: number; // e.g. 16 or 24
  bitrate?: string; // e.g. '320 kbps' or '1411 kbps'
  fileSize?: number; // bytes
  file?: File;
  lyrics?: LyricLine[];
  isFavorite?: boolean;
  isDemo?: boolean;
  addedAt: number;
}

export type VisualizerMode = 'particles' | 'clothWave' | 'p5Vinyl' | 'spectrum3D';

export type ThemeId = 'phantom-red' | 'ice-blue' | 'winter-bloom' | 'poseidon' | 'mazarine-blue';

export interface ColorTheme {
  id: ThemeId;
  name: string;
  hex: string;
  accent: string;
  accentHover: string;
  accentGlow: string;
  bgDark: string;
  surface: string;
  border: string;
  textOnAccent: string;
  badgeBg: string;
  threeLight: number;
  particleRgb: [number, number, number];
  subParticleRgb: [number, number, number];
  subAccentHex: string;
  subAccentName: string;
}

export interface EqualizerPreset {
  name: string;
  gains: number[]; // 5 bands: 60Hz, 250Hz, 1kHz, 4kHz, 12kHz (-12 to +12 dB)
  bassBoost: number; // 0 to 10 dB
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
}
