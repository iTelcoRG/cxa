# P54 — Contact structure and editable subjects

Preview: http://localhost:3000/contact (port 3000).
Changes remain uncommitted. No external enquiry was sent.

## Contact page

The page now follows this order: existing H1, existing short introduction, enquiry form, supporting email information, footer. “Ready to start?”, its paragraph and Browse apparel button are removed. Their exclusive layout/email styles were removed after checking references.

The dark form card uses the existing white `--cxa-surface-white` and cool-grey `--cxa-muted-on-dark` tokens, restrained border/shadow, rounded corners and inputs at least 48px tall. Name and Email share a row where they fit; the grid automatically reflows to one column on narrow screens or when enlarged text requires it. Subject and message span the form width.

The Contact container reuses `--cxa-home-shell-max` and the existing `--cxa-hero-copy-inset`, without changing the header. At 1440px, the H1 and visible SVG logo edge both measured 116.5px from the left. Mobile removes the desktop inset and uses the shared gutter. Anchor positioning uses the measured `--cxa-header-height` plus a 1rem margin.

Contact information is below the form, with a modest mailto link, existing product/branding guidance and quote-reference guidance. No response-time promise or other unsupported contact detail was added.

## Subject and submission

- Required, freely editable Subject replaces the technique dropdown.
- Direct Contact visits start empty. Existing modal CTA URLs and bookmarked `?technique=<slug>#contact-form` links map recognized slugs to the canonical display name plus “ enquiry”. All fifteen mappings are supported. The Branding cards and modal design were not edited.
- No unrestricted `subject` query parameter was introduced. Unknown, repeated, injected and excessively long technique values map to an empty Subject.
- Submitted Subjects are trimmed, required after trimming, limited to 160 characters, and reject C0/C1 controls and line/paragraph separators before trimming. The subject appears in the validated server payload, email subject and plain-text email body.
- Name, Email, Subject and message survive validation and unavailable-delivery responses. Labels remain stable during errors; error text is outside each label and associated using `aria-describedby` and `aria-invalid`. Error/status messages receive focus and announce their state.
- Existing SMTP transport, rate limiting, honeypot, request bounds and submission handler are retained. No credentials or environment values enter the client bundle.

## Shorts asset result

No lighter local shorts image was selected. Existing dark cargo shorts and their category destination remain unchanged; no image was generated, downloaded, recoloured or filtered.

Exact local shorts assets inspected:

- `public/images/categories/pants-shorts.png` — dark cargo shorts.
- `public/images/categories/embroidered/pants-shorts.png` — the same dark garment with yellow embroidery.
- `CXA-visual-reference/embroidered-categories/pants-shorts.png` — byte-identical to the public embroidered asset (SHA-256 `31A8985D8A506176E28D55F913D875E0741F696F12A1D7EDABE89EF9CC275E91`).

The local inventory search covered `public`, `CXA-visual-reference`, prototype assets and local storage/cache locations. No other local category/product shorts file was found. Synced supplier metadata includes American Apparel 2PQ gym shorts in Arctic, Bone and Heather Grey, but their photographs are remote URLs; no matching local Next image-cache entry was found for the neutral variants. Those remote photographs were not downloaded or substituted.

Required asset: an approved local photograph clearly showing light-grey, stone, cream or similar neutral shorts, suitable for a square category crop. If retaining the embroidered hover treatment, supply a matching light-garment hover image too. The existing title remains “Pants / Shorts” and the destination remains `/products?range=pants-shorts`.

## Files changed

1. `src/app/contact/page.tsx`
2. `src/app/contact/contact.css`
3. `src/components/contact-enquiry-form.tsx`
4. `src/contact/enquiry.ts`
5. `src/contact/subject.ts` (new)
6. `src/app/globals.css` — removed unused Contact layout selectors only.
7. `src/app/launch.css` — removed the old Contact email selector and extended the existing footer wrapping rule to Create Your Brand for enlarged text.
8. `tests/branding-enquiry.test.ts` — updated obsolete technique-only submission expectations.
9. `tests/contact-subject.test.ts` (new)
10. This report.

No category component, category image, Branding card/modal component, navigation component, supplier model or Quote Cart implementation was changed.

## Verification

Contact, Create Your Brand and a keyboard-operated Branding-to-Contact journey were checked at 360, 390, 430, 768, 1024, 1440 and 1920px. Every width retained one H1 and no horizontal overflow. Each technique journey populated the correct editable Subject. Form anchors landed about 16px below the shared header: approximately 89px below a 73px mobile/tablet header and 113px below a 97px desktop header.

Additional checks:

- 1440×600 short desktop: correct prefilled Subject, visible form anchor and normal page scrolling.
- 200% root/body text at mobile and short desktop sizes: Contact reflowed its short fields to one column with no horizontal overflow. Create Your Brand exposed an existing footer overflow; the existing homepage/Branding wrapping rule now covers that page too and the overflow was resolved. Temporary enlargement CSS was removed.
- Reduced-motion stylesheet branch was temporarily activated for verification: computed `scroll-behavior: auto`, button transition `0s`, transform `none`. The normal `prefers-reduced-motion` media condition was restored afterward.
- Keyboard navigation, visible focus, clearing a prefilled Subject, native empty-Subject validation, server whitespace/control/length validation, stable accessible labels and associated error messages passed.
- A real local unavailable-SMTP response preserved a valid 160-character Subject, Name, Email and message, and focused the error announcement. SMTP configuration was confirmed absent before this check, so no external email was sent.
- Successful delivery and email payload construction were tested with an injected mock sender. Live SMTP delivery remains unverified/unavailable until the existing SMTP settings are configured.
- HTTP checks passed for all fifteen canonical Subject prefills, direct empty Subject, unknown/long/repeated/untrusted query handling, form order, removed CTA and control-character rejection.
- The Shorts link opened the correct Pants / Shorts catalogue range. Mobile menu open/close, hoodie search and Quote Cart navigation were checked; cart contents were not modified.

Results:

- Focused Subject/Branding/dialog tests: 15 passed.
- Full relevant customer UI/cart/range/Branding/Contact suite: 39 tests, 38 passed, one known unrelated failure.
- Known failure unchanged: `tests/premium-design.test.ts:14`, “premium homepage uses real catalogue data and contains no prices”, expects the removed `listPublishedProducts` featured-products section.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript and production route generation.

Test command:

```text
node --conditions=react-server --experimental-strip-types --test tests/contact-subject.test.ts tests/branding-enquiry.test.ts tests/technique-dialog.test.ts tests/customer-ui.test.ts tests/premium-design.test.ts tests/quote-cart.test.ts tests/catalogue-ranges.test.ts
```
