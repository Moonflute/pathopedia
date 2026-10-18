# Cell City prototype — 0.45.0

Open the **cell city** tab or #city. One body-city contains lung, heart, kidney, gastrointestinal, marrow and lymph districts. A new start screen selects a scenario or resumes the existing save. Separate difficulty controls and finished artwork are deferred.

## Scenario goals

| Scenario | Opening | Success | Failure |
| --- | --- | --- | --- |
| 감염 도시 복구 | Lung health 45%, other districts 62%, waste 58%, damaged airway barrier, active infection | Within 8 game minutes: clear three infection events, every district at least 85%, waste at most 30%; hold recovery conditions for 15 seconds | Recovery deadline, heart failure, or average health below 22% |
| 건강한 도시 유지 | Healthy valley town, 40 cells | 5 game minutes; average health at least 70%, waste at most 65% | A continuous 15-second breach, heart failure, or average health below 22% |
| 면역저하 도시 유지 | Desert palette, 36 cells, four neutrophils and slower neutrophil recruitment | 6 game minutes; average health at least 75%, waste at most 65% | Same 15-second grace rule and critical failure conditions |

A breach at the survival deadline must recover within the remaining grace period before success. The prototype models reduced immunity specifically as neutropenia; the desert is a visual metaphor. The old save retains its original three-wave objective. Winning allows free operation.

## Village and transport

The finite landscape adds mountains behind the town, a river crossing it and exiting beside the kidney plant, seven wall towers and distinct airway/food gates. The foreground floating shadow is removed. Valley and desert reuse one layout and swap the terrain palette and tree treatment.

- Heart: existing pumping station and animated pulse.
- Circulation: precomputed curved roads with two lanes. Heart-to-lung blood uses the blue pulmonary lane and oxygenated return uses red; systemic supply reverses that pairing. The renderer and red cells share the same route geometry. No per-frame pathfinding.
- Skin: thick walls, crenellations and towers. The airway gate remains the active barrier mechanic; whole-wall damage is not yet simulated.
- Kidney: settling/filter tanks on the river's downstream bank, rotating filter arms and an outflow pipe.
- Lung: wind rotors, bellows and an airway entrance retained for respiratory infection.
- Gut: external ingredient carts deliver raw food; the district processes the stock into nutrients for distribution. Higher levels increase both intake and processing capacity. Separate stomach/liver/pancreas districts remain deferred.
- Marrow: manual recruitment, a three-slot production queue, birth at the marrow exit and a direct production control in the district panel.
- Lymph: existing antigen delivery and target-specific antibody support, pending later concept work.

The scene has 6 organ facilities, 29 neighborhood buildings, 24 accessories, 36 trees and 7 wall towers (102 structures/decorations). Cached primitive sprites keep these replaceable without downloading artwork. Real work units are used instead of decorative moving crowds: 40 initially (36 in the neutropenia scenario), with a recruitment cap of 96 across five jobs.

## UI and camera

Resources are compact at the lower left; materials are labeled **건축 자재** (the game resource for construction and repairs). Context panels and the command bar stay within the viewport. The command dock uses a fixed center column so drug names and log messages cannot shift it. The marrow production shortcut fits inside the same panel.

District-tab selection changes selection only, without focusing the camera on that district. The **세포** panel's job icons toggle rings on matching cells and directional counts for offscreen units. Mouse wheel follows the cursor; pinch follows the midpoint, with drag movement. Zooming out stops at the landscape overview; maximum zoom remains 320%.

## Optional game lifetimes

**운영 → 환경·설정 → 게임 수명** is OFF by default. ON advances a scalar age per cell. Expired cells leave and join the marrow replacement backlog. Automatic replacements spend four local marrow nutrients, use the same three production slots, obey job caps, and are delayed if nutrients or queue capacity are unavailable. Neutrophil replacement takes longer in neutropenia. OFF freezes age and new automatic replacement requests; already queued production finishes.

| Cell | Game lifetime |
| --- | --- |
| Red cell | 12 minutes |
| Neutrophil | 4 minutes |
| Macrophage | 15 minutes |
| Fibroblast | 20 minutes |
| Dendritic cell | 10 minutes |

These are gameplay values, not biological lifespans. Initial ages are staggered; newly produced cells start at zero. Age, pending replacements, raw food and scenario progress persist. Existing schema-1 saves receive compatible defaults.

## Rendering and resource budget

Canvas 2D remains capped at 30 fps and device pixel ratio 1.5. The 1440×900 ground cache contains landscape, river, roads and walls. Repeated trees/houses/accessories are pre-rendered into small cached canvases, while animated organs and moving units retain depth ordering. Offscreen actors are culled. Paused scenes redraw only when dirty. The nearest-enemy scan uses a linear pass instead of allocating and sorting a target list per fighter each tick.

CPU-only benchmark on this development PC, Node v24, 24 persistent enemies, game lifetimes ON, 200 warmup + 1,200 measured updates per case:

| Cells | Mean update | 95th percentile |
| --- | --- | --- |
| 40 | 0.039 ms | 0.067 ms |
| 96 (all job caps) | 0.044 ms | 0.065 ms |
| 160 (exploratory only) | 0.058 ms | 0.082 ms |

Reproduce with node scripts/benchmark-city.mjs. This is simulation CPU cost, not browser rendering, input latency or a guarantee for low-end phones. Production remains capped at 96. Raising the cap to 160 needs target-device drawing checks; 160 is not enabled in the game. Static scenery is cheaper to extend through the existing caches than to add new independent AI units.

## Sources and validation

Existing Kontra.js 10.0.2 (MIT) and Lucide (ISC) are reused. [Kenney isometric buildings](https://kenney.nl/assets/isometric-tiles-buildings) (CC0) were reviewed as future asset candidates. [MDN canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) supports pre-rendering repeating primitives. Current visuals remain code-drawn placeholders with no new remote assets or dependencies.

Focused checks cover camera input, real deliveries and construction, susceptibility gating, three scenario goals/failure conditions, optional cell turnover and save continuation. A simple managed simulation reached recovery at 262 seconds, normal maintenance at 300 seconds and neutropenia maintenance at 360 seconds. These are feasibility checks, not final difficulty tuning. Browser checks cover desktop/mobile start screens, compact HUD, production/selection controls and drug-switch dock stability. GitHub Pages runs the normal repository test/build workflow before deployment.

Combat, physiology quantities and antibiotic weapons are fictional. Only unqualified S in fixed isolate records activates drug equipment; R and unsupported activity remain inactive. No dosing or treatment recommendation is modeled.
