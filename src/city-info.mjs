import {icon} from './luck-icons.mjs';
import {INFO_KINDS,INFO_LINKS,createCityInfoDocument} from './city-info-data.mjs';
import {INFO_LIMITS,loadCityInfo,parseCityInfo,createInfoEditor,infoBounds} from './city-info-model.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const button=(action,label,extra='')=>`<button type="button" data-info-action="${action}" ${extra}>${label}</button>`;
const lines=(value,size,count=2)=>{const chars=Array.from(value),out=[];for(let i=0;i<count&&i*size<chars.length;i++)out.push(chars.slice(i*size,(i+1)*size).join(''));if(chars.length>size*count)out[count-1]=out[count-1].slice(0,-1)+'…';return out;};
let sheet;
export function loadCityInfoStyles(){
  if(sheet)return sheet;
  sheet=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./city-info.css',import.meta.url).href;link.onload=resolve;link.onerror=()=>{link.remove();sheet=null;reject(Error('정보 화면 스타일을 불러오지 못했어요.'));};document.head.append(link);});
  return sheet;
}

export function openCityInfo({onClose=()=>{},trigger=null}={}){
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const loaded=loadCityInfo(storage),editor=createInfoEditor(loaded.document),controller=new AbortController();
  const dialog=document.createElement('dialog');dialog.className='cif-dialog';dialog.setAttribute('aria-labelledby','cif-title');
  let viewID='overview',editing=false,selected=null,message=loaded.message,closed=false,guard=false,formDirty=false;
  let camera={x:0,y:0,scale:1},gesture=null,pendingMove=null,frame=0,suppressClick=false;
  const pointers=new Map(),views=()=>editor.document.views,view=()=>views().find(v=>v.id===viewID),node=id=>editor.document.nodes.find(n=>n.id===id);
  dialog.innerHTML=`<div class="cif-shell">
    <header class="cif-header"><div class="cif-brand"><span class="cif-brand-icon">${icon('layout-grid')}</span><div><small>CELL CITY / INFORMATION</small><h2 id="cif-title">도시 관계도</h2></div></div><div class="cif-header-actions">${button('edit','편집','aria-pressed="false"')}${button('save','저장','class="cif-primary" disabled')}${button('close',icon('x'),'class="cif-icon-button" aria-label="정보 닫기"')}</div></header>
    <div class="cif-body"><nav class="cif-nav" aria-label="상호작용 흐름"><div class="cif-nav-heading">도시가 움직이는 방식</div>${views().map((v,i)=>button('view',`<span class="cif-nav-number">${String(i+1).padStart(2,'0')}</span><span>${esc(v.name)}</span>`,`data-view="${v.id}" aria-pressed="${i===0}"`)).join('')}<div class="cif-nav-note">현재 3D 구현 기준<br>생리 과정과 수치는 게임용 단순화</div></nav>
    <div class="cif-main"><div class="cif-toolbar"><label class="cif-mobile-views"><span class="cif-sr">상호작용 흐름</span><select aria-label="상호작용 흐름 선택">${views().map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></label><div class="cif-view-title"><strong data-info-view-title></strong><span data-info-caption></span></div><div class="cif-tools">${button('add','+ 요소','data-edit-only hidden')}${button('undo','↶','aria-label="관계도 되돌리기" disabled')}${button('redo','↷','aria-label="관계도 다시 실행" disabled')}<details class="cif-more"><summary aria-label="관계도 파일 메뉴">⋯</summary><div>${button('export','JSON 내보내기')}${button('import','JSON 불러오기')}${button('reset','기본 관계도 복원')}<small>복원·불러오기도 되돌릴 수 있어요.</small></div></details></div></div>
    <div class="cif-workspace"><section class="cif-canvas-wrap" aria-label="관계도 작업 영역"><svg class="cif-canvas" tabindex="0" role="group" aria-label="요소를 선택해 설명 보기. 빈 곳 드래그로 이동, 휠 또는 두 손가락으로 확대 축소."><defs>${Object.entries(INFO_LINKS).map(([id,k])=>`<marker id="cif-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${k.color}"/></marker>`).join('')}</defs><g data-info-world><g data-info-edges></g><g data-info-nodes></g></g></svg><div class="cif-map-legend">${Object.entries(INFO_LINKS).map(([id,k])=>`<span><i style="--link:${k.color}" class="${id==='damage'?'cif-dashed':''}"></i>${k.label}</span>`).join('')}</div><div class="cif-zoom">${button('zoom-out','−','aria-label="관계도 축소"')}<output aria-label="관계도 배율">100%</output>${button('zoom-in','+','aria-label="관계도 확대"')}${button('fit','전체','aria-label="관계도 전체 보기"')}</div><div class="cif-canvas-hint" data-info-hint>요소 선택 · 드래그 이동 · 휠/두 손가락 확대</div></section><aside class="cif-inspector" aria-label="선택한 요소 정보" hidden></aside></div>
    </div></div><footer class="cif-footer"><span class="cif-status" role="status" aria-live="polite"></span><span>편집은 관계도에만 적용 · 이 브라우저에 저장</span></footer></div>
    <section class="cif-close-guard" aria-label="변경 내용 저장" hidden><div><small>변경 내용이 있어요</small><h3>관계도를 저장할까요?</h3><p>게임의 배치와 진행에는 영향을 주지 않아요.</p><div>${button('keep-editing','계속 편집')}${button('discard','저장 안 함')}${button('save-close','저장 후 닫기','class="cif-primary"')}</div></div></section><input type="file" accept="application/json,.json" data-info-file hidden>`;
  document.body.append(dialog);dialog.showModal();
  const svg=dialog.querySelector('.cif-canvas'),world=dialog.querySelector('[data-info-world]'),inspector=dialog.querySelector('.cif-inspector'),wrap=dialog.querySelector('.cif-canvas-wrap');
  const on=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:controller.signal});
  function announce(text){message=text;status();}
  function status(){
    dialog.dataset.editing=String(editing);
    dialog.querySelector('.cif-status').textContent=editor.dirty||formDirty?'저장 전 · '+message:message;
    const edit=dialog.querySelector('[data-info-action="edit"]');edit.textContent=editing?'편집 중':'편집';edit.setAttribute('aria-pressed',String(editing));
    dialog.querySelector('[data-info-action="save"]').disabled=!(editor.dirty||formDirty);
    dialog.querySelector('[data-info-action="undo"]').disabled=!editor.canUndo;
    dialog.querySelector('[data-info-action="redo"]').disabled=!editor.canRedo;
    for(const el of dialog.querySelectorAll('[data-edit-only]'))el.hidden=!editing;
    dialog.querySelector('[data-info-hint]').textContent=editing?'요소 드래그 · 빈 곳 이동 · 수정 후 저장':'요소 선택 · 드래그 이동 · 휠/두 손가락 확대';
  }
  function applyCamera(){world.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);dialog.querySelector('.cif-zoom output').textContent=Math.round(camera.scale*100)+'%';}
  function zoom(factor,x=wrap.clientWidth/2,y=wrap.clientHeight/2){const s=clamp(camera.scale*factor,.18,2);camera.x=x-(x-camera.x)*s/camera.scale;camera.y=y-(y-camera.y)*s/camera.scale;camera.scale=s;applyCamera();}
  function fit(initial=false){
    const b=infoBounds(view()),w=wrap.clientWidth,h=wrap.clientHeight;
    camera.scale=clamp(Math.min(w/b.width,(h-66)/b.height),.18,1.15);
    if(initial&&w<600)camera.scale=Math.max(.78,camera.scale);
    camera.x=(w-b.width*camera.scale)/2-b.x*camera.scale;camera.y=(h-b.height*camera.scale)/2-b.y*camera.scale;
    if(initial&&w<600){camera.x=20-b.x*camera.scale;camera.y=34-b.y*camera.scale;}
    applyCamera();
  }
  function focusNode(id){const p=view().positions[id];if(!p)return;camera.scale=Math.max(.85,camera.scale);camera.x=wrap.clientWidth/2-(p.x+110)*camera.scale;camera.y=wrap.clientHeight/2-(p.y+50)*camera.scale;applyCamera();}
  function connection(e,positions){
    const a=positions[e.from],b=positions[e.to],dx=b.x-a.x,dy=b.y-a.y;
    let ax,ay,bx,by,cx,cy,ex,ey;
    if(Math.abs(dx)>Math.abs(dy)*1.15){const sign=Math.sign(dx)||1;ax=a.x+(sign>0?220:0);ay=a.y+50;bx=b.x+(sign>0?0:220);by=b.y+50;const bend=Math.max(38,Math.abs(bx-ax)*.5);cx=ax+sign*bend;cy=ay;ex=bx-sign*bend;ey=by;}
    else{const sign=Math.sign(dy)||1;ax=a.x+110;ay=a.y+(sign>0?100:0);bx=b.x+110;by=b.y+(sign>0?0:100);const bend=Math.max(34,Math.abs(by-ay)*.5);cx=ax;cy=ay+sign*bend;ex=bx;ey=by-sign*bend;}
    return {d:`M${ax} ${ay}C${cx} ${cy} ${ex} ${ey} ${bx} ${by}`,x:(ax+3*cx+3*ex+bx)/8,y:(ay+3*cy+3*ey+by)/8};
  }
  function paint(){
    const v=view(),positions={...v.positions};if(pendingMove)positions[pendingMove.id]=pendingMove.point;
    const related=selected?.type==='node'?new Set(v.edges.filter(e=>e.from===selected.id||e.to===selected.id).map(e=>e.id)):null;
    dialog.querySelector('[data-info-edges]').innerHTML=v.edges.map(e=>{
      const p=connection(e,positions),k=INFO_LINKS[e.kind],active=selected?.type==='edge'&&selected.id===e.id,label=lines(e.label,24,1)[0]||'',width=Math.min(192,Array.from(label).length*6.7+16);
      return `<g class="cif-edge${active?' is-selected':''}${related&&!related.has(e.id)?' is-dim':''}" data-info-edge="${e.id}" role="button" tabindex="0" aria-label="${esc(node(e.from).label+' → '+node(e.to).label+' · '+e.label)}"><path class="cif-edge-hit" d="${p.d}"/><path class="cif-edge-line" d="${p.d}" stroke="${k.color}" ${e.kind==='damage'?'stroke-dasharray="6 5"':''} marker-end="url(#cif-arrow-${e.kind})"/>${label?`<rect class="cif-edge-label-bg" x="${p.x-width/2}" y="${p.y-10}" width="${width}" height="20" rx="5"/><text class="cif-edge-label" x="${p.x}" y="${p.y+4}">${esc(label)}</text>`:''}</g>`;
    }).join('');
    dialog.querySelector('[data-info-nodes]').innerHTML=Object.entries(positions).map(([id,p])=>{
      const n=node(id),k=INFO_KINDS[n.kind],isSelected=selected?.type==='node'&&selected.id===id;
      return `<g class="cif-node${isSelected?' is-selected':''}" data-info-node="${id}" role="button" tabindex="0" aria-label="${esc(n.label)}" transform="translate(${p.x} ${p.y})" style="--node:${k.color};--node-fill:${k.fill}"><title>${esc(n.label+' · '+n.summary)}</title><rect class="cif-node-base" x="0" y="0" width="220" height="100" rx="14"/><rect class="cif-node-stripe" x="0" y="16" width="4" height="68" rx="2"/><text class="cif-node-kind" x="18" y="22">${k.symbol} ${k.label}</text><text class="cif-node-label" x="18" y="47">${esc(lines(n.label,17,1)[0])}</text><text class="cif-node-summary">${lines(n.summary,23).map((line,i)=>`<tspan x="18" y="${70+i*14}">${esc(line)}</tspan>`).join('')}</text>${editing?'<text class="cif-drag-mark" x="196" y="23">⠿</text>':''}</g>`;
    }).join('');
    applyCamera();status();
  }
  const options=(dict,value)=>Object.entries(dict).map(([id,k])=>`<option value="${id}" ${id===value?'selected':''}>${esc(k.label)}</option>`).join('');
  const nodeOptions=value=>Object.keys(view().positions).map(id=>`<option value="${id}" ${id===value?'selected':''}>${esc(node(id).label)}</option>`).join('');
  function showInspector(){
    if(selected?.type==='node'&&!Object.hasOwn(view().positions,selected.id)||selected?.type==='edge'&&!view().edges.some(e=>e.id===selected.id))selected=null;
    inspector.hidden=!selected;dialog.querySelector('.cif-workspace').classList.toggle('has-selection',!!selected);if(!selected){inspector.innerHTML='';return;}
    const head=title=>`<header><div><small>${editing?'EDIT / 편집':'INSPECT / 살펴보기'}</small><h3>${esc(title)}</h3></div>${button('deselect',icon('x'),'class="cif-icon-button" aria-label="요소 정보 접기"')}</header>`;
    if(selected.type==='node'){
      const n=node(selected.id),connections=view().edges.filter(e=>e.from===n.id||e.to===n.id);
      inspector.innerHTML=head(n.label)+`<div class="cif-inspector-body">${editing?`<form data-info-form="node"><label>이름<input name="label" maxlength="48" value="${esc(n.label)}" required></label><label>분류<select name="kind">${options(INFO_KINDS,n.kind)}</select></label><label>짧은 설명<input name="summary" maxlength="90" value="${esc(n.summary)}"></label><label>작동 내용<textarea name="detail" maxlength="1600" rows="4">${esc(n.detail)}</textarea></label></form>`:`<span class="cif-kind-chip" style="--node:${INFO_KINDS[n.kind].color}">${INFO_KINDS[n.kind].label}</span><p class="cif-node-detail">${esc(n.detail||n.summary||'설명을 추가할 수 있어요.')}</p>`}<div class="cif-connections-heading"><strong>연결 ${connections.length}</strong>${editing?button('connect','+ 연결'):''}</div><div class="cif-connection-list">${connections.map(e=>button('edge',`<span>${e.from===n.id?'나가는 연결':'들어오는 연결'} · ${esc(e.label)}</span><strong>${esc(node(e.from===n.id?e.to:e.from).label)} ${e.from===n.id?'→':'←'}</strong>`,`data-edge="${e.id}"`)).join('')||'<p class="cif-empty">연결된 요소가 없어요.</p>'}</div>${n.source?`<details class="cif-source"><summary>구현 근거</summary><p>${esc(n.source)}</p></details>`:''}${editing?button('remove-node','이 흐름에서 요소 빼기','class="cif-remove"'):''}</div>`;
    }else{
      const adding=selected.type==='new-edge',e=adding?{from:selected.from,to:Object.keys(view().positions).find(id=>id!==selected.from)||'',label:'',kind:'supply'}:view().edges.find(e=>e.id===selected.id);
      inspector.innerHTML=head(adding?'연결 추가':'요소 간 연결')+`<div class="cif-inspector-body">${editing?`<form data-info-form="${adding?'new-edge':'edge'}"><label>출발<select name="from">${nodeOptions(e.from)}</select></label><label>도착<select name="to">${nodeOptions(e.to)}</select></label><label>관계<input name="label" maxlength="64" value="${esc(e.label)}" placeholder="예: 산소 운반"></label><label>연결 종류<select name="kind">${options(INFO_LINKS,e.kind)}</select></label>${adding?'<button type="submit" class="cif-primary">연결 만들기</button>':''}</form>${adding?'':button('remove-edge','연결 삭제','class="cif-remove"')}`:`<div class="cif-edge-detail">${button('focus-node',esc(node(e.from).label),`data-node="${e.from}"`)}<span>↓ ${esc(e.label)}</span>${button('focus-node',esc(node(e.to).label),`data-node="${e.to}"`)}</div><span class="cif-kind-chip">${INFO_LINKS[e.kind].label}</span>`}</div>`;
    }
  }
  function select(type,id,focus=false){if(!flush())return;selected={type,id};showInspector();paint();if(focus||matchMedia('(max-width:700px)').matches)requestAnimationFrame(()=>{if(!closed&&type==='node')focusNode(id);});}
  function renderView(initial=false){
    dialog.querySelector('[data-info-view-title]').textContent=view().name;
    dialog.querySelector('[data-info-caption]').textContent=view().caption;
    for(const b of dialog.querySelectorAll('[data-info-action="view"]'))b.setAttribute('aria-pressed',String(b.dataset.view===viewID));
    dialog.querySelector('.cif-mobile-views select').value=viewID;
    showInspector();paint();fit(initial);
  }
  function flush(report=true){
    const form=inspector.querySelector('form'),kind=form?.dataset.infoForm;if(!form||kind==='new-edge')return true;
    if(!form.checkValidity()){if(report)form.reportValidity();return false;}
    const values=Object.fromEntries(new FormData(form));
    if(kind==='edge'&&values.from===values.to){if(report)announce('출발과 도착은 다른 요소를 골라 주세요.');return false;}
    const changed=editor.change(d=>{if(kind==='node'){const n=d.nodes.find(n=>n.id===selected.id);Object.assign(n,values);}else{const e=d.views.find(v=>v.id===viewID).edges.find(e=>e.id===selected.id);Object.assign(e,values);}});
    formDirty=false;if(changed){message='내용 수정';paint();}else status();return true;
  }
  function save(){if(!flush())return false;const ok=editor.save(storage);announce(ok?'저장됨 · 이 브라우저':'저장 실패 · JSON 내보내기로 보관해 주세요.');return ok;}
  function closeGuard(show){guard=show;dialog.querySelector('.cif-close-guard').hidden=!show;dialog.querySelector('.cif-shell').inert=show;if(show)dialog.querySelector('[data-info-action="keep-editing"]').focus();}
  function requestClose(){if(!flush())return;if(editor.dirty)closeGuard(true);else destroy();}
  function destroy(){if(closed)return;closed=true;controller.abort();resize.disconnect();cancelAnimationFrame(frame);pointers.clear();dialog.close();dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});onClose();}
  function exportFile(){
    if(!flush())return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(editor.document,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='cell-city-relations.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('JSON 내보내기 완료');
  }
  function newID(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
  function act(action,target){
    if(action==='close'){requestClose();return;}
    if(action==='keep-editing'){closeGuard(false);dialog.querySelector('[data-info-action="save"]').focus();return;}
    if(action==='discard'){destroy();return;}
    if(action==='save-close'){if(save())destroy();else closeGuard(false);return;}
    if(action==='save'){save();return;}
    if(action==='export'){exportFile();return;}
    if(action==='zoom-in'||action==='zoom-out'){zoom(action==='zoom-in'?1.2:1/1.2);return;}
    if(action==='fit'){fit();return;}
    if(action==='import'){dialog.querySelector('[data-info-file]').click();return;}
    if(!flush())return;
    if(action==='view'){viewID=target.dataset.view;selected=null;renderView(true);return;}
    if(action==='edit'){editing=!editing;showInspector();paint();return;}
    if(action==='edge'){select('edge',target.dataset.edge);return;}
    if(action==='focus-node'){select('node',target.dataset.node,true);return;}
    if(action==='deselect'){selected=null;showInspector();paint();return;}
    if(action==='undo'||action==='redo'){editor[action]();selected=null;showInspector();paint();announce(action==='undo'?'되돌림':'다시 실행');return;}
    if(action==='reset'){editor.replace(createCityInfoDocument());selected=null;renderView(true);announce('기본 관계도 복원 · 되돌리기 가능');return;}
    if(!editing)return;
    if(action==='add'){
      if(editor.document.nodes.length>=INFO_LIMITS.nodes){announce('요소는 최대 '+INFO_LIMITS.nodes+'개까지 만들 수 있어요.');return;}
      const id=newID('custom'),p={x:clamp((wrap.clientWidth/2-camera.x)/camera.scale-110,-12000,12000),y:clamp((wrap.clientHeight/2-camera.y)/camera.scale-50,-12000,12000)};
      editor.change(d=>{d.nodes.push({id,label:'새 요소',kind:'rule',summary:'',detail:'',source:'사용자 작성'});d.views.find(v=>v.id===viewID).positions[id]=p;});selected={type:'node',id};showInspector();paint();announce('요소 추가');inspector.querySelector('[name="label"]').select();
    }else if(action==='connect'){
      if(Object.keys(view().positions).length<2){announce('연결할 요소를 먼저 추가해 주세요.');return;}
      if(view().edges.length>=INFO_LIMITS.edges){announce('이 흐름의 연결 한도에 도달했어요.');return;}
      selected={type:'new-edge',from:selected.id};showInspector();
    }else if(action==='remove-node'){
      const id=selected.id;editor.change(d=>{const v=d.views.find(v=>v.id===viewID);delete v.positions[id];v.edges=v.edges.filter(e=>e.from!==id&&e.to!==id);if(!d.views.some(v=>Object.hasOwn(v.positions,id)))d.nodes=d.nodes.filter(n=>n.id!==id);});selected=null;showInspector();paint();announce('이 흐름에서 제외 · 되돌리기 가능');
    }else if(action==='remove-edge'){
      editor.change(d=>{const v=d.views.find(v=>v.id===viewID);v.edges=v.edges.filter(e=>e.id!==selected.id);});selected=null;showInspector();paint();announce('연결 삭제 · 되돌리기 가능');
    }
  }
  on(dialog,'click',e=>{const b=e.target.closest('[data-info-action]');if(b){act(b.dataset.infoAction,b);if(b.closest('.cif-more'))b.closest('.cif-more').open=false;}});
  on(dialog,'cancel',e=>{e.preventDefault();if(guard)closeGuard(false);else requestClose();});
  on(dialog,'submit',e=>{
    e.preventDefault();const form=e.target;if(form.dataset.infoForm!=='new-edge'||!editing)return;
    const value=Object.fromEntries(new FormData(form));if(value.from===value.to){announce('출발과 도착은 다른 요소를 골라 주세요.');return;}
    const id=newID('link');if(editor.change(d=>d.views.find(v=>v.id===viewID).edges.push({id,...value}))){selected={type:'edge',id};showInspector();paint();announce('연결 추가');}
  });
  on(inspector,'change',()=>flush(false));
  on(inspector,'input',e=>{if(e.target.closest('form')?.dataset.infoForm!=='new-edge'){formDirty=true;status();}});
  on(dialog.querySelector('.cif-mobile-views select'),'change',e=>{if(flush()){viewID=e.target.value;selected=null;renderView(true);}else e.target.value=viewID;});
  on(dialog.querySelector('[data-info-file]'),'change',async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;if(!flush())return;
    if(file.size>INFO_LIMITS.bytes){announce('파일은 500KB 이하만 불러올 수 있어요.');return;}
    try{const next=parseCityInfo(await file.text());if(closed)return;if(!next){announce('지원하지 않는 관계도 파일이에요. 기존 내용은 유지했어요.');return;}editor.replace(next);selected=null;renderView(true);announce('JSON 불러옴 · 저장 전 · 되돌리기 가능');}
    catch{announce('파일을 읽지 못했어요. 기존 내용은 유지했어요.');}
  });
  on(dialog,'keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();return;}
    if(e.target.closest('input,textarea,select'))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();act(e.shiftKey?'redo':'undo');return;}
    const item=e.target.closest('[data-info-node],[data-info-edge]');
    if(item&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(item.dataset.infoNode?'node':'edge',item.dataset.infoNode||item.dataset.infoEdge);return;}
    if(editing&&selected?.type==='node'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&e.target.closest('svg')){
      e.preventDefault();const delta=e.shiftKey?20:8;editor.change(d=>{const p=d.views.find(v=>v.id===viewID).positions[selected.id];p.x=clamp(p.x+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),-12000,12000);p.y=clamp(p.y+(e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0),-12000,12000);});paint();svg.querySelector(`[data-info-node="${selected.id}"]`)?.focus();
    }
  });
  // Pointer events cover mouse, touch and pen. Only the open diagram does work;
  // it has no simulation/render loop and redraws at most once per input frame.
  const local=e=>{const r=svg.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function schedulePaint(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!closed)paint();});}
  on(svg,'pointerdown',e=>{
    if(e.button!==0||!flush())return;
    e.preventDefault();svg.focus({preventScroll:true});svg.setPointerCapture(e.pointerId);const p=local(e);pointers.set(e.pointerId,p);suppressClick=false;
    if(pointers.size>1){if(pendingMove){editor.change(d=>{d.views.find(v=>v.id===viewID).positions[pendingMove.id]=pendingMove.point;});pendingMove=null;}gesture={multiple:true};return;}
    const id=e.target.closest('[data-info-node]')?.dataset.infoNode,edge=e.target.closest('[data-info-edge]')?.dataset.infoEdge;
    gesture={start:p,last:p,id,edge,moved:false,origin:id?{...view().positions[id]}:null};
  });
  on(svg,'pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;const p=local(e),before=[...pointers.values()];pointers.set(e.pointerId,p);
    if(pointers.size>=2){const after=[...pointers.values()],a=mid(before[0],before[1]),b=mid(after[0],after[1]),length=distance(before[0],before[1]);if(length>2)zoom(distance(after[0],after[1])/length,a.x,a.y);camera.x+=b.x-a.x;camera.y+=b.y-a.y;applyCamera();gesture.multiple=true;return;}
    if(gesture.multiple)return;
    if(distance(p,gesture.start)>5)gesture.moved=true;
    if(gesture.moved){
      if(editing&&gesture.id){pendingMove={id:gesture.id,point:{x:clamp(Math.round((gesture.origin.x+(p.x-gesture.start.x)/camera.scale)/8)*8,-12000,12000),y:clamp(Math.round((gesture.origin.y+(p.y-gesture.start.y)/camera.scale)/8)*8,-12000,12000)}};schedulePaint();}
      else{camera.x+=p.x-gesture.last.x;camera.y+=p.y-gesture.last.y;applyCamera();}
    }
    gesture.last=p;
  });
  function pointerEnd(e,cancel=false){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);if(pointers.size)return;
    const g=gesture;gesture=null;suppressClick=true;cancelAnimationFrame(frame);frame=0;
    if(pendingMove){if(!cancel)editor.change(d=>{d.views.find(v=>v.id===viewID).positions[pendingMove.id]=pendingMove.point;});pendingMove=null;paint();if(!cancel)announce('요소 이동');}
    if(!cancel&&!g?.multiple&&!g?.moved){if(g.id)select('node',g.id);else if(g.edge)select('edge',g.edge);else{selected=null;showInspector();paint();}}
  }
  on(svg,'pointerup',e=>pointerEnd(e));on(svg,'pointercancel',e=>pointerEnd(e,true));on(svg,'lostpointercapture',e=>pointerEnd(e,true));
  on(svg,'click',e=>{if(suppressClick){suppressClick=false;return;}const el=e.target.closest('[data-info-node],[data-info-edge]');if(el)select(el.dataset.infoNode?'node':'edge',el.dataset.infoNode||el.dataset.infoEdge);});
  on(svg,'wheel',e=>{e.preventDefault();const p=local(e);zoom(Math.exp(-clamp(e.deltaY,-120,120)*.003),p.x,p.y);},{passive:false});
  let viewportWidth=wrap.clientWidth,viewportHeight=wrap.clientHeight;
  const resize=new ResizeObserver(()=>{
    // Preserve the viewed world center when the inspector opens or the device rotates.
    camera.x+=(wrap.clientWidth-viewportWidth)/2;camera.y+=(wrap.clientHeight-viewportHeight)/2;
    viewportWidth=wrap.clientWidth;viewportHeight=wrap.clientHeight;applyCamera();
  });resize.observe(wrap);
  renderView(true);dialog.querySelector('[data-info-action="close"]').focus({preventScroll:true});
  return {destroy};
}
