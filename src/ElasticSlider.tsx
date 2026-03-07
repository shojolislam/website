import { useRef, useState, useCallback, useMemo } from "react";
import {
  motion,
  useSpring,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import { colors, fonts } from "./tokens";

interface ElasticSliderProps {
  min?: number;
  max?: number;
  defaultRange?: [number, number];
  onChange?: (range: [number, number]) => void;
  darkMode?: boolean;
}

const TRACK_THICKNESS = 42;
const HANDLE_RESTING_W = 20;
const HANDLE_HOVER_W = 26;
const HANDLE_DRAG_W = 26;
const HANDLE_DRAG_H = 54;
const HANDLE_PADDING = 4;
const HANDLE_DRAG_PADDING = 6;
const HANDLE_RADIUS = 999;
const MIN_GAP = 4;

// Arc geometry — large radius = subtle curve
const ARC_RADIUS = 1600;
// Angular span of the arc in degrees (how much of the circle we use)
const ARC_SPAN_DEG = 18;

const magnetSpring = { stiffness: 350, damping: 18, mass: 0.5 };

// Convert ratio (0–1) to angle on arc
function ratioToAngle(ratio: number): number {
  const halfSpan = (ARC_SPAN_DEG * Math.PI) / 360;
  return -halfSpan + ratio * 2 * halfSpan;
}

// Get x,y on the arc for a given ratio.
// arcCenterY = the Y of the circle's center (far below the track for an upward arch)
function arcPoint(ratio: number, svgWidth: number, arcCenterY: number): { x: number; y: number } {
  const angle = ratioToAngle(ratio);
  const cx = svgWidth / 2;
  const x = cx + ARC_RADIUS * Math.sin(angle);
  const y = arcCenterY - ARC_RADIUS * Math.cos(angle);
  return { x, y };
}

// Build SVG arc path between two ratios
function arcPath(r1: number, r2: number, svgWidth: number, arcCenterY: number): string {
  const p1 = arcPoint(r1, svgWidth, arcCenterY);
  const p2 = arcPoint(r2, svgWidth, arcCenterY);
  return `M ${p1.x} ${p1.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${p2.x} ${p2.y}`;
}

function GooFilterDef() {
  return (
    <defs>
      <filter id="goo">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12"
          result="goo"
        />
      </filter>
    </defs>
  );
}

export default function ElasticSlider({
  min = 0,
  max = 100,
  defaultRange = [20, 65],
  onChange,
  darkMode = false,
}: ElasticSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);
  const [draggingHandle, setDraggingHandle] = useState<"left" | "right" | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<"left" | "right" | null>(null);

  const [range, setRange] = useState<[number, number]>([
    (defaultRange[0] - min) / (max - min),
    (defaultRange[1] - min) / (max - min),
  ]);

  // Measure container width
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    containerRef.current = node;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const steps = max - min;
  const minGapRatio = MIN_GAP / steps;

  const leftSpring = useSpring(range[0], { stiffness: 600, damping: 35, mass: 0.3 });
  const rightSpring = useSpring(range[1], { stiffness: 600, damping: 35, mass: 0.3 });

  // Track animated values for rendering
  const [leftAnimated, setLeftAnimated] = useState(range[0]);
  const [rightAnimated, setRightAnimated] = useState(range[1]);
  useMotionValueEvent(leftSpring, "change", (v) => setLeftAnimated(v));
  useMotionValueEvent(rightSpring, "change", (v) => setRightAnimated(v));

  const leftValue = Math.round(min + range[0] * (max - min));
  const rightValue = Math.round(min + range[1] * (max - min));

  const theme = darkMode ? colors.dark : colors.light;

  // SVG dimensions
  const svgWidth = containerWidth;
  const TICK_AREA = 36;
  const TRACK_AREA = TRACK_THICKNESS + 30; // extra for handle expansion
  const svgHeight = TICK_AREA + TRACK_AREA;
  const trackCenterY = TICK_AREA + TRACK_THICKNESS / 2;

  // Get ratio from pointer event
  const getRatioFromEvent = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const raw = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(raw * steps) / steps;
    },
    [steps]
  );

  const startDrag = useCallback(
    (handle: "left" | "right", e: React.PointerEvent) => {
      e.preventDefault();
      setDraggingHandle(handle);

      const onMove = (ev: PointerEvent) => {
        const ratio = getRatioFromEvent(ev.clientX);
        setRange((prev) => {
          const next: [number, number] = [...prev];
          if (handle === "left") {
            next[0] = Math.min(ratio, prev[1] - minGapRatio);
          } else {
            next[1] = Math.max(ratio, prev[0] + minGapRatio);
          }
          leftSpring.set(next[0]);
          rightSpring.set(next[1]);
          onChange?.([
            Math.round(min + next[0] * (max - min)),
            Math.round(min + next[1] * (max - min)),
          ]);
          return next;
        });
      };

      const onUp = () => {
        setDraggingHandle(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [getRatioFromEvent, leftSpring, rightSpring, min, max, onChange, minGapRatio]
  );

  const handleTrackClick = useCallback(
    (e: React.PointerEvent) => {
      const ratio = getRatioFromEvent(e.clientX);
      const distToLeft = Math.abs(ratio - range[0]);
      const distToRight = Math.abs(ratio - range[1]);
      const nearest = distToLeft <= distToRight ? "left" : "right";

      setRange((prev) => {
        const next: [number, number] = [...prev];
        if (nearest === "left") {
          next[0] = Math.min(ratio, prev[1] - minGapRatio);
        } else {
          next[1] = Math.max(ratio, prev[0] + minGapRatio);
        }
        leftSpring.set(next[0]);
        rightSpring.set(next[1]);
        onChange?.([
          Math.round(min + next[0] * (max - min)),
          Math.round(min + next[1] * (max - min)),
        ]);
        return next;
      });

      startDrag(nearest, e);
    },
    [getRatioFromEvent, range, leftSpring, rightSpring, min, max, onChange, startDrag, minGapRatio]
  );

  const activeLeft = draggingHandle === "left" ? leftValue : null;
  const activeRight = draggingHandle === "right" ? rightValue : null;
  const leftDragging = draggingHandle === "left";
  const rightDragging = draggingHandle === "right";
  const leftHovered = hoveredHandle === "left";
  const rightHovered = hoveredHandle === "right";

  // Tick marks data
  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= steps; i++) {
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;
      arr.push({ index: i, isMajor, isMid, value: min + i, ratio: i / steps });
    }
    return arr;
  }, [steps, min]);

  // Circle center is far below the track — this creates an upward arch
  const arcCenterY = trackCenterY + ARC_RADIUS;

  // Compute arc points for track
  const trackPath = arcPath(0, 1, svgWidth, arcCenterY);
  const fillPath = arcPath(leftAnimated, rightAnimated, svgWidth, arcCenterY);

  // Handle positions on the arc
  const leftPos = arcPoint(leftAnimated, svgWidth, arcCenterY);
  const rightPos = arcPoint(rightAnimated, svgWidth, arcCenterY);

  // Handle sizing with springs
  const leftW = useSpring(HANDLE_RESTING_W, magnetSpring);
  const leftH = useSpring(TRACK_THICKNESS, magnetSpring);
  const leftPad = useSpring(HANDLE_PADDING, magnetSpring);
  const rightW = useSpring(HANDLE_RESTING_W, magnetSpring);
  const rightH = useSpring(TRACK_THICKNESS, magnetSpring);
  const rightPad = useSpring(HANDLE_PADDING, magnetSpring);

  // Track animated handle sizes for foreignObject
  const [leftSize, setLeftSize] = useState({ w: HANDLE_RESTING_W, h: TRACK_THICKNESS, p: HANDLE_PADDING });
  const [rightSize, setRightSize] = useState({ w: HANDLE_RESTING_W, h: TRACK_THICKNESS, p: HANDLE_PADDING });
  useMotionValueEvent(leftW, "change", (w) => setLeftSize((s) => ({ ...s, w })));
  useMotionValueEvent(leftH, "change", (h) => setLeftSize((s) => ({ ...s, h })));
  useMotionValueEvent(leftPad, "change", (p) => setLeftSize((s) => ({ ...s, p })));
  useMotionValueEvent(rightW, "change", (w) => setRightSize((s) => ({ ...s, w })));
  useMotionValueEvent(rightH, "change", (h) => setRightSize((s) => ({ ...s, h })));
  useMotionValueEvent(rightPad, "change", (p) => setRightSize((s) => ({ ...s, p })));

  if (leftDragging) {
    leftW.set(HANDLE_DRAG_W);
    leftH.set(HANDLE_DRAG_H);
    leftPad.set(HANDLE_DRAG_PADDING);
  } else {
    leftH.set(TRACK_THICKNESS);
    leftPad.set(HANDLE_PADDING);
    leftW.set(leftHovered ? HANDLE_HOVER_W : HANDLE_RESTING_W);
  }

  if (rightDragging) {
    rightW.set(HANDLE_DRAG_W);
    rightH.set(HANDLE_DRAG_H);
    rightPad.set(HANDLE_DRAG_PADDING);
  } else {
    rightH.set(TRACK_THICKNESS);
    rightPad.set(HANDLE_PADDING);
    rightW.set(rightHovered ? HANDLE_HOVER_W : HANDLE_RESTING_W);
  }

  // Gold shape dimensions
  const leftGoldW = leftDragging ? HANDLE_DRAG_W : leftHovered ? HANDLE_HOVER_W : HANDLE_RESTING_W;
  const leftGoldH = leftDragging ? HANDLE_DRAG_H : TRACK_THICKNESS;
  const rightGoldW = rightDragging ? HANDLE_DRAG_W : rightHovered ? HANDLE_HOVER_W : HANDLE_RESTING_W;
  const rightGoldH = rightDragging ? HANDLE_DRAG_H : TRACK_THICKNESS;

  // Rotation angles — handles follow the arc tangent
  const leftAngleDeg = (ratioToAngle(leftAnimated) * 180) / Math.PI;
  const rightAngleDeg = (ratioToAngle(rightAnimated) * 180) / Math.PI;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 540,
        userSelect: "none",
      }}
    >
      {/* Title + subtitle */}
      <div style={{ marginBottom: 32 }}>
        <span
          style={{
            display: "block",
            fontFamily: fonts.display,
            fontSize: 24,
            fontWeight: 800,
            textTransform: "uppercase",
            color: theme.text,
            letterSpacing: "0.05em",
            transition: "color 0.3s ease",
          }}
        >
          New website coming soon
        </span>
        <span
          style={{
            display: "block",
            fontFamily: fonts.mono,
            fontSize: 12,
            fontWeight: 400,
            color: theme.textSubtle,
            marginTop: 10,
            transition: "color 0.3s ease",
          }}
        >
          In the meantime, play with this slider
        </span>
      </div>

      {/* Arched slider */}
      <div
        ref={measureRef}
        onPointerDown={handleTrackClick}
        style={{
          position: "relative",
          width: "100%",
          cursor: draggingHandle ? "grabbing" : "pointer",
          touchAction: "none",
        }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: "block", overflow: "hidden" }}
        >
          <GooFilterDef />

          {/* Clip to container width */}
          <defs>
            <clipPath id="trackClip">
              <rect x="0" y="0" width={svgWidth} height={svgHeight + 40} />
            </clipPath>
          </defs>

          {/* Tick marks along the arc */}
          {ticks.map((tick) => {
            const isActiveLeft = activeLeft === tick.value;
            const isActiveRight = activeRight === tick.value;
            const isActive = isActiveLeft || isActiveRight;

            const tickHeight = isActive
              ? 20
              : tick.isMajor
                ? 13
                : tick.isMid
                  ? 8
                  : 4;

            const pt = arcPoint(tick.ratio, svgWidth, arcCenterY);
            // Angle for rotation — ticks radiate from arc center
            const angle = ratioToAngle(tick.ratio);
            const angleDeg = (angle * 180) / Math.PI;

            const tickColor = isActive
              ? colors.accent
              : tick.isMajor
                ? theme.tickMajor
                : theme.tickMinor;

            return (
              <g key={tick.index}>
                {/* Tick line — drawn upward from arc surface */}
                <line
                  x1={pt.x}
                  y1={pt.y - TRACK_THICKNESS / 2 - 6}
                  x2={pt.x}
                  y2={pt.y - TRACK_THICKNESS / 2 - 6 - tickHeight}
                  stroke={tickColor}
                  strokeWidth={isActive ? 2 : 1}
                  strokeLinecap="round"
                  transform={`rotate(${angleDeg}, ${pt.x}, ${pt.y})`}
                />

                {/* Value label */}
                {isActive && (
                  <foreignObject
                    x={pt.x - 20}
                    y={pt.y - TRACK_THICKNESS / 2 - 34 - tickHeight}
                    width={40}
                    height={20}
                    style={{ overflow: "visible" }}
                  >
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, x: isActiveLeft ? -8 : 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: isActiveLeft ? -8 : 8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25, mass: 0.4 }}
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: 11,
                          fontWeight: 600,
                          color: theme.text,
                          fontVariantNumeric: "tabular-nums",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tick.value}
                      </motion.div>
                    </AnimatePresence>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Track background arc */}
          <path
            d={trackPath}
            fill="none"
            stroke={theme.surface}
            strokeWidth={TRACK_THICKNESS}
            strokeLinecap="butt"
            style={{ transition: "stroke 0.3s ease" }}
          />

          {/* Fill arc — no round linecap to avoid blob ends */}
          <path
            d={fillPath}
            fill="none"
            stroke={colors.accent}
            strokeWidth={TRACK_THICKNESS}
            strokeLinecap="butt"
          />

          {/* LEFT goo layer — only rendered when dragging */}
          {leftDragging && (
            <g filter="url(#goo)">
              <rect
                x={leftPos.x - leftGoldW / 2}
                y={leftPos.y - TRACK_THICKNESS / 2}
                width={leftGoldW}
                height={TRACK_THICKNESS}
                fill={colors.accent}
                transform={`rotate(${leftAngleDeg}, ${leftPos.x}, ${leftPos.y})`}
              />
              <rect
                x={leftPos.x - leftGoldW / 2}
                y={leftPos.y - leftGoldH / 2}
                width={leftGoldW}
                height={leftGoldH}
                rx={HANDLE_RADIUS}
                fill={colors.accent}
                transform={`rotate(${leftAngleDeg}, ${leftPos.x}, ${leftPos.y})`}
              />
            </g>
          )}

          {/* RIGHT goo layer — only rendered when dragging */}
          {rightDragging && (
            <g filter="url(#goo)">
              <rect
                x={rightPos.x - rightGoldW / 2}
                y={rightPos.y - TRACK_THICKNESS / 2}
                width={rightGoldW}
                height={TRACK_THICKNESS}
                fill={colors.accent}
                transform={`rotate(${rightAngleDeg}, ${rightPos.x}, ${rightPos.y})`}
              />
              <rect
                x={rightPos.x - rightGoldW / 2}
                y={rightPos.y - rightGoldH / 2}
                width={rightGoldW}
                height={rightGoldH}
                rx={HANDLE_RADIUS}
                fill={colors.accent}
                transform={`rotate(${rightAngleDeg}, ${rightPos.x}, ${rightPos.y})`}
              />
            </g>
          )}

          {/* Left handle overlay (white/dark pill) */}
          <g transform={`rotate(${leftAngleDeg}, ${leftPos.x}, ${leftPos.y})`}>
          <foreignObject
            x={leftPos.x - leftSize.w / 2}
            y={leftPos.y - leftSize.h / 2}
            width={leftSize.w}
            height={leftSize.h}
            style={{ overflow: "visible" }}
          >
            <div
              onPointerEnter={() => setHoveredHandle("left")}
              onPointerLeave={() => setHoveredHandle(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
                startDrag("left", e);
              }}
              style={{
                width: "100%",
                height: "100%",
                padding: leftSize.p,
                borderRadius: HANDLE_RADIUS,
                cursor: leftDragging ? "grabbing" : "grab",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: darkMode ? colors.dark.surface : colors.light.bg,
                  borderRadius: HANDLE_RADIUS,
                  boxShadow: leftDragging
                    ? "0px 8px 16px rgba(0,0,0,0.12), 0px 2px 4px rgba(0,0,0,0.08)"
                    : "0px 4.5px 4.5px rgba(0,0,0,0.08), 0px 1.5px 3px rgba(0,0,0,0.08)",
                  transition: "box-shadow 0.2s ease",
                }}
              />
            </div>
          </foreignObject>
          </g>

          {/* Right handle overlay */}
          <g transform={`rotate(${rightAngleDeg}, ${rightPos.x}, ${rightPos.y})`}>
          <foreignObject
            x={rightPos.x - rightSize.w / 2}
            y={rightPos.y - rightSize.h / 2}
            width={rightSize.w}
            height={rightSize.h}
            style={{ overflow: "visible" }}
          >
            <div
              onPointerEnter={() => setHoveredHandle("right")}
              onPointerLeave={() => setHoveredHandle(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
                startDrag("right", e);
              }}
              style={{
                width: "100%",
                height: "100%",
                padding: rightSize.p,
                borderRadius: HANDLE_RADIUS,
                cursor: rightDragging ? "grabbing" : "grab",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: darkMode ? colors.dark.surface : colors.light.bg,
                  borderRadius: HANDLE_RADIUS,
                  boxShadow: rightDragging
                    ? "0px 8px 16px rgba(0,0,0,0.12), 0px 2px 4px rgba(0,0,0,0.08)"
                    : "0px 4.5px 4.5px rgba(0,0,0,0.08), 0px 1.5px 3px rgba(0,0,0,0.08)",
                  transition: "box-shadow 0.2s ease",
                }}
              />
            </div>
          </foreignObject>
          </g>
        </svg>
      </div>
    </div>
  );
}
