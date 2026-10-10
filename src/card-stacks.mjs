const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORAGE_KEY='pathopedia:card-stacks';

// Group only the supplied, already filtered cards. Drug cards and unrelated
// clinical variants remain separate; a stack needs an explicit resistance tag.
export function groupResistanceCards(items,catalog,{enabled=true}={}) {
  const single=item=>({type:'card',id:item.id,items:[item]});
  if(!enabled)return items.map(single);
  const buckets=new Map();
  for(const item of items){
    const id=catalog.variants[item.id]?.pathogenId;
    if(!id)continue;
    if(!buckets.has(id))buckets.set(id,[]);
    buckets.get(id).push(item);
  }
  const eligible=new Map();
  for(const [id,members] of buckets){
    if(members.length<2 || !members.some(item=>catalog.variants[item.id]?.resistance))continue;
    const representative=catalog.pathogens[id]?.representativeRecordId;
    const rank=item=>catalog.variants[item.id]?.resistance?2:item.id===representative?0:1;
    const ordered=[...members].sort((a,b)=>rank(a)-rank(b));
    eligible.set(id,{
      type:'stack',id,name:catalog.pathogens[id]?.name || members[0].organism || members[0].name,
      items:ordered,resistanceCount:members.filter(item=>catalog.variants[item.id]?.resistance).length,
      resistanceLabels:[...new Set(members.map(item=>catalog.variants[item.id]?.resistance?.code).filter(Boolean))]
    });
  }
  const seen=new Set(),result=[];
  for(const item of items){
    const id=catalog.variants[item.id]?.pathogenId,group=eligible.get(id);
    if(!group){result.push(single(item));continue;}
    if(!seen.has(id)){seen.add(id);result.push(group);}
  }
  return result;
}

export function renderResistanceStack(group,renderCard,{expanded=false,prefix='cards',tag='div',className=''}={}) {
  const id=prefix+'-stack-'+group.id;
  const keys=group.items.map(item=>item.key || 'pathogen:'+item.id).join('|');
  const count='내성형 '+group.resistanceCount+' · 전체 '+group.items.length+'장';
  const button='<button type="button" id="'+esc(id)+'-toggle" class="card-stack-toggle" data-card-stack-toggle="'+esc(group.id)+'" data-card-stack-view="'+esc(prefix)+'" aria-expanded="'+expanded+'" aria-controls="'+esc(id)+'" aria-label="'+esc(group.name+' · '+count+' · '+(expanded?'접기':'펼치기'))+'">'+(expanded?'접기 ▴':'펼치기 ▾')+'</button>';
  const labels='<p class="card-stack-variants">'+esc(group.resistanceLabels.join(' / '))+'</p>';
  const header='<div class="card-stack-heading">'+(expanded?'<h3>'+esc(group.name)+'</h3>':'')+'<span>'+esc(count)+'</span>'+button+'</div>'+labels;
  const content=expanded
    ? '<div id="'+esc(id)+'" class="card-stack-members card-collection">'+group.items.map(renderCard).join('')+'</div>'
    : '<div id="'+esc(id)+'" class="card-stack-pile">'+group.resistanceLabels.slice(0,2).reverse().map((label,index)=>'<div class="card-stack-underlay" style="--stack-step:'+(2-index)+'" aria-hidden="true"><span>'+esc(label)+'</span></div>').join('')+renderCard(group.items[0])+'</div>';
  return '<'+tag+' class="card-stack-group '+(expanded?'is-expanded':'is-collapsed')+' '+esc(className)+'" data-card-stack-keys="'+esc(keys)+'">'+(expanded?header+content:content+header)+'</'+tag+'>';
}

export function createCardStacks(catalog,options={}) {
  let storage,enabled=true;
  try{storage=options.storage===undefined?globalThis.localStorage:options.storage;enabled=storage?.getItem(STORAGE_KEY)!=='off';}catch{}
  const expanded=new Set();
  function setEnabled(value){
    enabled=Boolean(value);expanded.clear();
    try{storage?.setItem(STORAGE_KEY,enabled?'on':'off');}catch{}
  }
  function toggle(id){
    if(expanded.has(id))expanded.delete(id);else expanded.add(id);
  }
  return {
    enabled:()=>enabled,
    groups:items=>groupResistanceCards(items,catalog,{enabled}),
    setEnabled,toggle,
    render:(group,renderCard,options)=>renderResistanceStack(group,renderCard,{...options,expanded:expanded.has(group.id)}),
    controls:prefix=>'<div class="card-stack-controls"><label for="'+esc(prefix)+'-stacks"><input type="checkbox" id="'+esc(prefix)+'-stacks" '+(enabled?'checked':'')+'>내성형 겹쳐 보기</label><span>같은 병원체 아래로 묶고, 필요할 때 펼쳐 보기</span></div>'
  };
}
