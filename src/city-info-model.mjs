import {createCityInfoDocument,INFO_KINDS,INFO_LINKS} from './city-info-data.mjs';
import {setRuleGraph} from './city-info-rules.mjs';
export const CITY_INFO_KEY='pathopedia:cell-city:information:v1';
export const INFO_LIMITS=Object.freeze({bytes:512000,nodes:180,edges:220,coordinate:12000});
const idOK=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const textOK=(v,max)=>typeof v==='string'&&v.length<=max;
export function parseCityInfo(raw){
  try{
    if(typeof raw!=='string'||raw.length>INFO_LIMITS.bytes||new TextEncoder().encode(raw).byteLength>INFO_LIMITS.bytes)return null;
    const d=JSON.parse(raw),ids=new Set(),viewIDs=new Set();
    if(![1,2,3].includes(d?.schema)||!textOK(d.basis,100)||!Array.isArray(d.nodes)||!d.nodes.length||d.nodes.length>INFO_LIMITS.nodes||!Array.isArray(d.views)||d.views.length!==({1:8,2:12,3:14}[d.schema]))return null;
    for(const n of d.nodes){
      if(!n||!idOK(n.id)||ids.has(n.id)||!Object.hasOwn(INFO_KINDS,n.kind)||!textOK(n.label,48)||!n.label.trim()||!textOK(n.summary,90)||!textOK(n.detail,1600)||!textOK(n.source,160))return null;
      if(n.rule&&(!idOK(n.rule.op)||typeof n.rule.enabled!=='boolean'||!n.rule.params||Array.isArray(n.rule.params)||Object.keys(n.rule.params).length>24||Object.entries(n.rule.params).some(([k,v])=>!idOK(k)||!Number.isFinite(v)||Math.abs(v)>1e6)))return null;
      ids.add(n.id);
    }
    const defaults=createCityInfoDocument(),expected=new Set(defaults.views.filter(v=>(d.schema!==1||!v.id.startsWith('rules-'))&&(d.schema===3||!['innate','type2'].includes(v.id))).map(v=>v.id));
    for(const v of d.views){
      if(!v||!expected.has(v.id)||viewIDs.has(v.id)||!textOK(v.name,40)||!textOK(v.caption,200)||!v.positions||typeof v.positions!=='object'||Array.isArray(v.positions)||!Array.isArray(v.edges)||v.edges.length>INFO_LIMITS.edges)return null;
      viewIDs.add(v.id);const edges=new Set();
      for(const [id,p]of Object.entries(v.positions))if(!ids.has(id)||!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>INFO_LIMITS.coordinate||Math.abs(p.y)>INFO_LIMITS.coordinate)return null;
      for(const e of v.edges){
        if(!e||!idOK(e.id)||edges.has(e.id)||e.from===e.to||!Object.hasOwn(v.positions,e.from)||!Object.hasOwn(v.positions,e.to)||!textOK(e.label,64)||!Object.hasOwn(INFO_LINKS,e.kind))return null;
        edges.add(e.id);
      }
    }
    // Normalize imported data. Never render supplied HTML, CSS, URLs, or unknown keys.
    const clean={schema:2,basis:d.basis,nodes:d.nodes.map(({id,label,kind,summary,detail,source,rule})=>({id,label,kind,summary,detail,source,...(rule?{rule:{op:rule.op,enabled:rule.enabled,params:{...rule.params}}}:{})})),views:d.views.map(({id,name,caption,positions,edges})=>({id,name,caption,positions:Object.fromEntries(Object.entries(positions).map(([id,p])=>[id,{x:p.x,y:p.y}])),edges:edges.map(({id,from,to,label,kind})=>({id,from,to,label,kind}))}))};
    if(d.schema===1)setRuleGraph(clean);
    if(d.schema<3){
      for(const v of defaults.views.filter(v=>['innate','type2'].includes(v.id)))clean.views.push(structuredClone(v));
      const wanted=new Set(clean.views.flatMap(v=>Object.keys(v.positions)));
      for(const n of defaults.nodes)if(wanted.has(n.id)&&!clean.nodes.some(x=>x.id===n.id))clean.nodes.push(structuredClone(n));
      clean.schema=3;
    }else clean.schema=3;
    return clean;
  }catch{return null;}
}
export function loadCityInfo(storage){
  try{const raw=storage.getItem(CITY_INFO_KEY);if(!raw)return {document:createCityInfoDocument(),message:'기본 관계도'};const document=parseCityInfo(raw);return document?{document,message:'저장한 관계도'}:{document:createCityInfoDocument(),message:'저장 형식 오류 · 기본 관계도 표시'};}
  catch{return {document:createCityInfoDocument(),message:'저장소 접근 불가 · 내보내기 가능'};}
}
export function createInfoEditor(document=createCityInfoDocument()){
  let current=structuredClone(document),saved=JSON.stringify(current);const past=[],future=[];
  const commit=next=>{const clean=parseCityInfo(JSON.stringify(next));if(!clean||JSON.stringify(clean)===JSON.stringify(current))return false;past.push(JSON.stringify(current));if(past.length>30)past.shift();current=clean;future.length=0;return true;};
  return {
    get document(){return current;},get dirty(){return saved!==JSON.stringify(current);},get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
    change(fn){const next=structuredClone(current);fn(next);return commit(next);},replace:commit,
    undo(){if(!past.length)return false;future.push(JSON.stringify(current));current=JSON.parse(past.pop());return true;},
    redo(){if(!future.length)return false;past.push(JSON.stringify(current));current=JSON.parse(future.pop());return true;},
    save(storage){try{storage.setItem(CITY_INFO_KEY,JSON.stringify(current));saved=JSON.stringify(current);return true;}catch{return false;}}
  };
}
export function infoBounds(view){
  const p=Object.values(view.positions);if(!p.length)return {x:0,y:0,width:400,height:300};
  const x=Math.min(...p.map(p=>p.x)),y=Math.min(...p.map(p=>p.y));
  return {x:x-40,y:y-40,width:Math.max(...p.map(p=>p.x))+220-x+80,height:Math.max(...p.map(p=>p.y))+100-y+80};
}
