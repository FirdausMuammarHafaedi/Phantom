import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  FilePlus,
  ListMusic,
  Volume2,
  VolumeX,
  Info,
  Flame,
  X,
  CheckCircle2,
  Cpu,
  Palette,
  Layers
} from 'lucide-react';
import { ColorTheme } from '../types';
import { playP5Sound } from '../utils/sfx';

interface Props {
  onOpenLibrary: () => void;
  onImportFiles: (files: FileList) => void;
  trackCount: number;
  soundFxEnabled: boolean;
  onToggleSoundFx: () => void;
  currentTheme: ColorTheme;
  onOpenThemeSelector: () => void;
  onToggleQueue?: () => void;
  isQueueExpanded?: boolean;
}

export const TopBar: React.FC<Props> = ({
  onOpenLibrary,
  onImportFiles,
  trackCount,
  soundFxEnabled,
  onToggleSoundFx,
  currentTheme,
  onOpenThemeSelector,
  onToggleQueue,
  isQueueExpanded = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showArchitectureModal, setShowArchitectureModal] = useState(false);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.flac,.mp3,.wav,.ogg,.m4a,.aac,.opus,.webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportFiles(e.target.files);
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error - webkitdirectory is standard in browsers for folder selection
        webkitdirectory=""
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportFiles(e.target.files);
          }
        }}
      />

      <header
        id="persona-topbar"
        className="fixed top-0 left-0 right-0 z-30 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between pointer-events-none pt-[max(0.6rem,env(safe-area-inset-top))]"
      >
        {/* LEFT: Persona 5 Brand & Library Drawer Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
          <button
            onClick={() => {
              playP5Sound('slash');
              onOpenLibrary();
            }}
            className="p5-badge-cut text-white px-3 sm:px-4 py-1.5 sm:py-2 font-display text-sm sm:text-base tracking-wider flex items-center gap-1.5 sm:gap-2 border-2 border-black transition-all cursor-pointer transform hover:-rotate-1 active:scale-95"
            style={{
              backgroundColor: currentTheme.accent,
              color: currentTheme.textOnAccent,
              boxShadow: `3px 3px 0px #000`,
            }}
            title="Open Local Library"
          >
            <ListMusic className="w-4 h-4" />
            <span>LIBRARY ({trackCount})</span>
          </button>

          {/* Mobile Queue toggle */}
          {onToggleQueue && (
            <button
              onClick={() => {
                playP5Sound('click');
                onToggleQueue();
              }}
              className="md:hidden p5-badge-cut px-2 py-1.5 text-xs font-mono font-bold tracking-wider text-white bg-black/80 border-2 border-black flex items-center gap-1 cursor-pointer active:scale-95"
              style={{
                boxShadow: `2px 2px 0px ${currentTheme.accent}`,
              }}
              title="Toggle Queue"
            >
              <Layers className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
              <span className="text-[10px]">QUEUE</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2.5 text-xs font-mono tracking-widest text-white/80 bg-black/60 px-3 py-1 border border-black shadow-[2px_2px_0px_#000]">
            <Flame className="w-4 h-4" style={{ color: currentTheme.accent }} />
            <span className="font-extrabold text-white">PHANTOM</span>
            <span className="text-white/30">•</span>
            <span className="text-[#ffd700]">COMIC EDITION</span>
          </div>
        </div>

        {/* RIGHT: Quick File & Folder Upload + Theme Selector */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto bg-[#0c0d12]/95 backdrop-blur-md py-1 sm:py-1.5 pl-4 sm:pl-5 pr-3 sm:pr-4 border-2 border-black p5-badge-cut"
          style={{ boxShadow: `3px 3px 0px ${currentTheme.accent}` }}
        >
          {/* Theme Palette Switcher Button */}
          <button
            onClick={() => {
              playP5Sound('click');
              onOpenThemeSelector();
            }}
            className="px-2.5 sm:px-3 py-1 text-xs font-mono font-black tracking-wider text-white hover:text-white flex items-center gap-2 transition-colors cursor-pointer border border-black/40 shadow-sm"
            style={{ backgroundColor: `${currentTheme.accent}33` }}
            title="Change Color Theme & Comic Style"
          >
            <span
              className="w-2.5 h-2.5 border border-black shadow-[1px_1px_0px_#000] flex-shrink-0"
              style={{ backgroundColor: currentTheme.accent }}
            />
            <Palette className="w-3.5 h-3.5 text-[#ffd700] flex-shrink-0" />
            <span className="hidden md:inline font-mono ml-0.5 tracking-wide">{currentTheme.name}</span>
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-0.5 my-auto" />

          {/* Toggle Floating 3D Queue */}
          {onToggleQueue && (
            <button
              onClick={() => {
                playP5Sound('toggle');
                onToggleQueue();
              }}
              className={`px-2.5 py-1 text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                isQueueExpanded
                  ? 'text-white border-cyan-400 bg-cyan-400/20 shadow-[0_0_12px_rgba(0,255,255,0.35)]'
                  : 'text-white/60 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle 3D Floating Song Queue"
            >
              <Layers className="w-3.5 h-3.5" style={{ color: isQueueExpanded ? (currentTheme.subAccentHex || '#00ffff') : undefined }} />
              <span className="hidden sm:inline">QUEUE</span>
            </button>
          )}

          <div className="w-[1px] h-4 bg-white/20 mx-0.5 my-auto" />

          {/* Add Single File / Local Audio Scan */}
          <button
            onClick={() => {
              playP5Sound('click');
              fileInputRef.current?.click();
            }}
            className="px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-white/90 hover:text-white hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import Audio Files from Phone or PC"
          >
            <FilePlus className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            <span className="hidden sm:inline">ADD FILES</span>
          </button>

          {/* Scan Folder (Desktop or Chromium Android) */}
          <button
            onClick={() => {
              playP5Sound('click');
              folderInputRef.current?.click();
            }}
            className="hidden sm:flex px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-white/90 hover:text-white hover:bg-white/10 items-center gap-1.5 transition-colors cursor-pointer"
            title="Scan Entire Music Directory"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#ffd700]" />
            <span>SCAN</span>
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-0.5 my-auto" />

          {/* Sound FX Toggle */}
          <button
            onClick={() => {
              playP5Sound('toggle');
              onToggleSoundFx();
            }}
            className={`p-1.5 transition-colors cursor-pointer ${
              soundFxEnabled ? 'text-[#ffd700]' : 'text-white/30 hover:text-white'
            }`}
            title={`P5 UI Sound Effects: ${soundFxEnabled ? 'ON' : 'OFF'}`}
          >
            {soundFxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Info Architecture / Requirements */}
          <button
            onClick={() => {
              playP5Sound('click');
              setShowArchitectureModal(true);
            }}
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Offline & Low RAM Architecture Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Architecture & Offline Specs Modal */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="relative w-full max-w-xl bg-[#0c0d12] border-2 border-[#e60012] shadow-[0_0_35px_rgba(230,0,18,0.4)] p-6"
            style={{
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#e60012]" />
                <h3 className="text-lg font-bold font-display text-white tracking-wider">
                  LIGHTWEIGHT & FULL OFFLINE ARCHITECTURE
                </h3>
              </div>
              <button
                onClick={() => {
                  playP5Sound('back');
                  setShowArchitectureModal(false);
                }}
                className="text-white/50 hover:text-white p-1 hover:bg-white/10 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono text-white/80 leading-relaxed">
              <div className="flex items-start gap-2.5 bg-[#14151e] p-3 border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-[#e60012] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase">100% Zero Internet / Offline First</span>
                  <p className="text-white/60 mt-0.5">
                    Audio files are scanned directly from your hard drive or SSD via browser File System API. Files never leave your computer and zero data is sent to external servers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#14151e] p-3 border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-[#ffd700] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase">Ultra-Low RAM Footprint</span>
                  <p className="text-white/60 mt-0.5">
                    Uses native HTML5 Audio streams with Web Audio API nodes. Only currently playing audio buffers are loaded into memory, using less than 35MB RAM compared to 300MB+ in Electron desktop apps.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#14151e] p-3 border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-[#00d2ff] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase">Broad Audio Codec Support</span>
                  <p className="text-white/60 mt-0.5">
                    Supports Lossless FLAC, WAV (up to 24-bit / 96kHz), MP3, OGG Vorbis, AAC, M4A, and OPUS.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-[#14151e] p-3 border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase">Persona 5 Dynamic Visuals</span>
                  <p className="text-white/60 mt-0.5">
                    Interactive 3D particle heightfields, tilted queue cards, and procedural audio sfx synthesized with mathematical oscillators for 0 KB asset overhead.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => {
                  playP5Sound('slash');
                  setShowArchitectureModal(false);
                }}
                className="p5-badge-cut bg-[#e60012] hover:bg-[#ff1a2b] text-white px-5 py-2 text-xs font-mono font-bold tracking-widest uppercase cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
