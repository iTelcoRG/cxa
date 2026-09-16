export type DecorationTechnique = {
  slug: string;
  title: string;
  benefit: string;
  summary: string;
  detail: string;
  image?: { src: string; alt: string };
};

export const featuredTechniques: readonly DecorationTechnique[] = [
  {
    slug: "screen-printing",
    title: "Screen printing",
    image: { src: "/images/decoration/screen-printing-squeegee.jpg", alt: "Squeegee pulling yellow ink across a printing screen" },
    benefit: "Bold colour. Lasting impact.",
    summary: "Crisp, durable graphics for teamwear, events and repeated designs.",
    detail: "Ink is applied through a prepared screen, building a design colour by colour. Bold logos and repeat graphics are a strong starting point. Front, back, chest and sleeve placements may be possible, depending on the garment and artwork.",
  },
  {
    slug: "embroidery",
    title: "Embroidery",
    benefit: "Detail you can feel.",
    summary: "Textured stitched branding for polos, caps and workwear.",
    detail: "Thread brings a logo to life with a textured, dimensional finish. Polos, caps, jackets and workwear are popular starting points. Very small lettering and fine artwork may need simplifying to stitch clearly.",
    image: { src: "/images/decoration/embroidery-machine.png", alt: "Embroidery machine stitching yellow and white thread into dark fabric" },
  },
  {
    slug: "heat-transfer",
    title: "Heat transfer",
    image: { src: "/images/decoration/heat-transfer-peel.jpg", alt: "Carrier film being peeled from a yellow and white design on a dark garment" },
    benefit: "Your colour. Every detail.",
    summary: "Heat-applied graphics for detailed artwork and personalised apparel.",
    detail: "A prepared design is bonded to the garment using heat and pressure. This family includes direct-to-film (DTF), which can suit detailed, full-colour artwork and shorter runs. The transfer type, fabric and placement all affect the result; CXA will confirm the suitable option.",
  },
];

export const specialistFinishes = [
  { slug: "dtg-printing", title: "DTG printing", description: "Ink is printed directly onto fabric for detailed, multicolour artwork. Consider it for illustrated tees on suitable fabrics; ask us to assess your garment and design." },
  { slug: "sublimation", title: "Sublimation", description: "Colour becomes part of suitable polyester fabric, without a raised print layer. It may suit colourful sportswear graphics; enquire with your garment choice and artwork." },
  { slug: "discharge-printing", title: "Discharge printing", description: "A process that removes dye from compatible fabric to create a soft print. It may suit a worn-in tee aesthetic; ask us to check the fabric and dye first." },
  { slug: "hot-split-transfer", title: "Hot-split transfer printing", description: "A transfer released while hot can leave a softer ink finish. It may suit repeated logos or lettering; enquire about the right transfer and garment combination." },
  { slug: "reflective-printing", title: "Reflective printing", description: "Reflective elements catch direct light and add contrast to simple graphics. Ask about a logo accent; a decorative finish alone does not establish safety certification." },
  { slug: "applique-embroidery", title: "Appliqué and embroidery", description: "Fabric shapes are stitched down and finished with embroidery for layered texture. Consider bold lettering on fleece; send us your design to discuss the construction." },
  { slug: "foil-printing", title: "Foil printing", description: "Foil adds a metallic sheen to selected areas of a design. It may suit statement logos or merchandise; ask us to review the artwork and fabric." },
  { slug: "puff-printing", title: "Puff printing", description: "Expanding ink creates a raised, rounded surface. Bold lettering and simple shapes are useful starting points; enquire about the detail and garment you have in mind." },
  { slug: "glitter-printing", title: "Glitter printing", description: "A sparkling finish brings light-catching detail to graphics. It may suit event apparel or accent areas; ask us which finish fits your artwork and fabric." },
  { slug: "distressed-clear-ink", title: "Distressed and clear ink", description: "Distressed artwork gives a worn appearance; clear ink can add a subtle sheen. Explore either for tonal or vintage graphics, and ask us to check the effect." },
  { slug: "neon-colours", title: "Neon colours", description: "Fluorescent colour creates a bright, high-impact accent. It may suit bold event graphics; enquire about colour, underbase and fabric before settling on the design." },
  { slug: "mixed-techniques", title: "Mixed techniques", description: "Combine print, stitching or other finishes for contrasting surfaces and depth. Share your concept with us to work out which layers and placements can work together." },
] as const;


