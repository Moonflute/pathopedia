import * as T from './vendor/three/three.module.min.js';
import {PILOT_TOOLS} from './city-pilot-state.mjs';

// Inline icons follow Shoot's SVG hotbar; held tools reuse the bundled MIT Three.js.
const paths={
 engulf:'M7 20 4 12Q3 9 6 9L8 13V5Q8 2 10 4L11 10V3Q12 1 14 3V10L15 5Q17 3 18 6L17 13Q23 9 22 13L18 20Z',
 oxygen:'M6 5H11V21H4V8Q4 5 6 5ZM15 5H20V21H13V8Q13 5 15 5ZM6 2H9V5M15 2H18V5M4 11H11M13 11H20',
 nutrient:'M3 8 12 3 21 8V20H3ZM3 8H21M12 8V20M9 12H15M12 9V15',
 repair:'M8 10A6 6 0 0 1 4 2L7 6 11 5 12 2A6 6 0 0 1 12 11L21 20 18 23Z',
 cleanup:'M6 9H17V21H6ZM8 4H15V9M6 12 2 15V20H6M17 12H21V7H17M10 14H13V18H10',
 patch:'M3 7H21V17H3ZM10 9H14V15H10M6 10V11M6 13V14M18 10V11M18 13V14',
 antigen:'M8 3H16V6H8ZM9 6V19Q12 23 15 19V6M9 13H15M12 9V11M3 6V10M1 8H5M19 17V21M17 19H21',
 signal:'M8 10H17V22H7V12ZM10 3V10M11 15H14M11 18H14M15 3Q20 5 18 9M18 1Q25 5 21 11',
 scanner:'M3 4H21V18H3ZM6 7H18V14H6M9 18V22H15V18M7 11H9L11 8 13 13 15 10H17',
 tractor:'M5 3V12A7 7 0 0 0 19 12V3H14V12A2 2 0 0 1 10 12V3ZM5 7H10M14 7H19M8 22 10 19M16 22 14 19',
 repulsor:'M8 6H15V18H8ZM3 9V15M11 9V15M19 4Q25 12 19 20M16 7Q20 12 16 17M8 18V22H12V18'
};
export const pilotToolIcon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${paths[id]||paths.engulf}"/></svg>`;

