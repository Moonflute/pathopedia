(async function(options){
const sourceScript="import fs from 'node:fs';\nconst p=JSON.parse(fs.readFileSync('assets/cards/production-v1/jobs.json','utf8'));\nconst options="+JSON.stringify(options)+";\nconst repairs=options.repairs?p.jobs.filter(j=>j.needsRepair):[];\nconst pending=p.jobs.filter(j=>j.status==='pending' && (!options.kind||j.kind===options.kind) && (!options.domain||j.domain===options.domain));\nconst jobs=[...repairs,...pending].slice(0,options.limit);\nconsole.log(JSON.stringify(jobs));";
const read=await tools.exec_command({cmd:"$taskNextArt = @'\n"+sourceScript+"\n'@\n$taskNextArt | node --input-type=module",sandbox_permissions:"require_escalated",justification:"다음 카드 삽화 묶음의 개별 프롬프트를 불러옵니다.",max_output_tokens:45000});
if(read.exit_code!==0)throw Error(read.output);
const jobs=JSON.parse(read.output);store("art-current-batch",jobs.map(j=>j.id));
let finished=false,completed=0,drawn=0,saveQueue=Promise.resolve();const generated=[];
const tasks=jobs.map(async job=>{
 const repair=!!job.needsRepair;
 const args={prompt:repair?job.repairPrompt:job.prompt,transparent_background:true};
 if(repair)args.referenced_image_paths=[load("artRoot")+"/"+job.file];
 const r=await tools.image_gen__imagegen(args);
 const path=r.output_hint?.match(/as ([^\n]+\.png) by default\./)?.[1];
 if(!path)throw Error("Missing output path for "+job.id);
 const entry={kind:job.kind,id:job.id,path,repair};
 generatedImage(r);drawn++;text({drawn,of:jobs.length,id:job.id});
 const writing=saveQueue.then(async()=>{
  const script="import {saveCardArt} from './scripts/save-card-art.mjs';\nconst r="+JSON.stringify(entry)+";console.log(JSON.stringify(await saveCardArt(r.kind,r.id,r.path,r.repair)));";
  const saved=await tools.exec_command({cmd:"$taskSaveArt = @'\n"+script+"\n'@\n$taskSaveArt | node --input-type=module",sandbox_permissions:"require_escalated",justification:"완성된 카드 삽화 한 장을 즉시 저장하고 실제 도감에 연결합니다.",max_output_tokens:400});
  if(saved.exit_code!==0)throw Error(saved.output);
  text(saved.output);
 });
 saveQueue=writing.catch(()=>{});
 await writing;
 generated.push(entry);completed++;text({completed,of:jobs.length,id:job.id});
});
const done=Promise.allSettled(tasks).then(statuses=>{
 store("art-batch-status",statuses.map((r,i)=>({id:jobs[i].id,status:r.status,error:r.status==="rejected"?String(r.reason):null})));
 store("art-last-generated",generated);finished=true;
});
while(!finished){
 await Promise.race([done,new Promise(resolve=>setTimeout(resolve,45000))]);
 if(!finished){text({drawn,saved:completed,remaining:jobs.length-drawn});await yield_control();}
}
await done;text(load("art-batch-status"));
});
