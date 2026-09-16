"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, PerspectiveCamera } from "@react-three/drei";
import type * as THREE from "three";
import { HoodieModel } from "./HoodieModel";
import { CAMERA, CONTACT_SHADOW, LIGHTING } from "./hoodie-config";
import type { BrandingConfig, ScrollPosition } from "./hoodie-types";
import type { RotationState } from "./useHoodieRotation";

interface Props {
  modelSrc: string;
  branding: BrandingConfig;
  rotationState: React.MutableRefObject<RotationState>;
  onActivePositionChange?: (position: ScrollPosition) => void;
  showShadow: boolean;
}

/**
 * Everything WebGL-shaped lives in this file so it's the single thing
 * that ever needs to be dynamically imported with `ssr: false`. Camera
 * is a fixed, restrained product-photography framing (see CAMERA /
 * LIGHTING in hoodie-config.ts) -- no orbit controls, no dramatic FOV,
 * per the spec's CAMERA requirements.
 */
export function HeroHoodieCanvas({
  modelSrc,
  branding,
  rotationState,
  onActivePositionChange,
  showShadow,
}: Props) {
  const groupRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
      // Accessibility label lives on the persistent outer wrapper in
      // HeroHoodie.tsx (present in every state: loading/canvas/fallback),
      // not here, to avoid a nested role="img" only some states render.
      aria-hidden
    >
      <PerspectiveCamera
        makeDefault
        fov={CAMERA.fov}
        position={CAMERA.position}
        near={CAMERA.near}
        far={CAMERA.far}
      />

      <ambientLight intensity={LIGHTING.ambientIntensity} />
      <directionalLight position={LIGHTING.keyPosition} intensity={LIGHTING.keyIntensity} />
      <directionalLight position={LIGHTING.fillPosition} intensity={LIGHTING.fillIntensity} />
      <directionalLight position={LIGHTING.rimPosition} intensity={LIGHTING.rimIntensity} />
      {/* background=false: contributes PBR reflections/lighting only, the
          canvas itself stays transparent so the host page's own dark
          environment shows through, per the BACKGROUND requirement. */}
      <Environment preset={LIGHTING.environmentPreset} background={false} />

      <Suspense fallback={null}>
        <HoodieModel
          modelSrc={modelSrc}
          branding={branding}
          rotationState={rotationState}
          onActivePositionChange={onActivePositionChange}
          groupRef={groupRef}
        />
      </Suspense>

      {showShadow && (
        <ContactShadows
          position={CONTACT_SHADOW.position}
          opacity={CONTACT_SHADOW.opacity}
          blur={CONTACT_SHADOW.blur}
          scale={CONTACT_SHADOW.scale}
          far={2}
          frames={1}
        />
      )}
    </Canvas>
  );
}
