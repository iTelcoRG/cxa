"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { DRAG, KEYBOARD_STEP_DEG, REDUCED_MOTION_ANGLE_DEG } from "./hoodie-config";
import { angleForPosition, angleForProgress, ORDERED_POSITIONS } from "./hoodie-math";
import type { HeroHoodieController, ScrollPosition } from "./hoodie-types";

/** Shared, mutable rotation state read every frame inside the R3F render
 *  loop and written from plain DOM pointer handlers outside it. Kept as
 *  a ref (not React state) so dragging and scrolling never trigger a
 *  React re-render -- that's the whole point, see PERFORMANCE in
 *  hoodie-model-spec.md / the README. */
export interface RotationState {
  /** Damped, currently-displayed yaw in degrees. Unwrapped (can exceed 360). */
  current: number;
  /** Where `current` is easing toward. Unwrapped. */
  target: number;
  dragging: boolean;
  /** Residual angular velocity (deg/frame) applied as inertia after release. */
  velocity: number;
}

interface Options {
  rotationProgress?: number;
  interactive: boolean;
  reducedMotion: boolean;
  onPositionChange?: (position: ScrollPosition) => void;
  controllerRef?: React.Ref<HeroHoodieController>;
}

export function useHoodieRotation({
  rotationProgress,
  interactive,
  reducedMotion,
  onPositionChange,
  controllerRef,
}: Options) {
  const rotationState = useRef<RotationState>({
    current: 0,
    target: 0,
    dragging: false,
    velocity: 0,
  });
  const activePositionRef = useRef<ScrollPosition>("FRONT");
  const dragOrigin = useRef<{ x: number; lastX: number; lastT: number } | null>(null);

  // Always-current callback ref: `controller` below is memoized once (its
  // identity must stay stable across renders for `controllerRef` to be
  // reliable), so it cannot safely close over the `onPositionChange` prop
  // directly -- that would freeze it to whatever the prop was on first
  // render. Reading through a ref sidesteps the staleness.
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  // Reduced motion: snap to a strong static angle and stop responding to
  // scroll/drag entirely. No animation is required to read the garment.
  useEffect(() => {
    if (!reducedMotion) return;
    rotationState.current.current = REDUCED_MOTION_ANGLE_DEG;
    rotationState.current.target = REDUCED_MOTION_ANGLE_DEG;
    rotationState.current.velocity = 0;
  }, [reducedMotion]);

  // Controlled scroll mode: keep target in sync with the prop, unless
  // the user is mid-drag (drag wins until the next prop update).
  useEffect(() => {
    if (reducedMotion) return;
    if (rotationProgress === undefined) return;
    if (rotationState.current.dragging) return;
    rotationState.current.target = angleForProgress(rotationProgress);
  }, [rotationProgress, reducedMotion]);

  const notifyPosition = useCallback((position: ScrollPosition) => {
    activePositionRef.current = position;
    onPositionChangeRef.current?.(position);
  }, []);

  const controller: HeroHoodieController = useMemo(
    () => ({
      goToPosition: (position, opts) => {
        const angle = angleForPosition(position);
        rotationState.current.target = angle;
        if (opts?.animate === false) {
          rotationState.current.current = angle;
        }
        rotationState.current.velocity = 0;
        notifyPosition(position);
      },
      next: () => {
        const idx = ORDERED_POSITIONS.indexOf(activePositionRef.current);
        const nextPos = ORDERED_POSITIONS[(idx + 1) % ORDERED_POSITIONS.length];
        controller.goToPosition(nextPos);
      },
      previous: () => {
        const idx = ORDERED_POSITIONS.indexOf(activePositionRef.current);
        const prevPos =
          ORDERED_POSITIONS[(idx - 1 + ORDERED_POSITIONS.length) % ORDERED_POSITIONS.length];
        controller.goToPosition(prevPos);
      },
      setRotationProgress: (progress) => {
        if (rotationState.current.dragging) return;
        rotationState.current.target = angleForProgress(Math.min(1, Math.max(0, progress)));
      },
      getActivePosition: () => activePositionRef.current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useImperativeHandle(controllerRef, () => controller, [controller]);

  // Pointer (mouse + touch, unified) drag-to-rotate handlers, meant to be
  // spread onto the wrapping DOM element. Horizontal movement rotates;
  // vertical movement is left alone so page scroll keeps working
  // (pair with `touchAction: "pan-y"` on that element).
  const pointerHandlers = useMemo(() => {
    if (!interactive || reducedMotion) return {};

    const onPointerDown = (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      rotationState.current.dragging = true;
      rotationState.current.velocity = 0;
      dragOrigin.current = { x: e.clientX, lastX: e.clientX, lastT: performance.now() };
    };
    const onPointerMove = (e: React.PointerEvent) => {
      if (!rotationState.current.dragging || !dragOrigin.current) return;
      const now = performance.now();
      const dx = e.clientX - dragOrigin.current.lastX;
      const dt = Math.max(1, now - dragOrigin.current.lastT);
      const deltaDeg = dx * DRAG.degreesPerPixel;
      rotationState.current.target += deltaDeg;
      // deg/frame estimate for post-release inertia (~16ms frame budget)
      rotationState.current.velocity = (deltaDeg / dt) * 16;
      dragOrigin.current.lastX = e.clientX;
      dragOrigin.current.lastT = now;
    };
    const endDrag = () => {
      rotationState.current.dragging = false;
      dragOrigin.current = null;
    };

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerLeave: endDrag,
    };
  }, [interactive, reducedMotion]);

  const keyboardHandlers = useMemo(() => {
    if (reducedMotion) return {};
    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        rotationState.current.target += KEYBOARD_STEP_DEG;
        rotationState.current.velocity = 0;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        rotationState.current.target -= KEYBOARD_STEP_DEG;
        rotationState.current.velocity = 0;
      }
    };
    return { onKeyDown };
  }, [reducedMotion]);

  return {
    rotationState,
    controller,
    pointerHandlers,
    keyboardHandlers,
    // Exposed so HoodieModel's onActivePositionChange callback can route
    // through the same notify path (keeps activePositionRef authoritative).
    notifyPosition,
  };
}
