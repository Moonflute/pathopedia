import {compileCanalLayout} from './city-canal-layout.mjs';
import {compileVascularLayout} from './city-vascular-layout.mjs';
import {normalizeCityTheme,CITY_THEME_OBJECTS} from './city-theme.mjs';

// The existing theme-2 town is the sole source of scenery anchors. Neither a
// theme switch nor the rectangular road compiler writes to the saved layout.
const cache=new WeakMap();
export function compileThemeLayout(layout,theme='2'){
 if(!layout)return null;let variants=cache.get(layout);if(!variants){variants=new Map();cache.set(layout,variants);}
 theme=normalizeCityTheme(theme);if(variants.has(theme))return variants.get(theme);
 const source=compileCanalLayout(layout),obstacles=new Set();
 if(theme==='1'){
  for(const p of [...source.blocks.frontages,...source.blocks.gardens,...source.blocks.tissues,...source.blocks.lung]){
   if(p.cells){for(const k of p.cells){const [x,z]=k.split(',').map(Number);obstacles.add(Math.round((x+.5)*.5)+','+Math.round((z+.5)*.5));}continue;}
   const w=p.w||((source.blocks.lung.includes(p))?2.6:1.35),d=p.d||((source.blocks.lung.includes(p))?2.8:1.35);
   for(let x=Math.ceil(p.x-w/2);x<=Math.floor(p.x+w/2);x++)for(let z=Math.ceil(p.z-d/2);z<=Math.floor(p.z+d/2);z++)obstacles.add(x+','+z);
  }
 }
 const vascular=theme==='2'?source.vascular:compileVascularLayout(layout,'square',obstacles);
 const objects=Object.entries(CITY_THEME_OBJECTS).map(([role,models])=>({role,model:models[theme]}));
 const result={theme,source,blocks:source.blocks,outlet:source.outlet,entries:source.entries,vascular,obstacles,objects};
 variants.set(theme,result);return result;
}