// Shared by the Branding gallery, dialog and validated Contact enquiries.
const techniqueDetails: Record<string, { bestFor: string; position: string }> = {
  "screen-printing": {
    "bestFor": "Larger runs, bold solid-colour artwork, T-shirts, hoodies and workwear",
    "position": "85% 48%"
  },
  "embroidery": {
    "bestFor": "Polos, caps, jackets, workwear and premium logo applications",
    "position": "78% 48%"
  },
  "heat-transfer": {
    "bestFor": "Small runs, names, numbers, detailed artwork and performance garments",
    "position": "85% 45%"
  },
  "dtg-printing": {
    "bestFor": "Detailed full-colour artwork, short runs and cotton garments",
    "position": "50% 50%"
  },
  "sublimation": {
    "bestFor": "Polyester sportswear, vibrant designs and large-area decoration",
    "position": "50% 50%"
  },
  "discharge-printing": {
    "bestFor": "Soft-hand prints, vintage effects and dark cotton garments",
    "position": "50% 50%"
  },
  "hot-split-transfer": {
    "bestFor": "Fine detail, smooth lightweight finishes and short-to-medium runs",
    "position": "50% 50%"
  },
  "reflective-printing": {
    "bestFor": "Workwear, safety apparel, activewear and low-light visibility",
    "position": "50% 50%"
  },
  "applique-embroidery": {
    "bestFor": "Varsity styling, sportswear, hoodies, jackets and large bold designs",
    "position": "50% 50%"
  },
  "foil-printing": {
    "bestFor": "Fashion apparel, promotional pieces and reflective statement details",
    "position": "50% 50%"
  },
  "puff-printing": {
    "bestFor": "Dimensional logos, streetwear and heavyweight cotton garments",
    "position": "50% 50%"
  },
  "glitter-printing": {
    "bestFor": "Event apparel, dancewear, teamwear and decorative statement designs",
    "position": "50% 50%"
  },
  "distressed-clear-ink": {
    "bestFor": "Vintage textures, tonal effects, T-shirts and sweatshirts",
    "position": "50% 50%"
  },
  "neon-colours": {
    "bestFor": "Events, promotions, dark garments and high-impact artwork",
    "position": "50% 50%"
  },
  "mixed-techniques": {
    "bestFor": "Premium apparel, limited releases and layered statement designs",
    "position": "50% 50%"
  }
};

export type TechniqueDetail = {
  slug: string; title: string; description: string; benefit?: string; detail?: string;
  image: { src: string; alt: string }; bestFor: string; position: string;
};
export const primaryBrandingTechniques: TechniqueDetail[] = featuredTechniques.map(item => ({
  ...item, description: item.summary, image: item.image!, ...techniqueDetails[item.slug],
}));
export const additionalBrandingTechniques: TechniqueDetail[] = specialistFinishes.map(item => ({
  ...item, image: { src: '/images/decoration/' + item.slug + '.jpg', alt: item.title + ' detail on apparel' }, ...techniqueDetails[item.slug],
}));
export const allBrandingTechniques = [...primaryBrandingTechniques, ...additionalBrandingTechniques];
export function findTechnique(value: unknown): TechniqueDetail | undefined {
  return typeof value === 'string' ? allBrandingTechniques.find(item => item.slug === value) : undefined;
}
export function techniqueContactHref(slug: string): string {
  return findTechnique(slug) ? '/contact?technique=' + encodeURIComponent(slug) + '#contact-form' : '/contact#contact-form';
}
