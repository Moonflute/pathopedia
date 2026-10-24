import * as T from './vendor/three/three.module.min.js';
import {PILOT_TOOLS} from './city-pilot-state.mjs';

// Held tools reuse the bundled MIT Three.js. Inventory sprites live in city-pilot-icons.mjs.
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
   add(g,'box',metal,[0,.035,-.015],[.15,.12,.29]);add(g,'box',dark,[0,-.075,.07],[.075,.16,.085],-.2);
   const barrel=add(g,'tube',dark,[0,.055,-.21],[.045,.2,.045]);barrel.rotation.x=Math.PI/2;
   add(g,'ring',color,[0,.055,-.31],[.055,.055,.055]);add(g,'box',cream,[0,.12,-.025],[.025,.025,.15]);
   for(const x of [-.079,.079])add(g,'box',0x9af2dd,[x,.045,-.06],[.012,.04,.13]);
   const flash=add(g,'sphere',0xc5ffdf,[0,.055,-.34],[.07,.07,.07]);flash.userData.flash=true;flash.visible=false;
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
  const punch=last==='engulf'?(v.shot?Math.exp(-v.shot.progress*12):0):Math.sin(Math.min(1,(clock-punchAt)/280)*Math.PI),swap=Math.sin(Math.min(1,(clock-changedAt)/200)*Math.PI);
  for(const mesh of groups.get('engulf').children)if(mesh.userData.flash)mesh.visible=last==='engulf'&&!!v.shot&&v.shot.progress<.23;
  camera.aspect=aspect;camera.updateProjectionMatrix();root.scale.setScalar(portrait?.8:short?1.12:1.2);
  root.position.set(halfY*aspect*(portrait?.43:short?.50:.64)+Math.sin(phase)*.009*walk, -halfY*(portrait?.28:short?.47:.58)-swap*.12+Math.cos(phase*2)*.006*walk, -.8+punch*(last==='engulf'?.055:-.025));
  root.rotation.set(-.1+punch*(last==='engulf'?.15:-.22)+(v.progress?Math.sin(clock*.018)*.06:0)-(v.dashing?.2:0),-.22,-.12+Math.sin(phase)*.025*walk);
 },render(renderer){const autoClear=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=autoClear;},dispose(){for(const g of Object.values(geometry))g.dispose();for(const m of materials.values())m.dispose();}};
}
