import {TILE,COLS,ROWS,SITES,POINTS,HAIR,SKIN,villageClock} from './cell-village-world.mjs';
import {ROOMS,LOUNGE,FIXTURES,WALL_TILES,BELT,PORTS,DOCKS,BREAK_SEATS,BRIDGES,pathLength,pathPoint,beltPoint,BELT_LENGTH} from './cell-office-layout.mjs';
import {parcelPoint,CONSUMERS,workDuration} from './cell-office-logistics.mjs';
import {cargoDestination} from './cell-office-life.mjs';

const W=COLS*TILE,H=ROWS*TILE;
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function pixelHeart(c,x,y,color='#efb1a3',s=1){
  for(const [row,line] of ['0110110','1111111','1111111','0111110','0011100','0001000'].entries())for(let col=0;col<line.length;col++)if(line[col]==='1')rect(c,color,x+col*s,y+row*s,s,s);
}
export function drawPerson(c,p,x,y,scale=1,selected=false){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  const stride=p.moving?Math.sin(p.step)*2:0,bob=p.moving?Math.abs(stride)*.5:p.seated?-3:0,arm=p.working||p.pose==='assist'?Math.sin(p.workTick||0)*2:stride;
  c.fillStyle='#324e4440';c.beginPath();c.ellipse(0,1,8,3,0,0,Math.PI*2);c.fill();
  if(selected){rect(c,'#fff4cb',-8,3,16,1);rect(c,'#fff4cb',-10,0,2,3);rect(c,'#fff4cb',8,0,2,3);}
  rect(c,'#514d4a',-5,-3+stride,p.seated?5:4,4);rect(c,'#514d4a',1,-3-stride,p.seated?5:4,4);
  c.translate(0,-bob);
  rect(c,'#483e40',-6,-14,12,11);rect(c,p.color,-5,-14,10,10);rect(c,'#ffffff35',-4,-13,3,8);
  rect(c,SKIN[p.skin||0],-8,-12-arm,3,6);rect(c,SKIN[p.skin||0],5,-12+arm,3,6);
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
  if(p.carry){
    const side=p.direction==='left'?-1:p.direction==='down'?0:1,cx=side*10,cy=p.direction==='up'?-15:-9;
    cargo(c,p.carry.kind,cx,cy,.9);
    rect(c,SKIN[p.skin||0],cx-6,cy+1,3,3);rect(c,SKIN[p.skin||0],cx+4,cy+1,3,3);
  }else if(p.task==='pickup'&&!p.moving&&p.handoff>0){
    const side=p.direction==='left'?-1:1;rect(c,SKIN[p.skin||0],side>0?5:-12,-10,7,3);
  }else if(p.pose){
    const motion=Math.sin(p.workTick||0);
    if(p.pose==='coffee'){rect(c,'#f8ebcc',6,-12+(motion>0?-2:0),6,6);rect(c,'#8c7660',7,-12+(motion>0?-2:0),4,1);rect(c,'#e4d6b7',12,-11,2,3);rect(c,'#f4eed160',8,-19,1,4);}
    if(p.pose==='book'||p.pose==='desk'){rect(c,'#85735e',-6,-11,13,7);rect(c,'#f0deb7',-5,-10,11,5);rect(c,'#af9675',0,-10,1,5);}
    if(p.pose==='meal'){rect(c,'#8b7758',-6,-10,13,6);rect(c,'#e8d6a6',-5,-9,11,4);rect(c,'#bfa45a',-3,-9,3,3);rect(c,'#8d9e69',2,-9,3,3);}
    if(p.pose==='plant'){rect(c,'#789c88',5,-10,8,7);rect(c,'#9cb8a1',12,-7,5,2);for(let i=0;i<2;i++)rect(c,'#a5cbd0',15+i*2,-3+((p.workTick||0)+i*3)%9,1,2);}
    if(p.pose==='stretch'){rect(c,SKIN[p.skin||0],-9,-21-motion*2,3,11);rect(c,SKIN[p.skin||0],6,-21+motion*2,3,11);}
    if(p.pose==='inspect'){rect(c,'#9b7952',6,-14,8,10);rect(c,'#f0dfba',7,-13,6,7);rect(c,'#789478',8,-11,4,2);}
    if(p.pose==='tidy'){rect(c,'#a48057',8+motion,-15,2,16);rect(c,'#cfbc89',6+motion,-1,6,4);}
    if(p.pose==='assist'){rect(c,'#ead6ac',5,-12+arm,7,5);rect(c,SKIN[p.skin||0],6,-9+arm,3,3);}
  }else if(p.id==='ruby'){rect(c,'#9b7952',7,-13,8,10);rect(c,'#f0dfba',8,-12,6,7);rect(c,'#72937b',9,-10,4,1);}
  else if(p.id==='patch'&&p.working){rect(c,'#6a6b65',7,-13+arm,6,3);rect(c,'#9c754d',8,-11+arm,2,6);}
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
    for(let i=0;i<3;i++){const tx=x+9+i*28;rect(c,'#557f83',tx,y-7,17,31);rect(c,'#cedad1',tx+2,y-9,13,30);rect(c,'#e2d9b6',tx+3,y-12,11,4);rect(c,'#658c8e',tx+4,y+20,9,4);}
  }else if(f.kind==='control'){
    for(let i=0;i<3;i++){const tx=x+6+i*34;rect(c,'#5a6c67',tx,y-5,27,23);rect(c,'#294e4b',tx+3,y-2,21,15);rect(c,'#a6d1a1',tx+6,y+2,6,2);rect(c,'#72aaa0',tx+6,y+6,14,2);rect(c,'#779081',tx+10,y+19,7,5);}
    rect(c,'#b4b9a5',x+8,y+26,w-16,3);
  }else if(f.kind==='kitchen'){
    rect(c,'#ae8d62',x,y+17,w,14);rect(c,'#f5dfad',x+2,y+16,w-4,4);
    for(let i=0;i<3;i++){rect(c,'#96734d',x+9+i*28,y-3,19,15);rect(c,'#c5b595',x+11+i*28,y-1,15,10);}
  }else if(f.kind==='pump'){
    for(const dx of [10,43]){rect(c,'#9c5b57',x+dx,y-7,24,32);rect(c,'#d69a8b',x+dx+3,y-4,18,24);rect(c,'#f1c5a7',x+dx+5,y-2,5,19);}
    rect(c,'#9c7c67',x+30,y+7,16,6);pixelHeart(c,x+35,y-10,'#f0b5a2',2);
  }else if(f.kind==='workbench'){
    rect(c,'#8f7052',x,y+20,w,11);rect(c,'#cba675',x-2,y+2,w+4,18);rect(c,'#e4c395',x-2,y,w+4,3);
    rect(c,'#7c887a',x+10,y+5,18,8);rect(c,'#5d655f',x+34,y+3,13,5);rect(c,'#775b43',x+39,y+8,3,10);
  }else if(f.kind==='sorting'){
    for(let i=0;i<3;i++){rect(c,'#7b8271',x+2+i*15,y+1,13,25);rect(c,['#b3b792','#c6b28c','#9bb2a3'][i],x+3+i*15,y+4,11,18);rect(c,'#f1dfb2',x+6+i*15,y+10,5,4);}
  }else if(f.kind==='filter'){
    for(let i=0;i<2;i++){rect(c,'#6b8b91',x+4+i*22,y-5,18,31);rect(c,'#cedad1',x+6+i*22,y-3,14,26);}
    rect(c,'#7f9d98',x+13,y+26,26,5);
  }else if(f.kind==='sofa'){
    rect(c,'#7b947b',x-2,y-9,w+4,23);rect(c,'#b7c5a0',x,y-7,w,11);rect(c,'#a2b78c',x+2,y+5,w-4,9);rect(c,'#759371',x+22,y+3,2,10);
  }else if(f.kind==='coffee'){
    rect(c,'#ac8b67',x,y+10,w,h-10);rect(c,'#6e7468',x+6,y-7,18,23);rect(c,'#d6c7a4',x+8,y-4,14,10);rect(c,'#55483e',x+13,y+7,5,5);rect(c,'#f3e6ca',x+3,y+20,7,5);
  }else if(f.kind==='dispatch'){
    rect(c,'#6c8774',x,y+4,w,h-4);rect(c,'#b2c2a3',x-2,y,w+4,11);rect(c,'#f6e7c7',x+8,y+2,15,9);rect(c,'#a39270',x+11,y+4,9,1);rect(c,'#456960',x+34,y-9,22,17);rect(c,'#a6d7bb',x+37,y-6,16,10);
  }else if(f.kind==='table'||f.kind==='desk'){
    rect(c,'#957c5b',x,y+7,w,h-7);rect(c,'#c7ab7e',x-1,y,w+2,h-10);rect(c,'#ecd4a4',x,y-2,w,4);rect(c,'#806d52',x+3,y+h-8,3,8);rect(c,'#806d52',x+w-6,y+h-8,3,8);
    if(f.kind==='table'){rect(c,'#f1dfbc',x+5,y+5,7,5);rect(c,'#f1dfbc',x+21,y+5,7,5);}
  }else if(f.kind==='locker'){
    rect(c,'#7c9583',x,y-9,w,h+9);rect(c,'#a9b99a',x+2,y-7,w-4,h+5);rect(c,'#6b826e',x+w/2,y-7,1,h+5);for(const dx of [5,21]){rect(c,'#f0dfad',x+dx,y-4,6,3);rect(c,'#718571',x+dx+5,y+4,2,4);}
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
function stationDisplay(c,site,state,t){
  const f=FIXTURES.find(f=>f.room===site.id),x=f.x*TILE,y=f.y*TILE,w=f.w*TILE,h=f.h*TILE;
  const progress=Math.min(1,state.progress/workDuration(site.id)),ready=state.output.length>0;
  if(site.id==='lung'){
    const batch=ready?1:progress;
    for(let i=0;i<3;i++){
      const tx=x+11+i*28,fill=Math.round(Math.max(0,Math.min(1,batch*3-i))*27);
      if(fill)rect(c,'#81bfc7',tx,y+20-fill,13,fill);
      rect(c,'#e4eedb',tx+2,y-7,2,23);
      if(state.working&&fill>5)rect(c,'#e8f4da',tx+8,y+17-(t*8)%Math.max(1,fill-3),2,2);
    }
  }else if(site.id==='gut'){
    for(let i=0;i<3;i++)if((ready?1:progress)*3>i){
      rect(c,'#deb47a',x+11+i*28,y+1,15,7);rect(c,'#ffe3a0',x+14+i*28,y-1,8,4);
    }
    if(state.working){const px=x+10+progress*55;rect(c,'#b98c57',px,y+19,14,7);rect(c,'#eed29b',px+2,y+18,10,3);}
  }else if(site.id==='brain'){
    for(let i=0;i<3;i++){
      const tx=x+9+i*34;
      rect(c,'#304e49',tx,y-2,21,15);
      if(state.working)for(let j=0;j<7;j++)rect(c,'#a8d9b0',tx+2+j*2,y+5+Math.round(Math.sin(j+t*5+i)*3),2,2);
      else rect(c,'#718b7b',tx+5,y+5,11,2);
      const active=i===0?state.oxygen>0:i===1?state.food>0:state.working;
      rect(c,active?'#bbdba1':ready?'#f0cd8b':'#b29373',tx+15,y+10,3,2);
      if(state.completed>0&&state.completed%3===i)rect(c,'#e6d697',tx+2,y+10,3,2);
    }
  }else if(site.id==='heart'){
    const pulse=state.working?Math.sin(t*5)*3:0;
    rect(c,'#a36e66',x+13,y+3,18,15);rect(c,'#a36e66',x+46,y+3,18,15);
    rect(c,'#ecc1a5',x+13,y+9+pulse,18,4);rect(c,'#ecc1a5',x+46,y+9-pulse,18,4);
  }else if(site.id==='marrow'){
    rect(c,'#b4bca0',x+10,y+5,Math.round(18*progress),8);
    if(state.working){rect(c,'#5a655d',x+35,y+3+Math.sin(t*8)*3,12,4);if(Math.sin(t*8)>.8){rect(c,'#fff0aa',x+30,y+4,2,2);rect(c,'#fff0aa',x+45,y+1,2,2);}}
  }else if(site.id==='liver'&&state.waste){
    cargo(c,progress>.6?'sorted':'waste',x+8+progress*28,y+12,.75);
  }else if(site.id==='kidney'){
    for(let i=0;i<2;i++){
      const level=state.waste?(i===0?1-progress:progress):i===1&&state.drain>0?state.drain/2:0,fill=Math.round(level*23),tx=x+6+i*22;
      if(fill)rect(c,i===0?'#a3ad99':'#93c9c3',tx,y+23-fill,14,fill);
      rect(c,'#edf1d4',tx+2,y-1,2,20);
      if(state.working&&fill>4)rect(c,'#f4f2d7',tx+8,y+21-(t*10+i*4)%Math.max(1,fill-2),2,2);
    }
  }
  if(CONSUMERS.includes(site.id)){
    for(const [index,kind] of ['oxygen','food'].entries()){
      rect(c,kind==='oxygen'?'#afc7c6':'#d6c7a4',x+4+index*29,y+h+3,25,6);
      for(let i=0;i<state[kind];i++)rect(c,kind==='oxygen'?'#568fa5':'#b58a4e',x+6+index*29+i*5,y+h+4,3,4);
    }
  }
  if(ready)cargo(c,state.output[0],x+w-11,y+h-5,.85);
  rect(c,'#788778',x,y+h+12,30,3);rect(c,site.color,x,y+h+12,Math.round(30*progress),3);
  rect(c,state.working?'#acd093':ready?'#f0cc87':'#a5afa0',x+w-5,y+h+4,4,4);
  const end=PORTS[site.id].path.at(-1);
  rect(c,state.arrival>0?'#e7e9ac':'#8b9c83',end.x-7,end.y+8,6,3);
  rect(c,state.departure>0?'#f4ca87':'#8b9c83',end.x+1,end.y+8,6,3);
  for(const [i,kind] of state.inbox.slice(0,4).entries())cargo(c,kind,end.x+(i%2?4:-4),end.y-2-Math.floor(i/2)*7,.65);
  if(state.inbox.length>4){rect(c,'#586e5e',end.x+7,end.y-8,11,8);c.font='bold 7px monospace';c.textAlign='center';c.fillStyle='#fff0ce';c.fillText(String(state.inbox.length),Math.round(end.x+12),Math.round(end.y-1));}
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
    for(const p of Object.values(DOCKS)){
      rect(bc,'#b5b998',p.x-6,p.y+5,12,2);rect(bc,'#b5b998',p.x-6,p.y+2,2,3);rect(bc,'#b5b998',p.x+4,p.y+2,2,3);
    }
    for(const f of FIXTURES)machine(bc,f);
    for(const [x,y] of [[5,9],[12,9],[19,9],[28,9],[34,9],[42,9],[5,20],[42,20],[12,30],[34,30],[28,30]]){
      atlas(4,0,x*16,y*16-18,16,32);rect(bc,'#a68766',x*16+4,y*16+6,9,6);rect(bc,'#cfaf83',x*16+3,y*16+4,11,3);
    }
    for(const p of [...BREAK_SEATS,POINTS.desk,POINTS.bench]){rect(bc,'#8a8166',p.x-7,p.y-6,14,11);rect(bc,'#b5bc91',p.x-6,p.y-5,12,7);rect(bc,'#6c785c',p.x-6,p.y+4,2,3);rect(bc,'#6c785c',p.x+4,p.y+4,2,3);}
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
      cargo(ctx,parcel.kind,q.x-(dual?q.dy*lane:0),q.y+(dual?q.dx*lane:0)-1,dual ? .85 : 1);
    }
    // Walkways are above the moving belt. Staff use these same tiles for collision/pathfinding.
    for(const b of BRIDGES){const x=b.x*16,y=b.y*16,w=b.w*16,h=b.h*16;rect(ctx,'#66786a',x-2,y-2,w+4,h+4);rect(ctx,'#d8c79d',x,y,w,h);for(let d=3;d<(b.w>1?w:h);d+=7)rect(ctx,'#af9f7a',x+(b.w>1?d:0),y+(b.w>1?0:d),b.w>1?1:w,b.w>1?h:1);}
    for(const s of SITES)stationDisplay(ctx,s,flow.stations[s.id],t);
    const desk=FIXTURES.find(f=>f.kind==='desk'),dx=desk.x*TILE,dy=desk.y*TILE;
    rect(ctx,world.player?.color||'#92a28a',dx+3,dy+15,25,7);
    if(world.life.deskStyle===0){rect(ctx,'#bd946f',dx+7,dy+6,8,7);rect(ctx,'#78976c',dx+5,dy-2,12,9);rect(ctx,'#a8bd87',dx+8,dy-4,5,7);}
    else if(world.life.deskStyle===1){rect(ctx,'#9683a0',dx+5,dy+7,17,5);rect(ctx,'#ead8ad',dx+7,dy+4,15,3);rect(ctx,'#78958c',dx+4,dy+1,15,3);rect(ctx,'#f1dfa8',dx+23,dy+2,5,5);}
    else {rect(ctx,'#637f7a',dx+4,dy-2,24,15);rect(ctx,'#a2ccbf',dx+6,dy,20,11);rect(ctx,'#d4e6c7',dx+7,dy+1,2,8);rect(ctx,'#d6a46b',dx+12+Math.sin(t)*4,dy+5,5,3);}
    const event=world.life.event;
    if(event?.type==='spill'&&event.parcel){const q=event.point;rect(ctx,'#bfaa7f',q.x-10,q.y+5,20,2);cargo(ctx,event.parcel.kind,q.x,q.y);rect(ctx,'#ebd2a0',q.x-12,q.y-8,3,2);}
    if(world.player?.carry){const q=cargoDestination(world.player.carry),color=Math.floor(t*3)%2?'#f8e1a1':'#92ae8a';for(const sx of [-1,1]){rect(ctx,color,q.x+sx*10-1,q.y-7,2,15);rect(ctx,color,q.x+sx*7-3,q.y+7,6,2);}rect(ctx,color,q.x-2,q.y-13,4,3);}
    if(flow.stations.kidney.drain>0)for(let i=0;i<3;i++)rect(ctx,'#d6e8cb',39*16+2,31*16+(t*20+i*9)%28,3,3);
    const actors=[...world.residents,...(world.player?[{...world.player,id:'player'}]:[])].sort((a,b)=>a.y-b.y);
    for(const actor of actors){
      const working=actor.id!=='ruby'&&actor.task==='work'&&!actor.path.length&&!actor.moving&&!actor.chat&&actor.greeting<=0&&flow.stations[actor.home]?.working;
      drawPerson(ctx,{...actor,working,workTick:t*8},actor.x,actor.y,1,actor.id==='player'||actor.id===selected||actor.id===follow);
      if(actor.chat||actor.surprisedUntil>t){
        rect(ctx,'#8e947c',actor.x-10,actor.y-43,21,12);rect(ctx,'#fff0d1',actor.x-9,actor.y-42,19,10);rect(ctx,'#fff0d1',actor.x-2,actor.y-32,4,3);
        if(actor.chat)for(const ax of [-5,0,5])rect(ctx,'#849279',actor.x+ax,actor.y-38,2,2);
        else{rect(ctx,'#b58d52',actor.x,actor.y-40,2,4);rect(ctx,'#b58d52',actor.x,actor.y-35,2,1);}
      }
    }
    if(world.player?.path.length&&mode==='walk'){const d=world.player.path.at(-1);rect(ctx,'#516f63',d.x-4,d.y,8,1);rect(ctx,'#516f63',d.x,d.y-4,1,8);}
    for(const e of world.effects){if(e.kind==='heart')pixelHeart(ctx,e.x-3,e.y-(2-e.life)*8);else for(let i=0;i<6;i++)rect(ctx,'#ffe7ac',e.x+Math.cos(i)*14,e.y-16-(3-e.life)*12+Math.sin(i)*12,3,3);}
    const hour=villageClock(world).hour,isNight=night==='night'||night==='auto'&&(hour>=19||hour<6);
    if(isNight){rect(ctx,'#263c6c38',0,0,W,H);for(const r of ROOMS){rect(ctx,'#fff0b31c',(r.x+1)*16,(r.y+1)*16,(r.w-2)*16,(r.h-2)*16);rect(ctx,'#f7dba0',(r.x+r.w/2)*16-7,r.y*16+7,14,2);}}
    ctx.restore();
    for(const r of ROOMS){const x=offset.x+(r.x+r.w/2)*16*zoom,y=offset.y+(r.y*16+3)*zoom;if(x>20&&x<width-20&&y>20&&y<height-15)label(zoom<.65?(r.organ||'휴게실'):r.name,x,y,r.color,'#f8f0dfee');}
    if(world.player&&zoom>.8)label(`${world.player.name}의 자리`,offset.x+(dx+16)*zoom,offset.y+(dy-12)*zoom,'#72674f');
    const actor=world.residents.find(r=>r.id===(selected||follow));if(actor)label(actor.name,offset.x+actor.x*zoom,offset.y+(actor.y-(actor.chat?54:34))*zoom);
    if(world.player&&mode==='walk')label(world.player.name,offset.x+world.player.x*zoom,offset.y+(world.player.y-34)*zoom);
    if(paused){ctx.fillStyle='#31473422';ctx.fillRect(0,0,width,height);}
  }
  return {draw,resize,fit,overview,toWorld,setZoom,focus,pan:(dx,dy)=>{if(viewMode==='watch'){cam.x-=dx/zoom;cam.y-=dy/zoom;}},dispose:()=>{disposed=true;sheet.onload=null;sheet.onerror=null;},get zoom(){return zoom;}};
}
