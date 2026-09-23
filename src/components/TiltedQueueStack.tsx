import React, { useState, useEffect } from 'react';
import { Track, ColorTheme } from '../types';
import { ListMusic, Play, ChevronRight, Sparkles, X } from 'lucide-react';
import { playP5Sound } from '../utils/sfx';

interface Props {
  tracks: Track[];
  currentTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  isPlaying: boolean;
  currentTheme: ColorTheme;
  expanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

export const TiltedQueueStack: React.FC<Props> = ({
  tracks,
  currentTrack,
  onSelectTrack,
  isPlaying,
  currentTheme,
  expanded: controlledExpanded,
  onToggleExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = (val: boolean) => {
    if (onToggleExpand) {
      onToggleExpand(val);
    } else {
      setInternalExpanded(val);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && controlledExpanded === undefined) {
        setInternalExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [controlledExpanded]);

  const queueList = tracks;

  return (
    <>
      {/* Mobile backdrop when queue is expanded on phone */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-25 bg-black/60 md:hidden backdrop-blur-xs"
          onClick={() => {
            playP5Sound('back');
            handleToggle(false);
          }}
        />
      )}

      <aside
        id="tilted-queue-panel"
        className={`fixed md:absolute top-16 sm:top-20 right-2 sm:right-4 z-30 transition-all duration-400 ease-out ${
          isExpanded
            ? 'translate-x-0 opacity-100'
            : 'translate-x-[110%] md:translate-x-[85%] opacity-0 md:opacity-40 hover:opacity-100 pointer-events-none md:pointer-events-auto'
        }`}
        style={{ perspective: '1200px' }}
        aria-label="Playback Queue"
      >
        {/* Toggle / Header Button */}
        <div className="flex items-center justify-between md:justify-end mb-2">
          {/* Mobile Title & Close */}
          <div className="md:hidden flex items-center justify-between w-full bg-[#0c0d12] p-1.5 border border-black p5-badge-cut shadow-[2px_2px_0px_#000]">
            <span className="text-xs font-mono font-black text-white pl-2">
              PLAYLIST QUEUE ({queueList.length})
            </span>
            <button
              onClick={() => {
                playP5Sound('back');
                handleToggle(false);
              }}
              className="p-1 text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop fold/expand button */}
          <button
            onClick={() => {
              playP5Sound('click');
              handleToggle(!isExpanded);
            }}
            className="hidden md:flex p5-badge-cut text-white px-3.5 py-1.5 text-xs font-mono font-black tracking-widest items-center gap-1.5 border-2 border-black cursor-pointer transition-all shadow-[3px_3px_0px_#000]"
            style={{
              backgroundColor: currentTheme.accent,
              color: currentTheme.textOnAccent,
            }}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>{isExpanded ? 'FOLD QUEUE' : 'EXPAND QUEUE'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 3D Tilted Card Container */}
        <div
          className="w-72 sm:w-80 max-h-[calc(100vh-210px)] sm:max-h-[calc(100vh-230px)] overflow-y-auto pr-2 sm:pr-3 space-y-2 sm:space-y-3 py-2 scrollbar-thin transition-transform duration-300"
          style={{
            transformStyle: 'preserve-3d',
            transform: isExpanded && typeof window !== 'undefined' && window.innerWidth >= 768
              ? 'rotateY(-24deg) rotateX(8deg) scale(0.95)'
              : 'none',
          }}
        >
          {queueList.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;

            return (
              <div
                key={track.id}
                onClick={() => {
                  playP5Sound('select');
                  onSelectTrack(track);
                  if (window.innerWidth < 768) {
                    handleToggle(false);
                  }
                }}
                className={`group relative p-2.5 rounded-none cursor-pointer transition-all duration-300 transform md:hover:translate-x-[-12px] md:hover:translate-z-[30px] border-2 border-black ${
                  isCurrent
                    ? 'bg-[#14151c]'
                    : 'bg-[#101116]/95 hover:bg-[#181922]'
                }`}
                style={{
                  boxShadow: isCurrent
                    ? `5px 5px 0px ${currentTheme.accent}`
                    : '4px 4px 0px #000000',
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                }}
              >
                {/* Persona 5 Angular Accent Strip on active */}
                {isCurrent && (
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5 shadow-[0_0_10px]"
                    style={{
                      backgroundColor: currentTheme.accent,
                      boxShadow: `0 0 10px ${currentTheme.accent}`,
                    }}
                  />
                )}

                <div className="flex items-center gap-3">
                  {/* Album Art with P5 cutout */}
                  <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden bg-black border border-white/10">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {isCurrent && (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: `${currentTheme.accent}66` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                      </div>
                    )}
                  </div>

                  {/* Song Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-[#ffd700] tracking-wider">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase bg-white/10 text-white/80 rounded-none tracking-tight">
                        {track.format}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold truncate leading-tight tracking-wide font-sans ${
                        isCurrent ? 'text-white font-extrabold' : 'text-white/90 group-hover:text-white'
                      }`}
                    >
                      {track.title}
                    </h4>

                    <p className="text-[11px] text-white/50 truncate font-mono mt-0.5">
                      {track.artist}
                    </p>
                  </div>

                  {/* Play / Hover Icon */}
                  <div className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isCurrent && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 h-3 animate-bounce" style={{ backgroundColor: currentTheme.accent }} />
                        <span className="w-0.5 h-2 bg-white animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-0.5 h-3.5 bg-[#ffd700] animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    ) : (
                      <Play className="w-3.5 h-3.5" style={{ color: currentTheme.accent, fill: currentTheme.accent }} />
                    )}
                  </div>
                </div>

                {/* Lossless Indicator Pill */}
                {track.format === 'FLAC' && (
                  <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-white/40">
                    <span className="flex items-center gap-1 text-[#00d2ff]">
                      <Sparkles className="w-2.5 h-2.5" />
                      HI-RES LOSSLESS
                    </span>
                    <span>{track.sampleRate ? `${track.sampleRate / 1000}kHz` : '24-bit'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};
