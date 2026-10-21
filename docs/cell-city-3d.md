# Cell City 3D village · v0.63.0

## Selectable city themes (v0.63.0, 2026-10-22)

The header's **설정** button opens **테마 1 · 기존 마을** and **테마 2 · 혈관 수로 도시**. Theme 1 remains the default. The choice is stored under `pathopedia:cell-city:3d:theme:v1`, independently of the city save; changing themes preserves placements, elapsed time, cells, cargo, jobs, infection state and resources.

Theme 2 now has a directed vascular network compiled from the saved placements. Paired arteries and veins branch from the heart, pass through thinner organ exchange beds, and return. The pulmonary circuit uses a separate preferred corridor; its artery carries the low-oxygen colour and its vein the oxygen-rich colour. Coral/blue water ribbons and one-way current arrows show the two streams. Continuous stone blocks and quay edges make the channels readable; local loading stations, house entrances and perimeter access remain connected. Terracotta roofs, arched windows, balconies and striped mooring posts reuse the Venice treatment. No pedestrian bridges are added.

RBCs and internal freight couriers follow the directed graph for long-distance travel in Theme 2. Local loading/work movements and external intake retain their existing access routes. Theme switching rejoins the chosen network on the next simulation step without teleporting or resetting cargo or work. The transport selection is runtime state, independent of the save. Theme 1 and the original 2D simulation retain their road navigation. Editing a saved building recompiles its vascular routes and quays. Currents stop with simulation time.

The renderer reuses the local MIT Three.js runtime and CC0 Kenney roofs/chimneys and RG Poly machinery/props. No downloaded models, new textures or runtime dependencies are required. The sixteen actor batches are retained. The circulation is a game routing abstraction, without pressure/fluid dynamics or separate progression slots.

Focused checks: 14 tests in `city-themes.test.mjs` and `city-layout.test.mjs` pass, covering directed circulation, building clearance, water coverage, oxygen delivery after save/resume, switching without teleportation, and existing layout/moving-shipment behaviour. Browser checks cover theme selection, persistence, mobile controls and the vascular revision in an existing saved city. The release uses the GitHub Pages workflow for full tests, build and deployment. Previews: `city-redesign/12-theme-2-canals.jpg` (initial treatment), `city-redesign/13-theme-2-vascular.jpg` (vascular revision).

