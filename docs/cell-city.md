# Cell City prototype

Open the **cell city** tab or `#city`. One continuous body-city connects the lung, heart, kidney, gut, bone marrow and lymph node districts. Click a district (or use the district buttons) to upgrade, repair, build a defensive outpost or move the defense rally point. Pause and 1×/2×/3× controls work during construction and combat. Zoom buttons and drag explore the map.

- Red cells deliver oxygen through the heart. Plasma cargo carries nutrients, externally supplied drugs and construction materials. Buildings and recruits wait for delivery.
- Neutrophils patrol and combine innate attacks with fictional antibiotic equipment. Macrophages fight and clear debris. Fibroblasts produce materials and repair. Dendritic cells carry target-specific antigen information to the lymph node, enabling antibody support.
- Three disclosed infections use SPN-105, SAU-001 and SAU-002 from `data/organisms.json`. The prototype enables drug equipment only for unqualified S records; R and unsupported activity remain inactive. Ordinary phagocytosis is independent of antibiotic susceptibility. Combat numbers and antibiotic weapons are fictional; no dose or treatment recommendation is modeled.
- Heart output controls transport speed; lung output controls oxygen loads; kidney output clears waste. Local food, oxygen and tissue damage affect district output. Fever and dry-air events alter demand or supply. The neutropenia host starts with fewer neutrophils and slower neutrophil recruitment.
- The city saves to the independent `pathopedia:cell-city:v1` key, including cargo and construction in progress. Returning to the tab or a saved city pauses time. After victory, continue running the city or introduce another infection.

Scope: fixed district placement and routes, five cell jobs, three antibiotics, two construction types plus repair, three waves, two host presets. Free placement, liver/brain districts, T-cell combat, detailed pharmacokinetics and multiplayer are not implemented.

Rendering uses original code-drawn city art, the existing Kontra.js 10.0.2 game loop (MIT, `src/vendor/KONTRA-LICENSE.txt`) and existing Lucide controls (ISC, `src/vendor/LUCIDE-LICENSE.txt`). Public Kenney tower-defense assets were reviewed; existing libraries and original organ buildings fit this prototype without adding raster downloads or dependencies.

Focused checks: `node --test tests/city.test.mjs tests/app-routing.test.mjs`. GitHub Pages runs the repository's normal test and build workflow before deployment.
