# P48 — Branding gallery and Contact enquiry

Preview: http://localhost:3000/printing-embroidery (port 3000).
Contact: http://localhost:3000/contact?technique=dtg-printing#contact-form.
Changes remain uncommitted.

## Implementation

- Removed the introduction's jump pills and the trailing artwork section to follow the requested page sequence. Preserved the H1, introduction, suitability explanation, primary technique copy and twelve finish descriptions.
- Added a Branding-only gallery. Homepage service cards and their component remain unchanged.
- Three primary cards use CSS sticky, z-index 1–3 and the measured shared `--cxa-header-height` plus 16px. A ResizeObserver checks all complete card heights and the header; window resize is the only window event used. Stacking is enabled only when every card fits with 16px above and below. Short screens and enlarged content fall back to document flow. Keyboard focus also puts the stack into document flow so focused content cannot be covered. There is no scroll listener or optional transform animation.
- Twelve additional cards use a normal-flow 3/2/1-column grid, reserved 3:2 photographic areas, separate text surfaces and bottom-aligned semantic View technique buttons.
- All fifteen techniques share image, Best for, title and stable slug data. The primary images retain individual focal positions; the new 3:2 photographs fit the additional cards without dark overlays.
- Native modal dialogs provide the top layer and inert background. Explicit Tab wrapping, Escape, close and backdrop dismissal, labelled title, aria-modal, exact-trigger focus restoration, body scroll locking and scrollbar compensation are implemented. Mobile panels scroll internally and retain a sticky 44px close control.
- Contact validates its query parameter against the central technique list. The editable select can be cleared, stays selected after validation/delivery failure, and is included by human-readable name in the staff enquiry email. Repeated or unknown query values select nothing.
- Added a real server-side SMTP enquiry endpoint using the existing SMTP settings and staff mailbox (`CXA_QUOTE_NOTIFICATION_EMAIL`). It uses the existing persistent eight-per-ten-minute policy with a separate contact identifier, a honeypot, bounded request body, field validation and cross-origin rejection. Delivery must succeed before showing success; enquiries do not create supplier orders or modify quotes.

## Files changed in this task

- `src/app/printing-embroidery/page.tsx`
- `src/app/printing-embroidery/branding.css`
- `src/components/branding-gallery.tsx`
- `src/components/technique-dialog-behaviour.ts`
- `src/content/decoration-techniques.ts`
- `src/content/branding-layout.ts`
- `src/app/contact/page.tsx`
- `src/app/contact/contact.css`
- `src/components/contact-enquiry-form.tsx`
- `src/app/api/contact/route.ts`
- `src/contact/enquiry.ts`
- `src/contact/delivery.ts`
- `tests/branding-enquiry.test.ts`
- `tests/technique-dialog.test.ts`
- This verification report.
- Twelve byte-identical copies of the supplied photographs, from `public/images/` into `public/images/decoration/`. Originals are preserved.

## Image mappings

All paths below are relative to `public/images/decoration/`. Cards and dialogs use the same file.

| Technique | File |
| --- | --- |
| Screen printing | screen-printing-squeegee.jpg (existing) |
| Embroidery | embroidery-machine.png (existing) |
| Heat transfer | heat-transfer-peel.jpg (existing) |
| DTG printing | dtg-printing.jpg |
| Sublimation | sublimation.jpg |
| Discharge printing | discharge-printing.jpg |
| Hot-split transfer printing | hot-split-transfer.jpg |
| Reflective printing | reflective-printing.jpg |
| Appliqué and embroidery | applique-embroidery.jpg |
| Foil printing | foil-printing.jpg |
| Puff printing | puff-printing.jpg |
| Glitter printing | glitter-printing.jpg |
| Distressed and clear ink | distressed-clear-ink.jpg |
| Neon colours | neon-colours.jpg |
| Mixed techniques | mixed-techniques.jpg |

## Verification

Browser inspection covered both pages at 320, 375, 390, 430, 768, 1024, 1440 and 1920px. Each page retained one H1; no horizontal overflow was found. Header dimensions remained 72.8px at mobile/tablet and 96.8px at desktop under normal text sizing. Existing header, footer, homepage, Create Your Brand and Quote Cart components were not edited.

Stack measurements: enabled at 375×812, 390×844, 430×932, 768×1024, 1024×900, 1440×900 and 1920×1080; normal-flow fallback at 320×568 and 1440×600. At 1440×900, pinned cards began at 112.8px below a 96.8px header. The third card released with the stack and the additional section continued in normal flow.

Both pages were checked at 200% root and body text at mobile and desktop sizes. No horizontal overflow; stacking disabled for enlarged cards. The enlarged dialog's action remained keyboard reachable through its own scrolling and the close control remained visible. Temporary enlargement CSS was removed.

Browser checks passed for all fifteen loaded images, all twelve additional modal titles/Best for content/Contact destinations, the three primary dialogs, Tab and Shift+Tab wrapping, Escape, close and backdrop dismissal, exact trigger focus restoration, background locking and restoration after navigation. Modal opening produced no visible gutter shift (subpixel rounding of 0.1px). Keyboard navigation through primary actions exposed the focused card in normal flow.

HTTP checks passed for all fifteen Contact query preselection mappings, three unknown/injected/repeated query cases, cross-origin rejection and invalid enquiry payloads. Browser checks confirmed editable/clearable preselection, anchor visibility and retention of entered details on actual unavailable-delivery response. Success and every technique's submitted email payload were verified with an injected test sender; no live email was sent.

Mobile menu open/close, a hoodie catalogue search and the existing Quote Cart navigation passed. The existing cart retained its two lines/four garments.

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript and production route generation.
- Focused tests: 33 total, 32 passed, one known unrelated failure. Includes nine new tests covering data/Contact mappings, invalid inputs, enquiry payloads, delivery failure, sticky fallback, dialog opening, keyboard wrapping/dismissal and focus/scroll restoration.
- Known unchanged failure: `tests/premium-design.test.ts:14`, “premium homepage uses real catalogue data and contains no prices”, still expects the previously removed `listPublishedProducts` featured-products section.
- Local delivery limitation: SMTP is not configured in this preview. The real endpoint returns an unavailable-delivery error and preserves the enquiry instead of reporting false success. Configure the existing SMTP settings to enable live delivery; production email delivery was not exercised.

Focused test command:

```text
node --conditions=react-server --experimental-strip-types --test tests/branding-enquiry.test.ts tests/technique-dialog.test.ts tests/customer-ui.test.ts tests/premium-design.test.ts tests/quote-cart.test.ts tests/catalogue-ranges.test.ts
```
