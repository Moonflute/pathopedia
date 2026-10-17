import { CARD_ART } from './card-art-data.mjs';
export function cardArtwork(kind,id) {
 const collection={pathogen:'pathogens',disease:'diseases',drug:'drugs','immune-element':'immuneElements'}[kind];
 const asset=collection && CARD_ART[collection]?.[id];
 return asset ? {src:new URL('../'+asset.src,import.meta.url).href,alt:asset.alt,transparent:true} : null;
}
