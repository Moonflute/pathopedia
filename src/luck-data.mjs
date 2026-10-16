// Game-only abilities; names and artwork come from the shared collection.
export const BOARD=Object.freeze({width:600,height:560,x:60,y:148,cell:96,cols:5,rows:3});
export const TRACK=Object.freeze({x:36,y:84,width:528,height:408});
export const MAX_CROWD=60,LAST_WAVE=20,WAVE_SECONDS=17,MAX_STAR=5;
export const RARITIES=[
 {name:'일반',color:'#b3c5db',mark:'I'},{name:'희귀',color:'#62d9ff',mark:'II'},
 {name:'영웅',color:'#bd99ff',mark:'III'},{name:'전설',color:'#ffd46d',mark:'IV'},{name:'신화',color:'#ff8aa5',mark:'V'}
];
export const TRAITS={
 spark:{name:'연쇄',color:'#79ddff',bonus:'2종 · 연쇄 +1'},blast:{name:'포격',color:'#ffbd80',bonus:'2종 · 범위 피해 +25%'},
 pulse:{name:'가속',color:'#b8ef88',bonus:'2종 · 전체 공속 +15%'},hex:{name:'변이',color:'#c2a1ff',bonus:'2종 · 지속 피해 +35%'}
};
const unit=(id,name,art,rarity,trait,skill,damage,interval,description)=>({id,name,art,rarity,trait,skill,damage,interval,description});
export const MODES={
 remedy:{id:'remedy',name:'항생제',subtitle:'THE REMEDY',color:'#88e5d0',rival:'군집',burst:'궤도 폭격',
 units:[
 unit('pen','페니','penicillin',0,'pulse','rapid',14,.62,'빠르게 쏟아지는 마력탄'),
 unit('cef','세프','ceftriaxone',0,'blast','splash',24,1.18,'작게 터지는 범위 포격'),
 unit('gen','젠타','gentamicin',0,'spark','chain',17,.95,'세 적을 잇는 전격'),
 unit('dox','독시','doxycycline',0,'hex','poison',12,.85,'겹칠수록 아픈 독 흔적'),
 unit('van','반코','vancomycin',1,'blast','stun',46,1.35,'묵직한 일격과 짧은 기절'),
 unit('azi','아지','azithromycin',1,'pulse','support',20,.8,'주변 유닛의 공격 속도 상승'),
 unit('acy','아시','acyclovir',1,'hex','slow',29,.9,'군집을 붙드는 서리탄'),
 unit('mero','메로','meropenem',2,'blast','missile',86,1.55,'넓게 폭발하는 유도 미사일'),
 unit('line','리네','linezolid',2,'spark','beam',55,.92,'일렬로 꿰뚫는 빛의 칼날'),
 unit('dap','댑토','daptomycin',3,'spark','storm',68,.72,'여섯 적을 휘감는 번개 폭풍'),
 unit('imi','이미','imipenem',3,'pulse','nova',140,1.5,'주변을 지우는 충격파'),
 unit('atlas','아틀라스','meropenem',4,'blast','meteor',260,1.7,'거대 운석 세 발 · 전장 전체 사거리'),
 unit('zero','제로 아워','remdesivir',4,'hex','blizzard',165,1.05,'시간을 얼리는 광역 폭풍')
 ],recipes:[{id:'atlas',needs:['mero','van','cef']},{id:'zero',needs:['line','acy','azi']}]},
 colony:{id:'colony',name:'병원체',subtitle:'THE COLONY',color:'#c0a0ff',rival:'방위대',burst:'군집 폭주',
 units:[
 unit('cocci','코코','sau',0,'pulse','rapid',14,.62,'쉴 새 없이 튀는 작은 군집'),
 unit('coli','콜리','eco',0,'blast','splash',24,1.18,'뭉쳐서 날아가는 포자탄'),
 unit('flu','플루','influenza-a',0,'spark','chain',17,.95,'적 사이를 뛰어다니는 파동'),
 unit('cand','캔디','cal',0,'hex','poison',12,.85,'오래 남는 보랏빛 독 흔적'),
 unit('kleb','클렙','kpn',1,'blast','stun',46,1.35,'단단한 껍질로 내려찍기'),
 unit('spore','스포리','bce',1,'pulse','support',20,.8,'주변 군집의 공격 속도 상승'),
 unit('herp','허피','hsv1',1,'hex','slow',29,.9,'적을 끈끈하게 붙잡는 덩굴'),
 unit('pseudo','슈도','pae',2,'hex','pool',72,1.3,'길목을 덮는 독성 웅덩이'),
 unit('asper','아스퍼','afu',2,'spark','split',50,1,'세 방향으로 분열하는 포자'),
 unit('rabid','레이비','rabies',3,'pulse','frenzy',39,.32,'공격할수록 빨라지는 광란'),
 unit('crypto','크립토','cne',3,'hex','nova',140,1.5,'껍질 밖으로 번지는 충격파'),
 unit('hydra','히드라','pae',4,'spark','hydra',175,.85,'다섯 갈래로 증식하는 사냥꾼'),
 unit('bloom','블룸 퀸','afu',4,'hex','bloom',210,1.4,'거대한 포자 장판과 연쇄 폭발')
 ],recipes:[{id:'hydra',needs:['asper','kleb','flu']},{id:'bloom',needs:['pseudo','herp','cand']}]}
};
export const AUGMENTS=[
 {id:'power',name:'과잉 반응',icon:'✦',text:'전체 피해 +25%'},{id:'haste',name:'오버클럭',icon:'»',text:'전체 공격 속도 +20%'},
 {id:'wealth',name:'연구비 입금',icon:'◆',text:'즉시 180G · 처치 보상 +1G'},{id:'luck',name:'행운의 편향',icon:'✧',text:'소환 희귀 이상 확률 +12%p'},
 {id:'merge',name:'완벽한 융합',icon:'⬡',text:'합성 때마다 25G · 즉시 행운석 +3'},{id:'range',name:'확장 실험',icon:'◎',text:'사거리 +35% · 피해 +10%'},
 {id:'burst',name:'비상 발전기',icon:'ϟ',text:'필살기 대기 −40% · 위력 +50%'},{id:'bounty',name:'보스 사냥꾼',icon:'♜',text:'보스에게 피해 +60%'}
];
export const unitById=(mode,id)=>MODES[mode]?.units.find(u=>u.id===id);
export const cellCenter=index=>({x:BOARD.x+(index%BOARD.cols+.5)*BOARD.cell,y:BOARD.y+(Math.floor(index/BOARD.cols)+.5)*BOARD.cell});
export function trackPoint(distance){
 const{x,y,width:w,height:h}=TRACK,perimeter=2*(w+h);let d=((distance%perimeter)+perimeter)%perimeter;
 if(d<w)return{x:x+d,y};d-=w;if(d<h)return{x:x+w,y:y+d};d-=h;if(d<w)return{x:x+w-d,y:y+h};d-=w;return{x,y:y+h-d};
}
