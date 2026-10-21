# aRestaurant — glTF Version for Godot 4.7

**Source:** FBX folder (1,023 models).

## Contents

* **Models/** — 1,023 models (.glb): Food, Furniture, Kitchen Cookware, Other, Walls.
* **Materials/** — 4 shared materials (.tres). All models use these materials.
* **Textures/** — `kitchen_atlas.png` (color atlas), `table.png` (tabletop textures).
* **Environment/** — `Restaurant_Environment.tres` — environment resource for the test scene.
* **Test/** — `ModelBrowser.tscn` — model browser.

## 1. Import

Copy the entire `Restaurant_Godot` folder anywhere inside your project, including the `.import` files, and wait for Godot to finish importing the assets.

Materials and textures are linked using UIDs.

## 2. Preview

Open `Test/ModelBrowser.tscn` and press **F6**.

The model browser includes categories, filtering, and a **"Show category as grid"** option.

## Materials

Values below are based on the original FBX files:

* **Kitchen** — Metallic: 0.413, Roughness: 1.0 — furniture, walls, dishes
* **Kitchen_Food** — Metallic: 0.0, Roughness: 0.81 — food and Other
* **Kitchen_Metal** — Metallic: 0.303, Roughness: 0.472 — metal elements
* **Table** — Roughness: 1.0, using `table.png` — tabletops

In the FBX files, the `Kitchen` material had two different versions (for furniture and food), so they were split into two separate shared materials to preserve the original appearance.

Materials are **double-sided**, matching the original Blender setup and supporting the many open meshes used throughout the pack.

## Model Structure

* Some furniture pieces have movable elements as separate nodes (for example, drawers `Furnit_A_5_S_1`–`S_7` and the full coffee cup `CoffeCup_Full`). These can be animated or hidden independently.
* **Curtains** (`Curtains_*`) have their origin point positioned at the top, on the curtain rod, making them easy to hang and position.

## Note

`kitchen_atlas.png` is the same texture file used by the characters in **Ultimate Creator Pack** and the vehicles in **Cars 2**.

## Compatibility

Tested in **Godot 4.7.2**:

* All 1,023 models imported successfully.
* No import errors or warnings.
* glTF validator reports no errors.
