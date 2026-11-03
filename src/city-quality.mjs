export const CITY_QUALITY_KEY='pathopedia:cell-city:3d:quality:v1';
export const CITY_QUALITY_MODES=Object.freeze({auto:'자동',standard:'표준',low:'저사양',minimum:'최저 · 30fps'});
export const normalizeCityQuality=value=>Object.hasOwn(CITY_QUALITY_MODES,value)?value:'auto';
export function readCityQuality(storage){try{return normalizeCityQuality((storage??globalThis.localStorage)?.getItem(CITY_QUALITY_KEY));}catch{return 'auto';}}
export function storeCityQuality(value,storage){try{(storage??globalThis.localStorage)?.setItem(CITY_QUALITY_KEY,normalizeCityQuality(value));return true;}catch{return false;}}

// Stable identities, not array order or frame time: sparse crowds never flicker.
// Individual observation and the cell-kind highlight always override sampling.
export function showCityCell(cell,quality,selectedCell,selectedKind){
 return cell.kind!=='rbc'||cell.id===selectedCell||cell.kind===selectedKind||!quality.rbcSkip||cell.id%quality.rbcSkip!==0;
}
export function showCityResident(id,stride=1,selectedCell=null,showAll=false){
 return showAll||id===selectedCell||stride<=1||Number(id.slice(id.lastIndexOf(':')+1))%stride===0;
}
