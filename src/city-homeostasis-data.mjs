// Relative teaching model: rates and transit times are compressed game time.
export const HOME_ORGANS=Object.freeze([
 {id:'brain',name:'시상하부·뇌하수체',label:'조절 회관',x:-23,z:-43,color:'#9f9bc7',host:'lymph',model:'hall',loop:'temperature'},
 {id:'thyroid',name:'갑상선·부갑상선',label:'대사 공방',x:10,z:-45,color:'#d9a57c',host:'lung',model:'workshop',loop:'thyroid'},
 {id:'pancreas',name:'췌장',label:'혈당 조절소',x:35,z:-28,color:'#deb875',host:'gut',model:'workshop',loop:'glucose'},
 {id:'liver',name:'간·담낭',label:'중앙 영양창고',x:44,z:7,color:'#b98170',host:'gut',model:'house-b',loop:'digestion'},
 {id:'spleen',name:'비장',label:'적혈구 재활용소',x:-44,z:12,color:'#b887a5',host:'marrow',model:'workshop',loop:'recycling'},
 {id:'bone',name:'뼈',label:'광물 공방',x:-24,z:41,color:'#c8bea2',host:'marrow',model:'house-b',loop:'calcium'},
 {id:'adrenal',name:'부신',label:'염분 조절소',x:17,z:44,color:'#c4ad7b',host:'kidney',model:'house-a',loop:'water'},
 {id:'muscle',name:'근육 조직',label:'활동 공방',x:36,z:31,color:'#c68e82',host:'heart',model:'workshop',loop:'respiration'},
 {id:'fat',name:'지방 조직',label:'에너지 저장고',x:0,z:46,color:'#d3bf79',host:'gut',model:'house-b',loop:'glucose'}
]);
export const homeOrgan=id=>HOME_ORGANS.find(o=>o.id===id);
export const HOME_LOOPS=Object.freeze([
 {id:'glucose',name:'혈당·에너지',sites:['pancreas','liver','muscle','fat'],metric:'glucose',unit:'',range:[80,110],color:'#cfad58'},
 {id:'water',name:'물·전해질',sites:['brain','adrenal','kidney'],metric:'water',unit:'%',range:[97,103],color:'#71b7c9'},
 {id:'respiration',name:'호흡·산도',sites:['muscle','heart','lung','brain','kidney'],metric:'co2',unit:'',range:[36,44],color:'#83a9c8'},
 {id:'temperature',name:'체온',sites:['brain','muscle','heart'],metric:'temperature',unit:'°',range:[36.7,37.3],color:'#d79772'},
 {id:'digestion',name:'소화·영양 가공',sites:['gut','pancreas','liver'],metric:'absorption',unit:'%',range:[70,100],color:'#b9b270'},
 {id:'thyroid',name:'대사 속도',sites:['brain','thyroid','muscle'],metric:'thyroid',unit:'×',range:[.8,1.2],color:'#b09ac5'},
 {id:'calcium',name:'칼슘·뼈',sites:['thyroid','bone','kidney','gut'],metric:'calcium',unit:'',range:[9.1,9.9],color:'#b3b4a0'},
 {id:'recycling',name:'적혈구·철 회수',sites:['spleen','liver','marrow'],metric:'iron',unit:'',range:[0,40],color:'#bd8f9e'}
]);
export const HOME_PHASES=Object.freeze({stable:'균형',sensing:'① 감지',signaling:'② 신호',acting:'③ 반응',recovering:'④ 회복'});
export const HOME_SIGNALS=Object.freeze({insulin:{name:'인슐린',from:'pancreas',to:'liver',loop:'glucose',color:'#e2b85d'},glucagon:{name:'글루카곤',from:'pancreas',to:'liver',loop:'glucose',color:'#df9571'},adh:{name:'ADH',from:'brain',to:'kidney',loop:'water',color:'#74bdd5'},aldosterone:{name:'알도스테론',from:'adrenal',to:'kidney',loop:'water',color:'#b6bd79'},ventilation:{name:'호흡 신호',from:'brain',to:'lung',loop:'respiration',color:'#84b8ce',neural:true},cooling:{name:'열 방출',from:'brain',to:'heart',loop:'temperature',color:'#73b6b0',neural:true},shivering:{name:'떨림',from:'brain',to:'muscle',loop:'temperature',color:'#c99889',neural:true},tsh:{name:'TSH',from:'brain',to:'thyroid',loop:'thyroid',color:'#b39acb'},pth:{name:'PTH',from:'thyroid',to:'kidney',loop:'calcium',color:'#d2c9a3'}});
export const HOME_ACTIONS=Object.freeze({meal:'식사',fast:'공복',drink:'물 마시기',dehydrate:'탈수',salt:'짠 음식',exercise:'운동',rest:'휴식',heat:'더위',cold:'추위',neutral:'평온',calcium:'칼슘 보급',lowcalcium:'칼슘 부족',aging:'적혈구 노화'});
export const HOME_ACTION_LOOPS=Object.freeze({meal:'digestion',fast:'glucose',drink:'water',dehydrate:'water',salt:'water',exercise:'respiration',rest:'respiration',heat:'temperature',cold:'temperature',neutral:'temperature',calcium:'calcium',lowcalcium:'calcium',aging:'recycling'});
// A facility's courtyard remains a vascular exchange point; the building is behind it.
export function homeFootprint(o){return {left:o.x-3.4,right:o.x+3.4,top:o.z-6,bottom:o.z-1.3};}
const siteCache=new WeakMap();
export function homeSites(layout){
 if(!layout)return HOME_ORGANS;if(siteCache.has(layout))return siteCache.get(layout);
 const placed=[],existing=Object.values(layout.items||{}).filter(a=>a.col>-100);
 for(const original of HOME_ORGANS){
  const angle=Math.atan2(original.z,original.x),candidates=[original];
  for(const radius of [49,51,46])for(const offset of [0,.12,-.12,.24,-.24,.36,-.36])candidates.push({...original,x:Math.cos(angle+offset)*radius,z:Math.sin(angle+offset)*radius});
  const site=candidates.find(p=>{const f=homeFootprint(p);return [[f.left,f.top],[f.right,f.top],[f.left,f.bottom],[f.right,f.bottom]].every(([x,z])=>Math.hypot(x,z)<56)&&existing.every(a=>Math.hypot(a.col-p.x,a.row-(p.z-3.5))>7)&&placed.every(a=>Math.hypot(a.x-p.x,a.z-p.z)>10);})||original;
  placed.push({...site});
 }
 siteCache.set(layout,placed);return placed;
}
