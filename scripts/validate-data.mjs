import { readFile } from 'node:fs/promises';

export function validateDataset(data, sources) {
 const fail = message => { throw new Error(`Dataset: ${message}`); };
 const text = (value, label) => { if(typeof value !== 'string' || !value.trim()) fail(`${label} is empty`); };
 const refs = (ids, label) => { if(!Array.isArray(ids) || !ids.length || ids.some(id=>!sources[id])) fail(`${label} has missing sources`); };
 const unique = (items,label) => { const seen=new Set();for(const item of items){if(seen.has(item))fail(`duplicate ${label}: ${item}`);seen.add(item);} };
 if(data.schemaVersion!==2)fail('unsupported schema version');
 unique(data.records.map(r=>r.id),'record IDs'); unique(data.drugs.map(d=>d.id),'drug IDs');
 unique(data.panels.map(p=>p.id),'panel IDs');
 const panels=new Map(data.panels.map(p=>[p.id,p]));
 const drugIds=new Set(data.drugs.map(d=>d.id));
 for(const p of data.panels){
  text(p.name,p.id);unique(p.drugIds,`${p.id} drugs`);
  if(!p.drugIds.length || p.drugIds.some(id=>!drugIds.has(id)))fail(`${p.id} has invalid drug IDs`);
  if(!data.records.some(r=>r.panelId===p.id))fail(`${p.id} has no records`);
 }
 unique(data.records.map(r=>r.taxonId+'/'+r.phenotypeId),'phenotypes');
 const taxa=new Map();
 for(const d of data.drugs){for(const key of ['name','family','mechanism','spectrum','limitations','resistance']){const value=d[key];if(Array.isArray(value)){if(!value.length || value.some(x=>typeof x!=='string'||!x.trim()))fail(`${d.id}/${key} is empty`);}else text(value,`${d.id}/${key}`);}refs(d.sourceIds,d.id);}
 for(const r of data.records){
  if(!/^[A-Z]{3}-\d{3}$/.test(r.id))fail(`${r.id} invalid record ID`);
  const taxonKey=r.domain+'/'+r.organism;if(taxa.has(r.taxonId) && taxa.get(r.taxonId)!==taxonKey)fail(`${r.taxonId} used for different organisms`);taxa.set(r.taxonId,taxonKey);
  const panel=panels.get(r.panelId);
  if(!panel || r.domain!==panel.domain || r.observationType!==panel.observationType)fail(`${r.id} has an invalid panel`);
  for(const key of ['organism','koreanName','taxonId','phenotype','phenotypeId','phenotypeDescription','classification','biology','diagnostics','pearl','reviewedAt'])text(r[key],`${r.id}/${key}`);
  refs(r.sourceIds,r.id);
  for(const c of data.categories){text(r.hints[c.id]?.text,`${r.id}/${c.id}`);refs(r.hints[c.id]?.sourceIds,`${r.id}/${c.id}`);}
  if(Object.keys(r.susceptibility).length!==panel.drugIds.length)fail(`${r.id} has an incomplete drug panel`);
  for(const drugId of panel.drugIds){
   const a=r.susceptibility[drugId],label=`${r.id}/${drugId}`;
   const regimen=panel.observationType==='regimen';
   if(!a || !(regimen?['REGIMEN','OUTSIDE_REGIMEN']:['S','I','R','ACT','ACTIVE','INACTIVE']).includes(a.category))fail(`${label} has an invalid/missing result`);
   text(a.note,label);refs(a.sourceIds,label);
   if(regimen){text(r.clinicalContext,`${r.id} clinical context`);if(a.applicability!==r.clinicalContext)fail(`${label} mismatched clinical context`);if(a.basis!=='guideline-regimen' || r.isolateModel!=='guideline-context')fail(`${label} invalid regimen basis`);if(a.mic!==null || a.breakpoint!==null)fail(`${label} regimen is not an AST measurement`);}
   if(['ACT'].includes(a.category))text(a.applicability,`${label} applicability`);
   if(a.applicability==='requires-organism-specific-ast-and-clinical-context')fail(`${label} generic uncertainty is not an observation`);
   if(['ACTIVE','INACTIVE'].includes(a.category) && a.basis!=='literature-activity')fail(`${label} activity requires literature basis`);
   if(!['authored-isolate','expected-resistance','resistance-screen-negative','literature-activity','measured-isolate','guideline-regimen'].includes(a.basis))fail(`${label} invalid basis`);
  }
 }
 return {taxa:new Set(data.records.map(r=>r.taxonId)).size,records:data.records.length,drugs:data.drugs.length,results:data.records.reduce((n,r)=>n+Object.keys(r.susceptibility).length,0)};
}

export async function validateFiles(){
 const [data,sources]=await Promise.all(['organisms','sources'].map(name=>readFile(`data/${name}.json`,'utf8').then(JSON.parse)));
 return validateDataset(data,sources);
}
