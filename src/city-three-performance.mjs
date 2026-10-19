import {qualityProfile} from './city-three-layout.mjs';

export const CITY_STEP=1/30;

// Sample rAF cadence, including simulation/GPU stalls, rather than our render cap.
// Lower resolution first, then shadows, and only finally use a 30 fps fallback.
export function createAdaptiveQuality(width,dpr=1){
 let level=0,last=null,warmUntil=0,elapsed=0,frames=0,late=0,work=0,workFrames=0,stable=0;
 const clear=()=>{elapsed=0;frames=0;late=0;work=0;workFrames=0;};
 return {
  get profile(){return qualityProfile(width,dpr,level);},
  resize(w,p,now){width=w;dpr=p;this.suspend(now);},
  suspend(now){last=null;stable=0;warmUntil=now+1500;clear();},
  rendered(milliseconds){if(Number.isFinite(milliseconds)){work+=milliseconds;workFrames++;}},
  sample(now,active=true){
   if(!active){this.suspend(now);return false;}
   const dt=last==null?0:now-last;last=now;
   if(dt>250||dt<0){this.suspend(now);return false;}
   if(!dt||now<warmUntil)return false;
   elapsed+=dt;frames++;if(dt>25)late++;
   if(elapsed<2000)return false;
   const mean=elapsed/frames,cost=workFrames?work/workFrames:0,slow=mean>21||late/frames>.2;
   stable=!slow&&mean<18.5&&cost<12.5?stable+elapsed:0;
   const next=slow?Math.min(4,level+1):stable>=12000?Math.max(0,level-1):level;
   clear();
   if(next===level)return false;
   level=next;stable=0;warmUntil=now+2000;return true;
  }
 };
}

// Retain fractional deadlines on 90/120/144 Hz displays instead of accidentally
// limiting 60 fps to every second or third display refresh.
export function createFramePacer(){
 let next=null,lastFps=0;
 return (now,fps)=>{
  const interval=1000/fps;
  if(next==null||lastFps!==fps||now>next+250){next=now;lastFps=fps;}
  if(now+.5<next)return false;
  next=now+interval-Math.max(0,now-next)%interval;return true;
 };
}

// Keep gameplay at 30 Hz; alpha only affects the presentation of the last tick.
export function createThreeLoop({update,render}){
 let raf=0,last=null,accumulator=0,running=false;
 function frame(now){
  if(!running)return;
  const dt=last==null?0:Math.max(0,Math.min(.2,(now-last)/1000));last=now;
  if(!document.hidden){
   accumulator+=dt;
   while(accumulator+1e-10>=CITY_STEP){update(CITY_STEP);accumulator=Math.max(0,accumulator-CITY_STEP);}
   render(accumulator/CITY_STEP,now);
  }else{accumulator=0;last=null;}
  if(running)raf=requestAnimationFrame(frame);
 }
 return {start(){if(running)return;running=true;last=null;accumulator=0;raf=requestAnimationFrame(frame);},stop(){running=false;last=null;accumulator=0;cancelAnimationFrame(raf);}};
}
