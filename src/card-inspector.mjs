import { createCardModels } from './card-models.mjs';
import { renderReferenceCard, setReferenceCardFace } from './reference-card.mjs';
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCardInspector(data,{catalog}) {
  const models=createCardModels(data,catalog);
  let sequence=[],index=0,opener=null;
  const dialog=()=>document.querySelector('#card-inspector');
  const split=key=>{const delimiter=key.indexOf(':');return {kind:key.slice(0,delimiter),id:key.slice(delimiter+1)};};
  const model=()=>{const {kind,id}=split(sequence[index]);return kind==='drug'?models.drug(id):models.pathogen(id);};
  function relatedVariants() {
    const {kind,id}=split(sequence[index]);
    if(kind!=='pathogen')return [];
    const pathogenId=catalog.variants[id]?.pathogenId;
    const related=sequence.filter(key=>{
      const entry=split(key);
      return entry.kind==='pathogen' && catalog.variants[entry.id]?.pathogenId===pathogenId;
    });
    return related.length>1 && related.some(key=>catalog.variants[split(key).id]?.resistance)?related:[];
  }
  function renderCurrent(face='front'){
    const card=model(),host=dialog();if(!card || !host)return;
    const variants=relatedVariants();
    host.setAttribute('aria-label',card.name+(card.resistance?' · '+card.resistance.code:'')+' 확대 카드');
    host.innerHTML='<button type="button" class="card-inspector-close" data-card-inspector="close" aria-label="확대 카드 닫기">✕</button>'+
      '<div class="card-inspector-stage">'+renderReferenceCard({...card,face})+'</div>'+
      '<div class="card-inspector-actions"><button type="button" class="card-inspector-arrow" data-card-inspector="prev" '+(index===0?'disabled':'')+' aria-label="이전 카드">←</button>'+
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
    const collection=button.closest('.card-collection') || button.parentElement;
    const stack=button.closest('[data-card-stack-keys]');
    sequence=stack?stack.dataset.cardStackKeys.split('|'):[...collection.querySelectorAll('[data-card-open]')].map(item=>item.dataset.cardOpen);
    if(!sequence.includes(button.dataset.cardOpen))sequence=[button.dataset.cardOpen];
    index=sequence.indexOf(button.dataset.cardOpen);opener=button;renderCurrent();
    const host=dialog();
    host.addEventListener('close',()=>{document.body.classList.remove('card-inspector-open');if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
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
  function navigate(direction){
    const next=index+direction;if(next<0 || next>=sequence.length)return;
    index=next;renderCurrent();dialog().querySelector('[data-card-inspector="flip"]')?.focus({preventScroll:true});
  }
  function handleClick(button){
    if(button.dataset.cardOpen){open(button);return true;}
    if(button.dataset.cardVariant){
      const next=sequence.indexOf(button.dataset.cardVariant);if(next<0)return true;
      const face=dialog().querySelector('.reference-card-slot')?.dataset.cardState;
      index=next;renderCurrent(face);dialog().querySelector('[data-card-inspector="variants"]')?.focus({preventScroll:true});
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
  function handleKeydown(event){
    if(!dialog()?.open || event.target.closest('input,select,textarea,.card-back-tabs,.card-back-content'))return false;
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);return true;}
    if(event.key.toLowerCase()==='f'){event.preventDefault();handleClick({dataset:{cardInspector:'flip'}});return true;}
    return false;
  }
  return {markup:()=>'<dialog id="card-inspector" class="card-inspector" aria-label="확대 카드"></dialog>',handleClick,handleChange:()=>false,handleKeydown,close};
}
