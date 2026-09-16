import Image from "next/image";
import Link from "next/link";
import type { DecorationTechnique } from "../content/decoration-techniques.ts";

export function DecorationTechniqueCard({ technique, detailed = false }: { technique: DecorationTechnique; detailed?: boolean }) {
  const Heading = detailed ? "h2" : "h3";
  return <article className="decoration-card" data-technique={technique.slug} data-has-image={Boolean(technique.image)} id={detailed ? technique.slug : undefined}>
    {technique.image && <div className="decoration-card-image">
      <Image src={technique.image.src} alt={technique.image.alt} fill sizes="(max-width: 760px) 100vw, (max-width: 1200px) 70vw, 30vw" />
    </div>}
    <div className="decoration-card-copy">
      <Heading>{technique.title}</Heading>
      <strong>{technique.benefit}</strong>
      <p>{detailed ? technique.detail : technique.summary}</p>
      <Link className="text-link" href={detailed ? "/contact" : `/printing-embroidery#${technique.slug}`} aria-label={detailed ? `Enquire about ${technique.title}` : `Explore ${technique.title}`}>
        {detailed ? "Enquire with CXA" : "Explore branding"} <span aria-hidden="true">↗</span>
      </Link>
    </div>
  </article>;
}
