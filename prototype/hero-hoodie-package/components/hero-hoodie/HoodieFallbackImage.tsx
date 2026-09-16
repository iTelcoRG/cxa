"use client";

import Image from "next/image";
import { DEFAULT_FALLBACK_IMAGE } from "./hoodie-config";

interface Props {
  src?: string;
  alt?: string;
  priority?: boolean;
}

/**
 * The non-WebGL / model-load-failure / reduced-motion-without-JS-cost
 * escape hatch. Deliberately dumb: a single `next/image` filling its
 * parent, `priority` on by default since this is the above-the-fold
 * hero. Never leave the hero empty.
 */
export function HoodieFallbackImage({
  src = DEFAULT_FALLBACK_IMAGE,
  alt = "CXA black pullover hoodie, front view",
  priority = true,
}: Props) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 60vw"
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
