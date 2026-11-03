import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {compileLayout} from './city-tile-layout.mjs';
import {entryTrackHeight} from './city-entry-tracks.mjs';
import {CITY_STYLE as STYLE} from './city-three-style.mjs';
import {pathogenDef} from './city-pathogens.mjs';

const stagger=new WeakMap();
export const pilotEnemyHP=e=>e.hp??(e.recordId==='IMM-VIRUS'?12:0);
export const pilotEnemyMaxHP=e=>e.maxHp??(e.recordId==='IMM-VIRUS'?12:e.hp);
export const pilotEnemyName=e=>pathogenDef(e.recordId)?.name||({'IMM-VIRUS':'바이러스','IMM-HELMINTH':'연충'})[e.recordId]||'병원체';
export const pilotHostile=e=>!e.dead&&pilotEnemyHP(e)>0&&e.phase!=='expelled'&&e.compartment!=='lumen';
export const pilotEnemies=s=>[...s.enemies,...(s.physiology?.virions||[]),...(s.immunity?.parasites||[])];
// Match the body scale used by city-three-actors, including elevated entry tracks.
export function pilotEnemyBody(s,e){
 const p=groundPoint(e),shape=pathogenDef(e.recordId)?.shape,rod=shape==='rod'||shape==='shortRod',wide=1.24*STYLE.pathogenScale.width,tall=1.24*STYLE.pathogenScale.height;
 const base=!e.entered?entryTrackHeight(compileLayout(s.layout).entries[e.front],p):0;
 if(e.recordId==='IMM-VIRUS'){const scale=e.phase==='attachment'?.27:.2;return {...p,y:base+.48*STYLE.pathogenScale.height,rx:scale*STYLE.pathogenScale.width,ry:scale*STYLE.pathogenScale.height,rz:scale*STYLE.pathogenScale.width};}
 if(e.recordId==='IMM-HELMINTH')return {...p,y:.16*STYLE.pathogenScale.height,rx:.77*STYLE.pathogenScale.width,ry:.16*STYLE.pathogenScale.height,rz:.32*STYLE.pathogenScale.width};
 return {...p,y:base+.35*tall,rx:(shape==='cluster'||shape==='chain'?.5:rod?.27:.36)*wide,ry:(rod?.25:.34)*tall,rz:(shape==='rod'?.57:shape==='shortRod'?.43:.36)*wide};
}
export function pilotRaycast(s,world,from,direction,range,traceMiss=true){
 let depth=range,enemy=null;
 for(const e of pilotEnemies(s)){
  if(!pilotHostile(e))continue;const b=pilotEnemyBody(s,e),rx=Math.max(b.rx,b.rz),rz=e.recordId==='IMM-HELMINTH'?b.rz:rx;
  const x=(from.x-b.x)/rx,y=(from.y-b.y)/b.ry,z=(from.z-b.z)/rz,dx=direction.x/rx,dy=direction.y/b.ry,dz=direction.z/rz;
  const a=dx*dx+dy*dy+dz*dz,h=x*dx+y*dy+z*dz,c=x*x+y*y+z*z-1,disc=h*h-a*c;if(disc<0)continue;
  const t=c<=0?0:(-h-Math.sqrt(disc))/a;if(t<0||t>=depth)continue;depth=t;enemy=e;
 }
 const wall=enemy||traceMiss?world.trace(from,direction,depth):null;
 if(wall&&wall.distance<depth){depth=wall.distance;enemy=null;}
 return {enemy,impact:{x:from.x+direction.x*depth,y:from.y+direction.y*depth,z:from.z+direction.z*depth},wall:!enemy&&!!wall};
}
export const pilotStaggered=(s,e)=>(stagger.get(e)||0)>s.time;
export function damagePilotEnemy(s,e,amount,from,color,damage){
 if(!['IMM-VIRUS','IMM-HELMINTH'].includes(e.recordId)){damage(s,e,amount,from,color,'shot');return;}
 e.hp=Math.max(0,pilotEnemyHP(e)-amount);
 if(e.hp>0)return;e.dead=true;s.stats.defeated++;
 if(e.recordId==='IMM-VIRUS'){s.physiology.virions=s.physiology.virions.filter(v=>v!==e);s.physiology.stats.neutralized++;}
 else{s.immunity.parasites=s.immunity.parasites.filter(w=>w!==e);s.immunity.stats.parasites++;}
}
export function pushPilotEnemy(s,e,world,from,power=1){
 const q=groundPoint(e),d=Math.max(.01,Math.hypot(q.x-from.x,q.z-from.z)),scale=pathogenDef(e.recordId)?.capsule?.45:1,amount=power*scale;
 const next={x:q.x+(q.x-from.x)/d*amount,z:q.z+(q.z-from.z)/d*amount},height=pilotEnemyBody(s,e).y;
 if(e.entered||e.recordId==='IMM-HELMINTH')world.move(q,next.x-q.x,next.z-q.z,'neutrophil');
 else if(world.clear({...q,y:height},{...next,y:height}))Object.assign(q,next);
 Object.assign(e,groundCoordinate(q));stagger.set(e,s.time+.35+power*.18);
}
