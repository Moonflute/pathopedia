# Cell City 3D village · v0.48.1

Entry: `#city3d`. The original `#city` remains available. The two games use separate local saves: `pathopedia:cell-city:3d:v1` and `pathopedia:cell-city:v1`. No save is imported, migrated, or deleted when switching views.

## Playable scope

Six districts now have distinct silhouettes: wind harbour/bellows, pump house/manifold, food workshop/silos/packing belt, riverside filtration basins/waterwheel, bone-framed marrow nursery, and a lymph rotunda with antibody benches. The valley contains 50 trees/rocks (previously 101) and 11 decorative cottages (previously 15). CC0 roofs, walls, mills, stalls and carts are reused without new model downloads.

Normal scenarios begin with 54 cells: 18 RBCs, 10 neutrophils, 6 macrophages, 6 fibroblasts, 4 dendritic cells, 3 helper T cells, 3 plasma cells and 4 platelets. The fragile scenario retains 4 neutrophils. The original 2D roster and rules stay unchanged.

Helper T cells collect known antigen information at the lymph district and carry a short-lived support signal to the defense rally (+15% base immune damage there). Plasma cells travel to work benches, consume local nutrition and produce target antibodies only after antigen information arrives. Platelets travel to damaged barriers/tissue and perform small emergency repairs. These are game abstractions. Recruitment, optional lifetimes, saving and replacement support all eight jobs. Existing 3D saves are upgraded once while retaining time, objectives, facilities and in-flight shipments; RBC numbers decrease by approximately 20% and missing starting specialists join the city.

All visible cells correspond to simulation cells. Oxygen backpacks follow RBC cargo; immune cells patrol and respond to infections; dendritic cells carry antigen; fibroblasts repair and produce materials. Delivery couriers/carts represent actual engine shipments, not additional population. Cell selection shows the current engine task. Drug selection, recruitment, objectives, lifetimes, scenarios, towers and upgrades use the existing HTML UI and engine.

The 3D pilot enables `workCrews`: a fibroblast claims a construction site, follows the circulation network to it, waits for the shipment, then works. Both materials and a living worker must be present for the construction timer to advance. A retired worker can be replaced. The original 2D mode retains its previous construction behaviour.

## Visible work cycles (v0.48.0)

- Oxygen carriers dock at a filling port, lift or put down a tank over 0.75 seconds, and transfer actual oxygen at the end. Couriers load at the gut workshop, steer carts with their walking direction, unload at a district counter, then leave with an empty cart. Construction and recruitment supplies become available only after unloading.
- Fibroblasts face their work site and swing a complete hammer around the gripping hand. Small chips accompany each strike; the scaffold fills as the real construction timer advances. No work animation runs while materials or a worker are missing. Routine repair crews distribute across damaged districts; material production happens at marrow benches.
- Plasma cells occupy six distinct standing places around three benches. A 1.2-second stirring/filling cycle reserves local nutrition and produces a real antibody batch on completion. A small gold Y rises from the vial. Waiting for antigen or nutrition stops this motion. Active cycles and reserved nutrition survive save/resume without duplicated output.
- Neutrophils face their target, brace, recoil and fire a short readable projectile. Macrophages reach and lunge to engulf instead. Platelets press down patches, helpers raise a signal flag, and debris collection has a short scooping motion.

World-space work bays maintain 0.8–0.95 metre separation and 0.65–0.75 metre arm reach (1.15 metres for a cart counter). The inverse sector transform converts these anchors to simulation coordinates. Facilities and actors use the same anchors. Three redundant parked carts and three independently animated bench vials were removed. New fixed fittings are baked with existing scenery; construction frames were reduced to two meshes per active site.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | Left drag / arrow keys | One finger drag |
| Zoom | Wheel / + − | Two finger pinch / + − |
| Rotate | Right drag / Q E / ↶ ↷ | Two finger rotation / ↶ ↷ |
| Whole town | Home / 전체 | 전체 |
| Inspect | Click a facility label or cell | Tap |

Orthographic camera, damped panning and rotation, interpolated cursor-centred wheel zoom, bounded tilt/yaw/translation. Opening a district panel does not focus the camera. Mobile starts closer to lung and heart; whole-town view reveals the surrounding valley.

## Assets and delivery

