# CXA Visual Reference Package

## Purpose

This folder contains the approved visual direction and production assets for the CXA website.

CXA stands for **Custom X Apparel**, with the X representing “X marks the spot” for custom branding and print placement. These files give Codex a visual specification for style, layout, proportions, typography, spacing, colour balance, product presentation, customer experience, admin experience, and interaction direction.

The existing CXA application functionality and domain architecture remain authoritative.

## Folder structure

### `design-reference/`

Files here are **visual references only**. They show intended appearance, composition, and design direction.

Do not:

- Display reference images as website content.
- Use an entire reference as a page background.
- Crop reference sections into production assets.
- Treat concept text, prices, customer details, or products as application data.
- Recreate fake functionality or replace database-driven content with concept content.

Use the images to compare the implementation with the approved target.

### `production-assets/`

Only approved assets in this folder may be used by the live website. Do not generate replacement imagery or substitute unrelated stock photography. Empty folders mean that no approved individual production assets were available when this package was assembled.

## Core visual direction

CXA should feel **premium, modern, confident, apparel-focused, and custom**—closer to a premium apparel or streetwear brand than a generic ecommerce template. It should not feel like generic SaaS, gaming, crypto, developer tooling, a standard Shopify template, or a collection of generic cards.

Use deep black, charcoal, off-white/white, and warm CXA yellow. Yellow is an accent for primary actions, selected and active states, focus, workflow progress, and important highlights—not a general background or universal border colour.

Product photography should show real garment variety. The dark interface does not mean every garment should be black. Use real supplier/CXA colours and do not artificially recolour products. The black hero hoodie is a signature visual, not evidence that CXA sells only black clothing.

Use large confident editorial headings, strong hierarchy, tight headline spacing, readable body typography, and restrained uppercase eyebrow text. Do not apply condensed/Impact-style typography to all interface text.

## Homepage and hero

The homepage reference controls proportions, hero scale, navigation density, typography, section rhythm, spacing, product presentation, dark/yellow balance, and editorial character. Real CXA routes, catalogue data, products, brands, and functionality control the content.

The hero should feature a dominant garment, strong editorial headline, deep black background, controlled lighting and depth, restrained surrounding detail, yellow emphasis, and clear primary and secondary actions. Do not reduce the garment to an ordinary ecommerce product card.

## Hoodie rotation

The intended future interaction is a scroll-driven hoodie rotation:

1. Front
2. Three-quarter left
3. Left side
4. Back
5. Right side
6. Three-quarter right
7. Front

Useful branding positions include Left Chest, Right Chest, Left Sleeve, Right Sleeve, Full Back, and Centre Front.

Use individual assets from `production-assets/hero/` only when supplied. Do not pretend a single image is a true 360-degree rotation. If there are too few frames, use a graceful static or stepped presentation and document the missing assets. Provide reduced-motion and mobile fallbacks.

## Apparel, branding, and products

“Explore Our Apparel Range” should use real product/category imagery in an editorial layout and demonstrate real colour variety across T-shirts, polos, hoodies, jackets, workwear, headwear, bags, and merchandise.

Give Screen Printing, Embroidery, and DTF strong visual presence using approved imagery where available. Explain what each method is, what it suits, and typical applications; do not invent pricing.

Featured products must come from published CXA catalogue data. Show the product image, brand, CXA product name, colour count, supported decoration methods, and a Customise/View Product action. Customer pricing is not currently displayed.

## Customer and quote workflow

Product detail should feel like a custom-apparel workspace, prioritising imagery, colour, sizes and quantities, branding locations, decoration methods, artwork, configuration summary, and Add to Quote.

CXA uses a quote workflow, not ecommerce checkout: customers configure products, upload artwork, add configurations to the Quote Cart, and submit a quote request. No online payment is taken. Do not introduce checkout or payment language.

## Admin reference

The admin reference is visual only; implemented admin behaviour is authoritative. The admin should feel operational, premium, dark, clear, efficient, and consistent with the public brand, with dark navigation, yellow active states, strong quote headings, a clear workflow tracker, structured operational panels, artwork visibility, proofs, production jobs, purchase drafts, and recent activity.

Never fabricate concept data or weaken authentication, authorization, audit history, workflow gates, artwork/proof approval, supplier preparation, production controls, or purchase-draft controls.

## Visual fidelity, responsive design, and accessibility

Compare each relevant reference and current page at equivalent viewport sizes. Check composition, dimensions, typography, image scale, alignment, spacing, colour balance, section rhythm, navigation, CTA prominence, borders, and hierarchy. Make targeted changes and repeat until materially close.

Verify at 390px, 768px, 1024px, and 1440px. Recompose for smaller screens; do not merely shrink desktop. Prevent overflow, clipping, overlaps, tiny controls, and cut-off imagery.

Maintain keyboard navigation, visible focus, proper labels, semantic controls, heading hierarchy, sufficient contrast, reduced-motion support, and accessible selected states. Yellow must not be the only status signal.

## Functional and data integrity

Preserve existing CXA functionality, including Premium Apparel integration and sync, CXA catalogue publishing, customer-safe catalogue, search/filtering, product configuration, quote cart/submission, artwork uploads, proof approval, admin authentication, quote and production workflows, supplier requirements, purchase drafts, notifications, audit logging, rate limiting, and security controls.

Never expose supplier prices or raw data, exact supplier stock, supplier variant identifiers, credentials, admin-only data, internal notes, or storage keys.

## Final principle

The reference images define **how CXA should feel**. The application defines **how CXA actually works**. Bring them together without sacrificing visual quality or functional integrity.
