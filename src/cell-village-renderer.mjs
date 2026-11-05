import {TILE,COLS,ROWS,SITES,POINTS,HAIR,SKIN,TREES,BENCHES,villageClock} from './cell-village-world.mjs';

const W=COLS*TILE,H=ROWS*TILE;
const noise=(x,y)=>((x*374761393+y*668265263)>>>0)%101;
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
function building(c,s){
  const x=s.x*TILE,y=s.y*TILE,w=s.w*TILE,h=s.h*TILE;
  rect(c,'#48684d35',x+5,y+15,w+4,h-10);
  rect(c,'#665c50',x,y+26,w,h-26);rect(c,'#e7d2a6',x+3,y+28,w-6,h-32);
  rect(c,'#c2b08c',x+3,y+h-12,w-6,8);rect(c,'#f4dfb5',x+4,y+31,w-8,3);
  for(let px=x+5;px<x+w-6;px+=17){rect(c,'#c8b78e',px,y+h-9,9,1);}
  for(const wx of [x+11,x+w-27]){
    rect(c,'#6c756d',wx-2,y+43,19,19);rect(c,'#9ec0b1',wx,y+45,15,13);
    rect(c,'#f5e6ba',wx+6,y+45,2,14);rect(c,'#f5e6ba',wx,y+51,15,2);rect(c,'#887153',wx-3,y+61,21,3);
    rect(c,'#718450',wx-2,y+63,18,4);rect(c,s.accent,wx+1,y+61,3,3);rect(c,s.accent,wx+10,y+62,3,3);
  }
  rect(c,'#66513e',x+w/2-9,y+h-25,18,25);rect(c,'#9a7551',x+w/2-6,y+h-22,12,22);rect(c,'#f3d694',x+w/2+3,y+h-12,2,2);
  rect(c,'#c8b58d',x+w/2-13,y+h,26,4);rect(c,'#e9d5ac',x+w/2-16,y+h+4,32,4);
  rect(c,'#614d48',x-4,y+29,w+8,5);rect(c,s.roof,x-3,y+4,w+6,26);
  rect(c,s.roof,x+4,y,w-8,5);rect(c,'#ffffff25',x+4,y,w-8,3);
  for(let ry=8;ry<28;ry+=6){rect(c,'#462f3627',x-2,y+ry,w+4,1);for(let rx=ry%12;rx<w;rx+=12)rect(c,'#462f3620',x+rx,y+ry,1,5);}
  rect(c,'#765c4b',x+w-20,y-7,9,17);rect(c,'#b4a082',x+w-22,y-9,13,4);
  rect(c,'#685650',x+w/2-13,y+17,26,21);rect(c,'#f4e5bf',x+w/2-11,y+19,22,17);symbol(c,s.symbol,x+w/2,y+27,s.roof);
}
export function createVillageRenderer(canvas){
  const ctx=canvas.getContext('2d',{alpha:false}),base=document.createElement('canvas'),bc=base.getContext('2d');
  base.width=W;base.height=H;
  const sheet=new Image();let ready=false,disposed=false,width=1,height=1,ratio=1,zoom=1,cam={x:W/2,y:H/2},viewMode='watch';
  const tiles=(c,tx,ty,x,y,w=16,h=16)=>{if(ready)c.drawImage(sheet,tx*16,ty*16,w,h,Math.round(x),Math.round(y),w,h);};
  function background(){
    bc.imageSmoothingEnabled=false;rect(bc,'#88a86d',0,0,W,H);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      if(ready)tiles(bc,0,0,x*16,y*16);
      else {rect(bc,noise(x,y)<50?'#89aa6b':'#8cad70',x*16,y*16,16,16);rect(bc,'#a4bd7b',x*16+3,y*16+6,2,1);}
    }
    const road=(x,y,w,h)=>{rect(bc,'#b99e71',x-2,y-2,w+4,h+4);rect(bc,'#d9bd8a',x,y,w,h);for(let py=y+3;py<y+h;py+=8)for(let px=x+4;px<x+w;px+=11)if(noise(px,py)<55)rect(bc,'#c9ac7d',px,py,2,1);};
    for(const x of [17,31])road(x*16-10,6*16,22,25*16);
    for(const y of [14,22,30])road(10*16,y*16-10,28*16,22);
    road(24*16-10,8*16,22,23*16);road(17*16,9*16-10,14*16,22);
    road(19*16,12*16,10*16,12*16);
    // A little tiled forecourt around the heart; all roads remain screen-aligned.
    for(let y=13*16;y<23*16;y+=16)for(let x=20*16;x<28*16;x+=16){rect(bc,'#e3cc9e',x,y,15,15);rect(bc,'#d6bd90',x+1,y+14,14,1);}
    for(const s of SITES){const p=POINTS[s.id];road(p.x-12,p.y-16,24,28);}
    // Vegetable beds and the filtering pond.
    rect(bc,'#9b7855',8*16,17*16,6*16,3*16);
    for(let y=17;y<20;y++)for(let x=8;x<14;x++){rect(bc,'#755c44',x*16+2,y*16+3,12,10);tiles(bc,5,2,x*16,y*16);rect(bc,'#adc379',x*16+5,y*16+2,5,5);rect(bc,'#d5a160',x*16+7,y*16+7,3,4);}
    rect(bc,'#c7bd95',38*16-5,17*16-5,6*16+10,4*16+10);rect(bc,'#638d90',38*16,17*16,6*16,4*16);rect(bc,'#80b9b5',38*16+4,17*16+4,6*16-8,4*16-8);
    for(let i=0;i<6;i++){rect(bc,'#b9d5bd',38*16+8+i*13,17*16+11+(i%3)*14,8,1);}
    // Atlas props use the original CC0 pixels; no external textures are requested at runtime.
    for(let x=1;x<COLS-1;x+=2){tiles(bc,4,0,x*16,5,16,32);tiles(bc,5,0,x*16,H-26,16,32);}
    for(let y=3;y<ROWS-2;y+=2){tiles(bc,4,0,8,y*16,16,32);tiles(bc,5,0,W-24,y*16,16,32);}
    for(const [x,y] of TREES)tiles(bc,4,0,x*16,y*16,16,32);
    for(const [x,y] of [[15,17],[32,17],[15,25],[32,26],[19,5],[29,5],[5,17],[44,22]]){
      tiles(bc,5,2,x*16,y*16);tiles(bc,2,0,(x+1)*16,y*16);tiles(bc,2,0,x*16,(y+1)*16);
    }
    for(const [x,y] of BENCHES){
      rect(bc,'#69533e',x*16,y*16,27,5);rect(bc,'#c59c65',x*16,y*16-3,27,4);rect(bc,'#c59c65',x*16,y*16+4,27,4);rect(bc,'#6d5842',x*16+3,y*16+8,3,4);rect(bc,'#6d5842',x*16+21,y*16+8,3,4);
    }
    for(const s of SITES){building(bc,s);tiles(bc,5,2,s.x*16-12,(s.y+s.h)*16-10);tiles(bc,5,2,(s.x+s.w)*16-4,(s.y+s.h)*16-10);}
    for(const [x,y] of [[20,12],[28,12],[20,23],[28,23],[17,27],[31,27]]){rect(bc,'#6b6350',x*16,y*16-17,2,18);rect(bc,'#746750',x*16-3,y*16-22,8,7);rect(bc,'#fae0a2',x*16-1,y*16-21,4,4);}
  }
  sheet.onload=()=>{if(disposed)return;ready=true;background();};sheet.onerror=()=>{ready=false;background();};sheet.src=new URL('../assets/cell-village/tiny-town.png',import.meta.url).href;background();
  function resize(){
    const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.imageSmoothingEnabled=false;
  }
  function fit(){zoom=Math.min(width/(W+24),height/(H+20));cam={x:W/2,y:H/2};}
  function overview(){fit();if(width<600){zoom=1.25;cam={x:W/2,y:20*TILE};}}
  function clampCamera(){const hx=width/zoom/2,hy=height/zoom/2;cam.x=hx>=W/2?W/2:Math.max(hx,Math.min(W-hx,cam.x));cam.y=hy>=H/2?H/2:Math.max(hy,Math.min(H-hy,cam.y));}
  function transform(){clampCamera();return {x:Math.round(width/2-cam.x*zoom),y:Math.round(height/2-cam.y*zoom)};}
  function toWorld(x,y){const t=transform();return {x:(x-t.x)/zoom,y:(y-t.y)/zoom};}
  function setZoom(factor){zoom=Math.max(.45,Math.min(3.5,zoom*factor));clampCamera();}
  function focus(p,walking=false){cam.x=p.x;cam.y=p.y;if(walking)zoom=Math.max(1.7,Math.min(2.4,width/240));}
  function label(text,x,y,color='#fff1cc',background='#53614be8'){
    ctx.font='600 10px "SUIT Variable",sans-serif';ctx.textAlign='center';const w=ctx.measureText(text).width+12;
    rect(ctx,background,x-w/2,y-11,w,16);ctx.fillStyle=color;ctx.fillText(text,Math.round(x),Math.round(y));
  }
  function draw(world,{mode='watch',follow='',selected='',night='auto',paused=false}={}){
    viewMode=mode;
    if(mode==='walk'&&world.player){cam.x+=(world.player.x-cam.x)*.12;cam.y+=(world.player.y-cam.y)*.12;}
    else if(follow){const r=world.residents.find(r=>r.id===follow);if(r){cam.x+=(r.x-cam.x)*.06;cam.y+=(r.y-cam.y)*.06;}}
    ctx.setTransform(ratio,0,0,ratio,0,0);rect(ctx,'#76945f',0,0,width,height);ctx.imageSmoothingEnabled=false;
    const offset=transform();ctx.save();ctx.translate(offset.x,offset.y);ctx.scale(zoom,zoom);ctx.drawImage(base,0,0);
    const t=world.time;
    // Work animations belong to each organ: pumps, airflow, signals, water and parcels.
    for(const s of SITES){
      const p=POINTS[s.id];
      if(s.id==='heart'){const pulse=Math.sin(t*4)>0?1:0;rect(ctx,'#7d6b51',p.x-29,p.y-15,12,10);rect(ctx,pulse?'#df8a78':'#bc7167',p.x-27,p.y-18-pulse*2,8,8);}
      if(s.id==='lung')for(let i=0;i<3;i++){const h=(t*9+i*8)%22;rect(ctx,'#dbebd999',p.x-20+i*13,p.y-42-h,5,2);}
      if(s.id==='brain')for(let i=0;i<3;i++)rect(ctx,Math.floor(t*2)%3===i?'#ffe6a6':'#ae91b4',p.x-12+i*10,p.y-28,4,4);
      if(s.id==='kidney')for(let i=0;i<3;i++)rect(ctx,'#bce6dd',p.x-23+i*7,p.y-10+(t*9+i*3)%9,3,3);
      if(s.id==='gut'||s.id==='liver'){rect(ctx,'#af8454',p.x+20,p.y-14,14,10);rect(ctx,'#e5c887',p.x+22,p.y-13,10,3);}
      if(s.id==='marrow'){rect(ctx,'#8c7050',p.x+17,p.y-14,22,5);rect(ctx,'#c8c5a6',p.x+22,p.y-18,9,4);}
    }
    for(let i=0;i<7;i++){const px=38*16+8+((t*5+i*29)%76),py=17*16+12+i%3*15;rect(ctx,'#c1e2cd99',px,py,7,1);}
    const actors=[...world.residents,...(world.player?[{...world.player,id:'player'}]:[])].sort((a,b)=>a.y-b.y);
    for(const p of actors){
      drawPerson(ctx,p,p.x,p.y,1,p.id==='player'||p.id===selected||p.id===follow);
      // Roofs occlude residents walking behind their building, not its front door.
      for(const s of SITES)if(p.y<s.y*TILE+s.h*TILE-4&&p.y>s.y*TILE-12&&p.x>s.x*TILE-12&&p.x<(s.x+s.w)*TILE+12)building(ctx,s);
    }
    if(world.player?.path.length&&mode==='walk'){const dest=world.player.path.at(-1);rect(ctx,'#fff2bd',dest.x-4,dest.y,8,1);rect(ctx,'#fff2bd',dest.x,dest.y-4,1,8);}
    for(const e of world.effects){if(e.kind==='heart')pixelHeart(ctx,e.x-3,e.y-(2-e.life)*8);else for(let i=0;i<6;i++)rect(ctx,'#ffe7ac',e.x+Math.cos(i)*14,e.y-16-(3-e.life)*12+Math.sin(i)*12,3,3);}
    const hour=villageClock(world).hour,isNight=night==='night'||night==='auto'&&(hour>=19||hour<6);
    if(isNight){rect(ctx,'#263c6c66',0,0,W,H);for(const s of SITES){const x=(s.x+s.w/2)*16,y=(s.y+s.h)*16;ctx.fillStyle='#ffe3a42b';ctx.beginPath();ctx.ellipse(x,y,26,14,0,0,Math.PI*2);ctx.fill();}for(let i=0;i<13;i++)rect(ctx,'#f7e8ad',90+(i*113)%600,130+(i*51)%340+Math.sin(t+i)*4,2,2);}
    ctx.restore();
    // Labels stay legible at map scale and never inherit common SVG/image styling.
    for(const s of SITES){const x=offset.x+(s.x+s.w/2)*16*zoom,y=offset.y+(s.y*16-12)*zoom;if(x>20&&x<width-20&&y>20&&y<height-15)label(s.name,x,y);}
    const focusActor=world.residents.find(r=>r.id===(selected||follow));
    if(focusActor)label(focusActor.name,offset.x+focusActor.x*zoom,offset.y+(focusActor.y-32)*zoom,'#5f513c','#fff0cceF');
    if(world.player&&mode==='walk')label(world.player.name,offset.x+world.player.x*zoom,offset.y+(world.player.y-34)*zoom,'#554d3a','#fff0cceF');
    if(paused){ctx.fillStyle='#31473422';ctx.fillRect(0,0,width,height);}
  }
  return {draw,resize,fit,overview,toWorld,setZoom,focus,pan:(dx,dy)=>{if(viewMode==='watch'){cam.x-=dx/zoom;cam.y-=dy/zoom;}},dispose:()=>{disposed=true;sheet.onload=null;sheet.onerror=null;},get zoom(){return zoom;}};
}
