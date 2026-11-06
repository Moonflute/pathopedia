export const TILE=16,COLS=48,ROWS=34;
const p=(x,y)=>({x:x*TILE,y:y*TILE});
const room=(id,name,organ,x,y,w,h,color,floor,door,work,symbol,action,result)=>({id,name,organ,x,y,w,h,color,floor,door,work:p(...work),symbol,action,result});
export const SITES=[
  room('lung','산소 공급부','폐',4,4,11,7,'#6e9d98','#d5e2d5',[[9,10],[10,10]],[8.5,8.5],'air','산소 충전 돕기','산소 공급부에 일손을 보탰어요.'),
  room('brain','신호 관제부','뇌',18,4,12,7,'#a08bab','#e0d9e6',[[23,10],[24,10]],[22.5,8.5],'signal','신호 설비 돕기','관제 설비가 조금 더 빠르게 움직여요.'),
  room('gut','영양 가공부','장',33,4,11,7,'#c29a65','#eee0c5',[[38,10],[39,10]],[36.5,8.5],'food','식량 포장 돕기','식량 포장에 일손을 보탰어요.'),
  room('heart','순환 동력부','심장',4,14,10,8,'#bb7c78','#ead3cb',[[13,17],[13,18]],[8.5,19.5],'heart','펌프 가동 돕기','두근두근, 벨트가 힘차게 돌아가요.'),
  room('marrow','조직 수선부','골수',34,14,10,8,'#b0956c','#e7ddc4',[[34,17],[34,18]],[39.5,19.5],'bone','수선 작업 돕기','수선 작업에 일손을 보탰어요.'),
  room('liver','물자 정리부','간',4,25,11,7,'#9d9174','#dedec8',[[9,25],[10,25]],[8.5,29.5],'leaf','분류 작업 돕기','회수한 물자를 함께 분류해요.'),
  room('kidney','노폐물 여과부','신장',33,25,11,7,'#779ba8','#d6e1df',[[38,25],[39,25]],[36.5,29.5],'water','여과 설비 돕기','여과 설비가 부지런히 움직여요.'),
];
export const LOUNGE={id:'lounge',name:'직원 휴게실',x:18,y:25,w:12,h:7,color:'#8e9c78',floor:'#e8dfc8',door:[[23,25],[24,25]]};
export const ROOMS=[...SITES,LOUNGE];
export const POINTS={...Object.fromEntries(SITES.map(s=>[s.id,s.work])),plaza:p(24.5,21.5),lounge:p(24.5,29.5),dispatch:p(26.5,18.5),coffee:p(21.5,29.5)};
export const FIXTURES=[
  {room:'lung',kind:'oxygen',x:6,y:6,w:6,h:2},
  {room:'brain',kind:'control',x:20,y:6,w:7,h:2},
  {room:'gut',kind:'kitchen',x:35,y:6,w:6,h:2},
  {room:'heart',kind:'pump',x:6,y:16,w:5,h:2},
  {room:'marrow',kind:'workbench',x:37,y:16,w:4,h:2},
  {room:'liver',kind:'sorting',x:6,y:27,w:3,h:2},
  {room:'kidney',kind:'filter',x:35,y:27,w:3,h:2},
  {room:'lounge',kind:'sofa',x:20,y:27,w:3,h:1},
  {room:'lounge',kind:'coffee',x:26,y:27,w:2,h:2},
  {room:'hall',kind:'dispatch',x:22,y:16,w:4,h:2},
];
export const BELT=[p(16.5,12.5),p(31.5,12.5),p(31.5,23.5),p(16.5,23.5),p(16.5,12.5)];
export const BELT_LENGTH=52*TILE;
export const BRIDGES=[{x:23,y:12,w:2,h:1},{x:31,y:19,w:1,h:2},{x:23,y:23,w:2,h:1},{x:16,y:19,w:1,h:2}];
const port=(offset,points)=>({offset:offset*TILE,path:points.map(v=>p(...v))});
export const PORTS={
  lung:port(0,[[16.5,12.5],[10.5,12.5],[10.5,9.5]]),
  brain:port(8,[[24.5,12.5],[24.5,9.5]]),
  gut:port(15,[[31.5,12.5],[38.5,12.5],[38.5,9.5]]),
  marrow:port(20,[[31.5,17.5],[35.5,17.5]]),
  kidney:port(26,[[31.5,23.5],[38.5,23.5],[38.5,27.5]]),
  liver:port(41,[[16.5,23.5],[10.5,23.5],[10.5,27.5]]),
  heart:port(47,[[16.5,17.5],[12.5,17.5]]),
};
export function pathLength(path){return path.slice(1).reduce((sum,q,i)=>sum+Math.abs(q.x-path[i].x)+Math.abs(q.y-path[i].y),0);}
// Staff stand beside the belt, never on its moving surface.
export const DOCKS={lung:p(9.5,9.5),brain:p(23.5,9.5),gut:p(39.5,9.5),heart:p(12.5,18.5),marrow:p(35.5,18.5),liver:p(9.5,27.5),kidney:p(39.5,27.5)};
export function pathPoint(path,distance){
  let d=Math.max(0,distance);
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=Math.abs(b.x-a.x)+Math.abs(b.y-a.y);if(d<=length){const f=length?d/length:0;return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,dx:Math.sign(b.x-a.x),dy:Math.sign(b.y-a.y)};}d-=length;}
  return {...path.at(-1),dx:0,dy:0};
}
export const beltPoint=distance=>pathPoint(BELT,((distance%BELT_LENGTH)+BELT_LENGTH)%BELT_LENGTH);
const wallMap=new Map();
function wallRect(x,y,w,h,doors=[]){for(let ty=y;ty<y+h;ty++)for(let tx=x;tx<x+w;tx++)if((tx===x||tx===x+w-1||ty===y||ty===y+h-1)&&!doors.some(([dx,dy])=>dx===tx&&dy===ty))wallMap.set(`${tx},${ty}`,{x:tx,y:ty});}
wallRect(2,2,44,31);
for(const r of ROOMS)wallRect(r.x,r.y,r.w,r.h,r.door);
export const WALL_TILES=[...wallMap.values()];
const solid=new Set(wallMap.keys());
for(const f of FIXTURES)for(let y=f.y;y<f.y+f.h;y++)for(let x=f.x;x<f.x+f.w;x++)solid.add(`${x},${y}`);
for(const path of [BELT,...Object.values(PORTS).map(p=>p.path)])for(let d=0;d<=pathLength(path);d+=8){const q=pathPoint(path,d);solid.add(`${Math.floor(q.x/TILE)},${Math.floor(q.y/TILE)}`);}
for(const b of BRIDGES)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)solid.delete(`${x},${y}`);
export function blocked(tx,ty){return !Number.isFinite(tx)||!Number.isFinite(ty)||tx<3||ty<3||tx>44||ty>31||solid.has(`${tx},${ty}`);}
export function roomAt(x,y){return ROOMS.find(r=>x>r.x*TILE&&x<(r.x+r.w)*TILE&&y>r.y*TILE&&y<(r.y+r.h)*TILE);}
