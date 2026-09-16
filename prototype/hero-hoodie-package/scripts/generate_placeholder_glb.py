#!/usr/bin/env python3
"""
Generates public/models/cxa-hoodie-placeholder.glb

THIS IS NOT A FINAL GARMENT ASSET.

It is a deliberately abstract, low-poly stand-in used only so the
<HeroHoodie /> component and its branding-zone architecture can be run,
tested, and visually verified (rotation, decal placement, scroll mapping)
before a real hoodie GLB exists. It is built from simple primitives
(boxes / cylinders / a dome), tagged with a "PLACEHOLDER" material name,
and colored mid-grey specifically so it can never be mistaken for the
production-quality black hoodie render described in hoodie-model-spec.md.

Node naming and anchor placement follow the exact convention the real
production GLB must also follow -- see hoodie-model-spec.md. Swapping
this file for a real "cxa-hoodie.glb" that uses the same node names is
the only change required on the component side (see hoodie-config.ts).

Requires: trimesh, pygltflib (pip install trimesh pygltflib)
Run: python3 scripts/generate_placeholder_glb.py
"""
import numpy as np
import trimesh

OUT_PATH = "public/models/cxa-hoodie-placeholder.glb"

PLACEHOLDER_COLOR = [150, 150, 155, 255]  # mid-grey RGBA - never confuse with final black garment
ANCHOR_AXIS_LEN = 0.001  # anchors carry no geometry; kept as pure empties


def make_material():
    return trimesh.visual.material.PBRMaterial(
        name="DEV_PLACEHOLDER_DO_NOT_SHIP",
        baseColorFactor=PLACEHOLDER_COLOR,
        metallicFactor=0.05,
        roughnessFactor=0.85,
    )


def colored(mesh):
    mesh.visual = trimesh.visual.TextureVisuals(material=make_material())
    return mesh


