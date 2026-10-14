# Play: Isolation Protocol — v0.23

`#play` is a single-player Canvas 2D raycasting FPS inside Pathopedia. It reuses the existing MIT [Kontra.js 10.0.2](https://github.com/straker/kontra) GameLoop, encyclopedia AST and card inspector. There is no new package, 3D engine or physics engine. Music is optional and loaded one track at a time.

## Campaign and maps

Eight stages: Community, catheter-associated UTI, Pneumonia, Intra-abdominal infection, Hospital-acquired infection, ICU, Resistant outbreak and Sepsis. Each constructs a seeded 30–38 × 26–32 tile map on entry. Non-overlapping rooms connect through a spanning tree plus flanking routes, with varied proportions and cover. The original generator is informed by [Bob Nystrom's Rooms and Mazes](https://journal.stuffwithstuff.com/2014/12/21/rooms-and-mazes/); it adds no runtime dependency.

A number or text seed reproduces geometry and starting encounters. Blank generates a new run. The campaign schedules 144 opponents and 17 optional sources; single-stage practice can start at any sector. Kill every opponent, including the final KPC boss, then reach the distant EXIT. Arriving early reports the remaining enemy count. Sources weaken biofilm and grant supplies rather than acting as collection-based exit gates.

Every campaign enemy starts outside the entry room and sightline, at least six tiles away. All fit in the 24-slot pool and are materialized before exploration. At least ceil(stage count × 0.30) encounters are ordinary profiles protected from pressure substitutions. Later stages retain susceptible opponents. Pressure crossing 40/70 can replace only idle, undiscovered, hidden encounters; visible opponents never transform.

Six generated wall materials (tile, masonry, observation window, vent, pipes, isolation panel) combine with four palettes. All wall, enemy and weapon atlases are created locally. No textures or models are downloaded.

## Controls and display

- WASD movement; mouse horizontal/vertical aim; left mouse fire; Space jump; Shift dash.
- 1–9 / wheel select drugs; Q previous drug; R reload; G throw decontamination canister.
- Hold right mouse to use the separate left offhand scanner; release to restore the same gun. It does not consume a numbered slot or ammunition.
- F source control; Esc/Tab pause; B pause and open cards. Without pointer lock, drag to aim; arrow keys turn/look. Touch has joystick, drag look, hold scanner, throw, fire, reload, jump and dash.

Vertical view shifts the raycasting horizon while keeping the reticle fixed. Hits and scans check the billboard's vertical extent. Looking at the ceiling cannot hit an enemy below the reticle. Collision stays on a flat grid; jumping cannot pass through walls, but can avoid low projectiles and floor toxin. This is 2.5D, without stacked floors or full 3D pitch geometry.

The viewport is 16:9 with fullscreen/theater support; portrait phones have a taller layout. Nine compact drug slots sit centrally below the view, alongside the offhand scanner, above a red 15px HP bar. Survival adds a small XP meter. Names/HP follow visible sprite heads and honor Hard information levels. Purple cocci/rods denote Gram-positive profiles, pink Gram-negative, gray anaerobes and green Pseudomonas. These are stylized morphology/Gram conventions, not culture photographs. The lower-right gun has authored perspective, both hands, recoil and reload movement.

## Contact, scanner and resources

Campaign idle enemies detect only within the current room, 7.5 tiles, visible view cone and line of sight. Direct hits alert only the struck target. Pursuit remembers the last visible position for five seconds, then returns to idle. Survival uses active pursuit instead. Dormant spores do not chase until germination.

The scanner narrows FOV to 2× and inspects after a short dwell. Hard unlocks unknown → morphology → culture/identification → AST/regimen; rapid diagnostics advances two steps. Hard never grants Easy hints or early pathogen-card access. Easy hints mark ready weapons with positive current coverage in gold. Scanned state belongs to each enemy for its lifetime: look away to hide hints, look back to restore them. Recycled enemy slots reset this state. The minimap either reveals geometry fully or accumulates actual sight rays, stopping at walls; enemies still require discovery.

Reserve energy is 200 per drug. Magazines hold 5–20 base shots. Selected/stowed reserve regeneration is 8/26 per second, kills add 10 and supply pickups refill reserves. R transfers reserves only when reload completes; switching or scanning cancels without consuming them. Reload is 20% faster than v0.22 and uses synthesized magazine-out, insert and latch sounds. Per-weapon cooldowns prevent switching from bypassing fire-rate limits.

Eleven weapons join original records: AMP, CFZ, CRO, VAN, MEM, LEV, MTZ, LZD, CZA, GCV, IVM. The first five are issued initially; LEV, MTZ, LZD + GCV and CZA + IVM are issued before stages 3, 4, 6 and 7 respectively. GCV replaces slot 1 at tier 6 and IVM slot 2 at tier 7. Pause can reassign any issued weapon. Rewards can unlock selected drugs early; random choices never remove a required counter. There are 17 campaign rewards for exposure, infusion, immunity, diagnostics, stewardship, ammo, rate, efficiency, penetration, source control, host support and weapons.

## Coverage and clinical boundaries

`createPlayCatalog(database, library)` joins the existing 15 fixed isolates/clinical profiles and 11 drugs. Names, families and AST objects remain shared with the encyclopedia. R and INACTIVE always cause zero antibiotic damage, before shield, HP or DOT multipliers. Unknown pairs remain inactive. OUTSIDE_REGIMEN is not relabeled R. I requires increased exposure; CFZ starts with it, infusion supplies beta-lactam exposure and the broader optimization upgrade supplies other classes. CFZ urinary-only results remain site-limited. ACTIVE and REGIMEN are not relabeled S.

Capsule absorbs damage, biofilm/source protection reduces incoming damage and F disrupts it. Intracellular targets have a cell barrier; LEV reaches that target. Dormant spores resist antibiotic damage until germination, can be removed with F, and vegetative toxin producers leave floor hazards. CMV's authored case is advanced-HIV adult retinitis, with GCV suppressing replication; Strongyloides uses its named treatment scenario and IVM slows the larvae. These cases enter only in later tiers. KPC boss phases do not change its original AST.

Normal, neutropenic, renal-impaired and confirmed aminopenicillin-allergic hosts change gameplay. Neutropenia lengthens immune/recovery intervals. Renal impairment lowers regeneration of selected renally handled drugs until adjusted. Allergy blocks AMP specifically; other beta-lactams are assessed in the authored scenario. These are resource abstractions, not clinical doses or interchangeable allergy rules.

## Stage review and common DB

Results show encountered kinds, kills, manually targeted effective/blocked shots, per-drug counts and misses. Automatic, environmental and support kills are separate from manual selection accuracy. Its denominator is manually targeted shots, with misses reported separately. This is a coverage metric, not a clinical prescribing grade.

The authored source `content/cards/therapies.json` contains 42 clinical contexts (11 added), compiled into `data/library.json`. Together with prior entries, all 15 Play profiles have context-specific teaching. The card inspector consumes the same metadata. Optional site/scenario tags select a relevant context; otherwise the result explicitly labels a separate teaching case. Patient/AST/severity/combination conditions remain in the named context and note. No duplicate clinical paragraphs live in Play data.

Primary references include IDSA/ATS, CDC, NIH and SIS: MRSA lung versus bloodstream choices, ESBL cUTI versus invasive treatment, DTR Pseudomonas, VRE catheter infection, Legionella, intra-abdominal anaerobic combination coverage, clostridial myonecrosis surgery plus penicillin/clindamycin, CMV retinitis and strongyloidiasis. A species name or S result alone is never asserted to imply universal first-line therapy. Drugs outside the game roster can appear in the clinical note.

## Endless survival

ENDLESS is a separate mixed-case arena with broad circulation loops. Enemies spawn at least six tiles away outside the forward sightline, from precomputed safe positions. The pool caps at 40; one in three attempts selects an ordinary profile independently of resistance pressure. Threat tier increases every 70 seconds, issuing drugs before their cases appear. Late HP scaling never changes coverage. The exit permits optional extraction after 90 seconds; otherwise the run continues until death.

Kills drop pooled specimen XP. Collecting it yields levels with three augment choices. Thirteen augments include a CRO satellite, isolation slowdown, collection drone, faster reload, recovery, environmental supplies, exposure/infusion, rate/efficiency and repeatable support. The starting CRO satellite checks the same coverage and adds pressure when attacking; it does not inflate manual accuracy. At capped upgrades, three repeatable support options remain.

In this explicitly mixed-case arena, Legionella retains lung context, B. fragilis abdominal context, CMV advanced-HIV retinitis, and Strongyloides strongyloidiasis, regardless of threat tier. Each case's named clinical conditions also appear in results. Other fixed AST profiles use bloodstream context. The campaign's site-specific behavior remains unchanged.

## Environmental consumable

G throws one of three starting canisters, maximum five; supply adds one and a stage reward adds two. Its arc lands in a 2.3-tile field lasting 4.5 seconds before upgrades. The field needs line of sight, is weakened by biofilm and does not affect dormant spores or the helminth profile. This is environmental-decontamination game damage, not an antibiotic delivered into a patient. It never changes AST or grants manual selection credit. The spore distinction follows [CDC disinfectant guidance](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/chemical-disinfectants.html). No formulation or clinical dosing is modeled.

## Optional music

Five unmodified CC0 loops total 6,885,981 bytes: Hallow Quest (Zane Little Music), Flowerbed Fields (Zane Little Music), Honey Bear (TinyWorlds), Dark Shrine (qubodup / yd), and Chiptune Battle (pmiller). Source/license declarations are in `src/play-assets/LICENSE.txt` and menu credit links. No source ZIP or WAV is retained.

Only the selected track is fetched after MUSIC ON during play. AUTO changes by campaign sector or survival time; the menu selects directly and the top arrow advances tracks. One HTML audio element is reused, pauses in menus/background and releases its source on unmount. SFX uses short generated sounds and a separate toggle. Music is excluded from PWA precache and may require a connection; neither entering Play nor MUSIC OFF loads the playlist.

## Runtime and verification

Only Play loads its five code/style files. PWA installation does not precache them; first entry caches them for offline visits. Unmount stops Kontra, aborts listeners, releases pointer lock, disconnects observers, closes audio and disposes all canvas/atlas backing stores.

Rendering caps at 640×360 or 480×270, independent of DPR. Reused pixel/depth buffers, frustum/occlusion checks, 24 campaign/40 survival enemies, 24 hostile projectiles, 80 particles, 12 toxin hazards, 4 thrown canisters, 6 disinfectant fields and 64 XP orbs bound memory. The navigation cache holds at most 16 typed-array fields. Counters grow numerically; per-kind/per-drug review maps remain bounded by the fixed catalog.

Focused regressions cover coverage gates, held scanning and persistent hints, vertical targeting, safe seeded encounters, susceptible quotas, all-enemy exit gates, review accounting, throwables and survival pools/augments. Existing CI retains campaign and single-stage completion using real movement and resources. Short desktop/mobile checks cover offhand input, vertical look, G, music loading, review and three-choice level-up. These checks establish function; the user evaluates game feel and deployment success.

Temporary verification images and release snapshots belong in ignored `.qa/`. List exact artifacts and obtain explicit user permission before deleting them. Deployment completion is checked by the user. Persistent campaign/meta-unlock saves, multiplayer, additional inhibitor/MBL combinations and detailed PK simulation remain outside this prototype. Preferences and best score persist; the active run survives tab switches in memory but resets on page reload.
