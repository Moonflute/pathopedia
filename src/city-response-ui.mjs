import {RESPONSE_STEPS,responseView} from './city-response.mjs';
import {siteAt} from './city-tile-layout.mjs';
import {CITY_ENTRIES} from './city-world.mjs';
import {WALLS} from './city-frontier-data.mjs';

export function createResponseUI(map,{focus,overview,signal}){
 const root=document.createElement('section');root.className='cc-response';root.setAttribute('aria-label','감염 반응 단계');
 root.innerHTML='<header><strong>감염 대기</strong><span></span><button type="button" class="cc-response-fold" aria-label="감염 단계 접기" aria-expanded="true">−</button></header><nav class="cc-response-steps" aria-label="면역 진행"></nav><p class="cc-response-detail" aria-live="polite"></p><nav class="cc-circuit-nav" aria-label="순환과 감염 입구"><button type="button" data-route="systemic">↻ 체순환</button><button type="button" data-route="pulmonary">⇄ 폐순환</button><button type="button" data-route="skin">피부</button><button type="button" data-route="airway">호흡기</button><button type="button" data-route="gut">소화기</button></nav><footer><i class="cc-blood-rich"></i>산소 많음 <i class="cc-blood-poor"></i>산소 적음 <i class="cc-entry-key"></i>입구 전용 다리</footer>';
 const title=root.querySelector('strong'),route=root.querySelector('header span'),detail=root.querySelector('p'),steps=RESPONSE_STEPS.map((name,n)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${n+1}</b><span>${name}</span>`;b.dataset.state='waiting';root.querySelector('.cc-response-steps').append(b);b.addEventListener('click',()=>focus(view?.steps[n].point,true),{signal});return b;});
 let view=null,run=null,last=-Infinity,selected=null;
 const cases=document.createElement('button');cases.type='button';cases.className='cc-response-case';cases.setAttribute('aria-label','다른 감염 보기');cases.hidden=true;root.querySelector('header').insertBefore(cases,route);
 cases.addEventListener('click',()=>{const list=run?.immunity?.response?.episodes||[];if(!list.length)return;const e=list[(list.indexOf(view?.episode)+1)%list.length];selected=e.recordId+'@'+e.started;last=-Infinity;},{signal});
 root.querySelector('.cc-response-fold').addEventListener('click',e=>{const collapsed=root.classList.toggle('is-collapsed');e.currentTarget.setAttribute('aria-expanded',String(!collapsed));e.currentTarget.setAttribute('aria-label',collapsed?'감염 단계 펼치기':'감염 단계 접기');e.currentTarget.textContent=collapsed?'+':'−';},{signal});
 root.querySelector('.cc-circuit-nav').addEventListener('click',e=>{
  const button=e.target.closest('[data-route]');if(!button||!run)return;const id=button.dataset.route;
  if(id==='systemic')overview();else if(id==='pulmonary'){const a=siteAt(run.layout,'heart'),b=siteAt(run.layout,'lung');focus({x:(a.x+b.x)/2,z:(a.z+b.z)/2},true);}else focus(id==='skin'?WALLS[11]:CITY_ENTRIES[id].mouth||CITY_ENTRIES[id].portal,true);
 },{signal});map.append(root);
 return {root,update(s,hidden=false){root.hidden=hidden;run=s;const now=performance.now();if(now-last<250)return;last=now;view=responseView(s,selected);
  const list=s.immunity?.response?.episodes||[];cases.hidden=list.length<2;cases.textContent=(list.indexOf(view?.episode)+1)+' / '+list.length+' ›';
  title.textContent=view?view.name:'감염 대기';route.textContent=view?view.route+(view.episode.closedAt!=null?' · 회복 완료':''):'피부 · 호흡기 · 소화기';
  for(let n=0;n<steps.length;n++){const b=steps[n],step=view?.steps[n];b.disabled=!view;b.dataset.state=step?.state||'waiting';b.title=step?step.name+' · '+step.detail+' · 위치 보기':RESPONSE_STEPS[n];b.setAttribute('aria-current',step?.state==='active'?'step':'false');}
  const next=view?.steps[view.stage];detail.textContent=next?next.name+' · '+next.detail:'입구에서 시작해 조직까지';
 },dispose(){root.remove();}};
}