def main():
    scene = trimesh.Scene()

    # Root node all garment geometry + anchors hang from.
    # Convention (documented in hoodie-model-spec.md):
    #   +Y up, +Z = garment front (toward camera/viewer), +X = viewer's right.
    #   Origin sits at the vertical center of the torso so rotationY spins
    #   the garment in place without any orbit correction from the component.
    scene.graph.update(frame_to="CXA_Hoodie_Root", frame_from="world", matrix=np.eye(4))

    # --- Torso -----------------------------------------------------------
    torso = trimesh.creation.capsule(radius=0.23, height=0.42, count=[10, 16])
    # capsule is built along Z; rotate onto Y (vertical) then flatten front-back
    R = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
    torso.apply_transform(R)
    S = np.diag([1.05, 1.0, 0.72, 1.0])  # widen slightly, flatten depth
    torso.apply_transform(S)
    torso.apply_translation([0, 0.02, 0])
    colored(torso)
    scene.add_geometry(torso, node_name="Body", parent_node_name="CXA_Hoodie_Root")

    # --- Hood --------------------------------------------------------------
    hood = trimesh.creation.icosphere(subdivisions=2, radius=0.185)
    # keep only the upper ~65% to read as a hood shell, flatten the opening
    verts = hood.vertices.copy()
    keep = verts[:, 1] > -0.03
    hood = hood.submesh([np.where(keep[hood.faces].all(axis=1))[0]], append=True)
    hood.apply_transform(np.diag([1.0, 1.15, 0.85, 1.0]))
    hood.apply_translation([0, 0.52, -0.03])
    colored(hood)
    scene.add_geometry(hood, node_name="Hood", parent_node_name="CXA_Hoodie_Root")

    # --- Sleeves (cylinders, angled slightly down/out) ---------------------
    def make_sleeve(sign):
        sleeve = trimesh.creation.cylinder(radius=0.085, height=0.46, sections=14)
        Rz = trimesh.transformations.rotation_matrix(sign * np.radians(18), [0, 0, 1])
        sleeve.apply_transform(Rz)
        sleeve.apply_translation([sign * 0.36, -0.02, 0.0])
        colored(sleeve)
        return sleeve

    scene.add_geometry(make_sleeve(1), node_name="Sleeve_L", parent_node_name="CXA_Hoodie_Root")
    scene.add_geometry(make_sleeve(-1), node_name="Sleeve_R", parent_node_name="CXA_Hoodie_Root")

    # --- Cuffs (thin rings at sleeve ends) ----------------------------------
    def make_cuff(sign):
        cuff = trimesh.creation.annulus(r_min=0.065, r_max=0.088, height=0.045, sections=14)
        cuff.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
        Rz = trimesh.transformations.rotation_matrix(sign * np.radians(18), [0, 0, 1])
        cuff.apply_transform(Rz)
        cuff.apply_translation([sign * 0.36 + sign * 0.155, -0.02 - 0.145, 0.0])
        colored(cuff)
        return cuff

    scene.add_geometry(make_cuff(1), node_name="Cuff_L", parent_node_name="CXA_Hoodie_Root")
    scene.add_geometry(make_cuff(-1), node_name="Cuff_R", parent_node_name="CXA_Hoodie_Root")

    # --- Waistband -----------------------------------------------------------
    waistband = trimesh.creation.annulus(r_min=0.22, r_max=0.25, height=0.06, sections=24)
    waistband.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    waistband.apply_transform(np.diag([1.05, 1.0, 0.72, 1.0]))
    waistband.apply_translation([0, -0.34, 0])
    colored(waistband)
    scene.add_geometry(waistband, node_name="Waistband", parent_node_name="CXA_Hoodie_Root")

    # --- Kangaroo pocket -------------------------------------------------------
    pocket = trimesh.creation.box(extents=[0.28, 0.16, 0.04])
    pocket.apply_translation([0, -0.14, 0.175])
    colored(pocket)
    scene.add_geometry(pocket, node_name="Pocket", parent_node_name="CXA_Hoodie_Root")

    # --- Drawstrings (simple thin capsules hanging from the hood) --------------
    def make_drawstring(sign):
        cord = trimesh.creation.cylinder(radius=0.008, height=0.16, sections=8)
        cord.apply_translation([sign * 0.045, 0.26, 0.205])
        colored(cord)
        return cord

    scene.add_geometry(make_drawstring(1), node_name="Drawstring_L", parent_node_name="CXA_Hoodie_Root")
    scene.add_geometry(make_drawstring(-1), node_name="Drawstring_R", parent_node_name="CXA_Hoodie_Root")

    # --- Branding anchors (empties, no geometry) --------------------------------
    # Position (x, y, z) in meters, matches hoodie-model-spec.md exactly.
    # Left/Right = the WEARER's left/right (mirrored from the viewer looking at
    # the front of the garment) -- standard apparel-mockup convention.
    anchors = {
        "Anchor_LeftChest":   ([0.095, 0.235, 0.205], 0),
        "Anchor_RightChest":  ([-0.095, 0.235, 0.205], 0),
        "Anchor_CentreFront": ([0.0, 0.13, 0.215], 0),
        "Anchor_FullFront":   ([0.0, 0.02, 0.225], 0),
        "Anchor_UpperBack":   ([0.0, 0.27, -0.205], 180),
        "Anchor_FullBack":    ([0.0, 0.02, -0.225], 180),
        "Anchor_LeftSleeve":  ([0.355, -0.02, 0.075], 90),
        "Anchor_RightSleeve": ([-0.355, -0.02, 0.075], -90),
    }
    for name, (pos, yaw_deg) in anchors.items():
        M = trimesh.transformations.rotation_matrix(np.radians(yaw_deg), [0, 1, 0])
        M[:3, 3] = pos
        scene.graph.update(frame_to=name, frame_from="CXA_Hoodie_Root", matrix=M)

    data = scene.export(file_type="glb")
    with open(OUT_PATH, "wb") as f:
        f.write(data)
    print(f"wrote {OUT_PATH} ({len(data)/1024:.1f} KB)")

    # sanity: re-read node table
    import pygltflib
    g = pygltflib.GLTF2().load(OUT_PATH)
    print(f"{len(g.nodes)} nodes, {len(g.meshes)} meshes")
    for n in g.nodes:
        print(" -", n.name, "mesh" if n.mesh is not None else "empty")


if __name__ == "__main__":
    main()
