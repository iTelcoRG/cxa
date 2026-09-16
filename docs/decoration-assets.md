# Decoration guide assets

## In use

- `/images/decoration/screen-printing-squeegee.jpg`: supplied squeegee and ink close-up.
- `/images/decoration/embroidery-machine.png`: supplied stitching close-up.
- `/images/decoration/heat-transfer-peel.jpg`: supplied carrier-film peel close-up.
- These three user-supplied files were found in `public/images/` and copied into
  the requested `decoration/` directory, preserving the originals. Both pages
  use the shared technique data and card component. No images were generated.
- The embroidered polo category asset remains unchanged; it is no longer used
  in the technique cards.
- Existing hoodie artwork and upright SVG interface logos are unchanged.

## Cropping

All three featured photographs are connected. Independent `--technique-crop`
positions in `src/app/launch.css` keep each action visible with `object-fit:cover`
across narrow, wide and detailed cards. The charcoal gradient protects the text
and fades to transparent at the right edge; no additional image zoom is applied.

## Optional specialist examples

No confirmed reusable, accurately labelled images were found for these finishes.
Their cards are deliberately text-only. Intended filenames, if supplied, under
`public/images/decoration/finishes/`:

`dtg.jpg`, `sublimation.jpg`, `discharge-printing.jpg`, `hot-split-transfer.jpg`,
`reflective-printing.jpg`, `applique-embroidery.jpg`, `foil-printing.jpg`,
`puff-print.jpg`, `glitter-printing.jpg`, `distressed-clear-ink.jpg`,
`neon-colours.jpg`, `mixed-techniques.jpg`.

## Content reference

The full image guide on
https://www.premiumcatalogue.co.nz/pages/decorating-techniques
was visually inspected on 9 September 2026. Its diagram is at
https://cdn.shopify.com/s/files/1/0100/9913/0453/files/Decorating_Process.jpg?v=1576698668.
CXA descriptions were written independently; the supplier's image and wording
were not copied into the application. The chart's photos do not have confirmed
reuse permission and are not used as interface photographs.

Heat transfer is a customer-facing umbrella term. DTF remains described in the
guide and no quote configuration values, routes or backend capabilities change.
Enquiry links use the existing `/contact` flow; technique names are not silently
passed into unsupported query parameters. Customers can name the technique in
their enquiry or quote notes.
