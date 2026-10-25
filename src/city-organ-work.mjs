import {homeOrgan,homeSites} from './city-homeostasis-data.mjs';
import {groundCoordinate} from './city-three-layout.mjs';
import {beginActivity} from './city-activity.mjs';
import {releaseWorkplace} from './city-workplaces.mjs';

export function orderOrganWork(s,value){
 const [site,type]=String(value).split(':'),organ=homeOrgan(site),state=s.homeostasis?.organs[site];
 if(!organ||!state||!['repair','upgrade'].includes(type))return {ok:false,text:'기관 작업 확인'};
 const works=s.homeostasis.works??=[],level=state.level||1,cost=type==='repair'?16:22+level*16;
 if(works.some(w=>w.site===site))return {ok:false,text:'기관 작업 진행 중'};
 if(type==='repair'&&state.hp>=99||type==='upgrade'&&level>=4)return {ok:false,text:'기관 상태 양호'};
 if(s.resources.materials<cost)return {ok:false,text:'자재 부족'};
 s.resources.materials-=cost;works.push({site,type,remaining:type==='repair'?4:9,worker:null});
 return {ok:true,text:organ.name+' · 섬유아세포 작업 요청'};
}
export function workAtOrgan(s,c,dt,api){
 if(c.kind!=='fibroblast'||c.buildSite||c.frontJob!=null||c.tissueJob!=null||c.logisticsJob!=null||!s.homeostasis?.works?.length)return false;
 const jobs=s.homeostasis.works;
 for(const w of jobs)if(w.worker!=null&&!s.cells.some(cell=>cell.id===w.worker))w.worker=null;
 const job=jobs.find(w=>w.worker===c.id)||jobs.find(w=>w.worker==null);if(!job)return false;
 const organ=homeSites(s.layout).find(o=>o.id===job.site),target=groundCoordinate({x:organ.x,z:organ.z-.6});
 if(job.worker==null){job.worker=c.id;c.target=organ.host;c.organJob=job.site;releaseWorkplace(c);c.activity=null;api.route(c,[target]);}
 c.task=job.type==='repair'?'기관 복구 현장 이동':'기관 확장 현장 이동';c.nextTask=homeOrgan(job.site).name+' · 현장 작업';
 if(!api.move(c,60,dt))return true;
 c.task=job.type==='repair'?'기관 복구':'기관 확장';
 if(!c.activity||c.activity.started+c.activity.duration<=s.time)beginActivity(s,c,'build',.95,target,organ.host);
 job.remaining-=dt*Math.max(.25,s.districts[organ.host].oxygen/100);
 if(job.remaining<=0){const state=s.homeostasis.organs[job.site];if(job.type==='repair')state.hp=Math.min(100,state.hp+45);else state.level=Math.min(4,(state.level||1)+1);jobs.splice(jobs.indexOf(job),1);c.organJob=null;c.activity=null;c.assignment=null;c.path=[];api.log(s,homeOrgan(job.site).name+' · '+(job.type==='repair'?'복구':'확장')+' 완료');}
 return true;
}
export function validateOrganWork(s){
 const h=s.homeostasis;if(!h)return true;
 return Object.values(h.organs).every(o=>o.level==null||Number.isInteger(o.level)&&o.level>=1&&o.level<=4)&&(!h.works||Array.isArray(h.works)&&h.works.length<=9&&new Set(h.works.map(w=>w.site)).size===h.works.length&&h.works.every(w=>homeOrgan(w.site)&&['repair','upgrade'].includes(w.type)&&Number.isFinite(w.remaining)&&w.remaining>0&&w.remaining<=9&&(w.worker==null||Number.isInteger(w.worker))));
}
