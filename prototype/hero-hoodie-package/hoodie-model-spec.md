---
title: CXA Hoodie — 3D Asset Specification
audience: whoever models the production garment (in-house artist, freelancer, or a scan/photogrammetry vendor)
---

# CXA Hoodie — 3D Asset Specification

This is the exact contract `<HeroHoodie />` expects from `public/models/cxa-hoodie.glb`.
Follow it and the component needs zero code changes to pick up the real garment —
just point `modelSrc` at the new file. Everything here is also demonstrated by
`scripts/generate_placeholder_glb.py`, which builds a (deliberately crude) stand-in
GLB that satisfies this same contract — read that script alongside this doc if
anything below is ambiguous.

## 1. What "done" looks like

A single `.glb` (binary glTF 2.0), one hoodie, no person wearing it, suspended/
floating in space, that:

- reads as a premium heavyweight cotton/fleece pullover hoodie: hood, drawstrings,
  kangaroo pocket, ribbed cuffs, ribbed waistband, visible seams, natural garment
  folds (not perfectly smooth/inflated-looking)
- is black, but the geometry, normal mapping and seam detail must stay legible
  under studio lighting — the component's lighting rig is restrained specifically
  because the garment needs to *not* read as a featureless black silhouette
- has NO baked-in logos anywhere except through the anchor/decal system below —
  branding is applied at render time so it can change per customer later

## 2. Coordinate system & scale

| | |
|---|---|
| Units | meters, real-world scale (1 unit = 1 m) |
| Up axis | +Y |
| Front (chest side, faces the camera at rest) | +Z |
| Back | −Z |
| Viewer's right at rest (= wearer's **left**) | +X |
| Viewer's left at rest (= wearer's **right**) | −X |
| Origin | vertical centerline, roughly sternum height — pick whatever height keeps the whole garment (hood tip to hem) vertically balanced for a clean Y-axis spin. Do not offset the origin sideways or front/back. |

**Left/right convention:** "left chest" and "left sleeve" always mean the
*wearer's* left, exactly like an apparel spec sheet or an embroidery order form.
Because the model faces the camera (+Z) at rest, the wearer's left appears on the
**right** side of the screen (+X) — this is the mirrored convention every apparel
mockup uses, and it's how the placeholder script places `Anchor_LeftChest` (at
positive X). Don't "fix" this by mirroring — it needs to match real embroidery/
print order sheets the CXA team already uses.

Overall bounding box, approximately: 0.75m wide (cuff to cuff, arms in a relaxed
floating pose) × 0.75m tall (hood tip to hem) × 0.35m deep. Close is fine; exact
match isn't required, but a garment 3x bigger or smaller than this will need
`CAMERA.position` retuned in `hoodie-config.ts`.

Rest pose: arms relaxed and slightly forward/down (as if worn), not a stiff T-pose,
not flat-laid. It's rotating in place on its Y axis, so silhouette from every
angle matters — no side of the garment should be "unfinished."

## 3. Required node names (the actual contract)

The component finds parts of the model **by name** via
`scene.getObjectByName(...)`. These exact strings, case-sensitive, must exist
somewhere in the glTF node hierarchy:

### Mesh nodes (must have geometry)

| Node name | What it is |
|---|---|
| `Body` | Torso — the surface `leftChest`, `rightChest`, `centreFront`, `fullFront`, `upperBack`, `fullBack` all decal onto |
| `Sleeve_L` | Wearer's left sleeve — surface for `leftSleeve` |
| `Sleeve_R` | Wearer's right sleeve — surface for `rightSleeve` |

(`Hood`, `Cuff_L`, `Cuff_R`, `Waistband`, `Pocket`, `Drawstring_L`,
`Drawstring_R` are expected to exist as visual geometry — the placeholder
includes them — but the component doesn't currently look them up by name, so
their exact naming is a nice-to-have for scene organization, not a hard
requirement. Name them sensibly anyway; a future zone might target the hood.)

### Anchor (empty) nodes — no geometry, just a transform

These are `Object3D`/`Empty` nodes (Blender: **Plain Axes** empties are easiest to
place precisely) that mark where each branding zone's artwork attaches and which
way it faces. The component reads each anchor's **world position** and **world
orientation** and projects the configured artwork there using drei's `<Decal>`
(a real projected-texture decal that wraps to the surface underneath it, not a
flat sticker floating in space).

| Anchor node name | Parent it should sit near | Faces (local +Z) |
|---|---|---|
| `Anchor_LeftChest` | `Body`, upper chest, +X side | outward (+Z-ish, toward camera) |
| `Anchor_RightChest` | `Body`, upper chest, −X side | outward |
| `Anchor_CentreFront` | `Body`, centered, mid-chest | outward |
| `Anchor_FullFront` | `Body`, centered, lower-chest/stomach (large-format print area) | outward |
| `Anchor_UpperBack` | `Body`, between the shoulder blades | outward, but −Z-facing (toward the back) |
| `Anchor_FullBack` | `Body`, centered, full back (large-format print area) | outward, −Z-facing |
| `Anchor_LeftSleeve` | `Sleeve_L`, outer forearm, running vertically | outward from the sleeve's outer face |
| `Anchor_RightSleeve` | `Sleeve_R`, outer forearm, running vertically | outward from the sleeve's outer face |

