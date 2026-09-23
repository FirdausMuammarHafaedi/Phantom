import React from 'react';
import { EqualizerGains } from '../utils/audioEngine';
import { ColorTheme } from '../types';
import { X, RotateCcw, Sliders, Zap } from 'lucide-react';
import { playP5Sound } from '../utils/sfx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gains: EqualizerGains;
  onChangeGains: (gains: EqualizerGains) => void;
  currentTheme: ColorTheme;
}

const PRESETS = [
  {
    name: 'FLAT AUDIOPHILE',
    gains: { band60: 0, band250: 0, band1k: 0, band4k: 0, band12k: 0, bassBoost: 0 },
  },
  {
    name: 'PHANTOM FUNK',
    gains: { band60: 4, band250: 2, band1k: -1, band4k: 3, band12k: 4, bassBoost: 4 },
  },
  {
    name: 'MEMENTOS BASS',
    gains: { band60: 8, band250: 5, band1k: 0, band4k: -1, band12k: 1, bassBoost: 8 },
  },
  {
    name: 'VELVET LOUNGE',
    gains: { band60: 3, band250: 3, band1k: 2, band4k: 1, band12k: -2, bassBoost: 2 },
  },
  {
    name: 'ALL-OUT ATTACK',
    gains: { band60: 6, band250: 2, band1k: -2, band4k: 4, band12k: 6, bassBoost: 5 },
  },
];

export const EqualizerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  gains,
  onChangeGains,
  currentTheme,
}) => {
  if (!isOpen) return null;

  const handleBandChange = (key: keyof EqualizerGains, value: number) => {
    onChangeGains({
      ...gains,
      [key]: value,
    });
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    playP5Sound('select');
    onChangeGains(preset.gains);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg bg-[#0e0f14] border-2 border-black p-6 shadow-2xl"
        style={{
          boxShadow: `8px 8px 0px ${currentTheme.accent}`,
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="p5-badge-cut px-3 py-1 font-mono text-xs font-black tracking-widest uppercase border border-black shadow-[2px_2px_0px_#000]"
              style={{
                backgroundColor: currentTheme.accent,
                color: currentTheme.textOnAccent,
              }}
            >
              DSP SOUND ENGINE
            </div>
            <h3 className="text-xl font-bold font-display text-white tracking-wider flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#ffd700]" />
              5-BAND EQUALIZER
            </h3>
          </div>
          <button
            onClick={() => {
              playP5Sound('back');
              onClose();
            }}
            className="text-white/50 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Row */}
        <div className="mb-6">
          <div className="text-[11px] font-mono text-white/60 mb-2 tracking-wider flex items-center gap-1.5 font-bold">
            <Zap className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            PERSONA SOUND PROFILES:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const isMatch =
                gains.band60 === preset.gains.band60 &&
                gains.band12k === preset.gains.band12k &&
                gains.bassBoost === preset.gains.bassBoost;

              return (
                <button
                  key={preset.name}
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border border-black ${
                    isMatch
                      ? 'shadow-[2px_2px_0px_#000]'
                      : 'bg-[#181922] text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  style={{
                    backgroundColor: isMatch ? currentTheme.accent : undefined,
                    color: isMatch ? currentTheme.textOnAccent : undefined,
                    clipPath: 'polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)',
                  }}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Band Vertical Sliders */}
        <div className="grid grid-cols-5 gap-3 bg-[#12131b] p-5 border-2 border-black mb-6 shadow-[3px_3px_0px_#000]">
          {[
            { key: 'band60' as const, label: '60 Hz', sub: 'SUB-BASS' },
            { key: 'band250' as const, label: '250 Hz', sub: 'WARMTH' },
            { key: 'band1k' as const, label: '1.0 kHz', sub: 'VOCALS' },
            { key: 'band4k' as const, label: '4.0 kHz', sub: 'ATTACK' },
            { key: 'band12k' as const, label: '12 kHz', sub: 'AIR' },
          ].map((band) => (
            <div key={band.key} className="flex flex-col items-center">
              <span className="text-xs font-mono font-bold text-[#ffd700] mb-2">
                {gains[band.key] > 0 ? `+${gains[band.key]}` : gains[band.key]} dB
              </span>

              {/* Vertical Slider */}
              <div className="h-40 flex items-center justify-center my-1 relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={gains[band.key]}
                  onChange={(e) => handleBandChange(band.key, parseFloat(e.target.value))}
                  className="h-36 cursor-pointer"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                    accentColor: currentTheme.accent,
                  }}
                />
              </div>

              <span className="text-[11px] font-mono font-bold text-white mt-2">
                {band.label}
              </span>
              <span className="text-[9px] font-mono text-white/40 uppercase">
                {band.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Bass Boost Slider */}
        <div className="bg-[#12131b] p-4 border-2 border-black mb-6 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-white flex items-center gap-2">
              <span className="w-2 h-2 inline-block" style={{ backgroundColor: currentTheme.accent }} />
              ANALOG BASS BOOST (SUB 80Hz)
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: currentTheme.accent }}>
              +{gains.bassBoost} dB
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={gains.bassBoost}
            onChange={(e) => handleBandChange('bassBoost', parseFloat(e.target.value))}
            className="w-full cursor-pointer h-2 bg-[#1c1d29]"
            style={{ accentColor: currentTheme.accent }}
          />
        </div>

        {/* Reset & Apply Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              playP5Sound('back');
              onChangeGains({
                band60: 0,
                band250: 0,
                band1k: 0,
                band4k: 0,
                band12k: 0,
                bassBoost: 0,
              });
            }}
            className="text-xs font-mono text-white/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET TO FLAT (0 dB)
          </button>

          <button
            onClick={() => {
              playP5Sound('slash');
              onClose();
            }}
            className="p5-badge-cut px-6 py-2.5 text-xs font-mono font-black tracking-widest uppercase transition-all border-2 border-black shadow-[3px_3px_0px_#000] active:scale-95 cursor-pointer"
            style={{
              backgroundColor: currentTheme.accent,
              color: currentTheme.textOnAccent,
            }}
          >
            CLOSE & ENJOY
          </button>
        </div>
      </div>
    </div>
  );
};
