import {pathogenDef} from './city-pathogens.mjs';

// Control ownership is transient. Saves always remain ordinary, autonomous cities.
const pilots=new WeakMap();
const poses=new WeakMap();
export const PILOT_GRAPPLE_RANGE=50;
export const pilotPose=s=>poses.get(s)||{height:0,eye:.58,theme:'2'};
export function setPilotPose(s,pose){if(pose)poses.set(s,pose);else poses.delete(s);}
export const pilotedCell=s=>pilots.get(s)||null;
export function setPilotedCell(s,cell){if(cell)pilots.set(s,cell);else pilots.delete(s);}

export const PILOT_TOOLS=Object.freeze([
 {id:'engulf',name:'면역 펄스건',short:'사격',key:'1',duration:0,interval:.12,range:18,color:0xf5c783},
 {id:'oxygen',name:'산소 캐리어',short:'산소',key:'2',duration:.8,interval:.2,range:2.5,color:0x81d9df},
 {id:'nutrient',name:'영양 보급함',short:'영양',key:'3',duration:.8,interval:.3,range:2.5,color:0xf0c463},
 {id:'repair',name:'복구 렌치',short:'복구',key:'4',duration:1.2,interval:.4,range:2.5,color:0x9ab7cb},
 {id:'cleanup',name:'잔해 흡입기',short:'수거',key:'5',duration:.6,interval:.3,range:2.5,color:0xa5ce83},
 {id:'patch',name:'혈소판 패치',short:'봉합',key:'6',duration:.9,interval:1.5,range:2.5,color:0xeaa39e},
 {id:'antigen',name:'항원 채집기',short:'항원',key:'7',duration:1,interval:.5,range:2.5,color:0xc5a4e9},
 {id:'signal',name:'지원 신호기',short:'지원',key:'8',duration:.4,interval:6,range:2.5,color:0xedd786},
 {id:'scanner',name:'진단 스캐너',short:'진단',key:'9',duration:0,interval:.6,range:12,color:0x85dbac},
 {id:'tractor',name:'견인 빔',short:'견인',key:'0',duration:0,interval:.15,range:10,color:0x7adce9},
 {id:'repulsor',name:'충격 방출기',short:'충격',key:'-',duration:0,interval:1.5,range:4.5,color:0xc6a7ff}
]);
export const pilotTool=id=>PILOT_TOOLS.find(t=>t.id===id)||PILOT_TOOLS[0];
const cooldowns=new WeakMap();
export function pilotCooldowns(s){if(!cooldowns.has(s))cooldowns.set(s,{});return cooldowns.get(s);}
export function pilotInventory(s){
 const i=s.pilotInventory??={tool:'engulf',oxygen:0,target:'heart'};
 i.nutrient??=0;i.debris??=0;i.antigen??=null;i.fuel??=100;return i;
}
export function validatePilotInventory(s){
 const i=s.pilotInventory;
 const cargo=(value,max)=>value==null||Number.isFinite(value)&&value>=0&&value<=max;
 return i==null||!!(i&&PILOT_TOOLS.some(t=>t.id===i.tool)&&Number.isFinite(i.oxygen)&&i.oxygen>=0&&i.oxygen<=200&&['heart','gut','kidney','marrow','lymph'].includes(i.target)&&cargo(i.nutrient,20)&&cargo(i.debris,6)&&cargo(i.fuel,100)&&Number.isInteger(i.debris??0)&&(i.antigen==null||pathogenDef(i.antigen)));
}
