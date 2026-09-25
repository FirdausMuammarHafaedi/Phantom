import React, { useState, useRef, useEffect } from 'react';
import { Track, LyricLine, ColorTheme } from '../types';
import { parseLrcString } from '../utils/lrcParser';
import { fetchOnlineLyrics, cleanTrackTitle, cleanArtistName } from '../utils/onlineLyrics';
import { playP5Sound } from '../utils/sfx';
import { X, FileText, Upload, Check, Music2, Globe, Search, Loader2 } from 'lucide-react';

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

  // Online search state
  const [searchTitle, setSearchTitle] = useState('');
  const [searchArtist, setSearchArtist] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<{
    type: 'idle' | 'success' | 'not_found' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Initialize inputs from current track
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    setSearchTitle(cleanTrackTitle(currentTrack.title));
    setSearchArtist(cleanArtistName(currentTrack.artist));
    setOnlineStatus({ type: 'idle', message: '' });

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

  // Trigger online lyrics streaming from LRCLIB
  const handleSearchOnline = async () => {
    if (!searchTitle.trim()) return;
    setIsSearchingOnline(true);
    setOnlineStatus({ type: 'idle', message: 'Connecting to LRCLIB database...' });
    playP5Sound('select');

    try {
      const result = await fetchOnlineLyrics(
        searchTitle.trim(),
        searchArtist.trim(),
        currentTrack.duration
      );

      if (result && result.lyrics.length > 0) {
        setLyricsText(result.rawText);
        setPreviewLines(result.lyrics);
        playP5Sound('slash');
        setOnlineStatus({
          type: 'success',
          message: `Found ${result.synced ? 'synchronized' : 'plain'} lyrics for "${result.trackName || searchTitle}" (${result.lyrics.length} lines)!`,
        });
      } else {
        setOnlineStatus({
          type: 'not_found',
          message: 'No exact lyrics match found on LRCLIB. Try modifying the title/artist keywords above.',
        });
      }
    } catch {
      setOnlineStatus({
        type: 'error',
        message: 'Network error or lyrics service unreachable.',
      });
    } finally {
      setIsSearchingOnline(false);
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
        className="relative w-full max-w-2xl bg-[#090b11] border-3 border-black text-white p-4 sm:p-6 shadow-[10px_10px_0px_#000] flex flex-col max-h-[92vh] overflow-hidden"
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
        <div className="flex items-start justify-between border-b-2 border-white/20 pb-3 mb-3">
          <div>
            <div
              className="inline-block px-2.5 py-0.5 text-[10px] font-mono font-black uppercase tracking-wider mb-1"
              style={{ backgroundColor: currentTheme.accent, color: currentTheme.textOnAccent }}
            >
              ONLINE LYRICS STREAMER // SYNCHRONIZER
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

        {/* ONLINE STREAMING BAR (LRCLIB Integration) */}
        <div className="mb-3 p-2.5 bg-black/80 border border-white/20">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            <Globe className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            <span>Stream Lyrics Online (LRCLIB Synced Database)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-5">
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder="Song Title..."
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/20 text-white font-mono text-xs focus:outline-hidden focus:border-white"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                value={searchArtist}
                onChange={(e) => setSearchArtist(e.target.value)}
                placeholder="Artist (optional)..."
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/20 text-white font-mono text-xs focus:outline-hidden focus:border-white"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                onClick={handleSearchOnline}
                disabled={isSearchingOnline || !searchTitle.trim()}
                className="w-full h-full py-1.5 px-2 text-xs font-display tracking-wider font-bold flex items-center justify-center gap-1.5 border border-black bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
              >
                {isSearchingOnline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>FETCHING...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>STREAM NOW</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Online Search Status message */}
          {onlineStatus.message && (
            <div
              className={`mt-2 text-[11px] font-mono p-1.5 border flex items-center gap-1.5 ${
                onlineStatus.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : onlineStatus.type === 'not_found'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-900 border-white/20 text-zinc-300'
              }`}
            >
              <span>{onlineStatus.message}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Import file or status */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 text-xs font-display tracking-wider flex items-center gap-1.5 border border-white/30 bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <Upload className="w-3 h-3" />
              <span>OR LOAD LOCAL .LRC FILE</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-400">
            {previewLines.length > 0 ? (
              <span className="text-[#ffd700] font-bold">
                ✓ {previewLines.length} LYRIC LINES LOADED
              </span>
            ) : (
              <span>NO LYRICS LOADED YET</span>
            )}
          </div>
        </div>

        {/* Text Area Input */}
        <div className="flex-1 flex flex-col min-h-0 mb-3 overflow-hidden">
          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            LRC Timestamps or Plain Lyrics Text:
          </label>
          <textarea
            value={lyricsText}
            onChange={handleTextChange}
            placeholder={`[00:12.30] Example synced lyric line\n[00:16.80] Another synced lyric line\n\nClick "STREAM NOW" above to fetch online synced lyrics automatically!`}
            className="w-full flex-1 p-2.5 bg-black/90 border border-white/20 text-white font-mono text-xs sm:text-sm focus:outline-hidden focus:border-white resize-none leading-relaxed rounded-none"
            style={{ minHeight: '120px' }}
          />
        </div>

        {/* Live Timestamped Preview */}
        {previewLines.length > 0 && (
          <div className="mb-3 max-h-24 overflow-y-auto bg-black/60 border border-white/10 p-2 font-mono text-[11px] space-y-1 shrink-0">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-0.5 border-b border-white/10 pb-0.5">
              Live Synchronization Preview:
            </div>
            {previewLines.slice(0, 6).map((line, idx) => {
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
            {previewLines.length > 6 && (
              <div className="text-[10px] text-zinc-500 italic">
                ...and {previewLines.length - 6} more lines
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/20 shrink-0">
          <button
            onClick={() => {
              playP5Sound('back');
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-display tracking-wider border border-white/30 text-zinc-300 hover:text-white transition-all cursor-pointer"
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
