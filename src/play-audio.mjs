// Three short, cached mechanical Foley buffers. No download or ongoing audio nodes.
export function createReloadFoley(){
 const buffers=new Map();
 function buffer(audio,kind){
  if(buffers.has(kind))return buffers.get(kind);
  const rate=audio.sampleRate,duration=kind==='reload'?.23:kind==='reload-in'?.19:.16;
  const b=audio.createBuffer(1,Math.ceil(rate*duration),rate),out=b.getChannelData(0);
  let seed=417,previous=0,low=0;
  const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  const strikes=kind==='reload'?[[0,.7],[.034,.45],[.115,.22]]:kind==='reload-in'?[[0,.9],[.027,.55]]:[[0,.65],[.047,.9]];
  for(let i=0;i<out.length;i++){
   const t=i/rate,n=noise();low=low*.84+n*.16;const high=n-previous;previous=n;let sample=0;
   for(const [start,strength] of strikes){
    const a=t-start;if(a<0)continue;
    const attack=Math.min(1,a/.0007);
    const impact=high*Math.exp(-a*220)*.5+low*Math.exp(-a*65)*1.4;
    const metal=(Math.sin(a*2*Math.PI*1743)+.46*Math.sin(a*2*Math.PI*3191)+.25*Math.sin(a*2*Math.PI*4739))*Math.exp(-a*95)*.12;
    const body=Math.sin(a*2*Math.PI*(kind==='reload-in'?145:210))*Math.exp(-a*120)*.18;
    sample+=attack*strength*(impact+metal+body);
   }
   // A brief textured slide between the impacts, not a pitched game notification.
   if(kind!=='reload-in'&&t>.045&&t<.12)sample+=high*.045*Math.sin((t-.045)/.075*Math.PI);
   out[i]=Math.max(-.85,Math.min(.85,sample));
  }
  buffers.set(kind,b);return b;
 }
 return {play(audio,destination,kind){
  const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer(audio,kind);gain.gain.value=.4;
  source.connect(gain);gain.connect(destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
 },dispose(){buffers.clear();}};
}
