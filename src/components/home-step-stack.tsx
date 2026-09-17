"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function HomeStepStack({ children }: { children: ReactNode }) {
  const list = useRef<HTMLOListElement>(null);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const container = list.current;
    const header = document.querySelector(".site-header");
    if (!container || !header) return;
    const cards = Array.from(container.children);
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const available = window.innerHeight - header.getBoundingClientRect().height - 2 * rem;
      // Fall back to normal scrolling when zoom or a short screen would hide content.
      setSticky(cards.every((card, index) => card.getBoundingClientRect().height + index * 12 <= available));
    };
    const observer = new ResizeObserver(measure);
    cards.forEach(card => observer.observe(card));
    observer.observe(header);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return <ol ref={list} data-sticky={sticky}>{children}</ol>;
}
