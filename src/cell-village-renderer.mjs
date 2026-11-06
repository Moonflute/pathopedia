import {TILE,COLS,ROWS,SITES,POINTS,HAIR,SKIN,villageClock} from './cell-village-world.mjs';
import {ROOMS,LOUNGE,FIXTURES,WALL_TILES,BELT,PORTS,BRIDGES,pathLength,pathPoint,beltPoint,BELT_LENGTH} from './cell-office-layout.mjs';
import {parcelPoint,CONSUMERS} from './cell-office-logistics.mjs';

const W=COLS*TILE,H=ROWS*TILE;
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function pixelHeart(c,x,y,color='#efb1a3',s=1){
  for(const [row,line] of ['0110110','1111111','1111111','0111110','0011100','0001000'].entries())for(let col=0;col<line.length;col++)if(line[col]==='1')rect(c,color,x+col*s,y+row*s,s,s);
}
export function drawPerson(c,p,x,y,scale=1,selected=false){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  const stride=p.moving?Math.sin(p.step)*2:0,bob=p.moving?Math.abs(stride)*.5:0;
  c.fillStyle='#324e4440';c.beginPath();c.ellipse(0,1,8,3,0,0,Math.PI*2);c.fill();
  if(selected){rect(c,'#fff4cb',-8,3,16,1);rect(c,'#fff4cb',-10,0,2,3);rect(c,'#fff4cb',8,0,2,3);}
  rect(c,'#514d4a',-5,-3+stride,4,4);rect(c,'#514d4a',1,-3-stride,4,4);
  c.translate(0,-bob);
  rect(c,'#483e40',-6,-14,12,11);rect(c,p.color,-5,-14,10,10);rect(c,'#ffffff35',-4,-13,3,8);
  rect(c,SKIN[p.skin||0],-8,-12-stride,3,6);rect(c,SKIN[p.skin||0],5,-12+stride,3,6);
  rect(c,HAIR[p.hair||0],-6,-25,12,12);rect(c,SKIN[p.skin||0],-5,-22,10,9);
  rect(c,HAIR[p.hair||0],-6,-25,12,4);rect(c,HAIR[p.hair||0],-6,-22,2,6);
  if(p.direction==='up'){rect(c,HAIR[p.hair||0],-5,-22,10,8);rect(c,'#ffffff40',-4,-24,4,1);}
  else if(p.direction==='left'){rect(c,'#3e3e46',-5,-19,2,2);rect(c,HAIR[p.hair||0],3,-22,3,7);}
  else if(p.direction==='right'){rect(c,'#3e3e46',3,-19,2,2);rect(c,HAIR[p.hair||0],-6,-22,3,7);}
  else {rect(c,'#3e3e46',-3,-19,2,2);rect(c,'#3e3e46',2,-19,2,2);rect(c,'#bb7c6b',0,-15,2,1);}
  if(p.hat==='cap'||p.hat==='work'){rect(c,p.color,-6,-26,12,4);rect(c,'#f5dda4',-7,-23,14,2);}
  if(p.hat==='chef'){rect(c,'#fff3d6',-7,-27,14,5);rect(c,'#fff3d6',-4,-30,8,4);}
  if(p.hat==='band'){rect(c,'#f3e6c2',-6,-23,12,2);rect(c,p.color,-1,-24,3,3);}
  if(p.hat==='flower'){rect(c,'#e6b976',4,-26,4,4);rect(c,'#f5e4b9',5,-25,2,2);}
  if(p.hat==='antenna'){rect(c,'#d8c0da',0,-29,1,5);rect(c,'#ffe3a0',-1,-30,3,3);}
  if(p.id==='ruby'){rect(c,'#77533d',7,-9,7,7);rect(c,'#d4b380',8,-8,5,4);rect(c,'#d56b66',9,-12,3,4);}
  if(p.id==='momo'){rect(c,'#9d774e',8,-15,2,16);rect(c,'#dcc68c',6,-2,6,4);}
  if(p.id==='patch'){rect(c,'#6a6b65',7,-8,6,3);rect(c,'#9c754d',8,-6,2,6);}
  c.restore();
}
function symbol(c,kind,x,y,color){
  if(kind==='heart'){pixelHeart(c,x-7,y-6,color,2);return;}
  if(kind==='air'){for(const dx of [-7,2]){rect(c,color,x+dx,y-6,6,11);rect(c,'#f2e8ca',x+dx+2,y-4,1,6);}rect(c,color,x-1,y-9,2,8);}
  if(kind==='signal'){rect(c,color,x-7,y-5,14,11);rect(c,'#f4e9ca',x-5,y-3,10,2);rect(c,'#f4e9ca',x-2,y-1,4,2);}
  if(kind==='bone'){rect(c,color,x-7,y-2,14,4);for(const dx of [-8,5])rect(c,color,x+dx,y-5,4,10);}
  if(kind==='food'){rect(c,color,x-6,y-3,12,9);rect(c,'#7f9067',x-4,y-7,2,5);rect(c,'#e4b26d',x,y-6,3,5);}
  if(kind==='leaf'){rect(c,color,x-5,y-5,10,9);rect(c,'#f2e8ca',x-2,y-3,2,10);}
  if(kind==='water'){rect(c,color,x-2,y-8,4,4);rect(c,color,x-5,y-4,10,10);rect(c,'#f4f5d8',x-3,y,2,4);}
}

