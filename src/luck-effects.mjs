// Procedural Canvas effects reuse the existing transparent card artwork.
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n));
export function drawLuckEffects(ctx,run,unitImage,reduced=false){
 const dot=(x,y,r,color)=>{ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.fillStyle=color;ctx.fill();};
 const line=(x,y,tx,ty,color,width=2)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 const ring=(x,y,r,color,width=2)=>{ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 const star=(x,y,r,color,rotation=0)=>{
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<8;i++){const a=i*Math.PI/4,s=i%2?r*.24:r;ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);}ctx.closePath();ctx.fill();ctx.restore();
 };
 const sprite=(id,x,y,scale=1,alpha=1)=>{
  ctx.save();ctx.globalAlpha*=alpha;const img=unitImage(run.mode,id),size=57*scale;
  if(img?.complete&&img.naturalWidth)ctx.drawImage(img,x-size/2,y-size/2-9,size,size);
  else{dot(x,y-9,14*scale,'#cbdcf4');star(x,y-9,8*scale,'#fff');}
  ctx.restore();
 };
 for(const f of run.effects){
  const age=f.age-(f.delay||0);if(age<0)continue;
  const p=clamp(age/f.life),r=f.radius||40,c=f.color;ctx.save();ctx.globalAlpha=1-p;ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineCap='round';
  if(reduced){ring(f.tx??f.x,f.ty??f.y,10,c,1.5);ctx.restore();continue;}
  if(f.type==='projectile'){
   const t=clamp(p*1.15),dx=f.tx-f.x,dy=f.ty-f.y,length=Math.max(1,Math.hypot(dx,dy)),bend=(f.spread||0)*Math.sin(Math.PI*t);
   const arc=['shell','glob','spore','flower'].includes(f.kind)?Math.sin(Math.PI*t)*-35:0;
   const x=f.x+dx*t-dy/length*bend,y=f.y+dy*t+dx/length*bend+arc;
   const angle=Math.atan2(dy,dx),size=f.radius||5;
   if(['missile','meteor','serpent'].includes(f.kind)){
    for(let i=4;i>0;i--){const back=Math.max(0,t-i*.045);ctx.globalAlpha=(1-p)*(1-i*.16);dot(f.x+dx*back-dy/length*bend,f.y+dy*back+dx/length*bend,size*(1-i*.12),c);}
    ctx.globalAlpha=1-p;
   }
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);
   if(['dart','needle','lance','missile','meteor'].includes(f.kind)){
    const len=f.kind==='lance'?27:f.kind==='meteor'?17:f.kind==='needle'?14:10;
    line(-len,0,2,0,c,f.kind==='needle'?2:4);
    ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-3,-size);ctx.lineTo(-3,size);ctx.closePath();ctx.fill();
    if(f.kind==='meteor')dot(-4,0,7,'#fff3bb');
   }else if(f.kind==='ice'){
    ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(0,-5);ctx.lineTo(-8,0);ctx.lineTo(0,5);ctx.closePath();ctx.fill();line(-5,0,6,0,'#fff',1);
   }else if(f.kind==='hammer'){
    ctx.rotate(p*3);ctx.fillRect(-2,-4,4,16);ctx.fillRect(-10,-9,20,8);ctx.strokeStyle='#fff4';ctx.strokeRect(-10,-9,20,8);
   }else if(f.kind==='ram'){
    ctx.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6;ctx.lineTo(Math.cos(a)*11,Math.sin(a)*11);}ctx.closePath();ctx.fill();ring(0,0,15,c);
   }else if(f.kind==='note'){
    ring(0,0,6,c,2);ring(-6,0,11,c,1);dot(0,0,2,'#fff');
   }else if(['spore','seed','flower','serpent'].includes(f.kind)){
    dot(0,0,5,c);
    for(let i=0;i<(f.kind==='flower'?6:3);i++){const a=i*TAU/(f.kind==='flower'?6:3)+p*3;dot(Math.cos(a)*7,Math.sin(a)*7,2.5,c);}
    if(f.kind==='serpent'){dot(4,-2,1.3,'#fff');dot(4,2,1.3,'#fff');}
   }else{
    dot(0,0,size+1,c);dot(-2,-2,size*.4,'#fff9');
    if(f.kind==='glob')for(let i=0;i<3;i++)dot(-7-i*4,Math.sin(i+p*7)*4,3-i*.6,c);
   }
   ctx.restore();
  }else if(f.type==='beam'){
   line(f.x,f.y,f.tx,f.ty,c,10*(1-p));line(f.x,f.y,f.tx,f.ty,'#fff',2.5*(1-p));star(f.tx,f.ty,14*(1-p),c);
  }else if(['chain','storm'].includes(f.type)){
   ctx.beginPath();ctx.moveTo(f.x,f.y);
   for(let i=1;i<8;i++){const t=i/8,offset=Math.sin(i*7+(f.seed||0))*9;ctx.lineTo(f.x+(f.tx-f.x)*t+offset,f.y+(f.ty-f.y)*t-offset);}
   ctx.lineTo(f.tx,f.ty);ctx.lineWidth=f.type==='storm'?3.5:2;ctx.stroke();
   if(f.type==='storm'){line(f.x,f.y,f.tx,f.ty,'#fff8',1);star(f.tx,f.ty,10,c,p*3);}
  }else if(f.type==='infection'){
   const x=f.x+(f.tx-f.x)*p,y=f.y+(f.ty-f.y)*p;line(f.x,f.y,f.tx,f.ty,c,1.3);ring(x,y,8,c,2);dot(x,y,3,c);
  }else if(f.type==='vine'){
   ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.bezierCurveTo(f.x+40,f.y-55,f.tx-50,f.ty+40,f.tx,f.ty);ctx.lineWidth=3;ctx.stroke();
   ring(f.tx,f.ty,14,c,2);for(let i=0;i<4;i++){const a=i*TAU/4+p;star(f.tx+Math.cos(a)*15,f.ty+Math.sin(a)*15,4,c,a);}
  }else if(f.type==='slash'){
   ctx.translate(f.x,f.y);ctx.rotate(f.flip?-.7:.7);ctx.lineWidth=5*(1-p);
   for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(i*6-6,0,r-i*3,Math.PI*.85,Math.PI*1.85);ctx.stroke();}
  }else if(['ring','aura','shockwave','sprout','snow'].includes(f.type)){
   const radius=r*(.1+p*.9);ring(f.x,f.y,radius,c,f.type==='shockwave'?7*(1-p):2);
   if(['aura','shockwave'].includes(f.type))ring(f.x,f.y,radius*.78,c,1);
   if(f.type==='sprout'||f.type==='snow')for(let i=0;i<10;i++){const a=i*TAU/10;star(f.x+Math.cos(a)*radius,f.y+Math.sin(a)*radius,4,c,a);}
  }else if(f.type==='pop'||f.type==='spark'){
   for(let i=0;i<6;i++){const a=i*TAU/6;star(f.x+Math.cos(a)*r*p,f.y+Math.sin(a)*r*p,4*(1-p),c,a);}
  }else if(f.type==='splat'){
   for(let i=0;i<6;i++){const a=i*TAU/6;dot(f.x+Math.cos(a)*r*p*.65,f.y+Math.sin(a)*r*p*.65,r*.22*(1-p),c);}
  }else if(f.type==='frost'){
   for(let i=0;i<6;i++){const a=i*TAU/6,tx=f.x+Math.cos(a)*r*p,ty=f.y+Math.sin(a)*r*p;line(f.x,f.y,tx,ty,c,2);star(tx,ty,4,c,a);}
  }else if(f.type==='blossom'){
   for(let i=0;i<7;i++){const a=i*TAU/7;ctx.save();ctx.translate(f.x+Math.cos(a)*r*p*.55,f.y+Math.sin(a)*r*p*.55);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,r*.35*p,r*.13*p,0,0,TAU);ctx.stroke();ctx.restore();}
   star(f.x,f.y,20*(1-p),'#ffe0f5',p);
  }else if(f.type==='shatter'){
   ring(f.x,f.y,r*p,c,2);
   for(let i=0;i<14;i++){const a=i*TAU/14;star(f.x+Math.cos(a)*r*p,f.y+Math.sin(a)*r*p,7*(1-p),c,a);}
  }else if(['blast','slam','crater'].includes(f.type)){
   ctx.globalAlpha=(1-p)*.25;dot(f.x,f.y,r*(.2+p*.6),c);ctx.globalAlpha=1-p;
   ring(f.x,f.y,r*p,c,f.type==='crater'?6:3);
   for(let i=0;i<8;i++){const a=i*TAU/8;line(f.x+Math.cos(a)*r*p*.6,f.y+Math.sin(a)*r*p*.6,f.x+Math.cos(a)*r*p,f.y+Math.sin(a)*r*p,c,2);}
  }
  ctx.restore();
 }
 // Merge chains are scheduled per piece, so a ten-draw never flashes all stages at once.
 for(const f of run.fusions){
  const t=run.totalTime,elapsed=t-f.start,c=f.star>=3?'#ffe29c':f.color,arrival=.4;
  ctx.save();
  if(elapsed<0){
   if(t>=f.aReady)sprite(f.id,f.from.x,f.from.y,1,.9);
   if(t>=f.bReady)sprite(f.id,f.to.x,f.to.y,1,.9);
   ctx.restore();continue;
  }
  if(elapsed<arrival&&!reduced){
   const p=clamp(elapsed/arrival),ease=p*p*(3-2*p),x=f.from.x+(f.to.x-f.from.x)*ease,y=f.from.y+(f.to.y-f.from.y)*ease-Math.sin(p*Math.PI)*26;
   ctx.globalAlpha=.45;line(f.from.x,f.from.y-8,x,y-8,c,2);ctx.globalAlpha=1;
   sprite(f.id,x,y,1-p*.25);sprite(f.id,f.to.x,f.to.y-Math.sin(p*Math.PI)*9,1-p*.15);
   ring(f.to.x,f.to.y-8,36-20*p,c,1.5);
  }else{
   const p=clamp((elapsed-arrival)/Math.max(.1,f.end-f.start-arrival));
   sprite(f.id,f.to.x,f.to.y,reduced?1:1+Math.sin(p*Math.PI)*.2);
   if(!reduced){
    const fancy=f.star>=3,count=fancy?18:7,size=fancy?115:64;
    ctx.globalAlpha=(1-p)*.85;ring(f.to.x,f.to.y-8,size*p,c,fancy?4:2);
    if(fancy){ring(f.to.x,f.to.y-8,size*p*.7,'#f4d0ff',2);ring(f.to.x,f.to.y-8,size*p*.45,'#fff',1);}
    for(let i=0;i<count;i++){const a=i*TAU/count,power=(i%3+3)/5;star(f.to.x+Math.cos(a)*size*p*power,f.to.y-8+Math.sin(a)*size*p*power,(fancy?7:4)*(1-p),i%2?c:'#fff',a+p);}
   }
   ctx.globalAlpha=1;ctx.fillStyle=c;ctx.textAlign='center';ctx.font=(f.star>=3?'800 15px':'700 11px')+' SUIT, sans-serif';
   ctx.fillText('★'.repeat(f.star),f.to.x,f.to.y-47);
  }
  ctx.restore();
 }
 return{sprite};
}
