import { readFile } from 'node:fs/promises';

export function validateDataset(data, sources) {
 const fail = message => { throw new Error(`Dataset: ${message}`); };
 const text = (value, label) => { if(typeof value !== 'string' || !value.trim()) fail(`${label} is empty`); };
 const refs = (ids, label) => { if(!Array.isArray(ids) || !ids.length || ids.some(id=>!sources[id])) fail(`${label} has missing sources`); };
 const unique = (items,label) => { if(new Set(items).size!==items.length) fail(`duplicate ${label}`); };
 unique(data.records.map(r=>r.id),'record IDs'); unique(data.drugs.map(d=>d.id),'drug IDs');
 unique(data.records.map(r=>r.taxonId+'/'+r.phenotypeId),'phenotypes');
 for(const d of data.drugs){text(d.name,d.id);text(d.family,d.id);}
 for(const r of data.records){
  for(const key of ['organism','phenotype','classification','biology','diagnostics','pearl'])text(r[key],`${r.id}/${key}`);
  refs(r.sourceIds,r.id);
  for(const c of data.categories){text(r.hints[c.id]?.text,`${r.id}/${c.id}`);refs(r.hints[c.id]?.sourceIds,`${r.id}/${c.id}`);}
  if(Object.keys(r.susceptibility).length!==data.drugs.length)fail(`${r.id} has an incomplete antibiotic panel`);
  for(const d of data.drugs){
   const a=r.susceptibility[d.id],label=`${r.id}/${d.id}`;
   if(!a || !['S','I','R','ACT','ACTIVE','INACTIVE'].includes(a.category))fail(`${label} has an invalid/missing result`);
   text(a.note,label);refs(a.sourceIds,label);
   if(['ACT'].includes(a.category))text(a.applicability,`${label} applicability`);
   if(['ACTIVE','INACTIVE'].includes(a.category) && a.basis!=='literature-activity')fail(`${label} activity requires literature basis`);
   if(!['authored-isolate','expected-resistance','resistance-screen-negative','literature-activity','measured-isolate'].includes(a.basis))fail(`${label} invalid basis`);
  }
 }
 return {taxa:new Set(data.records.map(r=>r.taxonId)).size,records:data.records.length,drugs:data.drugs.length,results:data.records.length*data.drugs.length};
}

export async function validateFiles(){
 const [data,sources]=await Promise.all(['organisms','sources'].map(name=>readFile(`data/${name}.json`,'utf8').then(JSON.parse)));
 return validateDataset(data,sources);
}
