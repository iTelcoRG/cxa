"use client";

/**
 * example/HomepageExample.tsx
 *
 * NOT part of the component package -- this is a reference showing how
 * the CXA homepage would wire <HeroHoodie /> into a scroll-driven hero
 * section. Copy whichever parts are useful into the real homepage; this
 * file is not imported by the component itself.
 *
 * Two integration styles are shown:
 *
 *   1. React-state driven (`rotationProgress` prop) -- simplest, fine
 *      for most sites. Re-renders HeroHoodie on scroll.
 *
 *   2. Imperative rAF-driven (`controllerRef.setRotationProgress`) --
 *      zero React re-renders on scroll, recommended if the hero section
 *      is sharing the page with other scroll-linked animation and you
 *      want to keep everything on one rAF tick. This is the pattern to
 *      reach for if profiling shows scroll jank from approach 1.
 */
import { useEffect, useRef, useState } from "react";
import { HeroHoodie } from "../components/hero-hoodie";
import type { HeroHoodieController, ScrollPosition } from "../components/hero-hoodie";

const POSITION_COPY: Record<ScrollPosition, { title: string; body: string }> = {
  FRONT: { title: "The CXA Hoodie", body: "Heavyweight cotton fleece. Built to last." },
  LEFT_CHEST: { title: "Left Chest", body: "Subtle embroidered mark for everyday wear." },
  LEFT_SLEEVE: { title: "Left Sleeve", body: "Vertical CXA treatment down the arm." },
  FULL_BACK: { title: "Full Back", body: "Reserved for your boldest print placement." },
  RIGHT_SLEEVE: { title: "Right Sleeve", body: "Mirror the left, or make it independent." },
  RIGHT_CHEST: { title: "Right Chest", body: "A second placement for team or sponsor marks." },
};

/** Approach 1: React state + prop. Simple, correct, fine for most pages. */
export function HomepageHeroSectionSimple() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activePosition, setActivePosition] = useState<ScrollPosition>("FRONT");

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      setProgress(total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const copy = POSITION_COPY[activePosition];

  return (
    // This section is tall on purpose -- its scrollable height IS the
    // "track" the rotation plays out over. 300vh ~= a comfortable scrub.
    <div ref={sectionRef} style={{ height: "300vh", position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          background: "#0a0a0a",
        }}
      >
        <div style={{ padding: "0 48px", color: "#fff" }}>
          <h2 style={{ fontSize: 40, marginBottom: 12 }}>{copy.title}</h2>
          <p style={{ opacity: 0.7 }}>{copy.body}</p>
        </div>
        <div style={{ height: "80vh" }}>
          <HeroHoodie rotationProgress={progress} onPositionChange={setActivePosition} />
        </div>
      </div>
    </div>
  );
}

/** Approach 2: imperative, zero-re-render scroll updates via rAF. */
export function HomepageHeroSectionImperative() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HeroHoodieController>(null);
  const [activePosition, setActivePosition] = useState<ScrollPosition>("FRONT");
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const el = sectionRef.current;
      if (el && controllerRef.current) {
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const scrolled = -rect.top;
        const progress = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
        controllerRef.current.setRotationProgress(progress);
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const copy = POSITION_COPY[activePosition];

  return (
    <div ref={sectionRef} style={{ height: "300vh", position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "center",
          background: "#0a0a0a",
        }}
      >
        <div style={{ padding: "0 48px", color: "#fff" }}>
          <h2 style={{ fontSize: 40, marginBottom: 12 }}>{copy.title}</h2>
          <p style={{ opacity: 0.7 }}>{copy.body}</p>
        </div>
        <div style={{ height: "80vh" }}>
          <HeroHoodie controllerRef={controllerRef} onPositionChange={setActivePosition} />
        </div>
      </div>
    </div>
  );
}
