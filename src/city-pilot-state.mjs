import {pathogenDef} from './city-pathogens.mjs';

// Control ownership is transient. Saves always remain ordinary, autonomous cities.
const pilots=new WeakMap();
const poses=new WeakMap();
const crowds=new WeakMap();
export const pilotCrowd=s=>crowds.get(s)||{quality:{},selectedCell:null,selectedKind:null};
export function setPilotCrowd(s,value){crowds.set(s,value);}
export const PILOT_GRAPPLE_RANGE=50;
export const pilotPose=s=>poses.get(s)||{height:0,eye:.58,theme:'2'};
export function setPilotPose(s,pose){if(pose)poses.set(s,pose);else poses.delete(s);}
export const pilotedCell=s=>pilots.get(s)||null;
export function setPilotedCell(s,cell){if(cell)pilots.set(s,cell);else pilots.delete(s);}

export const PILOT_TOOLS=Object.freeze([
 {id:'engulf',name:'면역 펄스건',short:'사격',key:'1',duration:0,interval:.12,range:32,color:0xf5c783},
 {id:'oxygen',name:'산소 캐리어',short:'산소',key:'2',duration:.8,interval:.2,range:2.5,color:0x81d9df},
 {id:'nutrient',name:'영양 보급함',short:'영양',key:'3',duration:.8,interval:.3,range:2.5,color:0xf0c463},
 {id:'repair',name:'만능 복구 도구',short:'복구',key:'4',duration:1.2,interval:.4,range:2.5,color:0x9ab7cb},
 {id:'tractor',name:'견인 빔',short:'견인',key:'0',duration:0,interval:.15,range:10,color:0x7adce9}
]);
const retiredTools=new Set(['cleanup','patch','antigen','signal','scanner','repulsor']);
export const pilotTool=id=>PILOT_TOOLS.find(t=>t.id===id)||PILOT_TOOLS[0];
const cooldowns=new WeakMap();
export function pilotCooldowns(s){if(!cooldowns.has(s))cooldowns.set(s,{});return cooldowns.get(s);}
export function pilotInventory(s){
 const i=s.pilotInventory??={tool:'engulf',oxygen:0,target:'heart'};
 if(retiredTools.has(i.tool))i.tool='repair';
 i.nutrient??=0;i.debris??=0;i.antigen??=null;i.fuel??=100;return i;
}
export function validatePilotInventory(s){
 const i=s.pilotInventory;
 const cargo=(value,max)=>value==null||Number.isFinite(value)&&value>=0&&value<=max;
 return i==null||!!(i&&(PILOT_TOOLS.some(t=>t.id===i.tool)||retiredTools.has(i.tool))&&Number.isFinite(i.oxygen)&&i.oxygen>=0&&i.oxygen<=200&&['heart','lung','gut','kidney','marrow','lymph'].includes(i.target)&&cargo(i.nutrient,20)&&cargo(i.debris,6)&&cargo(i.fuel,100)&&Number.isInteger(i.debris??0)&&(i.antigen==null||pathogenDef(i.antigen)));
}