- [Kenney Fantasy Town Kit 2.0](https://kenney.nl/assets/fantasy-town-kit): CC0, 25 selected modular models and a shared palette, original license included.
- [Three.js 0.180.0](https://github.com/mrdoob/three/tree/r180): MIT. ES modules, OrbitControls, GLTFLoader, BufferGeometryUtils and license vendored locally.
- `scripts/vendor-city3d.mjs` reproduces the import from official archives, records archive SHA-256 in `assets/city3d/sources.json`, and rewrites addon imports to local paths. Archives are processed in memory. No Blender, external CDN, runtime package server or new npm dependency.
- `scripts/build.mjs` copies the asset folder to GitHub Pages. Three.js and models load only on entering the 3D route and are cached on demand by the service worker. Existing modes do not load the 3D dependency graph.
- WebGL/asset failures have a visible retry or original-city link; GPU resources, observers and listeners are released on route exit. Local development bypasses service-worker response caching.

## Rendering budget

The models/palette/license/provenance total about 528 KB; the Three.js runtime/addons/license total about 910 KB (uncompressed). Custom scene code is additional. A mobile-width browser observation in v0.47.0 showed approximately 73k rendered triangles and 53 draw calls during play, compared with 89–90k triangles in the initial v0.46.0 scene. Visible machinery, construction, combat and supply overlays affect these counts.

Static scenery is merged by material. Eight cell silhouettes and couriers share 16 instanced part/effect batches, with lower-detail face and limb geometry and active-range instance buffer uploads. Simulation ticks at 30 Hz independently of rendering. No post-processing, physics engine, skeletal animation, per-cell DOM elements or per-frame route search.

| Budget | Narrow view | Desktop view |
| --- | --- | --- |
| Rendering cap | 30 fps | 60 fps |
| Pixel ratio cap | 1.35 | 1.75 |
| Shadow map | 512² | 1024² |
| Shadow refresh | 5 Hz | 5 Hz |
| Simulation population cap | 96 | 96 |

The desktop in-app browser observed roughly 49 fps at 1280×800 and 30 fps at a 390×844 viewport during play. These are development-machine measurements with viewport resizing, not physical-phone benchmarks. Paused scenes render only as needed (with a low-frequency refresh).

## Extension points

- `city-activity.mjs`: shared work stations, bounded activity records and cycle progress for rendering and saveable simulation handoffs.
- `city-three-layout.mjs`: semantic district sites, transformed roads, courtyard/building separation, cottage placements and quality budgets. The continuous sector transform maps the existing simulation's routes and actors into a new world layout. Tests check anchor alignment and continuity at sector boundaries.
- `city-three-village.mjs`: district construction, static scenery batching, working machinery, construction sites, upgrade additions and supply layer. Replace an outpost here to expand one organ without rebuilding simulation/UI.
- `city-three-facilities.mjs`: the six organ facilities, reused CC0 modules, static machinery and a bounded set of animated parts driven by city state.
- `city-three-actors.mjs`: pooled instanced cells, couriers, pathogens, combat effects and selection rings. Each visible role has a distinct colour, cap and equipment. Working poses use a bounded per-actor activity record and existing instanced rods, boxes and rings.
- `city-three-renderer.mjs`: camera, picking, labels, asset lifecycle and the 3D frame loop.
- `city-three-ui.mjs`: renderer/loop/save-key injection into the shared `createCityGame`.

## Verification

Focused engine/layout/asset tests cover route isolation, continuous projection, real delivery/construction/combat, waiting for workers, save restoration and all external GLB texture dependencies. Browser checks cover original/3D switching, separate saved progress, construction delivery completing an upgrade, cell inspection, selection highlighting, camera drag/wheel/rotation/fit and overflow at desktop, portrait and landscape dimensions. Touch mappings use OrbitControls; physical multitouch hardware was not available for this check.

The v0.47.0 specialist tests additionally cover one-time save upgrades, antigen-dependent production, the absence of production without plasma cells, delivered helper signals, platelet arrival/repair, new-job retirement/replacement, deterministic save continuation and a shared actor triangle budget below 40k for the starting roster. Mobile-width checking at 390×844 verified 30 fps, the two-page roster, location highlighting and recruitment, with no page or management-panel overflow. This is a desktop browser viewport check, not a physical-phone benchmark.

The v0.48.0 activity checks cover real handoff timing, antigen/nutrition-gated completion, mid-cycle save continuation, construction waiting, separate firing/engulfing poses, transformed bench spacing and finite instance buffers during a 75-second work/combat simulation. The active actor geometry stays below 43k triangles in that scenario, using the same 16 batches. No new model, texture, dependency, light, skeleton, physics or particle system is downloaded. Short Y marks, impacts and shots use existing batches and capped view-dependent sizing.

At 390×844 on the development computer, the final workshop view observed 30 fps, 43 draw calls and about 71k rendered triangles. Counts vary with the view, shadow refresh and active jobs; this is not a physical-phone benchmark. A real browser recovery scenario completed with 36 pathogens defeated and 84 deliveries at 4:55, and continued into free operation.

The v0.48.1 finishing pass opens the construction frame, keeping the hammer, worker and growing material stack visible from the default camera.
