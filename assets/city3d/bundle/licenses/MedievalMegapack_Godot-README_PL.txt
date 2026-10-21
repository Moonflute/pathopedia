# Medieval Megapack — Low Poly — glTF Version for Godot 4.7

**Source:** FBX folder (1,265 models).

## Contents

* **Models/** — 1,265 models (.glb), organized into the same categories as the FBX version: Buildings, Docks, Food Props, Nature, Other, Palisade, Ropes, Tools, Weapons.
* **Materials/** — 17 shared materials (.tres). All models use these materials.
* **Textures/** — `atlas.png` (shared atlas), wall textures `Walls_1/2` (A–D) with normal maps, and floor textures `Floor A/B`.
* **Environment/** — `Medieval_Environment.tres` — environment resource for the test scene.
* **Test/** — `ModelBrowser.tscn` — model browser.

## 1. Import

Copy the entire `MedievalMegapack_Godot` folder anywhere inside your project, including the `.import` files, and wait for Godot to finish importing the assets.

Materials and textures are linked using UIDs.

## 2. Preview

Open `Test/ModelBrowser.tscn` and press **F6**.

The model browser includes categories, filtering, and a **"Show category as grid"** option.

## Materials

Values below are based on the original FBX files:

* **Atlas_1** — Roughness: 1.0 — 1,037 surfaces
* **Atlas_1_Rough083** — Roughness: 0.83 — 32 surfaces
* **Atlas_2** — Roughness: 0.476 — 133 surfaces, mainly food props
* **Metal_1** — Metallic: 0.514, Roughness: 0.477 — 148 surfaces
* **Metal_2** — Metallic: 0.395, Roughness: 0.454 — 144 surfaces
* **Metal_3** — Metallic: 0.327, Roughness: 0.3 — 36 surfaces
* **Metalic** — Metallic: 0.11, Roughness: 0.26 — 30 surfaces, including arrowheads and similar items
* **Walls_1_D**, **Walls_2_B** — building walls with normal maps (strength 0.7)
* **Walls_1_A/B/C**, **Walls_2_A/C/D**, **Floor_A**, **Floor_B** — additional color variants included in the original pack, ready to be swapped in.

Only `Walls_1_D` and `Walls_2_B` are currently assigned to the models.

In the FBX files, the same material (such as `"Atlas 1"` or `"Metal"`) sometimes had different values between individual files. Each variation was therefore given its own shared material in the Godot version to preserve the original appearance.

The material `Walls_1_A` in `Building_5_2_D` originally used the `Walls_1_D` texture, so it is linked to `Walls_1_D` in this version.

## Textures

* `atlas.png` is the **"Viking Atlas Map.png"** texture from the original pack. The FBX files refer to it as **"City Atlas Map.png"**.
* Wall and floor textures are imported using **VRAM compression (2048×2048)**.
* Normal maps are correctly imported as normal maps.
* Materials are **double-sided**, matching the original Blender setup and supporting the many open meshes used throughout the pack.

## Compatibility

Tested in **Godot 4.7.2**:

* All 1,265 models imported successfully.
* No import errors or warnings.
* glTF validator reports no errors.
