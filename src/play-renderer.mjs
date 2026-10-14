import {castRay,protectedBySource,visibleLabel} from './play-engine.mjs';

const SIZE=64;
const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const shade=(color,k)=>'rgb('+rgb(color).map(v=>Math.min(255,Math.round(v*k))).join(',')+')';
function blob(ctx,x,y,rx,ry,color){
  for(let j=-ry;j<=ry;j+=2)for(let i=-rx;i<=rx;i+=2){const r=i*i/(rx*rx)+j*j/(ry*ry);if(r>1)continue;
    const light=.45+.5*Math.sqrt(1-r)+.18*(-i/rx-j/ry);ctx.fillStyle=shade(color,light);ctx.fillRect(x+i|0,y+j|0,2,2);}
}
function createSprites(catalog){
  const atlas=surface(SIZE*4,SIZE*(catalog.enemies.length+6)),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
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
    if(p.shape==='worm'){for(let n=0;n<21;n++){const y=9+n*2.2,x=32+Math.sin(n*.25+f*.7)*13;blob(ctx,x,y,n===0||n===20?3:5,4,p.color);}ctx.fillStyle='#8c694d';for(let n=3;n<18;n+=3)ctx.fillRect(31+Math.sin(n*.25+f*.7)*13,9+n*2.2,2,2);}
    ctx.restore();
  }});
  const base=catalog.enemies.length;
  for(let f=0;f<4;f++){
    const x=f*SIZE;
    ctx.fillStyle='#101c23';ctx.fillRect(x+11,base*SIZE+15,43,45);ctx.fillStyle='#43786f';ctx.fillRect(x+15,base*SIZE+12,35,38);ctx.fillStyle='#95d7b7';ctx.fillRect(x+19,base*SIZE+16,27,21);ctx.fillStyle='#1e483d';ctx.fillRect(x+22,base*SIZE+19,21,15);ctx.fillStyle='#94edbc';ctx.fillRect(x+25,base*SIZE+24,15,3);ctx.fillRect(x+31,base*SIZE+19,3,15);ctx.fillStyle=f%2?'#ffbf76':'#bfdf9a';ctx.fillRect(x+20,base*SIZE+42,5,3);ctx.fillRect(x+35,base*SIZE+42,10,3);
    for(let k=1;k<=3;k++){const y=(base+k)*SIZE,color=['','#da9986','#d9bd75','#91bdcf'][k];ctx.fillStyle='#0005';ctx.fillRect(x+19,y+53,27,4);ctx.fillStyle='#172b30';ctx.fillRect(x+19,y+26-f%2*2,27,23);ctx.fillStyle=color;ctx.fillRect(x+21,y+25-f%2*2,23,20);ctx.fillStyle='#e6efdd';ctx.fillRect(x+25,y+32,15,4);if(k===1)ctx.fillRect(x+31,y+27,4,15);if(k===3){ctx.fillRect(x+27,y+23,10,3);ctx.fillRect(x+26,y+38,13,2);}}
  }
  for(let state=0;state<2;state++)for(let f=0;f<4;f++){
    const x=f*SIZE,y=(base+4+state)*SIZE,color=state?'#a5efb8':'#e1ac78';
    ctx.fillStyle='#102629';ctx.fillRect(x+7,y+4,50,60);ctx.fillStyle='#405e58';ctx.fillRect(x+10,y+7,44,57);ctx.fillStyle=state?'#143e35':'#302f30';ctx.fillRect(x+16,y+16,32,48);
    ctx.fillStyle=color;ctx.fillRect(x+11,y+9,4,53);ctx.fillRect(x+49,y+9,4,53);ctx.fillRect(x+15,y+9,34,4);ctx.fillStyle='#ededd5';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('EXIT',x+32,y+24);ctx.textAlign='left';
    if(state){ctx.fillStyle=color;ctx.fillRect(x+26,y+34,13,4);ctx.fillRect(x+34,y+30,4,12);ctx.fillRect(x+38,y+33,4,6);}else{ctx.fillStyle=color;for(let k=0;k<4;k++)ctx.fillRect(x+18+k*7,y+35+k*4,6,7);}
  }
  return atlas;
}
function createWalls(accent='#a9c4a1'){
  const atlas=surface(32*3,32),c=atlas.getContext('2d');
  for(let i=0;i<3;i++){const x=i*32;c.fillStyle=['#61736a','#596c67','#556366'][i];c.fillRect(x,0,32,32);c.fillStyle='#253c38';c.fillRect(x,0,1,32);c.fillRect(x,31,32,1);c.fillStyle='#91a395';c.fillRect(x+1,1,30,1);c.fillRect(x+1,1,1,29);c.fillStyle='#263d39';c.fillRect(x,20,32,4);c.fillStyle=[accent,'#88bfb4',accent][i];c.fillRect(x+1,20,31,2);
    c.fillStyle='#364a42';for(const y of [5,27])for(const n of [4,28])c.fillRect(x+n,y,2,2);
    if(i===1){c.fillStyle='#263d38';c.fillRect(x+6,5,20,11);c.fillStyle='#6daea0';c.fillRect(x+8,7,16,7);c.fillStyle='#a3d9bf';c.fillRect(x+9,8,13,1);}
    if(i===2){c.fillStyle='#a5b8a4';c.fillRect(x+10,5,12,12);c.fillStyle='#405f50';c.fillRect(x+14,7,4,8);c.fillRect(x+12,9,8,4);}
  }return atlas;
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
    if(disposed)return;if(mapId!==run.map.id){walls.width=1;walls.height=1;walls=createWalls(run.map.color);mapId=run.map.id;tone=rgb(run.map.color);}const ctx=context,p=run.player,cos=Math.cos(p.angle),sin=Math.sin(p.angle),fov=run.scoped?.34:.72,planeX=-sin*fov,planeY=cos*fov,projection=width/(2*fov),horizon=Math.floor(height*.46+(reducedMotion?0:run.land*15)),cameraZ=.5+(p.z||0);
    // Reused pixel buffer. Render at fixed resolution, independent of devicePixelRatio.
    for(let y=0;y<height;y+=2){const floor=y>=horizon,distance=projection*(floor?cameraZ:1-cameraZ)/Math.max(1,Math.abs(y-horizon)),stepX=distance*planeX*2/width,stepY=distance*planeY*2/width;
      let worldX=p.x+distance*(cos-planeX),worldY=p.y+distance*(sin-planeY);
      for(let x=0;x<width;x+=2){let r,g,b;if(floor){const grid=(worldX%1+1)%1<.045||(worldY%1+1)%1<.045,check=(Math.floor(worldX)+Math.floor(worldY))&1,k=Math.max(.3,1-distance*.034);
        r=((grid?17:check?42:47)+tone[0]*.025)*k;g=((grid?35:check?57:64)+tone[1]*.025)*k;b=((grid?33:check?55:60)+tone[2]*.025)*k;
        if((Math.floor(worldX)===9||Math.floor(worldX)===18)&&((worldY%1+1)%1<.2)){r=69*k;g=111*k;b=93*k;}
      }else{const k=y/height;r=17+k*10;g=29+k*14;b=32+k*12;}
      const color=(255<<24)|((b|0)<<16)|((g|0)<<8)|(r|0),index=y*width+x;floorPixels[index]=color;floorPixels[index+1]=color;if(y+1<height){floorPixels[index+width]=color;floorPixels[index+width+1]=color;}worldX+=stepX*2;worldY+=stepY*2;
      }
    }
    ctx.putImageData(frame,0,0);
    for(let x=0;x<width;x+=2){const cameraX=2*x/width-1,ray=castRay(run.map,p.x,p.y,cos+planeX*cameraX,sin+planeY*cameraX),distance=Math.max(.05,ray.distance),h=projection/distance,top=horizon-h*(1-cameraZ),texture=(Math.max(1,ray.tile)-1)*32+(ray.u*32|0);
      depth[x]=distance;depth[x+1]=distance;ctx.drawImage(walls,texture,0,1,32,x,top,2,h);ctx.fillStyle='rgba(5,19,23,'+Math.min(.88,distance*.039+(ray.side?.15:0))+')';ctx.fillRect(x,top,2,h);
    }
    const project=(obj,row,size=1,z=.5,kind='enemy')=>{const dx=obj.x-p.x,dy=obj.y-p.y,d=dx*cos+dy*sin,lateral=-dx*sin+dy*cos;if(d<.18||d>27)return;const screen=width/2+lateral*projection/d,h=projection*size/d;if(screen+h/2<0||screen-h/2>width)return;visible.push({obj,row,d,screen,h,z,kind});};
    visible.length=0;
    for(const e of run.enemies)if(e.active)project(e,catalog.enemies.findIndex(p=>p.id===e.kind),e.state==='Dormant'?.46:e.boss?1.5:e.elite?1.1:.9,.5);
    for(const s of run.map.sources)if(s.active)project(s,catalog.enemies.length,1,.5,'source');
    for(const s of run.map.pickups)if(s.active)project(s,catalog.enemies.length+({health:1,supply:2,culture:3}[s.kind]),.6,.3,'pickup');
    project(run.map.exit,catalog.enemies.length+(run.exitOpen?5:4),1.2,.6,'exit');
    visible.sort((a,b)=>b.d-a.d);
    for(const v of visible){const {obj,d,screen,h,kind}=v,dead=kind==='enemy'&&obj.state==='Dead',squash=dead?Math.max(.08,obj.death/.45):1,top=horizon+projection*cameraZ/d-h*squash-(reducedMotion?0:Math.sin(run.time*5+(obj.id||0))*2),left=screen-h/2,frameIndex=kind==='enemy'&&obj.state==='Attack'?3:Math.floor(run.time*6+(obj.id||0))%3;
      const x0=Math.max(0,Math.floor(left)),x1=Math.min(width,Math.ceil(left+h));
      ctx.globalAlpha=dead?squash:Math.max(.4,1-d*.019);
      for(let x=x0;x<x1;x+=2){if(d>=depth[x])continue;const u=Math.min(63,Math.max(0,Math.floor((x-left)/h*64)));ctx.drawImage(sprites,frameIndex*64+u,v.row*64,1,64,x,top,2,h*squash);}
      ctx.globalAlpha=1;
      if(kind==='enemy'&&!dead&&d<depth[Math.max(0,Math.min(width-1,screen|0))]){
        if(obj.cell>0){ctx.strokeStyle='#91b8e899';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(screen,top+h*.5,h*.48,h*.52,0,0,Math.PI*2);ctx.stroke();}if(obj.state==='Dormant'){ctx.fillStyle='#ead4a5';ctx.fillRect(screen-h*.14,top+h*.4,h*.28,h*.2);}if(obj.state==='Detect'||obj.telegraph>0){ctx.fillStyle=obj.telegraph>0?'#f49c76':'#f1d798';ctx.font='bold 13px monospace';ctx.fillText('!',screen-4,top-9);}if(obj.shield>0||protectedBySource(run,obj)){ctx.strokeStyle=obj.shield>0?'#cfe8a78a':'#6ae6c898';ctx.lineWidth=2;ctx.strokeRect(screen-h*.42,top+h*.07,h*.84,h*.82);}
        const profile=catalog.enemyById[obj.kind],level=run.intel[obj.kind],name=level<2?visibleLabel(run,obj):profile.short+(level>=3&&profile.resistant?' / '+profile.trait:'');
        const label=(obj.boss?'BOSS · ':'')+name,barWidth=Math.max(38,Math.min(72,h)),labelY=Math.max(20,top+h*({rod:.26,diplo:.18,cluster:.07,worm:.03,virus:0}[profile.shape]||0)-12),fontSize=d<9?11:10;
        ctx.font='bold '+fontSize+'px monospace';ctx.textAlign='center';const nameWidth=Math.min(width-12,ctx.measureText(label).width+10),labelX=Math.max(nameWidth/2+3,Math.min(width-nameWidth/2-3,screen));
        ctx.fillStyle='#09171ce8';ctx.fillRect(labelX-nameWidth/2,labelY-13,nameWidth,16);ctx.fillStyle=obj.boss?'#ffe3a0':'#f1efe7';ctx.fillText(label,labelX,labelY,nameWidth-8);
        ctx.fillStyle='#0a171e';ctx.fillRect(labelX-barWidth/2-1,labelY+5,barWidth+2,6);ctx.fillStyle='#4b2c40';ctx.fillRect(labelX-barWidth/2,labelY+6,barWidth,4);ctx.fillStyle=obj.boss?'#ebb579':'#cc868e';ctx.fillRect(labelX-barWidth/2,labelY+6,barWidth*Math.max(0,obj.hp/obj.maxHp),4);ctx.textAlign='left';
        if(obj.flash>0){ctx.fillStyle='#f7ffe647';ctx.fillRect(screen-h*.25,top+h*.2,h*.5,h*.5);}
      }
    }
    function dot(x,y,z,color,radius){const dx=x-p.x,dy=y-p.y,d=dx*cos+dy*sin;if(d<.2)return;const sx=width/2+(-dx*sin+dy*cos)*projection/d;if(sx<0||sx>=width||d>=depth[sx|0])return;const sy=horizon+(cameraZ-z)*projection/d,r=Math.max(1,projection*radius/d);ctx.fillStyle=color;ctx.fillRect(sx-r,sy-r,r*2,r*2);}
    for(const h of run.hazards)if(h.active){for(let i=0;i<8;i++){const a=i*Math.PI/4;dot(h.x+Math.cos(a)*h.radius,h.y+Math.sin(a)*h.radius,.04,'#cc9b6380',.08);}dot(h.x,h.y,.1,'#dab06b',.13);}
    for(const b of run.projectiles)if(b.active)dot(b.x,b.y,.5,b.color||'#efac7e',.075);
    for(const b of run.particles)if(b.life>0){dot(b.x,b.y,b.z,b.color,b.ricochet?.018:.025);if(b.ricochet){for(let n=1;n<=3;n++)dot(b.x-b.vx*n*.012,b.y-b.vy*n*.012,b.z-b.vz*n*.012,b.color,.012);}}
    // Both hands, muzzle and receiver share the same perspective and recoil pivot.
    if(!run.scoped){
      const bob=reducedMotion?0:Math.sin(run.walk)*2,kick=run.lastShot>0?Math.floor(run.lastShot*38):0,weaponW=width*.46,weaponH=weaponW*.75;
      const progress=run.reloadTime>0?1-run.reloadTime/run.reloadDuration:0,reloadStep=run.reloadTime>0?Math.floor(Math.sin(progress*Math.PI)*6)/6:0;
      const left=width*.525+bob,bottom=height+14+kick+run.switchTime*160+reloadStep*weaponH*.38;
      ctx.save();ctx.translate(left+weaponW*.7,bottom);ctx.rotate(reloadStep*.38);ctx.drawImage(weapons,(run.scannerActive?catalog.weapons.length:run.weapon)*240,0,240,180,-weaponW*.7,-weaponH,weaponW,weaponH);
      if(run.reloadTime>0&&progress>.22&&progress<.8){ctx.fillStyle='#436a5c';const y=-weaponH*.22+reloadStep*weaponH*.14;ctx.fillRect(-weaponW*.28,y,weaponW*.13,weaponH*.28);ctx.fillStyle=catalog.weapons[run.weapon].color;ctx.fillRect(-weaponW*.27,y+4,weaponW*.1,4);}
      if(run.lastShot>.09&&!run.scannerActive&&run.reloadTime<=0){const x=-weaponW*.59,y=-weaponH*.87;ctx.fillStyle=catalog.weapons[run.weapon].color;ctx.fillRect(x-8,y-3,20,6);ctx.fillRect(x-2,y-10,6,19);ctx.fillStyle='#faffdb';ctx.fillRect(x-3,y-3,6,6);}ctx.restore();
    }else{
      const sw=Math.min(width*.65,height*1.35),sh=Math.min(height*.66,sw*.65),sx=(width-sw)/2,sy=horizon-sh/2;
      ctx.fillStyle='#031611aa';ctx.fillRect(0,0,sx,height);ctx.fillRect(sx+sw,0,width-sx-sw,height);
      ctx.strokeStyle='#91d8c3';ctx.lineWidth=2;ctx.strokeRect(sx,sy,sw,sh);ctx.fillStyle='#aee7c9';ctx.font='10px monospace';ctx.fillText('SCANNER / 2x',sx+8,sy+16);
      ctx.fillStyle='#24473b';ctx.fillRect(sx+8,sy+sh-12,sw-16,3);ctx.fillStyle='#cde6a5';ctx.fillRect(sx+8,sy+sh-12,(sw-16)*run.scanFocus,3);
    }
    // Center aim and hit confirmation stay sharp at every display size.
    const cx=width/2,cy=horizon;ctx.strokeStyle=run.ricochet>0?'#ffcb7c':run.hit>0?'#d8f3ac':'#d9e9dc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx-3,cy);ctx.moveTo(cx+3,cy);ctx.lineTo(cx+7,cy);ctx.moveTo(cx,cy-7);ctx.lineTo(cx,cy-3);ctx.moveTo(cx,cy+3);ctx.lineTo(cx,cy+7);ctx.stroke();
    if(run.hit>0){ctx.beginPath();for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.moveTo(cx+a*9,cy+b*9);ctx.lineTo(cx+a*13,cy+b*13);}ctx.stroke();}
    if(run.scanPulse>0){ctx.strokeStyle='#9ae0c088';ctx.strokeRect(cx-90*(1-run.scanPulse),cy-55*(1-run.scanPulse),180*(1-run.scanPulse),110*(1-run.scanPulse));}
    if(run.hurt>0){ctx.fillStyle='rgba(196,62,48,'+run.hurt*.7+')';ctx.fillRect(0,0,width,height);}
    // The mini-map is also rendered into the fixed-size canvas; no extra DOM work per frame.
    const scale=Math.min(2.2,width*.2/run.map.width),mx=width-run.map.width*scale-10,my=28,known=(x,y)=>run.mapMode==='full'||run.discovered[Math.floor(y)*run.map.width+Math.floor(x)];
    ctx.fillStyle='#0a191ddd';ctx.fillRect(mx-4,my-4,run.map.width*scale+8,run.map.height*scale+19);
    for(let y=0;y<run.map.height;y++)for(let x=0;x<run.map.width;x++){if(!known(x,y))continue;ctx.fillStyle=run.map.cells[y*run.map.width+x]?'#779184':'#253e35';ctx.fillRect(mx+x*scale,my+y*scale,scale,scale);}
    for(const s of run.map.sources)if(known(s.x,s.y)){ctx.fillStyle=s.active?'#b3eace':'#52645d';ctx.fillRect(mx+s.x*scale-2,my+s.y*scale-2,4,4);}
    for(const e of run.enemies)if(e.active&&e.state!=='Dead'&&e.revealed&&known(e.x,e.y)){ctx.fillStyle=e.boss?'#ffd394':'#e6a597';ctx.fillRect(mx+e.x*scale-1,my+e.y*scale-1,2,2);}
    if(known(run.map.exit.x,run.map.exit.y)){ctx.fillStyle=run.exitOpen?'#b9f7a1':'#e0ac7e';ctx.fillRect(mx+run.map.exit.x*scale-2,my+run.map.exit.y*scale-2,4,4);}
    ctx.fillStyle='#f2f6df';ctx.beginPath();ctx.moveTo(mx+p.x*scale+cos*4,my+p.y*scale+sin*4);ctx.lineTo(mx+p.x*scale-sin*2-cos*2,my+p.y*scale+cos*2-sin*2);ctx.lineTo(mx+p.x*scale+sin*2-cos*2,my+p.y*scale-cos*2-sin*2);ctx.fill();
    ctx.font='9px monospace';ctx.fillStyle='#bad3bb';ctx.fillText(width<320?(run.mapMode==='full'?'FULL':'FOG'):(run.mapMode==='full'?'MAP / FULL':'MAP / EXPLORE'),mx,my+run.map.height*scale+12);

  }
  return {render,resize,dispose(){disposed=true;for(const c of [sprites,walls,weapons,canvas]){c.width=1;c.height=1;}frame=null;floorPixels=null;depth=null;visible.length=0;}};
}
