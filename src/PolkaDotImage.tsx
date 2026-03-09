import { useEffect, useRef, useState, useCallback } from "react";

interface PolkaDotImageProps {
  src: string;
  dotColor?: string;
  baseRadius?: number;
  maxRadius?: number;
  gap?: number;
  brushRadius?: number;
  darkMode?: boolean;
}

// Layered sine waves at different angles/frequencies/speeds create
// an organic, ocean-surface-like noise field.  Each "layer" is a
// travelling sine wave defined by direction, wavelength & speed.
interface WaveLayer {
  // Direction (unit vector)
  dx: number;
  dy: number;
  // Spatial frequency (smaller = broader waves)
  freq: number;
  // Phase speed (how fast it drifts)
  speed: number;
  // Amplitude contribution
  amp: number;
}

function makeWaveLayers(): WaveLayer[] {
  // 5 layers at varied angles so the interference pattern looks natural
  const layers: WaveLayer[] = [];
  const count = 5;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    layers.push({
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      freq: 0.006 + Math.random() * 0.008,   // broad waves
      speed: 0.008 + Math.random() * 0.012,   // gentle drift
      amp: 0.18 + Math.random() * 0.12,
    });
  }
  return layers;
}

export default function PolkaDotImage({
  src,
  dotColor = "#000",
  baseRadius = 1.5,
  maxRadius = 5.5,
  gap = 11,
  brushRadius = 130,
  darkMode = false,
}: PolkaDotImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brightnessGrid, setBrightnessGrid] = useState<number[][] | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const animRef = useRef<number>(0);
  const revealRef = useRef<Float32Array | null>(null);
  const waveLayersRef = useRef<WaveLayer[]>(makeWaveLayers());
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  // Measure container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: Math.floor(width), h: Math.floor(height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const cols = gap > 0 ? Math.floor(containerSize.w / gap) : 0;
  const rows = gap > 0 ? Math.floor(containerSize.h / gap) : 0;

  // Load image and sample brightness
  useEffect(() => {
    if (cols === 0 || rows === 0) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const imgAspect = img.width / img.height;
      const gridAspect = cols / rows;

      let sampleCols: number, sampleRows: number, offsetX: number, offsetY: number;
      if (gridAspect > imgAspect) {
        sampleRows = rows;
        sampleCols = Math.round(rows * imgAspect);
        offsetX = Math.floor((cols - sampleCols) / 2);
        offsetY = 0;
      } else {
        sampleCols = cols;
        sampleRows = Math.round(cols / imgAspect);
        offsetX = 0;
        offsetY = Math.floor((rows - sampleRows) / 2);
      }

      const offscreen = document.createElement("canvas");
      offscreen.width = sampleCols;
      offscreen.height = sampleRows;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0, sampleCols, sampleRows);
      const imageData = ctx.getImageData(0, 0, sampleCols, sampleRows);

      const grid: number[][] = [];
      for (let y = 0; y < rows; y++) {
        const row: number[] = [];
        for (let x = 0; x < cols; x++) {
          const ix = x - offsetX;
          const iy = y - offsetY;
          if (ix >= 0 && ix < sampleCols && iy >= 0 && iy < sampleRows) {
            const i = (iy * sampleCols + ix) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            row.push(a < 10 ? 0 : lum);
          } else {
            row.push(0);
          }
        }
        grid.push(row);
      }
      setBrightnessGrid(grid);
      revealRef.current = new Float32Array(cols * rows);
    };
    img.src = src;
  }, [src, cols, rows]);

  // Animation loop
  const animate = useCallback(() => {
    if (!brightnessGrid || !canvasRef.current || !revealRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const reveal = revealRef.current;
    const numCols = brightnessGrid[0].length;
    const numRows = brightnessGrid.length;
    const dpr = window.devicePixelRatio || 1;

    const cssW = numCols * gap;
    const cssH = numRows * gap;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const br = brushRadius;
    const lerpIn = 0.1;
    const lerpOut = 0.04;
    const layers = waveLayersRef.current;
    let time = 0;
    let lastTime = 0;

    const draw = (timestamp: number) => {
      const dt = lastTime ? Math.min((timestamp - lastTime) / 16.67, 3) : 1;
      lastTime = timestamp;
      time += dt;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const active = mouseRef.current.active;

      ctx.clearRect(0, 0, cssW, cssH);

      for (let y = 0; y < numRows; y++) {
        for (let x = 0; x < numCols; x++) {
          const idx = y * numCols + x;
          const cx = x * gap + gap / 2;
          const cy = y * gap + gap / 2;

          // Ocean wave noise: sum of sine layers, result in -1..1 range
          let noiseSum = 0;
          for (const l of layers) {
            const proj = cx * l.dx + cy * l.dy;
            noiseSum += l.amp * Math.sin(proj * l.freq + time * l.speed);
          }

          // Only the peaks of the noise reveal the image.
          // Threshold so that most of the surface stays idle,
          // and only the crests (small area) cause a glimpse.
          const threshold = 0.35;
          const waveInfluence = Math.max(0, (noiseSum - threshold) / (1 - threshold));

          // Hover/touch
          let hoverTarget = 0;
          if (active) {
            const dx = cx - mx;
            const dy = cy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < br) {
              hoverTarget = 1 - (dist / br) * (dist / br);
            }
          }

          const target = Math.max(hoverTarget, waveInfluence);

          const current = reveal[idx];
          const speed = target > current ? lerpIn : lerpOut;
          reveal[idx] = current + (target - current) * speed * dt;

          const rawBrightness = brightnessGrid[y][x];
          const brightness = darkMode ? rawBrightness : 1 - rawBrightness;
          const targetRadius = maxRadius * brightness;
          const radius = baseRadius + (targetRadius - baseRadius) * reveal[idx];

          if (radius > 0.2) {
            const alpha = 0.3 + 0.7 * (radius / maxRadius);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [brightnessGrid, dotColor, baseRadius, maxRadius, gap, brushRadius, darkMode]);

  useEffect(() => {
    const cleanup = animate();
    return cleanup;
  }, [animate]);

  // Mouse + touch events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = clientX - rect.left;
      mouseRef.current.y = clientY - rect.top;
      mouseRef.current.active = true;
    };

    const onMouseMove = (e: MouseEvent) => updatePointer(e.clientX, e.clientY);
    const onMouseLeave = () => { mouseRef.current.active = false; };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      updatePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updatePointer(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => { mouseRef.current.active = false; };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [brightnessGrid]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
      />
    </div>
  );
}
