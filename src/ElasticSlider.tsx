import { useRef, useState, useCallback, useMemo } from "react";
import {
  motion,
  useSpring,
  useTransform,
  AnimatePresence,
  MotionValue,
} from "framer-motion";

interface ElasticSliderProps {
  min?: number;
  max?: number;
  defaultRange?: [number, number];
  onChange?: (range: [number, number]) => void;
  darkMode?: boolean;
}

const TRACK_HEIGHT = 38;
const TRACK_RADIUS = 8;
const HANDLE_RESTING_WIDTH = 20;
const HANDLE_PADDING = 4;
const FILL_COLOR = "#C6FE21";

const HANDLE_HOVER_WIDTH = 26;
const HANDLE_DRAG_HEIGHT = 54;
const HANDLE_DRAG_WIDTH = 26;
const HANDLE_DRAG_PADDING = 6;
const HANDLE_RESTING_RADIUS = 999;

// Minimum steps between handles
const MIN_GAP = 4;

const MONO = "'Geist Mono', monospace";

const magnetSpring = { stiffness: 350, damping: 18, mass: 0.5 };

function GooFilterDef() {
  return (
    <svg
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter id="goo">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="4"
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12"
            result="goo"
          />
        </filter>
      </defs>
    </svg>
  );
}

// Gold shape — used in goo layers
function GoldShape({
  leftPos,
  isDragging,
  isHovered,
}: {
  leftPos: MotionValue<string>;
  isDragging: boolean;
  isHovered: boolean;
}) {
  const width = useSpring(HANDLE_RESTING_WIDTH, magnetSpring);
  const height = useSpring(TRACK_HEIGHT, magnetSpring);

  if (isDragging) {
    width.set(HANDLE_DRAG_WIDTH);
    height.set(HANDLE_DRAG_HEIGHT);
  } else {
    height.set(TRACK_HEIGHT);
    if (isHovered) width.set(HANDLE_HOVER_WIDTH);
    else width.set(HANDLE_RESTING_WIDTH);
  }

  return (
    <motion.div
      style={{
        position: "absolute",
        left: leftPos,
        top: "50%",
        y: "-50%",
        x: "-50%",
        width,
        height,
        backgroundColor: FILL_COLOR,
        borderRadius: HANDLE_RESTING_RADIUS,
      }}
    />
  );
}

// Interactive overlay: transparent bg + white pill
function HandleOverlay({
  leftPos,
  isDragging,
  isHovered,
  onDragStart,
  onHoverChange,
  darkMode = false,
}: {
  leftPos: MotionValue<string>;
  isDragging: boolean;
  isHovered: boolean;
  onDragStart: (e: React.PointerEvent) => void;
  onHoverChange: (hovered: boolean) => void;
  darkMode?: boolean;
}) {
  const width = useSpring(HANDLE_RESTING_WIDTH, magnetSpring);
  const height = useSpring(TRACK_HEIGHT, magnetSpring);
  const padding = useSpring(HANDLE_PADDING, magnetSpring);

  if (isDragging) {
    width.set(HANDLE_DRAG_WIDTH);
    height.set(HANDLE_DRAG_HEIGHT);
    padding.set(HANDLE_DRAG_PADDING);
  } else {
    height.set(TRACK_HEIGHT);
    padding.set(HANDLE_PADDING);
    if (isHovered) width.set(HANDLE_HOVER_WIDTH);
    else width.set(HANDLE_RESTING_WIDTH);
  }

  return (
    <motion.div
      onPointerEnter={() => onHoverChange(true)}
      onPointerLeave={() => onHoverChange(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart(e);
      }}
      style={{
        position: "absolute",
        left: leftPos,
        top: "50%",
        y: "-50%",
        x: "-50%",
        width,
        height,
        padding,
        borderRadius: HANDLE_RESTING_RADIUS,
        cursor: isDragging ? "grabbing" : "grab",
        zIndex: 3,
        display: "flex",
        alignItems: "center",
      }}
    >
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: darkMode ? "#1a1a1a" : "white",
          borderRadius: HANDLE_RESTING_RADIUS,
          boxShadow: isDragging
            ? "0px 8px 16px rgba(0,0,0,0.12), 0px 2px 4px rgba(0,0,0,0.08)"
            : "0px 4.5px 4.5px rgba(0,0,0,0.08), 0px 1.5px 3px rgba(0,0,0,0.08)",
          transition: "box-shadow 0.2s ease",
        }}
      />
    </motion.div>
  );
}

