import { DRUG_SPECS } from './defense-data.mjs';

// Only arcade tuning lives here. Names, families, AST and references belong to the encyclopedia.
export const WEAPONS = Object.freeze([
  {id:'ampicillin',short:'AMP',role:'NARROW / REPEATER',damage:22,interval:.19,cost:7,pressure:.08,range:15,spread:.065,exposure:0},
  {id:'cefazolin',short:'CFZ',role:'FOCUSED / SCATTER',damage:52,interval:.55,cost:17,pressure:.25,range:9,spread:.16,exposure:1},
  {id:'ceftriaxone',short:'CRO',role:'BROAD / PRECISION',damage:65,interval:.72,cost:19,pressure:1.7,range:22,spread:.045,exposure:0},
  {id:'vancomycin',short:'VAN',role:'SPECIALIST / PULSE',damage:78,interval:.82,cost:24,pressure:.5,range:11,spread:.13,exposure:0},
  {id:'meropenem',short:'MEM',role:'BROAD / RAPID',damage:35,interval:.23,cost:12,pressure:2.8,range:18,spread:.075,exposure:0}
]);
export const ENEMIES = Object.freeze([
  {id:'pneumo',recordId:'SPN-105',short:'S. pneumoniae',gram:'Gram-positive diplococci',shape:'diplo',color:'#b9d97e',hp:64,shield:30,speed:1.1,damage:7},
  {id:'mssa',recordId:'SAU-001',short:'S. aureus',gram:'Gram-positive cocci',shape:'cluster',color:'#a2d3b5',hp:85,shield:0,speed:1.25,damage:8},
  {id:'ecoli',recordId:'ECO-009',short:'E. coli',gram:'Gram-negative rod',shape:'rod',color:'#7dc9c4',hp:62,shield:0,speed:1.6,damage:6},
  {id:'mrsa',recordId:'SAU-002',short:'S. aureus',gram:'Gram-positive cocci',shape:'cluster',color:'#a2d3b5',hp:122,shield:0,speed:1.15,damage:10,resistant:true},
  {id:'esbl',recordId:'ECO-010',short:'E. coli',gram:'Gram-negative rod',shape:'rod',color:'#7dc9c4',hp:110,shield:0,speed:1.3,damage:9,resistant:true,ranged:true}
]);
export const WAVES = Object.freeze([
  {name:'COMMUNITY',label:'지역사회 감염',count:10,pool:['pneumo','ecoli'],interval:2.5},
  {name:'COLONIZATION',label:'혼합 감염',count:14,pool:['mssa','pneumo','ecoli'],interval:2.3},
  {name:'HOSPITAL',label:'병원 내 전파',count:18,pool:['ecoli','mssa','mrsa'],interval:2.1},
  {name:'RESISTANCE',label:'ESBL 출현',count:21,pool:['esbl','pneumo','mrsa','ecoli'],interval:2},
  {name:'OUTBREAK',label:'내성균 집단 발생',count:24,pool:['mrsa','esbl','mssa'],interval:1.85},
  {name:'CONTAINMENT',label:'최종 봉쇄',count:28,pool:['esbl','mrsa','pneumo','ecoli'],interval:1.7}
]);
export const REWARDS = Object.freeze([
  {id:'infusion',title:'Extended infusion',tag:'PK / PD',text:'β-lactam의 유효 명중 후 노출이 1.6초 지속됩니다. I 노출 조건도 충족합니다. R은 그대로입니다.'},
  {id:'immune',title:'건강한 면역계',tag:'HOST',text:'10초마다 가까운 약한 기본형 한 개체를 정리합니다. 캡슐·biofilm·내성형은 제외됩니다.'},
  {id:'scanner',title:'Rapid diagnostics',tag:'LAB',text:'스캔 한 번에 두 단계를 확인합니다. 검사 중 이동과 사격이 가능합니다.'},
  {id:'stewardship',title:'De-escalation',tag:'ECOLOGY',text:'Resistance Pressure −35. 이후 좁은 범위 약제로 처치할 때 선택압이 더 빠르게 내려갑니다.'},
  {id:'efficiency',title:'투여 효율 최적화',tag:'RESOURCE',text:'약제 에너지 소모를 20% 줄입니다. 감수성 범위는 바뀌지 않습니다.'},
  {id:'source',title:'Source control kit',tag:'PROCEDURE',text:'감염원 제거 범위를 넓히고 재사용 대기를 줄입니다. 체력 25를 회복합니다.'}
]);
export function createPlayCatalog(database) {
  const weapons=WEAPONS.map(spec=>{
    const original=database.drugs.find(d=>d.id===spec.id);
    if(!original)throw Error('Missing Play drug: '+spec.id);
    return {...original,...spec,color:DRUG_SPECS.find(d=>d.id===spec.id).color};
  });
  const enemies=ENEMIES.map(spec=>{
    const record=database.records.find(r=>r.id===spec.recordId);
    if(!record)throw Error('Missing Play isolate: '+spec.recordId);
    return {...spec,name:record.organism,phenotype:record.phenotype,record,ast:record.susceptibility};
  });
  return {weapons,enemies,weaponById:Object.fromEntries(weapons.map(d=>[d.id,d])),enemyById:Object.fromEntries(enemies.map(e=>[e.id,e]))};
}
export function createMap() {
  const width=26,height=22,cells=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x===0||y===0||x===width-1||y===height-1)cells[y*width+x]=1;
  const wall=(x,y,w,h,type=1)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)cells[j*width+i]=type;};
  wall(8,1,1,7,2);wall(17,1,1,7,2);wall(8,11,1,10,2);wall(17,11,1,10,2);
  wall(1,8,7,1,3);wall(10,8,5,1,3);wall(18,8,7,1,3);
  wall(1,14,5,1,3);wall(10,14,5,1,3);wall(20,14,5,1,3);
  wall(4,5,2,1);wall(12,4,2,2);wall(21,11,2,1);wall(11,18,3,1);wall(4,18,2,1);
  for(const [x,y] of [[8,4],[17,4],[4,8],[21,8],[8,17],[17,17],[4,14],[12,14],[21,14]])cells[y*width+x]=0;
  return {id:'community-lab',name:'ISOLATION WARD 01',site:'community',width,height,cells,
    spawn:{x:3.5,y:3.5,angle:0},exit:{x:3.5,y:3.5},
    portals:[{x:20.5,y:3.5},{x:21.5,y:17.5},{x:5.5,y:16.5},{x:12.5,y:10.5},{x:3.5,y:11.5}],
    sources:[{id:0,x:22.5,y:4.5,label:'A / CATHETER',active:true},{id:1,x:21.5,y:18.5,label:'B / BIOFILM',active:true},{id:2,x:3.5,y:17.5,label:'C / ABSCESS',active:true}],
    pickups:[{x:5.5,y:2.5,kind:'culture'},{x:12.5,y:7.5,kind:'health'},{x:22.5,y:6.5,kind:'supply'},{x:6.5,y:12.5,kind:'health'},{x:13.5,y:16.5,kind:'culture'},{x:19.5,y:16.5,kind:'supply'}].map((p,id)=>({...p,id,active:true,cooldown:0}))};
}
