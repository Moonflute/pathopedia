# Cell City prototype

Open the **cell city** tab or `#city`. One continuous body-city connects the lung, heart, kidney, gut, bone marrow and lymph node districts. Click a district (or open **구역** in the bottom command bar) to upgrade, repair, build a defensive outpost or move the defense rally point. Pause and 1×/2×/3× controls work during construction and combat. Drag, wheel, pinch or the zoom buttons explore the aerial map; with the map focused, use arrow keys, +/− and Home.

Version 0.44.0 keeps a viewport-sized HUD: resources above the map, commands below it, and one management panel at a time. Narrow screens use a bottom sheet and reserve camera space above it. Short landscape screens use a compact side panel. Logs use pages rather than an expanding document. The Pathopedia logo returns to the tab chooser on narrow screens. The existing city save remains compatible.

The camera starts close enough to observe workers on mobile. Mouse-wheel zoom follows the cursor; two-finger pinch follows the midpoint and allows simultaneous movement. Releasing one finger continues panning without selecting a building. Magnification survives panel and viewport changes, ranges from a wide overview to 320%, and the **전체** control restores the full city. District buttons move the camera to that district without resetting zoom. The lightweight camera model is independent of the simulation.

The aerial view uses a rotated, compressed ground plane with upright buildings, roofs, side faces and a common depth order for buildings, workers and cargo. A pale stone and sage palette, irregular forecourts and small paths connect each building to its surroundings. Each district defines slots for four accessories such as storage, tanks, pumps, awnings, benches or planters; these code-drawn placeholders can later accept dedicated assets. Workers are 20% larger, and fibroblasts animate their tools while producing or repairing.

It remains Canvas 2D: one 1440×900 cached terrain surface, device pixel ratio capped at 1.5 and drawing capped at 30 fps. Paused scenes repaint only after a camera, layout or selection change; offscreen actors are skipped. Simulation timing is independent of drawing. No new dependencies, 3D engine, textures or remote asset requests were added.

UI references: [Frostpunk construction interface](https://interfaceingame.com/screenshots/frostpunk-construction/) and [Against the Storm's official Interface Update](https://eremitegames.com/interface-update/) informed the edge-mounted commands, compact resource HUD and contextual panels. Game artwork was not copied.

- Red cells deliver oxygen through the heart. Plasma cargo carries nutrients, externally supplied drugs and construction materials. Buildings and recruits wait for delivery.
- Neutrophils patrol and combine innate attacks with fictional antibiotic equipment. Macrophages fight and clear debris. Fibroblasts produce materials and repair. Dendritic cells carry target-specific antigen information to the lymph node, enabling antibody support.
- Three disclosed infections use SPN-105, SAU-001 and SAU-002 from `data/organisms.json`. The prototype enables drug equipment only for unqualified S records; R and unsupported activity remain inactive. Ordinary phagocytosis is independent of antibiotic susceptibility. Combat numbers and antibiotic weapons are fictional; no dose or treatment recommendation is modeled.
- Heart output controls transport speed; lung output controls oxygen loads; kidney output clears waste. Local food, oxygen and tissue damage affect district output. Fever and dry-air events alter demand or supply. The neutropenia host starts with fewer neutrophils and slower neutrophil recruitment.
- The city saves to the independent `pathopedia:cell-city:v1` key, including cargo and construction in progress. Returning to the tab or a saved city pauses time. After victory, continue running the city or introduce another infection.

Scope: fixed district placement and routes, five cell jobs, three antibiotics, two construction types plus repair, three waves, two host presets. Free placement, liver/brain districts, T-cell combat, detailed pharmacokinetics and multiplayer are not implemented.

Rendering uses original code-drawn city art, the existing Kontra.js 10.0.2 game loop (MIT, `src/vendor/KONTRA-LICENSE.txt`) and existing Lucide controls (ISC, `src/vendor/LUCIDE-LICENSE.txt`). Kenney's CC0 [isometric buildings](https://kenney.nl/assets/isometric-tiles-buildings) and [landscape tiles](https://kenney.nl/assets/isometric-tiles-landscape) were reviewed as future asset candidates. This pass establishes scene composition; detailed artwork is deferred.

Focused camera checks: `node --test tests/city-camera.test.mjs` (cursor anchoring, pinch with translation, release/cancellation, panel/viewport changes). Existing simulation checks remain in `tests/city.test.mjs`. GitHub Pages runs the repository's normal test and build workflow before deployment.
