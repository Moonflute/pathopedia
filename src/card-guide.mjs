import { renderReferenceCard, setReferenceCardFace } from './reference-card.mjs';

const EXAMPLES=[
  {kind:'pathogen',id:'SAU-002',label:'병원체'},
  {kind:'drug',id:'oxacillin',label:'항생제'},
  {kind:'disease',id:'community-pneumonia',label:'질병'}
];
const COMMON=[
  {id:'name',title:'이름',text:'위쪽 중앙은 카드의 이름. 그 아래 작은 글씨는 한글명이나 영문명, 약제 계열을 보여줘.'},
  {id:'route',title:'좌상단 · 경로',text:''},
  {id:'artwork',title:'가운데 · 그림',text:'이 병원체·약제·질환을 나타내는 그림이 들어가는 자리야.'},
  {id:'lineage',title:'그림과 글 사이 · 분류',text:''},
  {id:'summary',title:'중하단 · 임상 요약',text:'대표 감염, 의심할 단서, 중요한 사용처나 주의점을 한두 문장으로 모아둔 부분이야.'},
  {id:'left',title:'왼쪽 기호',text:''},
  {id:'right',title:'오른쪽 기호',text:''}
];

function explanations(model) {
  const notes=COMMON.map(note=>({...note}));
  const set=(id,text)=>notes.find(note=>note.id===id).text=text;
  if(model.kind==='pathogen'){
    set('route','전파 경로나 저장소를 나타내. 이 예시는 ‘접촉’. 복수 경로는 기호 설명에서 함께 볼 수 있어.');
    set('lineage','G+·G−, 균속 등 병원체의 계통. 이 예시는 G+ · Staphylococcus야.');
    set('left','침범할 수 있는 장기·부위야. 켜진 기호에 커서를 올리거나 누르면 그 부위에서 생기는 질환을 볼 수 있어.');
    set('right','이 병원체의 해당 임상형에 효과 있는 약제야. 약제명은 영어, 기호 밑 글자는 약어. 금색 기준은 ‘'+model.therapyContext.context+'’이고 흰색 약제는 사용 가능 여부와 조건을 함께 확인해.');
    notes.push({id:'resistance',title:'우상단 테이프 · 내성형',text:'MRSA·VRE처럼 이름이 붙는 내성형을 표시해. 테이프에는 내성형 이름과 내성 특성이 들어가고, 같은 병원체의 기본 카드와 함께 묶어 볼 수 있어.'});
  }else if(model.kind==='drug'){
    set('route','투여 경로를 나타내. IV는 정맥, IM은 근육 주사, PO는 경구야. 이 예시는 IV/IM.');
    set('lineage','Penicillin·3세대 Cepha 같은 약제 계열. 이 예시는 Penicillin이야.');
    set('left','효과 있는 병원체 계통이야. 금색은 그 계통 안의 특정 임상 상황에서 우선 선택되는 경우, 흰색은 사용 가능한 대상. 세부 병원체·조건은 기호 설명에 나와.');
    set('right','내성·비활성이 명시된 병원체 계통이야. 같은 계통이라도 균종·내성형이 다르면 좌우가 모두 켜질 수 있어.');
  }else{
    set('route','감염이 발생하는 경로야. 원인 병원체나 상황에 따라 여러 경로가 있으면 ‘복수’로 표시해.');
    set('lineage','호흡기·장관 같은 질환 분류와 감염 질환·증후군 등의 종류를 보여줘.');
    set('left','이 질병의 원인이 되는 병원체 계통이야. 기호 설명에서 원인 병원체 이름을 볼 수 있어.');
    set('right','이 질병의 치료 약제야. 금색은 현재 치료 상황의 우선 선택, 흰색은 대안·조건부 치료. 이 예시의 기준은 ‘'+model.selectedTreatment.context+'’. 증상 완화·지지치료가 중심이면 의료 십자와 ‘대증치료’를 표시해.');
  }
  return notes;
}

