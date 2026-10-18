# Cell City 3D pilot · v0.46.0

Entry: `#city3d`. The original `#city` remains available. The two games use separate local saves: `pathopedia:cell-city:3d:v1` and `pathopedia:cell-city:v1`. No save is imported, migrated, or deleted when switching views.

## Playable scope

The wind harbour and pump square are the detailed lung and heart neighbourhoods. Four smaller outposts keep the gut, kidney, marrow and lymph services connected to the same simulation. The landscape is a continuous valley with a river, hills, winding streets, courtyards, cottages, markets and trees. It does not reuse the old rectangular canvas layout.

All visible cells correspond to simulation cells. Oxygen backpacks follow RBC cargo; immune cells patrol and respond to infections; dendritic cells carry antigen; fibroblasts repair and produce materials. Delivery couriers/carts represent actual engine shipments, not additional population. Cell selection shows the current engine task. Drug selection, recruitment, objectives, lifetimes, scenarios, towers and upgrades use the existing HTML UI and engine.

The 3D pilot enables `workCrews`: a fibroblast claims a construction site, follows the circulation network to it, waits for the shipment, then works. Both materials and a living worker must be present for the construction timer to advance. A retired worker can be replaced. The original 2D mode retains its previous construction behaviour.

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

The models/palette/license/provenance total about 528 KB; the Three.js runtime/addons/license total about 910 KB (uncompressed). Custom scene code is additional. The prototype has approximately 89–90k rendered triangles and 46–49 draw calls in the initial city; visible machinery, construction and supply overlays affect this count.

Static scenery is merged by material. All cells and shipments use instanced bodies, faces, cargo and equipment. Simulation ticks at 30 Hz independently of rendering. No post-processing, physics engine, skeletal animation, per-cell DOM elements or per-frame route search.

| Budget | Narrow view | Desktop view |
| --- | --- | --- |
| Rendering cap | 30 fps | 60 fps |
| Pixel ratio cap | 1.35 | 1.75 |
| Shadow map | 512² | 1024² |
| Shadow refresh | 5 Hz | 5 Hz |
| Simulation population cap | 96 | 96 |

The desktop in-app browser observed roughly 49 fps at 1280×800 and 30 fps at a 390×844 viewport during play. These are development-machine measurements with viewport resizing, not physical-phone benchmarks. Paused scenes render only as needed (with a low-frequency refresh).

## Extension points

- `city-three-layout.mjs`: semantic district sites, transformed roads, courtyard/building separation, cottage placements and quality budgets. The continuous sector transform maps the existing simulation's routes and actors into a new world layout. Tests check anchor alignment and continuity at sector boundaries.
- `city-three-village.mjs`: district construction, static scenery batching, working machinery, construction sites, upgrade additions and supply layer. Replace an outpost here to expand one organ without rebuilding simulation/UI.
- `city-three-actors.mjs`: pooled instanced cells, couriers, pathogens, combat effects and selection rings. Each visible role has a distinct colour, cap and equipment.
- `city-three-renderer.mjs`: camera, picking, labels, asset lifecycle and the 3D frame loop.
- `city-three-ui.mjs`: renderer/loop/save-key injection into the shared `createCityGame`.

## Verification

Focused engine/layout/asset tests cover route isolation, continuous projection, real delivery/construction/combat, waiting for workers, save restoration and all external GLB texture dependencies. Browser checks cover original/3D switching, separate saved progress, construction delivery completing an upgrade, cell inspection, selection highlighting, camera drag/wheel/rotation/fit and overflow at desktop, portrait and landscape dimensions. Touch mappings use OrbitControls; physical multitouch hardware was not available for this check.
