// View/transport preference. Theme changes never replace the saved city.
export const CITY_THEME_KEY='pathopedia:cell-city:3d:theme:v1';
export const CITY_THEMES=Object.freeze([
 Object.freeze({id:'1',name:'기존 마을'}),
 Object.freeze({id:'2',name:'혈관 수로 도시'})
]);
export const normalizeCityTheme=value=>String(value)==='2'?'2':'1';
export function readCityTheme(storage){try{return normalizeCityTheme((storage??globalThis.localStorage)?.getItem(CITY_THEME_KEY));}catch{return '1';}}
export function storeCityTheme(value,storage){try{(storage??globalThis.localStorage).setItem(CITY_THEME_KEY,normalizeCityTheme(value));return true;}catch{return false;}}
