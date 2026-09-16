"use client";

import { Suspense } from "react";
import { useTexture, Decal } from "@react-three/drei";
import type * as THREE from "three";
import type { BrandingAsset } from "./hoodie-types";

/**
 * `scene.getObjectByName()` (used in HoodieModel to resolve each zone's
 * target mesh) is typed by three.js as returning a plain `Object3D`, since
 * it can't statically know a given name resolves to a Mesh -- at runtime,
 * for every name in ZONE_ANCHOR_MAP it always does (they're GLB mesh
 * nodes). This narrows the ref type at the one spot drei's `<Decal mesh>`
 * prop requires it, instead of reaching for `any`.
 */
function asMeshRef(
  ref: React.MutableRefObject<THREE.Mesh | THREE.Object3D | null>
): React.RefObject<THREE.Mesh> {
  return ref as unknown as React.RefObject<THREE.Mesh>;
}

interface Props {
  meshRef: React.MutableRefObject<THREE.Mesh | THREE.Object3D | null>;
  /** Local-space position relative to the target mesh, from HoodieModel's anchor resolution. */
  position: [number, number, number];
  /** Local-space rotation (radians) relative to the target mesh. */
  rotation: [number, number, number];
  /** Zone's tuned default scale, before the per-asset `scale` multiplier. */
  baseScale: number;
  asset: BrandingAsset;
}

function DecalTexture({
  meshRef,
  position,
  rotation,
  baseScale,
  asset,
}: Props) {
  const texture = useTexture(asset.src);
  const scale = baseScale * (asset.scale ?? 1);
  const [offX = 0, offY = 0] = asset.offset ?? [];
  const rotZ = rotation[2] + ((asset.rotationDeg ?? 0) * Math.PI) / 180;

  return (
    <Decal
      mesh={asMeshRef(meshRef)}
      position={[position[0] + offX, position[1] + offY, position[2]]}
      rotation={[rotation[0], rotation[1], rotZ]}
      scale={scale}
    >
      <meshStandardMaterial
        map={texture}
        transparent
        polygonOffset
        polygonOffsetFactor={-4}
        roughness={0.55}
        metalness={0}
      />
    </Decal>
  );
}

/**
 * Suspense boundary per-decal so one slow/missing branding asset can't
 * block the other zones (or the base garment) from rendering.
 */
export function BrandingDecal(props: Props) {
  if (!props.meshRef.current) return null;
  return (
    <Suspense fallback={null}>
      <DecalTexture {...props} />
    </Suspense>
  );
}
