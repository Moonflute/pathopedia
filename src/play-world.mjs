// Shared spatial rules for drawing, navigation, aiming and collision.
export const STEP_HEIGHT=.135;
export function floorAt(map,x,y){return map.floors?.[Math.floor(y)*map.width+Math.floor(x)]||0;}
export function ceilingAt(map,x,y){return map.ceilings?.[Math.floor(y)*map.width+Math.floor(x)]||1.55;}
export const enemyHeight=e=>e.state==='Dormant'?.34:e.boss?1.02:e.miniboss?.84:e.elite?.78:.68;
export function eyeAt(map,body){return body.eyeZ??floorAt(map,body.x,body.y)+(body.z||0)+(body.kind?enemyHeight(body)*.5:.5);}
export function canTraverse(map,from,to){return !map.cells[to]&&floorAt(map,to%map.width,Math.floor(to/map.width))-floorAt(map,from%map.width,Math.floor(from/map.width))<=STEP_HEIGHT;}
export function clearHeightRay(map,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),az=eyeAt(map,a),bz=eyeAt(map,b),steps=Math.ceil(d/.18);
 for(let i=1;i<steps;i++){const t=i/steps,x=a.x+dx*t,y=a.y+dy*t,z=az+(bz-az)*t;if(z<floorAt(map,x,y)+.025||z>ceilingAt(map,x,y))return false;}return true;
}

export function levelAt(map,x,y){return map.levels?.find(l=>x>=l.x&&x<l.x+l.w&&y>=l.y&&y<l.y+l.h)?.id??0;}
export function sameLevel(map,a,b){return levelAt(map,a.x,a.y)===levelAt(map,b.x,b.y);}
// Stair portals are bidirectional graph edges; ordinary neighbors retain height collision.
export function walkableNeighbors(map,cell,{reverse=false}={}){
 const result=[];for(const n of [cell-1,cell+1,cell-map.width,cell+map.width])if(n>=0&&n<map.cells.length&&Math.abs(n%map.width-cell%map.width)<=1&&(reverse?canTraverse(map,n,cell):canTraverse(map,cell,n)))result.push(n);
 for(const t of map.transitions||[])if(!t.locked&&t.cell===cell){const other=map.transitions[t.to];if(!other.locked)result.push(other.cell);}
 return result;
}
