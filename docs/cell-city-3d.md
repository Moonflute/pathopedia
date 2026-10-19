# Cell City 3D village · v0.49.0

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

## Individual observation (v0.49.0)

Tap a cell or supply courier to show its job/number, current task, destination and actual cargo. A teal ground ring and small marker distinguish that individual from the gold role highlights. Toggle **따라가기 ON/OFF** to follow smoothly without changing the zoom or view angle. Zoom and rotation stay available; a map drag, arrow-key pan or whole-town view turns following off while retaining the selected unit. Closing the inspector or tapping empty ground clears it. Retirement, courier departure and a newly created city also end observation; view selection is never saved into the simulation.

The camera uses the existing MIT OrbitControls and moves its position and target together with frame-rate-independent easing. On narrow screens it leaves room above the inspector and any management sheet. One stable HTML card refreshes changed text at most five times per second; there are no per-cell DOM nodes or new assets. Selection uses the existing instanced ring/badge batches, so the actor batch count remains 16. Destination labels use real job/route state instead of the stale district target carried by some jobs. Empty returning RBCs point to the lung; a plasma recipe is not reported as carried antigen; unloaded couriers show empty cargo.

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | Left drag / arrow keys | One finger drag |
| Zoom | Wheel / + − | Two finger pinch / + − |
| Rotate | Right drag / Q E / ↶ ↷ | Two finger rotation / ↶ ↷ |
| Whole town | Home / 전체 | 전체 |
| Inspect | Click a facility label, cell or courier | Tap |
| Follow selected unit | 따라가기 ON/OFF | 따라가기 ON/OFF |

Orthographic camera, damped panning and rotation, interpolated cursor-centred wheel zoom, bounded tilt/yaw/translation. Opening a district panel does not focus the camera. Mobile starts closer to lung and heart; whole-town view reveals the surrounding valley.

## Assets and delivery

