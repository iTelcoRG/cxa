/**
 * hoodie-config.ts
 *
 * All the tunable numbers live here on purpose -- rotation timing,
 * camera framing, zone placement, default assets. Nothing in the rest
 * of the component tree should hardcode a number that belongs here.
 * When the production GLB replaces the placeholder, this is very
 * likely the only file that needs edits (see hoodie-model-spec.md).
 */
import type { BrandingZoneKey, RotationKeyframe, ZoneAnchorMapping } from "./hoodie-types";

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */

/** Ships in public/models/. Swap for the real garment when it exists. */
export const DEFAULT_MODEL_SRC = "/models/cxa-hoodie-placeholder.glb";

/** Ships in public/hoodie-fallback/. Used for WebGL-fail / reduced-motion. */
export const DEFAULT_FALLBACK_IMAGE = "/hoodie-fallback/hoodie-front-1.png";
export const DEFAULT_FALLBACK_IMAGE_THREE_QUARTER =
  "/hoodie-fallback/hoodie-three-quarter.png";

/** Homepage demo branding -- tasteful default: chest logo + sleeve treatment. */
export const DEFAULT_HOMEPAGE_BRANDING = {
  leftChest: "/branding/cxa-logo-chest.png",
  leftSleeve: "/branding/cxa-logo-sleeve-vertical.png",
} satisfies Partial<Record<BrandingZoneKey, string>>;

/* ------------------------------------------------------------------ */
/* Rotation timeline                                                   */
/* ------------------------------------------------------------------ */

/**
 * The scroll narrative from the product spec, verbatim:
 *   0%   FRONT
 *   15%  LEFT_CHEST
 *   30%  LEFT_SLEEVE
 *   50%  FULL_BACK
 *   70%  RIGHT_SLEEVE
 *   85%  RIGHT_CHEST
 *   100% FRONT
 *
 * angleDeg is the garment's yaw (rotation around Y). 0deg = front facing
 * the camera, 180deg = back facing the camera. These are the "camera
 * blocking" angles a photographer would choose for each callout, not a
 * literal proportional mapping of progress -> degrees -- tune freely,
 * the interpolation between stops is always smooth.
 */
export const ROTATION_KEYFRAMES: RotationKeyframe[] = [
  { progress: 0.0, angleDeg: 0, position: "FRONT" },
  { progress: 0.15, angleDeg: 20, position: "LEFT_CHEST" },
  { progress: 0.3, angleDeg: 95, position: "LEFT_SLEEVE" },
  { progress: 0.5, angleDeg: 180, position: "FULL_BACK" },
  { progress: 0.7, angleDeg: 265, position: "RIGHT_SLEEVE" },
  { progress: 0.85, angleDeg: 340, position: "RIGHT_CHEST" },
  { progress: 1.0, angleDeg: 360, position: "FRONT" },
];

/** The static angle shown when reduced-motion is active. LEFT_CHEST reads
 *  as a strong three-quarter product shot without needing any animation. */
export const REDUCED_MOTION_ANGLE_DEG = 20;
export const REDUCED_MOTION_POSITION = "LEFT_CHEST" as const;

/** Frame-independent rotation smoothing (three.js MathUtils.damp lambda). */
export const DAMPING = {
  idle: 7,
  dragging: 16,
};

/* ------------------------------------------------------------------ */
/* Branding zones -> GLB anchors                                       */
/* ------------------------------------------------------------------ */

/**
 * Maps each configurable branding zone to the empty/anchor node it reads
 * its placement from, and the mesh node the decal projects onto. Both
 * node names are a contract with the GLB -- see hoodie-model-spec.md.
 * defaultScale is in the Decal component's scale units (meters, given
 * our 1-unit-=-1-meter garment scale).
 */
export const ZONE_ANCHOR_MAP: Record<BrandingZoneKey, ZoneAnchorMapping> = {
  leftChest: { anchorNode: "Anchor_LeftChest", targetMesh: "Body", defaultScale: 0.09 },
  rightChest: { anchorNode: "Anchor_RightChest", targetMesh: "Body", defaultScale: 0.09 },
  centreFront: { anchorNode: "Anchor_CentreFront", targetMesh: "Body", defaultScale: 0.14 },
  fullFront: { anchorNode: "Anchor_FullFront", targetMesh: "Body", defaultScale: 0.22 },
  upperBack: { anchorNode: "Anchor_UpperBack", targetMesh: "Body", defaultScale: 0.16 },
  fullBack: { anchorNode: "Anchor_FullBack", targetMesh: "Body", defaultScale: 0.24 },
  leftSleeve: { anchorNode: "Anchor_LeftSleeve", targetMesh: "Sleeve_L", defaultScale: 0.07 },
  rightSleeve: { anchorNode: "Anchor_RightSleeve", targetMesh: "Sleeve_R", defaultScale: 0.07 },
};

/* ------------------------------------------------------------------ */
/* Camera & lighting                                                   */
/* ------------------------------------------------------------------ */

export const CAMERA = {
  fov: 34,
  position: [0, 0.08, 2.5] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
  near: 0.1,
  far: 20,
};

/** Kept restrained on purpose -- see LIGHTING requirements in the spec:
 *  readable black fabric, no dramatic perspective, subtle rim only. */
export const LIGHTING = {
  keyIntensity: 1.35,
  keyPosition: [1.6, 2.2, 2.4] as [number, number, number],
  fillIntensity: 0.35,
  fillPosition: [-2.2, 0.6, 1.4] as [number, number, number],
  rimIntensity: 1.1,
  rimPosition: [-0.6, 1.6, -2.6] as [number, number, number],
  ambientIntensity: 0.22,
  environmentPreset: "studio" as const,
};

export const CONTACT_SHADOW = {
  position: [0, -0.42, 0] as [number, number, number],
  opacity: 0.55,
  blur: 2.4,
  scale: 2.2,
};

/* ------------------------------------------------------------------ */
/* Drag / keyboard interaction                                         */
/* ------------------------------------------------------------------ */

export const DRAG = {
  /** Degrees of rotation per 100px of horizontal pointer travel. */
  degreesPerPixel: 0.35,
  /** Inertia decay per frame once the pointer is released, 0..1. */
  inertiaDamping: 0.92,
  /** Below this angular velocity (deg/frame) inertia is considered stopped. */
  inertiaStopThreshold: 0.02,
};

export const KEYBOARD_STEP_DEG = 20;
