// Control ownership is transient. Saves always remain ordinary, autonomous cities.
const pilots=new WeakMap();
export const pilotedCell=s=>pilots.get(s)||null;
export function setPilotedCell(s,cell){if(cell)pilots.set(s,cell);else pilots.delete(s);}

export const PILOT_TOOLS=Object.freeze([
 {id:'engulf',name:'포식 글러브',short:'전투',symbol:'✦',key:'1'},
 {id:'oxygen',name:'산소 캐리어',short:'산소',symbol:'O₂',key:'2'}
]);
export function pilotInventory(s){
 return s.pilotInventory??={tool:'engulf',oxygen:0,target:'heart'};
}
export function validatePilotInventory(s){
 const i=s.pilotInventory;
 return i==null||!!(i&&PILOT_TOOLS.some(t=>t.id===i.tool)&&Number.isFinite(i.oxygen)&&i.oxygen>=0&&i.oxygen<=200&&['heart','gut','kidney','marrow','lymph'].includes(i.target));
}
