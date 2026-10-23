import {homeSites,HOME_SIGNALS} from './city-homeostasis-data.mjs';
import {siteAt,compileLayout} from './city-tile-layout.mjs';
import {compileThemeLayout} from './city-theme-layout.mjs';
import {CITY_ENTRIES} from './city-world.mjs';
const cache=new WeakMap();
export function homePoint(layout,id){if(id==='outside')return CITY_ENTRIES.gut.start;return homeSites(layout).find(o=>o.id===id)||siteAt(layout,id);}
export function homeTransferPath(layout,theme,from,to,kind=''){
 if(!layout)return {points:[],length:18,lengths:[0]};
 let paths=cache.get(layout);if(!paths){paths=new Map();cache.set(layout,paths);}const key=[theme,from,to,kind].join(':');if(paths.has(key))return paths.get(key);
 const a=homePoint(layout,from),b=homePoint(layout,to),town=compileThemeLayout(layout,theme||'1');let points;
 if(from==='outside')points=compileLayout(layout).entries.gut;
 else if(kind==='bile'||kind==='enzyme')points=[a,{x:b.x+4,z:a.z},{x:b.x+4,z:b.z},b];
 else if(HOME_SIGNALS[kind]?.neural)points=[a,{x:a.x,z:b.z},b];
 else if((from==='gut'||from==='spleen')&&to==='liver')points=town.vascular.vessels.find(v=>v.id==='vein-'+from)?.points;
 else points=town.vascular.navigation.route(a,b);
 points=(points?.length>1?points:[a,b]).map(p=>({x:p.x,z:p.z}));
 const lengths=[0];for(let n=1;n<points.length;n++)lengths.push(lengths.at(-1)+Math.hypot(points[n].x-points[n-1].x,points[n].z-points[n-1].z));
 const result={points,lengths,length:lengths.at(-1)};paths.set(key,result);return result;
}
export function homePacketPosition(layout,theme,p){
 const path=homeTransferPath(layout,theme,p.from,p.to,p.kind),d=p.progress*path.length;let n=1;while(n<path.points.length-1&&path.lengths[n]<d)n++;
 const a=path.points[n-1],b=path.points[n]||a,t=(d-path.lengths[n-1])/(path.lengths[n]-path.lengths[n-1]||1);
 return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
}
