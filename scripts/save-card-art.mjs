
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const planFile=path.join(root,'assets/cards/production-v1/jobs.json');
async function retryFileOperation(operation) {
 for(let attempt=0;;attempt++) {
  try{return await operation();}catch(error){
   if(attempt>=4||!['EBUSY','EPERM','EACCES','UNKNOWN'].includes(error.code))throw error;
   await new Promise(resolve=>setTimeout(resolve,200*(attempt+1)));
  }
 }
}
async function writeText(file,text) {
 const temporary=file+'.card-art-'+process.pid+'.tmp';
 await retryFileOperation(()=>fs.writeFile(temporary,text));
 await retryFileOperation(()=>fs.rename(temporary,file));
}
export async function publishArtCatalog() {
 const plan=JSON.parse(await fs.readFile(planFile,'utf8'));
 const catalog={schemaVersion:1,styleVersion:'transparent-storybook-v1',mode:'built-in image_gen.imagegen',pathogens:{},diseases:{}};
 for(const job of plan.jobs.filter(job=>job.status==='ready')){
  catalog[job.kind==='pathogen'?'pathogens':'diseases'][job.id]={src:job.webFile || job.file,alt:job.alt};
 }
 await writeText(path.join(root,'data/card-art.json'),JSON.stringify(catalog,null,2)+'\n');
 await writeText(path.join(root,'src/card-art-data.mjs'),'// Generated from assets/cards/production-v1/jobs.json.\nexport const CARD_ART = '+JSON.stringify(catalog,null,2)+';\n');
 return {ready:plan.jobs.filter(job=>job.status==='ready').length,total:plan.jobs.length};
}
export async function saveCardArt(kind,id,source,repair=false) {
 const plan=JSON.parse(await fs.readFile(planFile,'utf8'));
 const job=plan.jobs.find(job=>job.kind===kind&&job.id===id);
 if(!job)throw Error('Unplanned card artwork: '+kind+'/'+id);
 if(job.status==='ready'&&!repair)return {id,kind,status:'already saved'};
 if(repair){job.previousFiles=[...(job.previousFiles || []),job.file];job.file=job.file.replace(/(?:-v\d+)?\.png$/,'-v'+((job.revision || 1)+1)+'.png');job.revision=(job.revision || 1)+1;job.promptHistory=[...(job.promptHistory || []),job.prompt];job.prompt=job.repairPrompt;job.needsRepair=false;delete job.webFile;delete job.webEncoding;}
 const target=path.resolve(root,job.file);
 if(!target.startsWith(path.join(root,'assets','cards','illustrations-v1')+path.sep))throw Error('Artwork target outside expected directory');
 await fs.mkdir(path.dirname(target),{recursive:true});
 try{await fs.link(source,target);}catch(error){
  if(error.code==='EEXIST'){
   const [original,saved]=await Promise.all([fs.readFile(source),fs.readFile(target)]);
   const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
   if(original.length!==saved.length||digest(original)!==digest(saved))throw Error('Existing artwork differs from the generated source: '+job.id);
  }else{
   if(!['EXDEV','EPERM','EACCES','ENOSYS','ENOTSUP'].includes(error.code))throw error;
   await fs.copyFile(source,target,constants.COPYFILE_EXCL);
  }
 }
 job.status='ready';job.generatedAt=new Date().toISOString();job.originalGeneratedFile=source;
 await writeText(planFile,JSON.stringify(plan,null,2)+'\n');
 return {kind,id,file:job.file,...await publishArtCatalog()};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [kind,id,source]=process.argv.slice(2);
 console.log(JSON.stringify(kind?await saveCardArt(kind,id,source):await publishArtCatalog()));
}