export function createCardGuide(models) {
  let current='pathogen',opener=null;
  const host=()=>document.querySelector('#card-guide');
  function content() {
    return '<header class="card-guide-heading"><div><h2 id="card-guide-title">카드 읽는 법</h2><p id="card-guide-intro">번호를 누르면 그 부분의 설명이 뒷면에 나와.</p></div><button type="button" data-card-guide="close" aria-label="카드 안내 닫기" autofocus>✕</button></header>'+
      '<div class="card-guide-kinds" role="group" aria-label="예시 카드 종류">'+EXAMPLES.map(item=>'<button type="button" data-card-guide-kind="'+item.kind+'" aria-pressed="'+(item.kind===current)+'" aria-controls="card-guide-example-'+item.kind+'">'+item.label+'</button>').join('')+'</div>'+
      '<div class="card-guide-examples">'+EXAMPLES.map(item=>{
        const model=models.get(item.kind,item.id);
        return '<section id="card-guide-example-'+item.kind+'" class="card-guide-example'+(item.kind===current?' is-current':'')+'" data-card-guide-example="'+item.kind+'" aria-labelledby="card-guide-label-'+item.kind+'"><h3 id="card-guide-label-'+item.kind+'">'+item.label+' <span>예시</span></h3><div class="card-guide-stage">'+renderReferenceCard({...model,guide:{notes:explanations(model)}})+'</div><button type="button" class="card-guide-flip" data-card-guide-flip aria-label="'+item.label+' 예시 카드 뒤집기">↻ 뒤집기</button></section>';
      }).join('')+'</div>'+
      '<div class="card-guide-colors" aria-label="기호 색상 설명"><span><i class="is-gold" aria-hidden="true"></i>우선 선택</span><span><i class="is-white" aria-hidden="true"></i>해당·사용 가능</span><span><i class="is-red" aria-hidden="true"></i>무효·내성</span><span><i class="is-gray" aria-hidden="true"></i>비해당·다른 상황</span><span><i class="is-condition" aria-hidden="true"></i>작은 점: 조건 확인</span></div>'+
      '<p class="card-guide-hint">실제 도감에서는 카드를 눌러 확대하고, 뒷면에서 임상 설명·병원체·약제 연결을 볼 수 있어. 금색의 적용 상황도 기호 설명과 뒷면에서 확인해.</p>';
  }
  function select(kind) {
    if(!EXAMPLES.some(item=>item.kind===kind))return;
    current=kind;
    const dialog=host();
    for(const button of dialog.querySelectorAll('[data-card-guide-kind]'))button.setAttribute('aria-pressed',String(button.dataset.cardGuideKind===kind));
    for(const example of dialog.querySelectorAll('[data-card-guide-example]'))example.classList.toggle('is-current',example.dataset.cardGuideExample===kind);
    dialog.scrollTop=0;
  }
  function open(domain) {
    const dialog=host();if(!dialog || dialog.open)return;
    current=domain==='drugs'?'drug':domain==='diseases'?'disease':'pathogen';
    opener=document.querySelector('[data-card-guide="open"]');
    dialog.innerHTML=content();
    dialog.onclose=()=>{
      opener?.setAttribute('aria-expanded','false');
      if(opener?.isConnected)opener.focus({preventScroll:true});
    };
    dialog.onclick=event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)dialog.close();
    };
    opener?.setAttribute('aria-expanded','true');
    dialog.showModal();
  }
  function handleClick(button,domain) {
    if(button.dataset.cardGuide){
      if(button.dataset.cardGuide==='open')open(domain);
      else host()?.close();
      return true;
    }
    if(button.dataset.cardGuideKind){select(button.dataset.cardGuideKind);return true;}
    const example=button.closest('[data-card-guide-example]');
    if(!example)return false;
    const slot=example.querySelector('.reference-card-slot');
    if(Object.hasOwn(button.dataset,'cardGuideFlip')){
      setReferenceCardFace(slot,slot.dataset.cardState==='front'?'back':'front',{focus:false});
      return true;
    }
    if(button.dataset.cardGuideNote){
      const note=slot.querySelector('[data-card-guide-description="'+button.dataset.cardGuideNote+'"]');
      if(note){
        setReferenceCardFace(slot,'back',{focus:false});
        note.focus({preventScroll:true});
        note.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
      }
      return true;
    }
    return false;
  }
  return {
    markup:()=>'<dialog id="card-guide" class="card-guide" aria-labelledby="card-guide-title" aria-describedby="card-guide-intro"></dialog>',
    handleClick
  };
}
