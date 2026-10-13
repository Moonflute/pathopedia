import {castRay,protectedBySource} from './play-engine.mjs';

const SIZE=64,FOV=.72;
const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const shade=(color,k)=>'rgb('+rgb(color).map(v=>Math.min(255,Math.round(v*k))).join(',')+')';
function blob(ctx,x,y,rx,ry,color){
  for(let j=-ry;j<=ry;j+=2)for(let i=-rx;i<=rx;i+=2){const r=i*i/(rx*rx)+j*j/(ry*ry);if(r>1)continue;
    const light=.45+.5*Math.sqrt(1-r)+.18*(-i/rx-j/ry);ctx.fillStyle=shade(color,light);ctx.fillRect(x+i|0,y+j|0,2,2);}
}
function createSprites(catalog){
  const atlas=surface(SIZE*4,SIZE*(catalog.enemies.length+4)),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  catalog.enemies.forEach((p,row)=>{for(let f=0;f<4;f++){
    ctx.save();ctx.translate(f*SIZE,row*SIZE);const bob=f%2;
    ctx.fillStyle='#0005';ctx.fillRect(13,54,39,4);
    if(p.shape==='diplo'){blob(ctx,24,31+bob,15,22,p.color);blob(ctx,42,31-bob,13,20,p.color);}
    if(p.shape==='cluster'){for(const [x,y,r] of [[24,20,12],[40,20,11],[17,34,11],[32,33,14],[46,34,10],[25,46,10],[39,46,10]])blob(ctx,x,y+bob,r,r,p.color);}
    if(p.shape==='rod'){
      ctx.strokeStyle=shade(p.color,.65);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(43,41);ctx.lineTo(56,43+f);ctx.lineTo(49,51);ctx.lineTo(59,56-f);ctx.stroke();
      for(let i=0;i<5;i++){ctx.fillStyle=shade(p.color,.6);ctx.fillRect(15+i*7,14-bob,2,7);ctx.fillRect(15+i*7,44,2,6+bob);}
      blob(ctx,31,32+bob,25,16,p.color);blob(ctx,24,30,6,5,'#497871');blob(ctx,40,34,5,4,'#51837c');
    }
    ctx.fillStyle='#102622';ctx.fillRect(22,28+bob,7,6);ctx.fillRect(37,28+bob,7,6);ctx.fillStyle='#e4f9bd';ctx.fillRect(24,28+bob,3,3);ctx.fillRect(39,28+bob,3,3);
    if(f===3){ctx.fillStyle='#1c3430';ctx.fillRect(29,39,9,5);}ctx.restore();
  }});
  const base=catalog.enemies.length;
  for(let f=0;f<4;f++){
    const x=f*SIZE;
    ctx.fillStyle='#101c23';ctx.fillRect(x+11,base*SIZE+15,43,45);ctx.fillStyle='#43786f';ctx.fillRect(x+15,base*SIZE+12,35,38);ctx.fillStyle='#95d7b7';ctx.fillRect(x+19,base*SIZE+16,27,21);ctx.fillStyle='#1e483d';ctx.fillRect(x+22,base*SIZE+19,21,15);ctx.fillStyle='#94edbc';ctx.fillRect(x+25,base*SIZE+24,15,3);ctx.fillRect(x+31,base*SIZE+19,3,15);ctx.fillStyle=f%2?'#ffbf76':'#bfdf9a';ctx.fillRect(x+20,base*SIZE+42,5,3);ctx.fillRect(x+35,base*SIZE+42,10,3);
    for(let k=1;k<=3;k++){const y=(base+k)*SIZE,color=['','#da9986','#d9bd75','#91bdcf'][k];ctx.fillStyle='#0005';ctx.fillRect(x+19,y+53,27,4);ctx.fillStyle='#172b30';ctx.fillRect(x+19,y+26-f%2*2,27,23);ctx.fillStyle=color;ctx.fillRect(x+21,y+25-f%2*2,23,20);ctx.fillStyle='#e6efdd';ctx.fillRect(x+25,y+32,15,4);if(k===1)ctx.fillRect(x+31,y+27,4,15);if(k===3){ctx.fillRect(x+27,y+23,10,3);ctx.fillRect(x+26,y+38,13,2);}}
  }
  return atlas;
}
function createWalls(){
  const atlas=surface(32*3,32),c=atlas.getContext('2d');
  for(let i=0;i<3;i++){const x=i*32;c.fillStyle=['#61736a','#596c67','#556366'][i];c.fillRect(x,0,32,32);c.fillStyle='#253c38';c.fillRect(x,0,1,32);c.fillRect(x,31,32,1);c.fillStyle='#91a395';c.fillRect(x+1,1,30,1);c.fillRect(x+1,1,1,29);c.fillStyle='#263d39';c.fillRect(x,20,32,4);c.fillStyle=['#a9c4a1','#88bfb4','#bdb784'][i];c.fillRect(x+1,20,31,2);
    c.fillStyle='#364a42';for(const y of [5,27])for(const n of [4,28])c.fillRect(x+n,y,2,2);
    if(i===1){c.fillStyle='#263d38';c.fillRect(x+6,5,20,11);c.fillStyle='#6daea0';c.fillRect(x+8,7,16,7);c.fillStyle='#a3d9bf';c.fillRect(x+9,8,13,1);}
    if(i===2){c.fillStyle='#a5b8a4';c.fillRect(x+10,5,12,12);c.fillStyle='#405f50';c.fillRect(x+14,7,4,8);c.fillRect(x+12,9,8,4);}
  }return atlas;
}
function createWeapons(catalog){
  const atlas=surface(160*5,128),c=atlas.getContext('2d');
  catalog.weapons.forEach((w,i)=>{c.save();c.translate(i*160,0);
    c.fillStyle='#102027';c.fillRect(35,84,89,44);c.fillStyle='#627571';c.fillRect(27,103,32,25);c.fillRect(109,103,28,25);c.fillStyle='#adbcab';c.fillRect(29,100,27,20);c.fillRect(109,100,25,20);c.fillStyle='#445d53';c.fillRect(33,108,19,5);c.fillRect(115,108,19,5);
    const barrel=i===2?18:i===3?50:i===1?42:28,top=i===2?9:23;
    c.fillStyle='#15282b';c.fillRect(80-barrel/2-4,top,barrel+8,89);c.fillStyle='#87968b';c.fillRect(80-barrel/2,top+3,barrel,80);c.fillStyle='#b6c7b4';c.fillRect(80-barrel/2+2,top+5,4,70);c.fillStyle='#314b45';c.fillRect(80+barrel/2-7,top+4,6,80);
    c.fillStyle='#132a29';c.fillRect(80-barrel/2+3,top+6,barrel-6,8);c.fillStyle=w.color;c.fillRect(80-barrel/2+5,top+9,barrel-10,3);
    if(i===1){c.fillStyle='#142b29';c.fillRect(77,top+5,5,38);}if(i===3){c.fillStyle=w.color;c.fillRect(58,49,44,13);c.fillStyle='#dce7c7';c.fillRect(65,52,30,3);}if(i===4){for(let n=0;n<3;n++){c.fillStyle='#1a3832';c.fillRect(61+n*13,18,10,42);c.fillStyle=w.color;c.fillRect(63+n*13,20,6,6);}}
    c.fillStyle='#223c37';c.fillRect(49,77,64,43);c.fillStyle='#759086';c.fillRect(53,79,56,32);c.fillStyle='#152c29';c.fillRect(62,86,36,18);c.fillStyle=w.color;c.fillRect(66,90,28,3);c.fillRect(66,96,18,3);c.restore();
  });return atlas;
}
export function createPlayRenderer(canvas,catalog,{quality='retro',reducedMotion=false}={}){
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('Canvas 2D를 사용할 수 없습니다.');
  let width,height,depth,frame,floorPixels,disposed=false;
  const sprites=createSprites(catalog),walls=createWalls(),weapons=createWeapons(catalog),visible=[];
  function resize(mode=quality){quality=mode;const maxW=mode==='low'?480:640,maxH=mode==='low'?270:360,cssW=canvas.clientWidth||maxW,cssH=canvas.clientHeight||maxH,scale=Math.min(maxW/cssW,maxH/cssH);width=Math.max(160,Math.floor(cssW*scale/2)*2);height=Math.max(120,Math.floor(cssH*scale/2)*2);canvas.width=width;canvas.height=height;context.imageSmoothingEnabled=false;depth=new Float32Array(width);frame=context.createImageData(width,height);floorPixels=new Uint32Array(frame.data.buffer);}
  resize();
  function render(run){
    if(disposed)return;const ctx=context,p=run.player,cos=Math.cos(p.angle),sin=Math.sin(p.angle),planeX=-sin*FOV,planeY=cos*FOV,projection=width/(2*FOV),horizon=Math.floor(height*.46);
    // Reused pixel buffer. Render at fixed resolution, independent of devicePixelRatio.
    for(let y=0;y<height;y+=2){const floor=y>=horizon,distance=projection*.5/Math.max(1,Math.abs(y-horizon)),stepX=distance*planeX*2/width,stepY=distance*planeY*2/width;
      let worldX=p.x+distance*(cos-planeX),worldY=p.y+distance*(sin-planeY);
      for(let x=0;x<width;x+=2){let r,g,b;if(floor){const grid=(worldX%1+1)%1<.045||(worldY%1+1)%1<.045,check=(Math.floor(worldX)+Math.floor(worldY))&1,k=Math.max(.3,1-distance*.034);
        r=(grid?17:check?42:47)*k;g=(grid?35:check?57:64)*k;b=(grid?33:check?55:60)*k;
        if((Math.floor(worldX)===9||Math.floor(worldX)===18)&&((worldY%1+1)%1<.2)){r=69*k;g=111*k;b=93*k;}
      }else{const k=y/height;r=17+k*10;g=29+k*14;b=32+k*12;}
      const color=(255<<24)|((b|0)<<16)|((g|0)<<8)|(r|0),index=y*width+x;floorPixels[index]=color;floorPixels[index+1]=color;if(y+1<height){floorPixels[index+width]=color;floorPixels[index+width+1]=color;}worldX+=stepX*2;worldY+=stepY*2;
      }
    }
    ctx.putImageData(frame,0,0);
    for(let x=0;x<width;x+=2){const cameraX=2*x/width-1,ray=castRay(run.map,p.x,p.y,cos+planeX*cameraX,sin+planeY*cameraX),distance=Math.max(.05,ray.distance),h=projection/distance,top=horizon-h/2,texture=(Math.max(1,ray.tile)-1)*32+(ray.u*32|0);
      depth[x]=distance;depth[x+1]=distance;ctx.drawImage(walls,texture,0,1,32,x,top,2,h);ctx.fillStyle='rgba(5,19,23,'+Math.min(.88,distance*.039+(ray.side?.15:0))+')';ctx.fillRect(x,top,2,h);
    }
    const project=(obj,row,size=1,z=.5,kind='enemy')=>{const dx=obj.x-p.x,dy=obj.y-p.y,d=dx*cos+dy*sin,lateral=-dx*sin+dy*cos;if(d<.18||d>27)return;const screen=width/2+lateral*projection/d,h=projection*size/d;if(screen+h/2<0||screen-h/2>width)return;visible.push({obj,row,d,screen,h,z,kind});};
    visible.length=0;
    for(const e of run.enemies)if(e.active)project(e,catalog.enemies.findIndex(p=>p.id===e.kind),e.elite?1.1:.9,.5);
    for(const s of run.map.sources)if(s.active)project(s,catalog.enemies.length,1,.5,'source');
    for(const s of run.map.pickups)if(s.active)project(s,catalog.enemies.length+({health:1,supply:2,culture:3}[s.kind]),.6,.3,'pickup');
    visible.sort((a,b)=>b.d-a.d);
    for(const v of visible){const {obj,d,screen,h,kind}=v,dead=kind==='enemy'&&obj.state==='Dead',squash=dead?Math.max(.08,obj.death/.45):1,top=horizon+projection*.5/d-h*squash-(reducedMotion?0:Math.sin(run.time*5+obj.id)*2),left=screen-h/2,frameIndex=kind==='enemy'&&obj.state==='Attack'?3:Math.floor(run.time*6+obj.id)%3;
      const x0=Math.max(0,Math.floor(left)),x1=Math.min(width,Math.ceil(left+h));
      ctx.globalAlpha=dead?squash:Math.max(.4,1-d*.019);
      for(let x=x0;x<x1;x+=2){if(d>=depth[x])continue;const u=Math.min(63,Math.max(0,Math.floor((x-left)/h*64)));ctx.drawImage(sprites,frameIndex*64+u,v.row*64,1,64,x,top,2,h*squash);}
      ctx.globalAlpha=1;
      if(kind==='enemy'&&!dead&&d<depth[Math.max(0,Math.min(width-1,screen|0))]){
        if(obj.shield>0||protectedBySource(run,obj)){ctx.strokeStyle=obj.shield>0?'#cfe8a78a':'#6ae6c898';ctx.lineWidth=2;ctx.strokeRect(screen-h*.42,top+h*.07,h*.84,h*.82);}
        if(obj.elite){ctx.fillStyle='#ddbc7b';ctx.fillRect(screen-9,top-5,18,3);}
        if(obj.flash>0){ctx.fillStyle='#f7ffe647';ctx.fillRect(screen-h*.25,top+h*.2,h*.5,h*.5);}
      }
    }
    function dot(x,y,z,color,radius){const dx=x-p.x,dy=y-p.y,d=dx*cos+dy*sin;if(d<.2)return;const sx=width/2+(-dx*sin+dy*cos)*projection/d;if(sx<0||sx>=width||d>=depth[sx|0])return;const sy=horizon+(.5-z)*projection/d,r=Math.max(1,projection*radius/d);ctx.fillStyle=color;ctx.fillRect(sx-r,sy-r,r*2,r*2);}
    for(const b of run.projectiles)if(b.active)dot(b.x,b.y,.5,'#efac7e',.075);
    for(const b of run.particles)if(b.life>0)dot(b.x,b.y,b.z,b.color,.025);
    // A single cached weapon sheet, rendered in chunky animation steps.
    const bob=reducedMotion?0:Math.sin(run.walk)*3,kick=run.lastShot>0?Math.floor(run.lastShot*50):0,weaponW=Math.round(width*.3),weaponH=weaponW*.8,wx=width/2-weaponW/2+bob,wy=height-weaponH+8+kick+run.switchTime*180;
    ctx.drawImage(weapons,run.weapon*160,0,160,128,wx,wy,weaponW,weaponH);
    if(run.lastShot>.09){ctx.fillStyle=catalog.weapons[run.weapon].color;const x=width/2+bob,y=wy+weaponH*.16;ctx.fillRect(x-4,y-15,8,23);ctx.fillRect(x-13,y-7,26,8);ctx.fillStyle='#faffdb';ctx.fillRect(x-3,y-9,6,12);}
    // Center aim and hit confirmation stay sharp at every display size.
    const cx=width/2,cy=horizon;ctx.strokeStyle=run.hit>0?'#d8f3ac':'#d9e9dc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx-3,cy);ctx.moveTo(cx+3,cy);ctx.lineTo(cx+7,cy);ctx.moveTo(cx,cy-7);ctx.lineTo(cx,cy-3);ctx.moveTo(cx,cy+3);ctx.lineTo(cx,cy+7);ctx.stroke();
    if(run.hit>0){ctx.beginPath();for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.moveTo(cx+a*9,cy+b*9);ctx.lineTo(cx+a*13,cy+b*13);}ctx.stroke();}
    if(run.scanPulse>0){ctx.strokeStyle='#9ae0c088';ctx.strokeRect(cx-90*(1-run.scanPulse),cy-55*(1-run.scanPulse),180*(1-run.scanPulse),110*(1-run.scanPulse));}
    if(run.hurt>0){ctx.fillStyle='rgba(196,62,48,'+run.hurt*.7+')';ctx.fillRect(0,0,width,height);}
    // The mini-map is also rendered into the fixed-size canvas; no extra DOM work per frame.
    const scale=2.6,mx=width-run.map.width*scale-12,my=12;ctx.fillStyle='#0a191ddd';ctx.fillRect(mx-5,my-5,run.map.width*scale+10,run.map.height*scale+17);
    for(let y=0;y<run.map.height;y++)for(let x=0;x<run.map.width;x++)if(run.map.cells[y*run.map.width+x]){ctx.fillStyle='#556a62';ctx.fillRect(mx+x*scale,my+y*scale,scale,scale);}
    for(const s of run.map.sources){ctx.fillStyle=s.active?'#94e3c8':'#52645d';ctx.fillRect(mx+s.x*scale-2,my+s.y*scale-2,4,4);}
    for(const e of run.enemies)if(e.active&&e.state!=='Dead'){ctx.fillStyle='#cd9384';ctx.fillRect(mx+e.x*scale-1,my+e.y*scale-1,2,2);}
    ctx.fillStyle='#e0c991';ctx.fillRect(mx+run.map.exit.x*scale-2,my+run.map.exit.y*scale-2,4,4);
    ctx.fillStyle='#f2f6df';ctx.beginPath();ctx.moveTo(mx+p.x*scale+cos*4,my+p.y*scale+sin*4);ctx.lineTo(mx+p.x*scale-sin*2-cos*2,my+p.y*scale+cos*2-sin*2);ctx.lineTo(mx+p.x*scale+sin*2-cos*2,my+p.y*scale-cos*2-sin*2);ctx.fill();
    ctx.font='7px monospace';ctx.fillStyle='#9bb8aa';ctx.fillText('WARD 01 / EXIT',mx,my+run.map.height*scale+9);
  }
  return {render,resize,dispose(){disposed=true;for(const c of [sprites,walls,weapons,canvas]){c.width=1;c.height=1;}frame=null;floorPixels=null;depth=null;visible.length=0;}};
}