function TickMarks({
  min,
  max,
  activeLeft,
  activeRight,
  position = "below",
  darkMode = false,
}: {
  min: number;
  max: number;
  activeLeft: number | null;
  activeRight: number | null;
  position?: "above" | "below";
  darkMode?: boolean;
}) {
  const steps = max - min;

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= steps; i++) {
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;
      arr.push({ index: i, isMajor, isMid, value: min + i });
    }
    return arr;
  }, [steps, min]);

  const TICK_ZONE = 16;
  const LABEL_HEIGHT = 14;
  const GAP = 2;
  const totalHeight = TICK_ZONE + GAP + LABEL_HEIGHT;

  // "above": value label on top, ticks grow upward from bottom
  // "below": ticks grow downward from top, value label on bottom
  const isAbove = position === "above";

  return (
    <div
      style={{ position: "relative", width: "100%", height: totalHeight }}
    >
      {ticks.map((tick) => {
        const isActiveLeft = activeLeft === tick.value;
        const isActiveRight = activeRight === tick.value;
        const isActive = isActiveLeft || isActiveRight;
        const leftPos = `${(tick.index / steps) * 100}%`;

        const tickHeight = isActive
          ? 16
          : tick.isMajor
            ? 10
            : tick.isMid
              ? 6
              : 3;

        return (
          <div key={tick.index} style={{ pointerEvents: "none" }}>
            {/* Tick bar — grows from the track edge */}
            <motion.div
              animate={{
                height: tickHeight,
                backgroundColor: isActive
                  ? FILL_COLOR
                  : tick.isMajor
                    ? darkMode ? "#525252" : "#a3a3a3"
                    : darkMode ? "#333333" : "#d4d4d4",
                width: isActive ? 2 : 1,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{
                position: "absolute",
                left: leftPos,
                // Above: ticks anchored to bottom edge, grow upward
                // Below: ticks anchored to top edge, grow downward
                ...(isAbove
                  ? { bottom: 0 }
                  : { top: 0 }),
                transform: "translateX(-50%)",
                borderRadius: 1,
              }}
            />

            {/* Value label */}
            <div
              style={{
                position: "absolute",
                left: leftPos,
                // Above: label sits above the ticks
                // Below: label sits below the ticks
                ...(isAbove
                  ? { top: 0 }
                  : { bottom: 0 }),
                transform: "translateX(-50%)",
              }}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, x: isActiveLeft ? -8 : 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isActiveLeft ? -8 : 8 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 25,
                      mass: 0.4,
                    }}
                    style={{
                      display: "block",
                      fontFamily: MONO,
                      fontSize: 11,
                      fontWeight: 600,
                      color: FILL_COLOR,
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                    }}
                  >
                    {tick.value}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ElasticSlider({
  min = 0,
  max = 100,
  defaultRange = [20, 65],
  onChange,
  darkMode = false,
}: ElasticSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<
    "left" | "right" | null
  >(null);
  const [hoveredHandle, setHoveredHandle] = useState<
    "left" | "right" | null
  >(null);

  const [range, setRange] = useState<[number, number]>([
    (defaultRange[0] - min) / (max - min),
    (defaultRange[1] - min) / (max - min),
  ]);

  const leftSpring = useSpring(range[0], {
    stiffness: 600,
    damping: 35,
    mass: 0.3,
  });
  const rightSpring = useSpring(range[1], {
    stiffness: 600,
    damping: 35,
    mass: 0.3,
  });

  const leftValue = Math.round(min + range[0] * (max - min));
  const rightValue = Math.round(min + range[1] * (max - min));

  const leftPercent = useTransform(leftSpring, (v) => `${v * 100}%`);
  const rightPercent = useTransform(rightSpring, (v) => `${v * 100}%`);
  const fillRight = useTransform(rightSpring, (v) => `${(1 - v) * 100}%`);
  const GOO_EXTEND = 12;

  const steps = max - min;
  const minGapRatio = MIN_GAP / steps;

  const getRatioFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const raw = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
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
    [
      getRatioFromEvent,
      range,
      leftSpring,
      rightSpring,
      min,
      max,
      onChange,
      startDrag,
      minGapRatio,
    ]
  );

  const activeLeft = draggingHandle === "left" ? leftValue : null;
  const activeRight = draggingHandle === "right" ? rightValue : null;

  const leftDragging = draggingHandle === "left";
  const rightDragging = draggingHandle === "right";
  const leftHovered = hoveredHandle === "left";
  const rightHovered = hoveredHandle === "right";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 500,
        userSelect: "none",
      }}
    >
      <GooFilterDef />

      {/* Title + subtitle */}
      <div style={{ marginBottom: 12 }}>
        <span
          style={{
            display: "block",
            fontFamily: "'Neue Machina Ultrabold', 'Neue Machina', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            textTransform: "uppercase",
            color: darkMode ? "#e5e5e5" : "#171717",
            letterSpacing: "0.05em",
            transition: "color 0.3s ease",
          }}
        >
          New website coming soon
        </span>
        <span
          style={{
            display: "block",
            fontFamily: MONO,
            fontSize: 12,
            fontWeight: 400,
            color: darkMode ? "#737373" : "#a3a3a3",
            marginTop: 10,
            transition: "color 0.3s ease",
          }}
        >
          In the meantime, play with this slider
        </span>
      </div>

      {/* Tick marks + value labels — above the track */}
      <div style={{ marginBottom: 12 }}>
        <TickMarks
          min={min}
          max={max}
          activeLeft={activeLeft}
          activeRight={activeRight}
          position="above"
          darkMode={darkMode}
        />
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackClick}
        style={{
          position: "relative",
          width: "100%",
          height: TRACK_HEIGHT,
          backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5",
          borderRadius: TRACK_RADIUS,
          cursor: draggingHandle ? "grabbing" : "pointer",
          touchAction: "none",
          overflow: "visible",
          transition: "background-color 0.3s ease",
        }}
      >
        {/* LEFT handle goo layer */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -((HANDLE_DRAG_HEIGHT - TRACK_HEIGHT) / 2 + 4),
            bottom: -((HANDLE_DRAG_HEIGHT - TRACK_HEIGHT) / 2 + 4),
            overflow: "visible",
            filter: leftDragging ? "url(#goo)" : "none",
            pointerEvents: "none",
          }}
        >
          {/* Fill bar */}
          <motion.div
            style={{
              position: "absolute",
              top: (HANDLE_DRAG_HEIGHT - TRACK_HEIGHT) / 2 + 4,
              left: leftPercent,
              right: fillRight,
              height: TRACK_HEIGHT,
              backgroundColor: FILL_COLOR,
              borderRadius: 0,
              marginLeft: draggingHandle ? -GOO_EXTEND : 0,
              marginRight: draggingHandle ? -GOO_EXTEND : 0,
              transition: draggingHandle ? "none" : "margin 0.2s ease",
            }}
          />
          <GoldShape
            leftPos={leftPercent}
            isDragging={leftDragging}
            isHovered={leftHovered}
          />
        </div>

        {/* RIGHT handle goo layer */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: -((HANDLE_DRAG_HEIGHT - TRACK_HEIGHT) / 2 + 4),
            bottom: -((HANDLE_DRAG_HEIGHT - TRACK_HEIGHT) / 2 + 4),
            overflow: "visible",
            filter: rightDragging ? "url(#goo)" : "none",
            pointerEvents: "none",
          }}
        >
          {/* Fill bar */}
          <motion.div
            style={{
              position: "absolute",
              top: (HANDLE_DRAG_HEIGHT - TRACK_HEIGHT) / 2 + 4,
              left: leftPercent,
              right: fillRight,
              height: TRACK_HEIGHT,
              backgroundColor: FILL_COLOR,
              borderRadius: 0,
              marginLeft: draggingHandle ? -GOO_EXTEND : 0,
              marginRight: draggingHandle ? -GOO_EXTEND : 0,
              transition: draggingHandle ? "none" : "margin 0.2s ease",
            }}
          />
          <GoldShape
            leftPos={rightPercent}
            isDragging={rightDragging}
            isHovered={rightHovered}
          />
        </div>

        {/* Handle overlays */}
        <HandleOverlay
          leftPos={leftPercent}
          isDragging={leftDragging}
          isHovered={leftHovered}
          onDragStart={(e) => startDrag("left", e)}
          onHoverChange={(h) => setHoveredHandle(h ? "left" : null)}
          darkMode={darkMode}
        />

        <HandleOverlay
          leftPos={rightPercent}
          isDragging={rightDragging}
          isHovered={rightHovered}
          onDragStart={(e) => startDrag("right", e)}
          onHoverChange={(h) => setHoveredHandle(h ? "right" : null)}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