- [Kenney Fantasy Town Kit 2.0](https://kenney.nl/assets/fantasy-town-kit): CC0, 25 selected modular models and a shared palette, original license included.
- [Three.js 0.180.0](https://github.com/mrdoob/three/tree/r180): MIT. ES modules, OrbitControls, GLTFLoader, BufferGeometryUtils and license vendored locally.
- `scripts/vendor-city3d.mjs` reproduces the import from official archives, records archive SHA-256 in `assets/city3d/sources.json`, and rewrites addon imports to local paths. Archives are processed in memory. No Blender, external CDN, runtime package server or new npm dependency.
- `scripts/build.mjs` copies the asset folder to GitHub Pages. Three.js and models load only on entering the 3D route and are cached on demand by the service worker. Existing modes do not load the 3D dependency graph.
- WebGL/asset failures have a visible retry or original-city link; GPU resources, observers and listeners are released on route exit. Local development bypasses service-worker response caching.

## Rendering budget

The models/palette/license/provenance total about 528 KB; the Three.js runtime/addons/license total about 910 KB (uncompressed). Custom scene code is additional. A mobile-width browser observation in v0.47.0 showed approximately 73k rendered triangles and 53 draw calls during play, compared with 89–90k triangles in the initial v0.46.0 scene. Visible machinery, construction, combat and supply overlays affect these counts.

Static scenery is merged by material. Eight cell silhouettes and couriers share 16 instanced part/effect batches, with lower-detail face and limb geometry and active-range instance buffer uploads. Simulation ticks at 30 Hz independently of rendering. Previous/current positions and the animation clock are interpolated for cells, couriers and pathogens; picking and the follow camera use those same displayed positions. No post-processing, physics engine, skeletal animation, per-cell DOM elements or per-frame route search.

| Budget | Narrow view | Desktop view |
| --- | --- | --- |
| Rendering target | 60 fps | 60 fps |
| Pixel ratio cap | 1.35 | 1.75 |
| Shadow map | 512² | 1024² |
| Shadow refresh (initial quality) | 5 Hz | 5 Hz |
| Simulation population cap | 96 | 96 |

Automatic quality adjustment samples active rAF cadence in two-second windows. Sustained overload lowers pixel ratio first, then shadow resolution/refresh (2.5 Hz), then turns shadows off. Only after those steps can the renderer fall back to 30 fps. Stable headroom for at least 12 seconds restores one step at a time, with a two-second settling period after each change. Loading, layout rebuilds, pauses, hidden tabs and long interruptions are excluded. The quality level is session-local and does not change population, assets, gameplay timing or saved cities. Environment/settings shows actual fps, target fps, DPR and shadow size.

On the development computer, the 60 fps implementation observed 60 fps at a 390×844 viewport, DPR 1.00, 512² shadows, about 28–30 draw calls and 71–76k rendered triangles in the saved simulation city. At 1280×720 it also observed 60 fps with 1024² shadows. Neither viewport overflowed, and no browser errors were reported during follow, double speed, pause or edit/cancel transitions. These are desktop browser checks, not physical-phone benchmarks. Paused scenes still render only as needed, with a low-frequency refresh. Existing historical measurements below predate the 60 fps change.

`tests/city-three-performance.test.mjs` checks gradual degradation/recovery, interruption handling, pacing on 60/90/120/144 Hz screens, fixed simulation timing, shared interpolated picking positions, unchanged save data, double speed/catch-up, pause, spawning, teleports and layout/run replacement. Snapshots are bounded to the existing actor caps; no new meshes, textures or dependencies are added. The 60 fps renderer ships alongside the square-tile editor in v0.54.0.

## Extension points

- `city-activity.mjs`: shared work stations, bounded activity records and cycle progress for rendering and saveable simulation handoffs.
- `city-three-layout.mjs`: semantic district sites, transformed roads, courtyard/building separation, cottage placements and quality budgets. The continuous sector transform maps the existing simulation's routes and actors into a new world layout. Tests check anchor alignment and continuity at sector boundaries.
- `city-three-village.mjs`: district construction, static scenery batching, working machinery, construction sites, upgrade additions and supply layer. Replace an outpost here to expand one organ without rebuilding simulation/UI.
- `city-three-facilities.mjs`: the six organ facilities, reused CC0 modules, static machinery and a bounded set of animated parts driven by city state.
- `city-three-actors.mjs`: pooled instanced cells, couriers, pathogens, combat effects and selection rings. Each visible role has a distinct colour, cap and equipment. Working poses use a bounded per-actor activity record and existing instanced rods, boxes and rings.
- `city-cell-observer.mjs`: read-only task/destination/cargo summaries, selection lifetime and smooth follow translation.
- `city-three-renderer.mjs`: camera, picking, the single observation card, labels, asset lifecycle and the 3D frame loop.
- `city-three-ui.mjs`: renderer/loop/save-key injection into the shared `createCityGame`.

## Verification

Focused engine/layout/asset tests cover route isolation, continuous projection, real delivery/construction/combat, waiting for workers, save restoration and all external GLB texture dependencies. Browser checks cover original/3D switching, separate saved progress, construction delivery completing an upgrade, cell inspection, selection highlighting, camera drag/wheel/rotation/fit and overflow at desktop, portrait and landscape dimensions. Touch mappings use OrbitControls; physical multitouch hardware was not available for this check.

The v0.47.0 specialist tests additionally cover one-time save upgrades, antigen-dependent production, the absence of production without plasma cells, delivered helper signals, platelet arrival/repair, new-job retirement/replacement, deterministic save continuation and a shared actor triangle budget below 40k for the starting roster. Mobile-width checking at 390×844 verified 30 fps, the two-page roster, location highlighting and recruitment, with no page or management-panel overflow. This is a desktop browser viewport check, not a physical-phone benchmark.

The v0.48.0 activity checks cover real handoff timing, antigen/nutrition-gated completion, mid-cycle save continuation, construction waiting, separate firing/engulfing poses, transformed bench spacing and finite instance buffers during a 75-second work/combat simulation. The active actor geometry stays below 43k triangles in that scenario, using the same 16 batches. No new model, texture, dependency, light, skeleton, physics or particle system is downloaded. Short Y marks, impacts and shots use existing batches and capped view-dependent sizing.

At 390×844 on the development computer, the final workshop view observed 30 fps, 43 draw calls and about 71k rendered triangles. Counts vary with the view, shadow refresh and active jobs; this is not a physical-phone benchmark. A real browser recovery scenario completed with 36 pathogens defeated and 84 deliveries at 4:55, and continued into free operation.

The v0.48.1 finishing pass opens the construction frame, keeping the hammer, worker and growing material stack visible from the default camera.

The v0.48.2 inspector reports total construction completion for builders; loading and production show their own current cycle progress.

The v0.49.0 focused checks cover oxygen loading/delivery/empty return, antigen carriers versus production recipes, total construction progress, real combat destinations, courier loading/unloading, selection removal/reset, and equal easing at the 30/60 fps caps. At a 390×844 browser viewport, follow plus zoom/rotation observed 30 fps and no page overflow on the development computer; this is not a physical-phone benchmark.

## Skin perimeter and connected fronts (v0.50.0)

The northern hillside now opens into a respiratory channel. Its mucus/cilia machinery is independent of the 14 skin-wall segments around the town. Intact skin blocks entry while being attacked; only an open segment admits skin enemies. Repair closes that entrance but does not remove enemies that already crossed. Skin wounds, respiratory exposure and contaminated food use different routes and responses. The existing 2D city and separate 3D save remain available.

The **방어** panel contains fronts, support plots and warnings. A warning or location button focuses that site above the mobile management sheet. Ordinary district selection still leaves the camera in place. The skin workshop reserves eight materials, receives a real delivery, assigns a fibroblast, carries supplies along the patrol road, then repairs on site. Forward depots receive food, medicine and materials; nearby fighters use those stocks. Their dispatch preparation shares the fibroblast workforce with repairs and facility construction. Unprepared front cargo waits outside the shared loading bay so it cannot block construction deliveries when every builder is occupied.

Each district has two support plots. Barrier upgrades strengthen its three nearest wall segments, sensing extends early wound warnings, supply expands local food reserves and the connected front depot, and production opens more work positions. Added modules are visible. The starting scenery cap is reduced from 50 to 36; no additional RBCs or repeated cottages were added. Four existing cottages now represent tissue blocks that react to supply, infection and repair.

Oxygen ports, workbenches, cargo docks and waste unloading have ticketed reservations and distinct queue positions. Retirement/departure releases the reservation. Stored food, medicine, raw ingredients and repair materials drive the capped crate displays. Facility lamps and machinery distinguish normal operation, shortage, congestion and damage. Marrow production bays follow individual recruitment orders; the lymph node has antigen reception and response-preparation stages. Macrophages carry up to three debris pieces to the renal collection bin for processing. The observer shows the next task and wait reason; waiting cells make small idle movements. Front-facing skin walls lower with camera rotation, and tap selection checks geometry occlusion. Fire/smoke pools and a health/inflammation sky tint add damage feedback.

### Resource and verification record

- Existing local Kenney CC0 models/palette (528,096 bytes) and Three.js MIT runtime/addons (910,135 bytes) reused. No new image, GLB, texture, dependency, post-processing, light, skeleton or physics download.
- Actor rendering remains 16 fixed instanced batches. Seven additional bounded batches contain the entire dynamic perimeter, support modules, crates, cilia and tiny damage effects. Fire: 36 flame instances / 24 smoke instances maximum. Scene decorators are kept separate from destructible state.
- Procedural static geometry now shares vertex colors and common materials; the Kenney atlas and season-tinted ground remain separate. This reduces draw calls despite the larger scene. Mobile bodies/hats use slightly fewer segments. Pixel-ratio, frame-rate and shadow limits remain unchanged. Couriers are capped at 48 in the simulation as well as rendering.
- On the development computer at a 390×844 browser viewport, steady play observed 30 fps, 31–35 draw calls and about 70–71k rendered triangles. These are desktop browser measurements at mobile dimensions, not physical-phone benchmarks. Counts depend on camera, overlays, active jobs and shadows.
- No page or management-panel scrolling at 390×844, 740×420 or 640×360. Browser checks covered wound orders, delivered repair completing at 100/100, location focus, mucus/cilia control, support-plot construction, observer next/wait fields and error-free model loading.
- Focused checks cover closed/open/repaired skin entry, real workforce/material requirements, deterministic in-progress saves and migration, FIFO reservations and retirement, airway expulsion, the food-production cost of quarantine, workforce competition without dock deadlock, two-slot investment limits, antigen/debris/recruitment stages and bounded finite instance buffers. A 90-second simulation took about 0.37–0.44 seconds in Node on the development computer, excluding rendering; dynamic frontier geometry measured 4,822 triangles in the damaged/max-level check.

This remains a lightweight game model: fixed expansion plots, waypoint roads and reserved workstations rather than free-form building placement or general pedestrian collision/pathfinding. Clinical timings and resource quantities are game abstractions.


## Infection and intervention simulation (v0.51.0)

The 3D simulation now tracks local pathogen burden, inflammation, toxin burden, isolation, and drug distribution separately from the visible invaders. Infection persists after a representative invader is killed. High tissue burden can spread through the central circulation; a bounded flow marker shows each transfer. Clearing burden leads into resolution, including residual inflammation, toxin clearance and macrophage debris handling. The recovery objective additionally requires suppressed infection and resolving inflammation/toxins. These relative quantities and accelerated timings are game rules, not fitted physiological or clinical parameters.

Neutrophils and macrophages use phagocytosis, lose activity and membrane integrity under local stress, and can withdraw to a three-place recovery station. Irreversible loss leaves cell debris for macrophage clearance, without falsely registering a pathogen antigen. The recovery station and player-controlled isolation/response orders are management metaphors; they are not literal anatomical treatment sites. Orders support automatic response, bounded district defense, frontline support, and rear recovery. Selection shows current activity and cell condition. Antibodies progressively mark invaders and increase nearby phagocyte clearance; they no longer cause global remote damage. The model does not yet simulate complement, intracellular infection, B-cell clonal expansion, organ-specific pharmacokinetics or immune-cell subsets beyond the existing roster.

The Simulation scenario has no scheduled waves, automatic wound, time limit, victory or failure. Six curated pathogen records are selectable: SPN-105, SAU-001, SAU-002, ECO-009, GNX-220 and CDF-121. Available entry routes are constrained per record; skin exposure still requires a breached segment, airway exposure still encounters mucus/cilia, and C. difficile stays in the intestinal compartment and produces a local toxin state. An independent wound control introduces no extra pathogen. Concurrent visible/pending introductions are capped at 32.

Antibiotics arrive as physical supply shipments and become active only after unloading. Ampicillin supports oral/IV forms in this prototype, oxacillin the IV form, and vancomycin oral/IV forms. Oral ampicillin enters the blood after absorption. Oral vancomycin stays in the intestinal compartment; IV vancomycin is not substituted for intestinal treatment. IV supply enters the central blood pool and reaches districts with a perfusion-dependent delay. Pools decay with simplified clearance. No mg, dose recommendation, treatment duration or therapeutic target is calculated. Routine scenarios retain optional automatic IV resupply; Simulation starts with empty drug stores and manual resupply. Legacy 2D weapon behavior is retained independently.

The fixed isolate AST records remain the source for drug activity: only unqualified S enables the generic effect. REGIMEN is not converted into S. The explicit CDF-121/vancomycin/oral/intestinal exception uses the existing route-specific regimen record, and does not activate IV treatment. R, I, absent and other context-limited results do not get silently treated as susceptible.

Mechanism references (checked 2026-10-19):
- [Janeway: front line of host defense](https://www.ncbi.nlm.nih.gov/books/NBK27105/) — epithelial defense, phagocytosis, local inflammatory recruitment and adaptive response.
- [Janeway: complement and innate immunity](https://www.ncbi.nlm.nih.gov/sites/books/NBK27100/) — opsonization and phagocytic recognition. Complement is background rationale, not a newly implemented subsystem.
- [DailyMed: ampicillin capsules](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=643d9208-f086-15da-e053-2a91aa0ac100) — oral absorption, tissue distribution and renal elimination.
- [DailyMed: oxacillin injection](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d893e45b-7f18-4c67-b10c-1e2e52a6b3ef) — the supported IV formulation.
- [DailyMed: vancomycin capsules](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=fac438bd-e08f-438d-ab64-426fc5c5450e&version=3) — local oral treatment and limitations of substituting parenteral treatment. Potential systemic absorption in special circumstances is not modeled.

Performance: biology and pharmacology update at 2 Hz with six fixed districts and six bounded strain slots per district. Moving actors retain the existing simulation rate. Blood-spread markers are capped at 12; no new image, model, texture, animation rig, external dependency, mesh batch, light or physics engine is introduced. The existing Kenney CC0 assets and Three.js MIT modules are reused. The initial 40-check run passed; the subsequent 21-check run covering the final barrier-entry, recovery-start and physiology changes also passed; its 90-second frontier simulation completed in about 615–725 ms on the development machine, excluding rendering. The same seven frontier batches used 4,994 triangles in its damaged/max-level fixture.

Browser verification: no document or treatment-panel overflow at 390×844 and 1280×800. Manual exposure, IV delivery, oral vancomycin delivery, response orders and save/resume were checked through the UI, with no console errors. The development computer at mobile viewport dimensions observed the existing 30 fps limit, 29–34 draws and approximately 70–75k rendered triangles; this is not a physical-phone benchmark. Runtime source grows by about 33.4 kB, with zero new asset bytes.

## Editable village layout: v0.51.0 design assessment (historical)

Editing the layout is feasible, but a drag-and-drop editor is not part of v0.51.0. The current projection derives 3D positions from a fixed six-sector logical map, and the bespoke facility machinery still has absolute coordinates in city-three-facilities.mjs. Moving only SITES would therefore detach buildings, working points, roads, intake machinery and supply props. Arbitrarily exchanging sectors can also invalidate the coordinate transform.

The proposed layout format separates:
1. Stable organ IDs and gameplay state, which survive rearrangement.
2. District transforms plus facility-local sockets: entrance, oxygen ports, cargo dock, workbench, recovery station and expansion plots.
3. Semantic road edges connecting socket IDs, with distinct pedestrian, pulmonary, systemic and patrol types and authored bend points.
4. Perimeter segments, airway/food/IV entry nodes, river and decorative props; optional landscape bounds are independent of organ state.

A layout compiler should validate socket references, connected circulation, working clearances, perimeter/entry consistency and terrain constraints, then cache routes and rebuild merged static geometry once when an edit is applied. Preview should pause simulation; commit should migrate actors to the new route graph, release/reissue workplace reservations, and preserve resources, pathogen burden and shipment IDs. Cancel should retain the old compiled layout. Saving needs a separate layout revision alongside the simulation save, plus validation and a default-layout fallback.

Implementation order: convert one facility to local coordinates and shared sockets; replace the fixed sector projection with a layout-owned route graph; migrate all six facilities and boundary systems; then add a paused editor with grid snapping, undo/redo and layout import/export. This keeps per-frame work similar: editing incurs an occasional rebuild, not continuous pathfinding or scene regeneration. Until those migrations are complete, the current map remains intentionally fixed.


## Square-tile village editor (v0.52.0)

The 3D city now places six organ facility complexes, the skin-repair workshop and eleven cottages on a one-world-unit square grid. A cottage uses 3×3 cells; larger facilities include their courtyard and working space. Existing 3D saves migrate once to a connected default layout without restarting the simulation. The original 2D city remains separate.

Open **▦ 배치** to pause the city. Drag a facility, use the one-cell arrow controls, or rotate it in 90-degree steps. R / Shift-R rotate on a focused canvas; Ctrl/Cmd-Z and Shift-Z undo/redo. Empty-ground dragging pans; wheel or two-finger pinch zooms. The facility list selects and focuses an item. Temporary storage frees its footprint while rearranging a crowded area; all stored facilities must be placed before saving. Undo/redo retains up to 30 steps. Cancel leaves the running layout unchanged. Save validates placement and connectivity, writes the complete save successfully, then applies it; a storage error keeps the draft open. Layouts are saved in this browser with the city's existing save, not synced between devices.

Facilities move as functional complexes: their authored building, courtyard, machinery, ports and workstations rotate together. Pulmonary and systemic circulation, external intake and cottage/workshop walking links are rebuilt automatically. Overlapping footprints, blocked entrances, river/perimeter conflicts and disconnected links are rejected. Actor routes are reissued while health, inventory, infection, shipment identities and job progress persist. Workplace tickets and reservations remain attached to the same workers. District alerts, tissue-repair targets and logistics destinations follow the moved facilities.

The river, skin perimeter, respiratory gate and food gate remain fixed landscape features. This version rearranges the existing 18 facilities; it does not add/delete buildings, edit individual wall segments, paint roads manually or import/export layouts. Internal work movements use existing approach waypoints rather than general pedestrian collision avoidance. Future buildable types can declare a footprint, rotation and port. Grid topology is isolated in city-tile-layout.mjs, but hex-grid migration would still require new occupancy, rotation, routing and save-conversion rules.

### Implementation and resource budget

- city-tile-layout.mjs stores versioned per-city tile layouts, transforms, occupancy constraints and cached connections. The original invertible projection stays intact; facility-local transforms map through it, so two city saves do not share mutable layout state.
- city-layout-editor.mjs owns a separate draft and history. city-three-editor.mjs draws the grid as one line geometry and the selected footprint as one bounded instanced batch.
- Static models and tile paving merge by material. In the editor only the selected facility has its own small baked mesh group (at most four meshes in the focused check). Dragging changes its transform; it does not rebuild the town every pointer move. Selection and committed draft changes rebuild once.
- Road searches are cached by immutable layout and bounded to 2,400 explored cells per connection. Simulation frames reuse those routes. Undo history, footprint instances and searches are bounded.
- Existing Kenney CC0 models/palette and Three.js MIT modules are reused. No new model, image, texture, dependency, light, rig or physics package. Runtime source increases by approximately 37 kB uncompressed. Decorative trees/rocks are capped at 26 instead of 36. No cells or cottages were added.
- Development-browser observations: approximately 32–33 draw calls / 75k triangles during desktop play, and 24–27 calls / 40–41k triangles while editing. Counts vary with camera, selected facility and shadow refresh. Existing frame-rate, pixel-ratio and shadow limits remain. This is a desktop browser measurement, not a physical-phone benchmark.

### Verification

Eight focused layout checks cover default connectivity/occupancy, all four rotations, draft isolation and undo/redo, state-preserving relocation and deterministic save continuation, one-time medicine delivery, bounded selected geometry temporary-storage validation and an active tissue repair following its moved house. Existing engine, specialist, frontier, biology and renderer checks passed in the initial focused run. Browser checks covered an old saved city migrating, canvas dragging, rotation, temporary storage and re-placement, save/reload continuation, cancellation and resumed simulation. The editor has no page/panel overflow at 390×844 or 740×420; the compact landscape panel is 132 px high. No browser errors were observed. Touch gesture code is implemented; physical multitouch hardware was not available.

The interaction reference was Supercell's [Clash of Clans interface update](https://supercell.com/en/games/clashofclans/blog/news/weve-revamped-the-clash-of-clans-user-interface/): clear edit selection and explicit layout confirmation. No Supercell artwork or game assets are included.
