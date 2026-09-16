"use client";

import { useEffect, useState } from "react";

type Support = "checking" | "supported" | "unsupported";

/**
 * Cheap feature-detect for WebGL2/WebGL1 via a throwaway canvas -- no
 * three.js import required, so this can run before we've even decided
 * whether to load the (much heavier) R3F/three bundle.
 */
export function useWebGLSupport(): Support {
  const [support, setSupport] = useState<Support>("checking");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setSupport(gl ? "supported" : "unsupported");
    } catch {
      setSupport("unsupported");
    }
  }, []);

  return support;
}
