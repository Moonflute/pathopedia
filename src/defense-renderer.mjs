import {Pool} from './vendor/kontra-10.0.2.mjs';
import {FIELD,stageById} from './defense-engine.mjs';
const TAU=Math.PI*2,INK='#172d3c';
const themes={lung:{sky:'#d8eee2',far:'#b4d8c9',hill:'#7eb9a6',soil:'#315f59',accent:'#b8e1bf'},urinary:{sky:'#dceaf5',far:'#b9d5e9',hill:'#87b6cf',soil:'#34576f',accent:'#b6daef'},abdomen:{sky:'#f2dfd1',far:'#dfbda5',hill:'#bd977f',soil:'#634d4d',accent:'#f0c99d'}};
function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();}
function round(g,x,y,w,h,r,fill,stroke=INK,line=2.5){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.lineWidth=line;g.strokeStyle=stroke;g.stroke();}}
function line(g,points,color,width=3){g.strokeStyle=color;g.lineWidth=width;g.lineCap='round';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
function label(g,value,x,y,color=INK,size=12){g.font='800 '+size+'px SUIT, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;g.fillText(value,x,y);}
function star(g,x,y,r,color){g.fillStyle=color;g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,radius=i%2?r*.45:r;i?g.lineTo(x+Math.cos(a)*radius,y+Math.sin(a)*radius):g.moveTo(x+Math.cos(a)*radius,y+Math.sin(a)*radius);}g.closePath();g.fill();}
export function drawUnit(g,drug,{x=0,y=0,time=0,moving=false,attack=0,facing=-1,exposure=0,scale=1}={}){
 g.save();g.translate(x,y);g.scale(scale,scale);const step=moving?Math.sin(time*13):0,bob=moving?Math.abs(step)*3:Math.sin(time*3)*1.2;
 ellipse(g,0,2,24,5,'#142f3a27');g.translate(attack>0?-facing*3:0,-bob);g.scale(-facing,1);
 line(g,[[-9,-12],[-12+step*6,-3],[-19+step*6,-3]],INK,7);line(g,[[10,-12],[12-step*6,-3],[6-step*6,-3]],INK,7);
 round(g,-23,-61,46,47,18,drug.color);g.save();g.beginPath();g.roundRect(-23,-61,46,47,18);g.clip();g.fillStyle='#fff7df';g.fillRect(-24,-62,48,24);g.restore();
 line(g,[[-21,-37],[21,-37]],INK,2);round(g,-18,-52,36,14,7,'#1d3c4d',null);ellipse(g,-9,-45,3.5,4,'#faffed');ellipse(g,7,-45,3.5,4,'#faffed');
 line(g,[[7,-29],[22,-30],[30,-39]],INK,6);round(g,-39,-37,25,10,3,'#e9f0e5');round(g,-42,-35,9,6,2,drug.color);line(g,[[-41,-32],[-51,-32]],INK,2);
 if(drug.shape==='hex'){round(g,-18,-68,36,8,3,drug.color);line(g,[[0,-68],[0,-78]],INK,3);ellipse(g,0,-80,5,4,drug.color);}
 if(drug.shape==='pulse'){round(g,-26,-60,52,8,3,'#ddd6f1');ellipse(g,0,-63,7,6,drug.color);line(g,[[-3,-63],[3,-63]],'#fff8e1',2);}
 if(drug.shape==='beam'||drug.shape==='scope'){round(g,-10,-70,20,10,4,drug.color);line(g,[[9,-66],[25,-66]],INK,4);}
 if(drug.shape==='diamond'){star(g,0,-66,9,'#fff0cb');}
 if(drug.combo){round(g,17,-64,17,27,8,'#f9efd7');round(g,20,-57,11,14,5,drug.color,null);line(g,[[19,-39],[27,-34],[28,-26]],'#fbebba',3);}
 if(exposure){ellipse(g,20,-73,10,10,'#f6cf75');label(g,'↑',20,-74,INK,16);}
 if(attack>0){star(g,-56,-32,12+attack*28,'#fff7bd');line(g,[[-49,-42],[-55,-48]],'#fffbe6',3);}
 g.restore();
}
export function drawPathogen(g,p,{x=0,y=0,time=0,moving=true,elite=false,flash=0,scale=1}={}){
 g.save();g.translate(x,y);g.scale(scale*(elite?1.35:1),scale*(elite?1.35:1));const wobble=moving?Math.sin(time*9):0;
 ellipse(g,0,1,26,5,'#25334530');g.translate(0,-Math.abs(wobble)*3);const fill=flash>0?'#fff9e4':p.color;
 if(['pseudo','kpc','esbl','esblk','visa','lzdr'].includes(p.id)){
  for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;line(g,[[Math.cos(a)*22,-29+Math.sin(a)*24],[Math.cos(a)*32,-29+Math.sin(a)*34]],INK,4);ellipse(g,Math.cos(a)*32,-29+Math.sin(a)*34,4,4,fill);}
 }
 line(g,[[-12,-12],[-17+wobble*4,-2],[-22+wobble*4,-2]],INK,5);line(g,[[12,-12],[17-wobble*4,-2],[22-wobble*4,-2]],INK,5);
 if(p.group==='그람음성')round(g,-31,-51,62,36,18,fill);else{ellipse(g,0,-35,26,26,fill);g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.ellipse(0,-35,26,26,0,0,TAU);g.stroke();}
 ellipse(g,-10,-43,6,7,'#fffae6');ellipse(g,10,-43,6,7,'#fffae6');ellipse(g,-7,-42,2.5,4,INK);ellipse(g,13,-42,2.5,4,INK);
 line(g,[[-15,-53],[-4,-50]],INK,3);line(g,[[5,-50],[16,-54]],INK,3);line(g,[[-5,-29],[1,-26],[8,-29]],INK,2.5);
 ellipse(g,-18,-30,4,2,'#192b3d30');ellipse(g,18,-30,4,2,'#192b3d30');
 if(['mrsa','visa','lzdr'].includes(p.id)){round(g,-25,-62,50,10,4,'#643855');label(g,p.id==='visa'?'V':p.id==='lzdr'?'L':'R',0,-58,'#fff0d8',9);}
 if(p.id==='kpc'){round(g,-18,-69,36,14,4,'#f1ce8d');label(g,'KPC',0,-62,INK,9);}
 if(elite){star(g,0,-88,12,'#f8d087');}
 g.restore();
}
export function drawDefensePortrait(canvas,catalog,kind,id){
 const g=canvas.getContext('2d');canvas.width=160;canvas.height=132;g.clearRect(0,0,160,132);
 if(kind==='drug')drawUnit(g,catalog.drugById[id],{x:80,y:124,scale:1.6});
 else drawPathogen(g,catalog.pathogenById[id],{x:80,y:124,moving:false,scale:1.55});
}
export function createDefenseRenderer(initialCanvas,catalog,{onSound=()=>{}}={}){
 let canvas=initialCanvas,g=canvas.getContext('2d'),time=0,seen=0,shake=0,ground=325,banner=null,labels=[];
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const particles=Pool({maxSize:320,create:()=>({init(p){Object.assign(this,p);this.life=p.life;this.full=p.life;},isAlive(){return this.life>0;},update(dt){this.life-=dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.vy+=100*dt;},render(){g.globalAlpha=Math.max(0,this.life/this.full);ellipse(g,this.x,ground+this.y,this.size,this.size,this.color);}})});
 function burst(x,color,big=false){for(let i=0;i<(reduced?3:big?28:14);i++){const a=i*2.4;particles.get({x,y:-35,vx:Math.cos(a)*(40+Math.random()*110),vy:Math.sin(a)*100-30,life:.35+Math.random()*.45,size:2+Math.random()*4,color});}}
 function update(dt,run){
  time+=dt;particles.update(dt);shake=Math.max(0,shake-dt*18);labels=labels.filter(t=>(t.life-=dt)>0);if(banner&&(banner.life-=dt)<=0)banner=null;
  for(const e of run.effects){if(e.id<=seen)continue;seen=e.id;
   if(e.kind==='kill'){burst(e.x,e.color,e.big);onSound('pop');if(e.big&&!reduced)shake=3;}
   if(e.kind==='hit'){if(!reduced)burst(e.x,e.color);}
   if(e.kind==='deploy'){burst(e.x,e.color);onSound('deploy');}
   if(e.kind==='shot')onSound('shot');
   if(e.kind==='leak'){if(!reduced)shake=4;onSound('leak');}
   if(e.text){banner={text:e.text,life:1.8};onSound(e.kind==='end'?'clear':'upgrade');}
  }
 }
 function base(run,scale=1){
  const x=FIELD.hostBase-(scale>1?25:0);
  g.save();g.translate(x,ground);g.scale(scale,scale);g.translate(-x,-ground);
  ellipse(g,x,ground+8,64,12,'#18333e35');round(g,x-44,ground-120,88,119,15,'#edf4df');round(g,x-55,ground-129,110,22,7,'#779f9b');
  round(g,x-15,ground-50,30,49,13,'#325968');round(g,x-27,ground-96,54,32,8,'#b3dbd6');line(g,[[x,ground-91],[x,ground-70]],'#2a6264',6);line(g,[[x-11,ground-80],[x+11,ground-80]],'#2a6264',6);
  for(const sx of [-28,28]){ellipse(g,x+sx,ground-33,5,8,'#6ea9a7');}
  line(g,[[x+31,ground-128],[x+31,ground-160]],INK,3);g.fillStyle='#f3d18b';g.beginPath();g.moveTo(x+32,ground-160);g.lineTo(x+62,ground-151);g.lineTo(x+32,ground-144);g.fill();
  round(g,x-55,ground+17,110,23,7,'#f4ecd4');label(g,'HOST  '+Math.ceil(run.health),x,ground+29,INK,12);
  round(g,x-51,ground-145,102,6,3,'#233d44',null);round(g,x-51,ground-145,102*run.health/100,6,3,run.health<30?'#de7e86':'#65bd9e',null);
  g.restore();
  const total=run.cores.reduce((n,c)=>n+c.maxHp,0),hp=run.cores.reduce((n,c)=>n+c.hp,0),left=FIELD.enemyBase+(scale>1?25:0);
  g.save();g.translate(left,ground);g.scale(scale,scale);g.translate(-left,-ground);
  ellipse(g,left,ground+7,68,12,'#26334938');
  g.fillStyle=hp>0?'#a98f9f':'#929a96';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(left-58,ground);g.bezierCurveTo(left-65,ground-34,left-40,ground-38,left-42,ground-67);g.bezierCurveTo(left-42,ground-126,left+24,ground-128,left+40,ground-76);g.bezierCurveTo(left+53,ground-55,left+65,ground-36,left+61,ground);g.closePath();g.fill();g.stroke();
  ellipse(g,left-12,ground-72,12,14,'#f2e8ce');ellipse(g,left+19,ground-72,12,14,'#f2e8ce');ellipse(g,left-7,ground-69,5,8,INK);ellipse(g,left+24,ground-69,5,8,INK);round(g,left-18,ground-43,49,28,13,INK);
  if(!run.sourceControlled){for(let i=0;i<3;i++)line(g,[[left-45+i*35,ground-90],[left-55+i*35,ground-115]],'#efd493',5);label(g,'배액 필요',left,ground-150,'#735d43',12);}
  round(g,left-55,ground+17,110,23,7,'#f4ecd4');label(g,hp>0?'잔존 균량 '+Math.ceil(hp):'군집 제거',left,ground+29,INK,11);
  round(g,left-51,ground-135,102,6,3,'#233d44',null);if(hp>0)round(g,left-51,ground-135,102*hp/total,6,3,'#d58298',null);
  run.cores.forEach((core,i)=>{const p=catalog.pathogenById[core.pathogenId],cx=left-30+i*30;ellipse(g,cx,ground-19,11,11,core.hp>0?p.color:'#64786c');label(g,core.hp>0?p.short:'✓',cx,ground-19,INK,8);});g.restore();
 }
 function draw(run){
  const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
  const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(bounds.width*dpr),h=Math.round(bounds.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const scale=w/FIELD.width,height=h/scale;ground=height*.75;const colors=themes[run.mapId]||themes.lung;
  g.setTransform(scale,0,0,scale,0,0);g.globalAlpha=1;g.fillStyle=colors.sky;g.fillRect(0,0,1000,height);
  // Tissue layers, not a maze: both ends and the whole front stay visible.
  for(let layer=0;layer<2;layer++){g.fillStyle=layer?colors.hill:colors.far;g.beginPath();g.moveTo(0,ground+15);for(let x=0;x<=1050;x+=40)g.lineTo(x,ground-45-layer*9+Math.sin(x*.009+layer*2)*32);g.lineTo(1050,height);g.lineTo(0,height);g.fill();}
  for(let i=0;i<13;i++){const x=(i*101+time*(reduced?0:2))%1100-50,y=20+(i*47%Math.max(50,ground-130));ellipse(g,x,y,23+i%3*10,12,'#ffffff22');}
  g.fillStyle=colors.soil;g.fillRect(0,ground+7,1000,height-ground);g.fillStyle=colors.accent;g.fillRect(0,ground+6,1000,4);
  for(let i=0;i<70;i++){const x=i*79%1000,y=ground+24+(i*53%Math.max(22,height-ground-32));ellipse(g,x,y,2,1,'#fff8d422');}
  line(g,[[150,ground+8],[850,ground+8]],'#f2e4b255',2);
  g.save();if(shake)g.translate(Math.sin(time*71)*shake,Math.cos(time*83)*shake*.5);base(run,bounds.width<600?1.4:1);
  const size=bounds.width<600?1.9:1,textScale=bounds.width<600?1.8:1;
  for(const enemy of [...run.enemies].sort((a,b)=>a.lane-b.lane)){
   const p=catalog.pathogenById[enemy.pathogenId],y=ground+enemy.lane*6;
   drawPathogen(g,p,{x:enemy.x,y,time:time+enemy.id,moving:enemy.x<FIELD.hostBase-18,elite:enemy.elite,flash:enemy.flash,scale:size});
   const top=y-(enemy.elite?105:80)*size;
   round(g,enemy.x-22,top,44,5,2,'#233d44',null);if(enemy.hp>0)round(g,enemy.x-22,top,44*enemy.hp/enemy.maxHp,5,2,p.color,null);
   if(run.enemies.length<18||enemy.elite){g.fillStyle='#f7f0d9e6';g.fillRect(enemy.x-24*textScale,top-17*textScale,48*textScale,13*textScale);label(g,enemy.elite?p.short+' ★':p.short,enemy.x,top-10*textScale,INK,10*textScale);}
  }
  for(const unit of [...run.units].sort((a,b)=>a.lane-b.lane)){
   const drug=catalog.drugById[unit.drugId];drawUnit(g,drug,{...unit,y:ground+unit.lane*7+5,time:time+unit.id,scale:size});
   g.globalAlpha=unit.life<4?.45+.4*Math.sin(time*9):1;label(g,drug.short,unit.x,ground+21+unit.lane*4,'#f5efd6',10*textScale);g.globalAlpha=1;
   if(unit.life<8){round(g,unit.x-15,ground+28,30*unit.life/8,3,1,drug.color,null);}
  }
  for(const p of run.projectiles){const target=run.enemies.find(e=>e.id===p.targetId)||run.cores.find(c=>c.id===p.targetId),dir=target&&target.x>p.x?1:-1;line(g,[[p.x-dir*20,ground-34],[p.x,ground-34]],p.color,4);ellipse(g,p.x,ground-34,5,3,'#fff8d7');}
  particles.render();g.globalAlpha=1;g.restore();
  if(banner){g.globalAlpha=Math.min(1,banner.life*3);const width=Math.max(185,banner.text.length*14+40);round(g,500-width/2,Math.max(20,ground*.18),width,39,10,'#203a47ed','#f1dfae',1.5);label(g,banner.text,500,Math.max(20,ground*.18)+20,'#fff0cb',17);g.globalAlpha=1;}
  if(run.status==='paused'){g.fillStyle='#12283377';g.fillRect(0,0,1000,height);label(g,'일시정지',500,height/2,'#fff1d2',32);}
 }
 return {attach(next){canvas=next;g=canvas.getContext('2d');},update,draw};
}
