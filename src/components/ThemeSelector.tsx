import React from 'react';
import { ColorTheme, ThemeId } from '../types';
import { COLOR_THEMES } from '../utils/theme';
import { Palette, X, Sparkles, Check } from 'lucide-react';
import { playP5Sound } from '../utils/sfx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ColorTheme;
  onSelectTheme: (themeId: ThemeId) => void;
  showSpeedlines: boolean;
  onToggleSpeedlines: () => void;
}

export const ThemeSelector: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  showSpeedlines,
  onToggleSpeedlines,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg bg-[#0e0f14] border-3 border-black p-6 shadow-2xl"
        style={{
          boxShadow: `8px 8px 0px ${currentTheme.accent}`,
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="p5-badge-cut px-3 py-1 font-mono text-xs font-black tracking-widest uppercase border border-black shadow-[2px_2px_0px_#000]"
              style={{ backgroundColor: currentTheme.accent, color: currentTheme.textOnAccent }}
            >
              VISUAL PALETTE
            </div>
            <h3 className="text-xl font-bold font-display text-white tracking-wider flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#ffd700]" />
              THEME & COMIC STYLE
            </h3>
          </div>
          <button
            onClick={() => {
              playP5Sound('back');
              onClose();
            }}
            className="text-white/50 hover:text-white p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comic Speedlines Toggle Banner */}
        <div className="mb-5 p-3.5 bg-[#14151f] border-2 border-black flex items-center justify-between shadow-[4px_4px_0px_#000]">
          <div>
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5 uppercase">
              <Sparkles className="w-4 h-4 text-[#ffd700]" />
              MANGA SPEED LINES & ACTION BURSTS
            </span>
            <p className="text-[11px] font-mono text-white/50 mt-0.5">
              Radial comic action streaks behind the 3D visualizer
            </p>
          </div>
          <button
            onClick={() => {
              playP5Sound('toggle');
              onToggleSpeedlines();
            }}
            className="px-3.5 py-1.5 text-xs font-mono font-black tracking-wider uppercase border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_#000]"
            style={{
              backgroundColor: showSpeedlines ? currentTheme.accent : '#252634',
              color: showSpeedlines ? currentTheme.textOnAccent : '#ffffff',
            }}
          >
            {showSpeedlines ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* Theme List */}
        <div className="space-y-2.5 mb-6">
          <div className="text-[11px] font-mono text-white/60 tracking-wider flex items-center justify-between">
            <span>SELECT COLOR PALETTE:</span>
            <span className="text-[#ffd700]">5 HEX OPTIONS AVAILABLE</span>
          </div>

          {(Object.keys(COLOR_THEMES) as ThemeId[]).map((id) => {
            const theme = COLOR_THEMES[id];
            const isSelected = currentTheme.id === id;

            return (
              <div
                key={id}
                onClick={() => {
                  playP5Sound('slash');
                  onSelectTheme(id);
                }}
                className={`p-3 border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-white bg-[#191b26] shadow-[4px_4px_0px_#000]'
                    : 'border-black bg-[#101118] hover:bg-[#161722] hover:border-white/30'
                }`}
                style={{
                  borderLeft: isSelected ? `6px solid ${theme.accent}` : undefined,
                }}
              >
                <div className="flex items-center gap-3.5">
                  {/* Dual-Tone Swatch Box */}
                  <div
                    className="relative w-11 h-11 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${theme.accent} 50%, ${theme.subAccentHex} 50%)`,
                    }}
                  >
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-black/75 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-white font-sans tracking-wide">
                        {theme.name}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black text-white/90 border border-white/20">
                        {theme.hex}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1 py-0.2 border border-black font-bold"
                        style={{ backgroundColor: theme.subAccentHex, color: '#000000' }}
                      >
                        +{theme.subAccentName}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-white/60 mt-0.5">
                      {id === 'phantom-red' && 'Crimson Red with Canary Yellow secondary rings'}
                      {id === 'ice-blue' && 'Glacier Ice Cyan with Neon Cyber Orchid highlights'}
                      {id === 'winter-bloom' && 'Velvet Plum Rose with Champagne Gold highlights'}
                      {id === 'poseidon' && 'Oceanic Deep Blue with Neon Seafoam Mint (Video style)'}
                      {id === 'mazarine-blue' && 'Royal Cobalt Blue with Solar Amber secondary rings'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black shadow-inner"
                    style={{ backgroundColor: theme.accent }}
                    title={theme.name}
                  />
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-black shadow-inner"
                    style={{ backgroundColor: theme.subAccentHex }}
                    title={theme.subAccentName}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              playP5Sound('click');
              onClose();
            }}
            className="p5-badge-cut px-6 py-2 text-xs font-mono font-black tracking-widest uppercase transition-all shadow-[4px_4px_0px_#000] border-2 border-black cursor-pointer"
            style={{
              backgroundColor: currentTheme.accent,
              color: currentTheme.textOnAccent,
            }}
          >
            APPLY PALETTE
          </button>
        </div>
      </div>
    </div>
  );
};
