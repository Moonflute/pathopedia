# Play: Isolation Protocol — vertical slice

`#play` adds a single-player retro 2.5D FPS to the existing static Pathopedia application. The implementation uses the existing HTML UI system, without adding React, Three.js or an npm runtime dependency.

## Playable scope

- One 26×22 laboratory map with connected loops, 3 removable infection sources and an extraction point.
- Five **isolate/enemy types**, representing three species: penicillin-susceptible S. pneumoniae (SPN-105), MSSA (SAU-001), susceptible E. coli (ECO-009), MRSA (SAU-002), and ESBL E. coli (ECO-010). These are fixed educational isolates, not species-wide susceptibility assumptions.
- Ampicillin, cefazolin, ceftriaxone, vancomycin and meropenem. All counters are available from the start to avoid an unwinnable random loadout. Each run starts with a random passive, followed by five 3-choice reward screens.
- Six increasingly mixed waves; 115 enemies total before phenotype/elite selection. Finish all waves, remove the three sources, and return to EXIT.
- WASD, horizontal mouse aim, left mouse/Space fire, numbers 1–5 or wheel switch, Shift dash, E scan, F source control, Esc/Tab pause, B pause and open the card list. With pointer lock unavailable, mouse drag and arrow-key turning remain available.
- Touch joystick, right-side drag aiming, dedicated fire/scan/source/dash buttons. Landscape/fullscreen is available; portrait also fits without clipping controls.
- Highest score and sound preference use separate `pathopedia.play.*` localStorage keys. In-progress runs survive tab changes in memory, but do not survive reload. Existing discovery data is never modified.

## Lightweight implementation

`app.mjs` imports `play-ui.mjs` and adds `play.css` only on first Play entry. The game files stay out of the service-worker install precache. Runtime requests are cached; a `CACHE_PLAY` message after the first load also covers the case where the service worker takes control after the initial imports. The first visit needs a connection; a completed online load supports subsequent offline play.

The existing [Kontra.js 10.0.2](https://github.com/straker/kontra) supplies its fixed-step game loop. The [MIT license](../src/vendor/KONTRA-LICENSE.txt) remains in the distribution. One reusable loop avoids creating additional library-global subscriptions on every mount. Game-specific listeners use AbortController; ResizeObserver, pointer lock, audio, canvas backing stores and sprite atlases are released on exit. The paused run holds only small gameplay state.

The renderer is an original grid/DDA raycaster. It uses generated wall, enemy and weapon atlases, rather than downloading textures, sprites, audio or 3D models. Audio is synthesized. Rendering is bounded by 640×360 (standard) or 480×270 (low), fitting the visible aspect ratio without multiplying by DPR. A reused floor pixel buffer and wall depth buffer provide perspective and occlusion. Off-screen/behind-camera sprites are culled. Pools cap enemies at 24 (14 simultaneously alive), projectiles at 24 and particles at 80. There is no physics engine or post-processing.

## Medical data and mechanics

`createPlayCatalog` joins game tuning to `data/organisms.json` by record/drug IDs. Drug labels, families, spectra, limitations, original AST entries, sources and site applicability come from the existing data. The existing defense drug palette is reused. Damage, shields, durations, resources and spawn odds are arcade tuning, not doses, MICs or clinical effect sizes.

All hits and exposure ticks pass through `coverage` before shield or HP damage:

- R and INACTIVE always produce zero antibiotic damage, regardless of attack power or upgrades.
- I requires increased exposure. Cefazolin starts with that condition enabled; extended infusion enables it for other applicable weapons. I remains visibly distinct from R.
- The urinary-origin restriction on E. coli/cefazolin is not applied outside that site. Unsupported or unknown categories are not invented as susceptible.
- ACTIVE stays a distinct literature-activity category, never relabeled S or I.
- Capsule is a separate shield, depleted only by an active antibiotic. Biofilm sources reduce damage to nearby enemies with line of sight; F removes that protection. Neither mechanic changes AST.
- Extended infusion adds short continuing exposure only after an active beta-lactam hit. Immune clearance periodically removes one nearby weak baseline organism, excluding resistant, shielded, elite or source-protected enemies; neutropenia lengthens its interval.
- Drug energy recharges faster while another weapon is selected. Fire cooldowns are per weapon; switching does not inherit a different weapon's firing delay.
- Broad-spectrum shots add more Resistance Pressure. At 40 and 70, resistant/elite selection probabilities increase (28% / 55%). The scheduler selects existing MRSA/ESBL records instead of mutating susceptibility. Appropriate narrow-weapon kills, source control and de-escalation reduce pressure.

The S/I/R interpretation follows the existing data and [EUCAST definitions](https://www.eucast.org/bacteria/clinical-breakpoints-and-interpretation/definition-of-s-i-and-r/). The source AST remains the authority for each authored isolate.

Normal mode exposes isolate identity/AST. Hard mode tracks `??? → morphology → culture → AST` per profile. Before AST, susceptibility hints and pathogen-card links stay hidden/disabled. A rapid scanner can advance two steps. Inspection and card browsing happen while combat is paused; drug cards remain available.

## Validation

```sh
node --test tests/play.test.mjs tests/play-balance.test.mjs tests/app-routing.test.mjs
npm run build
```

Tests cover preserved AST, resistance under arbitrary attack power, exposure/site restrictions, shield and biofilm behavior, scanner secrecy, normalized movement, wall collision/occlusion, complete map reachability, bounded pools, pressure selection, AI lifecycle, independent weapon cooldowns, reward selection, pause/terminal states and extraction.

A deterministic QA player navigates cells, uses available weapons and their resources, scans in Hard Mode, selects rewards and removes sources. Three seeded runs (including Hard + neutropenia) complete in approximately 4:40–4:45 of simulated combat time, before the time a person spends reading or choosing rewards. This verifies completion and counters; it does not establish human enjoyment.

Browser checks cover no game requests on home, lazy entry, actual mouse and touch firing, weapon switching, pause, both card types, Hard scanner, repeated tab transitions with zero pending game frames, mobile layout and console errors. Automated screenshots and local browser probes are kept in ignored `.qa/`.

Release validation runs the complete `npm test` suite and `npm run build` from the isolated release snapshot, then checks the deployed Play route in a browser.

## Deliberate next-slice boundaries

CRE/MDR Pseudomonas, intracellular/spore/toxin mechanics, inhibitor combinations, beta-lactam allergy/renal weapon constraints, additional maps/bosses and persistent unlock progression are not included yet. New stages can extend map/site/host and isolate pools; additional weapons must join existing drug data and keep the coverage gate. The first slice is intended for evaluating movement, switching, encounter readability and five-to-ten-minute human sessions.
