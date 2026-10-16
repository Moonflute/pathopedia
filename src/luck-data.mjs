// Game-only abilities; names and artwork come from the shared collection.
export const BOARD=Object.freeze({width:600,height:560,x:60,y:148,cell:96,cols:5,rows:3});
export const TRACK=Object.freeze({x:36,y:84,width:528,height:408});
export const MAX_CROWD=60,LAST_WAVE=20,WAVE_SECONDS=17,MAX_STAR=5;
export const RARITIES=[
 {name:'일반',color:'#b3c5db',mark:'I'},{name:'희귀',color:'#62d9ff',mark:'II'},
 {name:'영웅',color:'#bd99ff',mark:'III'},{name:'전설',color:'#ffd46d',mark:'IV'},{name:'신화',color:'#ff8aa5',mark:'V'}
];
// Thresholds count distinct unit types. Bonuses are game-only and apply to the whole board.
export const TRAITS={
 wall:{name:'세포벽',color:'#8ce4d2',thresholds:[2,4],bonuses:['전체 피해 +12%','전체 피해 +24%'],effect:'power',values:[.12,.24]},
 ceph:{name:'세파계',color:'#88ccff',thresholds:[2],bonuses:['범위 피해 +30%'],effect:'area',values:[.3]},
 carb:{name:'카바페넴',color:'#ffbd80',thresholds:[2,3],bonuses:['폭발 반경 +15%','폭발 반경 +30%'],effect:'radius',values:[.15,.3]},
 protein:{name:'단백질 억제',color:'#c6eca0',thresholds:[2,4],bonuses:['전체 공속 +12%','전체 공속 +25%'],effect:'haste',values:[.12,.25]},
 membrane:{name:'세포막',color:'#ffdc89',thresholds:[1],bonuses:['연쇄 대상 +1'],effect:'chain',values:[1]},
 antiviral:{name:'항바이러스',color:'#bba8ff',thresholds:[2],bonuses:['둔화 지속 +1초'],effect:'slow',values:[1]},
 positive:{name:'그람 양성',color:'#bfabff',thresholds:[2],bonuses:['전체 공속 +15%'],effect:'haste',values:[.15]},
 negative:{name:'그람 음성',color:'#ff9cae',thresholds:[2,4],bonuses:['전체 피해 +15%','전체 피해 +30%'],effect:'power',values:[.15,.3]},
 virus:{name:'바이러스',color:'#87d7ff',thresholds:[2,3],bonuses:['연쇄 대상 +1','연쇄 대상 +2'],effect:'chain',values:[1,2]},
 fungus:{name:'진균',color:'#b9e59d',thresholds:[2,4],bonuses:['지속 피해 +30%','지속 피해 +60%'],effect:'dot',values:[.3,.6]},
 capsule:{name:'협막',color:'#f9d18d',thresholds:[2],bonuses:['보스 피해 +30%'],effect:'boss',values:[.3]}
};
const UNIT_TAGS={
 pen:['페니실린계','wall'],cef:['3세대 세파계','wall','ceph'],cefi:['4세대 세파계','wall','ceph'],
 gen:['아미노글리코사이드','protein'],dox:['테트라사이클린계','protein'],van:['글리코펩타이드','wall'],
 azi:['마크로라이드계','protein'],acy:['DNA 합성 억제','antiviral'],mero:['카바페넴계','wall','carb'],
 line:['옥사졸리디논계','protein'],dap:['리포펩타이드','membrane'],imi:['카바페넴계','wall','carb'],
 atlas:['카바페넴계','wall','carb'],zero:['RNA 합성 억제','antiviral'],
 cocci:['황색포도알균','positive'],coli:['대장균','negative'],flu:['인플루엔자','virus'],cand:['칸디다','fungus'],
 kleb:['폐렴막대균','negative','capsule'],spore:['바실루스 세레우스','positive'],herp:['단순포진','virus'],
 pseudo:['녹농균','negative'],asper:['아스페르길루스','fungus'],rabid:['광견병 바이러스','virus'],
 crypto:['크립토코쿠스','fungus','capsule'],hydra:['녹농균','negative'],bloom:['아스페르길루스','fungus']
};
export const ATTACKS={
 "rapid": {
  "name": "삼연사",
  "color": "#d8f6ef",
  "range": 290
 },
 "splash": {
  "name": "충격포",
  "color": "#ffbf88",
  "range": 255
 },
 "chain": {
  "name": "전류 사슬",
  "color": "#80dcff",
  "range": 280
 },
 "poison": {
  "name": "독침",
  "color": "#b7ea75",
  "range": 250
 },
 "stun": {
  "name": "망치 강타",
  "color": "#ffe09a",
  "range": 215
 },
 "support": {
  "name": "공명 박동",
  "color": "#a8f1d9",
  "range": 260
 },
 "slow": {
  "name": "빙결 결정",
  "color": "#9de7ff",
  "range": 275
 },
 "pierce": {
  "name": "관통탄",
  "color": "#92caff",
  "range": 340
 },
 "missile": {
  "name": "유도 미사일",
  "color": "#ffb773",
  "range": 340
 },
 "beam": {
  "name": "절단 광선",
  "color": "#cbb7ff",
  "range": 380
 },
 "storm": {
  "name": "번개 폭풍",
  "color": "#c7eaff",
  "range": 320
 },
 "nova": {
  "name": "충격파",
  "color": "#ffd898",
  "range": 255
 },
 "meteor": {
  "name": "삼중 운석",
  "color": "#ff9b64",
  "range": 850
 },
 "blizzard": {
  "name": "절대영도",
  "color": "#a4edff",
  "range": 850
 },
 "double": {
  "name": "쌍둥이탄",
  "color": "#dbb0ff",
  "range": 285
 },
 "acid": {
  "name": "점액 폭발",
  "color": "#a0e992",
  "range": 250
 },
 "infect": {
  "name": "감염 파동",
  "color": "#ff9ab6",
  "range": 285
 },
 "spores": {
  "name": "포자독",
  "color": "#ce97ff",
  "range": 260
 },
 "ram": {
  "name": "협막 돌진",
  "color": "#f9cc86",
  "range": 220
 },
 "germinate": {
  "name": "발아 박동",
  "color": "#bde8a2",
  "range": 260
 },
 "bind": {
  "name": "휘감기",
  "color": "#bd9cff",
  "range": 285
 },
 "pool": {
  "name": "독성 웅덩이",
  "color": "#87deba",
  "range": 315
 },
 "split": {
  "name": "확산 포자",
  "color": "#d5b0ff",
  "range": 310
 },
 "frenzy": {
  "name": "발톱 연타",
  "color": "#ff9ea0",
  "range": 235
 },
 "rupture": {
  "name": "협막 파열",
  "color": "#ead6ff",
  "range": 280
 },
 "hydra": {
  "name": "다섯 갈래 추적",
  "color": "#b7a2ff",
  "range": 850
 },
 "bloom": {
  "name": "포자 개화",
  "color": "#eea5e4",
  "range": 850
 }
};
const unit=(id,name,art,rarity,skill,damage,interval,description)=>({id,name,art,rarity,skill,damage,interval,description,attack:ATTACKS[skill],family:UNIT_TAGS[id][0],traits:UNIT_TAGS[id].slice(1)});
export const MODES={
 remedy:{id:'remedy',name:'항생제',subtitle:'THE REMEDY',color:'#88e5d0',rival:'군집',
 units:[
 unit('pen','페니','penicillin',0,'rapid',14,.62,'세 발 연사'),
 unit('cef','세프','ceftriaxone',0,'splash',24,1.18,'원거리 범위 포격'),
 unit('gen','젠타','gentamicin',0,'chain',17,.95,'3갈래 연쇄 전격'),
 unit('dox','독시','doxycycline',0,'poison',12,.85,'최대 3중첩 독'),
 unit('van','반코','vancomycin',1,'stun',46,1.35,'범위 강타 · 기절'),
 unit('azi','아지','azithromycin',1,'support',20,.8,'주변 공속 +22%'),
 unit('acy','아시','acyclovir',1,'slow',29,.9,'범위 빙결 · 둔화'),
 unit('cefi','세핌','cefepime',1,'pierce',42,1.25,'3기 관통탄'),
 unit('mero','메로','meropenem',2,'missile',86,1.55,'2발 유도 폭발'),
 unit('line','리네','linezolid',2,'beam',55,.92,'직선 관통 광선'),
 unit('dap','댑토','daptomycin',3,'storm',68,.72,'6갈래 번개 폭풍'),
 unit('imi','이미','imipenem',3,'nova',140,1.5,'원형 충격파'),
 unit('atlas','아틀라스','meropenem',4,'meteor',260,1.7,'3연속 운석 · 광역 폭발'),
 unit('zero','제로 아워','remdesivir',4,'blizzard',165,1.05,'전장 빙결 · 둔화')
 ],recipes:[{id:'atlas',needs:['mero','van','cef']},{id:'zero',needs:['line','acy','azi']}]},
 colony:{id:'colony',name:'병원체',subtitle:'THE COLONY',color:'#c0a0ff',rival:'방위대',
 units:[
 unit('cocci','코코','sau',0,'double',14,.62,'쌍둥이탄 · 2기 공격'),
 unit('coli','콜리','eco',0,'acid',24,1.18,'점액 폭발 · 독'),
 unit('flu','플루','influenza-a',0,'infect',17,.95,'연쇄 감염 · 지속 피해'),
 unit('cand','캔디','cal',0,'spores',12,.85,'2갈래 독성 포자'),
 unit('kleb','클렙','kpn',1,'ram',46,1.35,'협막 돌진 · 밀쳐내기'),
 unit('spore','스포리','bce',1,'germinate',20,.8,'주변 공속 +22% · 2갈래 포자'),
 unit('herp','허피','hsv1',1,'bind',29,.9,'2기 속박 · 둔화'),
 unit('pseudo','슈도','pae',2,'pool',72,1.3,'지속 피해 · 독성 장판'),
 unit('asper','아스퍼','afu',2,'split',50,1,'3갈래 확산탄'),
 unit('rabid','레이비','rabies',3,'frenzy',39,.32,'발톱 연타 · 점점 빨라짐'),
 unit('crypto','크립토','cne',3,'rupture',140,1.5,'협막 파편 · 범위 기절'),
 unit('hydra','히드라','pae',4,'hydra',175,.85,'5갈래 추적탄'),
 unit('bloom','블룸 퀸','afu',4,'bloom',210,1.4,'포자 장판 · 개화 폭발')
 ],recipes:[{id:'hydra',needs:['asper','kleb','flu']},{id:'bloom',needs:['pseudo','herp','cand']}]}
};
export const AUGMENTS=[
 {id:'power',name:'과잉 반응',icon:'✦',text:'전체 피해 +25%'},{id:'haste',name:'오버클럭',icon:'»',text:'전체 공격 속도 +20%'},
 {id:'wealth',name:'연구비 입금',icon:'◆',text:'즉시 180G · 처치 보상 +1G'},{id:'luck',name:'행운의 편향',icon:'✧',text:'소환 희귀 이상 확률 +12%p'},
 {id:'merge',name:'완벽한 융합',icon:'⬡',text:'합성 때마다 25G · 즉시 행운석 +3'},{id:'range',name:'확장 실험',icon:'◎',text:'사거리 +35% · 피해 +10%'},
 {id:'bounty',name:'보스 사냥꾼',icon:'♜',text:'보스에게 피해 +60%'}
];
export const unitById=(mode,id)=>MODES[mode]?.units.find(u=>u.id===id);
export const cellCenter=index=>({x:BOARD.x+(index%BOARD.cols+.5)*BOARD.cell,y:BOARD.y+(Math.floor(index/BOARD.cols)+.5)*BOARD.cell});
export function trackPoint(distance){
 const{x,y,width:w,height:h}=TRACK,perimeter=2*(w+h);let d=((distance%perimeter)+perimeter)%perimeter;
 if(d<w)return{x:x+d,y};d-=w;if(d<h)return{x:x+w,y:y+d};d-=h;if(d<w)return{x:x+w-d,y:y+h};d-=w;return{x,y:y+h-d};
}
