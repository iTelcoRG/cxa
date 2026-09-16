"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
export interface HeroSlide { description: string; eyebrow: string; headline: string; image: string; }
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  if (!slide) return null;
  const move = (direction: number) => setCurrent((current + direction + slides.length) % slides.length);
  return <section aria-label="Featured campaigns" aria-roledescription="carousel" className="hero-slider">
    <div className="hero-slide"><Image alt={slide.headline} fill priority sizes="(max-width: 900px) 100vw, 50vw" src={slide.image} unoptimized /><div className="hero-slide-overlay"><h2>{slide.headline}</h2><span>{slide.description}</span><Link href="/products">Explore the range <span aria-hidden="true">→</span></Link></div></div>
    {slides.length > 1 ? <div className="slider-controls"><button aria-label="Previous campaign" onClick={() => move(-1)} type="button">←</button><div>{slides.map((item, index) => <button aria-label={`Show ${item.headline}`} aria-pressed={index === current} key={item.headline} onClick={() => setCurrent(index)} type="button" />)}</div><button aria-label="Next campaign" onClick={() => move(1)} type="button">→</button></div> : null}
  </section>;
}
