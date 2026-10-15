(async function(options={}){
 const root=options.root;
 if(!root)throw Error('Pass the absolute repository path as options.root.');
 const readScript="import fs from 'node:fs';const p=JSON.parse(fs.readFileSync('assets/cards/drug-production-v1/jobs.json','utf8'));const options="+JSON.stringify(options)+";console.log(JSON.stringify(p.jobs.filter(j=>options.repairs?j.needsRepair:j.status==='pending').slice(0,options.limit||8)));";
 const read=await tools.exec_command({cmd:"$drugBatchRead = @'\n"+readScript+"\n'@\n$drugBatchRead | node --input-type=module",workdir:root,sandbox_permissions:'require_escalated',justification:'다음 약물 삽화 묶음의 저장된 제작 기준을 불러옵니다.',max_output_tokens:24000});
 if(read.exit_code!==0)throw Error(read.output);
 const jobs=JSON.parse(read.output);store('drug-current-batch',jobs.map(j=>j.id));
 text({started:jobs.map(j=>j.id)});
 let finished=false,completed=0,drawn=0,saveQueue=Promise.resolve();const generated=[];
 const tasks=jobs.map(async job=>{
  const repair=!!job.needsRepair;
  const args={prompt:repair?job.repairPrompt:job.prompt,transparent_background:true};
  if(repair)args.referenced_image_paths=[root+'/'+job.file];
  const r=await tools.image_gen__imagegen(args);
  const source=r.output_hint?.match(/as ([^\n]+\.png) by default\./)?.[1];
  if(!source)throw Error('Missing output path for '+job.id);
  const entry={kind:'drug',id:job.id,source,repair};
  store('drug-generated-'+job.id,entry);generatedImage(r);drawn++;text({drawn,of:jobs.length,id:job.id});
  const writing=saveQueue.then(async()=>{
   const script="import {saveCardArt} from './scripts/save-card-art.mjs';const r="+JSON.stringify(entry)+";console.log(JSON.stringify(await saveCardArt(r.kind,r.id,r.source,r.repair)));";
   const saved=await tools.exec_command({cmd:"$drugBatchSave = @'\n"+script+"\n'@\n$drugBatchSave | node --input-type=module",workdir:root,sandbox_permissions:'require_escalated',justification:'생성된 약물 그림을 즉시 프로젝트에 보존하고 제작 상태를 저장합니다.',max_output_tokens:300});
   if(saved.exit_code!==0)throw Error(saved.output);text(saved.output);
  });
  saveQueue=writing.catch(()=>{});await writing;generated.push(entry);completed++;
 });
 const done=Promise.allSettled(tasks).then(statuses=>{store('drug-batch-status',statuses.map((r,i)=>({id:jobs[i].id,status:r.status,error:r.status==='rejected'?String(r.reason):null})));store('drug-last-generated',generated);finished=true;});
 while(!finished){await Promise.race([done,new Promise(resolve=>setTimeout(resolve,45000))]);if(!finished){text({drawn,saved:completed,total:jobs.length});await yield_control();}}
 await done;text(load('drug-batch-status'));
});
