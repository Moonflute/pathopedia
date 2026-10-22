// Both presentations share one saved town; only scenery and route shape vary.
export const CITY_THEME_KEY='pathopedia:cell-city:3d:theme:v1';
export const CITY_THEMES=Object.freeze([
 Object.freeze({id:'1',name:'평원 마을 · 격자 대로'}),
 Object.freeze({id:'2',name:'수로 마을 · 원형 혈관'})
]);
// Every harbour role has a land counterpart at the same saved/compiled anchor.
export const CITY_THEME_OBJECTS=Object.freeze({
 frontage:Object.freeze({'1':'cottage','2':'canal-house'}),
 courtyard:Object.freeze({'1':'village-green','2':'stone-court'}),
 tissue:Object.freeze({'1':'meadow-cottage','2':'lagoon-townhouse'}),
 landing:Object.freeze({'1':'supply-yard','2':'quay'}),
 freight:Object.freeze({'1':'supply-wagon','2':'harbour-boat'}),
 bankPlant:Object.freeze({'1':'garden-flower','2':'canal-reed'}),
 drainage:Object.freeze({'1':'filter-pond','2':'lagoon-culvert'})
});
export const cityThemeObject=(theme,role)=>CITY_THEME_OBJECTS[role]?.[normalizeCityTheme(theme)];
export const normalizeCityTheme=value=>String(value)==='2'?'2':'1';
export function readCityTheme(storage){try{return normalizeCityTheme((storage??globalThis.localStorage)?.getItem(CITY_THEME_KEY));}catch{return '1';}}
export function storeCityTheme(value,storage){try{(storage??globalThis.localStorage).setItem(CITY_THEME_KEY,normalizeCityTheme(value));return true;}catch{return false;}}
