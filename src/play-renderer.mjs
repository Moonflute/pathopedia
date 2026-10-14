import {castRay,protectedBySource,visibleLabel,viewFov} from './play-engine.mjs';

import {COMPANIONS} from './play-data.mjs';

const SIZE=64;
const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const shade=(color,k)=>'rgb('+rgb(color).map(v=>Math.min(255,Math.round(v*k))).join(',')+')';
function blob(ctx,x,y,rx,ry,color){
  for(let j=-ry;j<=ry;j+=2)for(let i=-rx;i<=rx;i+=2){const r=i*i/(rx*rx)+j*j/(ry*ry);if(r>1)continue;
    const light=.45+.5*Math.sqrt(1-r)+.18*(-i/rx-j/ry);ctx.fillStyle=shade(color,light);ctx.fillRect(x+i|0,y+j|0,2,2);}
}
function drawPickup(ctx,x,y,kind,f){
 const colors={health:'#e29a91',supply:'#e3c586',culture:'#88d4dd',companion:'#c3b4e5'},color=colors[kind],bob=f%2;
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(32,55,21,4,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#213a3b';ctx.fillRect(11,52,42,4);ctx.fillStyle=color;ctx.fillRect(15,52,34,1);ctx.translate(0,-bob);
 if(kind==='health'){
  ctx.fillStyle='#26363b';ctx.fillRect(13,27,39,25);ctx.fillStyle='#b7c6bd';ctx.fillRect(15,25,35,24);ctx.fillStyle='#dde6cf';ctx.fillRect(16,25,33,4);ctx.fillStyle='#52675f';ctx.fillRect(24,18,17,8);ctx.fillStyle='#172a2a';ctx.fillRect(28,21,9,5);
  ctx.fillStyle='#b85859';ctx.fillRect(17,34,31,8);ctx.fillStyle='#fff0dd';ctx.fillRect(30,30,6,17);ctx.fillRect(24,36,18,5);ctx.fillStyle='#4d625d';ctx.fillRect(18,28,3,4);ctx.fillRect(44,28,3,4);
 }else if(kind==='supply'){
  ctx.fillStyle='#3f4a43';ctx.fillRect(14,41,38,11);ctx.fillStyle='#ad986d';ctx.fillRect(16,43,34,5);
  for(let n=0;n<3;n++){const dx=18+n*11,dy=n===1?20:26;ctx.fillStyle='#243c3c';ctx.fillRect(dx,dy,8,24);ctx.fillStyle='#a4b4a5';ctx.fillRect(dx+1,dy+3,6,19);ctx.fillStyle=color;ctx.fillRect(dx+1,dy+9,6,7);ctx.fillStyle='#f4e8c5';ctx.fillRect(dx+1,dy+4,2,13);}
 }else if(kind==='culture'){
  ctx.fillStyle='#52787b';ctx.fillRect(18,19,10,30);ctx.fillRect(34,25,11,24);ctx.fillStyle='#bfe8df';ctx.fillRect(20,21,2,25);ctx.fillRect(36,27,2,19);
  ctx.fillStyle='#74c4ba';ctx.fillRect(20,35,6,12);ctx.fillRect(36,36,7,11);ctx.fillStyle='#d7dcc5';ctx.fillRect(17,16,12,6);ctx.fillRect(33,22,13,6);ctx.fillStyle='#1f4146';ctx.fillRect(15,45,34,6);ctx.fillStyle=color;ctx.fillRect(18,48,28,2);
 }else{
  ctx.fillStyle='#334951';ctx.fillRect(16,17,33,34);ctx.fillStyle='#81a3ab';ctx.fillRect(19,18,27,29);ctx.fillStyle='#19363c';ctx.fillRect(22,21,21,23);blob(ctx,32,32,8,8,color);blob(ctx,30,30,3,4,'#797596');ctx.fillStyle='#e1f3e2';ctx.fillRect(20,20,2,23);ctx.fillStyle=color;ctx.fillRect(21,49,23,3);
 }
 ctx.restore();
}
function createSprites(catalog){
  const atlas=surface(SIZE*4,SIZE*(catalog.enemies.length+11)),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  catalog.enemies.forEach((p,row)=>{for(let f=0;f<4;f++){
    ctx.save();ctx.translate(f*SIZE,row*SIZE);const bob=f%2;
    ctx.fillStyle='#0005';ctx.fillRect(13,54,39,4);
    if(p.shape==='diplo'){blob(ctx,23,33+bob,14,14,p.color);blob(ctx,43,31-bob,14,14,p.color);}
    if(p.shape==='cluster'){for(const [x,y,r] of [[25,18,9],[40,22,10],[16,33,9],[31,33,10],[47,36,9],[25,47,9],[40,48,8]])blob(ctx,x,y+bob,r,r,p.color);}
    if(p.shape==='rod'){
      ctx.save();ctx.translate(32,32+bob);ctx.rotate((f%2-.5)*.09-.28);blob(ctx,0,0,27,10,p.color);
      for(const x of [-14,0,13])blob(ctx,x,-1,3,4,shade(p.color,.65));
      if(['ecoli','esbl','pseudo','mdr'].includes(p.id)){ctx.strokeStyle=shade(p.color,.8);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(31,5+f);ctx.lineTo(27,12);ctx.stroke();}ctx.restore();
    }
    if(p.shape==='virus'){
      ctx.strokeStyle=p.color;ctx.lineWidth=3;for(let n=0;n<10;n++){const a=n*Math.PI/5+f*.08;ctx.beginPath();ctx.moveTo(32+Math.cos(a)*15,32+Math.sin(a)*15);ctx.lineTo(32+Math.cos(a)*26,32+Math.sin(a)*26);ctx.stroke();blob(ctx,32+Math.cos(a)*26,32+Math.sin(a)*26,3,3,p.color);}
      blob(ctx,32,32,19,19,p.color);blob(ctx,32,32,10,10,shade(p.color,.65));ctx.strokeStyle='#d8f1ee';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(27,27);ctx.lineTo(37,31);ctx.lineTo(28,36);ctx.stroke();
    }

    if(p.shape==='flagellate'){
      ctx.strokeStyle=shade(p.color,.85);ctx.lineWidth=2;
      for(let n=0;n<8;n++){const side=n%2?1:-1,yy=24+Math.floor(n/2)*6;ctx.beginPath();ctx.moveTo(32+side*9,yy);ctx.lineTo(32+side*(23+f%2),yy+9);ctx.lineTo(32+side*18,yy+16);ctx.stroke();}
      blob(ctx,32,29+bob,17,22,p.color);blob(ctx,25,25+bob,4,5,'#707b9a');blob(ctx,39,25+bob,4,5,'#707b9a');
      ctx.strokeStyle='#708d78';ctx.beginPath();ctx.moveTo(23,37+bob);ctx.quadraticCurveTo(32,44,41,37+bob);ctx.stroke();
    }
    if(p.shape==='worm'){for(let n=0;n<21;n++){const y=9+n*2.2,x=32+Math.sin(n*.25+f*.7)*13;blob(ctx,x,y,n===0||n===20?3:5,4,p.color);}ctx.fillStyle='#8c694d';for(let n=3;n<18;n+=3)ctx.fillRect(31+Math.sin(n*.25+f*.7)*13,9+n*2.2,2,2);}
    ctx.restore();
  }});
  const base=catalog.enemies.length;
  for(let f=0;f<4;f++){
    const x=f*SIZE;
    ctx.fillStyle='#101c23';ctx.fillRect(x+11,base*SIZE+15,43,45);ctx.fillStyle='#43786f';ctx.fillRect(x+15,base*SIZE+12,35,38);ctx.fillStyle='#95d7b7';ctx.fillRect(x+19,base*SIZE+16,27,21);ctx.fillStyle='#1e483d';ctx.fillRect(x+22,base*SIZE+19,21,15);ctx.fillStyle='#94edbc';ctx.fillRect(x+25,base*SIZE+24,15,3);ctx.fillRect(x+31,base*SIZE+19,3,15);ctx.fillStyle=f%2?'#ffbf76':'#bfdf9a';ctx.fillRect(x+20,base*SIZE+42,5,3);ctx.fillRect(x+35,base*SIZE+42,10,3);
    for(let k=1;k<=3;k++)drawPickup(ctx,x,(base+k)*SIZE,['','health','supply','culture'][k],f);
  }
  for(let state=0;state<2;state++)for(let f=0;f<4;f++){
    const x=f*SIZE,y=(base+4+state)*SIZE,color=state?'#a5efb8':'#e1ac78';
    ctx.fillStyle='#102629';ctx.fillRect(x+7,y+4,50,60);ctx.fillStyle='#405e58';ctx.fillRect(x+10,y+7,44,57);ctx.fillStyle=state?'#143e35':'#302f30';ctx.fillRect(x+16,y+16,32,48);
    ctx.fillStyle=color;ctx.fillRect(x+11,y+9,4,53);ctx.fillRect(x+49,y+9,4,53);ctx.fillRect(x+15,y+9,34,4);ctx.fillStyle='#ededd5';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('EXIT',x+32,y+24);ctx.textAlign='left';
    if(state){ctx.fillStyle=color;ctx.fillRect(x+26,y+34,13,4);ctx.fillRect(x+34,y+30,4,12);ctx.fillRect(x+38,y+33,4,6);}else{ctx.fillStyle=color;for(let k=0;k<4;k++)ctx.fillRect(x+18+k*7,y+35+k*4,6,7);}
  }

  for(let f=0;f<4;f++){
    const x=f*SIZE,y=(base+6)*SIZE;
    drawPickup(ctx,x,y,'companion',f);
    COMPANIONS.forEach((c,i)=>{
      const cy=(base+7+i)*SIZE+32+(f%2?1:0);
      blob(ctx,x+32,cy,23,21,c.color);
      if(c.id==='neutrophil'){for(const [dx,dy] of [[-8,-5],[5,-5],[1,8]])blob(ctx,x+32+dx,cy+dy,7,6,'#71648e');}
      else if(c.id==='macrophage'){blob(ctx,x+29,cy,11,13,'#697c91');blob(ctx,x+36,cy-5,7,9,c.color);}
      else if(c.id==='eosinophil'){blob(ctx,x+25,cy,6,10,'#766288');blob(ctx,x+39,cy,6,10,'#766288');}
      else blob(ctx,x+29,cy-3,11,13,'#686a9a');
      if(c.id==='eosinophil'||c.id==='nk'){ctx.fillStyle=c.id==='nk'?'#7187b7':'#b77567';for(let n=0;n<12;n++){const a=n*Math.PI/6;ctx.fillRect(x+32+Math.cos(a)*17,cy+Math.sin(a)*15,3,3);}}
      ctx.fillStyle='#f3f7e0';ctx.fillRect(x+22,cy-14,7,2);
    });
  }
  return atlas;
}
const WALL_PALETTES=[['#778c7d','#536d60','#a3bc9c'],['#8296a3','#415d72','#b1d2d7'],['#9d8975','#69584d','#d5c496'],['#8c899f','#514c6c','#c6b4d8']];
function createWalls(accent='#a9c4a1',theme=0,biome='facility',rooms=[]){
 const atlas=surface(32*(6+rooms.length),32),c=atlas.getContext('2d'),[base,dark,light]=WALL_PALETTES[theme%4];
 for(let i=0;i<6;i++){c.save();c.translate(i*32,0);c.fillStyle=base;c.fillRect(0,0,32,32);
  if(i===0){ // Glazed laboratory tiles.
   c.fillStyle=dark;for(let n=0;n<32;n+=8){c.fillRect(0,n,32,1);c.fillRect(n,0,1,32);}c.fillStyle=light;for(let y=1;y<32;y+=8)c.fillRect(1,y,30,1);c.fillStyle=accent;c.fillRect(0,22,32,3);
  }else if(i===1){ // Staggered masonry and a low conduit.
   c.fillStyle=dark;for(let y=0;y<32;y+=8){c.fillRect(0,y,32,1);for(let x=(y%16?0:8);x<32;x+=16)c.fillRect(x,y,1,8);}c.fillStyle=light;for(let y=1;y<32;y+=8)c.fillRect(1,y,30,1);c.fillStyle='#26373e';c.fillRect(0,27,32,4);c.fillStyle=accent;c.fillRect(0,27,32,1);
  }else if(i===2){ // Observation window with a specimen waveform.
   c.fillStyle=dark;c.fillRect(3,3,26,23);c.fillStyle='#122f38';c.fillRect(5,5,22,19);c.fillStyle='#416f76';c.fillRect(6,6,20,3);c.fillRect(6,10,2,12);c.strokeStyle=accent;c.lineWidth=1;c.beginPath();c.moveTo(8,17);c.lineTo(12,17);c.lineTo(14,12);c.lineTo(17,21);c.lineTo(20,16);c.lineTo(24,16);c.stroke();c.fillStyle=light;c.fillRect(3,27,26,2);
  }else if(i===3){ // Ventilation grille and heavy metal seams.
   c.fillStyle=dark;c.fillRect(4,4,24,24);c.fillStyle=light;for(let y=6;y<27;y+=4)c.fillRect(6,y,20,2);c.fillStyle='#1d3339';for(const x of [1,29]){c.fillRect(x,0,2,32);for(const y of [3,27]){c.fillStyle=accent;c.fillRect(x,y,2,2);c.fillStyle='#1d3339';}}
  }else if(i===4){ // Parallel utility pipes and pressure gauges.
   c.fillStyle=dark;c.fillRect(0,0,32,32);for(const x of [7,21]){c.fillStyle='#263d3d';c.fillRect(x,0,7,32);c.fillStyle=base;c.fillRect(x+1,0,5,32);c.fillStyle=light;c.fillRect(x+2,0,1,32);c.fillStyle=accent;for(const y of [6,24])c.fillRect(x-1,y,9,3);}c.fillStyle='#d3d7bd';c.fillRect(13,11,8,8);c.fillStyle='#254347';c.fillRect(15,13,4,4);
  }else{ // Isolation panel, hazard band and facility markings.
   c.fillStyle=light;c.fillRect(2,2,28,26);c.fillStyle=dark;c.fillRect(5,6,22,1);c.fillRect(5,9,16,1);c.fillRect(5,12,20,1);c.fillStyle='#31564a';c.fillRect(20,17,7,6);c.fillStyle=accent;c.fillRect(22,18,3,4);c.fillStyle='#263439';c.fillRect(0,26,32,6);c.fillStyle='#cba968';for(let x=-4;x<32;x+=8){c.beginPath();c.moveTo(x,26);c.lineTo(x+4,26);c.lineTo(x+10,32);c.lineTo(x+6,32);c.fill();}
  }

  if(biome==='parasitology'){
   c.strokeStyle='#335b40';c.lineWidth=2;c.beginPath();c.moveTo(4,32);c.lineTo(8,23);c.lineTo(4,12);c.lineTo(9,0);c.stroke();
   c.fillStyle='#6f9861';for(const y of [6,16,25]){c.fillRect(4,y,7,3);c.fillRect(9,y-2,4,2);}
   if(i===2){c.fillStyle='#a7be87';c.fillRect(15,8,6,9);c.fillStyle='#324d3a';c.fillRect(16,10,2,2);c.fillRect(19,10,2,2);}
  }else if(biome==='virology'){
   c.fillStyle='#9caed5';c.fillRect(0,2,32,2);
   if(i===2||i===5){c.strokeStyle='#aebee3';c.lineWidth=1;c.beginPath();c.arc(16,16,6,0,Math.PI*2);c.stroke();for(let n=0;n<8;n++){const a=n*Math.PI/4;c.fillRect(16+Math.cos(a)*9,16+Math.sin(a)*9,2,2);}}
  }
  c.fillStyle='#11282b';c.fillRect(0,31,32,1);c.fillRect(31,0,1,32);c.restore();
 }
 for(const r of rooms){const x=(6+r.id)*32;c.fillStyle=dark;c.fillRect(x,0,32,32);c.fillStyle=base;c.fillRect(x+1,1,30,30);c.fillStyle='#122d32';c.fillRect(x+4,4,24,23);c.fillStyle=r.rest?'#9fd4b7':accent;c.fillRect(x+4,4,24,2);c.font='bold 12px monospace';c.textAlign='center';c.fillText(String(r.id).padStart(2,'0'),x+16,19);c.font='5px monospace';c.fillText(r.id===rooms.length-1?'EXIT':r.rest?'SUPPLY':r.id===0?'ENTRY':'LAB',x+16,25);c.textAlign='left';}
 return atlas;
}
function createWeapons(catalog){
  const atlas=surface(240*(catalog.weapons.length+1),180),c=atlas.getContext('2d');
  const poly=(color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  // Authored in three-quarter perspective: small forward muzzle, foreshortened receiver,
  // right trigger hand and left support hand. Positioning does not fake the perspective.
  [...catalog.weapons,{color:'#9de2d4',short:'SCN'}].forEach((w,i)=>{c.save();c.translate(i*240,0);
    poly('#2a4947',[[132,124],[147,141],[152,180],[105,180],[87,140]]);
    poly('#516f65',[[96,131],[116,120],[145,145],[137,164],[117,163]]);
    poly('#1a302e',[[117,151],[137,142],[142,152],[124,161]]);
    if(i===catalog.weapons.length){
      poly('#102827',[[65,51],[112,41],[177,87],[166,147],[105,134],[62,97]]);
      poly('#809c8b',[[68,51],[111,45],[168,86],[116,104],[67,86]]);
      poly('#314f48',[[116,104],[168,86],[163,143],[115,129]]);
      poly('#153f3d',[[76,57],[109,53],[151,83],[117,94],[77,80]]);
      poly('#9ce5bc',[[83,62],[108,58],[140,81],[118,87],[84,75]]);
      c.fillStyle='#1a5548';c.font='bold 10px monospace';c.save();c.translate(94,72);c.rotate(.44);c.fillText('SCAN',0,0);c.restore();
      poly('#83b3a1',[[135,112],[147,106],[155,111],[144,117]]);poly(w.color,[[146,120],[154,117],[157,122],[149,125]]);
    }else{
      const wide=[1,3,6,8].includes(i)?8:0;
      poly('#172b2d',[[25,20],[38,16],[147,74],[167,100],[140,120],[38,48]]);
      poly('#bac8b2',[[27,21],[37,19],[133,72-wide],[121,82]]);
      poly('#6e8780',[[27,24],[121,82],[136,105],[33,36]]);
      poly('#304a49',[[33,36],[136,105],[127,112],[31,43]]);
      poly('#172c2c',[[24,20],[30,23],[33,39],[26,34]]);
      for(let n=0;n<5;n++){const x=63+n*12,y=41+n*7;c.fillStyle='#2a4440';c.fillRect(x,y,5,8);}
      if(i===1||i===8)poly('#92a49a',[[34,34],[44,34],[126,84],[123,93]]);
      poly('#233c39',[[114,75],[147,66],[205,105],[193,147],[138,120]]);
      poly('#9aac9a',[[114,75],[147,69],[198,104],[167,113]]);
      poly('#58786d',[[167,113],[198,104],[188,139],[164,137]]);
      poly('#3b5a53',[[116,79],[167,113],[164,137],[131,114]]);
      poly('#172e2c',[[129,90],[158,107],[157,120],[129,105]]);
      poly(w.color,[[132,95],[153,107],[153,111],[132,100]]);
      poly('#b3c8aa',[[137,79],[148,77],[185,101],[174,103]]);
      if([2,5,7,9].includes(i)){poly('#203e3e',[[68,32],[91,26],[139,57],[129,73],[85,46]]);poly('#8bab9c',[[73,32],[90,29],[132,57],[119,60]]);poly(w.color,[[121,60],[135,56],[132,68],[122,71]]);}
      if([3,4,6,10].includes(i)){poly('#1e3b38',[[132,81],[145,77],[177,96],[172,109]]);poly(w.color,[[140,85],[146,82],[169,96],[166,102]]);}
      poly('#182f2a',[[153,121],[172,128],[163,159],[144,145]]);
      c.save();c.translate(135,111);c.rotate(.54);c.fillStyle='#dbebcc';c.font='bold 9px monospace';c.fillText(w.short,0,0);c.restore();
    }
    poly('#1c3733',[[165,124],[180,116],[204,132],[213,157],[195,177],[166,155]]);
    poly('#708577',[[166,125],[181,123],[196,133],[195,151],[175,146]]);
    poly('#8fa493',[[172,128],[181,126],[191,135],[187,139]]);
    for(let n=0;n<3;n++)poly('#425f55',[[169+n*3,137+n*5],[188+n*3,147+n*3],[187+n*3,151+n*3],[168+n*3,141+n*5]]);
    poly('#354f49',[[196,153],[213,146],[240,165],[240,180],[210,180]]);
    poly('#698377',[[205,157],[216,154],[240,172],[240,180],[226,180]]);
    c.restore();
  });return atlas;
}
export function createPlayRenderer(canvas,catalog,{quality='retro',reducedMotion=false}={}){
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('Canvas 2D를 사용할 수 없습니다.');
  let width,height,depth,frame,floorPixels,disposed=false;
  const sprites=createSprites(catalog),weapons=createWeapons(catalog),visible=[];let walls=createWalls(),mapId='',tone=[168,215,152];
  function resize(mode=quality){quality=mode;const maxW=mode==='low'?480:640,maxH=mode==='low'?270:360,cssW=canvas.clientWidth||maxW,cssH=canvas.clientHeight||maxH,scale=Math.min(maxW/cssW,maxH/cssH);width=Math.max(160,Math.floor(cssW*scale/2)*2);height=Math.max(120,Math.floor(cssH*scale/2)*2);canvas.width=width;canvas.height=height;context.imageSmoothingEnabled=false;depth=new Float32Array(width);frame=context.createImageData(width,height);floorPixels=new Uint32Array(frame.data.buffer);}
  resize();
  function render(run){
    if(disposed)return;if(mapId!==run.map.id){walls.width=1;walls.height=1;walls=createWalls(run.map.color,run.map.theme,run.map.biome,run.map.rooms);mapId=run.map.id;tone=rgb(run.map.color);}run.viewAspect=width/height;const ctx=context,p=run.player,cos=Math.cos(p.angle),sin=Math.sin(p.angle),fov=viewFov(run),planeX=-sin*fov,planeY=cos*fov,projection=width/(2*fov),reticleY=height*.46,horizon=Math.floor(reticleY+Math.tan(p.pitch||0)*projection+(reducedMotion?0:run.land*15)),cameraZ=.5+(p.z||0);
    // Reused pixel buffer. Render at fixed resolution, independent of devicePixelRatio.
    for(let y=0;y<height;y+=2){const floor=y>=horizon,distance=projection*(floor?cameraZ:1-cameraZ)/Math.max(1,Math.abs(y-horizon)),stepX=distance*planeX*2/width,stepY=distance*planeY*2/width;
      let worldX=p.x+distance*(cos-planeX),worldY=p.y+distance*(sin-planeY);
      for(let x=0;x<width;x+=2){let r,g,b;if(floor){const grid=(worldX%1+1)%1<.045||(worldY%1+1)%1<.045,check=run.map.theme%2?(Math.floor(worldX*2)&1):((Math.floor(worldX)+Math.floor(worldY))&1),k=Math.max(.3,1-distance*.034);
        r=((grid?17:check?42:47)+tone[0]*.025)*k;g=((grid?35:check?57:64)+tone[1]*.025)*k;b=((grid?33:check?55:60)+tone[2]*.025)*k;
        const tx=Math.floor(worldX),ty=Math.floor(worldY),room=tx>=0&&ty>=0&&tx<run.map.width&&ty<run.map.height?run.map.rooms[run.map.roomCells[ty*run.map.width+tx]]:null;
        if(room){const lx=worldX-room.bounds.x,ly=worldY-room.bounds.y,edge=Math.min(lx,ly,room.bounds.w-lx,room.bounds.h-ly);if(edge>.15&&edge<.23){r=(room.rest?63:106)*k;g=(room.rest?129:114)*k;b=82*k;}if(room.rest){g+=7*k;b+=5*k;}}
      }else{const k=y/height,light=distance<14&&Math.floor(worldX)%6===0&&Math.floor(worldY)%4===0&&(worldX%1+1)%1>.2&&(worldX%1+1)%1<.8;r=light?95:17+k*10;g=light?120:29+k*14;b=light?114:32+k*12;}
      const color=(255<<24)|((b|0)<<16)|((g|0)<<8)|(r|0),index=y*width+x;floorPixels[index]=color;floorPixels[index+1]=color;if(y+1<height){floorPixels[index+width]=color;floorPixels[index+width+1]=color;}worldX+=stepX*2;worldY+=stepY*2;
      }
    }
    ctx.putImageData(frame,0,0);
    for(let x=0;x<width;x+=2){const cameraX=2*x/width-1,ray=castRay(run.map,p.x,p.y,cos+planeX*cameraX,sin+planeY*cameraX),distance=Math.max(.05,ray.distance),h=projection/distance,top=horizon-h*(1-cameraZ),cell=ray.y*run.map.width+ray.x,room=run.map.rooms[run.map.roomCells[cell]],along=ray.side?ray.x:ray.y,center=room?Math.floor(ray.side?room.x:room.y):-99,textureId=along===center&&room?6+room.id:((along+run.map.theme)%4===0?Math.max(1,ray.tile)-1:(run.map.theme%2?3:1)),texture=textureId*32+(ray.u*32|0);
      depth[x]=distance;depth[x+1]=distance;ctx.drawImage(walls,texture,0,1,32,x,top,2,h);ctx.fillStyle='rgba(5,19,23,'+Math.min(.88,distance*.039+(ray.side?.15:0))+')';ctx.fillRect(x,top,2,h);
    }
    const project=(obj,row,size=1,z=.5,kind='enemy')=>{const dx=obj.x-p.x,dy=obj.y-p.y,d=dx*cos+dy*sin,lateral=-dx*sin+dy*cos;if(d<(kind==='companion'?.85:.18)||d>27)return;const screen=width/2+lateral*projection/d,h=projection*size/d;const top=horizon+projection*cameraZ/d-h;if(screen+h/2<0||screen-h/2>width||top>height||top+h<0)return;visible.push({obj,row,d,screen,h,z,kind});};
    visible.length=0;
    for(const e of run.enemies)if(e.active)project(e,catalog.enemies.findIndex(p=>p.id===e.kind),e.state==='Dormant'?.46:e.boss?1.5:e.elite?1.1:.9,.5);
    for(const s of run.map.sources)if(s.active)project(s,catalog.enemies.length,1,.5,'source');
    for(const s of run.map.pickups)if(s.active)project(s,catalog.enemies.length+({health:1,supply:2,culture:3,companion:6}[s.kind]),.6,.3,'pickup');
    if(run.companion!=='none')project(run.pet,catalog.enemies.length+7+COMPANIONS.findIndex(c=>c.id===run.companion),.26,.6,'companion');
    project(run.map.exit,catalog.enemies.length+(run.exitOpen?5:4),1.2,.6,'exit');
    visible.sort((a,b)=>b.d-a.d);
    for(const v of visible){const {obj,d,screen,h,kind}=v,dead=kind==='enemy'&&obj.state==='Dead',squash=dead?Math.max(.08,obj.death/.45):1,top=horizon+projection*cameraZ/d-h*squash-(kind==='companion'?projection*.17/d:0)-(reducedMotion?0:Math.sin(run.time*5+(obj.id||0))*2),left=screen-h/2,frameIndex=kind==='enemy'&&obj.state==='Attack'?3:Math.floor(run.time*6+(obj.id||0))%3;
      const x0=Math.max(0,Math.floor(left)),x1=Math.min(width,Math.ceil(left+h));
      ctx.globalAlpha=dead?squash:Math.max(.4,1-d*.019);
      for(let x=x0;x<x1;x+=2){if(d>=depth[x])continue;const u=Math.min(63,Math.max(0,Math.floor((x-left)/h*64)));ctx.drawImage(sprites,frameIndex*64+u,v.row*64,1,64,x,top,2,h*squash);}
      ctx.globalAlpha=1;
      if(kind==='enemy'&&!dead&&d<depth[Math.max(0,Math.min(width-1,screen|0))]){
        if(obj.cell>0){ctx.strokeStyle='#91b8e899';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(screen,top+h*.5,h*.48,h*.52,0,0,Math.PI*2);ctx.stroke();}if(obj.state==='Dormant'){ctx.fillStyle='#ead4a5';ctx.fillRect(screen-h*.14,top+h*.4,h*.28,h*.2);}if(obj.state==='Detect'||obj.telegraph>0){ctx.fillStyle=obj.telegraph>0?'#f49c76':'#f1d798';ctx.font='bold 13px monospace';ctx.fillText('!',screen-4,top-9);}if(obj.shield>0||protectedBySource(run,obj)){ctx.strokeStyle=obj.shield>0?'#b9d9faaa':'#6ae6c898';ctx.lineWidth=obj.flash>0?3:1;ctx.beginPath();ctx.ellipse(screen,top+h*.49,h*.44,h*.46,0,0,Math.PI*2);ctx.stroke();if(protectedBySource(run,obj)){ctx.strokeStyle='#6ae6c8aa';ctx.beginPath();ctx.ellipse(screen,top+h*.92,h*.48,h*.12,0,0,Math.PI*2);ctx.stroke();}}
        const profile=catalog.enemyById[obj.kind],level=run.intel[obj.kind],name=level<2?visibleLabel(run,obj):profile.short+(level>=3&&profile.resistant?' / '+profile.trait:'');
        if(level>=3&&profile.resistant){ctx.strokeStyle=obj.pressureSpawn?'#f09b72':'#eac685';ctx.lineWidth=2;for(let n=0;n<(profile.id==='kpc'?6:profile.id==='mrsa'?4:3);n++){const a=n*Math.PI*2/(profile.id==='kpc'?6:profile.id==='mrsa'?4:3)+run.time*.3;const xx=screen+Math.cos(a)*h*.39,yy=top+h*.5+Math.sin(a)*h*.36;ctx.strokeRect(xx-3,yy-3,6,6);}}
        const label=(obj.boss?'BOSS · ':'')+name,barWidth=Math.max(38,Math.min(72,h)),labelY=Math.max(20,top+h*({rod:.26,diplo:.18,cluster:.07,worm:.03,flagellate:0,virus:0}[profile.shape]||0)-12),fontSize=d<9?11:10;
        ctx.font='bold '+fontSize+'px monospace';ctx.textAlign='center';const nameWidth=Math.min(width-12,ctx.measureText(label).width+10),labelX=Math.max(nameWidth/2+3,Math.min(width-nameWidth/2-3,screen));
        ctx.fillStyle='#09171ce8';ctx.fillRect(labelX-nameWidth/2,labelY-13,nameWidth,16);ctx.fillStyle=obj.boss?'#ffe3a0':'#f1efe7';ctx.fillText(label,labelX,labelY,nameWidth-8);
        ctx.fillStyle='#0a171e';ctx.fillRect(labelX-barWidth/2-1,labelY+5,barWidth+2,6);ctx.fillStyle='#4b2c40';ctx.fillRect(labelX-barWidth/2,labelY+6,barWidth,4);ctx.fillStyle=obj.boss?'#ebb579':'#cc868e';ctx.fillRect(labelX-barWidth/2,labelY+6,barWidth*Math.max(0,obj.hp/obj.maxHp),4);ctx.textAlign='left';
        if(obj.flash>0){ctx.fillStyle='#f7ffe647';ctx.fillRect(screen-h*.25,top+h*.2,h*.5,h*.5);}
      }
    }
    function dot(x,y,z,color,radius){const dx=x-p.x,dy=y-p.y,d=dx*cos+dy*sin;if(d<.2)return;const sx=width/2+(-dx*sin+dy*cos)*projection/d;if(sx<0||sx>=width||d>=depth[sx|0])return;const sy=horizon+(cameraZ-z)*projection/d,r=Math.max(1,projection*radius/d);ctx.fillStyle=color;ctx.fillRect(sx-r,sy-r,r*2,r*2);}
    for(const t of run.tracers)if(t.life>0){for(let n=2;n<=22;n++){const k=n/22;dot(t.x+(t.ex-t.x)*k,t.y+(t.ey-t.y)*k,.48,t.color,t.mode==='beam'?.026:t.mode==='rail'?.016:.012);}if(t.mode==='pulse'){for(let n=0;n<12;n++){const a=n*Math.PI/6,r=(.15-t.life)*3;dot(t.ex+Math.cos(a)*r,t.ey+Math.sin(a)*r,.5+Math.sin(a)*r,t.color,.025);}}}
    for(const h of run.hazards)if(h.active){for(let i=0;i<8;i++){const a=i*Math.PI/4;dot(h.x+Math.cos(a)*h.radius,h.y+Math.sin(a)*h.radius,.04,'#cc9b6380',.08);}dot(h.x,h.y,.1,'#dab06b',.13);}
    for(const field of run.fields)if(field.active){for(let i=0;i<24;i++){const a=i*Math.PI/12;dot(field.x+Math.cos(a)*field.radius,field.y+Math.sin(a)*field.radius,.025,'#6ce1c180',.11);}for(let i=0;i<8;i++){const a=i*Math.PI/4+run.time*.4;dot(field.x+Math.cos(a)*field.radius*.55,field.y+Math.sin(a)*field.radius*.55,.06,'#a6ead06a',.12);}}
    if(run.upgrades.isolation){const radius=2.5+run.upgrades.isolation*.45;for(let i=0;i<24;i++){const a=i*Math.PI/12;dot(p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius,.03,'#89b8e49a',.07);}}
    for(const orb of run.orbs)if(orb.active){dot(orb.x,orb.y,.13,'#52dabb',.075);dot(orb.x,orb.y,.17,'#d5ffe2',.025);}
    for(const g of run.thrown)if(g.active){dot(g.x,g.y,Math.max(.08,g.z),'#d7efe0',.1);dot(g.x,g.y,Math.max(.08,g.z)+.1,'#5ac8a7',.05);}

    const ally=COMPANIONS.find(c=>c.id===run.companion);
    if(ally&&run.pet.flash>0&&run.pet.target){const end=run.pet.target;for(let n=0;n<=14;n++){const t=n/14;dot(run.pet.x+(end.x-run.pet.x)*t,run.pet.y+(end.y-run.pet.y)*t,.6,ally.color,.022);}}
    for(const b of run.projectiles)if(b.active)dot(b.x,b.y,.5,b.color||'#efac7e',.075);
    for(const b of run.particles)if(b.life>0){dot(b.x,b.y,b.z,b.color,b.ricochet?.018:.025);if(b.ricochet){for(let n=1;n<=3;n++)dot(b.x-b.vx*n*.012,b.y-b.vy*n*.012,b.z-b.vz*n*.012,b.color,.012);}}
    // Both hands, muzzle and receiver share the same perspective and recoil pivot.
    if(!run.scoped){
      const bob=reducedMotion?0:Math.sin(run.walk)*2,kick=run.lastShot>0?Math.floor(run.lastShot*38*(catalog.weapons[run.weapon].recoil||1)):0,weaponW=width*.46,weaponH=weaponW*.75;
      const progress=run.reloadTime>0?1-run.reloadTime/run.reloadDuration:0,reloadStep=run.reloadTime>0?Math.floor(Math.sin(progress*Math.PI)*6)/6:0;
      const left=width*.525+bob,bottom=height+14+kick+run.switchTime*160+run.throwTime*90+reloadStep*weaponH*.38;
      ctx.save();ctx.translate(left+weaponW*.7,bottom);ctx.rotate(reloadStep*.38);ctx.drawImage(weapons,(run.scannerActive?catalog.weapons.length:run.weapon)*240,0,240,180,-weaponW*.7,-weaponH,weaponW,weaponH);
      if(run.reloadTime>0&&progress>.22&&progress<.8){ctx.fillStyle='#436a5c';const y=-weaponH*.22+reloadStep*weaponH*.14;ctx.fillRect(-weaponW*.28,y,weaponW*.13,weaponH*.28);ctx.fillStyle=catalog.weapons[run.weapon].color;ctx.fillRect(-weaponW*.27,y+4,weaponW*.1,4);}
      if(run.lastShot>.09&&!run.scannerActive&&run.reloadTime<=0){const x=-weaponW*.59,y=-weaponH*.87;ctx.fillStyle=catalog.weapons[run.weapon].color;ctx.fillRect(x-8,y-3,20,6);ctx.fillRect(x-2,y-10,6,19);ctx.fillStyle='#faffdb';ctx.fillRect(x-3,y-3,6,6);}ctx.restore();
    }else{
      const sw=Math.min(width*.65,height*1.35),sh=Math.min(height*.66,sw*.65),sx=(width-sw)/2,sy=reticleY-sh/2;
      ctx.fillStyle='#031611aa';ctx.fillRect(0,0,sx,height);ctx.fillRect(sx+sw,0,width-sx-sw,height);
      ctx.strokeStyle='#91d8c3';ctx.lineWidth=2;ctx.strokeRect(sx,sy,sw,sh);ctx.fillStyle='#aee7c9';ctx.font='10px monospace';ctx.fillText('SCANNER / 2x',sx+8,sy+16);
      ctx.fillStyle='#24473b';ctx.fillRect(sx+8,sy+sh-12,sw-16,3);ctx.fillStyle='#cde6a5';ctx.fillRect(sx+8,sy+sh-12,(sw-16)*run.scanFocus,3);
    }
    // Center aim and hit confirmation stay sharp at every display size.
    const cx=width/2,cy=reticleY;ctx.strokeStyle=run.ricochet>0?'#ffcb7c':run.hit>0?(run.hitKind==='shield'?'#8fceff':'#b6f7b1'):'#d9e9dc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx-3,cy);ctx.moveTo(cx+3,cy);ctx.lineTo(cx+7,cy);ctx.moveTo(cx,cy-7);ctx.lineTo(cx,cy-3);ctx.moveTo(cx,cy+3);ctx.lineTo(cx,cy+7);ctx.stroke();
    if(run.hit>0&&run.hitKind==='shield')ctx.strokeRect(cx-11,cy-11,22,22);
    if(run.ricochet>0){ctx.beginPath();ctx.moveTo(cx-13,cy-9);ctx.lineTo(cx-17,cy-5);ctx.moveTo(cx+13,cy+9);ctx.lineTo(cx+17,cy+5);ctx.stroke();}
    if(run.chargeTime>0){const k=Math.min(1,run.chargeTime/catalog.weapons[run.weapon].charge);ctx.strokeStyle=catalog.weapons[run.weapon].color;ctx.beginPath();ctx.arc(cx,cy,15,-Math.PI/2,-Math.PI/2+k*Math.PI*2);ctx.stroke();}
    if(run.hit>0&&run.hitKind!=='shield'){ctx.beginPath();for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.moveTo(cx+a*9,cy+b*9);ctx.lineTo(cx+a*13,cy+b*13);}ctx.stroke();}
    if(run.scanPulse>0){ctx.strokeStyle='#9ae0c088';ctx.strokeRect(cx-90*(1-run.scanPulse),cy-55*(1-run.scanPulse),180*(1-run.scanPulse),110*(1-run.scanPulse));}
    if(run.isolationPulse>0){ctx.strokeStyle='#8dc5ff66';ctx.lineWidth=2;ctx.strokeRect(3,3,width-6,height-6);}
    if(run.hurt>0){ctx.fillStyle='rgba(196,62,48,'+run.hurt*.7+')';ctx.fillRect(0,0,width,height);}
    // The mini-map is also rendered into the fixed-size canvas; no extra DOM work per frame.
    if(run.showMap||run.huntPulse>0||run.status!=='running'){
    const scale=Math.min(2.2,width*.2/run.map.width),mx=width-run.map.width*scale-10,my=28,known=(x,y)=>run.mapMode==='full'||run.discovered[Math.floor(y)*run.map.width+Math.floor(x)];
    ctx.fillStyle='#0a191ddd';ctx.fillRect(mx-4,my-4,run.map.width*scale+8,run.map.height*scale+19);
    for(let y=0;y<run.map.height;y++)for(let x=0;x<run.map.width;x++){if(!known(x,y))continue;ctx.fillStyle=run.map.cells[y*run.map.width+x]?'#779184':'#253e35';ctx.fillRect(mx+x*scale,my+y*scale,scale,scale);}
    for(const s of run.map.sources)if(known(s.x,s.y)){ctx.fillStyle=s.active?'#b3eace':'#52645d';ctx.fillRect(mx+s.x*scale-2,my+s.y*scale-2,4,4);}
    for(const e of run.enemies)if(e.active&&e.state!=='Dead'&&e.revealed&&known(e.x,e.y)){ctx.fillStyle=e.boss?'#ffd394':'#e6a597';ctx.fillRect(mx+e.x*scale-1,my+e.y*scale-1,2,2);}
    if(run.guide&&run.huntPulse>0){ctx.strokeStyle='#f2d894';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mx+run.guide.targetX*scale,my+run.guide.targetY*scale,3+(1.1-run.huntPulse)*7,0,Math.PI*2);ctx.stroke();}
    if(known(run.map.exit.x,run.map.exit.y)){ctx.fillStyle=run.exitOpen?'#b9f7a1':'#e0ac7e';ctx.fillRect(mx+run.map.exit.x*scale-2,my+run.map.exit.y*scale-2,4,4);}
    ctx.fillStyle='#f2f6df';ctx.beginPath();ctx.moveTo(mx+p.x*scale+cos*4,my+p.y*scale+sin*4);ctx.lineTo(mx+p.x*scale-sin*2-cos*2,my+p.y*scale+cos*2-sin*2);ctx.lineTo(mx+p.x*scale+sin*2-cos*2,my+p.y*scale-cos*2-sin*2);ctx.fill();
    ctx.font='9px monospace';ctx.fillStyle='#bad3bb';ctx.fillText(width<320?(run.mapMode==='full'?'FULL':'FOG'):(run.mapMode==='full'?'MAP / FULL':'MAP / EXPLORE'),mx,my+run.map.height*scale+12);
    }
  }
  return {render,resize,paintPortrait(target,kind){const i=catalog.enemies.findIndex(p=>p.id===kind),ctx=target.getContext('2d');if(i<0||!ctx)return;ctx.clearRect(0,0,target.width,target.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(sprites,0,i*SIZE,SIZE,SIZE,0,0,target.width,target.height);},dispose(){disposed=true;for(const c of [sprites,walls,weapons,canvas]){c.width=1;c.height=1;}frame=null;floorPixels=null;depth=null;visible.length=0;}};
}
