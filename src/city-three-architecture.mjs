import * as T from './vendor/three/three.module.min.js';
import {CITY_STYLE as S,NEIGHBOURHOOD_ROOFS} from './city-three-style.mjs';
import {houseRoofGeometry} from './city-three-housing.mjs';

// Human-scale doors and repeated bays give large buildings a believable size.
// All geometry is static and joins the existing regional material bake.
export function townBuilding({box,make,parent,theme='1'},spec){
 const {x=0,z=0,w=6,d=3.5,height=4.8,kind='hall',district='heart',angle=0}=spec;
 const g=new T.Group();g.name='architecture-'+kind;g.position.set(x,0,z);g.rotation.y=angle;parent.add(g);
 const water=theme==='2',roof=water?0xb66b50:(NEIGHBOURHOOD_ROOFS[district]||S.roofs)[0],wall=water?0xf0dab9:S.plaster;
 const B=(x,y,z,w,h,d,c)=>box(x,y,z,w,h,d,c,g);
 function roofPart(x,z,w,d,y,rise,kind='gable'){
  const r=make(houseRoofGeometry(kind),roof,x,y,z,g);r.scale.set(w,rise,d);return r;
 }
 function window(x,y,z,side=0){
  const p=new T.Group();p.position.set(x,y,z);p.rotation.y=side;g.add(p);
  box(0,0,0,.47,.72,.06,S.trim,p);box(0,.02,.04,.33,.52,.045,S.glass,p);
  box(0,.02,.07,.045,.54,.025,wall,p);box(0,-.38,.04,.56,.08,.17,wall,p);
 }
 function wing(x,z,width,depth,h,floors=2,hip=false){
  B(x,.13,z,width,.26,depth,S.stone);B(x,.26+h/2,z,width-.18,h,depth-.18,wall);
  for(let floor=1;floor<floors;floor++)B(x,.26+h*floor/floors,z,width-.06,.11,depth-.06,S.trim);
  B(x,h+.27,z,width,.13,depth,S.timber);roofPart(x,z,width,depth,h+.34,Math.min(1.3,width*.22),hip?'hip':'gable');
  const columns=Math.max(1,Math.floor((width-.6)/1.05));
  for(let n=0;n<columns;n++)for(let floor=0;floor<floors;floor++){
   const xx=x+(n-(columns-1)/2)*Math.min(1.18,(width-.7)/columns),y=.9+floor*h/floors;
   window(xx,y,z+depth/2-.06);window(xx,y,z-depth/2+.06,Math.PI);
  }
  for(const side of [-1,1])for(let floor=0;floor<floors;floor++)window(x+side*(width/2-.07),.9+floor*h/floors,z,side*Math.PI/2);
 }
 function doorway(x,z){B(x,.88,z,.78,1.5,.12,S.timber);B(x,.85,z+.07,.56,1.32,.05,S.glass);B(x,.13,z-.05,1.1,.22,.26,S.trim);}
 if(kind==='terrace'){
  for(const side of [-1,1]){wing(side*w/4,0,w/2-.025,d,height*(side<0?.83:1),2,side<0);doorway(side*w/4,d/2-.02);}
 }else if(kind==='cloister'){
  const depth=d*.42,side=Math.min(1.55,w*.24),front=d*.3;
  wing(0,-d/2+depth/2,w,depth,height,3,true);
  for(const dir of [-1,1]){
   wing(dir*(w-side)/2,depth/2,side,d-depth,height*.64,2,true);
   for(let n=0;n<3;n++){const zz=-d*.02+n*d*.13;B(dir*(w/2-side+.12),1.05,zz,.14,1.9,.14,S.trim);}
  }
  // Open entry and courtyard are real gaps in the collision mesh.
  B(0,.04,front,w-side*2,.07,d*.35,water?S.plaza:S.grassLight);doorway(0,-d/2+depth+.02);
 }else if(kind==='warehouse'){
  const side=w*.28;
  wing(-side/2,0,w-side,d,height,2);
  wing((w-side)/2,0,side,d*.87,height*.72,2);
  doorway(-w*.2,d/2-.02);
  for(const y of [1.4,3.1]){B(w*.22,y,d*.44,.9,1,.08,S.timber);B(w*.22,y+.55,d*.46,1.15,.08,.2,S.trim);}
  B(w*.22,height*.7+.65,d*.46,.08,.7,.08,S.timber);B(w*.22,height*.7+.98,d*.35,.1,.08,.6,S.timber);
 }else if(kind==='guildhall'){
  wing(0,-d*.1,w*.56,d*.8,height,3);
  for(const side of [-1,1])wing(side*w*.37,d*.13,w*.26,d*.74,height*.64,2,true);
  doorway(0,d*.3+.03);
 }else{
  wing(0,0,w,d,height,kind==='merchant'?3:2,kind==='merchant');doorway(0,d/2-.02);
  if(kind==='hall'){
   const tower=Math.min(1.65,w*.3),h=height+1.9;
   B(0,h/2,-d*.12,tower,h,tower,wall);B(0,h-.2,-d*.12,tower+.14,.22,tower+.14,S.trim);
   for(const side of [-1,1])window(side*tower/2,h-.85,-d*.12,side*Math.PI/2);
   window(0,h-.85,-d*.12+tower/2);roofPart(0,-d*.12,tower+.25,tower+.25,h,.95,'hip');
  }
  if(kind==='merchant'){
   const awning=B(0,1.73,d/2-.14,w*.78,.08,.28,roof);awning.rotation.x=.12;
   for(const px of [-w*.29,0,w*.29])B(px,1.78,d/2-.14,.17,.035,.28,wall);
  }
 }
 return g;
}

export function organEmblem({make,parent},kind,x,y,z){
 const orb=(dx,dy,dz,r,color,sx=1,sy=1)=>{const m=make(new T.IcosahedronGeometry(r,1),color,x+dx,y+dy,z+dz,parent);m.scale.set(sx,sy,1);};
 if(kind==='brain')for(const side of [-1,1])for(let n=0;n<3;n++)orb(side*.31,n===1?.18:0,(n-1)*.3,.35,side<0?0xb8a3cc:0xcebbdc,1,1.15);
 if(kind==='liver'){orb(-.2,0,0,.53,0xb57963,1.4,.72);orb(.39,.02,0,.36,0xc78f73,1,.85);orb(.13,-.3,.13,.16,0x95ac6e,1,1.2);}
}
