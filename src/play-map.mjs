// Authored encounter spaces, connected by seeded route choices. No runtime map dependency.
export function buildFacility(stage,index,seed,random){
 const width=52,height=38,n=width*height,cells=new Uint8Array(n).fill(1),roomCells=new Int16Array(n).fill(-1),floors=new Float32Array(n),ceilings=new Float32Array(n).fill(1.55),lights=new Float32Array(n).fill(.72),stairs=new Uint8Array(n),rooms=[],route=[];
 const jitter=()=>Math.floor(random()*3)-1;
 const shapes=[
  ['RECEPTION',1,1,9,9,'reception',false],
  ['CULTURE HALL',15+jitter(),2,13+(seed%3),10+((seed>>>3)%2),'hall',true],
  ['OBSERVATION',34,2,15,12,'gallery',true],
  ['FOCUS CHAMBER',34,21+jitter(),14+((seed>>>4)%2),12+((seed>>>5)%2),'chamber',true],
  ['RECOVERY',18,25,11,9,'supply',false],
  ['CONTAINMENT',2,22,12,12,'vault',true]
 ];
 const carve=(x,y,w,h,id)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(xx>0&&yy>0&&xx<width-1&&yy<height-1){const i=yy*width+xx;cells[i]=0;roomCells[i]=id;}};
 for(const [id,[name,x,y,w,h,type,encounter]] of shapes.entries()){
  carve(x,y,w,h,id);
  const r={id,name,label:String(id).padStart(2,'0'),x:x+w/2,y:y+h/2,bounds:{x,y,w,h},type,encounter,rest:id===4,order:id,neighbors:[]};rooms.push(r);
  // Wall-attached work bays and chamfered corners keep the central route open.
  if(['gallery','chamber','vault'].includes(type))for(const [xx,yy] of [[x,y],[x+w-1,y],[x,y+h-1],[x+w-1,y+h-1]])cells[yy*width+xx]=2;
  if(type==='hall')for(const yy of [y+2+(seed%2),y+h-3]){cells[yy*width+x]=3;cells[yy*width+x+w-1]=3;}
  if(type==='supply'){cells[y*width+x]=4;cells[(y+1)*width+x]=4;cells[y*width+x+1]=4;}
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){lights[yy*width+xx]=[.9,.93,.8,.7,.94,.76][id];ceilings[yy*width+xx]=id===2?1.95:id===3?1.8:1.55;}
 }
 const corridor=(points,a,b,size=3)=>{
  for(let k=1;k<points.length;k++){let [x,y]=points[k-1], [ex,ey]=points[k];while(x!==ex||y!==ey){carve(x-1,y-1,size,size,a);if(x!==ex)x+=Math.sign(ex-x);else y+=Math.sign(ey-y);}carve(x-1,y-1,size,size,b);}
  if(!rooms[a].neighbors.includes(b)){rooms[a].neighbors.push(b);rooms[b].neighbors.push(a);}route.push(...points.map(([x,y])=>({x:x+.5,y:y+.5})));
 };
 corridor([[7,8],[7,15],[20,15],[20,10]],0,1);
 corridor([[25,11],[31,11],[31,12],[37,12]],1,2);
 corridor([[44,12],[44,23]],2,3,4);
 corridor([[37,28],[24,28]],3,4,4);
 corridor([[20,29],[11,29]],4,5);
 // Optional side approach. The destination and its role are stable, its entry changes per seed.
 if(seed%2===0)corridor([[36,12],[31,12],[31,21],[25,21],[25,27]],2,4);
 else corridor([[25,12],[30,12],[30,18],[38,18],[38,24]],1,3);
 // A five-tread staircase leads to a genuine raised observation deck.
 const gallery=rooms[2];
 for(let y=gallery.bounds.y;y<gallery.bounds.y+gallery.bounds.h;y++)for(let x=gallery.bounds.x;x<gallery.bounds.x+gallery.bounds.w;x++){
  const i=y*width+x;floors[i]=Math.max(0,Math.min(.6,(12-y)*.12));if(y>=7&&y<=11&&!cells[i])stairs[i]=1;
 }
 // Reconnect the familiar entry area after the middle encounter. No keys to collect.
 corridor([[7,15],[7,24]],0,5);
 const gateCells=[];for(let y=17;y<=18;y++)for(let x=6;x<=8;x++){const i=y*width+x;cells[i]=6;gateCells.push(i);}
 for(const r of rooms)for(let y=r.bounds.y;y<r.bounds.y+r.bounds.h;y++)for(let x=r.bounds.x;x<r.bounds.x+r.bounds.w;x++)roomCells[y*width+x]=r.id;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(roomCells[i]<0){let best=Infinity,nearest=0;for(const r of rooms){const d=(r.x-x)**2+(r.y-y)**2;if(d<best){best=d;nearest=r.id;}}roomCells[i]=nearest;if(cells[i])cells[i]=1+(nearest+index)%6;}}
 const point=(r,dx=0,dy=0)=>{let best=null,d=Infinity;for(let y=r.bounds.y+1;y<r.bounds.y+r.bounds.h-1;y++)for(let x=r.bounds.x+1;x<r.bounds.x+r.bounds.w-1;x++){if(cells[y*width+x]||stairs[y*width+x])continue;const nd=Math.hypot(x+.5-r.x-dx,y+.5-r.y-dy);if(nd<d){d=nd;best={x:x+.5,y:y+.5};}}return best;};
 const final=rooms[5],middle=rooms[3],exit=point(final,-3,3),sourceRooms=[middle,final];
 const sources=sourceRooms.map((r,id)=>({...point(r,3,0),id,label:String.fromCharCode(65+id)+' / '+stage.source,active:true}));
 const pickups=[{x:5.5,y:2.5,kind:'supply'},{...point(rooms[1],-4,-2),kind:'culture'},{...point(gallery,3,-3),kind:'supply'},{...point(middle,-3,3),kind:'companion'},{...point(rooms[4],-3,0),kind:'health'},{...point(rooms[4],2,1),kind:'supply'}].map((p,id)=>({...p,id,active:true,cooldown:0}));
 const props=[];
 for(const r of rooms)for(let k=0;k<2;k++){const p=point(r,k?3:-3,k?-3:3);if(p&&Math.hypot(p.x-3.5,p.y-3.5)>3)props.push({...p,kind:k?'terminal':'rack',room:r.id});}
 return {id:stage.id+'-'+seed,theme:(seed+index)%4,biome:stage.id==='virology'||stage.id==='parasitology'?stage.id:'facility',name:stage.name,layout:'OBSERVATION LOOP / 6 SECTORS',site:stage.site,scenarios:stage.scenarios||[],color:stage.color,width,height,cells,roomCells,floors,ceilings,lights,stairs,rooms,route,props,spawn:{x:3.5,y:3.5,angle:0},exit,boss:stage.boss||stage.bossKind?point(final,1,-1):null,miniboss:point(middle,0,0),portals:rooms.map(r=>point(r)),shortcuts:[{cells:gateCells,open:false,room:middle.id}],sources,pickups};
}
