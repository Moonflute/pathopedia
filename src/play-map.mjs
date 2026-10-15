// Seeded route graph + authored room modules. Geometry is generated once per stage.
// Spelunky-style route-first composition; no generator or physics dependency at runtime.
import {buildOperation} from './play-operation-map.mjs';
const MODULES=['hall','elbow','split','gallery','dogleg','atrium'];
const NAMES={reception:'RECEPTION',hall:'CULTURE HALL',elbow:'TRANSFER WING',split:'TWIN WARD',gallery:'OBSERVATION',dogleg:'SERVICE WING',atrium:'CONCOURSE',supply:'RECOVERY',vault:'CONTAINMENT'};
export function buildFacility(stage,index,seed,random,{arena=false}={}){
 if(!arena)return buildOperation(stage,index,seed,random);
 const cols=random()<.5?3:4,rows=cols===3?3:2,pitch=18,width=cols*pitch+4,height=rows*pitch+4,n=width*height;
 const cells=new Uint8Array(n).fill(1),roomCells=new Int16Array(n).fill(-1),floors=new Float32Array(n),ceilings=new Float32Array(n).fill(1.65),lights=new Float32Array(n).fill(.78),stairs=new Uint8Array(n),rooms=[],route=[],ramps=[];
 const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
 const adjacent=id=>[id%cols? id-1:-1,id%cols<cols-1?id+1:-1,id>=cols?id-cols:-1,id<cols*(rows-1)?id+cols:-1].filter(i=>i>=0);
 const parents=new Map([[0,-1]]),depths=new Map([[0,0]]),tree=[],stack=[0];
 while(stack.length){const a=stack.at(-1),options=shuffle(adjacent(a).filter(b=>!parents.has(b)));if(!options.length){stack.pop();continue;}const b=options[0];parents.set(b,a);depths.set(b,depths.get(a)+1);tree.push([a,b]);stack.push(b);}
 // Keep the terminal on an outside edge, with enough progression before the exit.
 const terminal=[...parents.keys()].filter(i=>i%cols===cols-1||Math.floor(i/cols)===rows-1).sort((a,b)=>depths.get(b)-depths.get(a))[0];
 const main=[];for(let i=terminal;i>=0;i=parents.get(i))main.unshift(i);
 const order=[...main.slice(0,-1),...[...parents.keys()].filter(i=>!main.includes(i)),terminal],ids=new Map(order.map((node,id)=>[node,id]));
 const middleNode=main[Math.max(1,Math.floor(main.length/2))],restNode=main.length>4?main.at(-2):order.find(i=>i!==0&&i!==terminal&&i!==middleNode);
 const carve=(x,y,w,h,id)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx>0&&yy>0&&xx<width-1&&yy<height-1){const i=yy*width+xx;cells[i]=0;roomCells[i]=id;}};
 const localPoint=(r,x,y)=>{for(let t=0;t<r.rotation;t++)[x,y]=[15-y,x];return {x:r.bounds.x+x,y:r.bounds.y+y};};
 const tile=(r,x,y,value)=>{const p=localPoint(r,x,y),i=p.y*width+p.x;cells[i]=value;roomCells[i]=r.id;};
 const rect=(r,x,y,w,h,value=0)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tile(r,xx,yy,value);};
 const deckNode=main.find(i=>i!==0&&i!==terminal&&i!==restNode&&i!==middleNode)||middleNode;
 const modules=shuffle([...MODULES]);
 for(const [id,node] of order.entries()){
  const type=node===0?'reception':node===terminal?'vault':node===restNode?'supply':node===deckNode?'gallery':modules[(id-1)%modules.length];
  const x=1+node%cols*pitch,y=1+Math.floor(node/cols)*pitch,rotation=node===0?0:Math.floor(random()*4),size=node===0?9:16;
  const r={id,node,name:NAMES[type],label:String(id).padStart(2,'0'),x:x+size/2,y:y+size/2,bounds:{x,y,w:size,h:size},rotation,type,encounter:!['reception','supply'].includes(type),rest:type==='supply',order:id,neighbors:[]};rooms.push(r);
  if(type==='reception')carve(x,y,9,9,id);
  else if(type==='hall'){rect(r,0,3,16,10);rect(r,3,1,5,14);}
  else if(type==='elbow'){rect(r,0,0,7,16);rect(r,0,9,16,7);}
  else if(type==='supply'){rect(r,3,2,10,12);rect(r,1,6,14,4);}
  else{
   rect(r,0,0,16,16);
   if(type==='split')rect(r,7,0,2,11,3);
   if(type==='dogleg'){rect(r,5,0,2,8,3);rect(r,10,8,2,8,3);}
   if(['atrium','vault'].includes(type))for(const [xx,yy] of [[0,0],[13,0],[0,13],[13,13]])rect(r,xx,yy,3,3,2);
   if(type==='gallery'){
    // A broad raised deck with five real treads; the outer circulation stays at ground level.
    for(let yy=3;yy<=12;yy++)for(let xx=3;xx<=12;xx++){const p=localPoint(r,xx,yy),i=p.y*width+p.x;floors[i]=Math.min(.6,(13-yy)*.12);if(yy>=8)stairs[i]=1;}
    const bottom=localPoint(r,7,13),top=localPoint(r,7,6);ramps.push({room:id,bottom:{x:bottom.x+.5,y:bottom.y+.5},top:{x:top.x+.5,y:top.y+.5}});
   }
  }
  for(let yy=y;yy<y+size;yy++)for(let xx=x;xx<x+size;xx++){const i=yy*width+xx;roomCells[i]=id;lights[i]=r.rest?.98:type==='gallery'?.87:type==='vault'?.8:.83+random()*.08;ceilings[i]=type==='gallery'?2.15:['atrium','vault'].includes(type)?1.95:1.65;}
 }
 const line=(a,b,id,size=3)=>{let x=a.x,y=a.y;for(;;){carve(x-1,y-1,size,size,id);if(x===b.x&&y===b.y)break;if(x!==b.x)x+=Math.sign(b.x-x);else y+=Math.sign(b.y-y);}};
 const port=(r,dx,dy)=>{
  const {x,y,w,h}=r.bounds,along=r.id===0?6:5+Math.floor(random()*6),p={x:dx?x+(dx>0?w-1:0):x+along,y:dy?y+(dy>0?h-1:0):y+along};
  let closest=null,d=Infinity;for(let yy=y+1;yy<y+h-1;yy++)for(let xx=x+1;xx<x+w-1;xx++){const i=yy*width+xx;if(cells[i]||floors[i]>.01)continue;const nd=Math.abs(p.x-xx)+Math.abs(p.y-yy);if(nd<d){d=nd;closest={x:xx,y:yy};}}
  line(p,closest,r.id);return p;
 };
 const links=[],edgeKey=(a,b)=>[Math.min(a,b),Math.max(a,b)].join(':');
 const used=new Set(tree.map(([a,b])=>edgeKey(a,b))),spare=shuffle(order.flatMap(a=>adjacent(a).filter(b=>a<b&&!used.has(edgeKey(a,b))).map(b=>[a,b])));
 const openLoops=spare.filter(([a,b])=>a!==0&&b!==0&&a!==terminal&&b!==terminal).slice(0,arena?3:1);
 for(const e of openLoops)used.add(edgeKey(...e));
 const shortcut=spare.find(([a,b])=>!used.has(edgeKey(a,b))&&(a===0||b===0))||spare.find(e=>!used.has(edgeKey(...e)));
 const connections=[...tree.map(e=>({e,kind:'route'})),...openLoops.map(e=>({e,kind:'loop'})),...(shortcut?[{e:shortcut,kind:arena?'loop':'shortcut'}]:[])],shortcuts=[];
 for(const {e:[a,b],kind} of connections){
  const ra=rooms[ids.get(a)],rb=rooms[ids.get(b)],dx=Math.sign(b%cols-a%cols),dy=Math.sign(Math.floor(b/cols)-Math.floor(a/cols)),pa=port(ra,dx,dy),pb=port(rb,-dx,-dy);
  const mid=dx?Math.floor((Math.max(ra.bounds.x,rb.bounds.x)+Math.min(ra.bounds.x+ra.bounds.w,rb.bounds.x+rb.bounds.w))/2):Math.floor((Math.max(ra.bounds.y,rb.bounds.y)+Math.min(ra.bounds.y+ra.bounds.h,rb.bounds.y+rb.bounds.h))/2);
  const points=dx?[pa,{x:mid,y:pa.y},{x:mid,y:pb.y},pb]:[pa,{x:pa.x,y:mid},{x:pb.x,y:mid},pb];
  for(let k=1;k<points.length;k++)line(points[k-1],points[k],k<2?ra.id:rb.id);
  ra.neighbors.push(rb.id);rb.neighbors.push(ra.id);links.push({a:ra.id,b:rb.id,kind});
  if(kind==='shortcut'){
   // Gate sits across the connector, never across the guaranteed spanning route.
   const gate=[];for(let t=-1;t<=1;t++){const x=dx?mid:pa.x+t,y=dy?mid:pa.y+t,i=y*width+x;cells[i]=6;gate.push(i);}shortcuts.push({cells:gate,open:false,room:ids.get(middleNode)});
  }
 }
 const point=(r,dx=0,dy=0)=>{let best=null,d=Infinity;for(let y=r.bounds.y+1;y<r.bounds.y+r.bounds.h-1;y++)for(let x=r.bounds.x+1;x<r.bounds.x+r.bounds.w-1;x++){const i=y*width+x;if(cells[i]||stairs[i])continue;const nd=Math.hypot(x+.5-r.x-dx,y+.5-r.y-dy);if(nd<d){d=nd;best={x:x+.5,y:y+.5};}}return best;};
 const final=rooms[ids.get(terminal)],middle=rooms[ids.get(middleNode)],east=terminal%cols===cols-1&&(Math.floor(terminal/cols)!==rows-1||random()<.5),normal={x:east?1:0,y:east?0:1},p=port(final,normal.x,normal.y);
 const center={x:p.x+normal.x+ .5,y:p.y+normal.y+.5},exit={x:center.x+normal.x*2,y:center.y+normal.y*2},approach={x:center.x-normal.x*2,y:center.y-normal.y*2};
 line(p,{x:Math.floor(exit.x),y:Math.floor(exit.y)},final.id);
 const doorCells=[],frameCells=[];
 for(let t=-2;t<=2;t++){const x=Math.floor(center.x)+(east?0:t),y=Math.floor(center.y)+(east?t:0),i=y*width+x;cells[i]=Math.abs(t)===2?8:7;roomCells[i]=final.id;if(Math.abs(t)===2)frameCells.push(i);else doorCells.push(i);}
 // The exit is a short walk-through airlock in the perimeter wall, not a billboard.
 const exitDoor={cells:doorCells,frameCells,center,normal,approach,open:0,spanStart:(east?center.y:center.x)-1.5};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(roomCells[i]<0){let best=Infinity,nearest=0;for(const r of rooms){const d=(r.x-x)**2+(r.y-y)**2;if(d<best){best=d;nearest=r.id;}}roomCells[i]=nearest;if(cells[i]===1)cells[i]=1+(nearest+index)%5;}}
 for(const node of main)route.push(point(rooms[ids.get(node)]));
 const rest=rooms[ids.get(restNode)],first=rooms[ids.get(main[1])];
 const pickups=[{x:5.5,y:2.5,kind:'supply'},{...point(first,-3,-2),kind:'culture'},{...point(rooms[ids.get(deckNode)],3,-2),kind:'supply'},{...point(middle,-3,3),kind:'companion'},{...point(rest,-2,0),kind:'health'},{...point(rest,2,1),kind:'supply'}].map((p,id)=>({...p,id,active:true,cooldown:0}));
 const props=[];for(const r of rooms)if(r.id)for(let k=0;k<2;k++){const p=point(r,k?5:-5,k?-5:5);if(p)props.push({...p,kind:k?'terminal':'rack',room:r.id});}
 const family=cols===3?'BRANCHING WINGS':'LONGITUDINAL WARD';
 return {id:stage.id+'-'+seed+(arena?'-arena':''),theme:(seed+index)%4,biome:['virology','parasitology'].includes(stage.id)?stage.id:'facility',name:stage.name,layout:family+' / '+rooms.length+' SECTORS',site:stage.site,scenarios:stage.scenarios||[],color:stage.color,width,height,cells,roomCells,floors,ceilings,lights,stairs,rooms,route,links,ramps,props,spawn:{x:3.5,y:3.5,angle:0},exit,exitDoor,boss:stage.boss||stage.bossKind?point(final,1,-1):null,miniboss:point(middle),portals:rooms.map(r=>point(r)),shortcuts,pickups};
}
