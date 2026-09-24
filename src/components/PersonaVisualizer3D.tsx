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
  ZoomIn,
  ZoomOut,
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
  onOpenLyricsModal?: () => void;
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
  onOpenLyricsModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const perspectiveContainerRef = useRef<HTMLDivElement>(null);
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

  // 3D Optical Zoom (supports mouse wheel, pinch gesture & on-screen buttons)
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const zoomRef = useRef(1.0);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  // Mouse hover reaction & White Hover Effect
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const mouseHoverRef = useRef({ x: 0, y: 0, isHovered: false });
  const currHoverTiltRef = useRef({ x: 0, y: 0 });
  const currHoverElevationRef = useRef(0);
  const currWhiteLightRef = useRef(0);

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

    // Three.js Scene Setup (No darkening fog - pristine clarity and brightness at any distance)
    const scene = new THREE.Scene();

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

    const mainThemeLight = new THREE.PointLight(currentTheme.threeLight, 3.8, 50);
    mainThemeLight.position.set(-15, 10, 15);
    scene.add(mainThemeLight);

    const subLight = new THREE.PointLight(0x00d2ff, 2.2, 45);
    subLight.position.set(15, -10, 15);
    scene.add(subLight);

    // Root Group for 3D tilt, rotation & movement
    const stageGroup = new THREE.Group();

    // Reusable 4x4 matrix for synchronous 3D rigid orientation binding
    const rotMatrix = new THREE.Matrix4();

    // Dedicated HOVER LIGHT: dynamic neutral white spotlight inside stageGroup illuminating elevated particles right beneath cursor
    const hoverLight = new THREE.PointLight(0xffffff, 0, 24);
    hoverLight.position.set(0, 0, 4);
    stageGroup.add(hoverLight);

    // Determine base offset and scale based on viewport width and height (Android mobile responsive)
    const updateStageLayout = (w: number, h: number) => {
      const isDesktop = w >= 1024;
      const isTablet = w >= 768 && w < 1024;
      // On mobile portrait, center the visualizer horizontally (0) and lift vertically (+2.8).
      // On desktop, shift left (-5.2) to give generous, elegant breathing room for the queue list on the right.
      const baseOffsetX = isDesktop ? -5.2 : isTablet ? -3.6 : 0;
      const baseOffsetY = isDesktop ? 0 : isTablet ? 0 : (h > w ? 2.8 : 0);
      const visualizerScale = isDesktop
        ? 1.0
        : isTablet
        ? 0.85
        : Math.max(0.54, Math.min(0.72, (w / 440) * 0.65));
      stageGroup.scale.set(visualizerScale, visualizerScale, visualizerScale);
      return { baseOffsetX, baseOffsetY, visualizerScale };
    };

    let { baseOffsetX, baseOffsetY, visualizerScale } = updateStageLayout(width, height);
    stageGroup.position.x = baseOffsetX + stagePosRef.current.x;
    stageGroup.position.y = baseOffsetY + stagePosRef.current.y;
    scene.add(stageGroup);

    // Dynamic Objects Based on Mode
    let particlesMesh: THREE.Points | null = null;
    let clothMesh: THREE.Mesh | null = null;
    let vinylGroup: THREE.Group | null = null;
    let shardsGroup: THREE.Group | null = null;
    let spectrumBarsGroup: THREE.Group | null = null;

    // Load cover image texture using an HTML canvas for 100% reliable rendering in WebGL & Electron
    const coverCanvas = document.createElement('canvas');
    coverCanvas.width = 1024;
    coverCanvas.height = 1024;
    const coverCtx = coverCanvas.getContext('2d')!;

    // Initial procedural Persona 5 artwork
    coverCtx.fillStyle = '#0c0e15';
    coverCtx.fillRect(0, 0, 1024, 1024);

    coverCtx.fillStyle = currentTheme.accent;
    coverCtx.beginPath();
    coverCtx.moveTo(0, 640);
    coverCtx.lineTo(1024, 400);
    coverCtx.lineTo(1024, 720);
    coverCtx.lineTo(0, 960);
    coverCtx.fill();

    coverCtx.fillStyle = '#ffffff';
    coverCtx.font = '900 64px sans-serif';
    coverCtx.textAlign = 'center';
    coverCtx.fillText((currentTrack?.title || 'PHANTOM').substring(0, 18).toUpperCase(), 512, 520);

    coverCtx.fillStyle = '#ffd700';
    coverCtx.font = '700 36px monospace';
    coverCtx.fillText((currentTrack?.artist || 'AUDIO PLAYER').substring(0, 24).toUpperCase(), 512, 600);

    const coverTexture = new THREE.CanvasTexture(coverCanvas);
    coverTexture.minFilter = THREE.LinearFilter;
    coverTexture.magFilter = THREE.LinearFilter;
    coverTexture.generateMipmaps = false;

    // Helper to sample cover image colors onto particle vertices
    const sampleCoverColors = (targetColors: Float32Array, count: number, size: number) => {
      try {
        const cw = coverCanvas.width;
        const ch = coverCanvas.height;
        const imgData = coverCtx.getImageData(0, 0, cw, ch).data;
        for (let ix = 0; ix < size; ix++) {
          for (let iy = 0; iy < size; iy++) {
            const idx = ix * size + iy;
            if (idx >= count) break;
            const u = ix / (size - 1);
            const v = 1 - iy / (size - 1);
            const px = Math.min(cw - 1, Math.max(0, Math.floor(u * (cw - 1))));
            const py = Math.min(ch - 1, Math.max(0, Math.floor(v * (ch - 1))));
            const offset = (py * cw + px) * 4;
            targetColors[idx * 3] = imgData[offset] / 255;
            targetColors[idx * 3 + 1] = imgData[offset + 1] / 255;
            targetColors[idx * 3 + 2] = imgData[offset + 2] / 255;
          }
        }
      } catch {
        // Fallback
      }
    };

    // Helper to create round, glowing particle sprite texture with ultra-smooth falloff
    const pointCanvas = document.createElement('canvas');
    pointCanvas.width = 64;
    pointCanvas.height = 64;
    const ptCtx = pointCanvas.getContext('2d')!;
    const ptGrad = ptCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    ptGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    ptGrad.addColorStop(0.84, 'rgba(255, 255, 255, 1)');
    ptGrad.addColorStop(0.98, 'rgba(255, 255, 255, 0.92)');
    ptGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ptCtx.fillStyle = ptGrad;
    ptCtx.fillRect(0, 0, 64, 64);
    const pointTexture = new THREE.CanvasTexture(pointCanvas);

    // 1. PARTICLES MODE: The album cover ITSELF is composed purely of 3D audio-reactive particles!
    const particlesGroup = new THREE.Group();
    const canvasSpan = 22; // Covers the whole visualizer canvas area

    // Dense 200x200 particle matrix (40,000 particles) for an ultra-tight, silky-smooth, dense surface
    const gridSize = 200;
    const numParticles = gridSize * gridSize;
    const pPositions = new Float32Array(numParticles * 3);
    const basePPositions = new Float32Array(numParticles * 3);
    const pColors = new Float32Array(numParticles * 3);

    const spacing = canvasSpan / (gridSize - 1);
    const half = canvasSpan / 2;

    for (let ix = 0; ix < gridSize; ix++) {
      for (let iy = 0; iy < gridSize; iy++) {
        const idx = ix * gridSize + iy;
        const x = ix * spacing - half;
        const y = iy * spacing - half;
        pPositions[idx * 3] = x;
        pPositions[idx * 3 + 1] = y;
        pPositions[idx * 3 + 2] = 0;

        basePPositions[idx * 3] = x;
        basePPositions[idx * 3 + 1] = y;
        basePPositions[idx * 3 + 2] = 0;
      }
    }

    // Sample initial cover artwork onto particle colors
    sampleCoverColors(pColors, numParticles, gridSize);

    const pGeometry = new THREE.BufferGeometry();
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMaterial = new THREE.PointsMaterial({
      size: 0.22,
      map: pointTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      fog: false,
    });
    particlesMesh = new THREE.Points(pGeometry, pMaterial);
    particlesGroup.add(particlesMesh);

    // Function to apply cover image immediately
    const applyCoverImage = (img: HTMLImageElement) => {
      coverCtx.clearRect(0, 0, 1024, 1024);
      coverCtx.drawImage(img, 0, 0, 1024, 1024);
      coverTexture.needsUpdate = true;
      if (particlesMesh) {
        const colors = particlesMesh.geometry.attributes.color.array as Float32Array;
        sampleCoverColors(colors, numParticles, gridSize);
        particlesMesh.geometry.attributes.color.needsUpdate = true;
      }
    };

    // When cover image loads, refresh texture & particle colors instantly
    if (currentTrack?.coverUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => applyCoverImage(img);
      img.src = currentTrack.coverUrl;
      if (img.complete && img.naturalWidth > 0) {
        applyCoverImage(img);
      }
    }

    // HOVER ENERGY RING: An orbital halo of sparkling star points crowning the outer canvas edge
    const haloCount = 140;
    const haloPositions = new Float32Array(haloCount * 3);
    const haloColors = new Float32Array(haloCount * 3);
    for (let i = 0; i < haloCount; i++) {
      const angle = (i / haloCount) * Math.PI * 2;
      const r = 13.5 + (Math.random() - 0.5) * 2.2;
      haloPositions[i * 3] = Math.cos(angle) * r;
      haloPositions[i * 3 + 1] = Math.sin(angle) * r;
      haloPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
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

    // 2. CLOTH WAVE MODE: facing front XY plane across the entire 22x22 canvas
    const clothGeo = new THREE.PlaneGeometry(canvasSpan, canvasSpan, 56, 56);
    const clothMat = new THREE.MeshStandardMaterial({
      map: coverTexture,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.35,
    });
    clothMesh = new THREE.Mesh(clothGeo, clothMat);

    // 3. PERSONA 5 VINYL & SHARDS MODE
    vinylGroup = new THREE.Group();
    const discGeo = new THREE.CylinderGeometry(7.2, 7.2, 0.2, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      roughness: 0.2,
      metalness: 0.8,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
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
      const radius = 8.5 + Math.random() * 2.5;
      shard.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 3);
      shardsGroup.add(shard);
    }
    vinylGroup.add(shardsGroup);

    // 4. SPECTRUM 3D BARS: full cover center backdrop surrounded by 32 dynamic spectrum bars
    spectrumBarsGroup = new THREE.Group();
    const spectrumCoverGeo = new THREE.PlaneGeometry(16, 16);
    const spectrumCoverMat = new THREE.MeshStandardMaterial({
      map: coverTexture,
      side: THREE.DoubleSide,
      roughness: 0.35,
    });
    const spectrumCoverMesh = new THREE.Mesh(spectrumCoverGeo, spectrumCoverMat);
    spectrumCoverMesh.position.z = -0.1;
    spectrumBarsGroup.add(spectrumCoverMesh);

    const barCount = 32;
    const barMeshes: THREE.Mesh[] = [];
    for (let b = 0; b < barCount; b++) {
      const bGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
      const bMat = new THREE.MeshBasicMaterial({
        color: b % 2 === 0 ? currentTheme.threeLight : 0xffffff,
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      const angle = (b / barCount) * Math.PI * 2;
      const radius = 10.2;
      bMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      bMesh.rotation.z = angle - Math.PI / 2;
      spectrumBarsGroup.add(bMesh);
      barMeshes.push(bMesh);
    }

    // Attach active mode to the stage
    if (mode === 'particles') {
      stageGroup.add(particlesGroup);
    } else if (mode === 'clothWave') {
      stageGroup.add(clothMesh);
    } else if (mode === 'p5Vinyl') {
      stageGroup.add(vinylGroup);
    } else if (mode === 'spectrum3D') {
      stageGroup.add(spectrumBarsGroup);
    }

    // Animation Loop with smooth audio damping for chill visuals
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let playWeight = isPlaying ? 1.0 : 0.0;

    let smoothBass = 0;
    let smoothMids = 0;
    let smoothHighs = 0;

    // 3D Raycasting & Particle Elevation State
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();
    const planeIntersectPoint = new THREE.Vector3();
    const localIntersectPoint = new THREE.Vector3();
    const visualizerPlane = new THREE.Plane();
    const planeNormal = new THREE.Vector3();
    const toCameraVec = new THREE.Vector3();

    let smoothHoverX = 0;
    let smoothHoverY = 0;
    let smoothHoverStrength = 0;
    let smoothHoverZSign = 1.0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const elapsed = clock.getElapsedTime();

      // Retrieve audio frequencies with low-pass exponential smoothing for chill visuals
      const freq = globalAudioEngine.getFrequencyData();
      const rawBass = (freq[1] + freq[2] + freq[3] + freq[4]) / 4 / 255;
      const rawMids = (freq[12] + freq[14] + freq[16]) / 3 / 255;
      const rawHighs = (freq[30] + freq[32] + freq[34]) / 3 / 255;

      smoothBass += (rawBass - smoothBass) * 0.08;
      smoothMids += (rawMids - smoothMids) * 0.08;
      smoothHighs += (rawHighs - smoothHighs) * 0.08;

      const targetPlay = isPlaying ? 1.0 : 0.0;
      playWeight += (targetPlay - playWeight) * 0.06;
      if (!isPlaying && playWeight < 0.002) {
        playWeight = 0;
      }

      // Chill idle breathing (slow, relaxing sine wave)
      const idleHoverY = Math.sin(elapsed * 0.8) * 0.22;

      // Interactive hover tilt & elevation: gentle spring easing
      const isCurrentlyHovered = isHoveredRef.current && mouseHoverRef.current.isHovered;
      const targetHoverTiltX = isCurrentlyHovered ? -mouseHoverRef.current.y * 0.16 : 0;
      const targetHoverTiltY = isCurrentlyHovered ? mouseHoverRef.current.x * 0.18 : 0;
      const targetHoverElevation = isCurrentlyHovered ? 1.4 : 0;

      currHoverTiltRef.current.x += (targetHoverTiltX - currHoverTiltRef.current.x) * 0.05;
      currHoverTiltRef.current.y += (targetHoverTiltY - currHoverTiltRef.current.y) * 0.05;
      currHoverElevationRef.current += (targetHoverElevation - currHoverElevationRef.current) * 0.05;

      // Soft Persona 5 theme light intensity on hover (max 2.4, illuminates the raised particles)
      const targetGlow = isCurrentlyHovered ? 2.4 : 0.0;
      currWhiteLightRef.current += (targetGlow - currWhiteLightRef.current) * 0.08;
      hoverLight.intensity = currWhiteLightRef.current;

      // Gentle starlight halo spin & opacity
      haloMesh.rotation.z += 0.004 + smoothBass * 0.01;
      haloMat.opacity = (currWhiteLightRef.current / 2.4) * 0.75;

      // Chill beat breathing for the whole visualizer stage
      const beatScale = 1.0 + smoothBass * 0.035 * playWeight;
      const currentScale = visualizerScale * beatScale;
      stageGroup.scale.set(currentScale, currentScale, currentScale);

      // Stage position combining base offset, manual pan/move, and idle levitation
      stageGroup.position.x = baseOffsetX + stagePosRef.current.x;
      stageGroup.position.y = baseOffsetY + idleHoverY + stagePosRef.current.y;
      stageGroup.position.z = currHoverElevationRef.current;

      // Orbit rotation + autoRotate + interactive hover tilt
      const baseRotX = rotationRef.current.x;
      const baseRotY = rotationRef.current.y;
      const autoRotY = autoRotate ? elapsed * 0.2 : 0;

      stageGroup.rotation.x = baseRotX + currHoverTiltRef.current.x;
      stageGroup.rotation.y = baseRotY + autoRotY + currHoverTiltRef.current.y;
      stageGroup.rotation.z = 0;
      stageGroup.updateMatrixWorld();

      // Optical Camera Zoom: smoothly lerp camera Z based on zoomRef
      const targetCameraZ = 32 / (zoomRef.current || 1.0);
      camera.position.z += (targetCameraZ - camera.position.z) * 0.1;

      // Current 3D optical zoom factor relative to default camera distance (32)
      const currentZoom = 32 / (camera.position.z || 32);
      const compositeScale = currentZoom * beatScale;

      // =========================================================================
      // DYNAMIC 3D MOUSE RAYCASTING: Find exact local coordinates on the visualizer
      // =========================================================================
      let hasIntersect = false;
      if (isCurrentlyHovered) {
        mouseNDC.set(mouseHoverRef.current.x, mouseHoverRef.current.y);
        raycaster.setFromCamera(mouseNDC, camera);

        // Visualizer plane in world space (stageGroup's local Z=0 plane)
        planeNormal.set(0, 0, 1).applyQuaternion(stageGroup.quaternion).normalize();
        visualizerPlane.setFromNormalAndCoplanarPoint(planeNormal, stageGroup.position);

        const hit = raycaster.ray.intersectPlane(visualizerPlane, planeIntersectPoint);
        if (hit) {
          localIntersectPoint.copy(planeIntersectPoint);
          stageGroup.worldToLocal(localIntersectPoint);

          // Check if cursor is over or near the visualizer surface (canvasSpan = 22, half = 11)
          if (Math.abs(localIntersectPoint.x) <= 13.5 && Math.abs(localIntersectPoint.y) <= 13.5) {
            hasIntersect = true;
          }
        }
      }

      // Determine if viewer/cursor is looking at the front (+Z) or back (-Z) of the visualizer
      toCameraVec.subVectors(camera.position, stageGroup.position).normalize();
      const frontDot = planeNormal.dot(toCameraVec);
      const targetZSign = frontDot >= 0 ? 1.0 : -1.0;
      smoothHoverZSign += (targetZSign - smoothHoverZSign) * 0.14;

      // Smooth spring interpolation for fluid, silky particle lifting response
      if (hasIntersect) {
        smoothHoverX += (localIntersectPoint.x - smoothHoverX) * 0.14;
        smoothHoverY += (localIntersectPoint.y - smoothHoverY) * 0.14;
        smoothHoverStrength += (1.0 - smoothHoverStrength) * 0.10;
      } else {
        smoothHoverStrength += (0.0 - smoothHoverStrength) * 0.06;
      }

      // Position subtle hover illumination directly above the lifted particle apex (front or back side)
      if (smoothHoverStrength > 0.01) {
        hoverLight.position.set(smoothHoverX, smoothHoverY, 4.0 * (smoothHoverZSign >= 0 ? 1 : -1));
      }

      // Synchronize CSS 3D Floating Stage (Lyrics, 3D Queue stack) with exact WebGL camera, position & zoom
      const currentH = containerRef.current ? containerRef.current.clientHeight : 800;
      const halfFovRad = (45 * Math.PI) / 360;
      const perspectivePx = (currentH / 2) / Math.tan(halfFovRad);
      const pixelsPerUnit = (currentH / 2) / (Math.tan(halfFovRad) * 32);

      if (perspectiveContainerRef.current) {
        perspectiveContainerRef.current.style.perspective = `${perspectivePx.toFixed(1)}px`;
      }

      // Screen projection coordinates scale precisely with camera optical zoom
      const pixelX = stageGroup.position.x * pixelsPerUnit * currentZoom;
      const pixelY = -stageGroup.position.y * pixelsPerUnit * currentZoom;
      const pixelZ = stageGroup.position.z * pixelsPerUnit * currentZoom;

      // Compute exact 3D orientation matrix directly from Three.js stageGroup
      rotMatrix.makeRotationFromEuler(stageGroup.rotation);
      const el = rotMatrix.elements;

      // Matrix columns scaled by compositeScale:
      // Note: CSS Y-axis points DOWN while Three.js points UP.
      // Applying change of basis C * R * C negates row 1 and col 1 (indices 1, 4, 6, 9)
      const s = compositeScale;
      const r00 = (el[0] * s).toFixed(6);
      const r01 = (-el[1] * s).toFixed(6);
      const r02 = (el[2] * s).toFixed(6);

      const r10 = (-el[4] * s).toFixed(6);
      const r11 = (el[5] * s).toFixed(6);
      const r12 = (-el[6] * s).toFixed(6);

      const r20 = (el[8] * s).toFixed(6);
      const r21 = (-el[9] * s).toFixed(6);
      const r22 = (el[10] * s).toFixed(6);

      const tx = pixelX.toFixed(2);
      const ty = pixelY.toFixed(2);
      const tz = pixelZ.toFixed(2);

      if (floatingStageRef.current) {
        // Rigidly lock Lyrics & Queue to the exact same 3D axis and orientation as the visualizer
        floatingStageRef.current.style.transform = `matrix3d(
          ${r00}, ${r01}, ${r02}, 0,
          ${r10}, ${r11}, ${r12}, 0,
          ${r20}, ${r21}, ${r22}, 0,
          ${tx}, ${ty}, ${tz}, 1
        )`;
      }

      // Dynamic Perspective Clarity:
      // "ketika perspektif dijauhkan cover semakin jelas bukan menggelap ataupun menghitam"
      // As perspective camera pulls back / zooms out, points scale to comfortably overlap and form
      // an impeccably crisp, bright, solid album cover without any raster gaps, dimming, or blackening.
      const camDistance = camera.position.z;
      const distRatio = Math.max(0.5, camDistance / 32);

      // Visualizer animations: Whole visualizer surface reacts directly with audio and hover displacement
      if (mode === 'particles' && particlesMesh) {
        const positions = particlesMesh.geometry.attributes.position.array as Float32Array;
        // As perspective distance grows, increase particle size relative to camera distance so particles seamlessly coalesce without subpixel darkness
        pMaterial.size = (0.22 + smoothBass * 0.035) * Math.pow(distRatio, 0.9);

        // Area of influence for hover elevation around the mouse cursor
        const hoverRadius = 5.8;
        const hoverRadiusSq = hoverRadius * hoverRadius;

        for (let i = 0; i < numParticles; i++) {
          const baseX = basePPositions[i * 3];
          const baseY = basePPositions[i * 3 + 1];
          const dist = Math.sqrt(baseX * baseX + baseY * baseY);
          const normDist = Math.min(1.0, dist / half);

          let zDisplacement = 0;
          let xyPush = 0;

          if (playWeight === 0) {
            // Idle state: particles rest in the exact form of the album cover with subtle holographic breath
            zDisplacement = Math.sin(dist * 0.28 + elapsed * 0.8) * 0.1;
          } else {
            // Audio frequency band for this particle based on radial distance
            const freqIdx = Math.min(63, Math.floor(normDist * 54));
            const freqAmp = (freq[freqIdx] || 0) / 255;

            // Concentric audio ripple wave
            const wave = Math.sin(dist * 0.55 - elapsed * 2.2);

            // Punchy bass lift at the center of the album cover
            const bassPunch = Math.max(0, 1.0 - normDist * 0.85) * smoothBass * 2.8;

            // Z displacement lifting particles into 3D space
            zDisplacement = (wave * 0.65 + freqAmp * 2.0 + bassPunch) * playWeight;

            // Subtle dynamic fluid breathing dispersion on beats
            xyPush = Math.sin(elapsed * 1.8 + dist * 0.8) * smoothBass * 0.1 * playWeight;
          }

          // Dynamic hover elevation: particles lift up in 3D right where the mouse cursor hovers!
          let hoverLiftZ = 0;
          let hoverPushX = 0;
          let hoverPushY = 0;

          if (smoothHoverStrength > 0.001) {
            const mdx = baseX - smoothHoverX;
            const mdy = baseY - smoothHoverY;
            const mDistSq = mdx * mdx + mdy * mdy;

            if (mDistSq < hoverRadiusSq) {
              const mDist = Math.sqrt(mDistSq);
              // Ultra-smoothstep bell curve (C2 continuous) for seamless transition without sharp edges
              const t = 1.0 - mDist / hoverRadius;
              const smoothT = t * t * (3.0 - 2.0 * t);
              const bellPeak = smoothT * smoothT;

              // Silky, gentle undulating breath lift (lowered height: ~1.65 max stretch, tight and refined)
              const gentleLift = Math.sin(elapsed * 2.8 + mDist * 1.6) * 0.08 * bellPeak;
              const baseLift = (bellPeak * 1.65 + gentleLift) * smoothHoverStrength;
              
              // Stretches outward toward cursor: forward (+Z) if in front, backward (-Z) if cursor is behind
              hoverLiftZ = baseLift * smoothHoverZSign;

              // Soft radial displacement pushing gently outward
              const repel = smoothT * 0.14 * smoothHoverStrength;
              hoverPushX = (mdx / (mDist + 0.08)) * repel;
              hoverPushY = (mdy / (mDist + 0.08)) * repel;
            }
          }

          const radDirX = dist > 0.01 ? baseX / dist : 0;
          const radDirY = dist > 0.01 ? baseY / dist : 0;

          positions[i * 3] = baseX + radDirX * xyPush + hoverPushX;
          positions[i * 3 + 1] = baseY + radDirY * xyPush + hoverPushY;
          positions[i * 3 + 2] = zDisplacement + hoverLiftZ;
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;
      } else if (mode === 'clothWave' && clothMesh) {
        const positions = clothMesh.geometry.attributes.position.array as Float32Array;
        const count = positions.length / 3;
        const hoverRadius = 6.0;
        const hoverRadiusSq = hoverRadius * hoverRadius;

        for (let i = 0; i < count; i++) {
          const u = positions[i * 3];
          const v = positions[i * 3 + 1];
          const dist = Math.sqrt(u * u + v * v);
          let waveZ = 0;

          if (playWeight === 0) {
            waveZ = Math.sin(u * 0.25 + elapsed * 0.8) * 0.15;
          } else {
            waveZ = Math.sin(dist * 0.45 - elapsed * 1.1) * (0.6 + smoothMids * 1.2) * playWeight;
          }

          let hoverLiftZ = 0;
          if (smoothHoverStrength > 0.001) {
            const mdx = u - smoothHoverX;
            const mdy = v - smoothHoverY;
            const mDistSq = mdx * mdx + mdy * mdy;
            if (mDistSq < hoverRadiusSq) {
              const mDist = Math.sqrt(mDistSq);
              const bell = Math.cos((mDist / hoverRadius) * Math.PI * 0.5);
              hoverLiftZ = bell * bell * 1.45 * smoothHoverStrength * smoothHoverZSign;
            }
          }

          positions[i * 3 + 2] = waveZ + hoverLiftZ;
        }
        clothMesh.geometry.attributes.position.needsUpdate = true;
      } else if (mode === 'p5Vinyl' && vinylGroup) {
        if (playWeight > 0.001) {
          vinylGroup.rotation.z -= (0.015 + smoothMids * 0.015) * playWeight;
          if (shardsGroup) shardsGroup.rotation.z += (0.008 + smoothHighs * 0.01) * playWeight;
        }
        if (shardsGroup && smoothHoverStrength > 0.001) {
          shardsGroup.children.forEach((shard) => {
            const sDist = Math.hypot(shard.position.x - smoothHoverX, shard.position.y - smoothHoverY);
            if (sDist < 5.0) {
              shard.position.z += (5.0 - sDist) * 0.05 * smoothHoverStrength * smoothHoverZSign;
              shard.rotation.x += 0.02;
              shard.rotation.y += 0.02;
            }
          });
        }
      } else if (mode === 'spectrum3D' && spectrumBarsGroup) {
        for (let b = 0; b < barCount; b++) {
          const val = (freq[b * 2] || 0) / 255;
          const bar = barMeshes[b];
          let targetH = Math.max(0.08, val * 4.5 * playWeight);
          if (smoothHoverStrength > 0.001) {
            const bDist = Math.hypot(bar.position.x - smoothHoverX, bar.position.y - smoothHoverY);
            if (bDist < 6.0) {
              targetH += (6.0 - bDist) * 0.45 * smoothHoverStrength;
            }
          }
          bar.scale.y += (targetH - bar.scale.y) * 0.15;
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
      pointTexture.dispose();
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
      spectrumCoverGeo.dispose();
      spectrumCoverMat.dispose();
      coverTexture.dispose();
      renderer.dispose();
    };
  }, [mode, currentTrack, isPlaying, autoRotate, currentTheme]);

  // Pointer drag to orbit, multi-touch pinch to zoom, OR right-click / shift-drag to move
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on controls, scrollbar or audio sliders, don't drag
    if ((e.target as HTMLElement).closest('button, input, a, .overflow-y-auto, .p5-no-drag')) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch zoom detection (e.g. 2 fingers on touchscreen/trackpad)
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoomRef.current = zoomRef.current;
      isDraggingRef.current = false;
      isPanningRef.current = false;
      return;
    }

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

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle 2-finger pinch zoom
    if (activePointersRef.current.size === 2 && pinchStartDistRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / pinchStartDistRef.current;
      const nextZoom = Math.max(0.35, Math.min(2.5, +(pinchStartZoomRef.current * ratio).toFixed(2)));
      zoomRef.current = nextZoom;
      setZoomLevel(nextZoom);
      setHasModifiedView(true);
      return;
    }

    if (!isDraggingRef.current && !isPanningRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStartRef.current.hasMoved = true;
      setHasModifiedView(true);
    }

    if (isDraggingRef.current) {
      // 360-degree free orbit rotation in all directions (pitch and yaw without artificial angle limits)
      rotationRef.current = {
        x: dragStartRef.current.rotX + deltaY * 0.007,
        y: dragStartRef.current.rotY + deltaX * 0.007,
      };
      // Keep center of rotation strictly fixed on the visualizer center
    } else if (isPanningRef.current) {
      // Pan/Move in 3D
      stagePosRef.current = {
        x: dragStartRef.current.posX + deltaX * 0.012,
        y: dragStartRef.current.posY - deltaY * 0.012,
      };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    }
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
      isPanningRef.current = false;
      mouseHoverRef.current.isHovered = false;
      isHoveredRef.current = false;
      setIsHovered(false);
    }
  };

  // Mouse wheel zoom (zoom out / zoom in)
  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.overflow-y-auto, .overflow-x-auto, button')) return;
    e.preventDefault();
    const zoomDelta = -Math.sign(e.deltaY) * 0.12;
    setZoomLevel((prev) => {
      const next = Math.max(0.35, Math.min(2.5, +(prev + zoomDelta).toFixed(2)));
      zoomRef.current = next;
      setHasModifiedView(true);
      return next;
    });
  };

  const handleResetView = () => {
    rotationRef.current = { ...defaultRotation };
    stagePosRef.current = { x: 0, y: 0 };
    zoomRef.current = 1.0;
    setZoomLevel(1.0);
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
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Dynamic 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />

      {/* 3D SYNCHRONIZED LAYER:
          All elements (Visualizer, Lyrics, and Queue Column) face the SAME direction (Front),
          following the 3D stage synchronously locked on the exact same 3D axis! */}
      <div
        ref={perspectiveContainerRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          perspective: '1000px',
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
          {/*    positioned AT THE VERY TOP of the visualizer on 3D axis    */}
          {/* ============================================================== */}
          {showLyrics && activeLyric && (
            <div
              className="absolute pointer-events-none flex flex-col items-center justify-center text-center transition-opacity duration-300"
              style={{
                // Positioned at the very top of the visualizer (-330px on desktop, -220px on mobile)
                transform: isMobile
                  ? 'translate3d(-50%, -220px, 30px)'
                  : 'translate3d(-50%, -330px, 35px)',
                transformStyle: 'preserve-3d',
                width: isMobile ? '88vw' : '480px',
                maxWidth: '92vw',
              }}
            >
              {/* Top 3D Comic Sticker */}
              <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
                <div
                  className="p5-sfx-sticker px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-mono font-black tracking-widest uppercase bg-[#ffd700] text-black shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000]"
                  style={{
                    transform: 'translateZ(12px)',
                  }}
                >
                  ★ ALL-OUT LYRICS // 1MORE!
                </div>

                {onOpenLyricsModal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLyricsModal();
                    }}
                    className="pointer-events-auto p5-badge-cut px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-black text-white border border-white/40 hover:bg-zinc-800 transition-all cursor-pointer shadow-[2px_2px_0px_#000]"
                    style={{ transform: 'translateZ(15px)' }}
                    title="Edit or Import LRC Lyrics"
                  >
                    ✎ LRC
                  </button>
                )}
              </div>

              {/* 3D Persona 5 Speech Bubble */}
              <div
                className="relative bg-white text-black px-4 sm:px-6 py-2.5 sm:py-3.5 border-2 sm:border-3 border-black w-full"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
                  boxShadow: `6px 6px 0px ${currentTheme.accent}, 10px 10px 0px #000`,
                  transform: 'translateZ(20px)',
                  transformStyle: 'preserve-3d',
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

          {/* Prompt when track does not have lyrics yet */}
          {showLyrics && (!currentTrack?.lyrics || currentTrack.lyrics.length === 0) && (
            <div
              className="absolute pointer-events-auto flex flex-col items-center justify-center text-center transition-opacity duration-300"
              style={{
                transform: isMobile
                  ? 'translate3d(-50%, -190px, 30px)'
                  : 'translate3d(-50%, -290px, 35px)',
                transformStyle: 'preserve-3d',
                width: isMobile ? '88vw' : '440px',
                maxWidth: '92vw',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLyricsModal?.();
                }}
                className="group relative bg-[#090b11]/95 text-white px-4 py-2 border-2 border-black flex items-center gap-2 cursor-pointer shadow-[4px_4px_0px_#000] hover:scale-105 active:scale-95 transition-all"
                style={{
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                }}
              >
                <div className="w-2.5 h-2.5 rotate-45" style={{ backgroundColor: currentTheme.accent }} />
                <span className="font-mono text-[10px] sm:text-xs font-bold text-zinc-300 group-hover:text-white">
                  NO SYNCED LYRICS // <span className="text-[#ffd700] font-black underline">[ + IMPORT .LRC / PASTE ]</span>
                </span>
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. 3D FLOATING QUEUE ON THE RIGHT:                            */}
          {/*    Locked rigidly to the visualizer on the exact same 3D axis */}
          {/*    - Faces the same direction as the visualizer               */}
          {/*    - Positioned with a distinct generous gap to the right     */}
          {/*    - Revolves 360° in all directions with the visualizer      */}
          {/* ============================================================== */}
          {tracks.length > 0 && (
            <div
              className={`absolute transition-opacity duration-300 ${
                isQueueExpanded
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
              style={{
                // Offset generously to the right (+370px) on desktop to provide clean spacing from visualizer
                transform: isMobile
                  ? 'translate3d(-50%, 60px, 25px)'
                  : 'translate3d(370px, -50%, 25px)',
                transformStyle: 'preserve-3d',
                width: isMobile ? '92vw' : undefined,
                maxWidth: isMobile ? '360px' : undefined,
              }}
              onPointerDown={(e) => {
                // If interacting with scrollable playlist or buttons, stop propagation;
                // otherwise allow dragging on header/frame to rotate the 3D rig!
                if ((e.target as HTMLElement).closest('.overflow-y-auto, button, input')) {
                  e.stopPropagation();
                }
              }}
            >
              {/* Persona 5 3D Card Stack Container (Video 181654 reference style) */}
              <div
                className="w-full sm:w-80 max-h-[36vh] sm:max-h-[82vh] flex flex-col p-2 sm:p-2.5 bg-[#090b11]/95 backdrop-blur-2xl border-2 border-black relative"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
                  boxShadow: `6px 6px 0px ${currentTheme.accent}, 11px 11px 0px #000`,
                  transform: 'translateZ(10px)',
                  transformStyle: 'preserve-3d',
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
                        className={`group relative p-2.5 rounded-none cursor-pointer transition-all duration-200 border-2 hover:translate-x-1.5 ${
                          isCurrent
                            ? 'bg-[#151722] border-white'
                            : 'bg-[#0f1118]/90 hover:bg-[#191c2b] border-black/80 hover:border-[#ffd700]'
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


      {/* WHITE HOVER STATUS HUD BADGE */}
      {isHovered && (
        <div className="absolute top-20 left-4 sm:left-6 z-20 pointer-events-none animate-pulse flex items-center gap-1.5 p5-sfx-sticker px-2.5 py-1 bg-white text-black font-mono text-[9px] font-black tracking-widest border border-black shadow-[2px_2px_0px_#000]">
          <Sparkles className="w-3 h-3 text-[#e60012]" />
          <span>★ 3D FOCUS // DYNAMIC PARTICLE ELEVATION</span>
        </div>
      )}

      {/* 3D CAMERA & ZOOM CONTROLS HUD */}
      <div
        className="absolute bottom-28 sm:bottom-4 right-4 sm:right-6 z-20 flex items-center gap-1.5 pointer-events-auto bg-[#0c0d12]/95 backdrop-blur-md p-1 border-2 border-black p5-badge-cut shadow-[3px_3px_0px_#000]"
        style={{ borderColor: currentTheme.accent }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Zoom Out Button */}
        <button
          onClick={() => {
            playP5Sound('select');
            setZoomLevel((prev) => {
              const next = Math.max(0.35, +(prev - 0.15).toFixed(2));
              zoomRef.current = next;
              setHasModifiedView(true);
              return next;
            });
          }}
          title="Zoom Out (or Scroll Wheel Down)"
          className="p-1 sm:p-1.5 bg-[#15161f] hover:bg-[#252838] text-white/90 hover:text-white border border-black p5-badge-cut cursor-pointer active:scale-95 transition-all"
        >
          <ZoomOut className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
        </button>

        {/* Current Zoom Badge */}
        <div
          className="px-2 py-0.5 sm:py-1 bg-black text-[10px] sm:text-[11px] font-mono font-bold tracking-wider select-none border border-white/10"
          style={{ color: currentTheme.accent }}
          title="Current 3D Zoom Level"
        >
          {Math.round(zoomLevel * 100)}%
        </div>

        {/* Zoom In Button */}
        <button
          onClick={() => {
            playP5Sound('select');
            setZoomLevel((prev) => {
              const next = Math.min(2.5, +(prev + 0.15).toFixed(2));
              zoomRef.current = next;
              setHasModifiedView(true);
              return next;
            });
          }}
          title="Zoom In (or Scroll Wheel Up)"
          className="p-1 sm:p-1.5 bg-[#15161f] hover:bg-[#252838] text-white/90 hover:text-white border border-black p5-badge-cut cursor-pointer active:scale-95 transition-all"
        >
          <ZoomIn className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
        </button>

        {/* RESET 3D VIEW BUTTON: Appears if user dragged, moved, or zoomed the visualizer */}
        {hasModifiedView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              playP5Sound('slash');
              handleResetView();
            }}
            className="p5-badge-cut px-2 sm:px-2.5 py-0.5 sm:py-1 bg-black text-[#ffd700] hover:text-white border border-[#ffd700] text-[10px] sm:text-xs font-mono font-bold tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all ml-0.5"
            title="Reset Orbit, Position & Zoom to Default"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>
        )}
      </div>

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
          <span>DRAG 360° ALL-DIRECTION ORBIT // WHEEL / PINCH ZOOM // SHIFT+DRAG MOVE</span>
        </div>
      </div>
    </div>
  );
};
