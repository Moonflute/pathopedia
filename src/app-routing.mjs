import { CARD_DOMAINS } from './card-models.mjs';

export const CARD_FILTERS = Object.freeze([
  { id:'all', label:'전체' }, { id:'pathogens', label:'병원체' },
  ...Object.entries(CARD_DOMAINS).map(([id,label])=>({id,label}))
]);

export function cardRouteHash(domain='all',archiveOnly=false) {
  return '#cards'+(archiveOnly?'/archive':'')+(domain==='all'?'':'/'+domain);
}

// Existing bookmarks retain their collection without needing a second UI.
export function resolveAppRoute(hash) {
  const path=String(hash || '').replace(/^#/,'');
  if(!path || path==='home')return {view:'home',hash:'#home'};
  if(['lab','treatment','defense','play','survival'].includes(path))return {view:path,hash:'#'+path};
  const legacy={library:'cards/pathogens',drugs:'cards/drugs',archive:'cards/archive',diseases:'cards/diseases'};
  const parts=(Object.hasOwn(legacy,path)?legacy[path]:path).split('/');
  if(parts.shift()!=='cards')return null;
  const archiveOnly=parts[0]==='archive';
  if(archiveOnly)parts.shift();
  const domain=parts.shift() || 'all';
  if(parts.length || !CARD_FILTERS.some(filter=>filter.id===domain) || archiveOnly && ['drugs','diseases'].includes(domain))return null;
  return {view:'cards',domain,archiveOnly,hash:cardRouteHash(domain,archiveOnly)};
}
