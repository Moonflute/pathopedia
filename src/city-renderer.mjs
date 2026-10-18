import {DISTRICTS,JOBS,districtDef} from './city-data.mjs';

const TAU=Math.PI*2;
const COS=Math.cos(Math.PI/8),SIN=Math.sin(Math.PI/8),TILT=.64;
const VIEW={width:1440,height:900};
// Orthographic ground projection; sprites keep their vertical height in screen space.
export const projectCity=(x,y)=>({x:720+(x-600)*COS-(y-400)*SIN,y:440+((x-600)*SIN+(y-400)*COS)*TILT});
export const unprojectCity=(x,y)=>({x:600+(x-720)*COS+(y-440)/TILT*SIN,y:400-(x-720)*SIN+(y-440)/TILT*COS});
const TREES=[[162,210],[161,250],[163,289],[163,550],[167,590],[394,174],[437,172],[630,160],[671,161],[748,687],[955,414],[987,427],[740,514],[750,547],[417,656],[458,668],[412,433],[182,430],[190,464]];
const HOUSES=[[443,474],[481,490],[445,513],[696,270],[735,282],[694,311],[1036,365],[1031,407],[171,344]];
export function createCityRenderer(canvas,onSelect){
  const main=canvas.getContext('2d'),terrain=document.createElement('canvas');
  terrain.width=VIEW.width;terrain.height=VIEW.height;
  let ctx=main,width=1,height=1,scale=1,offsetX=0,offsetY=0,zoom=1,panX=0,panY=0,bottomInset=0,disposed=false,dirty=true,lastDraw=0,groundReady=false;
  const pointers=new Map();let gesture=null;
  const abort=new AbortController();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);main.setTransform(dpr,0,0,dpr,0,0);dirty=true;}
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const camera=()=>{const visible=Math.max(120,height-bottomInset);scale=Math.min(width/1300,Math.max(80,visible-90)/640)*zoom;offsetX=(width-VIEW.width*scale)/2+panX;offsetY=(visible-VIEW.height*scale)/2+panY+20;};
  const point=e=>{const r=canvas.getBoundingClientRect();camera();return {x:(e.clientX-r.left-offsetX)/scale,y:(e.clientY-r.top-offsetY)/scale};};
  function pan(dx,dy){panX=Math.max(-width*zoom*.4,Math.min(width*zoom*.4,panX+dx));panY=Math.max(-height*zoom*.4,Math.min(height*zoom*.4,panY+dy));dirty=true;}
  function changeZoom(delta){zoom=Math.max(1,Math.min(3.2,zoom+delta));if(zoom===1){panX=0;panY=0;}dirty=true;}
  function reset(){zoom=1;panX=0;panY=0;dirty=true;}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture={x:e.clientX,y:e.clientY,moved:pointers.size>1,distance:0};canvas.setPointerCapture(e.pointerId);},{signal:abort.signal});
  canvas.addEventListener('pointermove',e=>{const previous=pointers.get(e.pointerId);if(!previous||!gesture)return;const dx=e.clientX-previous.x,dy=e.clientY-previous.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(gesture.distance)changeZoom((distance-gesture.distance)/160);gesture.distance=distance;gesture.moved=true;}
    else{if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5)gesture.moved=true;if(gesture.moved)pan(dx,dy);}
  },{signal:abort.signal});
  canvas.addEventListener('pointerup',e=>{if(gesture&&!gesture.moved&&pointers.size===1){const p=point(e);const hits=DISTRICTS.map(d=>({d,p:projectCity(d.x,d.y)})).filter(h=>Math.abs(h.p.x-p.x)<105&&p.y>h.p.y-118&&p.y<h.p.y+104).sort((a,b)=>b.p.y-a.p.y);if(hits.length)onSelect(hits[0].d.id);}pointers.delete(e.pointerId);if(!pointers.size)gesture=null;else if(gesture)gesture.moved=true;},{signal:abort.signal});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;},{signal:abort.signal});
  canvas.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY>0?-.15:.15);},{signal:abort.signal,passive:false});
  canvas.addEventListener('keydown',e=>{const arrows={ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};if(arrows[e.key]){e.preventDefault();pan(...arrows[e.key]);}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')reset();else changeZoom(e.key==='-'?-.3:.3);}},{signal:abort.signal});
  const groundPlane=()=>ctx.transform(COS,SIN*TILT,-SIN,COS*TILT,720-600*COS+400*SIN,440-(600*SIN+400*COS)*TILT);
  function ellipse(x,y,rx,ry,color,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function rect(x,y,w,h,r,color,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function line(points,color,size=2,dash=[]){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
  function text(value,x,y,size=14,color='#f3f0df',weight=600,align='center'){ctx.font=`${weight} ${size}px SUIT, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y);}
  function cube(x,y,w,h,color,roof){
    const depth=Math.max(10,w*.22);
    ellipse(x+12,y+5,w*.75,depth*.8,'#172d3040');
    rect(x-w/2,y-h,w,h,3,color,'#304b44');
    polygon([[x+w/2,y],[x+w/2+depth,y-depth*.62],[x+w/2+depth,y-h-depth*.62],[x+w/2,y-h]],'#728271','#304b44');
    polygon([[x-w/2-2,y-h],[x-w/2+depth,y-h-depth*.62],[x+w/2+depth+2,y-h-depth*.62],[x+w/2+2,y-h]],roof,'#415d4d');
    for(let i=0;i<Math.floor(w/20);i++){rect(x-w/2+9+i*20,y-h+23,9,12,2,'#f2dda1');line([[x-w/2+9+i*20,y-h+28],[x-w/2+18+i*20,y-h+28]],'#5c6b58',1);}
  }
  function polygon(points,color,stroke){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
  function tree(x,y,r=11){ellipse(x+3,y+6,r*.9,r*.5,'#173d3a30');line([[x,y],[x,y+8]],'#6b7057',4);ellipse(x,y-5,r,r*1.05,'#567b65');ellipse(x-4,y-8,r*.62,r*.64,'#6d9171');}
  function road(points,color,size=22){line(points,'#456b5e',size+9);line(points,'#e8ceac',size+5);line(points,color,size);line(points,'#eed7bb80',1.5,[6,14]);}
  function drawGround(){
    ctx=terrain.getContext('2d');ctx.clearRect(0,0,VIEW.width,VIEW.height);ctx.save();groundPlane();
    // A single continuous city; the outer wall encloses every organ district.
    ctx.beginPath();ctx.roundRect(70,76,1060,650,145);ctx.fillStyle='#7e9979';ctx.fill();ctx.strokeStyle='#203a34';ctx.lineWidth=17;ctx.stroke();
    ctx.beginPath();ctx.roundRect(70,69,1060,650,145);ctx.strokeStyle='#d5c3a4';ctx.lineWidth=17;ctx.stroke();ctx.strokeStyle='#f0dec0';ctx.lineWidth=3;ctx.stroke();
    for(let x=206;x<1015;x+=36){rect(x,57,18,22,3,'#e4d0ac','#a09d80');rect(x,707,18,20,3,'#d7c39f','#a09d80');}
    for(let y=226;y<587;y+=36){rect(58,y,21,18,3,'#ddc7a5','#a09d80');rect(1118,y,21,18,3,'#ddc7a5','#a09d80');}
    for(let i=0;i<130;i++){const x=135+(i*157)%940,y=130+(i*83)%520;ellipse(x,y,1.5,1,'#afbb8f70');}
    // Water from the filtration district leaves the city through a separate canal.
    line([[603,661],[657,686],[693,727],[768,800]],'#496b60',35);line([[603,661],[657,686],[693,727],[768,800]],'#7aaeb1',24);line([[603,661],[657,686],[693,727],[768,800]],'#acd3ca',2,[14,10]);
    const heart=districtDef('heart');
    const ring=['lung','gut','kidney','marrow','lymph','lung'].map(id=>{const d=districtDef(id);return[d.x,d.y];});
    road(ring,'#a77976',23);
    for(const d of DISTRICTS)if(d.id!=='heart')road([[heart.x,heart.y],[d.x,d.y]],'#b4827c',17);
    // Pale gold paths carry tissue patrols, distinct from pink circulation roads.
    line([[281,300],[430,335],[575,440],[735,380],[878,303]],'#c7bb91',9);
    line([[281,300],[430,335],[575,440],[735,380],[878,303]],'#f2e1b0',2,[5,9]);
    road([[1104,98],[1030,143],[983,180],[920,206]],'#8ba9a5',32);
    text('SKIN BARRIER',174,677,12,'#e5e2c3',600);
    ctx.restore();ctx=main;groundReady=true;
  }
  function groundActivity(s,t,selected,layer){
    ctx.save();groundPlane();
    if(layer==='supply')for(const d of DISTRICTS)ellipse(d.x,d.y+20,111,84,'#6caeba25','#9bd6ca');
    for(const d of DISTRICTS){
      const ds=s.districts[d.id];
      ellipse(d.x+3,d.y+28,99,68,'#2e56442b');
      ellipse(d.x,d.y+18,96,64,selected===d.id?'#eee1b476':'#cbca9c40',selected===d.id?'#fff0c7':null);
      if(ds.hp<60)ellipse(d.x,d.y,110,85,'#ce69612e');
    }
    for(let i=0;i<9;i++){const k=((t*.18+i/9)%1);ellipse(1090-161*k,108+99*k,4,4,'#d6eee8aa');}
    for(const d of s.debris){ellipse(d.x,d.y,5,3,'#73836b');ellipse(d.x+4,d.y-2,3,2,'#b9b78d');}
    line([[966,153],[1004,190]],s.barrier<30?'#b47269':'#e4d6ad',10);
    ctx.restore();
    const entrance=projectCity(1080,98);text('외부 공기',entrance.x,entrance.y-25,14,'#dfecd5');
    const gate=projectCity(991,175);rect(gate.x-28,gate.y-25,57,5,2,'#4e6b58');rect(gate.x-28,gate.y-25,57*s.barrier/100,5,2,'#e7d99a');
    text('호흡기 관문',gate.x+12,gate.y+20,12,'#e8f2df');
  }
  function building(d,s,t){
    const {x,y}=d,ds=s.districts[d.id],pulse=reduced?0:Math.sin(t*4.2);
    if(d.id==='heart'){
      ellipse(x,y+24,70,37,'#927e69');ellipse(x,y+18,66,35,'#dbbf9a','#6e6d5b');
      cube(x-36,y+4,43,63,'#b87970','#edd0a4');cube(x+40,y+7,36,78,'#bd8078','#efc89d');
      ellipse(x,y-9,38+pulse*2,42+pulse*2,'#9d5e59','#603f3c');ellipse(x-4,y-15,29+pulse*2,32+pulse*2,'#e18e80');
      line([[x-21,y-12],[x-11,y-12],[x-5,y-25],[x+4,y+1],[x+12,y-12],[x+21,y-12]],'#ffe0ad',4);
      rect(x-10,y+28,20,13,3,'#be786e');
    }else if(d.id==='lung'){
      for(const side of [-1,1]){const bx=x+side*36;cube(bx,y+16,59,72,'#9ab4a4','#c9d7b5');ellipse(bx,y-59,30,13,'#dce4c7','#4c6d62');ellipse(bx,y-60,21,8,'#6d9d95');
        for(let n=0;n<4;n++){const a=t*1.4+n*TAU/4;line([[bx,y-60],[bx+Math.cos(a)*17,y-60+Math.sin(a)*6]],'#bed9c5',4);}
        for(let n=0;n<3;n++)line([[bx-16,y-28+n*12],[bx+16,y-28+n*12]],'#507f78',4);
      }line([[x,y-43],[x,y+19]],'#e1cca8',11);line([[x-33,y+31],[x-33,y+49],[x+38,y+49],[x+38,y+31]],'#acd9cd',9);
    }else if(d.id==='kidney'){
      cube(x,y+12,42,64,'#b9a3bf','#e6d3ba');
      for(const side of [-1,1]){const bx=x+side*45;ellipse(bx,y+15,28,39,'#86769b','#60596e');ellipse(bx-3,y+7,21,31,'#c0adc5');line([[bx-13,y-5],[bx+12,y-5]],'#837994',3);line([[bx-13,y+5],[bx+12,y+5]],'#837994',3);line([[bx-13,y+15],[bx+12,y+15]],'#837994',3);}
      line([[x-43,y+43],[x-43,y+53],[x+43,y+53],[x+43,y+43]],'#aacdcd',7);ellipse(x,y+50,5,4,'#e1f4de');
    }else if(d.id==='gut'){
      cube(x-22,y+22,93,65,'#c2a47b','#e1b06e');
      for(let i=0;i<5;i++)rect(x-70+i*20,y-21,20,20,[0,0,5,5],i%2?'#f2dfb0':'#ca8261');
      cube(x+48,y+23,37,41,'#c09b6e','#e6c691');
      for(const [dx,dy]of [[-46,27],[-26,34],[34,43]]){rect(x+dx,y+dy,18,15,2,'#dfc58e','#947f58');line([[x+dx+4,y+dy+3],[x+dx+14,y+dy+12]],'#b18e55',2);}
    }else if(d.id==='marrow'){
      cube(x,y+22,111,58,'#bc9c98','#d9b4a6');cube(x-37,y+4,31,68,'#b7888f','#e3c4ac');cube(x+37,y+4,31,68,'#b7888f','#e3c4ac');
      rect(x-18,y-23,36,26,4,'#d4b6ac');text('✚',x,y-9,25,'#f9ecce');rect(x-12,y+5,24,20,6,'#6b7263');
      line([[x+72,y+15],[x+72,y-36]],'#75674f',3);ctx.fillStyle='#e7ba81';ctx.beginPath();ctx.moveTo(x+73,y-36);ctx.lineTo(x+96,y-28);ctx.lineTo(x+73,y-20);ctx.fill();
    }else{
      cube(x,y+23,104,66,'#9eae83','#c8d2a4');
      ctx.beginPath();ctx.moveTo(x-62,y-41);ctx.lineTo(x,y-78);ctx.lineTo(x+62,y-41);ctx.closePath();ctx.fillStyle='#637d64';ctx.fill();ctx.strokeStyle='#45634f';ctx.lineWidth=3;ctx.stroke();
      for(let i=-1;i<=1;i++)rect(x+i*30-5,y-28,10,49,2,'#e6ddba','#9caa7e');text('Y',x,y-53,21,'#e2e1b6');
    }
    if(ds.tower){cube(x+85,y+18,25,40,'#b2ad89','#e9cf98');ellipse(x+85,y-27,17,9,'#f3d99f','#687059');text(String(ds.tower),x+85,y-28,12,'#4c6555');}
    rect(x-53,y+69,106,26,6,'#243d35e8');text(d.short+'  Lv.'+ds.level,x,y+82,13,'#f0e9cf');
    if(ds.hp<99){rect(x-41,y+100,82,4,2,'#4d6457');rect(x-41,y+100,82*ds.hp/100,4,2,ds.hp<40?'#ef9a80':'#cbd5a0');}
    if(ds.building){const b=ds.building;rect(x-60,y-111,120,23,5,'#ead6a5');text(b.remaining==null?'자재 배송 중':'작업 중 '+Math.ceil(100*(1-b.remaining/b.duration))+'%',x,y-99,12,'#4f5b43');}
  }
  function person(c,s,t){
    const {x,y}=c,bob=reduced?0:Math.sin(t*8+c.id)*1.3;
    ellipse(x+2,y+7,9,4,'#223c3b35');
    if(c.kind==='rbc'){
      ctx.save();ctx.translate(x,y);ctx.rotate(.3);ellipse(0,0,8,5,c.cargo?'#e48b80':'#b06d71','#754e54');ellipse(-1,-1,4,2,'#ae5a62');ctx.restore();
      if(c.cargo){ellipse(x+7,y-7,4,4,'#e6f8ec');text('₂',x+8,y-8,7,'#609389');}return;
    }
    const color=JOBS[c.kind].color;line([[x-3,y+3],[x-4,y+8+bob]],'#3d5348',3);line([[x+3,y+3],[x+4,y+8-bob]],'#3d5348',3);
    ellipse(x,y,8,c.kind==='macrophage'?10:8,color,'#536758');ellipse(x,y-6,6,6,'#f2dfb8');
    if(c.kind==='neutrophil'){rect(x-8,y-13,16,5,2,'#f7f0d7','#829785');rect(x-5,y-16,10,4,2,'#faf5df');line([[x+7,y+1],[x+15,y-7]],DRUG_COLOR(s.drug),4);}
    if(c.kind==='macrophage'){ellipse(x-2,y-10,7,3,'#9276b0');line([[x+8,y+2],[x+12,y+10]],'#c3b78e',3);}
    if(c.kind==='fibroblast'){rect(x-7,y-13,14,5,2,'#e9b764');line([[x+7,y],[x+13,y-5]],'#665f4b',3);rect(x+9,y-9,10,4,1,'#b5c6ae');}
    if(c.kind==='dendritic'){ellipse(x,y-11,8,4,'#7cac78');if(c.recordId)rect(x+7,y-4,9,10,2,'#e7d19f');}
    ellipse(x-2,y-6,1,1,'#394b43');ellipse(x+2,y-6,1,1,'#394b43');
  }
  function DRUG_COLOR(id){return {ampicillin:'#b6d38e',oxacillin:'#f0bb77',vancomycin:'#c1a6dd'}[id];}
  const scenery=[...DISTRICTS.map(d=>({kind:'building',entity:d,...projectCity(d.x,d.y)})),...TREES.map(([x,y])=>({kind:'tree',entity:{radius:9+x%6},...projectCity(x,y)})),...HOUSES.map(([x,y])=>({kind:'house',entity:{},...projectCity(x,y)}))];
  function shipment(sh){
      ellipse(sh.x+1,sh.y+6,10,4,'#213b3530');rect(sh.x-8,sh.y-7,16,12,3,sh.kind==='drug'?'#c6b1d8':sh.kind==='materials'?'#d8b580':'#dbc99c','#686d54');
      text(sh.kind==='drug'?'+':sh.kind==='materials'?'▥':'•',sh.x,sh.y-1,12,'#596451');ellipse(sh.x-5,sh.y+6,2.5,2.5,'#536a60');ellipse(sh.x+5,sh.y+6,2.5,2.5,'#536a60');
  }
  function enemy(e,t){
      const phase=reduced?0:Math.sin(t*5+e.id)*2;
      ellipse(e.x+2,e.y+8,13,5,'#243a3830');
      for(let i=0;i<8;i++){const a=i*TAU/8;line([[e.x+Math.cos(a)*8,e.y+Math.sin(a)*8],[e.x+Math.cos(a)*(15+phase),e.y+Math.sin(a)*(15+phase)]],e.color,3);}
      ellipse(e.x,e.y,11,12,e.color,'#566047');ellipse(e.x-3,e.y-2,2,2,'#f3e8b6');ellipse(e.x+3,e.y-2,2,2,'#f3e8b6');
      if(e.hp<e.maxHp){rect(e.x-12,e.y-21,24,3,2,'#6a7560');rect(e.x-12,e.y-21,24*Math.max(0,e.hp/e.maxHp),3,2,'#eac78d');}
  }
  function draw(s,{selected='lung',layer='city',paused=false,inset=0}={}){
    if(disposed||!width||!height)return;
    if(bottomInset!==inset){bottomInset=inset;dirty=true;}
    const now=performance.now();if(!dirty&&(paused||now-lastDraw<1000/30))return;
    dirty=false;lastDraw=now;camera();const t=s.time;
    if(!groundReady)drawGround();
    ctx.save();ctx.clearRect(0,0,width,height);ctx.fillStyle='#233a32';ctx.fillRect(0,0,width,height);ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
    ellipse(740,640,550,175,'#172e2b35');
    ctx.drawImage(terrain,0,0);groundActivity(s,t,selected,layer);
    const actors=[...scenery,...s.cells.map(c=>({kind:'cell',entity:c,...projectCity(c.x,c.y)})),...s.shipments.map(c=>({kind:'shipment',entity:c,...projectCity(c.x,c.y)})),...s.enemies.map(c=>({kind:'enemy',entity:c,...projectCity(c.x,c.y)}))];
    // One depth order for structures and moving units, so they pass behind buildings.
    actors.sort((a,b)=>a.y-b.y);
    for(const a of actors){const entity={...a.entity,x:a.x,y:a.y};
      if(a.kind==='building')building(entity,s,t);
      else if(a.kind==='tree')tree(a.x,a.y,a.entity.radius);
      else if(a.kind==='house')cube(a.x,a.y,27,24,'#e2d4af','#839a7c');
      else if(a.kind==='cell')person(entity,s,t);
      else if(a.kind==='shipment')shipment(entity);
      else enemy(entity,t);
    }
    for(const e of s.effects){const p=projectCity(e.x,e.y),target=projectCity(e.tx,e.ty);line([[p.x,p.y],[target.x,target.y]],e.color,2);ellipse(target.x,target.y,4,4,'#fff0bd');}
    const district=districtDef(s.rally),rally=projectCity(district.x-105,district.y+24);line([[rally.x,rally.y],[rally.x,rally.y-36]],'#ebdeb8',2);polygon([[rally.x+1,rally.y-36],[rally.x+23,rally.y-29],[rally.x+1,rally.y-21]],'#f5d38c');
    if(layer==='supply')for(const d of DISTRICTS){const p=projectCity(d.x,d.y);text(Math.round(s.districts[d.id].oxygen)+'% O₂',p.x,p.y+119,13,'#e3f0c9');}
    if(s.weather.id!=='clear'){
      ctx.fillStyle=s.weather.id==='fever'?'#dc8a5e0a':'#dcd4b21c';ctx.fillRect(0,0,VIEW.width,VIEW.height);
      if(s.weather.id==='fever'&&!reduced)for(let i=0;i<18;i++){const x=(i*137+t*12)%VIEW.width,y=(i*93+t*6)%VIEW.height;line([[x,y+12],[x+4,y],[x+1,y-12]],'#ebc18340',2);}
    }
    ctx.restore();
  }
  resize();
  return {draw,zoom:changeZoom,reset,invalidate(){dirty=true;},dispose(){disposed=true;observer.disconnect();abort.abort();terrain.width=0;terrain.height=0;pointers.clear();}};
}
