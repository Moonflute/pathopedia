# Play: Isolation Protocol — v0.21 learning and handling

`#play` is a single-player Canvas 2D raycasting FPS inside Pathopedia. It reuses the existing MIT [Kontra.js 10.0.2](https://github.com/straker/kontra) GameLoop, the encyclopedia AST and the existing card inspector. No new package dependency, 3D engine, downloaded game asset or physics engine is required.

## Playable scope

Eight stages: Community, catheter-associated UTI, Pneumonia, Intra-abdominal infection, Hospital-acquired infection, ICU, Resistant outbreak and Sepsis. Each constructs its own compact grid (26×22 to 32×28) on entry. Hand-authored loops, branching bypasses, a central atrium, irregular abscess pockets, a ward spine, isolation clusters, a containment ring and a pillared boss arena have different room bounds and connections. Cell ownership drives room-based aggro; it is no longer inferred from a fixed 3×3 layout. Complete all contacts and sources, then return to EXIT for a 3-choice reward and the next map. The full campaign has 144 opponents and 17 sources. Single-stage practice can start at any stage.

The 15 enemy types join existing records: SPN-105, SAU-001, ECO-009, SAU-002, ECO-010, KPN-409, PAE-013, PAE-014, KPN-012, EFM-008, BGX-501, BGX-515, CPE-122, CMV-804 and SST-715. They represent fixed educational isolates/clinical contexts, not species-wide susceptibility assumptions. The final KPC colony boss uses KPN-012's unchanged AST; its larger capsule, source protection and telegraphed projectile fan are arcade mechanics.

Nine configurable hotbar slots support eleven weapons: AMP, CFZ, CRO, VAN, MEM, LEV, MTZ, LZD, CZA, GCV and IVM. GCV replaces slot 1 on stage 6 and IVM replaces slot 2 on stage 7; the pause menu can reassign any issued weapon. CMV first appears on stage 6, Strongyloides on stage 7. The original five are issued initially. LEV/MTZ/LZD/CZA are guaranteed before stages 3/4/6/7 respectively. Rewards can issue them earlier, so random reward choices cannot remove a required counter. These are in-run unlocks. Highest score and sound preference persist; the active run remains in memory across tabs but resets on page reload.

## Controls and contact rules

WASD movement; horizontal mouse aim; left mouse fire; Space jump; R reload; 1–9 or wheel select; Q previous weapon; Shift dash; E scanner; F source control; Escape/Tab pause; B pause and open cards. Without pointer lock, dragging or arrow keys can turn. Mobile offers a joystick, drag aim and fire/scan/source/dash/reload/jump buttons. Jump uses a small vertical position/velocity under gravity; walls retain horizontal collision, while low projectiles and floor toxin can be avoided in the air.

The central lower hotbar contains numbered item silhouettes, magazine shot counts, fill bars and future supply labels. A large labeled health bar sits directly below it; the selected weapon shows magazine / reserve shots. The gun is drawn at the lower right, with stepped recoil and cartridge reload motion. Locked/allergy-restricted slots are skipped by cycling. Per-weapon cooldowns prevent inheriting another weapon's firing delay.

Idle enemies acquire contact only inside the player's current room, within 7.5 tiles, in the rendered horizontal view cone and with unobstructed line of sight. There is no age-based wakeup or global sound alert. A direct shot alerts only the struck target, even if resistant. Alerted enemies remember the last visible position for 5 seconds and search it; they do not navigate toward the player's hidden current position. Dormant spores do not chase. The minimap reveals explored room walls and discovered enemies.

Every scheduled enemy is positioned outside the entry room, at least six tiles from the start and out of its line of sight. All fit into the 24-slot pool and are materialized before exploration, without later visible spawning. Pressure rolls apply on entry. Crossing 40/70 can also substitute resistant/elite encounters that are still idle, undiscovered and hidden behind walls; visible or already engaged enemies never transform. Every encounter remains in the stage clear count.

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

EASY has an optional learning-hints checkbox in setup and pause. Scanning highlights only equipped, unlocked, host-permitted weapons with positive current coverage. The hint lasts eight seconds while that same live target stays under the scanner cone; dead targets, different targets and dormant spores produce no hint. Hard forcibly disables hints even if a previous Easy preference was selected.

Sprites communicate cocci pairs/clusters, elongated rods, enveloped viruses and motile larvae. Gram-positive bacteria are purple, Gram-negative pink, anaerobes gray and Pseudomonas green. These are stylized morphology/Gram conventions, not literal culture photographs. Name and HP labels follow visible sprite heads and honor the information level.

Hard mode preserves `??? → morphology → culture → AST`, including disabled pathogen-card links until AST. Drug cards remain available while paused. All cards use the original Pathopedia inspector.

## Runtime and validation

Only Play loads its five code/style files. Service-worker installation does not precache them; first entry caches them for later offline visits. Stage grids are constructed on entry and reuse small generated wall/enemy/weapon atlases. Exit stops the Kontra loop, aborts event listeners, releases pointer lock, disconnects observers, closes audio and disposes canvas/atlas backing stores.

Rendering remains capped at 640×360 or 480×270, fitted to aspect ratio and independent of DPR. Reused pixel/depth buffers, occlusion culling, 24 enemy slots, 24 projectile slots, 80 particles and 12 toxin hazards bound memory. The path cache is bounded to 16 typed-array fields. A room encounter does not require every enemy to pathfind each frame.

```sh
node --test tests/play.test.mjs tests/play-balance.test.mjs tests/app-routing.test.mjs
npm run build
```

Focused regressions cover Easy/Hard hint gating, target changes, actual coverage, reload resource accounting/cancellation, jump/landing/collision, safe spawn sightlines and all map paths. The existing CI suite also retains campaign and single-stage completion checks using real movement and resources. Browser smoke checks cover the checkbox, gold slots, lower health bar, R/Space inputs, late loadout editing and mobile controls. These checks verify function, not subjective combat enjoyment.

Temporary scripts, screenshots, logs and release snapshots are kept in ignored `.qa/`. Unused temporary artifacts must be listed and explicitly approved by the user before deletion. Deployment completion is checked by the user.

Persistent campaign saves/meta-unlocks, additional inhibitor combinations/MBL counters, multiplayer and detailed pharmacokinetics are outside this version.