function machine(c,f){
  const x=f.x*TILE,y=f.y*TILE,w=f.w*TILE,h=f.h*TILE;
  rect(c,'#5a655432',x+3,y+h-4,w,h/3);rect(c,'#7e8170',x,y+3,w,h-3);rect(c,'#dad7bf',x+2,y+2,w-4,h-6);rect(c,'#f4edda',x+2,y,w-4,4);
  if(f.kind==='oxygen'){
    for(let i=0;i<3;i++){const tx=x+9+i*28;rect(c,'#557f83',tx,y-7,17,31);rect(c,'#99c8c4',tx+2,y-9,13,30);rect(c,'#dcf2dc',tx+4,y-7,3,20);rect(c,'#e2d9b6',tx+3,y-12,11,4);rect(c,'#658c8e',tx+4,y+20,9,4);}
  }else if(f.kind==='control'){
    for(let i=0;i<3;i++){const tx=x+6+i*34;rect(c,'#5a6c67',tx,y-5,27,23);rect(c,'#294e4b',tx+3,y-2,21,15);rect(c,'#a6d1a1',tx+6,y+2,6,2);rect(c,'#72aaa0',tx+6,y+6,14,2);rect(c,'#779081',tx+10,y+19,7,5);}
    rect(c,'#b4b9a5',x+8,y+26,w-16,3);
  }else if(f.kind==='kitchen'){
    rect(c,'#ae8d62',x,y+17,w,14);rect(c,'#f5dfad',x+2,y+16,w-4,4);
    for(let i=0;i<3;i++){rect(c,'#96734d',x+9+i*28,y-3,19,15);rect(c,'#deb47a',x+11+i*28,y,15,8);rect(c,'#ffe3a0',x+14+i*28,y-2,8,4);}
  }else if(f.kind==='pump'){
    for(const dx of [10,43]){rect(c,'#9c5b57',x+dx,y-7,24,32);rect(c,'#d69a8b',x+dx+3,y-4,18,24);rect(c,'#f1c5a7',x+dx+5,y-2,5,19);}
    rect(c,'#9c7c67',x+30,y+7,16,6);pixelHeart(c,x+35,y-10,'#f0b5a2',2);
  }else if(f.kind==='workbench'){
    rect(c,'#8f7052',x,y+20,w,11);rect(c,'#cba675',x-2,y+2,w+4,18);rect(c,'#e4c395',x-2,y,w+4,3);
    rect(c,'#7c887a',x+10,y+5,18,8);rect(c,'#5d655f',x+34,y+3,13,5);rect(c,'#775b43',x+39,y+8,3,10);
  }else if(f.kind==='sorting'){
    for(let i=0;i<3;i++){rect(c,'#7b8271',x+2+i*15,y+1,13,25);rect(c,['#b3b792','#c6b28c','#9bb2a3'][i],x+3+i*15,y+4,11,18);rect(c,'#f1dfb2',x+6+i*15,y+10,5,4);}
  }else if(f.kind==='filter'){
    for(let i=0;i<2;i++){rect(c,'#6b8b91',x+4+i*22,y-5,18,31);rect(c,'#a7cfcc',x+6+i*22,y-3,14,26);rect(c,'#edf1d4',x+8+i*22,y-1,3,19);}
    rect(c,'#7f9d98',x+13,y+26,26,5);
  }else if(f.kind==='sofa'){
    rect(c,'#7b947b',x-2,y-9,w+4,23);rect(c,'#b7c5a0',x,y-7,w,11);rect(c,'#a2b78c',x+2,y+5,w-4,9);rect(c,'#759371',x+22,y+3,2,10);
  }else if(f.kind==='coffee'){
    rect(c,'#ac8b67',x,y+10,w,h-10);rect(c,'#6e7468',x+6,y-7,18,23);rect(c,'#d6c7a4',x+8,y-4,14,10);rect(c,'#55483e',x+13,y+7,5,5);rect(c,'#f3e6ca',x+3,y+20,7,5);
  }else if(f.kind==='dispatch'){
    rect(c,'#6c8774',x,y+4,w,h-4);rect(c,'#b2c2a3',x-2,y,w+4,11);rect(c,'#f6e7c7',x+8,y+2,15,9);rect(c,'#a39270',x+11,y+4,9,1);rect(c,'#456960',x+34,y-9,22,17);rect(c,'#a6d7bb',x+37,y-6,16,10);
  }
}
function cargo(c,kind,x,y,scale=1){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  rect(c,'#263c4030',-5,3,11,4);
  if(kind==='oxygen'){rect(c,'#437c92',-5,-6,10,12);rect(c,'#93d0da',-4,-5,8,9);rect(c,'#dcf1de',-3,-4,2,6);rect(c,'#d6d9b6',-3,-9,6,3);}
  else if(kind==='food'){rect(c,'#936d40',-6,-5,12,11);rect(c,'#dfb66c',-5,-4,10,8);rect(c,'#f7dda2',-3,-7,6,4);rect(c,'#ba9558',-1,-4,2,8);}
  else {rect(c,kind==='sorted'?'#7d9b91':'#858375',-6,-5,12,10);rect(c,kind==='sorted'?'#c1d0b2':'#b6b4a4',-4,-3,8,6);rect(c,'#6c7d70',-2,-1,4,2);}
  c.restore();
}
export function createVillageRenderer(canvas){
  const ctx=canvas.getContext('2d',{alpha:false}),base=document.createElement('canvas'),bc=base.getContext('2d');base.width=W;base.height=H;
  const sheet=new Image();let ready=false,disposed=false,width=1,height=1,ratio=1,zoom=1,cam={x:W/2,y:H/2},viewMode='watch';
  const atlas=(tx,ty,x,y,w=16,h=16)=>{if(ready)bc.drawImage(sheet,tx*16,ty*16,w,h,x,y,w,h);};
  function beltTrack(path){
    for(let d=0;d<=pathLength(path);d+=8){const q=pathPoint(path,d);rect(bc,'#596c61',q.x-9,q.y-9,18,18);rect(bc,'#9caa88',q.x-7,q.y-7,14,14);rect(bc,'#70856f',q.x-5,q.y-5,10,10);}
  }
  function background(){
    bc.imageSmoothingEnabled=false;rect(bc,'#7b9380',0,0,W,H);
    for(let x=0;x<COLS;x++){atlas(0,0,x*16,0);atlas(0,0,x*16,H-16);}
    rect(bc,'#324e444d',38,40,710,492);rect(bc,'#e8e2cf',32,32,704,496);
    for(let y=3;y<32;y++)for(let x=3;x<45;x++){rect(bc,(x+y)%2?'#e8e5d6':'#e3e2d1',x*16,y*16,16,16);rect(bc,'#c7cdb92b',x*16,y*16,1,16);}
    for(const r of ROOMS){
      rect(bc,r.floor,(r.x+1)*16,(r.y+1)*16,(r.w-2)*16,(r.h-2)*16);
      for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++){rect(bc,'#ffffff18',x*16,y*16,15,15);rect(bc,'#68685516',x*16,y*16+15,16,1);}
      for(const [x,y] of r.door)rect(bc,'#c6b98e',x*16,y*16,16,16);
    }
    // A continuous building shell and low partition walls, with real open doorways.
    for(const q of WALL_TILES){const outer=q.x===2||q.x===45||q.y===2||q.y===32;rect(bc,outer?'#657b6b':'#a8b59a',q.x*16,q.y*16,16,16);rect(bc,outer?'#e9e2c8':'#f2ecd7',q.x*16,q.y*16-5,16,10);rect(bc,'#6b80692c',q.x*16,q.y*16+12,16,4);}
    for(const r of ROOMS)rect(bc,r.color,(r.x+1)*16,r.y*16+5,(r.w-2)*16,5);
    for(const x of [7,12,21,26,35,40]){rect(bc,'#527b7b',x*16,35,38,13);rect(bc,'#aad1c2',x*16+2,36,34,8);rect(bc,'#eef0cd',x*16+17,36,2,9);}
    for(const path of [BELT,...Object.values(PORTS).map(p=>p.path)])beltTrack(path);
    for(const f of FIXTURES)machine(bc,f);
    for(const [x,y] of [[5,9],[12,9],[19,9],[28,9],[34,9],[42,9],[5,20],[42,20],[12,30],[34,30],[28,30]]){
      atlas(4,0,x*16,y*16-18,16,32);rect(bc,'#a68766',x*16+4,y*16+6,9,6);rect(bc,'#cfaf83',x*16+3,y*16+4,11,3);
    }
    rect(bc,'#b8a987',23*16,27*16,2*16,16);rect(bc,'#e3d5b8',23*16,27*16-2,2*16,5);
    rect(bc,'#93aaa2',39*16,29*16,7,4*16);rect(bc,'#bfd3c1',39*16+1,29*16,2,4*16);rect(bc,'#617e73',39*16-5,33*16-4,18,7);
    // Quiet wayfinding on the common floor, outside the departments.
    bc.font='bold 10px monospace';bc.textAlign='center';bc.fillStyle='#9fa98e';bc.fillText('BODY WORKS',24*16,15*16);bc.font='7px monospace';bc.fillText('1F / LOGISTICS',24*16,15*16+11);
  }
  sheet.onload=()=>{if(disposed)return;ready=true;background();};sheet.onerror=()=>{ready=false;background();};sheet.src=new URL('../assets/cell-village/tiny-town.png',import.meta.url).href;background();
  function resize(){const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.imageSmoothingEnabled=false;}
  function fit(){zoom=Math.min(width/(W+12),height/(H+4));cam={x:W/2,y:H/2};}
  function overview(){fit();if(width<600){zoom=1.15;cam={x:W/2,y:18*TILE};}}
  function clampCamera(){const hx=width/zoom/2,hy=height/zoom/2;cam.x=hx>=W/2?W/2:Math.max(hx,Math.min(W-hx,cam.x));cam.y=hy>=H/2?H/2:Math.max(hy,Math.min(H-hy,cam.y));}
  function transform(){clampCamera();return {x:Math.round(width/2-cam.x*zoom),y:Math.round(height/2-cam.y*zoom)};}
  function toWorld(x,y){const t=transform();return {x:(x-t.x)/zoom,y:(y-t.y)/zoom};}
  function setZoom(factor){zoom=Math.max(.35,Math.min(3.5,zoom*factor));clampCamera();}
  function focus(p,walking=false){cam.x=p.x;cam.y=p.y;if(walking)zoom=Math.max(1.5,Math.min(2.2,width/260));}
  function label(text,x,y,color='#596551',background='#f7efdceF'){
    ctx.font='600 10px "SUIT Variable",sans-serif';ctx.textAlign='center';const w=ctx.measureText(text).width+12;
    rect(ctx,background,x-w/2,y-11,w,16);ctx.fillStyle=color;ctx.fillText(text,Math.round(x),Math.round(y));
  }
  function slat(point){
    if(point.dx)rect(ctx,'#adbc96',point.x,point.y-5,1,11);else rect(ctx,'#adbc96',point.x-5,point.y,11,1);
  }
  function draw(world,{mode='watch',follow='',selected='',night='auto',paused=false}={}){
    viewMode=mode;
    if(mode==='walk'&&world.player){cam.x+=(world.player.x-cam.x)*.12;cam.y+=(world.player.y-cam.y)*.12;}
    else if(follow){const r=world.residents.find(r=>r.id===follow);if(r){cam.x+=(r.x-cam.x)*.06;cam.y+=(r.y-cam.y)*.06;}}
    ctx.setTransform(ratio,0,0,ratio,0,0);rect(ctx,'#7b9380',0,0,width,height);ctx.imageSmoothingEnabled=false;
    const offset=transform(),flow=world.logistics,t=world.time;ctx.save();ctx.translate(offset.x,offset.y);ctx.scale(zoom,zoom);ctx.drawImage(base,0,0);
    for(let d=flow.beltTravel%8;d<BELT_LENGTH;d+=8)slat(beltPoint(d));
    for(const [id,port] of Object.entries(PORTS))for(let d=flow.beltTravel%8;d<pathLength(port.path);d+=8){
      const q=pathPoint(port.path,id==='lung'||id==='gut'?pathLength(port.path)-d:d);
      if(['lung','gut','kidney'].includes(id))slat(q);
      else {rect(ctx,'#b2bd98',q.x-q.dy*4,q.y+q.dx*4,2,2);const back=pathPoint(port.path,pathLength(port.path)-d);rect(ctx,'#94aa94',back.x+back.dy*4,back.y-back.dx*4,2,2);}
    }
    for(const parcel of flow.parcels){
      const q=parcelPoint(parcel),id=parcel.phase==='out'?parcel.from:parcel.to,dual=parcel.phase!=='loop'&&!['lung','gut','kidney'].includes(id),lane=parcel.phase==='out'?-4:4;
      cargo(ctx,parcel.kind,q.x-(dual?q.dy*lane:0),q.y+(dual?q.dx*lane:0)-1,dual?.85:1);
    }
    // Walkways are above the moving belt. Staff use these same tiles for collision/pathfinding.
    for(const b of BRIDGES){const x=b.x*16,y=b.y*16,w=b.w*16,h=b.h*16;rect(ctx,'#66786a',x-2,y-2,w+4,h+4);rect(ctx,'#d8c79d',x,y,w,h);for(let d=3;d<(b.w>1?w:h);d+=7)rect(ctx,'#af9f7a',x+(b.w>1?d:0),y+(b.w>1?0:d),b.w>1?1:w,b.w>1?h:1);}
    for(const s of SITES){
      const state=flow.stations[s.id],f=FIXTURES.find(f=>f.room===s.id),x=f.x*16,y=f.y*16;
      if(state.working){
        if(s.id==='lung')for(let i=0;i<3;i++)rect(ctx,'#e5f4d6',x+15+i*28,y+16-(t*7+i*5)%20,2,3);
        if(s.id==='brain')for(let i=0;i<3;i++)rect(ctx,Math.floor(t*3)%3===i?'#edf1aa':'#89bfa2',x+10+i*34,y+8,5,2);
        if(s.id==='gut')cargo(ctx,'food',x+13+(t*12)%65,y+22,.8);
        if(s.id==='heart'){const h=2+Math.sin(t*5)*2;rect(ctx,'#e9b3a2',x+13,y-4+h,18,3);rect(ctx,'#e9b3a2',x+46,y-4-h,18,3);}
        if(s.id==='marrow'){rect(ctx,'#5a655d',x+35,y+3+Math.sin(t*8)*3,12,4);if(Math.sin(t*8)>.8){rect(ctx,'#fff0aa',x+30,y+4,2,2);rect(ctx,'#fff0aa',x+45,y+1,2,2);}}
        if(s.id==='liver')rect(ctx,['#d6cea5','#abc7ac'][Math.floor(t*3)%2],x+17,y+5,10,6);
        if(s.id==='kidney')for(let i=0;i<3;i++)rect(ctx,'#f1efd5',x+9+i*10,y+4+(t*10+i*5)%18,2,2);
      }
      const end=PORTS[s.id].path.at(-1);rect(ctx,state.flash>0?'#f7dfa2':'#9caa86',end.x-5,end.y+8,10,3);
      if(CONSUMERS.includes(s.id)){
        for(let i=0;i<state.oxygen;i++)rect(ctx,'#78b9c8',x+3+i*5,y+34,3,4);
        for(let i=0;i<state.food;i++)rect(ctx,'#d6a75a',x+3+i*5,y+40,3,4);
      }
      const progress=state.progress/(CONSUMERS.includes(s.id)?7:s.id==='lung'||s.id==='gut'?3.2:2.8);
      rect(ctx,'#788778',x,y+f.h*16+12,30,3);if(state.working)rect(ctx,s.color,x,y+f.h*16+12,Math.min(30,30*progress),3);
    }
    if(flow.stations.kidney.flash>0)for(let i=0;i<3;i++)rect(ctx,'#d6e8cb',39*16+2,31*16+(t*20+i*9)%28,3,3);
    const actors=[...world.residents,...(world.player?[{...world.player,id:'player'}]:[])].sort((a,b)=>a.y-b.y);
    for(const actor of actors){drawPerson(ctx,actor,actor.x,actor.y,1,actor.id==='player'||actor.id===selected||actor.id===follow);if(!actor.moving&&['lounge','coffee'].includes(actor.destination)){rect(ctx,'#f5e5bf',actor.x+8,actor.y-12,4,4);}}
    if(world.player?.path.length&&mode==='walk'){const d=world.player.path.at(-1);rect(ctx,'#516f63',d.x-4,d.y,8,1);rect(ctx,'#516f63',d.x,d.y-4,1,8);}
    for(const e of world.effects){if(e.kind==='heart')pixelHeart(ctx,e.x-3,e.y-(2-e.life)*8);else for(let i=0;i<6;i++)rect(ctx,'#ffe7ac',e.x+Math.cos(i)*14,e.y-16-(3-e.life)*12+Math.sin(i)*12,3,3);}
    const hour=villageClock(world).hour,isNight=night==='night'||night==='auto'&&(hour>=19||hour<6);
    if(isNight){rect(ctx,'#263c6c38',0,0,W,H);for(const r of ROOMS){rect(ctx,'#fff0b31c',(r.x+1)*16,(r.y+1)*16,(r.w-2)*16,(r.h-2)*16);rect(ctx,'#f7dba0',(r.x+r.w/2)*16-7,r.y*16+7,14,2);}}
    ctx.restore();
    for(const r of ROOMS){const x=offset.x+(r.x+r.w/2)*16*zoom,y=offset.y+(r.y*16+3)*zoom;if(x>20&&x<width-20&&y>20&&y<height-15)label(zoom<.65?(r.organ||'휴게실'):r.name,x,y,r.color,'#f8f0dfee');}
    const actor=world.residents.find(r=>r.id===(selected||follow));if(actor)label(actor.name,offset.x+actor.x*zoom,offset.y+(actor.y-34)*zoom);
    if(world.player&&mode==='walk')label(world.player.name,offset.x+world.player.x*zoom,offset.y+(world.player.y-34)*zoom);
    if(paused){ctx.fillStyle='#31473422';ctx.fillRect(0,0,width,height);}
  }
  return {draw,resize,fit,overview,toWorld,setZoom,focus,pan:(dx,dy)=>{if(viewMode==='watch'){cam.x-=dx/zoom;cam.y-=dy/zoom;}},dispose:()=>{disposed=true;sheet.onload=null;sheet.onerror=null;},get zoom(){return zoom;}};
}
