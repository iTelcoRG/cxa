# Embroidery image prompts

Method: built-in imagegen, one edit request per category. Each new request used the original category image first and the approved upright-X longsleeve second. The longsleeve in this folder is the approved sample, reused unchanged.

Approved reference: C:/Users/RakeshGovan/.codex/generated_images/01a0714c-0b06-7f71-a37c-989000873974/exec-eb308dd2-22e7-46a2-84ac-bf44cb9e904a.png

## Common prompt

Use case: precise-object-edit.
Asset type: category product photograph for asset-only review.
Input images: Image 1 is the EDIT TARGET, the original plain product photograph. Image 2 is an approved longsleeve photograph used ONLY as a LOGO GEOMETRY AND EMBROIDERY STYLE REFERENCE. Do not borrow its garment, fabric pattern, background, lighting, composition, shape, camera, or texture.
Primary request: Edit only a small local area on Image 1 to sew one small upright X into the product. Match the reference X's dense satin-stitch construction, fine visible strands, slight raised thread depth, subtle highlights and contact shadows, with a physically sewn appearance that conforms naturally to the original fabric. The X must have two balanced diagonal strokes about 45 degrees, one upper-left to lower-right and one lower-left to upper-right, equally long; a clear upright X, not a tilted plus sign, not rotated, not italic. No border, badge or enclosing patch.
INVARIANTS: Preserve Image 1's exact original full-product composition, plain fabric texture and material, product shape, camera angle, folds, lighting, original dark studio background, product position, scale, seams and hardware. Change only the local embroidery area. Especially do not transfer the subtle patterned fabric of Image 2. Output the same square full product photograph. No UI, lettering, watermark, inset, collage or close-up. Exactly one X.

## Target-specific additions

### t-shirts
Target subject: original cream short-sleeve T-shirt. Sew the X in golden-yellow thread matching the approved reference, on the wearer's left chest (viewer right), in the uncluttered upper chest. X width about 6–8% of the full image canvas width.

### polos
Target subject: original navy short-sleeve polo. Sew the X in golden-yellow thread matching the approved reference, on the wearer's left chest (viewer right), beside and clear of the placket. X width about 6–8% of the full image canvas width.

### singlets
Target subject: original charcoal sleeveless singlet. Sew the X in golden-yellow thread matching the approved reference, on the wearer's left chest (viewer right), below the neckline, inside and clear of the armhole seam. X width about 6–8% of the full image canvas width.

### sweatshirts-hoodies
Target subject: original black pullover hoodie. Sew the X in golden-yellow thread matching the approved reference, on the wearer's left chest (viewer right), above the pocket, to the right of and clearly separated from the drawcord. X width about 6–8% of the full image canvas width.

### outerwear
Target subject: original olive zipped outerwear jacket. Sew the X in golden-yellow thread matching the approved reference, on the wearer's left upper chest (viewer right), on a clear fabric area above the chest pocket zipper, not across a seam or hardware. X width about 6% of the full image canvas width.

### fleece
Target subject: original charcoal full-zip fleece. Sew the X in golden-yellow thread matching the approved reference, on the wearer's left chest (viewer right), clearly separated from the central zipper. X width about 6–8% of the full image canvas width.

### pants-shorts
Target subject: original black cargo shorts. Sew the X in golden-yellow thread matching the approved reference, on the viewer-left lower thigh front fabric, above the hem, with clear space from the cargo pocket seams. Keep the logo proportionately modest, about 6% of the full image canvas width.

### hi-vis
Target subject: original fluorescent yellow and black high-visibility polo with silver reflective strips. Sew the X using DARK CHARCOAL thread for contrast on the fluorescent yellow upper chest, on the wearer's left chest (viewer right), clear of the placket and above the reflective strips. Use the approved reference only for X geometry and embroidered construction; replace its golden-yellow thread with dark charcoal. X width about 6–8% of the full image canvas width.

### headwear
Target subject: original black baseball cap. Sew the X in golden-yellow thread matching the approved reference, centered on the front crown fabric, below the front eyelet and above the brim. X width about 10% of the full image canvas width. Preserve the cap's exact perspective and all panels and seams.

### accessories
Target subject: original black canvas tote bag. Sew the X in golden-yellow thread matching the approved reference, centered on the main front panel between the two vertical straps, not on either strap, approximately halfway down the front panel. X width about 12% of the full image canvas width.

## Headwear revision — user annotation

Selected output: headwear-v2.png. Method: built-in imagegen. Original blank cap used as the edit target, user blue-mark screenshot as location guide, approved upright-X longsleeve as embroidery reference.

Use case: precise-object-edit.
Image 1 is the ONLY edit target: the ORIGINAL PLAIN black cap photo, 1254x1254 pixels. Image 2 is a screenshot used ONLY as a LOCATION GUIDE: its hand-drawn BLUE X marks where the finished gold embroidery must be. Ignore its existing gold X and all UI. Image 3 provides ONLY the approved UPRIGHT X shape and golden satin embroidery finish. Do not copy any fabric or garment from Image 3.
Add exactly ONE golden-yellow embroidered X on the plain black cap in Image 1, precisely on the lower viewer-left side of the front crown at the BLUE mark's location. REQUIRED COORDINATES ON FULL PHOTO: X centre (445,650), meaning 35.5% across and 51.8% down the 1254x1254 canvas. The emblem must occupy approximately x392–498 and y593–710. Keep the X inside this bounding box. Position it just right of the vertical front-panel seam and comfortably above the curved brim seam. The previous attempt at (490,617) was too high and too far right; this target must be distinctly lower and farther LEFT than that. The location in these numeric coordinates is mandatory.
The finished X is upright and balanced, matching Image 3: two equally long, equally thick diagonal strokes crossing at their centres, at approximately +45 and -45 degrees. Both top endpoints must be at the same approximate height and both bottom endpoints at the same approximate height. No italic lean, rotated plus, off-centre crossing, or exaggerated perspective. Use dense golden-yellow satin-stitch embroidery with visible fine individual strands, a subtle raised thread surface and small natural contact shadows, physically sewn into the black cap. The logo should have the same modest scale as the approved cap design, about 110 pixels wide, and no enclosing patch.
STRICTLY preserve Image 1 everywhere outside the small embroidery patch: same original plain black fabric texture, all panel seams, cap silhouette and proportions, eyelets, button, brim stitching and shape, lighting, camera angle, framing, product position and dark studio background. Do not retexture or recompose the photo. Output one full 1254x1254 square product photograph. Exactly one gold X in the required lower-left position. No other logo, no blue ink, no UI, no border, no inset, no collage, no text.

## Headwear v3 — slight rightward nudge

Selected output: headwear-v3.png. Built-in imagegen edit of headwear-v2.png with the user's latest annotation as placement guide. The first request overshot and was not selected; this targeted correction is the displayed version.

Edit Image 1 only. Move its existing gold embroidered X to the RIGHT by just ONE QUARTER OF THE X'S OWN WIDTH, about 20–25 pixels. A tiny horizontal nudge. Keep it at the LOWER-LEFT of the front panel, close to the vertical seam; DO NOT recenter it in the panel. The gap from that seam to the X's left edge should increase only slightly, from roughly one-third X width to roughly half X width. No vertical movement, rotation, resizing or redesign: preserve the identical X shape and satin stitches. Restore fabric at the vacated left edge. Everything else in the cap photograph stays unchanged. Image 2 is only the user's tiny rightward placement guide: omit its blue ink and UI. One full square cap photo, exactly one gold X.
