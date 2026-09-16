# CXA launch recovery — 8 September 2026

## Approved direction
Use the supplied black/yellow hoodie homepage reference. Balanced sans-serif
headlines, restrained navigation, static branded hoodie, clear quote journey.
3D rotation is deferred. Do not add rotation labels or development notices to
the customer page. The newly generated standalone hoodie is approved for creation
and saved in public/images/cxa-hoodie-hero.png. Original reference assets remain.
Public email: sales@cxa.co.nz. No telephone number.

## Implemented
- Static hero independent of supplier catalogue imagery.
- Responsive layout and calmer customer-page typography in src/app/launch.css.
- Category imagery only from published products in the correct category.
- Single-product featured layout rather than a mostly empty grid.
- Working email contact link instead of a disabled enquiry form.
- Unintegrated prototype excluded from app type/lint checks, retained for later.
- Existing server-side supplier, quote, artwork and admin architecture preserved.

## Launch dependencies still to verify
- Confirm cPanel application URL, application root, Node runtime and startup method.
- Configure production PostgreSQL and apply tracked migrations after backup.
- Set public origins to the production HTTPS domain.
- Set production authentication and rate-limit secrets in hosting settings.
- Configure SMTP and staff quote notification recipient; verify email delivery
  with an explicitly authorized test before taking real enquiries.
- Choose and publish the intended initial CXA range. Local DB has one published
  product. Supplier ingestion must not be treated as approval to publish all.
- Confirm persistent private artwork storage, backups and upload operations.
- Verify production customer quote journey and desktop/mobile appearance.

Do not deploy .env.local, database backups, .cxa-storage, node_modules, .git or
prototype files as public assets. Do not migrate to a new hosting platform just
to publish a visual preview of this existing PostgreSQL application.

## Validation completed
- Production build passed.
- Lint passed.
- Existing regression suite: 105 passed, 0 failed.
- HTTP smoke checks passed for homepage, products, quote, contact, how-it-works,
  branding, about, FAQ and the new hero asset.
- Desktop/mobile interactive visual verification remains to be completed.
- Local preview: http://localhost:3100.
- Approved screenshot: CXA-visual-reference/design-reference/launch-approved-reference.png.
- Not deployed; hosting confirmation and production configuration are outstanding.

## Local category refresh — 8 September 2026
- User confirmed the build remains local until complete; do not deploy.
- Local catalogue now contains 440 published products from the existing import.
- Homepage uses 11 curated garment ranges with dedicated studio category artwork.
- Range matching combines supplier categories and garment names; service entries are excluded.
- Search and brand filters retain the selected range.
- Category matching regression checks and production build passed.

## Approved embroidered hover effect
- All 11 homepage category cards fade from their plain photo to the approved embroidered version on mouse hover and back on leave.
- Removed the typed X overlay and its positioning rules.
- Installed headwear-v3.png as the approved cap; original artwork is retained.
- Keyboard focus reveals embroidery; reduced-motion settings remove the fade; touch devices retain direct category navigation.
- Production build passed. Homepage, all 11 embroidered asset URLs and optimized cap image returned successfully.
- Local only; no deployment.

## Homepage and mobile polish — 8 September 2026
- Removed the duplicate featured-product section; curated garment ranges remain the main shopping entry.
- Replaced the homepage supplier text list with eight authentic manufacturer logos, linked to published brand ranges. Logo source URLs are retained in public/images/brands/sources.json.
- Removed customer-facing eyebrow headings, including shared content pages and quote/product screens.
- Mobile hero reading order is headline, hoodie, then supporting copy and actions. Desktop retains a two-column composition and the approved wide-screen scale.
- Mobile how-it-works steps now use individual dark cards with yellow numbered badges.
- The category embroidery hover effect is unchanged.
- Production build, targeted lint, 13 customer-page HTTP checks and all eight brand asset requests passed. Browser visual checks remain outstanding.
- Local only; not deployed.
- Replaced header/footer artwork with the white CXA / CUSTOM X APPAREL wordmark recreated from the approved hoodie. Dark-background raster export uses CSS blending on the site's dark surfaces.
