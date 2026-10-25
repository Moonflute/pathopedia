import {Color} from './vendor/three/three.module.min.js';

// Reuse Three.js's sRGB conversion for the small, repeated instance palette.
// Keep a bound even when an imported rule supplies many different effect colors.
export function createInstancePalette(limit=256){
 const colors=new Map();
 return value=>{
  if(value?.isColor)return value;
  let color=colors.get(value);
  if(!color){color=new Color(value);if(colors.size>=limit)colors.clear();colors.set(value,color);}
  return color;
 };
}

// Preserve pending writes if several simulation updates precede a GPU upload.
// Three.js clears updateRanges after consuming them; retain just one union here.
export function markInstanceRange(attribute,first,count){
 if(!attribute||!count)return;
 let start=first*attribute.itemSize,end=start+count*attribute.itemSize;
 for(const r of attribute.updateRanges){start=Math.min(start,r.start);end=Math.max(end,r.start+r.count);}
 attribute.clearUpdateRanges();attribute.addUpdateRange(start,end-start);attribute.needsUpdate=true;
}
