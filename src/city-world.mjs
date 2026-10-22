// Shared bounds and budgets for the expanded 3D town. The 2D map is independent.
import {AIRWAY_PORTAL,GUT_PORTAL} from './city-boundary.mjs';
export const CITY_SCALE=2;
export const CITY_BOUNDS=Object.freeze({left:-45,right:45,top:-45,bottom:45});
export const LANDSCAPE_RADIUS=2048;
export const CITY_CAPS=Object.freeze({cells:256,shipments:96,enemies:256,houses:64,extensions:2,workSlots:9,path:512});
export const CITY_ENTRIES=Object.freeze({
 airway:{start:{x:-12,z:-51},portal:AIRWAY_PORTAL,screen:{x:-12,z:-36},gate:{x:-12,z:-32}},
 gut:{start:{x:51,z:-8},mouth:GUT_PORTAL,portal:{x:40,z:-8},gate:{x:29,z:-8}}
});
export const storedPlacement=a=>!!a&&a.col<-100;
export const expansionCount=(s,site,kind)=>Object.entries(s.layout?.items||{}).filter(([id,a])=>id.startsWith(kind+'-'+site+'-')&&!storedPlacement(a)).length;
export const populationLimit=s=>s.layout?.version===2?Math.min(CITY_CAPS.cells,96+Math.max(0,Object.keys(s.layout.items).filter(id=>id.startsWith('house-')).length-11)*4):96;
export const shipmentLimit=s=>s.layout?.version===2?CITY_CAPS.shipments:48;
export const pathogenLimit=s=>s.layout?.version===2?CITY_CAPS.enemies:32;
export const travelScale=s=>s.layout?.version===2?1.65:1;
