# Play: Isolation Protocol — v0.20 campaign

`#play` is a single-player Canvas 2D raycasting FPS inside Pathopedia. It reuses the existing MIT [Kontra.js 10.0.2](https://github.com/straker/kontra) GameLoop, the encyclopedia AST and the existing card inspector. No new package dependency, 3D engine, downloaded game asset or physics engine is required.

## Playable scope

Eight stages: Community, catheter-associated UTI, Pneumonia, Intra-abdominal infection, Hospital-acquired infection, ICU, Resistant outbreak and Sepsis. Each constructs a 26×22 grid on entry with different doors, obstacles, colors, infection site, enemy pool, source-control objectives and elite chance. Complete all contacts and sources, then return to EXIT for a 3-choice reward and the next map. The full campaign has 144 opponents and 17 sources. Single-stage practice can start at any stage.

The 13 enemy types join existing records: SPN-105, SAU-001, ECO-009, SAU-002, ECO-010, KPN-409, PAE-013, PAE-014, KPN-012, EFM-008, BGX-501, BGX-515 and CPE-122. They represent fixed educational isolates/clinical contexts, not species-wide susceptibility assumptions. The final KPC colony boss uses KPN-012's unchanged AST; its larger capsule, source protection and telegraphed projectile fan are arcade mechanics.

Nine fixed slots: AMP, CFZ, CRO, VAN, MEM, LEV, MTZ, LZD and CZA. The original five are issued initially. LEV/MTZ/LZD/CZA are guaranteed before stages 3/4/6/7 respectively. Rewards can issue them earlier, so random reward choices cannot remove a required counter. These are in-run unlocks. Highest score and sound preference persist; the active run remains in memory across tabs but resets on page reload.

## Controls and contact rules

WASD movement; horizontal mouse aim; left mouse/Space fire; 1–9 or wheel select; Q previous weapon; Shift dash; E scanner; F source control; Escape/Tab pause; B pause and open cards. Without pointer lock, dragging or arrow keys can turn. Mobile offers a joystick, drag aim and fire/scan/source/dash buttons.

The central lower hotbar contains numbered item silhouettes, current shot counts, refill bars and future supply labels. Locked/allergy-restricted slots are skipped by cycling. Per-weapon cooldowns prevent inheriting another weapon's firing delay.

Idle enemies acquire contact only inside the player's current room, within 7.5 tiles, in the rendered horizontal view cone and with unobstructed line of sight. There is no age-based wakeup or global sound alert. A direct shot alerts only the struck target, even if resistant. Alerted enemies remember the last visible position for 5 seconds and search it; they do not navigate toward the player's hidden current position. Dormant spores do not chase. The minimap reveals explored room walls and discovered enemies.

Rooms are populated as the player approaches. The pressure roll occurs when an encounter is populated, preserving a reason to limit broad-spectrum use. Every scheduled encounter is included in the stage clear count.

## Resource and progression changes

Base energy is 200 (previously 100). Selected/stowed recovery is 8/26 per second (previously 4/17); kills restore 10 to each reservoir; supply pickups refill all reservoirs and respawn in 25 seconds. HUD shot counts divide energy by the actual upgraded cost. Reserve rewards add 60 capacity, up to three times. Source removal also supplies energy and modest host support.

17 rewards cover extended infusion, increased exposure, immune clearance, rapid scanner, de-escalation, efficiency, reserve capacity, firing intervals, biofilm penetration, host stabilization, source control, renal adjustment, mobility and four early weapon unlocks. Repeatable support/source/de-escalation options keep three choices available after capped upgrades.

Host settings are normal, neutropenia, renal impairment and confirmed aminopenicillin allergy. Neutropenia lengthens immune-clearance intervals; ICU further reduces that passive. Renal impairment reduces regeneration for renally handled drugs by 25% until adjusted; these are resource abstractions, not dose recommendations. Allergy blocks AMP specifically; other beta-lactams have been individually assessed in this authored scenario. The game does not treat all beta-lactam allergies as interchangeable.

## Coverage and special mechanics

`createPlayCatalog` joins `data/organisms.json` by stable record/drug IDs. Names, families, AST objects, notes, applicability and sources come from the encyclopedia. All hits and DOT pass a coverage gate before shield/HP damage. R and INACTIVE always cause zero antibiotic damage, regardless of upgrades. Unknown pairs remain unknown and inactive in gameplay. OUTSIDE_REGIMEN is never relabeled R.

I requires the appropriate increased exposure. CFZ starts with it; extended infusion supplies it only for beta-lactams, while the exposure reward can satisfy other supported I results. E. coli/CFZ's urinary-origin limit is active only in the UTI stage. ACTIVE retains its distinct literature-activity label. REGIMEN retains its label and is enabled only for the authored stage contexts: Legionella/lung and B. fragilis/abdomen. The player must independently cover the co-occurring organisms in mixed encounters.

- Capsule is a separate shield and cannot be depleted by an inactive antibiotic.
- Static sources and Pseudomonas biofilm carriers protect nearby enemies behind line-of-sight checks. F dismantles the protection; penetration improves active drug delivery but never changes AST.
- Legionella has a host-cell enclosure. The stage-issued LEV reaches the authored intracellular target, removes the enclosure and briefly slows it. Other drugs retain their original classifications.
- Clostridial spores are dormant, invulnerable to antibiotics, and germinate after contact. Close F source control removes the dormant contamination. Vegetative toxin-producing enemies leave short-lived local toxin hazards; killing bacteria does not immediately erase those hazards. These are spatial game abstractions, not a model of systemic toxin clearance or a complete clinical treatment regimen.
- CZA is the existing ceftazidime–avibactam combination. The inhibitor reward unlocks that exact weapon; it never grants universal beta-lactam resistance bypass. KPC/DTR encounters use the corresponding fixed AST, not a universal rule for all CRE or Pseudomonas.

Interpretation references remain the encyclopedia and [EUCAST S/I/R definitions](https://www.eucast.org/bacteria/clinical-breakpoints-and-interpretation/definition-of-s-i-and-r/). [IDSA AMR guidance](https://www.idsociety.org/practice-guideline/amr-guidance/) supports distinguishing KPC and DTR targets, and [CDC Legionella guidance](https://www.cdc.gov/legionella/hcp/clinical-guidance/index.html) emphasizes Legionella-directed treatment. Damage, timing, resource recovery, toxin areas and boss phases are not doses, MICs or clinical effect sizes.

Hard mode preserves `??? → morphology → culture → AST`, including disabled pathogen-card links until AST. Drug cards remain available while paused. All cards use the original Pathopedia inspector.

## Runtime and validation

Only Play loads its five code/style files. Service-worker installation does not precache them; first entry caches them for later offline visits. Stage grids are constructed on entry and reuse small generated wall/enemy/weapon atlases. Exit stops the Kontra loop, aborts event listeners, releases pointer lock, disconnects observers, closes audio and disposes canvas/atlas backing stores.

Rendering remains capped at 640×360 or 480×270, fitted to aspect ratio and independent of DPR. Reused pixel/depth buffers, occlusion culling, 24 enemy slots, 24 projectile slots, 80 particles and 12 toxin hazards bound memory. The path cache is bounded to 16 typed-array fields. A room encounter does not require every enemy to pathfind each frame.

```sh
node --test tests/play.test.mjs tests/play-balance.test.mjs tests/app-routing.test.mjs
npm run build
```

28 engine/data regressions cover contact range/room/FOV/occlusion, lost-contact expiry, clinical gating, resource changes, all maps/encounter paths, host restrictions, spore/toxin/cell/biofilm mechanics, unlocks, rewards and extraction. Four full campaigns cover normal, allergy, renal and Hard+neutropenia. Eight additional cases verify each stage independently. The deterministic QA player uses actual movement, aiming, resources, scanner, F and reward selection, without teleportation or invulnerability. The tested full runs clear in 3:51–4:39 of simulated action time; human exploration and decision time is additional. These tests verify completion, not enjoyment.

Browser checks cover desktop/mouse and mobile/touch fighting, no Play downloads on home, pause and route cleanup, Hard scanning, all nine slots, Q/wheel, specialist cards, host restrictions and reward-to-map transitions. Visual fixtures are injected into QA responses only; no test globals ship. Screenshots, test logs and performance/offline probes live in ignored `.qa/`.

Persistent campaign saves/meta-unlocks, additional inhibitor combinations/MBL counters, multiplayer and detailed pharmacokinetics are outside this version.
