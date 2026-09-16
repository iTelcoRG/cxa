"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { additionalBrandingTechniques, primaryBrandingTechniques, techniqueContactHref, type TechniqueDetail } from "../content/decoration-techniques.ts";
import { openTechniqueDialog, handleTechniqueDialogKey } from "./technique-dialog-behaviour.ts";
import { canStackCards } from "../content/branding-layout.ts";

export function BrandingGallery() {
  const stack = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);
  const [selected, setSelected] = useState<{ technique: TechniqueDetail; trigger: HTMLButtonElement } | null>(null);

  useEffect(() => {
    const container = stack.current;
    const header = document.querySelector(".site-header");
    if (!container || !header) return;
    const cards = Array.from(container.children);
    const measure = () => {
      const gap = parseFloat(getComputedStyle(container).getPropertyValue("--stack-gap"));
      setSticky(canStackCards(window.innerHeight, header.getBoundingClientRect().height, cards.map(card => card.getBoundingClientRect().height), gap));
    };
    const observer = new ResizeObserver(measure);
    cards.forEach(card => observer.observe(card));
    observer.observe(header);
    window.addEventListener("resize", measure);
    measure();
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  function view(technique: TechniqueDetail, button: HTMLButtonElement) {
    setSelected({ technique, trigger: button });
  }

  return <>
    <div className="branding-stack" ref={stack} data-sticky={sticky}>
      {primaryBrandingTechniques.map((technique, index) => <article className="branding-primary-card" id={technique.slug} key={technique.slug} style={{ zIndex: index + 1 }}>
        <div className="branding-primary-image"><Image src={technique.image.src} alt={technique.image.alt} fill sizes="(max-width: 700px) 94vw, 75vw" style={{ objectPosition: technique.position }} preload={index === 0}/></div>
        <div className="branding-primary-copy">
          <h2>{technique.title}</h2><strong>{technique.benefit}</strong>
          <p>{technique.description}</p><p>{technique.detail}</p>
          <button type="button" className="technique-view" aria-haspopup="dialog" onClick={event => view(technique, event.currentTarget)}>View technique <span aria-hidden="true">↗</span><span className="sr-only">: {technique.title}</span></button>
        </div>
      </article>)}
    </div>
    <section className="branding-specialist" id="other-techniques" aria-labelledby="other-techniques-title">
      <header><h2 id="other-techniques-title">Other techniques and finishes</h2><p>Explore specialist finishes and combinations as well as printing methods. These are possibilities to discuss, with availability and suitability confirmed for your project.</p></header>
      <div className="branding-image-grid">
        {additionalBrandingTechniques.map(technique => <article key={technique.slug}>
          <div className="branding-finish-image"><Image src={technique.image.src} alt={technique.image.alt} fill sizes="(max-width: 600px) 94vw, (max-width: 1100px) 46vw, 400px" style={{ objectPosition: technique.position }}/></div>
          <div className="branding-finish-copy"><h3>{technique.title}</h3><p>{technique.description}</p>
            <button type="button" className="technique-view" aria-haspopup="dialog" onClick={event => view(technique, event.currentTarget)}>View technique <span aria-hidden="true">↗</span><span className="sr-only">: {technique.title}</span></button>
          </div>
        </article>)}
      </div>
    </section>
    {selected && <TechniqueDialog technique={selected.technique} onClose={() => setSelected(null)} trigger={selected.trigger}/>}
  </>;
}

function TechniqueDialog({ technique, onClose, trigger }: { technique: TechniqueDetail; onClose: () => void; trigger: HTMLButtonElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    return openTechniqueDialog(element, trigger);
  }, [trigger]);
  return <dialog ref={dialog} className="technique-dialog" aria-modal="true" aria-labelledby="technique-dialog-title" onKeyDown={event => handleTechniqueDialogKey(event, onClose)} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <button className="technique-close" type="button" aria-label="Close technique details" onClick={onClose}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    <div className="technique-dialog-image"><Image src={technique.image.src} alt={technique.image.alt} fill sizes="(max-width: 768px) 94vw, 760px" style={{ objectPosition: technique.position }}/></div>
    <div className="technique-dialog-copy"><h2 id="technique-dialog-title">{technique.title}</h2><h3>Best for</h3><p>{technique.bestFor}</p><Link className="primary-button" href={techniqueContactHref(technique.slug)}>Ask about this technique</Link></div>
  </dialog>;
}
