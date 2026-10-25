const time=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
export function createPilotFieldUI(hud,model){
 const panel=document.createElement('aside');panel.className='cc-pilot-observation';panel.hidden=true;panel.setAttribute('aria-label','현장 관찰');
 panel.innerHTML='<header><small>SCAN</small><button type="button" data-field-close aria-label="관찰 닫기">×</button></header><strong data-field-name></strong><b data-field-task></b><span data-field-destination></span><small data-field-cargo></small><p data-field-why></p><small data-field-next></small><div class="cc-pilot-observe-actions"><button type="button" data-field-follow aria-pressed="false">T · 따라가기</button><button type="button" data-field-help hidden></button><button type="button" data-field-history aria-expanded="false">이력</button><button type="button" data-field-card>도감 ↗</button></div><ol data-field-log hidden></ol>';
 const incidents=document.createElement('div');incidents.className='cc-pilot-incidents';incidents.setAttribute('aria-label','주변 현장');hud.append(panel,incidents);
 const q=id=>panel.querySelector('[data-field-'+id+']');let expanded=false,historyKey='';
 panel.addEventListener('click',e=>{if(e.target.closest('[data-field-close]'))model.closeObservation();if(e.target.closest('[data-field-follow]'))model.toggleFollowing();if(e.target.closest('[data-field-help]'))model.equip(q('help').dataset.tool);if(e.target.closest('[data-field-history]')){expanded=!expanded;q('log').hidden=!expanded;q('history').setAttribute('aria-expanded',String(expanded));}});
 return {update(v){
  const o=v.observed;panel.hidden=!o;
  if(o){for(const id of ['name','task','destination','cargo','why','next'])q(id).textContent=o[id]||'';q('destination').textContent='→ '+o.destination;q('follow').hidden=!o.track||o.carrier;q('follow').setAttribute('aria-pressed',String(v.following));q('follow').textContent=v.following?'T · 추적 해제':'T · 따라가기';q('card').hidden=!o.card;if(o.card)q('card').dataset.cardOpen=o.card;else delete q('card').dataset.cardOpen;
   const keyboard=!matchMedia('(pointer:coarse), (max-width:760px), (max-height:520px)').matches;q('card').textContent=keyboard?'I · 도감 ↗':'도감 ↗';q('history').textContent=keyboard?'H · 이력':'이력';q('help').hidden=!o.help?.length;if(o.help?.length){q('help').textContent=(keyboard?'Z · ':'')+o.help[0].name;q('help').dataset.tool=o.help[0].tool;}
   q('history').hidden=!o.history.length;const key=o.key+JSON.stringify(o.history);if(key!==historyKey){historyKey=key;q('log').replaceChildren(...o.history.map(e=>{const li=document.createElement('li');li.textContent=time(e.at)+' · '+e.text;return li;}));}
  }
  const text=v.incidents.map(e=>e.name+' · '+e.phase).join('  /  ');if(incidents.textContent!==text)incidents.textContent=text;incidents.hidden=!text;
 },dispose(){panel.remove();incidents.remove();}};
}
