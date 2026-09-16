/**
 * hoodie-types.ts
 *
 * All public types for <HeroHoodie />. Keep this file free of any
 * three.js / R3F imports so it can be safely imported from server
 * components (e.g. to type a prop being passed down) without pulling
 * WebGL code into the server bundle.
 */

/**
 * The 8 independently-brandable regions on the garment.
 * This is the surface area a piece of artwork can be projected onto.
 * It intentionally has MORE members than `ScrollPosition` below --
 * CENTRE_FRONT / FULL_FRONT / UPPER_BACK exist as branding real-estate
 * even though the default homepage scroll narrative doesn't stop on them.
 */
export type BrandingZoneKey =
  | "leftChest"
  | "rightChest"
  | "centreFront"
  | "fullFront"
  | "upperBack"
  | "fullBack"
  | "leftSleeve"
  | "rightSleeve";

/**
 * The 6 "storytelling" angles the homepage scroll experience steps
 * through (plus FRONT as both the start and the loop-back end). This is
 * intentionally a narrower set than BrandingZoneKey -- it's a camera/
 * rotation vocabulary, not a branding-zone vocabulary. Matches the exact
 * list given in the product spec's BRANDING CALLOUTS section.
 */
export type ScrollPosition =
  | "FRONT"
  | "LEFT_CHEST"
  | "LEFT_SLEEVE"
  | "FULL_BACK"
  | "RIGHT_SLEEVE"
  | "RIGHT_CHEST";

/** One piece of artwork placed into a branding zone. */
export interface BrandingAsset {
  /** URL of the artwork (transparent PNG/WebP recommended). */
  src: string;
  /** Uniform scale multiplier relative to the zone's default size. Default 1. */
  scale?: number;
  /** Rotation of the artwork on the garment surface, in degrees. Default 0. */
  rotationDeg?: number;
  /** Fine position nudge in meters, [right, up]. Default [0, 0]. */
  offset?: [number, number];
}

/**
 * Branding for the hero instance. Each key is optional -- an omitted
 * zone simply renders no artwork. A bare string is shorthand for
 * `{ src: string }`.
 *
 *   branding={{ leftChest: "/branding/cxa-logo-chest.png" }}
 */
export type BrandingConfig = Partial<
  Record<BrandingZoneKey, BrandingAsset | string>
>;

/** Imperative handle exposed via `controllerRef`. */
export interface HeroHoodieController {
  /** Animate (or snap) to a named scroll position. */
  goToPosition: (position: ScrollPosition, opts?: { animate?: boolean }) => void;
  /** Step to the next position in the scroll narrative. */
  next: () => void;
  /** Step to the previous position in the scroll narrative. */
  previous: () => void;
  /**
   * High-frequency, zero-React-render rotation update. Prefer this over
   * the `rotationProgress` prop when driving rotation from a scroll or
   * rAF loop -- it writes directly into the render loop's rotation ref
   * instead of round-tripping through React state on every pixel of
   * scroll. progress is clamped to [0, 1].
   */
  setRotationProgress: (progress: number) => void;
  /** The currently-active scroll position, read imperatively. */
  getActivePosition: () => ScrollPosition;
}

export interface HeroHoodieProps {
  className?: string;

  /** Artwork to project onto the garment's branding zones. */
  branding?: BrandingConfig;

  /**
   * Controlled rotation, 0..1, typically derived from how far the hero
   * section has scrolled through the viewport. This is React-state
   * driven and fine for most cases; for pixel-perfect scroll-linked
   * rotation with zero re-render overhead, drive rotation via
   * `controllerRef.current.setRotationProgress()` in a scroll/rAF
   * listener instead (see example/HomepageExample.tsx). If both are
   * used, imperative calls win until the prop value next changes.
   */
  rotationProgress?: number;

  /** Allow pointer/touch drag-to-rotate. Default true. */
  interactive?: boolean;

  /** Show the built-in previous/next buttons. Default true. */
  showControls?: boolean;

  /** Show a soft contact shadow under the garment. Default true. */
  showShadow?: boolean;

  /** Called whenever the nearest named scroll position changes. */
  onPositionChange?: (position: ScrollPosition) => void;

  /**
   * Force reduced-motion behaviour regardless of the OS setting -- e.g.
   * to let the host page's own settings UI override it. When omitted,
   * `prefers-reduced-motion` is honoured automatically.
   */
  reducedMotion?: boolean;

  /** Path to the production GLB. Defaults to the shipped dev placeholder. */
  modelSrc?: string;

  /**
   * Static image used when WebGL is unavailable, the model fails to
   * load, or reduced motion is active. Defaults to the shipped front
   * hero photograph.
   */
  fallbackImageSrc?: string;

  /** Imperative controller handle -- see HeroHoodieController. */
  controllerRef?: React.Ref<HeroHoodieController>;

  /** Accessible label for the canvas region. */
  ariaLabel?: string;
}

/** Internal: a single stop in the rotation/position timeline. */
export interface RotationKeyframe {
  /** 0..1, matches HeroHoodieProps.rotationProgress. */
  progress: number;
  /** Garment yaw at this stop, in degrees, 0 = FRONT. */
  angleDeg: number;
  position: ScrollPosition;
}

/** Internal: where a branding zone's artwork attaches in the GLB. */
export interface ZoneAnchorMapping {
  /** Name of the empty/anchor node in the GLB, e.g. "Anchor_LeftChest". */
  anchorNode: string;
  /** Name of the mesh node the decal projects onto, e.g. "Body". */
  targetMesh: string;
  /** Sensible default decal scale (meters-ish, tuned per zone). */
  defaultScale: number;
}
