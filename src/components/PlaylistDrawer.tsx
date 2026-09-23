import React, { useState, useRef } from 'react';
import { Track, ColorTheme } from '../types';
import {
  FolderOpen,
  FileAudio,
  Search,
  X,
  Heart,
  Trash2,
  Play,
  Pause,
  HardDrive,
  Sparkles,
  Volume2
} from 'lucide-react';
import { playP5Sound } from '../utils/sfx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (track: Track) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteTrack: (id: string) => void;
  onImportFiles: (files: FileList) => void;
  currentTheme: ColorTheme;
}

export const PlaylistDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onToggleFavorite,
  onDeleteTrack,
  onImportFiles,
  currentTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'lossless'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'favorites') return t.isFavorite;
    if (activeTab === 'lossless') return t.format === 'FLAC' || t.format === 'WAV';
    return true;
  });

  const totalSeconds = tracks.reduce((acc, t) => acc + t.duration, 0);

  return (
    <>
      {/* Hidden File Inputs for Scanning */}
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

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={() => {
            playP5Sound('back');
            onClose();
          }}
        />
      )}

      {/* Slide-out Drawer with Persona 5 Angles */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-full sm:w-[480px] bg-[#0c0d12] border-r-4 flex flex-col transition-transform duration-300 ease-out pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          borderRightColor: currentTheme.accent,
          boxShadow: `10px 0 35px ${currentTheme.accentGlow}`,
        }}
      >
        {/* Drawer Header */}
        <div className="relative p-5 pb-4 border-b border-white/10 bg-[#0e0f14]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="p5-badge-cut px-3 py-1 text-xs font-mono font-black tracking-widest uppercase border border-black shadow-[2px_2px_0px_#000]"
                style={{
                  backgroundColor: currentTheme.accent,
                  color: currentTheme.textOnAccent,
                }}
              >
                TAKE YOUR SOUND
              </div>
              <h3 className="text-xl font-extrabold tracking-wider font-display text-white">
                LOCAL LIBRARY
              </h3>
            </div>
            <button
              onClick={() => {
                playP5Sound('back');
                onClose();
              }}
              className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Import Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => {
                playP5Sound('click');
                folderInputRef.current?.click();
              }}
              className="p5-badge-cut p-2.5 text-xs font-mono font-black tracking-wider flex items-center justify-center gap-2 transition-all border-2 border-black shadow-[3px_3px_0px_#000] active:scale-95 cursor-pointer"
              style={{
                backgroundColor: currentTheme.accent,
                color: currentTheme.textOnAccent,
              }}
            >
              <FolderOpen className="w-4 h-4" />
              SCAN FOLDER
            </button>
            <button
              onClick={() => {
                playP5Sound('click');
                fileInputRef.current?.click();
              }}
              className="p5-badge-cut bg-white/10 hover:bg-white/20 text-white p-2.5 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-all border border-black shadow-[2px_2px_0px_#000] active:scale-95 cursor-pointer"
            >
              <FileAudio className="w-4 h-4 text-[#ffd700]" />
              ADD FILES
            </button>
          </div>

          {/* Search Bar with Slanted Cut */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search title, artist, or album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#14151c] text-white text-xs font-mono pl-9 pr-3 py-2 border border-white/10 focus:outline-none transition-colors"
              style={{ borderColor: searchQuery ? currentTheme.accent : undefined }}
            />
          </div>

          {/* Persona 5 Tabs */}
          <div className="flex items-center gap-1 mt-3 border-b border-white/5 pt-1">
            <button
              onClick={() => {
                playP5Sound('toggle');
                setActiveTab('all');
              }}
              className={`pb-2 px-3 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'border-b-2 font-black'
                  : 'text-white/50 hover:text-white'
              }`}
              style={{
                color: activeTab === 'all' ? currentTheme.accent : undefined,
                borderBottomColor: activeTab === 'all' ? currentTheme.accent : 'transparent',
              }}
            >
              ALL ({tracks.length})
            </button>
            <button
              onClick={() => {
                playP5Sound('toggle');
                setActiveTab('favorites');
              }}
              className={`pb-2 px-3 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'favorites'
                  ? 'border-b-2 font-black'
                  : 'text-white/50 hover:text-white'
              }`}
              style={{
                color: activeTab === 'favorites' ? currentTheme.accent : undefined,
                borderBottomColor: activeTab === 'favorites' ? currentTheme.accent : 'transparent',
              }}
            >
              FAVORITES ({tracks.filter((t) => t.isFavorite).length})
            </button>
            <button
              onClick={() => {
                playP5Sound('toggle');
                setActiveTab('lossless');
              }}
              className={`pb-2 px-3 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'lossless'
                  ? 'text-[#00d2ff] border-b-2 border-[#00d2ff] font-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              HI-RES ({tracks.filter((t) => t.format === 'FLAC' || t.format === 'WAV').length})
            </button>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin">
          {filteredTracks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-white/40">
              <HardDrive className="w-10 h-10 mb-3 text-white/20" />
              <p className="text-sm font-bold text-white/70">No Audio Files Found</p>
              <p className="text-xs font-mono mt-1">
                Click "Scan Folder" or drag audio files anywhere into the window.
              </p>
            </div>
          ) : (
            filteredTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    playP5Sound('select');
                    onSelectTrack(track);
                  }}
                  className={`group relative p-2 flex items-center gap-3 cursor-pointer transition-all border-2 border-black ${
                    isCurrent
                      ? 'bg-[#181922]'
                      : 'bg-[#101116]/80 hover:bg-[#15161f]'
                  }`}
                  style={{
                    boxShadow: isCurrent ? `3px 3px 0px ${currentTheme.accent}` : '2px 2px 0px #000',
                    clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  }}
                >
                  {/* Track Index or Playing Wave */}
                  <div className="w-6 text-center text-xs font-mono text-white/40 flex-shrink-0">
                    {isCurrent && isPlaying ? (
                      <Volume2 className="w-4 h-4 mx-auto animate-pulse" style={{ color: currentTheme.accent }} />
                    ) : (
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-10 h-10 bg-black flex-shrink-0 border border-white/10 overflow-hidden">
                    <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                      ) : (
                        <Play className="w-4 h-4 text-white fill-white" />
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className="text-xs font-bold truncate"
                        style={{ color: isCurrent ? currentTheme.accent : '#ffffff' }}
                      >
                        {track.title}
                      </h4>
                      {track.isDemo && (
                        <span className="text-[9px] px-1 py-0.2 bg-white/10 text-[#ffd700] font-mono uppercase">
                          DEMO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 truncate font-mono">
                      {track.artist} • {track.album}
                    </p>
                  </div>

                  {/* Format & Duration */}
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 uppercase tracking-wider ${
                        track.format === 'FLAC'
                          ? 'bg-[#00d2ff]/20 text-[#00d2ff]'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {track.format}
                    </span>

                    <span className="text-xs font-mono text-white/40">
                      {formatTime(track.duration)}
                    </span>

                    {/* Favorite Heart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playP5Sound('click');
                        onToggleFavorite(track.id);
                      }}
                      className="p-1 transition-colors cursor-pointer"
                      style={{
                        color: track.isFavorite ? currentTheme.accent : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <Heart
                        className="w-3.5 h-3.5"
                        style={{
                          fill: track.isFavorite ? currentTheme.accent : 'none',
                        }}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playP5Sound('click');
                        onDeleteTrack(track.id);
                      }}
                      className="p-1 text-white/20 hover:text-red-400 transition-colors"
                      title="Remove from player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Library Stats */}
        <div className="p-4 border-t border-white/10 bg-[#090a0d] flex items-center justify-between text-xs font-mono text-white/50">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: currentTheme.accent }} />
            <span>100% OFFLINE LOCAL ENGINE</span>
          </div>
          <div>
            <span>{tracks.length} TRACKS</span> • <span>{formatTime(totalSeconds)}</span>
          </div>
        </div>
      </div>
    </>
  );
};