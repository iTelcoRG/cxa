"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BrandingDecal } from "./BrandingDecal";
import { DAMPING, DRAG, ZONE_ANCHOR_MAP } from "./hoodie-config";
import { dampAngleDeg, nearestPositionForAngle } from "./hoodie-math";
import type { BrandingConfig, BrandingZoneKey, ScrollPosition } from "./hoodie-types";
import type { RotationState } from "./useHoodieRotation";

interface Props {
  modelSrc: string;
  branding: BrandingConfig;
  rotationState: React.MutableRefObject<RotationState>;
  onActivePositionChange?: (position: ScrollPosition) => void;
  groupRef: React.MutableRefObject<THREE.Group | null>;
}

interface ZoneTransform {
  meshRef: React.MutableRefObject<THREE.Object3D | null>;
  position: [number, number, number];
  rotation: [number, number, number];
}

/** World-space anchor transform, expressed relative to its target mesh's
 *  local space -- this is what Decal expects when targeting a mesh via
 *  the `mesh` ref prop rather than JSX nesting. Works regardless of
 *  whether the GLB bakes zone placement into node transforms or vertex
 *  data, because it always reads the live world matrices. */
function resolveZoneTransform(
  scene: THREE.Object3D,
  anchorNode: string,
  targetMesh: string
): ZoneTransform | null {
  const anchor = scene.getObjectByName(anchorNode);
  const mesh = scene.getObjectByName(targetMesh);
  if (!anchor || !mesh) return null;

  anchor.updateWorldMatrix(true, false);
  mesh.updateWorldMatrix(true, false);

  const worldPos = new THREE.Vector3();
  anchor.getWorldPosition(worldPos);
  const worldQuat = new THREE.Quaternion();
  anchor.getWorldQuaternion(worldQuat);

  const meshWorldQuat = new THREE.Quaternion();
  mesh.getWorldQuaternion(meshWorldQuat);

  const localPos = mesh.worldToLocal(worldPos.clone());
  const localQuat = meshWorldQuat.clone().invert().multiply(worldQuat);
  const localEuler = new THREE.Euler().setFromQuaternion(localQuat);

  const meshRef: React.MutableRefObject<THREE.Object3D | null> = { current: mesh };

  return {
    meshRef,
    position: [localPos.x, localPos.y, localPos.z],
    rotation: [localEuler.x, localEuler.y, localEuler.z],
  };
}

export function HoodieModel({
  modelSrc,
  branding,
  rotationState,
  onActivePositionChange,
  groupRef,
}: Props) {
  const { scene } = useGLTF(modelSrc);

  // Resolve every configured branding zone's placement once the GLB is
  // in hand. Re-resolved if the model or branding config changes.
  const zoneTransforms = useMemo(() => {
    const result: Partial<Record<BrandingZoneKey, ZoneTransform>> = {};
    for (const key of Object.keys(branding) as BrandingZoneKey[]) {
      const mapping = ZONE_ANCHOR_MAP[key];
      if (!mapping) continue;
      const resolved = resolveZoneTransform(scene, mapping.anchorNode, mapping.targetMesh);
      if (resolved) result[key] = resolved;
      else if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          `[HeroHoodie] Branding zone "${key}" could not be placed: ` +
            `node "${mapping.anchorNode}" or "${mapping.targetMesh}" not found in ${modelSrc}. ` +
            `Check the GLB against hoodie-model-spec.md's node-naming contract.`
        );
      }
    }
    return result;
  }, [scene, branding, modelSrc]);

  const lastPosition = useRef<ScrollPosition>("FRONT");

  useFrame((_, delta) => {
    const rs = rotationState.current;

    // Inertia: only applies once the pointer has been released.
    if (!rs.dragging && Math.abs(rs.velocity) > DRAG.inertiaStopThreshold) {
      rs.target += rs.velocity;
      rs.velocity *= DRAG.inertiaDamping;
    } else if (!rs.dragging) {
      rs.velocity = 0;
    }

    const lambda = rs.dragging ? DAMPING.dragging : DAMPING.idle;
    rs.current = dampAngleDeg(rs.current, rs.target, lambda, Math.min(delta, 0.1));

    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(rs.current);
    }

    const activePosition = nearestPositionForAngle(rs.target);
    if (activePosition !== lastPosition.current) {
      lastPosition.current = activePosition;
      onActivePositionChange?.(activePosition);
    }
  });

  useEffect(() => {
    return () => {
      // Release cached GLTF/texture GPU memory when this hero instance unmounts.
      useGLTF.clear(modelSrc);
    };
  }, [modelSrc]);

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} />
      {(Object.keys(zoneTransforms) as BrandingZoneKey[]).map((key) => {
        const transform = zoneTransforms[key];
        const assetRaw = branding[key];
        if (!transform || !assetRaw) return null;
        const asset = typeof assetRaw === "string" ? { src: assetRaw } : assetRaw;
        const baseScale = ZONE_ANCHOR_MAP[key].defaultScale;
        return (
          <BrandingDecal
            key={key}
            meshRef={transform.meshRef}
            position={transform.position}
            rotation={transform.rotation}
            baseScale={baseScale}
            asset={asset}
          />
        );
      })}
    </group>
  );
}