Current immune behavior is described in [Immune network](#immune-network-2026-10-22-v0620). Earlier sections record the preceding models.

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


## Expanded town (v0.60.0, 2026-10-22)

The perimeter is now 80 × 72 world units (4,596 square units: exactly four times the previous area). The normal buildable grid contains 3,932 cells. `city-world.mjs` owns bounds, entrance anchors and actor budgets; editor grid, camera bounds/follow, river and perimeter use that shared extent.

A new layout contains 54 facilities: six organs, the skin workshop, 35 houses, six supply depots and six production workshops. The editor adds houses, depots and workshops, removes optional buildings, and retains drag/rotation, undo/redo, cancel and validated saves. Added houses raise population capacity by four, starting at 192 and reaching 256. Each organ supports up to two added depots and two workshops. Required original facilities remain present. Supplemental docks and work bays use the added buildings' transformed anchors and connected walking roads.

New normal 3D cities start with 108 cells; the fragile roster has 96. Existing cities retain their cells, clock, stocks, shipments and all original building positions during one-time layout migration. Version 2 saves retain optional buildings and accept more than 200 workers. Expanded shipment/pathogen limits are 96/64, with six recruitment orders and up to nine production/oxygen slots per organ. Travel uses a 1.65 factor to accommodate longer roads. Original 2D rules and its save key remain separate.

Static scenery is merged by material within 16-unit regions. Offscreen cells, couriers, pathogens and debris skip their display-instance updates while simulation and follow snapshots continue. Workplace occupancy uses an index per simulation tick. Existing local Kenney/RG Poly assets and Three.js are reused; no new media or dependencies were downloaded.

Focused checks cover original work cycles, construction/delivery, reservations, editable layouts, migration, optional building save/undo/removal, secondary dock anchors, 210-worker saves, camera bounds and offscreen rendering. In a 60-second new-city simulation, 108 workers completed an organ upgrade and 23 deliveries, including 18 units of medicine, with district oxygen between 88 and 100. Browser checks covered a migrated city, add/remove/save/reload, and the editor at 390 × 844. The development browser observed 60 fps with a whole-town view of the migrated city, DPR 1.00, 1024 shadows, approximately 125 draws and 240k triangles; this is not a physical-phone benchmark.

## Living workshop redesign (2026-10-22)

### TASK 01 — baseline

The baseline is production commit `1f8498b` (v0.60.0). Reference images are retained in `docs/city-redesign/`: `01-before-desktop.jpg` (1280×800) and `01-before-mobile.jpg` (390×844). The visible problems are repeated long barn silhouettes, isolated square plots, weak central hierarchy and small machinery relative to buildings.

Layout ownership and grid routing live in `city-tile-layout.mjs`; `city-three-layout.mjs` maps simulation coordinates and facility-local anchors. `city-three-village.mjs` builds and region-batches static scenery. `city-three-facilities.mjs`, `city-three-frontier.mjs` and `city-three-actors.mjs` animate machines, defenses and cells from simulation state. The orthographic camera and label/performance budget live in `city-three-renderer.mjs`; `city-ui.mjs` and `city-three.css` own the HUD/editor. Existing Kenney and RG Poly CC0 models and their local license manifests will be reused.

The default expanded town contains 54 facilities. Version 1 layouts migrate once while preserving original placements; version 2 saves retain their full authored/user layout. New presets must therefore affect new layouts only. Known routing debt: walking connections are independently searched, and internal workstation approaches are authored waypoints rather than obstacle-aware paths.

The focused regression run passed 14/14 tests across `city-redesign`, `city-layout` and `city-expansion`: default occupancy/connectivity, all 36 organ endpoint pairs, four rotations, isolated editor undo/redo, state-preserving relocation, medicine delivery, tissue repair, old-layout migration, extensions and 210-cell saves. New tests also require exact version-2 save round trips. The local browser reported no console errors.

Development-browser observations, not physical-device benchmarks: the paused desktop default camera rendered 100 draws / 234k triangles at DPR 1.00 and 1024 shadows. The running mobile viewport sustained 60 fps with 73–75 draws / 200–202k triangles at DPR 1.00 and adaptive 512 shadows. Counts vary with culling and shadow refresh. No production build was run. Remaining design/routing issues are assigned to TASK 02–10.

### TASK 02 — shared style

`city-three-style.mjs` defines meadow, plaster, timber, muted roof families, paving, water, roughness and scale rules. Village houses reuse Kenney roofs/chimneys on compact plaster bodies; rounded tree crowns and softer daylight separate the cells from the ground. Facilities and imported bundle materials use the shared rules; atlas tint is applied once per material and textures remain shared. The imported model on/off and resource-lifetime regression passed. The rendered saved town was visually checked; no browser errors. The stretched heart roof and repeated organ silhouettes remain assigned to TASK 05/06, and legacy placements remain unchanged.

### TASK 03 — authored neighborhoods

`city-town-plan.mjs` defines the heart court and six district clusters, with 35 cottages facing shared lanes, six production yards and six supply yards. `city-tile-layout.mjs` uses these exact coordinates for new towns and district-relative growth candidates for additions. The original version-1 migration and all saved version-2 coordinates remain intact. Initial entrance/river conflicts were corrected before proceeding; 14/14 layout, expansion and save checks pass. The new town was rendered on an isolated local origin (port 4183), preserving the existing local save; all six districts were visually checked. Road consolidation and door alignment remain TASK 04.

### TASK 04 — streets and movement

`city-grid-path.mjs` adds bounded A* with a small turn cost and preference for existing streets. The layout compiler emits unique straight street runs with rounded junctions: broad circulation roads, entry lanes and narrow walking alleys. Houses face their transformed entrance and have a continuous doorstep path. Blood/oxygen traces remain a separate optional overlay with unchanged organ endpoints. New construction searches past placements that would disconnect another entrance. The gut entrance clearance was corrected in the new preset.

Worker movement lazily replaces obstructed segments with cached grid detours; queue positions use clear ground, and kidney oxygen/marrow resting anchors avoid their machines. Caches are bounded to 512 routes per immutable layout, and rendering performs no path search. Tests sample every road segment and representative cross-town detours against building occupancy. The final focused layout/save/expansion run passed 15/15; 12 frontier/specialist checks also passed during this stage. Browser inspection caught staircase-like streets; a turn cost and round caps corrected them before the stage was completed. Internal fittings are deliberately smaller than solid footprints; fixed external intake routes retain their biological meaning.

### TASK 05 — heart workshop square

The heart now has two broad rose pump chambers, moving piston collars and pressure gauges, a brass manifold, turning flywheel and an extruded heart crest. The existing hall remains as a lower rear workshop. A larger paved court, two planted lamps, bench and compact supply stall frame the real oxygen/dock/build anchors; tall foreground planting was removed. The six surrounding cottages form two short lanes around the court. Labels were raised after the rendered view showed the old label hiding the heart crest. The existing imported-asset/state-preservation check passed; the completed hero scene was visually checked. No game values or organ identities changed.

### TASK 06 — organ landmarks

The facility module now gives the lung paired round fan towers, the gut grain hoppers and a turning mill, the kidney raised filter columns and a connecting manifold, the marrow a bone-framed nursery with incubation pods, and the lymph a sage rotunda with a large Y-shaped mast. Machinery uses the same plaster/brass/accent palette as the heart. Existing imported halls, towers, barns, silo and workshop remain reused; all work anchors and simulation effects remain shared. Landmark label heights follow a common table. The imported asset/state check passed and the complete town rendered without browser errors. Fine state/action legibility remains TASK 08.

### TASK 07 — homes, commons and boundary

Cottages now vary porches, rear windows, planted edges and herb/flower boxes within their footprints. Tall planting is removed from organ work courts. Random scatter is replaced by outer wall groves, reeds/stones along the river, and clear-space neighborhood commons with benches; candidate commons are omitted when saved buildings or roads occupy their clearance. Imported wall/tower geometry is reused with a shared warm stone material, reduced tower height and the existing damage/repair behavior. Gates share the same plaster palette. The asset switch/resource-lifetime check passed; imported geometries remain owned by the cache and the new wall material is explicitly disposed. Visual inspection confirmed unobstructed courts and a softer boundary.

### TASK 08 — working state and activity

Machine drive is derived from real output, facility damage/supply pressure and available raw food. Phase accumulators slow/stutter machines and freeze with simulation time; an empty gut feed stops the processing drive. Enlarged courtyard lamps show actual facility state. Construction/repair/fabrication/collection/antibody work use colored ground rings and a progress marker from the existing activity clock. Nursery pods now use only the existing recruitment-bay instance data, removing duplicate decorative pods. Actor effects remain in 16 bounded batches; frontier effects remain in seven.

Thirteen focused activity/state/save/render checks pass. In the isolated browser city, heart expansion visibly progressed from material delivery to active work and then Lv.2, preserving stocks and the running city. The running view observed 60 fps, DPR 1.00, 1024 shadows, 126 draws and 220k triangles; the completed live upgrade was visually checked. No browser errors. Performance consolidation remains TASK 10.

### TASK 09 — camera and management UI

The first view and new heart-home control frame the working square. Whole-city framing remains available; selecting an organ zooms back into its working court. Distant labels become colored organ icons, overlapping labels are suppressed, and important labels stay below the resource HUD. A compact resource strip and five management buttons leave the city visible. Asset detail, rotation and performance controls now live under Operations / Settings. New simulations open with the management sheet closed.

Desktop 1280×800 and mobile 390×844 views were visually checked at this stage. Mobile checks covered the whole-city view, selecting the heart back into close focus, opening/closing details, and scrolling settings. The page has no horizontal overflow; the heart details sheet fits its available width and height. Syntax checks passed, and browser error logs are empty. Physical touch hardware remains outside this desktop-browser verification; final layout/editor and integrated performance checks follow in TASK 10.

### TASK 10 — integration and final quality

Rigid fans and flywheels now merge their colored pieces once while preserving the animated pivot. Four assemblies use four meshes instead of nineteen; imported geometry stays shared and disposal remains owned by the village. Unused road-junction bookkeeping was removed. The final navigation audit found an interior shortcut clipping a perimeter corner; terrain-aware segment checks now route it around the boundary while preserving authored external intake and wall-repair destinations.

The complete City suite covered 91 checks. The initial run passed 90; the added boundary check needed floating-point tolerance and a zero-length sampling guard in the test, then passed its focused rerun. Coverage includes 2D simulation, biology/medicine, workers, transport, layout editing and migration, expansion, rendering budgets, assets and camera controls. No production build was run. Final browser error logs are empty.

Browser integration on the isolated local city verified a house addition (54 → 55 facilities), rotation, one-tile movement, undo/redo, save/reload (55 facilities, capacity 196, 90° rotation retained) and cancellation. The editor fits 390×844 and 740×420 without horizontal page overflow. A real heart upgrade reached Lv.2. A deliberately opened skin segment was assigned a repair crew and returned from 0/100 to 100/100. A medicine crate completed delivery and produced the existing bloodstream distribution. The earlier saved local city still loads at 14:52 with its original layout and stocks (`10-legacy.jpg`); the new preset does not overwrite saved layouts.

| Development-browser observation | FPS | Draws | Triangles | DPR / shadow |
| --- | --- | --- | --- | --- |
| Production baseline, desktop default view | paused | 100 | 234k | 1 / 1024 |
| Final desktop heart view, running | 60 | 98 | 200k | 1 / 1024 |
| Production baseline, mobile viewport | 60 | 73–75 | 200–202k | 1 / 512 |
| Final mobile heart view, running | 60 | 73 | 157k | 1 / 512 |
| Final legacy town, whole-city view | paused | 133 | 196k | 1 / 1024 |

The historical expanded-town whole-view observation was about 125 draws / 240k triangles. Additional landmark machinery raises the whole-view draw count slightly, while rigid-part merging and static regional batching keep the measured running views at the 60 fps target. Different saved layouts, camera framing and actor positions make these observations indicative rather than an identical-scene benchmark. These are desktop-browser viewport measurements, not physical-phone or multitouch tests.

Final comparison images: `01-before-desktop.jpg` → `10-after-desktop.jpg`, `01-before-mobile.jpg` → `10-after-mobile.jpg`, plus `10-after-town.jpg` for the complete six-district structure. The final test city contains the extra house added during editing verification. After user-approved cleanup, seven baseline, final and deployed screenshots remain as comparison deliverables. Ten intermediate captures were removed from the working tree; their stage commits retain the historical evidence. `11-deployed-v0.61.0.jpg` records the live release after successful GitHub Pages deployment. No models, textures, dependencies or generated build directories were added.

Changed-file index:
- Layout and navigation: `city-town-plan.mjs`, `city-grid-path.mjs`, `city-tile-layout.mjs`, `city-engine.mjs`, `city-workplaces.mjs`, `city-activity.mjs`.
- Appearance and working machinery: `city-three-style.mjs`, `city-three-village.mjs`, `city-three-facilities.mjs`, `city-three-bundle.mjs`, `city-three-frontier.mjs`, `city-three-actors.mjs`.
- Camera and management: `city-three-renderer.mjs`, `city-ui.mjs`, `city-three.css`.
- Verification: `tests/city-redesign.test.mjs`, `tests/city-assets.test.mjs`, this document and `docs/city-redesign/*.jpg`.

All ten stages are included in release v0.61.0. Remaining verification limits are physical mobile hardware and user-specific layouts beyond the migration/editor fixtures and the saved city inspected here.

## Pathogen behavior and wound response (2026-10-22, v0.62.0)

`city-pathogens.mjs` defines twelve fixed isolates already present in `data/organisms.json`. Introductions now offer 3, 6, 12, 24 or 32 visible representatives, within the existing 32/64 combined active/pending limit for original/expanded layouts. The three scheduled 3D waves mix respiratory, wound and intestinal organisms, each using an allowed entry route. The original 2D waves are unchanged.

| Isolate | Implemented target / behavior |
| --- | --- |
| SPN-105 | Lung after airway entry; capsule reduces unmarked phagocytosis; pulmonary damage consumes oxygen and airway barrier integrity. |
| SAU-001 / SAU-002 | Stable soft-tissue target after wound entry; circulation after blood entry; invasive burden can spread. Resistance still comes from the individual sourced record. |
| ECO-009 | Wound tissue or circulation, with higher inflammatory pressure. No diarrheagenic or ascending urinary mechanism is assigned to this record. |
| GNX-220 | Intestinal invasion; sufficient invasive burden can enter circulation. |
| CDF-121 | Intestinal lumen; persistent toxin state causes damage, without a second direct-contact damage path or blood spread. |
| SPY-101 | Soft tissue, faster destruction and limited damage to neighboring tissue blocks; invasive burden can spread. |
| PAE-013 | Wound tissue or lung, with direct tissue injury; blood exposure enters the circulation compartment. |
| KPN-011 | Lung injury and a stronger capsule penalty that target antibodies can relieve. |
| GNX-225 | Respiratory mucosal injury; no capsule is presumed for this untyped record. |
| GNX-221 | Intestinal epithelial injury and inflammation, without routine blood dissemination or an invented Shiga-toxin mechanism for S. sonnei. |
| CPE-122 | Wound-associated tissue necrosis; local low oxygen increases growth and injury. |

Invaders retain their selected tissue target until it is destroyed. Burden is seeded in the target tissue's actual owning district. Internal movement uses the existing obstacle-aware walking routes, which are reissued after a layout edit. Bloodstream spread chooses modeled preferred sites or vulnerable unisolated districts instead of a rotating arbitrary organ. The heart remains the game's circulation compartment; bloodstream exposure alone does not assert myocarditis or endocarditis. Target selection, numeric rates, simulated toxin injury and the small set of tissue blocks are educational game abstractions, not patient-level pathogenesis predictions.

Skin damage below 75 starts a material order automatically in balanced/defense operation (95 under repair priority). At most two automatic orders run concurrently, or three under repair priority. Platelets first provide a small provisional seal. A fibroblast collects actual material at the skin workshop, travels to the segment, then reconstructs it progressively. Reconstruction still requires delivered material and a living assigned worker; another worker can take over without collecting the same delivered material again. Completed/cleared routes reset their step index so immediate saves remain valid.

Responding phagocytes, antigen couriers, signal cells and repair workers display a short repeating `!` above their heads, yellow for infection and teal for repair. Moving invaders mark their destination; attacks show a pulsing contact ring and directed contact effect. Clusters, chains, pairs, rods and short rods share the existing actor geometries. Wounds and damaged buildings use larger two-color flames, three smoke puffs per site, scorch marks and rubble. Delivered repair material extinguishes the wound effect and a scaffold bar follows reconstruction progress. All sites can display damage simultaneously in the existing seven frontier batches; the actor renderer retains sixteen batches. Existing local Three.js MIT and Kenney/RG Poly CC0 assets are reused with no downloads or new dependencies.

Mechanism references, alongside each isolate's existing source IDs:

- [CDC: Pseudomonas aeruginosa](https://www.cdc.gov/pseudomonas-aeruginosa/about/) and [Klebsiella](https://www.cdc.gov/klebsiella/about/) — supported infection sites and wound/respiratory exposure.
- [CDC: group A streptococcal necrotizing fasciitis](https://www.cdc.gov/group-a-strep/hcp/clinical-guidance/necrotizing-fasciitis.html) — invasive soft-tissue destruction.
- [CDC PHIL: Shigella mucosal invasion](https://wwwn.cdc.gov/phil/Details.aspx?pid=15089) and [CDC: C. diff](https://www.cdc.gov/c-diff/about/) — distinct intestinal injury mechanisms.
- [Klebsiella capsule experiments](https://pubmed.ncbi.nlm.nih.gov/31997409/) and [C. perfringens toxin-mutant experiments](https://pubmed.ncbi.nlm.nih.gov/11705975/) — capsule-mediated evasion and toxin-dependent myonecrosis.

Focused verification covers route/count validation, actual tissue ownership, stable targets, toxin-only versus invasive damage, hypoxic necrosis, default-policy wound repair and crew replacement, immediate save/continuation, reaction effects and fixed renderer capacities. No production build is required for this local change.

## Entry visibility and large introductions (2026-10-22, v0.62.0)

Pathogen bodies, eyes, clusters and spikes now share the heading of their displayed movement, including interpolated turns. Stationary attackers face their world-space target. Rods extend along the same forward axis as their eyes. This is presentation state and does not change saved infection targets.

The meadow radius is 2,048 world units and the river continues into distant fog. The camera's existing overview, pan limits and tilt remain usable without exposing the circular ground edge. The respiratory route now has larger paired oxygen molecules, directional chevrons, a cyan intake trace and an O₂ sign. Molecules follow the compiled airway route into the lung; density/speed reflect lung output and dry weather, and pause with simulation time. The digestive entry has an open mouth frame, lips, teeth, tongue, throat ribs and a hinged quarantine barrier. It occupies the actual food-route perimeter crossing, with a matching gap in both wall renderers. Both entrances have short labels visible from the overview. Existing Three.js, Kenney and RG Poly resources are reused.

Expanded cities support 256 combined pending/active pathogen representatives. The exposure menu adds 64, 128 and 256 (previous maximum 32). Large introductions release 2, 4 or 8 per 0.45 game seconds; a 256 cohort releases in about 15 game seconds. Existing small exposures and scheduled waves retain their pacing. Large arrivals spread across entry lanes or the blood-entry area. Threat priorities are indexed once per simulation tick instead of rescanning every district for each phagocyte. Actor batches remain sixteen, frontier batches seven; all 256 enemies have real engine state and fit the renderer/motion/save budgets. Queued cohorts retain release size through saving; restored enemy routes keep their completed navigation state.

One bounded CPU sample on the development PC, 108 cells, persistent representative enemies, 40 warmup and 180 measured ticks per count (`node scripts/benchmark-city-pathogens.mjs`):

| Enemies | Mean tick | 95th percentile | Actor triangles |
| --- | --- | --- | --- |
| 64 | 1.565 ms | 3.037 ms | 105,312 |
| 128 | 1.535 ms | 2.645 ms | 143,876 |
| 256 | 2.054 ms | 3.461 ms | 223,532 |

These are CPU and instance counts, not physical-phone FPS guarantees. The development browser showed 60 fps, DPR 1.00, 1024 shadows, 68 draws and 244k triangles at 3× simulation speed with 248 active representatives remaining after a 256 introduction. This is one desktop view, not a physical-device or whole-town benchmark. Browser error logs were empty.

Portrait verification also exposed foreground clipping: at minimum orthographic zoom, bottom screen rays could begin below the ground even with a large meadow. `landscapeCameraRange` now derives camera distance, far clip and fog depth from the visible span, zoom and tilt. This preserves orthographic framing while keeping ground intersections in front of the camera. Focused checks cover facing in two directions and at rest, intake-route sampling and ventilation response, landscape and clip-plane coverage, a complete 256 cohort, rendering capacity and exact save continuation. No production build was run.

## Road movement (2026-10-22, v0.62.0)

Routine cell and freight travel now follows a cached graph of the actual paved streets. Facility workstations, loading bays, the skin workshop and inner wall patrol have shared paved access paths; docking queues and idle patrol destinations stay on that graph. Emergency work can still reach its specific target. Existing road geometry, grid search and local assets are reused.

Movement advances along each segment in displayed ground coordinates, so crossing a coordinate-transform sector no longer bends an actor off the road. New cells start on a road. Older off-road saves walk back onto the network; current saved routes resume at the same step with their cargo and work intact.

The focused navigation/layout/entry/pathogen checks pass (27 tests), including sampled movement of all eight cell types, docking queues, unobstructed grass shortcuts, old-save recovery, exact continuation, relocated facilities and skin reconstruction. One bounded 256-pathogen/108-cell CPU sample measured a 2.030 ms mean tick and 3.145 ms 95th percentile, with the existing sixteen actor batches. No production build was run.

## Immune network (2026-10-22, v0.62.0)

`city-immunity.mjs` connects tissue danger, local signals, antigen transport and presentation, clonal selection, effector action, antibody classes, memory and resolution. It runs alongside the existing infection, medicine, oxygen and repair compartments. The 3D roster has sixteen roles, including the thirteen immune-cell roles below; RBCs, fibroblasts and platelets retain their existing work. Normal expanded cities start with 151 representatives and still share the town's 192–256 population capacity. Plasma cells arise during a response. The cellular categories follow the [NIAID immune-system overview](https://pubweb-prod.niaid.nih.gov/research/immune-system-overview).

| Cell | Trigger and implemented action |
| --- | --- |
| Neutrophil | CXCL8/C5a-associated recruitment, bacterial phagocytic damage, opsonin support, bounded NET zones under high burden; NETs also add inflammation. |
| Eosinophil | IL-5/CCL11-associated recruitment, granule damage at a helminth's surface, possible collateral injury during allergic late responses. |
| Basophil | Circulating type-2 responder, early IL-4 contribution, antigen-matched surface-IgE degranulation. |
| Monocyte | CCL2-associated tissue entry followed by timed differentiation in a tissue M-CSF environment; the resulting macrophage keeps the actor ID. |
| Macrophage | Existing resident pool plus monocyte-derived cells; phagocytosis, inflammatory signals, apoptotic-debris uptake and IL-10/TGF-β resolution signals. |
| Mast cell | Resident at the entry tissues; IgE surface loading precedes same-antigen FcεRI cross-linking and histamine release. Recruited precursors mature after tissue arrival. |
| Dendritic cell | Tissue antigen capture, danger-dependent maturation, CCR7-associated travel to the lymph node, MHC-II presentation and viral MHC-I cross-presentation with co-stimulation. |
| NK cell | Stressed infected host cells with reduced MHC-I; sufficient matching IgG also permits the modeled CD16/ADCC route. Healthy tissue and free bacteria are not cytotoxic targets. |
| B cell | Native antigen uptake through the modeled BCR, cognate MHC-II/Tfh/CD40L help, early IgM progeny, timed germinal-center maturation, switched plasma cells and memory B cells. |
| CD4 T cell | MHC-II/co-stimulation-dependent selection and expansion; Tfh supports cognate B cells, Th1 supplies IFN-γ, Th2 supplies IL-4/5/13, and Th17 supplies IL-17-dependent recruitment signals. |
| CD8 T cell | Viral MHC-I cross-presentation, co-stimulation and CD4/IL-2 help in this chosen priming scenario; effectors recognize matching peptide/MHC-I on host cells and induce apoptosis. |
| Treg | IL-2-supported feedback, reduced APC co-stimulation and local IL-10/TGF-β suppression; it reduces inflammatory injury without directly killing pathogens. |
| Plasma cell | A committed antigen and isotype, actual nutrient cost and a timed secretion batch. It does not choose a different antigen just because another antibody stock is lower. |

Viral host cells, large helminths and a sensitization-prone allergen challenge are separate from the twelve bacterial isolates and their antibiotic-susceptibility data. Infected host cells carry antigen, burden, stress and MHC-I state. I-type IFN restrains replication, neutralizing IgA/IgG limits new viral infection, NK preferentially handles missing-self targets, and cognate CD8 cells handle MHC-I-positive targets. Cross-presentation is based on [Sigal et al., 1999](https://pubmed.ncbi.nlm.nih.gov/10078533/); the NK inhibitory-recognition basis is illustrated by the [Kärre et al. original study, reprinted](https://pubmed.ncbi.nlm.nih.gov/15905492/).

IgM/IgG support complement and opsonization; mucosal IgA contributes to the lumen/neutralization compartments. IgE switching requires cognate Tfh/CD40L help and IL-4, following the distinction demonstrated by [Gascan et al., 1991](https://pubmed.ncbi.nlm.nih.gov/1711085/). IgE then sensitizes mast cells/basophils; antigen-specific re-exposure causes degranulation. IgE is not a universal bacterial-killing multiplier. NET effects follow the qualitative mechanism in [Brinkmann et al., 2004](https://pubmed.ncbi.nlm.nih.gov/15001782/). Treg effects include reduced co-stimulatory potency, consistent with [Wing et al., 2008](https://pubmed.ncbi.nlm.nih.gov/18845758/).

Clones require food, available lineage slots and population capacity. A bounded initial responding cohort leaves naive representatives for another antigen. T cells contract into memory after antigen withdrawal; some expanded cells undergo apoptosis. Memory B/T cells retain specificity and reactivate faster. Short-lived IgM progeny expire independently of the optional whole-city lifetime toggle. Switched plasma cells have a longer modeled survival; neither the seconds nor these survival periods are human biological estimates. Thymic selection, individual receptor repertoires, affinity mutations and physical cell-contact synapses are represented by cohort states and a mixed lymph-node compartment, not molecular simulations. Not every CD8 priming context requires CD4 help; this implementation chooses a help-dependent scenario. The allergen experiment models sensitization conditions, not the claim that all pollen exposure causes allergy.

**치료 → 면역 자극** adds the three challenges and focuses the selected tissue. **면역 과정** shows actual presentation, active T cells, B/plasma/memory counts, isotype stocks, host targets and leading local signals. Cell inspection separates carried cargo from antigen specificity and identifies monocyte-derived macrophages and memory/subset states. All sixteen cell appearances, infected-host markers, worms, allergen particles, presentation tokens, granules, cytotoxic traces, Treg rings and NET webs reuse the existing sixteen instanced renderer batches. Forty-eight paved lymph-node positions disperse resting B/T cells and presenting DCs. Existing Three.js MIT and local Kenney/RG Poly CC0 assets are reused; there are no new models, raster assets or dependencies.

Old cities retain their clock, cargo, work, layout and committed antibody batches. Uncommitted old plasma representatives become B cells; already committed plasma cells keep their recipe. Mature macrophages/plasma cells are not purchased directly: monocytes/B cells provide those lineages. Explanatory maps migrate to schema 3 by adding immune views while retaining saved notes and positions. Navigation caches use exact projection coordinates so hidden cache history cannot change a resumed route by a few floating-point bits.

Focused checks cover missing-DC/B-cell controls, stable monocyte identity, NK/CD8 MHC and specificity controls, complete viral priming and class switching, IgE sensitization/re-exposure, helminth damage, Treg feedback, exact saved continuation, bounded rendering, streets and facility relocation. A bounded 151-cell CPU sample measured mean/p95 ticks of 2.098/3.642 ms with 64 bacteria, 2.122/3.678 ms with 128, and 2.677/4.007 ms with 256. These development-PC samples are not physical-phone FPS guarantees or maximum mixed-challenge benchmarks. Local production builds were omitted; the release workflow runs the full test suite and static build before deployment.
