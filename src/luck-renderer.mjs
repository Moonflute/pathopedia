import {BOARD,TRACK,cellCenter,trackPoint,MODES,RARITIES,unitById} from './luck-data.mjs';
import {unitRange,supportCells} from './luck-engine.mjs';
import {drawLuckEffects} from './luck-effects.mjs';
import {cardArtwork} from './card-art.mjs';
import {luckArtwork} from './luck-art.mjs';
const TAU=Math.PI*2;
export function createLuckRenderer(canvas,effectCanvas){
 const baseContext=canvas.getContext('2d'),effectContext=effectCanvas.getContext('2d'),images=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let ctx=baseContext;
 const unitImage=(mode,id)=>{const key=mode+':'+id;if(!images.has(key)){const def=unitById(mode,id),art=luckArtwork(def,mode);if(art){const img=new Image();img.src=art.src;images.set(key,img);}}return images.get(key);};
 const artIds=['sau','eco','kpn','cal','pae','afu'];
 for(const id of artIds){const art=cardArtwork('pathogen',id);if(art){const img=new Image();img.src=art.src;images.set(id,img);}}
 function resize(){const box=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);effectCanvas.width=canvas.width;effectCanvas.height=canvas.height;}
 function line(x,y,tx,ty,color,width=2){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.fillStyle=color;ctx.fill();}
 function draw(run,selected=-1,drag=null){
  ctx=baseContext;
  const W=BOARD.width,H=BOARD.height;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
  const color=MODES[run.mode].color;
  const bg=ctx.createRadialGradient(W/2,H/2,30,W/2,H/2,450);bg.addColorStop(0,run.mode==='colony'?'#211c39':'#172b32');bg.addColorStop(1,'#0b101c');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=.14;
  for(let y=18;y<H;y+=24)for(let x=12;x<W;x+=24)circle(x,y,.8,'#aac3d8');
  ctx.globalAlpha=1;
  const{x,y,width:w,height:h}=TRACK;
  ctx.lineJoin='round';ctx.beginPath();ctx.rect(x,y,w,h);ctx.lineWidth=40;ctx.strokeStyle='#080c16';ctx.stroke();
  ctx.lineWidth=34;ctx.strokeStyle=run.mode==='colony'?'#302840':'#24313b';ctx.stroke();
  ctx.lineWidth=1;ctx.strokeStyle='#65718260';ctx.stroke();ctx.lineJoin='miter';
  ctx.save();ctx.setLineDash([6,15]);ctx.lineDashOffset=reduced?0:-run.totalTime*12;ctx.strokeStyle='#b4c4d52d';ctx.stroke();ctx.restore();
  for(const d of [220,750,1150,1650]){
   const p=trackPoint(d),q=trackPoint(d+1),angle=Math.atan2(q.y-p.y,q.x-p.x);
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.strokeStyle='#97a9be';ctx.globalAlpha=.45;ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(0,0);ctx.lineTo(-5,5);ctx.stroke();ctx.restore();
  }
  ctx.font='600 11px SUIT, sans-serif';ctx.fillStyle='#8b9bb5';ctx.textAlign='left';ctx.fillText('ENTRY',20,25);
  ctx.fillStyle=color;ctx.fillRect(32,28,8,18);ctx.fillStyle='#46526c';ctx.fillRect(19,31,3,12);ctx.fillRect(50,31,3,12);
  for(const pool of run.pools){
   ctx.globalAlpha=Math.min(.28,pool.life*.2);circle(pool.x,pool.y,pool.radius,pool.color||'#a276ff');ctx.globalAlpha=.6;
   ctx.strokeStyle=pool.color||'#bb96ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pool.x,pool.y,pool.radius*.78,0,TAU);ctx.stroke();ctx.globalAlpha=1;
  }
  for(const trap of run.traps){
   const p=reduced?0:Math.sin(run.totalTime*3+trap.owner)*2;
   ctx.strokeStyle=trap.color;ctx.fillStyle='#78dfe633';ctx.lineWidth=2;
   for(const [dx,dy,r] of [[-7,2,8],[5,4,6],[0,-7,7]]){ctx.beginPath();ctx.arc(trap.x+dx,trap.y+dy+p,r,0,TAU);ctx.fill();ctx.stroke();}
   circle(trap.x-9,trap.y+p,1.5,'#f3ffff');
  }
  const selectedUnit=run.board[selected];
  if(selectedUnit){
   for(const index of supportCells(run,selected)){
    const p=cellCenter(index),size=BOARD.cell*.86;ctx.fillStyle='#a9efce13';ctx.strokeStyle='#a9efce66';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.roundRect(p.x-size/2,p.y-size/2,size,size,9);ctx.fill();ctx.stroke();
   }
   const pos=cellCenter(selected),range=unitRange(run,selectedUnit),tint=RARITIES[unitById(run.mode,selectedUnit.id).rarity].color;
   ctx.save();ctx.strokeStyle=tint;ctx.fillStyle=tint;ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();
   if(range>=700)ctx.rect(8,8,W-16,H-16);else ctx.arc(pos.x,pos.y,range,0,TAU);
   ctx.globalAlpha=.09;ctx.fill();ctx.globalAlpha=.65;ctx.stroke();ctx.restore();
  }
  // Soft sockets beneath the HTML sprites keep the board legible at phone scale.
  for(let i=0;i<BOARD.cols*BOARD.rows;i++){const p=cellCenter(i),size=BOARD.cell*.76;ctx.fillStyle='#ffffff03';ctx.beginPath();ctx.roundRect(p.x-size/2,p.y-size/2,size,size,9);ctx.fill();}
  for(const e of run.enemies){
   const r=e.radius;
   circle(e.x,e.y+3,r+1,'#00000060');
   if(e.boss){circle(e.x,e.y,r+8,'#ff7a9326');ctx.strokeStyle='#ff8aa5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,r+4,0,TAU);ctx.stroke();}
   if(run.mode==='remedy'){
    const img=images.get(artIds[e.boss?4:e.type==='tank'?2:e.type==='runner'?1:(e.id%artIds.length)]);
    if(img?.complete&&img.naturalWidth){ctx.drawImage(img,e.x-r*1.35,e.y-r*1.35,r*2.7,r*2.7);}
    else{circle(e.x,e.y,r,e.type==='runner'?'#d8a9f2':'#bba4dd');circle(e.x-r*.3,e.y-r*.15,2,'#1b1b30');circle(e.x+r*.3,e.y-r*.15,2,'#1b1b30');}
   }else{
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.d/65);
    ctx.fillStyle=e.type==='tank'?'#8bcbd9':e.boss?'#ffb998':'#c0e6e8';ctx.beginPath();
    const sides=e.type==='runner'?3:6;for(let i=0;i<sides;i++){const a=i*TAU/sides;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();
    ctx.fillStyle='#426273';ctx.fillRect(-r*.55,-2,r*1.1,4);ctx.fillRect(-2,-r*.55,4,r*1.1);ctx.restore();
   }
   if(e.hit>0){ctx.globalAlpha=e.hit*3;circle(e.x,e.y,r,'#ffffff');ctx.globalAlpha=1;}
   if(e.slow>0){ctx.strokeStyle='#9be7ff';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(e.x,e.y,r+3,0,TAU);ctx.stroke();}
   if(e.poison>0)circle(e.x+r,e.y-r,3,'#bd87ff');
   if(e.exposed>0){ctx.strokeStyle='#efa35c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,r+5,0,TAU);ctx.stroke();}
   if(e.volatile>0){ctx.save();ctx.translate(e.x-r,e.y-r);ctx.rotate(Math.PI/4);ctx.fillStyle='#c9ed6c';ctx.fillRect(-3,-3,6,6);ctx.restore();}
   if(e.stun>0){ctx.fillStyle='#ffdd85';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('✦',e.x,e.y-r-6);}
   if(e.hp<e.maxHp||e.boss){const bw=e.boss?46:22;ctx.fillStyle='#0a0e18';ctx.fillRect(e.x-bw/2,e.y-r-8,bw,4);ctx.fillStyle=e.boss?'#ff8aa5':'#8ae3cb';ctx.fillRect(e.x-bw/2,e.y-r-8,bw*Math.max(0,e.hp/e.maxHp),4);}
  }
  ctx=effectContext;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
  const effects=drawLuckEffects(ctx,run,unitImage,reduced);
  if(drag?.moved&&drag.point){const unit=run.board.find(u=>u?.uid===drag.uid);if(unit)effects.sprite(unit.id,drag.point.x,drag.point.y,1.12,.9);}
  ctx.globalAlpha=1;
  const boss=run.enemies.find(e=>e.boss);
  if(boss){
   const left=Math.max(0,Math.ceil(boss.deadline-run.totalTime));
   ctx.fillStyle='#10131fea';ctx.beginPath();ctx.roundRect(140,7,320,32,10);ctx.fill();
   ctx.textAlign='center';ctx.font='700 15px SUIT, sans-serif';ctx.fillStyle='#ffb3c5';ctx.fillText(boss.name+'   '+left+'s',300,29);
  }
 }
 return{draw,resize};
}
