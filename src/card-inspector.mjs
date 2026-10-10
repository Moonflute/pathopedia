import { createCardModels } from './card-models.mjs';
import { renderReferenceCard, setReferenceCardFace } from './reference-card.mjs';
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCardInspector(data,{catalog}) {
  const models=createCardModels(data,catalog),treatmentSelections=new Map();
  let sequence=[],index=0,opener=null,linkHistory=[];
  const dialog=()=>document.querySelector('#card-inspector');
  const split=key=>{const delimiter=key.indexOf(':');return {kind:key.slice(0,delimiter),id:key.slice(delimiter+1)};};
  const model=()=>{const {kind,id}=split(sequence[index]);return models.get(kind,id,treatmentSelections.get(id));};
  const canOpen=key=>{
    const {kind,id}=split(key);
    return Boolean(kind==='disease'?catalog.diseases?.[id]:kind==='drug'?catalog.drugs[id]:kind==='pathogen'?catalog.variants[id]:false);
  };
  function relatedVariants() {
    const {kind,id}=split(sequence[index]);
    if(kind!=='pathogen')return [];
    const pathogenId=catalog.variants[id]?.pathogenId;
    const related=Object.values(catalog.variants).filter(variant=>variant.pathogenId===pathogenId);
    return related.length>1 && related.some(variant=>variant.resistance)?related.map(variant=>'pathogen:'+variant.id):[];
  }
  function renderCurrent(face='front',backTab='clinical'){
    const card=model(),host=dialog();if(!card || !host)return;
    const variants=relatedVariants();
    host.setAttribute('aria-label',card.name+(card.resistance?' · '+card.resistance.code:'')+' 확대 카드');
    host.innerHTML='<button type="button" class="card-inspector-close" data-card-inspector="close" aria-label="확대 카드 닫기">✕</button>'+
      '<div class="card-inspector-stage">'+renderReferenceCard({...card,face,backTab})+'</div>'+
      '<div class="card-inspector-actions"><button type="button" class="card-inspector-arrow" data-card-inspector="prev" '+(index===0 && !linkHistory.length?'disabled':'')+' aria-label="'+(linkHistory.length?'연결 전 카드로 돌아가기':'이전 카드')+'">←</button>'+
      '<button type="button" class="card-inspector-flip" data-card-inspector="flip"><span aria-hidden="true">↻</span> 뒤집기</button>'+
      (variants.length?'<button type="button" class="card-inspector-variant-toggle" data-card-inspector="variants" aria-expanded="false" aria-controls="card-inspector-variants">내성형</button>':'')+
      '<button type="button" class="card-inspector-arrow" data-card-inspector="next" '+(index===sequence.length-1?'disabled':'')+' aria-label="다음 카드">→</button></div>'+
      (variants.length?'<div id="card-inspector-variants" class="card-inspector-variants" role="group" aria-label="기본형과 내성형 선택" hidden>'+variants.map(key=>{
        const {id}=split(key),label=catalog.variants[id]?.label || id;
        return '<button type="button" data-card-variant="'+esc(key)+'" aria-pressed="'+(key===sequence[index])+'">'+esc(label)+'</button>';
      }).join('')+'</div>':'');
  }
  function closeVariants({focus=false}={}){
    const host=dialog(),panel=host?.querySelector('#card-inspector-variants'),button=host?.querySelector('[data-card-inspector="variants"]');
    if(panel)panel.hidden=true;
    button?.setAttribute('aria-expanded','false');
    if(focus)button?.focus({preventScroll:true});
  }
  function close(){dialog()?.close();}
  function open(button){
    const key=button.dataset.cardOpen;if(!canOpen(key))return;
    const collection=button.closest('.card-collection') || button.parentElement;
    const stack=button.closest('[data-card-stack-keys]');
    sequence=stack?stack.dataset.cardStackKeys.split('|'):[...collection.querySelectorAll('[data-card-open]')].map(item=>item.dataset.cardOpen);
    if(!sequence.includes(key))sequence=[key];
    sequence=sequence.filter(canOpen);linkHistory=[];
    index=sequence.indexOf(key);opener=button;renderCurrent();
    const host=dialog();
    host.addEventListener('close',()=>{document.body.classList.remove('card-inspector-open');linkHistory=[];if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
    host.oncancel=event=>{
      const panel=host.querySelector('#card-inspector-variants');
      if(panel && !panel.hidden){event.preventDefault();closeVariants({focus:true});}
    };
    host.onclick=event=>{
      if(event.target===host){close();return;}
      if(!event.target.closest('#card-inspector-variants,[data-card-inspector="variants"]'))closeVariants();
    };
    document.body.classList.add('card-inspector-open');host.showModal();
  }
  function openRelated(key){
    const host=dialog();if(!host?.open || !canOpen(key))return;
    linkHistory.push({sequence:[...sequence],index,face:host.querySelector('.reference-card-slot')?.dataset.cardState || 'back',backTab:host.querySelector('[data-card-back-tab][aria-selected="true"]')?.dataset.cardBackTab || 'clinical'});
    sequence=[key];index=0;renderCurrent();
    host.querySelector('[data-card-inspector="flip"]')?.focus({preventScroll:true});
  }
  function navigate(direction){
    if(direction===-1 && linkHistory.length){
      const previous=linkHistory.pop();sequence=previous.sequence;index=previous.index;renderCurrent(previous.face,previous.backTab);
    }else{
      const next=index+direction;if(next<0 || next>=sequence.length)return;
      index=next;renderCurrent();
    }
    dialog().querySelector('[data-card-inspector="flip"]')?.focus({preventScroll:true});
  }
  function handleClick(button){
    if(button.dataset.cardRelated){openRelated(button.dataset.cardRelated);return true;}
    if(button.dataset.cardOpen){open(button);return true;}
    if(button.dataset.cardVariant){
      if(!relatedVariants().includes(button.dataset.cardVariant))return true;
      const face=dialog().querySelector('.reference-card-slot')?.dataset.cardState;
      const backTab=dialog().querySelector('[data-card-back-tab][aria-selected="true"]')?.dataset.cardBackTab;
      let next=sequence.indexOf(button.dataset.cardVariant);
      if(next<0){sequence.splice(index+1,0,button.dataset.cardVariant);next=index+1;}
      index=next;renderCurrent(face,backTab);dialog().querySelector('[data-card-inspector="variants"]')?.focus({preventScroll:true});
      return true;
    }
    const action=button.dataset.cardInspector;if(!action)return false;
    if(action==='close')close();
    if(action==='prev' || action==='next')navigate(action==='prev'?-1:1);
    if(action==='variants'){
      const panel=dialog().querySelector('#card-inspector-variants');
      if(panel){
        const show=panel.hidden;panel.hidden=!show;button.setAttribute('aria-expanded',String(show));
        if(show)panel.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
      }
    }
    if(action==='flip'){
      const slot=dialog()?.querySelector('.reference-card-slot');
      if(slot)setReferenceCardFace(slot,slot.dataset.cardState==='front'?'back':'front',{focus:false});
    }
    return true;
  }
  function handleChange(target){
    if(!target.hasAttribute('data-disease-treatment'))return false;
    if(!dialog()?.open || !dialog().contains(target))return true;
    const {kind,id}=split(sequence[index]);
    if(kind!=='disease' || !catalog.diseases[id].treatments.some(item=>item.id===target.value))return true;
    treatmentSelections.set(id,target.value);
    renderCurrent('back','responses');dialog().querySelector('[data-disease-treatment]')?.focus({preventScroll:true});
    return true;
  }
  function handleKeydown(event){
    if(!dialog()?.open || event.target.closest('input,select,textarea,.card-back-tabs,.card-back-content'))return false;
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);return true;}
    if(event.key.toLowerCase()==='f'){event.preventDefault();handleClick({dataset:{cardInspector:'flip'}});return true;}
    return false;
  }
  return {markup:()=>'<dialog id="card-inspector" class="card-inspector" aria-label="확대 카드"></dialog>',handleClick,handleChange,handleKeydown,close};
}
