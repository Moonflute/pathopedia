(async function(){
const runner=eval("("+load("artRunner")+")");
const phases=[{kind:"pathogen",domain:"bacteria"},{kind:"pathogen",domain:"fungi"},{kind:"pathogen",domain:"parasites"},{kind:"pathogen",domain:"viruses"},{kind:"disease"}];
for(const phase of phases){
 for(let batch=0;batch<80;batch++){
  const code="import fs from 'node:fs';const p=JSON.parse(fs.readFileSync('assets/cards/production-v1/jobs.json','utf8'));const phase="+JSON.stringify(phase)+";console.log(JSON.stringify({ready:p.jobs.filter(j=>j.status==='ready').length,total:p.jobs.length,pending:p.jobs.filter(j=>j.status==='pending'&&j.kind===phase.kind&&(!phase.domain||j.domain===phase.domain)).length,repairs:p.jobs.filter(j=>j.needsRepair).length}));";
  const read=await tools.exec_command({cmd:"$taskRemainingArt = @'\n"+code+"\n'@\n$taskRemainingArt | node --input-type=module",sandbox_permissions:"require_escalated",justification:"현재 삽화 묶음의 완료 수와 남은 항목을 확인합니다.",max_output_tokens:1000});
  if(read.exit_code!==0)throw Error(read.output);
  const status=JSON.parse(read.output);store("art-all-progress",{phase,...status});
  if(!status.pending&&!status.repairs){text({phase,complete:true,ready:status.ready,total:status.total});break;}
  text({phase,...status});
  await runner({...phase,repairs:true,limit:4});
  const errors=(load("art-batch-status")||[]).filter(r=>r.status==="rejected");
  if(errors.length)throw Error("Image generation needs attention: "+JSON.stringify(errors));
 }
}
text({allPlannedIllustrationsGenerated:true});
});
