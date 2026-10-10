import { createCardModels } from './card-models.mjs';
import { renderReferenceCard, setReferenceCardFace } from './reference-card.mjs';
const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCardInspector(data,{catalog}) {
  const models=createCardModels(data,catalog);
  let sequence=[],index=0,opener=null,contextId=null;
  const dialog=()=>document.querySelector('#card-inspector');
  const split=key=>{const delimiter=key.indexOf(':');return {kind:key.slice(0,delimiter),id:key.slice(delimiter+1)};};
  const model=()=>{const {kind,id}=split(sequence[index]);return kind==='drug'?models.drug(id,contextId):models.pathogen(id,contextId);};
  function renderCurrent(face='front'){
    const card=model(),host=dialog();if(!card || !host)return;
    const contexts=card.therapyContexts || [];
    host.innerHTML='<header class="card-inspector-top"><div><span class="eyebrow">CARD / '+(index+1)+' OF '+sequence.length+'</span><h2 id="card-inspector-title">'+esc(card.name)+'</h2></div><button type="button" class="card-inspector-close" data-card-inspector="close" aria-label="확대 카드 닫기">✕</button></header>'+
      (contexts.length?'<label class="card-inspector-context">금색 표시 기준<select id="card-inspector-context">'+(card.kind==='drug'?'<option value="all" '+(!card.therapyContext?'selected':'')+'>우선요법에 포함된 임상형 전체</option>':'')+contexts.map(context=>'<option value="'+esc(context.id)+'" '+(context.id===card.therapyContext?.id?'selected':'')+'>'+esc(context.context)+'</option>').join('')+'</select></label>':'<p class="card-inspector-context-note">흰색: 유효·요법 포함 기록 · 우선요법은 별도 근거가 있는 경우에 표시</p>')+
      '<div class="card-inspector-stage">'+renderReferenceCard({...card,face})+'</div>'+
      '<div class="card-inspector-actions"><button type="button" data-card-inspector="prev" '+(index===0?'disabled':'')+' aria-label="이전 카드">←</button><button type="button" class="card-inspector-flip" data-card-inspector="flip">카드 뒤집기 <span aria-hidden="true">↻</span></button><button type="button" data-card-inspector="next" '+(index===sequence.length-1?'disabled':'')+' aria-label="다음 카드">→</button></div>'+
      '<p class="card-inspector-hint">좌우로 쓸어 뒤집기 · 기호를 눌러 의미 보기</p>';
  }
  function close(){dialog()?.close();}
  function open(button){
    const collection=button.closest('.card-collection') || button.parentElement;
    sequence=[...collection.querySelectorAll('[data-card-open]')].map(item=>item.dataset.cardOpen);
    if(!sequence.includes(button.dataset.cardOpen))sequence=[button.dataset.cardOpen];
    index=sequence.indexOf(button.dataset.cardOpen);contextId=null;opener=button;renderCurrent();
    const host=dialog();
    host.addEventListener('close',()=>{document.body.classList.remove('card-inspector-open');if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
    host.onclick=event=>{if(event.target===host){const rect=host.getBoundingClientRect();if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)close();}};
    document.body.classList.add('card-inspector-open');host.showModal();
  }
  function navigate(direction){
    const next=index+direction;if(next<0 || next>=sequence.length)return;
    index=next;contextId=null;renderCurrent();dialog().querySelector('[data-card-inspector="flip"]')?.focus({preventScroll:true});
  }
  function handleClick(button){
    if(button.dataset.cardOpen){open(button);return true;}
    const action=button.dataset.cardInspector;if(!action)return false;
    if(action==='close')close();
    if(action==='prev' || action==='next')navigate(action==='prev'?-1:1);
    if(action==='flip'){
      const slot=dialog()?.querySelector('.reference-card-slot');
      if(slot)setReferenceCardFace(slot,slot.dataset.cardState==='front'?'back':'front',{focus:false});
    }
    return true;
  }
  function handleChange(target){
    if(target.id!=='card-inspector-context')return false;
    const face=dialog().querySelector('.reference-card-slot')?.dataset.cardState;
    contextId=target.value;renderCurrent(face);dialog().querySelector('#card-inspector-context')?.focus({preventScroll:true});return true;
  }
  function handleKeydown(event){
    if(!dialog()?.open || event.target.closest('input,select,textarea,.card-back-tabs,.card-back-content'))return false;
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);return true;}
    if(event.key.toLowerCase()==='f'){event.preventDefault();handleClick({dataset:{cardInspector:'flip'}});return true;}
    return false;
  }
  return {markup:()=>'<dialog id="card-inspector" class="card-inspector" aria-labelledby="card-inspector-title"></dialog>',handleClick,handleChange,handleKeydown,close};
}
