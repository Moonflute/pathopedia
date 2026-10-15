# Play: Isolation Protocol — v0.26

`#play` is a single-player Canvas 2D raycasting FPS inside Pathopedia. It reuses the existing MIT [Kontra.js 10.0.2](https://github.com/straker/kontra) GameLoop, encyclopedia AST and card inspector. There is no new package, 3D engine or physics engine. Music is optional and loaded one track at a time.

## Campaign and maps

Eight campaign stages retain their authored enemy pools and clinical sites. A 52×38 tile facility contains six authored spaces: reception, culture hall, observation deck, focus chamber, recovery and containment. Seeds vary room dimensions, recessed bays, side approaches and encounter placement. The same map language also supports the two independent themes; it is one representative facility design, not a large collection of unrelated maps.

Three- to four-tile routes provide room to observe, switch drugs and retreat. The observation deck has five real 0.12-unit steps to a 0.6-unit upper floor. Floor/ceiling heights are shared by rendering, navigation, collision, aiming, projectiles and effects. Geometry is 2.5D and never stacks traversable rooms on top of each other. Beating the middle encounter opens a shortcut to the entry wing. No key collection is required.

The design uses landmarks, repeated views of familiar spaces and contrasting light levels, informed by [John Romero's discussion of DOOM](https://www.stuff.tv/features/stuff-meets-doom-and-wolfenstein-3d-creator-john-romero/). Weapon selection remains based on pathogen/AST/site, never room shape.

A number or text seed reproduces geometry and starting encounters. The campaign schedules 144 opponents, including one middle encounter per stage, MSSA and Pseudomonas stage bosses in Community/Hospital, and the final KPC boss. Fixed infection-source devices are removed. Kill all opponents and reach EXIT.

Every campaign enemy starts outside the entry room and sightline, at least six tiles away. The 24-slot pool fits the full stage. At least ceil(stage count × 0.30) scheduled opponents remain ordinary profiles protected from pressure substitutions. Pressure crossing 40/70 can replace only idle, undiscovered, hidden encounters; visible opponents never transform.

General enemy sprite height is 0.68 (previously 0.9), chase speed is 78% of the previous profile speed, and acquisition takes 0.6 seconds. Separation velocity is normalized; a 0.3-second melee grace prevents simultaneous overlapping hits. Elite, middle and stage bosses have distinct silhouettes/sizes. Higher stats never change susceptibility. Major encounters telegraph attacks, change patterns at half HP and award health, ammunition and a canister; their HUD appears only during engagement.

Seven small unmodified Freedoom PNGs provide five materials, a floor and a medical pickup. They are lazily loaded into local atlases and combined with authored door trim, signs, static light levels, terminals, specimen racks and other procedural sprites. [Source, revision, copyright and license](../src/vendor/freedoom/README.md) accompany the assets. No runtime package or heavyweight rendering engine is added.

## Controls and display

- WASD movement; mouse horizontal/vertical aim; left mouse fire; Space jump; Shift dash.
- 1–9 / wheel select drugs; Q previous drug; R reload; G throw decontamination canister.
- Hold right mouse to use the separate left offhand scanner; release to restore the same gun. It does not consume a numbered slot or ammunition.
- F disrupt biofilm or clear dormant spores/toxin hazards; Esc/Tab pause; B pause and open cards. Without pointer lock, drag to aim; arrow keys turn/look. Touch has joystick, drag look, hold scanner, throw, fire, reload, jump and dash.

Vertical view shifts the raycasting horizon while keeping the reticle fixed. Hits and scans check the billboard's vertical extent. Looking at the ceiling cannot hit an enemy below the reticle. Collision follows tile floor heights, permits stair steps, blocks taller ledges and ceilings, and uses gravity after a drop. Jumping cannot pass through walls. Projectiles interpolate height toward the target. This is 2.5D, without stacked floors or full 3D pitch geometry.

The viewport fills available space with fullscreen/theater support; its aspect adapts to the browser while preserving vertical visibility on wide displays. Nine compact drug slots sit centrally below the view, alongside the offhand scanner, above a red 15px HP bar. Survival adds a small XP meter. Names/HP follow visible sprite heads and honor Hard information levels. Purple cocci/rods denote Gram-positive profiles, pink Gram-negative, gray anaerobes and green Pseudomonas. These are stylized morphology/Gram conventions, not culture photographs. The lower-right gun has authored perspective, both hands, recoil and reload movement.

## Contact, scanner and resources

Campaign idle enemies detect only within the current room, 7.5 tiles, visible view cone and line of sight. Direct hits alert only the struck target. Pursuit remembers the last visible position for five seconds, then returns to idle. Survival uses active pursuit instead. Dormant spores do not chase until germination.

The scanner narrows FOV to 2× and inspects after a short dwell. Hard unlocks unknown → morphology → culture/identification → AST/regimen; rapid diagnostics advances two steps. Hard never grants Easy hints or early pathogen-card access. Easy hints mark ready weapons with positive current coverage in gold. Scanned state belongs to each enemy for its lifetime: look away to hide hints, look back to restore them. A completed AST scan also changes that target's overhead name to a resistance-first label (for example, S. aureus → MRSA · S. aureus), retained after putting the scanner away. Other unscanned targets keep their base name, and Hard still requires its information stages. AST kits confirm the targeted name too. Recycled enemy slots reset this state. The minimap either reveals geometry fully or accumulates actual sight rays, stopping at walls; enemies still require discovery.

Reserve energy is 200 per drug. Magazines hold 5–20 base shots. Selected/stowed reserve regeneration is 8/26 per second, kills add 10 and supply pickups refill reserves. R transfers reserves only when reload completes; switching or scanning cancels without consuming them. Reload is 20% faster than v0.22 and uses synthesized magazine-out, insert and latch sounds. Per-weapon cooldowns prevent switching from bypassing fire-rate limits.

Twelve weapons join original records: AMP, CFZ, CRO, VAN, MEM, LEV, MTZ, LZD, CZA, GCV, IVM, ACV (viral theme). The first five are issued initially; LEV, MTZ, LZD + GCV and CZA + IVM are issued before stages 3, 4, 6 and 7 respectively. GCV replaces slot 1 at tier 6 and IVM slot 2 at tier 7. Pause can reassign any issued weapon. Rewards can unlock selected drugs early; random choices never remove a required counter. There are 22 campaign rewards for exposure, infusion, immunity, diagnostics, stewardship, ammo, rate, efficiency, penetration, source control, host support and weapons.

## Coverage and clinical boundaries

`createPlayCatalog(database, library)` joins the existing 17 fixed isolates/clinical profiles and 12 drugs. Names, families and AST objects remain shared with the encyclopedia. R and INACTIVE always cause zero antibiotic damage, before shield, HP or DOT multipliers. Unknown pairs remain inactive. OUTSIDE_REGIMEN is not relabeled R. I requires increased exposure; CFZ starts with it, infusion supplies beta-lactam exposure and the broader optimization upgrade supplies other classes. CFZ urinary-only results remain site-limited. ACTIVE and REGIMEN are not relabeled S.

Capsule absorbs damage, biofilm from nearby carrier enemies reduces incoming damage and F disrupts it. Intracellular targets have a cell barrier; LEV reaches that target. Dormant spores resist antibiotic damage until germination, can be removed with F, and vegetative toxin producers leave floor hazards. CMV's authored case is advanced-HIV adult retinitis, with GCV suppressing replication; Strongyloides uses its named treatment scenario and IVM slows the larvae. In the campaign and endless mode these cases enter only in later tiers; independent themes issue their counters from the start. KPC boss phases do not change its original AST.

Normal, neutropenic, renal-impaired and confirmed aminopenicillin-allergic hosts change gameplay. Neutropenia lengthens immune/recovery intervals. Renal impairment lowers regeneration of selected renally handled drugs until adjusted. Allergy blocks AMP specifically; other beta-lactams are assessed in the authored scenario. These are resource abstractions, not clinical doses or interchangeable allergy rules.

## Stage review and common DB

Results show encountered kinds, kills, manually targeted effective/blocked shots, per-drug counts and misses. Automatic, environmental and support kills are separate from manual selection accuracy. Its denominator is manually targeted shots, with misses reported separately. This is a coverage metric, not a clinical prescribing grade.

The authored source `content/cards/therapies.json` contains 43 clinical contexts, compiled into `data/library.json`. Together with prior entries, all 17 Play profiles have context-specific teaching. The card inspector consumes the same metadata. Optional site/scenario tags select a relevant context; otherwise the result explicitly labels a separate teaching case. Patient/AST/severity/combination conditions remain in the named context and note. No duplicate clinical paragraphs live in Play data.

Primary references include IDSA/ATS, CDC, NIH and SIS: MRSA lung versus bloodstream choices, ESBL cUTI versus invasive treatment, DTR Pseudomonas, VRE catheter infection, Legionella, intra-abdominal anaerobic combination coverage, clostridial myonecrosis surgery plus penicillin/clindamycin, CMV retinitis and strongyloidiasis. A species name or S result alone is never asserted to imply universal first-line therapy. Drugs outside the game roster can appear in the clinical note.

## Endless survival

ENDLESS is a separate mixed-case arena with three circulation routes through a broad commons and surrounding wings. Enemies spawn at least six tiles away outside the forward sightline, from precomputed safe positions. The pool caps at 40; two in three ordinary spawn attempts select an ordinary profile independently of resistance pressure. Threat tier increases every 70 seconds, issuing drugs before their cases appear. Late HP scaling never changes coverage. The exit permits optional extraction after 90 seconds; otherwise the run continues until death.

Kills drop pooled specimen XP. Collecting it yields levels with three augment choices. Augments include a CRO satellite, isolation slowdown, collection drone, faster reload, recovery, environmental supplies, exposure/infusion, rate/efficiency and repeatable support. The starting CRO satellite checks the same coverage and adds pressure when attacking; it does not inflate manual accuracy. Immune Echo adds a second visible engaged target within the companion's existing target group. Isolation Trail leaves a three-second slowing field at the dash origin, without drug damage. Grenadier increases field radius and duration. At capped upgrades, three repeatable support options remain.

A 75-second build/surge/fade/recovery cycle modulates spawn rate and the active population cap without changing AST or despawning existing enemies. A major encounter is scheduled every 120 seconds, alternating middle and stage bosses; a surviving major blocks a duplicate. Defeat grants a 12-second recovery interval and pooled XP. This pacing takes inspiration from [Valve's Left 4 Dead presentation](https://cdn.akamai.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf).

In this explicitly mixed-case arena, Legionella retains lung context, B. fragilis abdominal context, CMV advanced-HIV retinitis, and Strongyloides strongyloidiasis, regardless of threat tier. Each case's named clinical conditions also appear in results. Other fixed AST profiles use bloodstream context. The campaign's site-specific behavior remains unchanged.

## Environmental consumable

G throws one of three starting canisters, maximum five; supply adds one and a stage reward adds two. Its arc lands in a 2.3-tile field lasting 4.5 seconds before upgrades. The field needs line of sight, is weakened by biofilm and does not affect dormant spores or parasite profiles. This is environmental-decontamination game damage, not an antibiotic delivered into a patient. It never changes AST or grants manual selection credit. The spore distinction follows [CDC disinfectant guidance](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/chemical-disinfectants.html). No formulation or clinical dosing is modeled.

## Optional music

Five unmodified CC0 loops total 6,885,981 bytes: Hallow Quest (Zane Little Music), Flowerbed Fields (Zane Little Music), Honey Bear (TinyWorlds), Dark Shrine (qubodup / yd), and Chiptune Battle (pmiller). Source/license declarations are in `src/play-assets/LICENSE.txt` and menu credit links. No source ZIP or WAV is retained.

Only the selected track is fetched after MUSIC ON during play. AUTO changes by campaign sector or survival time; the menu selects directly and the top arrow advances tracks. One HTML audio element is reused, pauses in menus/background and releases its source on unmount. SFX uses short generated sounds and a separate toggle. Music is excluded from PWA precache and may require a connection; neither entering Play nor MUSIC OFF loads the playlist.

## Runtime and verification

Only Play loads its nine code/style files. PWA installation does not precache them; first entry caches them for offline visits. Unmount stops Kontra, aborts listeners, releases pointer lock, disconnects observers, closes audio and disposes all canvas/atlas backing stores.

Rendering caps at 640×360 or 480×270, independent of DPR. Reused pixel/depth buffers, frustum/occlusion checks, 24 campaign/40 survival enemies, 24 hostile projectiles, 80 particles, 12 toxin hazards, 4 thrown canisters, 6 disinfectant fields and 64 XP orbs bound memory. The navigation cache holds at most 16 typed-array fields. Counters grow numerically; per-kind/per-drug review maps remain bounded by the fixed catalog.

Focused regressions cover coverage gates, held scanning and persistent hints, vertical targeting, safe seeded encounters, susceptible quotas, all-enemy exit gates, review accounting, throwables and survival pools/augments. Existing CI retains campaign and single-stage completion using real movement and resources. Short desktop/mobile checks cover offhand input, vertical look, G, music loading, review and three-choice level-up. These checks establish function; the user evaluates game feel and deployment success.

Temporary verification images and release snapshots belong in ignored `.qa/`. List exact artifacts and obtain explicit user permission before deleting them. Deployment completion is checked by the user. Persistent campaign/meta-unlock saves, multiplayer, additional inhibitor/MBL combinations and detailed PK simulation remain outside this prototype. Preferences and best score persist; the active run survives tab switches in memory but resets on page reload.

## Independent themes and immune companions (v0.24)

THEME is separate from campaign tiers. Both operations are selectable immediately, have 14 encounters with a safe empty entry, use normal HP/damage and issue nine suitable slots before combat. Pressure does not replace their authored theme cases with resistant bacteria. A small bacterial cohort remains.

- Viral Observatory: HSV-2's first genital-herpes case and advanced-HIV CMV retinitis remain separate clinical cases in the same abstract laboratory. ACV and GCV are issued immediately; each follows its original REGIMEN/OUTSIDE_REGIMEN entries. Effective antiviral hits suppress the replication mechanic. Violet diagnostic walls distinguish this map.
- Parasite Conservatory: Giardia trophozoites use an original dual-nucleus/flagella sprite and the symptomatic-giardiasis scenario; Strongyloides retains the larval scenario. MTZ and IVM are issued immediately. Muted green departmental markings distinguish the theme. These are parallel educational cases, not one patient's combined diagnosis.

The shared therapy DB adds the Giardia context and tags the existing HSV context. [CDC Giardia care](https://www.cdc.gov/giardia/hcp/clinical-care/index.html) lists metronidazole among effective options, not one universal first-line choice. [CDC genital-herpes guidance](https://www.cdc.gov/std/treatment-guidelines/herpes.htm) supplies the existing HSV case.

One immune companion can be equipped. Collect a non-respawning immune-support crate or choose a companion reward/augment to recruit a companion. The menu starts without one. The pause terminal swaps only owned companions; unequipping is allowed. An activation upgrade improves range/frequency, not target classes. Acquisition never accumulates extra pet instances: one small world-space sprite, one timer and a short bounded visual trail are reused.

The companion acts only against revealed, actively engaged targets in range with line of sight from both player and companion. It never initiates room-wide aggro, attacks through walls, or damages dormant spores. Neutrophils pulse bacteria rapidly; macrophages prioritize weakened bacteria; NK cells attack the viral infected-cell abstraction and briefly suppress replication; eosinophils attack helminth larvae, not Giardia protozoa. Neutropenia slows the neutrophil companion. Capsule, biofilm and intracellular barriers reduce appropriate phagocytic damage.

These are deliberately restricted gameplay roles, informed by the [components of immunity](https://www.ncbi.nlm.nih.gov/books/NBK27092/), [phagocyte recognition](https://www.ncbi.nlm.nih.gov/books/NBK27105/), and [antibody-mediated effector functions](https://www.ncbi.nlm.nih.gov/books/NBK27171/). The simulation does not claim these cells have only those targets in biology. Viral avatars represent infected-cell cases for NK attacks. Host-support damage is separate from antibiotics: resistance is not immune evasion, drug AST never changes, and companion kills count as support rather than manual weapon-selection accuracy.

The viewport fills available browser space, with adaptive horizontal FOV on wide displays and unchanged 640×360 / 480×270 rendering caps. Setup has operation/information, environment/controls and advanced tabs. Pause has equipment/companions, environment/controls and encyclopedia tabs. Information buttons keep fixed dimensions. Explanatory text follows the control guide.

Reload audio uses three lazily cached short mechanical Foley buffers: magazine release/slide, seating and bolt latch. Noise transients, damped metallic partials and short body impacts replace the previous pitched notification; no audio download is added. The buffers are disposed with the Play view.


## Combat, information and review

Weapons now differ mechanically: AMP repeats; CFZ casts five spread rays with per-target damage capped; CRO/CZA charge briefly before firing; MEM/ACV deliver three delayed packets; LEV/IVM pierce up to three aligned visible targets; LZD emits frequent low-recoil beam ticks; VAN/MTZ/GCV use heavy pulses. Charging fits inside the original firing cadence. Releasing fire cancels a charge without cost. Switching, scanning and reloading cancel pending packets. Every packet/pellet/penetrated target retains the common coverage gate. These firing modes are arcade representations, not pharmacological claims.

Impact confirmation distinguishes susceptible tissue (green cross), capsule/cell/biofilm protection (blue square) and ineffective contact (amber deflection). Per-mode shot sounds and three impact families are synthesized lazily, with at most 12 simultaneous short voices. Tracers are capped at 12. Capsule and biofilm use separate outlines/rings. Resistant phenotypes receive game markings only after AST is known; their real microscopy shapes remain the same as susceptible counterparts.

When three or fewer enemies remain, a periodic minimap pulse marks a contact and a BFS route supplies the next walkable direction, respecting walls. Once cleared, the same guide leads to the exit. The minimap can be toggled with M or its touch button. Pressure notifications and the debrief count actual pressure-caused profile replacements and extra elites separately from baseline stage spawns. Automatic CRO pressure is included.

Setup has three tabs: operation/information level, environment/controls, and advanced settings. Controls appear once. No companion is selected by default; acquired companions are equipped from the equipment panel. Information levels are Guided (name/AST plus scanned-target hints), Open (name/AST), Identify (name, scan AST), and Blind (unknown → morphology → identity → AST). Enemy stats do not change across these four levels. Touch offers sensitivity presets, an optional gentle horizontal aim attraction for revealed visible contacts, a small hit tolerance and weapon-strip swipes. Mouse aiming does not receive the touch tolerance.

The debrief reuses sprite-atlas portraits and shared therapy contexts. It separates first effective contact, ineffective contacts, average time from initial combat contact to effective fire, time from the first wrong contact to effective fire, and opportunities to choose a narrower available weapon. A multi-target shot counts once per target; a three-packet burst counts once for the same target. Support, environmental and automatic kills remain separate. These are transient per-run results, not analytics uploads or persisted learner profiles.

The narrower-choice metric uses explicit comparisons for susceptible pneumococci, MSSA and susceptible E. coli/Klebsiella, not a universal spectrum ranking. It requires known AST plus a currently equipped, host-compatible, loaded, off-cooldown alternative in range with valid site/exposure coverage. CFZ urinary restrictions remain in force. Resistant, specialist and unresolved cases are not labelled excessive merely for using a broad drug. This is an isolated-target gameplay opportunity, not a clinical prescribing grade; conditional clinical first-line advice remains separately labelled and sourced from the shared library. Empiric, polymicrobial and severe-infection decisions cannot be graded from this encounter model.

Focused engine tests cover charge/burst cancellation, spread/penetration coverage, conditional review metrics, information levels, empty supply sectors, guide reachability and pressure attribution. Existing movement/resource-based campaign and single-stage completion checks are retained. Browser checks cover desktop, 390×844 and 375×667 layouts plus atlas-backed review cards. Verification images are kept in memory only.
