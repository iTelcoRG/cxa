"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type GarmentPreviewProps = { images: string[]; productName: string };
const placementLabels = ["LEFT CHEST", "CENTRE FRONT", "RIGHT SLEEVE", "FULL BACK"];

export function HoodieScrollExperience({ images, productName }: GarmentPreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const hasSequence = images.length > 1;

  useEffect(() => {
    if (!hasSequence) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 767px)").matches) return;
    let animationFrame = 0;
    const update = () => {
      animationFrame = 0;
      const element = rootRef.current;
      if (!element) return;
      const progress = Math.min(1, Math.max(0, -element.getBoundingClientRect().top / Math.max(1, element.offsetHeight - window.innerHeight)));
      setFrame(Math.round(progress * (images.length - 1)));
    };
    const onScroll = () => { if (!animationFrame) animationFrame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (animationFrame) window.cancelAnimationFrame(animationFrame); };
  }, [hasSequence, images.length]);

  const image = images[Math.min(frame, images.length - 1)];
  if (!image) return <div className="hero-placeholder">GARMENT PREVIEW</div>;
  return <div className="hoodie-scroll" data-sequence={hasSequence} ref={rootRef}><div className="hoodie-stage" data-frame={frame}>
    <div className="hoodie-orbit" aria-hidden="true" />
    <Image alt={productName} fill preload sizes="(max-width: 767px) 100vw, 58vw" src={image} unoptimized />
    <div className="hoodie-callout"><span>BRANDING POSITIONS</span><strong>{placementLabels[frame % placementLabels.length]}</strong></div>
    {hasSequence ? <div className="hoodie-progress" aria-label={`Garment view ${frame + 1} of ${images.length}`}>{images.map((item, index) => <i data-active={index === frame} key={`${item}-${index}`} />)}</div> : null}
    <p className="hoodie-asset-note">{hasSequence ? "Scroll to explore approved garment views" : "Static garment preview · approved rotation assets required"}</p>
  </div></div>;
}
