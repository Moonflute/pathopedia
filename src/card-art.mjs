import { CARD_ART } from './card-art-data.mjs';
export function cardArtwork(kind,id) {
 const asset=CARD_ART[kind==='pathogen'?'pathogens':kind==='disease'?'diseases':'drugs']?.[id];
 return asset ? {src:new URL('../'+asset.src,import.meta.url).href,alt:asset.alt,transparent:true} : null;
}