An anchor's orientation matters (it orients the decal's projection axis and the
`rotationDeg` the branding config applies is relative to it) — orient each
anchor's local +Z to point away from the garment surface at that point (i.e.
along the surface normal), with local +Y pointing "up" the garment the way text
would read right-side-up. In Blender: select the anchor empty, use "Align to
normal" or manually rotate so its blue axis (+Z) points outward.

Exact placement is forgiving — `<Decal>` projects along a reasonable depth range,
so being off by a centimeter or two is fine. Being on the wrong side of the
garment, or facing inward, is not.

### Root

All of the above should live under a single root node/collection (the
placeholder calls it `CXA_Hoodie_Root`) so the whole garment can be scaled/
positioned as one unit if ever needed. Not strictly required by the component
(it looks up nodes by name globally in the scene), but keeps the file sane.

## 4. Materials & texturing

- PBR metallic/roughness workflow (glTF's native material model).
- One material for the garment fabric is enough: black, roughness ~0.75–0.9
  (napped cotton fleece is not shiny), metalness 0.
- Use a **normal map** to carry seam, rib, and fold detail rather than sculpting
  every rib in geometry — this is what keeps the black garment readable without
  needing aggressive lighting.
- A subtle fabric-weave detail in the normal/roughness map sells "heavyweight
  cotton" at the close-up scale this hero renders at.
- Metal aglets on the drawstring ends and the woven neck label are small enough
  to bake into one shared material/texture atlas rather than getting their own
  materials.
- **Texture budget:** 2K (2048×2048) max for the shared fabric material. Do not
  ship 4K — see Performance below. Export as KTX2/Basis (`.ktx2`) if your
  pipeline supports it (roughly 4–6x smaller on disk and on the GPU than PNG/
  JPEG); plain PNG/JPG in the glTF is an acceptable fallback if KTX2 tooling
  isn't available.

## 5. Geometry budget

- Target 15,000–30,000 triangles for the whole garment. This is a hero object
  taking up most of the viewport, so it can afford more than a background prop,
  but it's rotating continuously above the fold on mobile too — don't go past
  ~40k without a good reason.
- Apply **Draco compression** on export (Blender's glTF exporter has this
  built in: Export glTF 2.0 → Compression → Draco). On geometry this size,
  Draco typically gets the mesh payload down to a few hundred KB.
- No need for LODs — the garment fills the frame at all times, and the poly
  budget above is already low enough not to need them.

## 6. Export settings (Blender → glTF 2.0)

- Format: **glTF Binary (.glb)** — single file, textures embedded.
- Include: Selected Objects (export only the hoodie hierarchy, not scene
  cameras/lights/floor).
- Transform: +Y Up (Blender's exporter handles the Z-up → Y-up conversion —
  double check the result matches Section 2's axes after export, some
  exporter versions need "Y Up" explicitly checked).
- Geometry: apply modifiers, include normals, include tangents if using a
  normal map (usually on by default when a normal map is present).
- Compression: **Draco** on, default settings are fine to start (adjust
  quantization if you see visible artifacting on the fold/seam detail).
- Materials: **Export**, "Materials: Export" with images set to **Automatic**
  (embeds textures in the .glb). If your pipeline produces KTX2 separately,
  follow your tool's KTX2 glTF extension export path instead.
- Do **not** export cameras, lights, or a ground plane — the component
  supplies its own (see `hoodie-config.ts` `CAMERA` / `LIGHTING` /
  `CONTACT_SHADOW`).
- Double-check in a glTF viewer (e.g. https://gltf-viewer.donmccurdy.com/)
  before handing off: confirm all 8 `Anchor_*` empties are present in the
  node tree (some exporters drop empties with certain "Object Types" export
  filters — make sure Empties are included), confirm the mesh names match
  Section 3 exactly, confirm the file opens without console errors.

## 7. File size target

Aim for **under 3–5MB** total with Draco + a 2K texture. This is an
above-the-fold hero asset on a marketing homepage — every extra megabyte is
directly a slower first render on mobile. If the real garment needs a heavier
texture set to look right, talk to whoever owns CXA's performance budget
before shipping past ~8MB.

## 8. Handing it off

Drop the file in as `public/models/cxa-hoodie.glb` and either:

- pass `modelSrc="/models/cxa-hoodie.glb"` to `<HeroHoodie />`, or
- change `DEFAULT_MODEL_SRC` in `hoodie-config.ts` to point at it and remove
  the placeholder.

No other code changes should be necessary if the node names in Section 3 match.
If a zone's artwork doesn't appear, check the browser console — `HoodieModel`
logs a warning by name (`[HeroHoodie] Branding zone "leftChest" could not be
placed: ...`) naming exactly which anchor or mesh node it couldn't find.
