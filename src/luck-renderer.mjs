import {BOARD,TRACK,cellCenter,trackPoint,MODES} from './luck-data.mjs';
import {cardArtwork} from './card-art.mjs';
const TAU=Math.PI*2;
export function createLuckRenderer(canvas){
 const ctx=canvas.getContext('2d'),images=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const artIds=['sau','eco','kpn','cal','pae','afu'];
 for(const id of artIds){const art=cardArtwork('pathogen',id);if(art){const img=new Image();img.src=art.src;images.set(id,img);}}
 function resize(){const box=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);}
 function line(x,y,tx,ty,color,width=2){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.fillStyle=color;ctx.fill();}
 function draw(run){
  const W=BOARD.width,H=BOARD.height;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
  const color=MODES[run.mode].color;
  const bg=ctx.createRadialGradient(300,280,30,300,280,450);bg.addColorStop(0,run.mode==='colony'?'#211c39':'#172b32');bg.addColorStop(1,'#0b101c');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
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
  ctx.font='600 11px SUIT, sans-serif';ctx.fillStyle='#8b9bb5';ctx.textAlign='left';ctx.fillText('ENTRY',20,45);
  ctx.fillStyle=color;ctx.fillRect(32,58,8,18);ctx.fillStyle='#46526c';ctx.fillRect(19,61,3,12);ctx.fillRect(50,61,3,12);
  for(const pool of run.pools){
   ctx.globalAlpha=Math.min(.28,pool.life*.2);circle(pool.x,pool.y,pool.radius,'#a276ff');ctx.globalAlpha=.6;
   ctx.strokeStyle='#bb96ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pool.x,pool.y,pool.radius*.78,0,TAU);ctx.stroke();ctx.globalAlpha=1;
  }
  // Soft sockets beneath the HTML sprites keep the board legible at phone scale.
  for(let i=0;i<15;i++){const p=cellCenter(i);ctx.fillStyle='#ffffff03';ctx.beginPath();ctx.roundRect(p.x-35,p.y-35,70,70,10);ctx.fill();}
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
   if(e.stun>0){ctx.fillStyle='#ffdd85';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('✦',e.x,e.y-r-6);}
   if(e.hp<e.maxHp||e.boss){const bw=e.boss?46:22;ctx.fillStyle='#0a0e18';ctx.fillRect(e.x-bw/2,e.y-r-8,bw,4);ctx.fillStyle=e.boss?'#ff8aa5':'#8ae3cb';ctx.fillRect(e.x-bw/2,e.y-r-8,bw*Math.max(0,e.hp/e.maxHp),4);}
  }
  for(const f of run.effects){
   const p=f.age/f.life;ctx.globalAlpha=1-p;ctx.strokeStyle=f.color;ctx.fillStyle=f.color;
   if(f.type==='bolt'){const t=Math.min(1,p*1.5);circle(f.x+(f.tx-f.x)*t,f.y+(f.ty-f.y)*t,f.radius||4,f.color);}
   if(f.type==='beam'){line(f.x,f.y,f.tx,f.ty,f.color,7*(1-p));line(f.x,f.y,f.tx,f.ty,'#fff',2*(1-p));}
   if(f.type==='chain'){
    ctx.beginPath();ctx.moveTo(f.x,f.y);
    for(let i=1;i<6;i++){const t=i/6;ctx.lineTo(f.x+(f.tx-f.x)*t+Math.sin(i*7)*7,f.y+(f.ty-f.y)*t+Math.cos(i*9)*7);}
    ctx.lineTo(f.tx,f.ty);ctx.lineWidth=2.5;ctx.stroke();
   }
   if(f.type==='ring'||f.type==='burst'){ctx.lineWidth=f.type==='burst'?18*(1-p):3;ctx.beginPath();ctx.arc(f.x,f.y,(f.radius||60)*(.15+p*.85),0,TAU);ctx.stroke();}
   if(f.type==='pop')for(let i=0;i<5;i++){const a=i*TAU/5;circle(f.x+Math.cos(a)*f.radius*p,f.y+Math.sin(a)*f.radius*p,3*(1-p),f.color);}
  }
  ctx.globalAlpha=1;
  const boss=run.enemies.find(e=>e.boss);
  if(boss){
   const left=Math.max(0,Math.ceil(boss.deadline-run.totalTime));
   ctx.fillStyle='#10131fea';ctx.beginPath();ctx.roundRect(140,32,320,34,10);ctx.fill();
   ctx.textAlign='center';ctx.font='700 15px SUIT, sans-serif';ctx.fillStyle='#ffb3c5';ctx.fillText(boss.name+'   '+left+'s',300,54);
  }
 }
 return{draw,resize};
}
