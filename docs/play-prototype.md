# Play: Isolation Protocol — v0.22 viewport, scanner and seeded extraction

`#play` is a single-player Canvas 2D raycasting FPS inside Pathopedia. It reuses the existing MIT [Kontra.js 10.0.2](https://github.com/straker/kontra) GameLoop, the encyclopedia AST and the existing card inspector. No new package dependency, 3D engine or physics engine is required. The sole downloaded asset is an optional CC0 music loop.

## Playable scope

Eight stages: Community, catheter-associated UTI, Pneumonia, Intra-abdominal infection, Hospital-acquired infection, ICU, Resistant outbreak and Sepsis. Each generates a bounded tile map on entry (30–38 columns, 26–32 rows), using the run seed and stage index. Non-overlapping rooms are joined with a spanning tree and additional flanking routes. Sector profiles vary room count, proportions, cover and loop count. Enemy room and tile assignments are shuffled, with each scheduled clinical type retained. The generator is original code informed by [Bob Nystrom's Rooms and Mazes](https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/), with no new library or runtime download.

The setup accepts a number or text seed; the normalized numeric seed appears in pause. Blank means a new seed each run. The same seed and sector reproduce geometry and starting encounters. Floor-distance ranking places an exit away from the safe entry room. Handle all sources, then reach the EXIT portal; ordinary surviving enemies do not block extraction. The final stage also requires the KPC boss. The campaign schedules 144 opponents and 17 sources, with three reward choices between stages. Single-stage practice can start at any stage.

The 15 enemy types join existing records: SPN-105, SAU-001, ECO-009, SAU-002, ECO-010, KPN-409, PAE-013, PAE-014, KPN-012, EFM-008, BGX-501, BGX-515, CPE-122, CMV-804 and SST-715. They represent fixed educational isolates/clinical contexts, not species-wide susceptibility assumptions. The final KPC colony boss uses KPN-012's unchanged AST; its larger capsule, source protection and telegraphed projectile fan are arcade mechanics.

Nine configurable hotbar slots support eleven weapons: AMP, CFZ, CRO, VAN, MEM, LEV, MTZ, LZD, CZA, GCV and IVM. GCV replaces slot 1 on stage 6 and IVM replaces slot 2 on stage 7; the pause menu can reassign any issued weapon. CMV first appears on stage 6, Strongyloides on stage 7. The original five are issued initially. LEV/MTZ/LZD/CZA are guaranteed before stages 3/4/6/7 respectively. Rewards can issue them earlier, so random reward choices cannot remove a required counter. These are in-run unlocks. Highest score, SFX/music preferences and minimap mode persist; the active run remains in memory across tabs but resets on page reload.

## Controls and contact rules

WASD movement; horizontal mouse aim; left mouse fire; Space jump; R reload; 1–9 or wheel select; Q previous weapon; Shift dash; 0 scanner and hold right mouse for 2× inspection; F source control; Escape/Tab pause; B pause and open cards. Without pointer lock, dragging or arrow keys can turn. Mobile offers a joystick, drag aim and fire/scanner/hold-to-scope/source/dash/reload/jump buttons. Jump uses a small vertical position/velocity under gravity; walls retain horizontal collision, while low projectiles and floor toxin can be avoided in the air.

The standard viewport is 16:9, with no external game header, footer or status strip. Portrait phones use a taller layout. Fullscreen uses a 16:9 viewport with letterboxing on wide screens, with a theater fallback where the API is unavailable. The central lower hotbar has nine drug slots and the scanner, 48px tall on desktop versus the previous 68px. Its health bar is red and 15px tall. Menu/body/HUD type is larger. The selected weapon shows magazine / reserve shots. Original procedural pixel art depicts a foreshortened receiver, forward muzzle, right trigger hand and left support hand, with stepped recoil and reload movement. Locked/allergy-restricted slots are skipped by cycling. Per-weapon cooldowns prevent inheriting another weapon's firing delay.

Idle enemies acquire contact only inside the player's current room, within 7.5 tiles, in the rendered horizontal view cone and with unobstructed line of sight. There is no age-based wakeup or global sound alert. A direct shot alerts only the struck target, even if resistant. Alerted enemies remember the last visible position for 5 seconds and search it; they do not navigate toward the player's hidden current position. Dormant spores do not chase. The default minimap reveals tiles along current view rays, stopping at the first wall and retaining explored history. Source/exit icons follow the same visibility rule. Whole-map mode reveals geometry and objectives, while enemies still need to be discovered. Mode changes preserve the underlying exploration history.

Every scheduled enemy is positioned outside the entry room, at least six tiles from the start and out of its line of sight. All fit into the 24-slot pool and are materialized before exploration, without later visible spawning. Pressure rolls apply on entry. Crossing 40/70 can also substitute resistant/elite encounters that are still idle, undiscovered and hidden behind walls; visible or already engaged enemies never transform. Optional surviving encounters can be bypassed after opening the exit.

## Resource and progression changes

Reserve energy is 200 per drug. Magazines hold 5–20 base shots depending on the weapon. R transfers reserve into the magazine after a short reload; empty fire triggers the same reload. Switching cancels an unfinished reload without consuming reserve. Selected/stowed reserve recovery is 8/26 per second; kills restore 10 and supply pickups refill reserves every 25 seconds. Shot counts use the actual upgraded cost. Reserve rewards add 60 capacity, up to three times. Source removal also supplies energy and modest host support.

17 rewards cover extended infusion, increased exposure, immune clearance, rapid scanner, de-escalation, efficiency, reserve capacity, firing intervals, biofilm penetration, host stabilization, source control, renal adjustment, mobility and four early weapon unlocks. Repeatable support/source/de-escalation options keep three choices available after capped upgrades.

Host settings are normal, neutropenia, renal impairment and confirmed aminopenicillin allergy. Neutropenia lengthens immune-clearance intervals; ICU further reduces that passive. Renal impairment reduces regeneration for renally handled drugs by 25% until adjusted; these are resource abstractions, not dose recommendations. Allergy blocks AMP specifically; other beta-lactams have been individually assessed in this authored scenario. The game does not treat all beta-lactam allergies as interchangeable.

## Coverage and special mechanics

`createPlayCatalog` joins `data/organisms.json` by stable record/drug IDs. Names, families, AST objects, notes, applicability and sources come from the encyclopedia. All hits and DOT pass a coverage gate before shield/HP damage. R and INACTIVE always cause zero antibiotic damage, regardless of upgrades. Unknown pairs remain unknown and inactive in gameplay. OUTSIDE_REGIMEN is never relabeled R.

I requires the appropriate increased exposure. CFZ starts with it; extended infusion supplies it only for beta-lactams, while the exposure reward can satisfy other supported I results. E. coli/CFZ's urinary-origin limit is active only in the UTI stage. ACTIVE retains its distinct literature-activity label. REGIMEN retains its label and is enabled only for the authored stage contexts: Legionella/lung and B. fragilis/abdomen. New nonbacterial records use explicit stage scenario IDs, never an unrestricted REGIMEN fallback: CMV retinitis in an adult with advanced HIV, and strongyloidiasis. These are labeled independent clinical-case encounters in an abstract arena, not a claim that every ICU patient has those diagnoses. The player must independently cover the co-occurring organisms in mixed encounters.

- Capsule is a separate shield and cannot be depleted by an inactive antibiotic.
- Static sources and Pseudomonas biofilm carriers protect nearby enemies behind line-of-sight checks. F dismantles the protection; penetration improves active drug delivery but never changes AST.
- Legionella has a host-cell enclosure. The stage-issued LEV reaches the authored intracellular target, removes the enclosure and briefly slows it. Other drugs retain their original classifications.
- Clostridial spores are dormant, invulnerable to antibiotics, and germinate after contact. Close F source control removes the dormant contamination. Vegetative toxin-producing enemies leave short-lived local toxin hazards; killing bacteria does not immediately erase those hazards. These are spatial game abstractions, not a model of systemic toxin clearance or a complete clinical treatment regimen.
- CZA is the existing ceftazidime–avibactam combination. The inhibitor reward unlocks that exact weapon; it never grants universal beta-lactam resistance bypass. KPC/DTR encounters use the corresponding fixed AST, not a universal rule for all CRE or Pseudomonas.

- CMV slowly restores a small amount of its existing HP while engaged; effective GCV hits suppress that arcade replication timer. Strongyloides moves in pulses and effective IVM hits briefly slow it. Neither creates unbounded additional enemies. Their clinical context comes from [NIH CMV guidance](https://clinicalinfo.hiv.gov/en/guidelines/hiv-clinical-guidelines-adult-and-adolescent-opportunistic-infections/cytomegalovirus) and [CDC Strongyloides guidance](https://www.cdc.gov/strongyloides/hcp/clinical-care/index.html); timing and movement are game abstractions.
- Non-effective hits emit bounded ricochet sparks and a metallic sound. R/INACTIVE use amber sparks; unknown/outside-regimen/condition failures retain their own reason and do not become resistance claims.

Interpretation references remain the encyclopedia and [EUCAST S/I/R definitions](https://www.eucast.org/bacteria/clinical-breakpoints-and-interpretation/definition-of-s-i-and-r/). [IDSA AMR guidance](https://www.idsociety.org/practice-guideline/amr-guidance/) supports distinguishing KPC and DTR targets, and [CDC Legionella guidance](https://www.cdc.gov/legionella/hcp/clinical-guidance/index.html) emphasizes Legionella-directed treatment. Damage, timing, resource recovery, toxin areas and boss phases are not doses, MICs or clinical effect sizes.

EASY has a compact “힌트 ON” checkbox in setup and pause. Scanning highlights only equipped, unlocked, host-permitted weapons with positive current coverage. The hint lasts eight seconds while that same live target stays under the scanner cone; dead targets, different targets and dormant spores produce no hint. Hard forcibly disables hints even if a previous Easy preference was selected.

Sprites communicate cocci pairs/clusters, elongated rods, enveloped viruses and motile larvae. Gram-positive bacteria are purple, Gram-negative pink, anaerobes gray and Pseudomonas green. These are stylized morphology/Gram conventions, not literal culture photographs. Name and HP labels follow visible sprite heads and honor the information level.

The 0-slot scanner uses no ammunition. Right-click narrows FOV to 2×, slows movement slightly and inspects the centered target after a short dwell, continuing through `??? → morphology → culture → AST`. Selecting a drug closes the scope, including returning to the same drug; Q also returns to that drug. Hard keeps pathogen-card links disabled until AST. Drug cards remain available while paused. All cards use the original Pathopedia inspector.

## Music

[Hallow Quest (8-bit)](https://opengameart.org/content/spooky-action-loop-hallow-quest) by Zane Little Music is released as CC0 1.0. The unmodified OGG is 964,508 bytes; source and license are recorded in `src/play-assets/LICENSE.txt`. Only MUSIC ON during play constructs the audio element and requests the track. It loops at low volume, pauses in menus/background tabs, and releases the media element on Play unmount. SFX has its own toggle. Music is not in the PWA install precache; the optional track may need a network connection. No source ZIP or WAV is kept.

## Runtime and validation

Only Play loads its five code/style files. Service-worker installation does not precache them; first entry caches them for later offline visits. Stage grids are constructed on entry and reuse small generated wall/enemy/weapon atlases. Exit stops the Kontra loop, aborts event listeners, releases pointer lock, disconnects observers, closes audio and disposes canvas/atlas backing stores.

Rendering remains capped at 640×360 or 480×270, fitted to aspect ratio and independent of DPR. Reused pixel/depth buffers, occlusion culling, 24 enemy slots, 24 projectile slots, 80 particles and 12 toxin hazards bound memory. The path cache is bounded to 16 typed-array fields. A room encounter does not require every enemy to pathfind each frame.

```sh
node --test tests/play.test.mjs tests/play-balance.test.mjs tests/app-routing.test.mjs
npm run build
```

Focused regressions cover deterministic seeds, connected objectives and encounters, safe spawn sightlines, view-ray discovery and occlusion, slot-0 scope/scan/switch behavior, source/boss exit gates, extraction with survivors, actual coverage, resource accounting and jump/collision. The existing CI suite also retains campaign and single-stage completion checks using real movement and resources. Short browser checks cover 16:9 layout, the small hotbar/red HP bar, scanner input, fullscreen, music loading/toggle and mobile fit. These checks verify function, not subjective combat enjoyment.

Temporary scripts, screenshots, logs and release snapshots are kept in ignored `.qa/`. Unused temporary artifacts must be listed and explicitly approved by the user before deletion. Deployment completion is checked by the user.

Persistent campaign saves/meta-unlocks, additional inhibitor combinations/MBL counters, multiplayer and detailed pharmacokinetics are outside this version.
