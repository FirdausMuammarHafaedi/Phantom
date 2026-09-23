import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Track, VisualizerMode, ColorTheme } from '../types';
import { globalAudioEngine } from '../utils/audioEngine';
import {
  RotateCw,
  Eye,
  Sparkles,
  Waves,
  Disc,
  Play,
  ListMusic,
  RotateCcw,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { playP5Sound } from '../utils/sfx';

interface Props {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  mode: VisualizerMode;
  onModeChange: (mode: VisualizerMode) => void;
  showLyrics: boolean;
  currentTheme: ColorTheme;
  tracks?: Track[];
  onSelectTrack?: (track: Track) => void;
  isQueueExpanded?: boolean;
  onToggleQueue?: () => void;
}

export const PersonaVisualizer3D: React.FC<Props> = ({
  currentTrack,
  isPlaying,
  currentTime,
  mode,
  onModeChange,
  showLyrics,
  currentTheme,
  tracks = [],
  onSelectTrack,
  isQueueExpanded: controlledQueueExpanded,
  onToggleQueue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floatingStageRef = useRef<HTMLDivElement>(null);

  // Queue expansion state (defaulting to always visible)
  const [internalQueueExpanded, setInternalQueueExpanded] = useState(true);
  const isQueueExpanded =
    controlledQueueExpanded !== undefined ? controlledQueueExpanded : internalQueueExpanded;

  // Responsive mobile Android viewport tracking
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleWinResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleWinResize);
    return () => window.removeEventListener('resize', handleWinResize);
  }, []);

  const handleToggleQueueInternal = () => {
    if (onToggleQueue) {
      onToggleQueue();
    } else {
      setInternalQueueExpanded((prev) => !prev);
    }
  };

  // Clean, unified front-facing orientation (like video 181654)
  // Both visualizer, lyrics and queue face directly towards the viewer with clean perspective
  const defaultRotation = { x: 0, y: 0 };
  const rotationRef = useRef({ ...defaultRotation });
  const [autoRotate, setAutoRotate] = useState(false);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragStartRef = useRef({
    x: 0,
    y: 0,
    rotX: 0,
    rotY: 0,
    posX: 0,
    posY: 0,
    hasMoved: false,
  });

  // User manual 3D movement / panning offset
  const stagePosRef = useRef({ x: 0, y: 0 });
  const [hasModifiedView, setHasModifiedView] = useState(false);

  // Mouse hover reaction & White Hover Effect
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const mouseHoverRef = useRef({ x: 0, y: 0, isHovered: false });
  const currHoverTiltRef = useRef({ x: 0, y: 0 });
  const currHoverElevationRef = useRef(0);
  const currWhiteLightRef = useRef(0);

  // Synchronized CSS stage position in pixels for hover aura
  const [stageAuraPos, setStageAuraPos] = useState({ x: -180, y: 0 });

  // Current lyric line
  const activeLyric = useMemo(() => {
    if (!currentTrack?.lyrics || currentTrack.lyrics.length === 0) return null;
    const lyrics = currentTrack.lyrics;
    let found = lyrics[0];
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        found = lyrics[i];
      } else {
        break;
      }
    }
    return found?.text || null;
  }, [currentTrack, currentTime]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 32);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    // Ambient and Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const mainThemeLight = new THREE.PointLight(currentTheme.threeLight, 5.0, 45);
    mainThemeLight.position.set(-15, 10, 15);
    scene.add(mainThemeLight);

    const subLight = new THREE.PointLight(0x00d2ff, 3.5, 40);
    subLight.position.set(15, -10, 15);
    scene.add(subLight);

    // Dedicated WHITE HOVER LIGHT: brilliant spotlight illuminating the visualizer on hover!
    const hoverWhiteLight = new THREE.PointLight(0xffffff, 0, 50);
    hoverWhiteLight.position.set(0, 3, 16);
    scene.add(hoverWhiteLight);

    // Root Group for 3D tilt, rotation & movement
    const stageGroup = new THREE.Group();

    // Determine base offset and scale based on viewport width and height (Android mobile responsive)
    const updateStageLayout = (w: number, h: number) => {
      const isDesktop = w >= 1024;
      const isTablet = w >= 768 && w < 1024;
      // On mobile portrait (e.g. Android phones), center the visualizer horizontally (0)
      // and lift it vertically (+3.0) to give clean breathing room for controls and queue
      const baseOffsetX = isDesktop ? -4.5 : isTablet ? -3.4 : 0;
      const baseOffsetY = isDesktop ? 0 : isTablet ? 0 : (h > w ? 2.8 : 0);
      const visualizerScale = isDesktop
        ? 1.0
        : isTablet
        ? 0.85
        : Math.max(0.54, Math.min(0.72, (w / 440) * 0.65));
      stageGroup.scale.set(visualizerScale, visualizerScale, visualizerScale);
      return { baseOffsetX, baseOffsetY };
    };

    let { baseOffsetX, baseOffsetY } = updateStageLayout(width, height);
    stageGroup.position.x = baseOffsetX + stagePosRef.current.x;
    stageGroup.position.y = baseOffsetY + stagePosRef.current.y;
    scene.add(stageGroup);

    // Dynamic Objects Based on Mode
    let particlesMesh: THREE.Points | null = null;
    let clothMesh: THREE.Mesh | null = null;
    let vinylGroup: THREE.Group | null = null;
    let shardsGroup: THREE.Group | null = null;
    let spectrumBarsGroup: THREE.Group | null = null;

    // Load cover image texture
    const textureLoader = new THREE.TextureLoader();
    const coverTexture = currentTrack?.coverUrl ? textureLoader.load(currentTrack.coverUrl) : null;
    if (coverTexture) {
      coverTexture.minFilter = THREE.LinearFilter;
      coverTexture.magFilter = THREE.LinearFilter;
    }

    // 1. PARTICLES MODE: facing directly front on the XY plane
    const gridSize = 60;
    const numParticles = gridSize * gridSize;
    const pPositions = new Float32Array(numParticles * 3);
    const pColors = new Float32Array(numParticles * 3);

    const spacing = 0.28;
    const half = (gridSize * spacing) / 2;

    const [pR, pG, pB] = currentTheme.particleRgb;
    const [subR, subG, subB] = currentTheme.subParticleRgb;

    for (let ix = 0; ix < gridSize; ix++) {
      for (let iy = 0; iy < gridSize; iy++) {
        const idx = ix * gridSize + iy;
        const x = ix * spacing - half;
        const y = iy * spacing - half;
        const z = 0; // Front-facing XY plane

        pPositions[idx * 3] = x;
        pPositions[idx * 3 + 1] = y;
        pPositions[idx * 3 + 2] = z;

        const distCenter = Math.sqrt(x * x + y * y) / half;
        if (distCenter < 0.35) {
          pColors[idx * 3] = 0.98;
          pColors[idx * 3 + 1] = 0.98;
          pColors[idx * 3 + 2] = 1.0;
        } else if (distCenter < 0.75) {
          pColors[idx * 3] = pR;
          pColors[idx * 3 + 1] = pG;
          pColors[idx * 3 + 2] = pB;
        } else {
          pColors[idx * 3] = subR;
          pColors[idx * 3 + 1] = subG;
          pColors[idx * 3 + 2] = subB;
        }
      }
    }

    const pGeometry = new THREE.BufferGeometry();
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMaterial = new THREE.PointsMaterial({
      size: 0.24,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    particlesMesh = new THREE.Points(pGeometry, pMaterial);

    // WHITE HOVER ENERGY RING: An orbital halo of sparkling white star points that glows on hover
    const haloCount = 140;
    const haloPositions = new Float32Array(haloCount * 3);
    const haloColors = new Float32Array(haloCount * 3);
    for (let i = 0; i < haloCount; i++) {
      const angle = (i / haloCount) * Math.PI * 2;
      const r = 9.8 + (Math.random() - 0.5) * 1.6;
      haloPositions[i * 3] = Math.cos(angle) * r;
      haloPositions[i * 3 + 1] = Math.sin(angle) * r;
      haloPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
      haloColors[i * 3] = 1.0;
      haloColors[i * 3 + 1] = 1.0;
      haloColors[i * 3 + 2] = 1.0;
    }
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    haloGeo.setAttribute('color', new THREE.BufferAttribute(haloColors, 3));
    const haloMat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const haloMesh = new THREE.Points(haloGeo, haloMat);
    stageGroup.add(haloMesh);

    // 2. CLOTH WAVE MODE: facing front XY plane
    const clothGeo = new THREE.PlaneGeometry(15, 15, 48, 48);
    const clothMat = new THREE.MeshStandardMaterial({
      map: coverTexture,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.45,
    });
    clothMesh = new THREE.Mesh(clothGeo, clothMat);

    // 3. PERSONA 5 VINYL & SHARDS MODE: facing front towards camera
    vinylGroup = new THREE.Group();
    const discGeo = new THREE.CylinderGeometry(7.2, 7.2, 0.2, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      roughness: 0.2,
      metalness: 0.8,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2; // Face forward
    vinylGroup.add(disc);

    const labelGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.22, 32);
    const labelMat = new THREE.MeshBasicMaterial({ map: coverTexture, color: 0xffffff });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.rotation.x = Math.PI / 2;
    vinylGroup.add(label);

    shardsGroup = new THREE.Group();
    for (let s = 0; s < 24; s++) {
      const shardGeo = new THREE.TetrahedronGeometry(0.5 + Math.random() * 0.7, 0);
      const shardMat = new THREE.MeshBasicMaterial({
        color: s % 3 === 0 ? currentTheme.threeLight : s % 3 === 1 ? 0xffd700 : 0xffffff,
        wireframe: s % 2 === 0,
      });
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const angle = (s / 24) * Math.PI * 2;
      const radius = 9.2 + Math.random() * 3.2;
      shard.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 4);
      shardsGroup.add(shard);
    }
    vinylGroup.add(shardsGroup);

    // 4. SPECTRUM 3D BARS: facing front
    spectrumBarsGroup = new THREE.Group();
    const barCount = 32;
    const barMeshes: THREE.Mesh[] = [];
    for (let b = 0; b < barCount; b++) {
      const bGeo = new THREE.BoxGeometry(0.35, 1, 0.35);
      const bMat = new THREE.MeshBasicMaterial({
        color: b % 2 === 0 ? currentTheme.threeLight : 0xffffff,
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      const angle = (b / barCount) * Math.PI * 2;
      const radius = 8.2;
      bMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      bMesh.rotation.z = angle - Math.PI / 2;
      spectrumBarsGroup.add(bMesh);
      barMeshes.push(bMesh);
    }

    // Attach active mode
    if (mode === 'particles') {
      stageGroup.add(particlesMesh);
    } else if (mode === 'clothWave') {
      stageGroup.add(clothMesh);
    } else if (mode === 'p5Vinyl') {
      stageGroup.add(vinylGroup);
    } else {
      stageGroup.add(spectrumBarsGroup);
    }

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let playWeight = isPlaying ? 1.0 : 0.0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Retrieve audio frequencies
      const freq = globalAudioEngine.getFrequencyData();
      const bassAvg = (freq[1] + freq[2] + freq[3] + freq[4]) / 4 / 255;
      const midAvg = (freq[12] + freq[14] + freq[16]) / 3 / 255;

      const targetPlay = isPlaying ? 1.0 : 0.0;
      playWeight += (targetPlay - playWeight) * 0.08;
      if (!isPlaying && playWeight < 0.002) {
        playWeight = 0;
      }

      // Gentle idle breathing
      const idleHoverY = Math.sin(elapsed * 1.3) * 0.35;

      // Interactive hover tilt & elevation
      const isCurrentlyHovered = isHoveredRef.current;
      const targetHoverTiltX = isCurrentlyHovered ? -mouseHoverRef.current.y * 0.12 : 0;
      const targetHoverTiltY = isCurrentlyHovered ? mouseHoverRef.current.x * 0.14 : 0;
      const targetHoverElevation = isCurrentlyHovered ? 2.0 : 0;

      currHoverTiltRef.current.x += (targetHoverTiltX - currHoverTiltRef.current.x) * 0.06;
      currHoverTiltRef.current.y += (targetHoverTiltY - currHoverTiltRef.current.y) * 0.06;
      currHoverElevationRef.current += (targetHoverElevation - currHoverElevationRef.current) * 0.06;

      // WHITE HOVER EFFECT INTENSITY (Smooth lerp up to 7.0)
      const targetWhite = isCurrentlyHovered ? 7.0 : 0.0;
      currWhiteLightRef.current += (targetWhite - currWhiteLightRef.current) * 0.09;
      hoverWhiteLight.intensity = currWhiteLightRef.current;

      // White halo starlight spin & opacity
      haloMesh.rotation.z += 0.012 + bassAvg * 0.02;
      haloMat.opacity = (currWhiteLightRef.current / 7.0) * 0.95;

      // Stage position combining base offset, manual pan/move, and idle levitation
      stageGroup.position.x = baseOffsetX + stagePosRef.current.x;
      stageGroup.position.y = baseOffsetY + idleHoverY + stagePosRef.current.y;
      stageGroup.position.z = currHoverElevationRef.current;

      // Orbit rotation + autoRotate + interactive hover tilt
      const baseRotX = rotationRef.current.x;
      const baseRotY = rotationRef.current.y;
      const autoRotY = autoRotate ? elapsed * 0.25 : 0;

      stageGroup.rotation.x = baseRotX + currHoverTiltRef.current.x;
      stageGroup.rotation.y = baseRotY + autoRotY + currHoverTiltRef.current.y;
      stageGroup.rotation.z = 0;

      // Synchronize CSS 3D Floating Stage with exact WebGL camera and stage orientation
      const currentH = containerRef.current ? containerRef.current.clientHeight : 800;
      const pixelsPerUnit = currentH / 26.51;

      const degX = (stageGroup.rotation.x * 180) / Math.PI;
      const degY = (stageGroup.rotation.y * 180) / Math.PI;
      const degZ = (stageGroup.rotation.z * 180) / Math.PI;
      const pixelX = stageGroup.position.x * pixelsPerUnit;
      const pixelY = -stageGroup.position.y * pixelsPerUnit;
      const pixelZ = stageGroup.position.z * pixelsPerUnit;

      if (floatingStageRef.current) {
        floatingStageRef.current.style.transform = `
          translate3d(${pixelX}px, ${pixelY}px, ${pixelZ}px)
          rotateX(${degX}deg)
          rotateY(${degY}deg)
          rotateZ(${degZ}deg)
        `;
      }

      // Update CSS aura coordinates periodically
      setStageAuraPos({ x: pixelX, y: pixelY });

      // Visualizer animations: Facing front XY with Z depth displacement
      if (mode === 'particles' && particlesMesh) {
        const positions = particlesMesh.geometry.attributes.position.array as Float32Array;
        pMaterial.size = 0.24 + (currWhiteLightRef.current / 7.0) * 0.08 + bassAvg * 0.06;

        for (let i = 0; i < numParticles; i++) {
          if (playWeight === 0) {
            positions[i * 3 + 2] = 0;
          } else {
            const ix = Math.floor(i / gridSize);
            const iy = i % gridSize;
            const freqIndex = (ix * 2 + iy * 2) % 64;
            const audioAmp = (freq[freqIndex] || 0) / 255;

            const wave = Math.sin(ix * 0.25 + elapsed * 2.5) * Math.cos(iy * 0.25 + elapsed * 2.2);
            const zDisplacement = (wave * 0.8 + audioAmp * 4.2) * (1 + bassAvg * 1.5) * playWeight;

            positions[i * 3 + 2] = zDisplacement;
          }
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;
      } else if (mode === 'clothWave' && clothMesh) {
        const positions = clothMesh.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        for (let i = 0; i < count; i++) {
          if (playWeight === 0) {
            positions[i * 3 + 2] = 0;
          } else {
            const u = positions[i * 3];
            const v = positions[i * 3 + 1];
            const dist = Math.sqrt(u * u + v * v);
            const waveZ = Math.sin(dist * 0.8 - elapsed * 3.5) * (1.2 + midAvg * 3.5) * playWeight;
            positions[i * 3 + 2] = waveZ;
          }
        }
        clothMesh.geometry.attributes.position.needsUpdate = true;
      } else if (mode === 'p5Vinyl' && vinylGroup) {
        if (playWeight > 0.001) {
          vinylGroup.rotation.z += (0.025 + bassAvg * 0.03) * playWeight;
          if (shardsGroup) shardsGroup.rotation.z -= 0.015 * playWeight;
          const scale = 1 + bassAvg * 0.18 * playWeight;
          vinylGroup.scale.set(scale, scale, scale);
        }
      } else if (mode === 'spectrum3D' && spectrumBarsGroup) {
        for (let b = 0; b < barCount; b++) {
          const val = (freq[b * 2] || 0) / 255;
          const bar = barMeshes[b];
          bar.scale.y = Math.max(0.08, val * 9 * playWeight);
        }
      }

      renderer.render(scene, camera);
    };

    render();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      const updated = updateStageLayout(width, height);
      baseOffsetX = updated.baseOffsetX;
      baseOffsetY = updated.baseOffsetY;
      stageGroup.position.x = baseOffsetX + stagePosRef.current.x;
      stageGroup.position.y = baseOffsetY + stagePosRef.current.y;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      pGeometry.dispose();
      pMaterial.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      clothGeo.dispose();
      clothMat.dispose();
      discGeo.dispose();
      discMat.dispose();
      labelGeo.dispose();
      labelMat.dispose();
      renderer.dispose();
    };
  }, [mode, currentTrack, isPlaying, autoRotate, currentTheme]);

  // Pointer drag to orbit OR right-click / shift-drag to move
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on controls, don't drag
    if ((e.target as HTMLElement).closest('button, input, a, .pointer-events-auto')) return;

    if (e.button === 2 || e.shiftKey) {
      isPanningRef.current = true;
    } else {
      isDraggingRef.current = true;
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: rotationRef.current.x,
      rotY: rotationRef.current.y,
      posX: stagePosRef.current.x,
      posY: stagePosRef.current.y,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseHoverRef.current.x = nx;
      mouseHoverRef.current.y = ny;
      mouseHoverRef.current.isHovered = true;
      if (!isHoveredRef.current) {
        isHoveredRef.current = true;
        setIsHovered(true);
      }
    }

    if (!isDraggingRef.current && !isPanningRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStartRef.current.hasMoved = true;
      setHasModifiedView(true);
    }

    if (isDraggingRef.current) {
      // Clean orbit rotation
      rotationRef.current = {
        x: Math.max(-0.9, Math.min(0.9, dragStartRef.current.rotX + deltaY * 0.005)),
        y: dragStartRef.current.rotY + deltaX * 0.005,
      };
      // Subtle physical drag nudge
      stagePosRef.current = {
        x: dragStartRef.current.posX + deltaX * 0.0015,
        y: dragStartRef.current.posY - deltaY * 0.0015,
      };
    } else if (isPanningRef.current) {
      // Pan/Move in 3D
      stagePosRef.current = {
        x: dragStartRef.current.posX + deltaX * 0.012,
        y: dragStartRef.current.posY - deltaY * 0.012,
      };
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handlePointerLeave = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
    mouseHoverRef.current.isHovered = false;
    isHoveredRef.current = false;
    setIsHovered(false);
  };

  const handleResetView = () => {
    rotationRef.current = { ...defaultRotation };
    stagePosRef.current = { x: 0, y: 0 };
    setHasModifiedView(false);
  };

  // Find index of current playing track
  const currentTrackIndex = tracks.findIndex((t) => t.id === currentTrack?.id);

  return (
    <div
      ref={containerRef}
      id="p5-visualizer-container"
      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Dynamic 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* WHITE HOVER EFFECT: Radiant Comic Energy Flare behind the Visualizer */}
      <div
        className="absolute pointer-events-none transition-all duration-500 ease-out"
        style={{
          opacity: isHovered ? 0.42 : 0,
          transform: `translate(-50%, -50%) scale(${isHovered ? 1.15 : 0.85})`,
          background:
            'radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.25) 35%, transparent 70%)',
          width: '680px',
          height: '680px',
          left: `calc(50% + ${stageAuraPos.x}px)`,
          top: `calc(50% + ${stageAuraPos.y}px)`,
          filter: 'blur(34px)',
        }}
      />

      {/* 3D SYNCHRONIZED LAYER:
          All elements (Visualizer, Lyrics, and Queue Column) face the SAME direction (Front),
          following the 3D stage synchronously without discordant opposing angles! */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          perspective: '1300px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          ref={floatingStageRef}
          className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none"
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: '0 0 0',
            willChange: 'transform',
          }}
        >
          {/* ============================================================== */}
          {/* 1. 3D FLOATING LYRICS UI: Clean front-facing Persona dialogue  */}
          {/*    anchored directly over the visualizer and aligned with it  */}
          {/* ============================================================== */}
          {showLyrics && activeLyric && (
            <div
              className="absolute pointer-events-none flex flex-col items-center justify-center text-center transition-all duration-300"
              style={{
                transform: isMobile
                  ? 'translate3d(-50%, -150px, 30px)'
                  : 'translate3d(-50%, -240px, 35px)',
                transformStyle: 'preserve-3d',
                width: isMobile ? '88vw' : '460px',
                maxWidth: '92vw',
              }}
            >
              {/* Top 3D Comic Sticker */}
              <div
                className="p5-sfx-sticker px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-mono font-black tracking-widest uppercase mb-1 sm:mb-1.5 bg-[#ffd700] text-black shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000]"
                style={{
                  transform: 'translateZ(12px)',
                }}
              >
                ★ ALL-OUT LYRICS // 1MORE!
              </div>

              {/* 3D Persona 5 Speech Bubble */}
              <div
                className="relative bg-white text-black px-4 sm:px-6 py-2.5 sm:py-3.5 border-2 sm:border-3 border-black w-full transition-all duration-300"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
                  boxShadow: `6px 6px 0px ${currentTheme.accent}, 10px 10px 0px #000`,
                  transform: 'translateZ(20px)',
                }}
              >
                {/* Comic Speech Bubble Tail pointing straight down to visualizer */}
                <div className="absolute -bottom-2.5 sm:-bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] sm:border-l-[12px] border-l-transparent border-r-[10px] sm:border-r-[12px] border-r-transparent border-t-[12px] sm:border-t-[14px] border-t-white" />
                <div className="absolute -bottom-3.5 sm:-bottom-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] sm:border-l-[14px] border-l-transparent border-r-[12px] sm:border-r-[14px] border-r-transparent border-t-[14px] sm:border-t-[16px] border-t-black -z-10" />

                <h2 className="text-sm sm:text-xl md:text-2xl font-extrabold font-sans italic tracking-tight leading-snug drop-shadow-xs">
                  "{activeLyric}"
                </h2>

                <div className="mt-1 flex items-center justify-between text-[8px] sm:text-[9px] font-mono font-bold text-black/75 border-t border-black/15 pt-0.5 sm:pt-1">
                  <span className="uppercase truncate max-w-[150px] sm:max-w-[220px]">NOW PLAYING: {currentTrack?.title}</span>
                  <span className="uppercase text-[#e60012]">{currentTrack?.artist}</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. 3D FLOATING QUEUE ON THE RIGHT:                            */}
          {/*    Directly referencing Video 181654:                        */}
          {/*    - Faces the same direction as the visualizer               */}
          {/*    - Placed neatly to the right of the visualizer (desktop)   */}
          {/*    - Or docked gracefully below visualizer on mobile Android  */}
          {/*    - Vertical stack of cards with selected card popping out   */}
          {/*    - Clean depth stacking in 3D without rotated distortion    */}
          {/* ============================================================== */}
          {tracks.length > 0 && (
            <div
              className={`absolute transition-all duration-300 ${
                isQueueExpanded
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
              style={{
                // Responsive Android placement: Centered below visualizer (+60px) on mobile;
                // on desktop/tablet, offset cleanly to the right (+280px) exactly as in video 181654
                transform: isMobile
                  ? 'translate3d(-50%, 60px, 25px)'
                  : 'translate3d(280px, -50%, 25px)',
                transformStyle: 'preserve-3d',
                width: isMobile ? '92vw' : undefined,
                maxWidth: isMobile ? '360px' : undefined,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Persona 5 3D Card Stack Container (Video 181654 reference style) */}
              <div
                className="w-full sm:w-80 max-h-[36vh] sm:max-h-[82vh] flex flex-col p-2 sm:p-2.5 bg-[#090b11]/95 backdrop-blur-2xl border-2 border-black"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
                  boxShadow: `6px 6px 0px ${currentTheme.accent}, 11px 11px 0px #000`,
                  transform: 'translateZ(10px)',
                }}
              >
                {/* 3D Queue Header */}
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      className="w-2 sm:w-2.5 h-2 sm:h-2.5 rotate-45 border border-black shadow-xs"
                      style={{ backgroundColor: currentTheme.accent }}
                    />
                    <span className="text-[11px] sm:text-xs font-mono font-black tracking-widest text-white uppercase flex items-center gap-1 sm:gap-1.5">
                      <ListMusic className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#ffd700]" />
                      QUEUE // 3D STACK
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 bg-black text-[#ffd700] border border-white/20">
                      {tracks.length} TRACKS
                    </span>
                    <button
                      onClick={handleToggleQueueInternal}
                      className="p-1 text-white/50 hover:text-white cursor-pointer transition-colors"
                      title="Hide Queue"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Vertical Card Stack (referencing video 181654):
                    All items face forward. The active item has expanded depth and prominent framing */}
                <div
                  className="overflow-y-auto space-y-1.5 sm:space-y-2 pr-1 scrollbar-thin max-h-[calc(36vh-48px)] sm:max-h-[calc(82vh-64px)]"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {tracks.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const distFromCurrent = currentTrackIndex !== -1 ? idx - currentTrackIndex : 0;
                    // Subtle dynamic perspective depth stepping like in 3D stack
                    const depthZ = isCurrent ? 24 : Math.max(-15, -Math.abs(distFromCurrent) * 3);

                    return (
                      <div
                        key={track.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          playP5Sound('select');
                          if (onSelectTrack) onSelectTrack(track);
                        }}
                        className={`group relative p-2.5 rounded-none cursor-pointer transition-all duration-200 border-2 ${
                          isCurrent
                            ? 'bg-[#151722] border-white'
                            : 'bg-[#0f1118]/90 hover:bg-[#181a26] border-black/80 hover:border-white/40'
                        }`}
                        style={{
                          borderColor: isCurrent ? currentTheme.accent : undefined,
                          boxShadow: isCurrent
                            ? `5px 5px 0px ${currentTheme.accent}, 0 0 20px ${currentTheme.accent}40`
                            : '3px 3px 0px #000',
                          transform: `translateZ(${depthZ}px) scale(${isCurrent ? 1.02 : 1})`,
                          clipPath:
                            'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                        }}
                      >
                        {/* Active Accent Strip */}
                        {isCurrent && (
                          <div
                            className="absolute top-0 left-0 bottom-0 w-1.5 shadow-[0_0_8px]"
                            style={{
                              backgroundColor: currentTheme.accent,
                              boxShadow: `0 0 10px ${currentTheme.accent}`,
                            }}
                          />
                        )}

                        <div className="flex items-center gap-2.5">
                          {/* Album Art with 3D Depth */}
                          <div
                            className={`relative w-12 h-12 flex-shrink-0 overflow-hidden bg-black border ${
                              isCurrent ? 'border-white shadow-md' : 'border-white/10'
                            }`}
                          >
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            {isCurrent && (
                              <div
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ backgroundColor: `${currentTheme.accent}55` }}
                              >
                                <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                              </div>
                            )}
                          </div>

                          {/* Song Meta */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span
                                className="text-[10px] font-mono font-bold tracking-wider"
                                style={{ color: isCurrent ? currentTheme.subAccentHex : '#ffd700' }}
                              >
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <span className="px-1.5 py-0.2 text-[8px] font-mono uppercase bg-white/10 text-white/80 border border-white/10 tracking-tight">
                                {track.format}
                              </span>
                            </div>

                            <h4
                              className={`text-xs font-bold truncate leading-tight tracking-wide font-sans ${
                                isCurrent ? 'text-white font-extrabold text-[13px]' : 'text-white/90 group-hover:text-white'
                              }`}
                            >
                              {track.title}
                            </h4>

                            <p className="text-[10px] text-white/50 truncate font-mono mt-0.5">
                              {track.artist}
                            </p>
                          </div>

                          {/* Equalizer animation or Play Icon */}
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {isCurrent && isPlaying ? (
                              <div className="flex items-end gap-0.5 h-3">
                                <span
                                  className="w-0.5 h-3 animate-bounce"
                                  style={{ backgroundColor: currentTheme.accent }}
                                />
                                <span className="w-0.5 h-2 bg-white animate-bounce" style={{ animationDelay: '0.1s' }} />
                                <span
                                  className="w-0.5 h-3.5 animate-bounce"
                                  style={{
                                    backgroundColor: currentTheme.subAccentHex,
                                    animationDelay: '0.2s',
                                  }}
                                />
                              </div>
                            ) : (
                              <Play
                                className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ color: currentTheme.accent, fill: currentTheme.accent }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Queue Re-Open Button if collapsed */}
      {!isQueueExpanded && tracks.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            playP5Sound('click');
            handleToggleQueueInternal();
          }}
          className="absolute right-3 sm:right-4 bottom-24 sm:top-1/2 sm:-translate-y-1/2 z-20 pointer-events-auto p5-badge-cut px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-white border-2 border-black flex items-center gap-1 sm:gap-1.5 shadow-[3px_3px_0px_#000] cursor-pointer active:scale-95"
          style={{
            backgroundColor: currentTheme.accent,
            color: currentTheme.textOnAccent,
          }}
          title="Open Floating 3D Queue"
        >
          <Layers className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          <span>SHOW QUEUE ({tracks.length})</span>
        </button>
      )}

      {/* WHITE HOVER STATUS HUD BADGE */}
      {isHovered && (
        <div className="absolute top-20 left-4 sm:left-6 z-20 pointer-events-none animate-pulse flex items-center gap-1.5 p5-sfx-sticker px-2.5 py-1 bg-white text-black font-mono text-[9px] font-black tracking-widest border border-black shadow-[2px_2px_0px_#000]">
          <Sparkles className="w-3 h-3 text-[#e60012]" />
          <span>★ 3D FOCUS // WHITE HOVER ILLUMINATION</span>
        </div>
      )}

      {/* RESET 3D VIEW BUTTON: Appears if user dragged or moved the visualizer */}
      {hasModifiedView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            playP5Sound('slash');
            handleResetView();
          }}
          className="absolute bottom-28 sm:bottom-4 right-4 sm:right-6 z-20 pointer-events-auto p5-badge-cut px-3 py-1 bg-black/90 text-[#ffd700] hover:text-white border-2 border-[#ffd700] text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#000] active:scale-95 transition-all"
          title="Reset Visualizer Orbit & Position"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET 3D VIEW</span>
        </button>
      )}

      {/* Mode Controls Bar */}
      <div
        className="absolute top-14 sm:top-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-20 flex items-center gap-1 sm:gap-1.5 pointer-events-auto bg-[#0c0d12]/95 backdrop-blur-md p-1 sm:p-1.5 border-2 border-black p5-badge-cut max-w-[96vw] overflow-x-auto shadow-[3px_3px_0px_#000]"
        style={{ borderColor: currentTheme.accent }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onModeChange('particles')}
          title="Point Cloud Particle Grid"
          className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold font-mono tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border border-black flex-shrink-0"
          style={{
            backgroundColor: mode === 'particles' ? currentTheme.accent : '#15161f',
            color: mode === 'particles' ? currentTheme.textOnAccent : '#ffffff',
          }}
        >
          <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span>PARTICLES</span>
        </button>

        <button
          onClick={() => onModeChange('clothWave')}
          title="3D Cloth Wave Mesh"
          className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold font-mono tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border border-black flex-shrink-0"
          style={{
            backgroundColor: mode === 'clothWave' ? currentTheme.accent : '#15161f',
            color: mode === 'clothWave' ? currentTheme.textOnAccent : '#ffffff',
          }}
        >
          <Waves className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span>WAVE</span>
        </button>

        <button
          onClick={() => onModeChange('p5Vinyl')}
          title="Persona 5 Shard Vinyl"
          className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold font-mono tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border border-black flex-shrink-0"
          style={{
            backgroundColor: mode === 'p5Vinyl' ? currentTheme.accent : '#15161f',
            color: mode === 'p5Vinyl' ? currentTheme.textOnAccent : '#ffffff',
          }}
        >
          <Disc className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span>VINYL</span>
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Auto Rotation"
          className={`p-1 sm:p-1.5 transition-all cursor-pointer flex-shrink-0 ${
            autoRotate ? 'text-[#ffd700]' : 'text-white/40 hover:text-white'
          }`}
        >
          <RotateCw
            className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${autoRotate ? 'animate-spin' : ''}`}
            style={{ animationDuration: '8s' }}
          />
        </button>
      </div>

      {/* Orbit & Movement Guide Badge */}
      <div className="absolute bottom-28 sm:bottom-4 left-3 sm:left-6 z-10 hidden xs:flex items-center gap-2 pointer-events-none">
        <div
          className="p5-sfx-sticker px-2 sm:px-2.5 py-0.5 sm:py-1 bg-black text-white text-[9px] sm:text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 border border-white/20"
          style={{ boxShadow: `2px 2px 0px ${currentTheme.accent}` }}
        >
          <Eye className="w-3 h-3 text-[#ffd700]" />
          <span>DRAG 3D ORBIT // SHIFT+DRAG MOVE // HOVER FOR WHITE GLOW</span>
        </div>
      </div>
    </div>
  );
};
