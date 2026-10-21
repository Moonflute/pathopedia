// Shared bounds and budgets for the expanded 3D town. The 2D map is independent.
export const CITY_SCALE=2;
export const CITY_BOUNDS=Object.freeze({left:-42,right:38,top:-36,bottom:36});
export const LANDSCAPE_RADIUS=2048;
export const CITY_CAPS=Object.freeze({cells:256,shipments:96,enemies:256,houses:64,extensions:2,workSlots:9,path:512});
export const CITY_ENTRIES=Object.freeze({
 airway:{start:{x:-12,z:-42},portal:{x:-12,z:-36},screen:{x:-12,z:-28.8},gate:{x:-12,z:-26}},
 gut:{start:{x:38,z:-8},mouth:{x:36+2/9,z:-8},portal:{x:30,z:-8},gate:{x:20,z:-4}}
});
export const storedPlacement=a=>!!a&&a.col<-100;
export const expansionCount=(s,site,kind)=>Object.entries(s.layout?.items||{}).filter(([id,a])=>id.startsWith(kind+'-'+site+'-')&&!storedPlacement(a)).length;
export const populationLimit=s=>s.layout?.version===2?Math.min(CITY_CAPS.cells,96+Math.max(0,Object.keys(s.layout.items).filter(id=>id.startsWith('house-')).length-11)*4):96;
export const shipmentLimit=s=>s.layout?.version===2?CITY_CAPS.shipments:48;
export const pathogenLimit=s=>s.layout?.version===2?CITY_CAPS.enemies:32;
export const travelScale=s=>s.layout?.version===2?1.65:1;
