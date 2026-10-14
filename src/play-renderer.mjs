import {castRay,protectedBySource,visibleLabel,viewFov} from './play-engine.mjs';

import {COMPANIONS} from './play-data.mjs';
import {floorAt,eyeAt,enemyHeight} from './play-world.mjs';
import {createSceneRaster} from './play-scene.mjs';

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
function createSprites(catalog,art={}){
  const atlas=surface(SIZE*4,SIZE*(catalog.enemies.length+13)),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
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
    if(art.media0){const y=(base+1)*SIZE;ctx.clearRect(x,y,64,51);ctx.drawImage(art.media0,x+8,y+15,48,34);}
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
  for(let f=0;f<4;f++)for(let k=0;k<2;k++){
   const x=f*SIZE,y=(base+11+k)*SIZE;
   ctx.fillStyle='#08121788';ctx.beginPath();ctx.ellipse(x+32,y+58,25,4,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#1b292e';ctx.fillRect(x+10,y+13,42,44);ctx.fillStyle='#586d6a';ctx.fillRect(x+12,y+11,36,43);
   ctx.fillStyle='#9eafa1';ctx.fillRect(x+12,y+11,36,3);ctx.fillRect(x+12,y+14,2,37);ctx.fillStyle='#243a3b';ctx.fillRect(x+48,y+14,5,39);
   if(k===0){
    ctx.fillStyle='#111f27';ctx.fillRect(x+17,y+17,26,20);ctx.fillStyle='#508c7e';ctx.fillRect(x+19,y+19,22,16);
    ctx.fillStyle='#b8e3c4';for(let n=0;n<4;n++)ctx.fillRect(x+21,y+22+n*3,13+n%2*4,1);
    ctx.fillStyle='#26363c';ctx.fillRect(x+17,y+41,27,7);ctx.fillStyle='#a3baa6';for(let n=0;n<6;n++)ctx.fillRect(x+19+n*4,y+43,2,2);
   }else{
    for(let row=0;row<3;row++){ctx.fillStyle='#172a2f';ctx.fillRect(x+17,y+19+row*11,27,8);for(let n=0;n<4;n++){ctx.fillStyle=['#b7b5ce','#8bc7c2','#bdc7a2'][row];ctx.fillRect(x+19+n*6,y+21+row*11,3,5);ctx.fillStyle='#d5dfca';ctx.fillRect(x+19+n*6,y+20+row*11,3,1);}}
   }
  }
  return atlas;
}
function createWalls(accent='#a9c4a1',theme=0,biome='facility',rooms=[],art={}){
 const size=64,atlas=surface(size*(8+rooms.length),size),c=atlas.getContext('2d');c.imageSmoothingEnabled=false;
 const images=['aqconc01','aqmetl01','aqmetl03','aqmetl07','aqlite01','aqmetl07','floor0_1'];
 for(let i=0;i<7;i++){
  const x=i*size;c.fillStyle=['#788c88','#3d484a','#59676b','#3b4542','#697b7b','#807b60','#677170'][i];c.fillRect(x,0,size,size);
  if(art[images[i]])c.drawImage(art[images[i]],x,0,size,size);
  if(i===6)continue;
  // Deep trim, material edges, bolted seams and a restrained departmental stripe.
  c.fillStyle='#060e15';c.fillRect(x,0,64,4);c.fillRect(x,58,64,6);c.fillRect(x,0,3,64);
  c.fillStyle='#a3b8b1';c.fillRect(x+3,4,60,1);c.fillRect(x+3,56,60,1);c.fillStyle='#132730';c.fillRect(x+3,52,60,4);
  c.fillStyle=biome==='virology'?'#8498ba':biome==='parasitology'?'#83986c':accent;c.fillRect(x+3,45,60,3);
  c.fillStyle='#c6c7b1';for(const yy of [8,50]){c.fillRect(x+5,yy,2,2);c.fillRect(x+59,yy,2,2);}
  if(i===0){c.fillStyle='#b7c5bd';c.globalAlpha=.15;c.fillRect(x+5,6,52,35);c.globalAlpha=1;}
  if(i===2){c.fillStyle='#101d26';c.fillRect(x+12,12,42,26);c.fillStyle='#426260';c.fillRect(x+15,15,36,20);c.fillStyle='#93c8ae';for(let yy=19;yy<32;yy+=5)c.fillRect(x+19,yy,26-(yy%3)*4,1);c.fillStyle='#bbdacf';c.fillRect(x+16,16,2,17);}
  if(i===4){c.fillStyle='#c9e2d5';c.fillRect(x+21,8,22,28);c.fillStyle='#f4f1d8';c.fillRect(x+25,10,14,24);}
 }
 c.fillStyle='#354447';c.fillRect(7*64,0,64,64);c.fillStyle='#8e9a8c';c.fillRect(7*64,0,64,5);c.fillStyle='#16252b';c.fillRect(7*64,51,64,13);c.fillStyle='#b7aa79';c.fillRect(7*64,6,64,2);
 for(const r of rooms){
  const x=(8+r.id)*size;c.drawImage(atlas,0,0,64,64,x,0,64,64);
  c.fillStyle='#0b171c';c.fillRect(x+6,8,52,34);c.fillStyle=r.rest?'#b4d7ac':accent;c.fillRect(x+7,9,50,2);
  c.textAlign='center';c.font='bold 17px monospace';c.fillStyle='#e1e4cf';c.fillText(String(r.id).padStart(2,'0'),x+32,29);
  c.font='6px monospace';c.fillStyle='#a4beb3';c.fillText((r.name||'LABORATORY').slice(0,12),x+32,38);
 }
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
  let width,height,depth,scene,disposed=false,lastRun=null;const art={};
  let sprites=createSprites(catalog);const weapons=createWeapons(catalog),visible=[];let walls=createWalls(),mapId='';
  function resize(mode=quality){quality=mode;const maxW=mode==='low'?480:640,maxH=mode==='low'?270:360,cssW=canvas.clientWidth||maxW,cssH=canvas.clientHeight||maxH,scale=Math.min(maxW/cssW,maxH/cssH);width=Math.max(160,Math.floor(cssW*scale/2)*2);height=Math.max(120,Math.floor(cssH*scale/2)*2);canvas.width=width;canvas.height=height;context.imageSmoothingEnabled=false;scene?.dispose();scene=createSceneRaster(context,width,height);depth=scene.depth;}
  resize();
  const ready=Promise.all(['aqconc01','aqmetl01','aqmetl03','aqmetl07','aqlite01','floor0_1','media0'].map(name=>new Promise(resolve=>{
   const img=new Image();img.onload=()=>{if(!disposed)art[name]=img;resolve();};img.onerror=()=>resolve();img.src=new URL('./vendor/freedoom/'+name+'.png',import.meta.url).href;
  }))).then(()=>{if(disposed)return;sprites.width=1;sprites.height=1;sprites=createSprites(catalog,art);mapId='';if(lastRun)render(lastRun);});
  function render(run){
    if(disposed)return;lastRun=run;if(mapId!==run.map.id){walls.width=1;walls.height=1;walls=createWalls(run.map.color,run.map.theme,run.map.biome,run.map.rooms,art);mapId=run.map.id;}run.viewAspect=width/height;const ctx=context,p=run.player,cos=Math.cos(p.angle),sin=Math.sin(p.angle),fov=viewFov(run),planeX=-sin*fov,planeY=cos*fov,projection=width/(2*fov),reticleY=height*.46,horizon=Math.floor(reticleY+Math.tan(p.pitch||0)*projection+(reducedMotion?0:run.land*15)),cameraZ=eyeAt(run.map,p);
    scene.render(run,walls,horizon,projection,planeX,planeY);
    const project=(obj,row,size=1,z=.5,kind='enemy')=>{const dx=obj.x-p.x,dy=obj.y-p.y,d=dx*cos+dy*sin,lateral=-dx*sin+dy*cos;if(d<(kind==='companion'?.85:.18)||d>27)return;const screen=width/2+lateral*projection/d,h=projection*size/d;const top=horizon+projection*(cameraZ-floorAt(run.map,obj.x,obj.y))/d-h;if(screen+h/2<0||screen-h/2>width||top>height||top+h<0)return;visible.push({obj,row,d,screen,h,z,kind});};
    visible.length=0;
    for(const e of run.enemies)if(e.active)project(e,catalog.enemies.findIndex(p=>p.id===e.kind),enemyHeight(e),.5);
    for(const s of run.map.sources)if(s.active)project(s,catalog.enemies.length, .78,.5,'source');
    for(const s of run.map.pickups)if(s.active)project(s,catalog.enemies.length+({health:1,supply:2,culture:3,companion:6}[s.kind]),.42,.3,'pickup');
    if(run.companion!=='none')project(run.pet,catalog.enemies.length+7+COMPANIONS.findIndex(c=>c.id===run.companion),.26,.6,'companion');
    project(run.map.exit,catalog.enemies.length+(run.exitOpen?5:4),1.2,.6,'exit');
    for(const s of run.map.props||[])project(s,catalog.enemies.length+(s.kind==='terminal'?11:12),s.kind==='terminal'?.65:.8,.4,'prop');
    visible.sort((a,b)=>b.d-a.d);
    for(const v of visible){const {obj,d,screen,h,kind}=v,dead=kind==='enemy'&&obj.state==='Dead',squash=dead?Math.max(.08,obj.death/.45):1,top=horizon+projection*(cameraZ-floorAt(run.map,obj.x,obj.y))/d-h*squash-(kind==='companion'?projection*.17/d:0)-(reducedMotion?0:Math.sin(run.time*5+(obj.id||0))*2),left=screen-h/2,frameIndex=kind==='enemy'&&obj.state==='Attack'?3:Math.floor(run.time*6+(obj.id||0))%3;
      const x0=Math.max(0,Math.floor(left)),x1=Math.min(width,Math.ceil(left+h));
      ctx.globalAlpha=dead?squash:Math.max(.4,1-d*.019);
      for(let x=x0;x<x1;x+=2){const u=Math.min(63,Math.max(0,Math.floor((x-left)/h*64)));let start=-1;const end=Math.min(height,Math.ceil(top+h*squash));for(let y=Math.max(0,Math.floor(top));y<=end;y++){const pass=y<end&&d<depth[Math.min(height-1,y)*width+x];if(pass&&start<0)start=y;if(!pass&&start>=0){const sourceY=(start-top)/(h*squash)*64,sourceH=(y-start)/(h*squash)*64;ctx.drawImage(sprites,frameIndex*64+u,v.row*64+sourceY,1,sourceH,x,start,2,y-start);start=-1;}}}
      ctx.globalAlpha=1;
      if(kind==='enemy'&&!dead&&d<depth[Math.max(0,Math.min(height-1,(top+h*.5)|0))*width+Math.max(0,Math.min(width-1,screen|0))]){
        if(obj.cell>0){ctx.strokeStyle='#91b8e899';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(screen,top+h*.5,h*.48,h*.52,0,0,Math.PI*2);ctx.stroke();}if(obj.state==='Dormant'){ctx.fillStyle='#ead4a5';ctx.fillRect(screen-h*.14,top+h*.4,h*.28,h*.2);}if(obj.state==='Detect'||obj.telegraph>0){ctx.fillStyle=obj.telegraph>0?'#f49c76':'#f1d798';ctx.font='bold 13px monospace';ctx.fillText('!',screen-4,top-9);}if(obj.shield>0||protectedBySource(run,obj)){ctx.strokeStyle=obj.shield>0?'#b9d9faaa':'#6ae6c898';ctx.lineWidth=obj.flash>0?3:1;ctx.beginPath();ctx.ellipse(screen,top+h*.49,h*.44,h*.46,0,0,Math.PI*2);ctx.stroke();if(protectedBySource(run,obj)){ctx.strokeStyle='#6ae6c8aa';ctx.beginPath();ctx.ellipse(screen,top+h*.92,h*.48,h*.12,0,0,Math.PI*2);ctx.stroke();}}
        if(obj.shield>0&&obj.shield<(catalog.enemyById[obj.kind].shield+(obj.boss||obj.miniboss?25:0))*.6){ctx.strokeStyle='#d5e9f4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(screen-h*.3,top+h*.2);ctx.lineTo(screen-h*.1,top+h*.4);ctx.lineTo(screen-h*.2,top+h*.55);ctx.moveTo(screen+h*.28,top+h*.4);ctx.lineTo(screen+h*.1,top+h*.56);ctx.lineTo(screen+h*.2,top+h*.72);ctx.stroke();}
        const profile=catalog.enemyById[obj.kind],level=run.intel[obj.kind],name=level<2?visibleLabel(run,obj):profile.short+(level>=3&&profile.resistant?' / '+profile.trait:'');
        if(level>=3&&profile.resistant){ctx.strokeStyle=obj.pressureSpawn?'#f09b72':'#eac685';ctx.lineWidth=2;for(let n=0;n<(profile.id==='kpc'?6:profile.id==='mrsa'?4:3);n++){const a=n*Math.PI*2/(profile.id==='kpc'?6:profile.id==='mrsa'?4:3)+run.time*.3;const xx=screen+Math.cos(a)*h*.39,yy=top+h*.5+Math.sin(a)*h*.36;ctx.strokeRect(xx-3,yy-3,6,6);}}
        const label=(obj.boss?'BOSS · ':obj.miniboss?'MID · ':'')+name,barWidth=Math.max(38,Math.min(obj.boss?110:72,h)),labelY=Math.max(20,top+h*({rod:.26,diplo:.18,cluster:.07,worm:.03,flagellate:0,virus:0}[profile.shape]||0)-12),fontSize=d<9?11:10;
        ctx.font='bold '+fontSize+'px monospace';ctx.textAlign='center';const nameWidth=Math.min(width-12,ctx.measureText(label).width+10),labelX=Math.max(nameWidth/2+3,Math.min(width-nameWidth/2-3,screen));
        ctx.fillStyle='#09171ce8';ctx.fillRect(labelX-nameWidth/2,labelY-13,nameWidth,16);ctx.fillStyle=obj.boss?'#ffe3a0':'#f1efe7';ctx.fillText(label,labelX,labelY,nameWidth-8);
        ctx.fillStyle='#0a171e';ctx.fillRect(labelX-barWidth/2-1,labelY+5,barWidth+2,6);ctx.fillStyle='#4b2c40';ctx.fillRect(labelX-barWidth/2,labelY+6,barWidth,4);ctx.fillStyle=obj.boss?'#ebb579':'#cc868e';ctx.fillRect(labelX-barWidth/2,labelY+6,barWidth*Math.max(0,obj.hp/obj.maxHp),4);ctx.textAlign='left';
        if(obj.flash>0){ctx.fillStyle='#f7ffe647';ctx.fillRect(screen-h*.25,top+h*.2,h*.5,h*.5);}
      }
    }
    function dot(x,y,z,color,radius,absolute=false){
     const dx=x-p.x,dy=y-p.y,d=dx*cos+dy*sin;if(d<.2)return;const sx=width/2+(-dx*sin+dy*cos)*projection/d,worldZ=absolute?z:floorAt(run.map,x,y)+z,sy=horizon+(cameraZ-worldZ)*projection/d;
     if(sx<0||sx>=width||sy<0||sy>=height||d>=depth[(sy|0)*width+(sx|0)])return;
     const r=Math.max(1,projection*radius/d);ctx.fillStyle=color;ctx.fillRect(sx-r,sy-r,r*2,r*2);
    }
    for(const t of run.tracers)if(t.life>0){for(let n=2;n<=22;n++){const k=n/22;dot(t.x+(t.ex-t.x)*k,t.y+(t.ey-t.y)*k,(t.z??.48)+((t.ez??.48)-(t.z??.48))*k,t.color,t.mode==='beam'?.026:t.mode==='rail'?.016:.012,true);}if(t.mode==='pulse'){for(let n=0;n<12;n++){const a=n*Math.PI/6,r=(.15-t.life)*3;dot(t.ex+Math.cos(a)*r,t.ey+Math.sin(a)*r,(t.ez??.5)+Math.sin(a)*r,t.color,.025,true);}}}
    for(const h of run.hazards)if(h.active){for(let i=0;i<8;i++){const a=i*Math.PI/4;dot(h.x+Math.cos(a)*h.radius,h.y+Math.sin(a)*h.radius,.04,'#cc9b6380',.08);}dot(h.x,h.y,.1,'#dab06b',.13);}
    for(const field of run.fields)if(field.active){for(let i=0;i<24;i++){const a=i*Math.PI/12;dot(field.x+Math.cos(a)*field.radius,field.y+Math.sin(a)*field.radius,.025,field.kind==='isolation'?'#89b8e49a':'#6ce1c180',.11);}for(let i=0;i<8;i++){const a=i*Math.PI/4+run.time*.4;dot(field.x+Math.cos(a)*field.radius*.55,field.y+Math.sin(a)*field.radius*.55,.06,field.kind==='isolation'?'#b3d6ee80':'#a6ead06a',.12);}}
    if(run.upgrades.isolation){const radius=2.5+run.upgrades.isolation*.45;for(let i=0;i<24;i++){const a=i*Math.PI/12;dot(p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius,.03,'#89b8e49a',.07);}}
    for(const orb of run.orbs)if(orb.active){dot(orb.x,orb.y,.13,'#52dabb',.075);dot(orb.x,orb.y,.17,'#d5ffe2',.025);}
    for(const g of run.thrown)if(g.active){dot(g.x,g.y,g.z,'#d7efe0',.1,true);dot(g.x,g.y,g.z+.1,'#5ac8a7',.05,true);}

    const ally=COMPANIONS.find(c=>c.id===run.companion);
    if(ally&&run.pet.flash>0&&run.pet.target){for(const end of [run.pet.target,run.pet.echoTarget].filter(Boolean))for(let n=0;n<=14;n++){const t=n/14;dot(run.pet.x+(end.x-run.pet.x)*t,run.pet.y+(end.y-run.pet.y)*t,.6,ally.color,.022);}}
    for(const b of run.projectiles)if(b.active)dot(b.x,b.y,b.z??.5,b.color||'#efac7e',.075,true);
    for(const b of run.particles)if(b.life>0){dot(b.x,b.y,b.z,b.color,b.ricochet?.018:.025,true);if(b.ricochet){for(let n=1;n<=3;n++)dot(b.x-b.vx*n*.012,b.y-b.vy*n*.012,b.z-b.vz*n*.012,b.color,.012,true);}}
    for(const e of run.enemies)if(e.active&&e.state!=='Dead'){
     if(e.telegraph>0&&e.attackPoint&&e.boss&&e.phase===2){for(let n=0;n<24;n++){const a=n*Math.PI/12;dot(e.attackPoint.x+Math.cos(a)*1.05,e.attackPoint.y+Math.sin(a)*1.05,.035,'#ffb178',.07);}}
     if(e.revealed&&protectedBySource(run,e)){const s=run.map.sources.find(s=>s.active&&Math.hypot(e.x-s.x,e.y-s.y)<4);if(s)for(let n=0;n<12;n++){const t=n/12;dot(s.x+(e.x-s.x)*t,s.y+(e.y-s.y)*t,.25,'#6ac0ab70',.02);}}
    }
    if(run.upgrades.cephaPulse){const a=run.time*1.2;dot(p.x+Math.cos(a)*.85,p.y+Math.sin(a)*.85,.48,'#f0cb83',.075);}
    // Both hands, muzzle and receiver share the same perspective and recoil pivot.
    if(!run.scoped){
      const bob=reducedMotion?0:Math.sin(run.walk)*2,kick=run.lastShot>0?Math.floor(run.lastShot*38*(catalog.weapons[run.weapon].recoil||1)):0,weaponW=width*.42,weaponH=weaponW*.75;
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
    for(let y=0;y<run.map.height;y++)for(let x=0;x<run.map.width;x++){if(!known(x,y))continue;ctx.fillStyle=run.map.cells[y*run.map.width+x]?'#779184':run.map.stairs?.[y*run.map.width+x]?'#bda878':floorAt(run.map,x,y)>.3?'#4d7274':'#253e35';ctx.fillRect(mx+x*scale,my+y*scale,scale,scale);}
    for(const s of run.map.sources)if(known(s.x,s.y)){ctx.fillStyle=s.active?'#b3eace':'#52645d';ctx.fillRect(mx+s.x*scale-2,my+s.y*scale-2,4,4);}
    for(const e of run.enemies)if(e.active&&e.state!=='Dead'&&e.revealed&&known(e.x,e.y)){ctx.fillStyle=e.boss?'#ffd394':'#e6a597';ctx.fillRect(mx+e.x*scale-1,my+e.y*scale-1,2,2);}
    if(run.guide&&run.huntPulse>0){ctx.strokeStyle='#f2d894';ctx.lineWidth=1;ctx.beginPath();ctx.arc(mx+run.guide.targetX*scale,my+run.guide.targetY*scale,3+(1.1-run.huntPulse)*7,0,Math.PI*2);ctx.stroke();}
    if(known(run.map.exit.x,run.map.exit.y)){ctx.fillStyle=run.exitOpen?'#b9f7a1':'#e0ac7e';ctx.fillRect(mx+run.map.exit.x*scale-2,my+run.map.exit.y*scale-2,4,4);}
    ctx.fillStyle='#f2f6df';ctx.beginPath();ctx.moveTo(mx+p.x*scale+cos*4,my+p.y*scale+sin*4);ctx.lineTo(mx+p.x*scale-sin*2-cos*2,my+p.y*scale+cos*2-sin*2);ctx.lineTo(mx+p.x*scale+sin*2-cos*2,my+p.y*scale-cos*2-sin*2);ctx.fill();
    ctx.font='9px monospace';ctx.fillStyle='#bad3bb';ctx.fillText(width<320?(run.mapMode==='full'?'FULL':'FOG'):(run.mapMode==='full'?'MAP / FULL':'MAP / EXPLORE'),mx,my+run.map.height*scale+12);
    }
  }
  return {render,resize,ready,paintPortrait(target,kind){const i=catalog.enemies.findIndex(p=>p.id===kind),ctx=target.getContext('2d');if(i<0||!ctx)return;ctx.clearRect(0,0,target.width,target.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(sprites,0,i*SIZE,SIZE,SIZE,0,0,target.width,target.height);},dispose(){disposed=true;for(const c of [sprites,walls,weapons,canvas]){c.width=1;c.height=1;}scene.dispose();depth=null;lastRun=null;for(const img of Object.values(art)){img.onload=null;img.src='';}visible.length=0;}};
}
