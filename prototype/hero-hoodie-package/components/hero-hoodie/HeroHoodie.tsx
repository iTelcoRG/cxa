"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  DEFAULT_FALLBACK_IMAGE,
  DEFAULT_HOMEPAGE_BRANDING,
  DEFAULT_MODEL_SRC,
} from "./hoodie-config";
import { HeroHoodieErrorBoundary } from "./HeroHoodieErrorBoundary";
import { HoodieFallbackImage } from "./HoodieFallbackImage";
import type { HeroHoodieProps, ScrollPosition } from "./hoodie-types";
import { useHoodieRotation } from "./useHoodieRotation";
import { useReducedMotion } from "./useReducedMotion";
import { useWebGLSupport } from "./useWebGLSupport";

// The entire R3F/three bundle is code-split behind this dynamic import.
// ssr:false is required (WebGL doesn't exist server-side) and also means
// Next only ships that JS to clients that actually mount the canvas --
// visitors who fall back to the static image never pay for it.
const HeroHoodieCanvas = dynamic(
  () => import("./HeroHoodieCanvas").then((m) => m.HeroHoodieCanvas),
  { ssr: false, loading: () => <CanvasLoadingSkeleton /> }
);

const POSITION_LABELS: Record<ScrollPosition, string> = {
  FRONT: "Front",
  LEFT_CHEST: "Left chest",
  LEFT_SLEEVE: "Left sleeve",
  FULL_BACK: "Full back",
  RIGHT_SLEEVE: "Right sleeve",
  RIGHT_CHEST: "Right chest",
};

function CanvasLoadingSkeleton() {
  return (
    <div
      aria-hidden
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        background:
          "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.06), rgba(255,255,255,0) 60%)",
      }}
    />
  );
}

export function HeroHoodie({
  className,
  branding = DEFAULT_HOMEPAGE_BRANDING,
  rotationProgress,
  interactive = true,
  showControls = true,
  showShadow = true,
  onPositionChange,
  reducedMotion: reducedMotionProp,
  modelSrc = DEFAULT_MODEL_SRC,
  fallbackImageSrc = DEFAULT_FALLBACK_IMAGE,
  controllerRef,
  ariaLabel = "Interactive 3D preview of the CXA hoodie. Drag to rotate, or use the buttons to jump to a branding position.",
}: HeroHoodieProps) {
  const [mounted, setMounted] = useState(false);
  const webglSupport = useWebGLSupport();
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionProp ?? systemReducedMotion;

  const [announced, setAnnounced] = useState<ScrollPosition>("FRONT");

  const handlePositionChange = (position: ScrollPosition) => {
    setAnnounced(position);
    onPositionChange?.(position);
  };

  const { rotationState, controller, pointerHandlers, keyboardHandlers, notifyPosition } =
    useHoodieRotation({
      rotationProgress,
      interactive,
      reducedMotion,
      controllerRef,
      onPositionChange: handlePositionChange,
    });

  useEffect(() => setMounted(true), []);

  const showCanvas = mounted && webglSupport === "supported";
  const showFallback = mounted && webglSupport === "unsupported";
  // While `mounted` is still false (SSR + first paint) or webglSupport is
  // still "checking", render the same skeleton on server and client so
  // there is no hydration mismatch and no layout shift.

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ position: "relative", width: "100%", height: "100%", touchAction: "pan-y" }}
      tabIndex={interactive && !reducedMotion ? 0 : -1}
      {...pointerHandlers}
      {...keyboardHandlers}
    >
      <HeroHoodieErrorBoundary
        fallback={<HoodieFallbackImage src={fallbackImageSrc} />}
      >
        {showFallback && <HoodieFallbackImage src={fallbackImageSrc} />}
        {!mounted && <CanvasLoadingSkeleton />}
        {showCanvas && (
          <HeroHoodieCanvas
            modelSrc={modelSrc}
            branding={branding}
            rotationState={rotationState}
            onActivePositionChange={notifyPosition}
            showShadow={showShadow && !reducedMotion}
          />
        )}
      </HeroHoodieErrorBoundary>

      {/* Screen-reader-only live update -- the host page renders its own
          visible branding-location labels per the spec; this is purely
          the accessible announcement for the canvas region. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        Now showing: {POSITION_LABELS[announced]}
      </span>

      {showControls && !showFallback && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 12,
          }}
        >
          <button
            type="button"
            aria-label="Rotate to previous branding position"
            onClick={() => controller.previous()}
            style={controlButtonStyle}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Rotate to next branding position"
            onClick={() => controller.next()}
            style={controlButtonStyle}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

const controlButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
};
