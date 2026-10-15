// Short synthesized voices keep the existing asset-free Web Audio approach.
const NOTES = {
  start:['sine',260,520,.15,.05,.1], upgrade:['sine',440,980,.22,.05,.18],
  bolt:['square',190,95,.045,.012,.09], boltHit:['triangle',950,320,.055,.027,.065],
  orbitHit:['sine',1250,600,.09,.035,.10], nova:['triangle',150,38,.25,.06,.2],
  novaHit:['sine',90,45,.1,.04,.12], chain:['sawtooth',560,900,.065,.018,.16],
  chainHit:['square',920,360,.045,.017,.08], kill:['triangle',300,85,.06,.028,.1],
  hurt:['sawtooth',100,40,.12,.045,.25], dash:['triangle',160,80,.12,.025,.2],
  pickup:['sine',720,1050,.04,.015,.11], heal:['sine',380,700,.2,.04,.2],
  warning:['triangle',310,270,.15,.03,.6], won:['sine',520,1040,.32,.06,.5],
};
export function createSurvivalAudio(){
  let context,master,compressor,enabled=true,voices=0;
  const last=new Map();
  function unlock(){
    if(!enabled)return;
    try{
      if(!context){
        const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!Audio)return;
        context=new Audio();master=context.createGain();master.gain.value=.8;
        compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;
        master.connect(compressor);compressor.connect(context.destination);
      }
      if(context.state==='suspended')void context.resume().catch(()=>{});
    }catch{/* Visual play remains available without audio. */}
  }
  function play(kinds){
    if(!enabled||!context||context.state!=='running')return;
    const now=context.currentTime;
    for(const kind of [...new Set(kinds)].sort((a,b)=>Number(['hurt','upgrade','won'].includes(b))-Number(['hurt','upgrade','won'].includes(a)))){
      const note=NOTES[kind];if(!note)continue;
      const [type,from,to,duration,volume,gap]=note;
      if(voices>=8||now-(last.get(kind)??-100)<gap)continue;
      last.set(kind,now);
      try{
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.type=type;oscillator.frequency.setValueAtTime(from,now);oscillator.frequency.exponentialRampToValueAtTime(to,now+duration);
        gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
        oscillator.connect(gain);gain.connect(master);voices++;
        oscillator.onended=()=>{voices=Math.max(0,voices-1);oscillator.disconnect();gain.disconnect();};
        oscillator.start(now);oscillator.stop(now+duration);
      }catch{/* Audio errors cannot interrupt a run. */}
    }
  }
  function setEnabled(value){enabled=!!value;if(master)master.gain.setTargetAtTime(enabled?.8:0,context.currentTime,.02);if(enabled)unlock();}
  return{unlock,play,setEnabled};
}