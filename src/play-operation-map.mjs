// Authored routes and encounter modules, composed with a seeded PRNG.
// Floors occupy isolated chunks of one small grid. Stair links preserve all world state.
const CHUNK=78,HEIGHT=68;
const ROUTES=[
 {id:'forward',label:'TRANSFER ROUTE',lower:[[2,2,19,15],[23,3,27,15],[45,27,27,25],[10,40,23,23]],upper:[[3,41,16,22],[25,32,27,26],[48,3,25,22],[4,3,29,23]],loops:[[1,3],[4,6]]},
 {id:'circuit',label:'OBSERVATION LOOP',lower:[[2,2,19,15],[23,20,26,25],[53,39,20,24],[3,39,16,24]],upper:[[3,41,17,22],[25,25,26,29],[52,3,21,24],[4,3,31,18]],loops:[[1,3],[5,7]]},
 {id:'ascent',label:'TERRACED WINGS',lower:[[2,2,19,15],[22,3,17,32],[47,5,26,25],[45,42,24,21]],upper:[[3,41,18,22],[4,4,27,25],[41,5,30,19],[44,36,29,27]],loops:[[1,3],[4,6]]},
 {id:'braided',label:'SPLIT APPROACH',lower:[[2,2,19,15],[25,3,29,18],[43,35,29,27],[6,39,23,24]],upper:[[3,41,18,22],[3,4,27,25],[40,3,31,25],[40,41,31,22]],loops:[[1,3],[4,6]]}
];
const NAMES={entry:'ARRIVAL',concourse:'TRANSFER HALL',laboratory:'CULTURE LAB',gallery:'OBSERVATION',switchback:'SERVICE WING',terraces:'TERRACED WARD',recovery:'RECOVERY',landing:'UPPER LANDING',vault:'CONTAINMENT'};
export function buildOperation(stage,index,seed,random){
 const template=ROUTES[Math.floor(random()*ROUTES.length)],width=CHUNK*2,height=HEIGHT,n=width*height;
 const cells=new Uint8Array(n).fill(1),roomCells=new Int16Array(n).fill(-1),floors=new Float32Array(n),ceilings=new Float32Array(n).fill(2.1),lights=new Float32Array(n).fill(.8),stairs=new Uint8Array(n),floorMaterials=new Uint8Array(n),rooms=[],ramps=[],links=[],transitions=[],shortcuts=[],props=[];
 const levels=[{id:0,label:'1F',name:'LOWER WING',x:0,y:0,w:CHUNK,h:HEIGHT},{id:1,label:'2F',name:'UPPER WING',x:CHUNK,y:0,w:CHUNK,h:HEIGHT}];
 const biome=stage.id==='virology'?'virology':stage.id==='parasitology'?'parasitology':'facility';
 const put=(x,y,id,value=0)=>{if(x<=0||y<=0||x>=width-1||y>=height-1)return;const i=y*width+x;cells[i]=value;roomCells[i]=id;};
 const rect=(x,y,w,h,id,value=0)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,id,value);};
 const shapes=['concourse','laboratory','gallery','switchback','terraces'];
 for(let id=0;id<8;id++){
  const level=id<4?0:1,[lx,y,w,h]=(level?template.upper:template.lower)[id%4],x=lx+level*CHUNK;
  let type=id===0?'entry':id===3?'recovery':id===4?'landing':id===7?'vault':shapes[(id+Math.floor(random()*3))%shapes.length];
  if(type===rooms.at(-1)?.type)type=shapes[(shapes.indexOf(type)+1)%shapes.length];
  const role=id===0?'arrival':id===3||id===4?'rest':id===5?'mid':id===7?'boss':id===1?'scout':'combat';
  const r={id,node:id,name:NAMES[type],label:(id+1).toString().padStart(2,'0'),level,x:x+w/2,y:y+h/2,bounds:{x,y,w,h},type,role,encounter:!['arrival','rest'].includes(role),rest:role==='rest',order:id,neighbors:[],anchors:[]};rooms.push(r);
  rect(x,y,w,h,id);
  if(['concourse','vault'].includes(type))for(const [xx,yy]of [[x,y],[x+w-3,y],[x,y+h-3],[x+w-3,y+h-3]])rect(xx,yy,3,3,id,2);
  if(type==='laboratory'){rect(x+3,y+3,Math.max(3,w-10),2,id,3);rect(x+w-5,y+7,2,Math.max(3,h-11),id,3);}
  if(type==='switchback'){rect(x+Math.floor(w*.35),y,2,Math.floor(h*.5),id,3);rect(x+Math.floor(w*.68),y+Math.floor(h*.52),2,Math.floor(h*.48),id,3);}
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
   const i=yy*width+xx;roomCells[i]=id;ceilings[i]=['concourse','gallery','vault'].includes(type)?2.65:2.1;lights[i]=r.rest?.98:role==='boss'?.83:.86+random()*.06;floorMaterials[i]=type==='laboratory'?1:type==='terraces'||biome==='parasitology'?2:level?3:0;
  }
  if(type==='gallery'||type==='terraces'||id===2){
   const span=Math.max(4,Math.floor(w*.36)),sx=x+w-span-2,sy=y+2,end=y+h-3;
   for(let yy=sy;yy<=end;yy++)for(let xx=sx;xx<sx+span;xx++){const i=yy*width+xx;if(cells[i])continue;floors[i]=Math.min(.72,Math.max(0,(end-yy)*.12));stairs[i]=end-yy<6?1:0;ceilings[i]=2.65;}
   ramps.push({room:id,bottom:{x:sx+1.5,y:end+.5},top:{x:sx+1.5,y:end-6+.5}});
  }
  if(level)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=yy*width+xx;floors[i]+=.84;ceilings[i]+=.84;}
 }
 const dig=(a,b,id,size=3)=>{let x=Math.floor(a.x),y=Math.floor(a.y),ex=Math.floor(b.x),ey=Math.floor(b.y);for(;;){for(let dy=-1;dy<size-1;dy++)for(let dx=-1;dx<size-1;dx++){const i=(y+dy)*width+x+dx;if(cells[i]){put(x+dx,y+dy,id);floors[i]=x+dx>=CHUNK?.84:0;ceilings[i]=2.1+floors[i];}}if(x===ex&&y===ey)break;if(x!==ex)x+=Math.sign(ex-x);else y+=Math.sign(ey-y);}};
 const point=(r,dx=0,dy=0,{flat=false}={})=>{let best,d=Infinity;for(let y=r.bounds.y+1;y<r.bounds.y+r.bounds.h-1;y++)for(let x=r.bounds.x+1;x<r.bounds.x+r.bounds.w-1;x++){
  const i=y*width+x;if(cells[i]||stairs[i]||flat&&floors[i]>(r.level?.85:.01))continue;const nd=(x+.5-r.x-dx)**2+(y+.5-r.y-dy)**2;if(nd<d){best={x:x+.5,y:y+.5};d=nd;}}
  return best;
 };
 function connect(a,b,kind='route'){
  const ra=rooms[a],rb=rooms[b],horizontal=Math.abs(ra.x-rb.x)>Math.abs(ra.y-rb.y),sign=horizontal?Math.sign(rb.x-ra.x):Math.sign(rb.y-ra.y);
  const port=r=>horizontal?{x:sign*(r===ra?1:-1)>0?r.bounds.x+r.bounds.w-1:r.bounds.x,y:Math.floor(r.y)}:{x:Math.floor(r.x),y:sign*(r===ra?1:-1)>0?r.bounds.y+r.bounds.h-1:r.bounds.y};
  const pa=port(ra),pb=port(rb),ma=point(ra,pa.x-ra.x,pa.y-ra.y,{flat:true}),mb=point(rb,pb.x-rb.x,pb.y-rb.y,{flat:true});
  dig(ma,pa,a);dig(pb,mb,b);
  const mid=horizontal?Math.floor((pa.x+pb.x)/2):Math.floor((pa.y+pb.y)/2),turn1=horizontal?{x:mid,y:pa.y}:{x:pa.x,y:mid},turn2=horizontal?{x:mid,y:pb.y}:{x:pb.x,y:mid};
  dig(pa,turn1,a);dig(turn1,turn2,a);dig(turn2,pb,b);links.push({a,b,kind});ra.neighbors.push(b);rb.neighbors.push(a);
 }
 for(const pair of [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7]])connect(...pair);
 for(const pair of template.loops)connect(...pair,'loop');
 function stair(r,label,returnBay=false){
  const x=returnBay?3:r.bounds.x+r.bounds.w-5,y=returnBay?23:r.bounds.y+2,w=3,h=returnBay?10:Math.min(10,r.bounds.h-3);
  rect(x-1,y-1,w+2,h+1,r.id,5);rect(x,y,w,h,r.id);
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){const i=(y+yy)*width+x+xx;const rise=Math.min(.84,(h-1-yy)*.12);floors[i]=r.level?.84-rise:rise;stairs[i]=1;ceilings[i]=2.8+(r.level?.84:0);}
  const end={x:x+1.5,y:y+.5},arrival={x:x+1.5,y:y+2.5,angle:Math.PI/2};
  ramps.push({room:r.id,bottom:{x:x+1.5,y:y+h-.5},top:{x:x+1.5,y:y+1.5}});
  if(returnBay){dig({x:x+1,y:y+h},{x:8,y:y+h},r.id);dig({x:8,y:y+h},{x:8,y:15},r.id);dig({x:8,y:15},{x:4,y:15},r.id);}else dig({x:x+1,y:y+h},point(r,-3,2,{flat:true}),r.id);
  return {label,level:r.level,room:r.id,...end,arrival,cell:Math.floor(end.y)*width+Math.floor(end.x)};
 }
 const up=stair(rooms[3],'2F ↑'),down=stair(rooms[4],'1F ↓'),returnUpper=stair(rooms[7],'1F EXIT ↓'),returnLower=stair(rooms[0],'2F ↗',true);
 function join(a,b,locked=false){const id=transitions.length;transitions.push({...a,id,to:id+1,locked},{...b,id:id+1,to:id,locked});links.push({a:a.room,b:b.room,kind:locked?'shortcut':'stairs'});rooms[a.room].neighbors.push(b.room);rooms[b.room].neighbors.push(a.room);}
 join(up,down);join(returnUpper,returnLower,true);
 shortcuts.push({cells:[],open:false,trigger:'boss',transitions:[2,3],room:7});
 const signs=Object.fromEntries(transitions.map(t=>[(Math.floor(t.y)-1)*width+Math.floor(t.x),t.id]));
 const center={x:11.5,y:18.5},normal={x:0,y:1},exit={x:11.5,y:20.5},approach={x:11.5,y:16.5};
 rect(10,15,3,7,0);const doorCells=[],frameCells=[];
 for(let t=-2;t<=2;t++){const i=18*width+11+t;cells[i]=Math.abs(t)===2?8:7;roomCells[i]=0;(Math.abs(t)===2?frameCells:doorCells).push(i);}
 const exitDoor={cells:doorCells,frameCells,center,normal,approach,open:0,spanStart:center.x-1.5};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(roomCells[i]>=0)continue;const level=x<CHUNK?0:1;let nearest=rooms[level*4],d=Infinity;for(const r of rooms.filter(r=>r.level===level)){const nd=(r.x-x)**2+(r.y-y)**2;if(nd<d){d=nd;nearest=r;}}roomCells[i]=nearest.id;if(cells[i]===1)cells[i]=1+(nearest.id+index)%5;}
 for(const r of rooms){
  for(const [dx,dy]of [[-r.bounds.w*.3,-r.bounds.h*.28],[r.bounds.w*.27,r.bounds.h*.25],[-r.bounds.w*.25,r.bounds.h*.28],[r.bounds.w*.2,-r.bounds.h*.25]]){const p=point(r,dx,dy);if(p&&!transitions.some(t=>Math.hypot(t.x-p.x,t.y-p.y)<3)&&!r.anchors.some(a=>Math.hypot(a.x-p.x,a.y-p.y)<2))r.anchors.push(p);}
  if(r.id)for(const [k,dx,dy]of [[0,-r.bounds.w*.33,-r.bounds.h*.34],[1,r.bounds.w*.3,r.bounds.h*.3]]){const p=point(r,dx,dy);if(p)props.push({...p,kind:k?'terminal':'rack',room:r.id});}
 }
 const pickups=[{x:5.5,y:2.5,kind:'supply'},{...point(rooms[1],-5,3),kind:'culture'},{...point(rooms[3],-5,-3),kind:'health'},{...point(rooms[3],-5,3),kind:'supply'},{...point(rooms[4],-3,3),kind:'supply'},{...point(rooms[5],-5,4),kind:'companion'},{...point(rooms[6],-4,3),kind:'supply'}].map((p,id)=>({...p,id,active:true,cooldown:0}));
 return {id:stage.id+'-'+seed,theme:(seed+index)%4,biome,name:stage.name,layout:template.label+' / 2 FLOORS',routeFamily:template.id,site:stage.site,scenarios:stage.scenarios||[],color:stage.color,width,height,cells,roomCells,floors,ceilings,lights,stairs,floorMaterials,rooms,levels,transitions,signs,links,ramps,props,pickups,exit,exitDoor,shortcuts,spawn:{x:3.5,y:3.5,angle:0},boss:point(rooms[7],-3,-1),miniboss:point(rooms[5],-3,1),portals:rooms.map(r=>point(r)),route:rooms.map(r=>point(r))};
}