export function createPilotTools(){
 const root=new T.Group(),scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.01,4),groups=new Map(),materials=new Map();scene.add(root);
 scene.add(new T.HemisphereLight(0xf4fffa,0x546b64,2.4));const light=new T.DirectionalLight(0xfff0cf,3);light.position.set(-2,3,4);scene.add(light);
 const geometry={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,10,7),tube:new T.CylinderGeometry(1,1,1,10),ring:new T.TorusGeometry(1,.19,5,12)};
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.62,metalness:.12}));return materials.get(color);};
 const add=(group,shape,color,pos,size,rot=0)=>{const mesh=new T.Mesh(geometry[shape],material(color));mesh.position.set(...pos);mesh.scale.set(...size);mesh.rotation.z=rot;group.add(mesh);return mesh;};
 const metal=0x657b7c,dark=0x294e46,cream=0xffebbe;
 const hand=new T.Group();root.add(hand);
 add(hand,'box',dark,[.14,-.29,.14],[.12,.34,.13],.32);
 add(hand,'box',0x5d9183,[.09,-.17,.10],[.14,.10,.14],.32);
 add(hand,'box',cream,[.075,-.13,.09],[.13,.035,.135],.32);
 add(hand,'sphere',0xe8c99c,[.045,-.075,.075],[.065,.075,.055]);
 add(hand,'sphere',cream,[-.018,-.047,.082],[.03,.055,.027],-.6);
 for(let i=0;i<3;i++)add(hand,'sphere',cream,[.015,-.04-i*.026,.106],[.05,.016,.025],.1);
 for(const def of PILOT_TOOLS){
  const g=new T.Group(),color=def.color;g.visible=false;groups.set(def.id,g);root.add(g);
  if(def.id==='engulf'){
   add(g,'sphere',color,[0,.015,0],[.085,.08,.09]);
   for(let i=0;i<4;i++)add(g,'sphere',cream,[(i-1.5)*.04,.08,-.025],[.025,.045,.036]);
   add(g,'sphere',color,[-.09,.02,.03],[.035,.055,.04],-.4);
  }else if(def.id==='oxygen'){
   for(const x of [-.045,.045]){add(g,'tube',color,[x,.03,0],[.037,.2,.037]);add(g,'box',metal,[x,.145,0],[.04,.035,.04]);add(g,'box',cream,[x,.035,.037],[.04,.025,.008]);}
   add(g,'box',dark,[0,-.055,.01],[.16,.025,.06]);
  }else if(def.id==='nutrient'){
   add(g,'box',color,[0,.02,0],[.18,.17,.12]);add(g,'box',cream,[0,.115,0],[.2,.025,.14]);add(g,'box',dark,[0,.02,.065],[.035,.13,.012]);add(g,'box',dark,[0,.02,.068],[.13,.035,.012]);
  }else if(def.id==='repair'){
   add(g,'box',color,[0,.03,0],[.045,.23,.035]);add(g,'box',metal,[0,.16,0],[.12,.045,.04]);
   for(const x of [-.049,.049])add(g,'box',color,[x,.20,0],[.035,.09,.04],x*3);
   add(g,'box',dark,[0,-.045,.01],[.055,.07,.04]);
  }else if(def.id==='cleanup'){
   add(g,'tube',color,[0,.015,0],[.073,.15,.073]);add(g,'box',dark,[0,-.055,0],[.16,.025,.14]);
   const nozzle=add(g,'tube',metal,[0,.075,-.1],[.035,.17,.035]);nozzle.rotation.x=Math.PI/2;
   add(g,'ring',cream,[0,.075,-.19],[.045,.045,.045]);add(g,'box',dark,[0,.03,.072],[.06,.065,.012]);
  }else if(def.id==='patch'){
   add(g,'box',color,[0,.025,0],[.20,.11,.055]);add(g,'box',cream,[0,.025,.035],[.075,.08,.025]);
   for(const x of [-.075,.075])for(const y of [0,.05])add(g,'sphere',dark,[x,y,.029],[.006,.006,.003]);
  }else if(def.id==='antigen'){
   add(g,'tube',color,[0,.035,0],[.045,.19,.045]);add(g,'tube',cream,[0,.14,0],[.052,.035,.052]);
   add(g,'box',dark,[0,-.065,0],[.08,.045,.08]);add(g,'sphere',0xf4db86,[0,.04,.04],[.022,.025,.012]);
  }else if(def.id==='signal'){
   add(g,'box',color,[0,.015,0],[.12,.18,.07]);add(g,'tube',metal,[-.035,.17,0],[.008,.17,.008]);
   add(g,'sphere',cream,[-.035,.255,0],[.015,.015,.015]);add(g,'box',dark,[0,.055,.04],[.08,.045,.015]);
   for(const y of [-.035,-.01])add(g,'box',metal,[0,y,.041],[.07,.008,.01]);
  }else if(def.id==='tractor'||def.id==='repulsor'){
   add(g,'box',dark,[0,0,.02],[.12,.12,.16]);add(g,'box',metal,[0,-.09,.04],[.07,.11,.07]);
   const barrel=add(g,'tube',color,[0,.055,-.10],[.075,.22,.075]);barrel.rotation.x=Math.PI/2;
   for(const z of [-.07,-.15,-.22])add(g,'ring',z===-.22?cream:color,[0,.055,z],[.09,.09,.09]);
   if(def.id==='tractor')for(const x of [-.1,.1])add(g,'box',metal,[x,.055,-.18],[.035,.04,.19],x*.8);
   else add(g,'sphere',cream,[0,.055,-.21],[.05,.05,.025]);
  }else{
   add(g,'box',dark,[0,.025,0],[.18,.16,.05]);add(g,'box',color,[0,.04,.032],[.15,.10,.015]);
   for(let i=0;i<3;i++)add(g,'box',cream,[(i-1)*.042,.04,.042],[.012,.025+i*.018,.008]);
   add(g,'box',metal,[0,-.085,0],[.06,.09,.05]);
  }
 }
 const jets=new T.Group();scene.add(jets);for(const x of [-.3,.3]){add(jets,'tube',metal,[x,-.29,-.65],[.032,.09,.032]);add(jets,'sphere',0x8cecff,[x,-.36,-.65],[.025,.09,.025]);}
 let last='',changedAt=0,lastTime=0,clock=0,punchAt=-Infinity,wasUsing=false;
 return {root,update(v,now,aspect=1,paused=false,height=720){
  const dt=lastTime?Math.min(.05,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;if(!paused)clock+=dt*1000;
  if(last!==v.tool.id){last=v.tool.id;changedAt=clock;punchAt=-Infinity;wasUsing=false;for(const [id,g] of groups)g.visible=id===last;}
  if(!paused&&v.using&&(!wasUsing||last==='engulf'&&clock-punchAt>460))punchAt=clock;wasUsing=v.using;
  jets.visible=v.flying;jets.scale.x=Math.min(1,aspect);jets.children.forEach((m,i)=>{if(i%2)m.scale.y=.07+(paused?.01:Math.sin(clock*.03)*.018);});
  const walk=paused||v.flying?0:Math.min(1,v.speed/4.2),phase=clock*.009,portrait=aspect<.8,short=height<520,halfY=Math.tan(25*Math.PI/180)*.8;
  const punch=Math.sin(Math.min(1,(clock-punchAt)/280)*Math.PI),swap=Math.sin(Math.min(1,(clock-changedAt)/200)*Math.PI);
  camera.aspect=aspect;camera.updateProjectionMatrix();root.scale.setScalar(portrait?.8:short?1.12:1.2);
  root.position.set(halfY*aspect*(portrait?.43:short?.50:.64)+Math.sin(phase)*.009*walk, -halfY*(portrait?.28:short?.47:.58)-swap*.12+Math.cos(phase*2)*.006*walk, -.8-punch*(last==='engulf'?.12:.025));
  root.rotation.set(-.1-punch*.22+(v.progress?Math.sin(clock*.018)*.06:0)-(v.dashing?.2:0),-.22,-.12+Math.sin(phase)*.025*walk);
 },render(renderer){const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=autoClear;},dispose(){for(const g of Object.values(geometry))g.dispose();for(const m of materials.values())m.dispose();}};
}
