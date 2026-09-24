import React, { useState, useRef, useEffect } from 'react';
import { Track, LyricLine, ColorTheme } from '../types';
import { parseLrcString } from '../utils/lrcParser';
import { playP5Sound } from '../utils/sfx';
import { X, FileText, Upload, Check, Music2, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  onSaveLyrics: (trackId: string, lyrics: LyricLine[]) => void;
  currentTheme: ColorTheme;
}

export const LyricsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTrack,
  onSaveLyrics,
  currentTheme,
}) => {
  const [lyricsText, setLyricsText] = useState('');
  const [previewLines, setPreviewLines] = useState<LyricLine[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize textarea from current track lyrics
  useEffect(() => {
    if (!isOpen || !currentTrack) return;
    if (currentTrack.lyrics && currentTrack.lyrics.length > 0) {
      // Reconstruct LRC text
      const lrc = currentTrack.lyrics
        .map((l) => {
          const m = Math.floor(l.time / 60);
          const s = Math.floor(l.time % 60);
          const ms = Math.floor((l.time % 1) * 100);
          const timeTag = `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
          return `${timeTag} ${l.text}`;
        })
        .join('\n');
      setLyricsText(lrc);
      setPreviewLines(currentTrack.lyrics);
    } else {
      setLyricsText('');
      setPreviewLines([]);
    }
  }, [isOpen, currentTrack]);

  if (!isOpen || !currentTrack) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLyricsText(val);
    const parsed = parseLrcString(val, currentTrack.duration);
    setPreviewLines(parsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      setLyricsText(text);
      const parsed = parseLrcString(text, currentTrack.duration);
      setPreviewLines(parsed);
      playP5Sound('slash');
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    const parsed = parseLrcString(lyricsText, currentTrack.duration);
    onSaveLyrics(currentTrack.id, parsed);
    playP5Sound('slash');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Hidden file picker for LRC / TXT files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".lrc,.txt"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div
        className="relative w-full max-w-2xl bg-[#090b11] border-3 border-black text-white p-4 sm:p-6 shadow-[10px_10px_0px_#000] flex flex-col max-h-[90vh]"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        }}
      >
        {/* Accent Top Border Stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: currentTheme.accent }}
        />

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-white/20 pb-3 mb-4">
          <div>
            <div
              className="inline-block px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider mb-1"
              style={{ backgroundColor: currentTheme.accent, color: currentTheme.textOnAccent }}
            >
              LYRICS EDITOR // SYNCHRONIZER
            </div>
            <h2 className="text-lg sm:text-2xl font-black italic tracking-wide uppercase flex items-center gap-2">
              <Music2 className="w-5 h-5" style={{ color: currentTheme.accent }} />
              {currentTrack.title}
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              ARTIST: <span className="text-white font-bold">{currentTrack.artist}</span>
            </p>
          </div>

          <button
            onClick={() => {
              playP5Sound('back');
              onClose();
            }}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/30 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons: Import file or quick help */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-display tracking-wider flex items-center gap-1.5 border-2 border-black bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>LOAD .LRC FILE</span>
            </button>

            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Supports [mm:ss.xx] synced or plain text
            </span>
          </div>

          <div className="text-[11px] font-mono text-zinc-400">
            {previewLines.length > 0 ? (
              <span className="text-[#ffd700] font-bold">
                ✓ {previewLines.length} LYRIC LINES DETECTED
              </span>
            ) : (
              <span>PASTE LRC OR TEXT BELOW</span>
            )}
          </div>
        </div>

        {/* Text Area Input */}
        <div className="flex-1 flex flex-col min-h-0 mb-4">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            LRC Timestamps or Plain Lyrics Text:
          </label>
          <textarea
            value={lyricsText}
            onChange={handleTextChange}
            placeholder={`[00:12.30] Example synced lyric line\n[00:16.80] Another synced lyric line\n\nOr paste plain lyrics (they will auto-distribute across the song duration)`}
            className="w-full flex-1 p-3 bg-black/90 border border-white/20 text-white font-mono text-xs sm:text-sm focus:outline-hidden focus:border-white resize-none leading-relaxed rounded-none"
            style={{ minHeight: '160px' }}
          />
        </div>

        {/* Live Timestamped Preview */}
        {previewLines.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto bg-black/60 border border-white/10 p-2.5 font-mono text-[11px] space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1 border-b border-white/10 pb-0.5">
              Live Synchronization Preview:
            </div>
            {previewLines.slice(0, 10).map((line, idx) => {
              const m = Math.floor(line.time / 60);
              const s = Math.floor(line.time % 60);
              const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[#ffd700] font-bold w-12 shrink-0">[{timeStr}]</span>
                  <span className="text-zinc-300 truncate">{line.text}</span>
                </div>
              );
            })}
            {previewLines.length > 10 && (
              <div className="text-[10px] text-zinc-500 italic">
                ...and {previewLines.length - 10} more lines
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/20">
          <button
            onClick={() => {
              playP5Sound('back');
              onClose();
            }}
            className="px-4 py-2 text-xs font-display tracking-wider border border-white/30 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            CANCEL
          </button>

          <button
            onClick={handleSave}
            disabled={!lyricsText.trim()}
            className="px-5 py-2 text-xs sm:text-sm font-display tracking-wider font-black flex items-center gap-2 border-2 border-black transition-all cursor-pointer shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: currentTheme.accent,
              color: currentTheme.textOnAccent,
            }}
          >
            <Check className="w-4 h-4" />
            <span>SAVE TO TRACK & OFFLINE DB</span>
          </button>
        </div>
      </div>
    </div>
  );
};
