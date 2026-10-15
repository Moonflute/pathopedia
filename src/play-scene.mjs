import {floorAt,ceilingAt,eyeAt} from './play-world.mjs';

// Tile sectors with floor risers and per-pixel depth. 2x2 samples keep the cost bounded.
export function createSceneRaster(ctx,width,height){
 let frame=ctx.createImageData(width,height),pixels=new Uint32Array(frame.data.buffer),depth=new Float32Array(width*height),atlas=null,tex=null,tw=0;
 const put=(x,y,d,color)=>{const i=y*width+x;if(d>=depth[i])return;pixels[i]=pixels[i+1]=color;depth[i]=depth[i+1]=d;if(y+1<height){pixels[i+width]=pixels[i+width+1]=color;depth[i+width]=depth[i+width+1]=d;}};
 const tint=(c,k)=>{const r=Math.min(255,(c&255)*k),g=Math.min(255,((c>>>8)&255)*k),b=Math.min(255,((c>>>16)&255)*k);return (255<<24)|((b|0)<<16)|((g|0)<<8)|(r|0);};
 const sample=(id,u,v)=>tex[((Math.floor(v*64)%64+64)%64)*tw+id*64+((Math.floor(u*64)%64+64)%64)];
 function render(run,texture,horizon,projection,planeX,planeY){
  if(atlas!==texture){atlas=texture;tw=texture.width;tex=new Uint32Array(texture.getContext('2d').getImageData(0,0,tw,64).data.buffer);}
  const map=run.map,p=run.player,cz=eyeAt(map,p),cos=Math.cos(p.angle),sin=Math.sin(p.angle);
  depth.fill(1000);pixels.fill(0xff1e1712);
  const yProject=(z,d)=>horizon+(cz-z)*projection/Math.max(.015,d);
  const face=(x,z0,z1,d,id,u,light)=>{
   let top=Math.max(0,Math.floor(yProject(z1,d)/2)*2),bottom=Math.min(height,Math.ceil(yProject(z0,d)/2)*2);
   const k=Math.max(.18,light/(1+d*.065));for(let y=top;y<bottom;y+=2){const z=cz-(y+1-horizon)*d/projection,v=(z1-z)/Math.max(.01,z1-z0);put(x,y,d,tint(sample(id,u,v),k));}
  };
  const plane=(x,level,near,far,rx,ry,cell,ceiling)=>{
   if(ceiling?level<=cz:level>=cz)return;
   const ya=yProject(level,near),yb=yProject(level,far),a=Math.max(0,Math.floor(Math.min(ya,yb)/2)*2),b=Math.min(height,Math.ceil(Math.max(ya,yb)/2)*2),light=map.lights?.[cell]||.82;
   for(let y=a;y<b;y+=2){const d=(cz-level)*projection/(y+1-horizon);if(d<near-.002||d>far+.002)continue;
    const wx=p.x+rx*d,wy=p.y+ry*d,u=wx-Math.floor(wx),v=wy-Math.floor(wy);
    let c=ceiling?sample(1,u,v):sample(6,u,v),k=Math.max(.2,light/(1+d*.045))*(ceiling?.56:.8);
    if(ceiling){const grain=((c&255)+((c>>>8)&255)+((c>>>16)&255))*.025;c=(255<<24)|(((46+grain)|0)<<16)|(((41+grain)|0)<<8)|((32+grain)|0);k*=u<.025||v<.025?.64:1;if(Math.floor(wx)%5===0&&Math.floor(wy)%4===0&&u>.13&&u<.87&&v>.28&&v<.72){c=0xffd8e9ed;k=1;} }
    else if(map.floorMaterials?.[cell]){const material=map.floorMaterials[cell],r=c&255,g=(c>>>8)&255,b=(c>>>16)&255;c=(255<<24)|((Math.min(255,b*(material===1?1.35:material===3?1.2:.84))|0)<<16)|((Math.min(255,g*(material===2?1.16:1.05))|0)<<8)|(Math.min(255,r*(material===1?.78:material===2?.85:.92))|0);if((material===1?Math.floor(wx)+Math.floor(wy):Math.floor(wx))%2===0)k*=.86;if(map.stairs?.[cell]&&v>.84){c=0xff709ab3;k*=1.2;}}
    else if(map.stairs?.[cell]&&v>.84){c=0xff709ab3;k*=1.2;}
    else if(u<.025||v<.025)k*=.55;
    put(x,y,d,tint(c,k));
   }
  };
  for(let x=0;x<width;x+=2){
   const camera=2*(x+1)/width-1,rx=cos+planeX*camera,ry=sin+planeY*camera,stepX=rx<0?-1:1,stepY=ry<0?-1:1,ddx=Math.abs(1/(rx||1e-9)),ddy=Math.abs(1/(ry||1e-9));
   let mx=Math.floor(p.x),my=Math.floor(p.y),tx=(rx<0?p.x-mx:mx+1-p.x)*ddx,ty=(ry<0?p.y-my:my+1-p.y)*ddy,near=.015;
   for(let steps=0;steps<100&&near<35;steps++){
    const cell=my*map.width+mx,fh=floorAt(map,mx,my),ch=ceilingAt(map,mx,my),far=Math.min(tx,ty,35);
    plane(x,fh,near,far,rx,ry,cell,false);plane(x,ch,near,far,rx,ry,cell,true);
    const side=tx>=ty;if(side){my+=stepY;ty+=ddy;}else{mx+=stepX;tx+=ddx;}near=far;
    const hit=my*map.width+mx,room=map.rooms[map.roomCells[hit]],out=mx<0||my<0||mx>=map.width||my>=map.height,tile=out?1:map.cells[hit],u=(side?p.x+rx*near:p.y+ry*near);
    const light=(map.lights?.[cell]||.82)*(side?.82:1);
    const door=map.exitDoor,doorTile=door?.cells.includes(hit),doorArt=8+map.rooms.length;
    if(doorTile){
     const along=side?p.x+rx*near:p.y+ry*near,du=door.normal.y?1-(along-door.spanStart)/3:(along-door.spanStart)/3;
     if(door.open<1)face(x,door.open*1.4,1.4,near,doorArt,du,1.05);
     face(x,1.4,Math.max(1.65,ch),near,doorArt+2,du,1.1);
     if(door.open<=0)break;
    }else if(tile){const along=side?mx:my,center=room?Math.floor(side?room.x:room.y):-99;
     const id=map.signs?.[hit]!==undefined?11+map.rooms.length+map.signs[hit]:tile===8?doorArt+1:room&&along===center?8+room.id:tile===6?5:(along%7===0?2:along%5===0?4:room?.type==='hall'||room?.rest?0:room?.type==='gallery'?1:tile%2?1:0);
     face(x,0,Math.max(ch,ceilingAt(map,mx,my)),near,id,u,light);break;
    }
    const nf=floorAt(map,mx,my),nc=ceilingAt(map,mx,my);
    if(nf>fh+.005)face(x,fh,nf,near,7,u,light);
    if(nc<ch-.005)face(x,nc,ch,near,1,u,light*.8);
   }
  }
  ctx.putImageData(frame,0,0);
 }
 return {render,get depth(){return depth;},dispose(){frame=pixels=depth=tex=atlas=null;}};
}
