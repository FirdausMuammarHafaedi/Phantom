import { ColorTheme, ThemeId } from '../types';

export const COLOR_THEMES: Record<ThemeId, ColorTheme> = {
  'phantom-red': {
    id: 'phantom-red',
    name: 'Phantom Red',
    hex: '#e60012',
    accent: '#e60012',
    accentHover: '#ff1a2b',
    accentGlow: 'rgba(230, 0, 18, 0.45)',
    bgDark: '#0a0a0e',
    surface: '#12131b',
    border: '#e60012',
    textOnAccent: '#ffffff',
    badgeBg: '#e60012',
    threeLight: 0xe60012,
    particleRgb: [0.92, 0.05, 0.12], // Crimson Red
    subParticleRgb: [1.0, 0.85, 0.12], // Canary Golden Yellow
    subAccentHex: '#ffd700',
    subAccentName: 'Canary Yellow',
  },
  'ice-blue': {
    id: 'ice-blue',
    name: 'Ice Blue',
    hex: '#00d2ff',
    accent: '#00d2ff',
    accentHover: '#33dcff',
    accentGlow: 'rgba(0, 210, 255, 0.45)',
    bgDark: '#070c14',
    surface: '#0b1622',
    border: '#00d2ff',
    textOnAccent: '#05101a',
    badgeBg: '#00d2ff',
    threeLight: 0x00d2ff,
    particleRgb: [0.02, 0.78, 1.0], // Glacier Cyan
    subParticleRgb: [1.0, 0.22, 0.65], // Neon Cyber Orchid / Magenta
    subAccentHex: '#ff3388',
    subAccentName: 'Cyber Magenta',
  },
  'winter-bloom': {
    id: 'winter-bloom',
    name: 'Winter Bloom',
    hex: '#b53d86',
    accent: '#b53d86',
    accentHover: '#cc4b99',
    accentGlow: 'rgba(181, 61, 134, 0.55)',
    bgDark: '#0d070c',
    surface: '#1a0e18',
    border: '#b53d86',
    textOnAccent: '#ffffff',
    badgeBg: '#b53d86',
    threeLight: 0xb53d86,
    particleRgb: [0.72, 0.18, 0.58], // Velvet Plum Rose
    subParticleRgb: [1.0, 0.82, 0.22], // Radiant Champagne Gold
    subAccentHex: '#ffd13b',
    subAccentName: 'Champagne Gold',
  },
  'poseidon': {
    id: 'poseidon',
    name: 'Poseidon',
    hex: '#0d73d9',
    accent: '#0d73d9',
    accentHover: '#1f8aff',
    accentGlow: 'rgba(13, 115, 217, 0.55)',
    bgDark: '#040b12',
    surface: '#071624',
    border: '#0d73d9',
    textOnAccent: '#ffffff',
    badgeBg: '#0d73d9',
    threeLight: 0x0d73d9,
    particleRgb: [0.05, 0.45, 0.88], // Deep Ocean Blue
    subParticleRgb: [0.0, 1.0, 0.68], // Bioluminescent Neon Seafoam Mint (matching video)
    subAccentHex: '#00ffa9',
    subAccentName: 'Neon Seafoam',
  },
  'mazarine-blue': {
    id: 'mazarine-blue',
    name: 'Mazarine Blue',
    hex: '#3355cc',
    accent: '#3355cc',
    accentHover: '#486cee',
    accentGlow: 'rgba(51, 85, 204, 0.55)',
    bgDark: '#060914',
    surface: '#0b1126',
    border: '#3355cc',
    textOnAccent: '#ffffff',
    badgeBg: '#3355cc',
    threeLight: 0x3355cc,
    particleRgb: [0.18, 0.35, 0.94], // Royal Cobalt
    subParticleRgb: [1.0, 0.56, 0.10], // Solar Sunset Amber
    subAccentHex: '#ff901a',
    subAccentName: 'Solar Amber',
  },
};
