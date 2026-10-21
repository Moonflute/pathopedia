import {DISTRICTS} from './city-data.mjs';
import {storedPlacement,populationLimit} from './city-world.mjs';
import {cloneLayout,createTileLayout,layoutPlaceables,addLayoutBuilding,placeable,placementCheck,compileLayout} from './city-tile-layout.mjs';
export function createLayoutEditor(layout){
 const e={draft:cloneLayout(layout),selected:'heart',preview:null,undo:[],redo:[],message:'시설을 드래그해 배치',changed:false,expansionSite:'heart'};
 e.isStored=id=>storedPlacement(e.draft.items[id]);
 e.commit=next=>{e.undo.push(e.draft);if(e.undo.length>30)e.undo.shift();e.draft=next;e.redo=[];e.preview=null;e.changed=true;};
 e.event=(action,value)=>{
  if(action!=='preview')e.error='';
  if(action==='site'){e.expansionSite=value;return;}
  if(action==='add'){const result=addLayoutBuilding(e.draft,value,e.expansionSite);if(!result.ok){e.error=result.text;return;}e.commit(result.layout);e.selected=result.id;return;}
  if(action==='remove'){if(!placeable(e.selected)?.optional)return;const next=cloneLayout(e.draft);delete next.items[e.selected];e.commit(next);e.selected=e.expansionSite;return;}
  if(action==='select'){if(e.draft.items[value]){e.selected=value;e.preview=null;}return;}
  if(action==='preview'){e.preview=value;return;}
  if(action==='drop'){const p=e.preview;e.preview=null;if(!p)return;const check=placementCheck(e.draft,e.selected,p);e.message=check.reason;if(!check.ok)e.error=check.reason;if(check.ok){const next=cloneLayout(e.draft);next.items[e.selected]=p;e.commit(next);}return;}
  if(action==='store'){if(e.isStored(e.selected)){e.message='지도 위를 눌러 배치';return;}const next=cloneLayout(e.draft);next.items[e.selected]={col:-200-layoutPlaceables(e.draft).findIndex(d=>d.id===e.selected)*12,row:-200,rot:e.draft.items[e.selected].rot};e.commit(next);return;}
  if(action==='rotate'||action==='nudge'){const next=cloneLayout(e.draft),p=next.items[e.selected];if(action==='rotate')p.rot=(p.rot+Number(value)+4)%4;else{const [x,z]=value;p.col+=x;p.row+=z;}const check=e.isStored(e.selected)&&action==='rotate'?{ok:true,reason:'지도 위를 눌러 배치'}:placementCheck(next,e.selected,p);e.message=check.reason;if(!check.ok)e.error=check.reason;if(check.ok)e.commit(next);return;}
  if(action==='undo'&&e.undo.length){e.redo.push(e.draft);e.draft=e.undo.pop();e.preview=null;e.changed=true;}
  if(action==='redo'&&e.redo.length){e.undo.push(e.draft);e.draft=e.redo.pop();e.preview=null;e.changed=true;}
  if(action==='default'){e.commit(createTileLayout());if(!e.draft.items[e.selected])e.selected='heart';}
  if(!e.draft.items[e.selected])e.selected='heart';
 };
 return e;
}
const button=(a,label,extra='')=>'<button type="button" data-city-action="layout-'+a+'" '+extra+'>'+label+'</button>';
export function layoutEditorMarkup(e){
 const stored=Object.keys(e.draft.items).filter(id=>e.isStored(id)).length;
 const d=placeable(e.selected),p=e.preview||e.draft.items[e.selected],check=placementCheck(e.draft,e.selected,p),network=compileLayout(e.draft),size=d.bounds,turned=p.rot%2,w=size[2]-size[0],h=size[3]-size[1];
 return '<header><strong>마을 배치</strong><span data-layout-status>'+(e.error||(stored?'보관 '+stored+'개 · 모두 배치해 주세요':!check.ok?check.reason:!network.valid?'도로 연결을 확보하세요':e.changed?'저장 전 · 정원 '+populationLimit({layout:e.draft}):'시설 '+Object.keys(e.draft.items).length+' · 정원 '+populationLimit({layout:e.draft})))+'</span>'+button('cancel','취소')+button('save','저장','class="cc-layout-save" '+(stored||!check.ok||!network.valid?'disabled':''))+'</header>'+
 '<div class="cc-layout-selection"><select aria-label="편집할 시설" data-city-layout-select>'+layoutPlaceables(e.draft).map(x=>'<option value="'+x.id+'" '+(x.id===e.selected?'selected':'')+'>'+(e.isStored(x.id)?'보관 · ':'')+x.name+'</option>').join('')+'</select><span>'+ (turned?h:w)+'×'+(turned?w:h)+'칸 · '+p.rot*90+'°</span></div>'+
 '<div class="cc-layout-expansion"><select data-city-layout-site aria-label="증설할 구역">'+DISTRICTS.map(d=>'<option value="'+d.id+'" '+(d.id===e.expansionSite?'selected':'')+'>'+d.short+'</option>').join('')+'</select>'+button('add','집 +','data-city-id="house" title="세포 정원 +4"')+button('add','보급소 +','data-city-id="depot" title="하역 자리 +1"')+button('add','공방 +','data-city-id="production" title="작업 자리 +3"')+button('remove','철거',d.optional?'':'disabled')+'</div>'+
 '<div class="cc-layout-actions">'+button('rotate','↶','data-city-id="-1" aria-label="시설 왼쪽 90도 회전"')+button('rotate','↷','data-city-id="1" aria-label="시설 오른쪽 90도 회전"')+button('nudge','←','data-city-id="-1,0" aria-label="시설 왼쪽 한 칸"')+button('nudge','↑','data-city-id="0,-1" aria-label="시설 위로 한 칸"')+button('nudge','↓','data-city-id="0,1" aria-label="시설 아래로 한 칸"')+button('nudge','→','data-city-id="1,0" aria-label="시설 오른쪽 한 칸"')+button('undo','↶ 되돌림',e.undo.length?'':'disabled')+button('redo','↷ 다시',e.redo.length?'':'disabled')+'</div><footer><span>'+(e.isStored(e.selected)?'지도 위를 눌러 다시 배치':'건물 드래그 · R 회전')+'</span>'+button('store',e.isStored(e.selected)?'지도에 놓기':'임시 보관')+button('default','기본 배치')+'</footer>';
}
