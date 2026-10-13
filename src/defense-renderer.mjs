import {Pool} from './vendor/kontra-10.0.2.mjs';
import {PATH} from './defense-data.mjs';
import {placementCheck} from './defense-engine.mjs';
const TAU=Math.PI*2;
const palettes={lung:['#204a45','#112e32','#7fbd9a'],urinary:['#204557','#112c41','#83b8c6'],abdomen:['#4d4540','#2a3035','#c0ad84']};
export function createDefenseRenderer(initialCanvas,catalog,{onSound=()=>{}}={}){
 let canvas=initialCanvas,ctx=canvas.getContext('2d');let camera={scale:1,x:0,y:0,rotated:false},seen=0,time=0,shake=0,terrain=null,terrainMap='',banners=[],labels=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const pool=Pool({maxSize:450,create:()=>({init(p){Object.assign(this,p);this.life=p.life;this.full=p.life;},isAlive(){return this.life>0;},update(dt){this.life-=dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=.96;this.vy*=.96;},render(){ctx.globalAlpha=Math.max(0,this.life/this.full);ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(this.x,this.y,this.size*Math.max(.2,this.life/this.full),0,TAU);ctx.fill();}})});
 function ring(x,y,r,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
 function disc(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
 function text(value,x,y,color='#fff',size=11,weight=700){ctx.save();ctx.translate(x,y);if(camera.rotated)ctx.rotate(-Math.PI/2);ctx.font=weight+' '+size+'px SUIT, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(value,0,0);ctx.restore();}
 function hex(x,y,r,fill,stroke){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function makeTerrain(mapId){
  const c=document.createElement('canvas');c.width=1800;c.height=1040;const g=c.getContext('2d');g.scale(2,2);const colors=palettes[mapId],gradient=g.createLinearGradient(0,0,900,520);gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);g.fillStyle=gradient;g.fillRect(0,0,900,520);
  for(let y=0;y<560;y+=42)for(let x=0;x<940;x+=48){const offset=(Math.round(y/42)%2)*24;g.strokeStyle='#a4e6dd08';g.lineWidth=1;g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;g.lineTo(x+offset+Math.cos(a)*26,y+Math.sin(a)*26);}g.closePath();g.stroke();}
  for(let n=0;n<65;n++){const x=28+(n*137%844),y=35+(n*89%440);if(!placementCheck({towers:[]},{x,y}).ok)continue;g.save();g.translate(x,y);g.rotate(n);g.fillStyle=n%3?'#7acaaf0b':'#b3f8ed0d';g.fillRect(-12,-8,24,16);g.strokeStyle='#aaf6d51a';g.strokeRect(-12,-8,24,16);g.restore();}
  const line=(width,color)=>{g.lineJoin='round';g.lineCap='round';g.lineWidth=width;g.strokeStyle=color;g.beginPath();PATH.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.stroke();};
  g.save();g.translate(0,6);line(64,'#071d2580');g.restore();line(62,'#071c27');line(57,'#376f68');line(49,colors[2]);line(38,mapId==='urinary'?'#517f91':mapId==='abdomen'?'#898c76':'#568b77');
  g.setLineDash([2,15]);line(2,'#e0ffd82e');g.setLineDash([]);
  for(const [x,y] of [[185,100],[185,235],[455,235],[455,100],[730,100],[730,360],[305,360],[305,465]]){g.fillStyle='#e3ffdd1a';g.beginPath();g.arc(x,y,15,0,TAU);g.fill();}
  terrain=c;terrainMap=mapId;
 }
 function burst(x,y,color,count=16,big=false){for(let i=0;i<(reduced?3:count);i++){const angle=TAU*i/count+Math.random()*.4,v=(big?170:100)*(Math.random()*.7+.3);pool.get({x,y,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v,life:.25+Math.random()*.4,size:(big?3.5:2)+Math.random()*2,color});}}
 function update(dt,run){
  time+=dt;pool.update(dt);shake=Math.max(0,shake-dt*22);labels=labels.filter(p=>(p.life-=dt)>0);banners=banners.filter(p=>(p.life-=dt)>0);
  for(const e of run.effects){if(e.id<=seen)continue;seen=e.id;
   if(e.kind==='wave'||e.kind==='clear'){banners=[{text:e.text,life:1.65,sub:e.boss?'HIGH BURDEN INCOMING':e.kind==='clear'?'CHOOSE YOUR NEXT SUPPLY':'DEFEND THE HOST'}];onSound(e.kind);continue;}
   if(e.kind==='shot'){onSound('shot');continue;}
   if(e.kind==='kill'){burst(e.x,e.y,e.color,e.big?35:17,e.big);labels.push({...e,life:.75,type:'coin'});onSound(e.big?'boss':'pop');if(e.big&&!reduced)shake=5;}
   if(e.kind==='hit'){burst(e.x,e.y,e.color,4);labels.push({...e,life:.4,type:'damage'});}
   if(e.kind==='shield')labels.push({...e,life:.65,type:'shield'});
   if(['build','upgrade','source','merge'].includes(e.kind)){burst(e.x,e.y,e.color,28,true);labels.push({...e,life:.6,type:'ring'});onSound(e.kind==='build'?'build':'upgrade');}
   if(e.kind==='merge')labels.push({...e,life:.6,type:'link'});
   if(e.kind==='leak'){if(!reduced)shake=7;burst(e.x,e.y,e.color,20,true);onSound('leak');}
  }
 }
 function resize(){const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(box.width*dpr),h=Math.round(box.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const rotated=box.height>box.width*1.18,s=Math.min(box.width/(rotated?520:900),box.height/(rotated?900:520));camera={scale:s,x:(box.width-(rotated?520:900)*s)/2,y:(box.height-(rotated?900:520)*s)/2,rotated,dpr};return box;}
 function worldPoint(clientX,clientY){const box=canvas.getBoundingClientRect(),x=(clientX-box.left-camera.x)/camera.scale,y=(clientY-box.top-camera.y)/camera.scale;return camera.rotated?{x:y,y:520-x}:{x,y};}
 function drawTower(t,selected=false,ghost=false){
  const d=catalog.drugById[t.drugId],color=d.color,rank=t.potency||0;
  ctx.save();ctx.translate(t.x,t.y);if(ghost)ctx.globalAlpha=.65;
  ctx.fillStyle='#041c2780';ctx.beginPath();ctx.ellipse(0,14,25,11,0,0,TAU);ctx.fill();
  if(selected){ring(0,0,29+Math.sin(time*4)*1.5,'#ccffe6',2);ring(0,0,34,'#c5ffee30',1);}
  hex(0,4,24,'#0a2531','#4c7678');hex(0,0,22,rank>=2?'#d8e0b4':'#abc9c4',color);hex(0,0,17,'#163a42',color);
  ctx.save();ctx.rotate(t.angle||0);ctx.translate(-(t.recoil||0)*3,0);ctx.fillStyle='#0c202b';ctx.fillRect(6,-6,22,12);ctx.fillStyle=color;ctx.fillRect(8,-4,21,8);ctx.fillStyle='#e8fff0';ctx.fillRect(25,-4,4,8);if(d.combo){ctx.fillRect(10,-8,16,3);ctx.fillRect(10,5,16,3);}if(t.recoil>0){disc(32,0,5*t.recoil,'#ebffdf');ring(32,0,8*t.recoil,color,2);}ctx.restore();
  disc(0,0,11,color);disc(-3,-4,4,'#ffffff50');
  if(d.shape==='pulse'){ring(0,0,6,'#fff',2);disc(0,0,2,'#fff');}else if(d.shape==='linked'){disc(-4,-1,4,'#edf6da');disc(4,2,4,'#395965');}else if(d.shape==='diamond'){hex(0,0,6,'#fff8dc');}else{ctx.save();ctx.rotate(-.7);ctx.fillStyle='#edf9df';ctx.beginPath();ctx.roundRect(-3,-7,6,14,3);ctx.fill();ctx.fillStyle='#375b61';ctx.fillRect(-3,0,6,5);ctx.restore();}
  if(!ghost){for(let i=0;i<rank;i++)disc(-6*(rank-1)+i*12,25,3,'#ffe6a0');if(t.exposure)disc(18,-17,5,'#d6f291');if(!t.renalAdjusted){disc(-17,-17,7,'#ffc777');text('!',-17,-17,'#223139',10);}text(d.short,0,39,color,9);}
  ctx.restore();
 }
 function drawEnemy(e,run){
  const p=catalog.pathogenById[e.pathogenId],r=e.elite?24:e.scout?10:14,wobble=reduced?0:Math.sin(time*8+e.id)*1.1;
  ctx.save();ctx.translate(e.x,e.y+wobble);ctx.rotate(Math.sin(time*3+e.id)*.12);
  ctx.fillStyle='#092c4866';ctx.beginPath();ctx.ellipse(1,r*.75,r*1.1,r*.5,0,0,TAU);ctx.fill();
  if(e.elite){ring(0,0,r+7,'#ffaf6baa',2);ctx.save();ctx.rotate(time);for(let i=0;i<8;i++){const a=i*TAU/8;disc(Math.cos(a)*(r+7),Math.sin(a)*(r+7),2,'#ffcf9a');}ctx.restore();}
  if(e.sourceBound&&!run.sourceControlled){ring(0,0,r+9,'#d4a2e8',2);ctx.save();ctx.setLineDash([4,5]);ring(0,0,r+12,'#c9a2d766',2);ctx.restore();}
  ctx.fillStyle=e.flash>0?'#fffde7':p.color;ctx.strokeStyle='#0a293e';ctx.lineWidth=2;
  ctx.beginPath();if(p.group==='그람양성'){ctx.arc(-r*.32,-2,r*.72,0,TAU);ctx.arc(r*.34,2,r*.7,0,TAU);}else{ctx.roundRect(-r*1.15,-r*.68,r*2.3,r*1.36,r*.65);}ctx.fill();ctx.stroke();
  disc(-r*.4,-r*.28,r*.26,'#ffffff5c');disc(-r*.28,0,2.2,'#183847');disc(r*.38,1,2.2,'#183847');disc(-r*.32,-.6,.6,'#fff');
  if(['mrsa','esbl','esblk','kpc','visa','lzdr'].includes(p.id)){ctx.strokeStyle='#744548';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(3,-8);ctx.stroke();}
  ctx.restore();
  if(e.hp<e.maxHp||e.elite){ctx.fillStyle='#092b38';ctx.fillRect(e.x-r,e.y-r-11,r*2,4);ctx.fillStyle=e.elite?'#ffc089':'#b9f7a8';ctx.fillRect(e.x-r,e.y-r-11,r*2*Math.max(0,e.hp/e.maxHp),4);}
  if(e.elite||run.lab>=1)text(p.short,e.x,e.y+r+13,e.elite?'#ffe4b2':'#d5eee1',e.elite?12:8);
 }
 function draw(run,{selectedTower=null,ghost=null,movingId=null}={}){
  const box=resize(),{scale:s,x:ox,y:oy,rotated,dpr}=camera;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#102a32';ctx.fillRect(0,0,box.width,box.height);
  const jitter=shake&&!reduced?(Math.random()-.5)*shake:0;
  if(rotated)ctx.setTransform(0,s*dpr,-s*dpr,0,(ox+520*s+jitter)*dpr,(oy+jitter)*dpr);else ctx.setTransform(s*dpr,0,0,s*dpr,(ox+jitter)*dpr,(oy+jitter)*dpr);
  if(terrainMap!==run.mapId)makeTerrain(run.mapId);ctx.drawImage(terrain,0,0,900,520);
  ctx.save();ctx.beginPath();ctx.rect(0,0,900,520);ctx.clip();
  for(let i=0;i<PATH.length-1;i++){const a=PATH[i],b=PATH[i+1],t=(time*.28+i*.12)%1;disc(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,2,'#e8ffe267');}
  disc(12,100,21,'#132f3a');ring(12,100,22,'#95e8cf',2);text('IN',13,100,'#adebcb',11);
  disc(875,465,25,'#173c48');ring(875,465,26,run.health<35?'#ff8690':'#a6f3d0',3);text('✚',875,465,'#cbffe6',24);
  text('PATHOPEDIA / '+run.mapId.toUpperCase(),115,25,'#a7d5c66b',9,500);
  const selected=run.towers.find(t=>t.id===selectedTower);
  if(selected&&!ghost){const d=catalog.drugById[selected.drugId];disc(selected.x,selected.y,d.range,d.color+'15');ctx.save();ctx.setLineDash([5,7]);ring(selected.x,selected.y,d.range,d.color+'85',1);ctx.restore();}
  if(ghost){const valid=placementCheck(run,ghost,movingId).ok,d=catalog.drugById[ghost.drugId];if(d){disc(ghost.x,ghost.y,d.range,valid?'#abffc51a':'#ff7b8d1a');ring(ghost.x,ghost.y,d.range,valid?'#b6ffd57a':'#ff82928a',1);drawTower({...ghost,renalAdjusted:true,angle:-Math.PI/2},true,true);text(valid?(movingId?'이동':'배치'):'배치 불가',ghost.x,ghost.y-36,valid?'#d8ffe3':'#ffa4a9',12);}}
  for(const e of run.enemies)drawEnemy(e,run);
  for(const t of run.towers)drawTower(t,t.id===selectedTower);
  for(const p of run.projectiles){const target=run.enemies.find(e=>e.id===p.targetId);if(!target)continue;const angle=Math.atan2(target.y-p.y,target.x-p.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.shadowColor=p.color;ctx.shadowBlur=9;ctx.strokeStyle=p.color;ctx.lineWidth=p.shape==='beam'?3:4;ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(5,0);ctx.stroke();ctx.shadowBlur=0;disc(4,0,3,'#fffce0');if(p.shape==='linked'){disc(-4,5,2,p.color);disc(-9,-5,2,p.color);}ctx.restore();}
  pool.render();ctx.globalAlpha=1;
  for(const p of labels){ctx.save();ctx.globalAlpha=Math.min(1,p.life*3);if(p.type==='ring'){ring(p.x,p.y,22+(1-p.life/.6)*50,p.color,3);}else if(p.type==='link'){ctx.strokeStyle=p.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.toX,p.toY);ctx.stroke();}else{text(p.text,p.x,p.y-20-(1-p.life)*24,p.type==='coin'?'#ffe29c':p.type==='shield'?'#edb8ff':'#f9ffe6',p.type==='coin'?14:11);}ctx.restore();}
  ctx.restore();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(banners.length){const b=banners[0];ctx.save();ctx.globalAlpha=Math.min(1,b.life*2);ctx.fillStyle='#102533dc';ctx.fillRect(0,box.height*.37,box.width,82);ctx.textAlign='center';ctx.fillStyle='#f7ffe8';ctx.font='900 '+Math.min(34,box.width/13)+'px SUIT, sans-serif';ctx.fillText(b.text,box.width/2,box.height*.37+35);ctx.fillStyle='#9cd1bd';ctx.font='600 10px SUIT, sans-serif';ctx.fillText(b.sub,box.width/2,box.height*.37+58);ctx.restore();}
 }
 return{update,draw,worldPoint,attach(next){canvas=next;ctx=canvas.getContext('2d');}};
}
