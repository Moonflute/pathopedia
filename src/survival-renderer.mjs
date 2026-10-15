import { ENEMIES, WORLD } from './survival-data.mjs';
import { survivalOrbitPositions, survivalStats, survivalCamera, survivalViewport } from './survival-engine.mjs';
const TAU=Math.PI*2;
export function createSurvivalRenderer(canvas) {
  const ctx=canvas.getContext('2d',{alpha:false});
  let width=1,height=1,ratio=1,scale=1,camera={x:WORLD.width/2,y:WORLD.height/2};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){
    const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);
    ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    scale=survivalViewport(width,height).scale;
    return {width,height};
  }
  function circle(x,y,r,fill,stroke,line=1){
    ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,TAU);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
  }
  function line(a,b,color,weight=2){
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();
  }
  function floor(){
    ctx.fillStyle='#101e23';ctx.fillRect(0,0,WORLD.width,WORLD.height);
    const left=camera.x-width/scale/2,top=camera.y-height/scale/2;
    ctx.lineWidth=1/scale;
    for(let x=Math.max(0,Math.floor(left/100)*100);x<Math.min(WORLD.width,left+width/scale+100);x+=100)
      for(let y=Math.max(0,Math.floor(top/100)*100);y<Math.min(WORLD.height,top+height/scale+100);y+=100){
        ctx.fillStyle='#132328';ctx.fillRect(x+2,y+2,97,97);ctx.fillStyle='#304440';ctx.fillRect(x-1,y-1,2,2);
      }
    ctx.setLineDash([14,10]);ctx.strokeStyle='#cfb98188';ctx.lineWidth=5;
    ctx.strokeRect(12,12,WORLD.width-24,WORLD.height-24);ctx.setLineDash([]);
    circle(WORLD.width/2,WORLD.height/2,160,null,'#526d5e30',2);
  }
  function enemyBody(enemy, time) {
    const age = time - enemy.born;
    const alpha = age < .6 ? .22 + age : 1;
    const pulse = reduced ? 1 : 1 + Math.sin(time * 3 + enemy.id) * .055;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = alpha;
    circle(2, 6, enemy.radius * .94, '#00000040');
    ctx.rotate(Math.atan2(camera.y - enemy.y, camera.x - enemy.x));
    ctx.scale(pulse, 1 / pulse);
    const r = enemy.radius, color = enemy.state === 'windup' ? '#fff0b4' : enemy.hitUntil > time ? '#faffed' : enemy.color;
    if (enemy.elite) {
      ctx.rotate(time * .2);
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10;
        circle(Math.cos(a) * r * .85, Math.sin(a) * r * .85, r * .25, '#513b42', color, 2);
      }
      circle(0, 0, r * .85, '#553441', color, 2.5);
      circle(0, 0, r * .55, '#ae5d61', '#ffc29e88', 2);
      circle(-r * .16, -r * .14, r * .17, '#ffe2b6');
      circle(r * .2, r * .2, r * .1, '#e8969f');
    } else if ((enemy.shape || enemy.type) === 'virus') {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*.6,Math.sin(a)*r*.6);ctx.lineTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2);ctx.stroke();
        circle(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2,2,color);
      }
      circle(0,0,r*.7,'#79424e',color,1.8);
      circle(-3,-2,3,'#ffc3cd');
    } else if ((enemy.shape || enemy.type) === 'bacilli') {
      ctx.fillStyle = '#78603d'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-r,-r*.55,r*2,r*1.1,r*.55); ctx.fill();ctx.stroke();
      for (let i = -1; i <= 1; i++) circle(i*7,-1,2.5,color);
      ctx.strokeStyle = '#dfb56177';ctx.beginPath();ctx.moveTo(-r,1);ctx.quadraticCurveTo(-r-14,-12,-r-19,1);ctx.stroke();
    } else if ((enemy.shape || enemy.type) === 'spore') {
      circle(0,0,r,'#544c6d',color,1.8);
      circle(0,0,r*.7,null,color+'77',1);
      for (let i = 0; i < 4; i++) { const a=i*TAU/4;circle(Math.cos(a)*r*.4,Math.sin(a)*r*.4,r*.2,'#9b87c6'); }
      circle(-3,-5,r*.22,'#d4c5f2');
    } else {
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3, x = Math.cos(a)*r*.38, y = Math.sin(a)*r*.38;
        circle(x,y,r*.62,'#4b6846',color,1.5);
        circle(x-2,y-2,r*.19,'#cadf94');
      }
    }
    ctx.restore();
    if (enemy.elite) {
      ctx.fillStyle = '#0a1519';ctx.fillRect(enemy.x-r,enemy.y-r-16,r*2,5);
      ctx.fillStyle = color;ctx.fillRect(enemy.x-r,enemy.y-r-16,r*2*enemy.hp/enemy.maxHp,5);
    }
  }
  function player(run, time) {
    const p = run.player;
    const radius = survivalStats(run).magnet + (run.level < 3 ? 25 : 0) + (run.phase === 'collect' ? 35 : 0);
    circle(p.x,p.y,radius,null,'#9ee5c813',1);
    ctx.save();ctx.translate(p.x,p.y);
    circle(0,7,19,'#00000077');
    circle(0,0,24,null,'#a7f7d057',1);
    if (p.invulnerable > 0 && Math.floor(time * 18) % 2) ctx.globalAlpha = .45;
    ctx.rotate(p.angle + Math.PI / 2);
    const stride = p.moving && !reduced ? Math.sin(time*17)*3 : 0;
    ctx.fillStyle = '#597872';
    ctx.fillRect(-10,9+stride,7,8);ctx.fillRect(3,9-stride,7,8);
    ctx.fillStyle = '#96bcaa';ctx.beginPath();ctx.roundRect(-14,-6,28,23,7);ctx.fill();
    ctx.fillStyle = '#d5e8c8';ctx.beginPath();ctx.roundRect(-11,-17,22,26,9);ctx.fill();
    ctx.fillStyle = '#24434b';ctx.beginPath();ctx.roundRect(-8,-12,16,10,4);ctx.fill();
    ctx.fillStyle = '#b9ffde';ctx.fillRect(-5,-10,9,2);
    ctx.fillStyle = '#7fada1';ctx.fillRect(10,-14,6,17);
    ctx.fillStyle = '#d3ffe9';ctx.fillRect(11,-19,4,7);
    ctx.fillStyle = '#526c62';ctx.fillRect(-3,4,6,7);
    ctx.fillStyle = '#f4f7dc';ctx.fillRect(-1,5,2,5);ctx.fillRect(-2,6,4,2);
    ctx.restore();
  }

  function siteBody(site,run){
    const ready=site.readyAt<=run.time,active=site.activeUntil>run.time,color=site.type==='cache'?'#ffce82':'#9ee5c5';
    if(active)circle(site.x,site.y,site.radius,'#9ee5c515','#9ee5c599',2);
    circle(site.x,site.y,27,ready?'#253b37':'#1b292c',ready?color:'#49635b',2);
    ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillStyle=ready?color:'#71847c';
    ctx.fillText({supply:'✚',haven:'◇',cache:'⬡'}[site.type],site.x,site.y+8);
    ctx.font='12px sans-serif';ctx.fillText(ready?{supply:'보급',haven:'안전지대',cache:'검체 저장소'}[site.type]:Math.ceil(site.readyAt-run.time)+'s',site.x,site.y+47);
  }
  function hazardBody(h,time){
    const active=time>=h.at;
    ctx.save();
    if(h.type==='lane'){
      ctx.setLineDash(active?[]:[12,8]);
      line(h,{x:h.endX,y:h.endY},active?'#ff9c7277':'#ff9c7255',h.radius*2);
      line(h,{x:h.endX,y:h.endY},'#ffd1ab',2);
    }else if(h.type==='bullet'){
      if(!active){ctx.setLineDash([6,6]);line(h,{x:h.x+h.vx*.85,y:h.y+h.vy*.85},'#ffb59a99',2);circle(h.x,h.y,10,null,'#ffb59a',2);}
      else{circle(h.x,h.y,h.radius+4,'#ff956638');circle(h.x,h.y,h.radius,'#ff946b','#ffe3ba',2);}
    }else if(h.type==='ring'){
      if(!active){circle(h.x,h.y,h.maxRadius,null,'#ff9a8c55',2);circle(h.x,h.y,35+30*(1-(h.at-time)/1.1),null,'#ffb6a2',3);}
      else circle(h.x,h.y,h.radius,null,'#ffa391',10);
    }else{
      circle(h.x,h.y,h.radius,active?'#d35d4c33':'#ff927615','#ff9e83',2);
      if(!active)circle(h.x,h.y,h.radius*Math.max(0,1-(h.at-time)/1.15),null,'#ffbd9d',2);
      ctx.strokeStyle='#ffae8a';ctx.lineWidth=2;
      line({x:h.x-7,y:h.y-7},{x:h.x+7,y:h.y+7},'#ffae8a');
      line({x:h.x+7,y:h.y-7},{x:h.x-7,y:h.y+7},'#ffae8a');
    }
    ctx.restore();
  }
  function marker(point,label,color){
    const dx=point.x-camera.x,dy=point.y-camera.y,hw=width/scale/2-35,hh=height/scale/2-43;
    if(Math.abs(dx)<hw&&Math.abs(dy)<hh)return;
    const a=Math.atan2(dy,dx),r=Math.min(hw/Math.max(.01,Math.abs(Math.cos(a))),hh/Math.max(.01,Math.abs(Math.sin(a))));
    const x=camera.x+Math.cos(a)*r,y=camera.y+Math.sin(a)*r;
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=color;
    ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.fill();ctx.restore();
    ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(label,x,y-13);
  }
  function draw(run,joystick,idleTime=0){
    camera=survivalCamera(run);scale=width/run.view.width;
    const time=run.status==='menu'?idleTime:run.time;
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#101e23';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
    floor();
    for(const site of run.sites)siteBody(site,run);
    for(const p of run.pickups){
      ctx.save();ctx.translate(p.x,p.y);
      if(p.starter&&!p.attracted){circle(0,0,13+(reduced?0:Math.sin(time*4)*3),null,'#bdffe4aa',2);}
      if(p.type==='health'){circle(0,0,10,'#392d31','#e4a59e',1);ctx.fillStyle='#ffbbb2';ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);}
      else if(p.type==='vacuum'){circle(0,0,12,'#32344e','#bcb5ff',2);ctx.fillStyle='#ded9ff';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('⊕',0,5);}
      else{ctx.rotate(Math.PI/4);const size=p.value>10?9:p.starter?8:6;ctx.fillStyle=p.value>10?'#ffd18c':'#a8edca';ctx.fillRect(-size/2,-size/2,size,size);}
      ctx.restore();
    }
    if(run.level<3){
      const next=run.pickups.find(p=>p.starter&&!p.attracted);
      if(next){ctx.save();ctx.setLineDash([3,9]);line(run.player,next,'#a8edca55',2);ctx.restore();}
    }
    for(const p of run.pending)circle(p.x,p.y,18+Math.max(0,1-(p.at-run.time))*12,null,'#ffbf8e99',2);
    if(run.status==='menu')['cocci','charger','ranger','blocker','splitter','virus'].forEach((type,i)=>{
      const a=i*TAU/6+time*.015,r=220+(i%3)*60;
      enemyBody({...ENEMIES[type],type,id:i,x:camera.x+Math.cos(a)*r,y:camera.y+Math.sin(a)*r,born:-1,hitUntil:0},time);
    });
    for(const e of run.enemies){
      if(Math.abs(e.x-camera.x)>width/scale/2+80||Math.abs(e.y-camera.y)>height/scale/2+80)continue;
      enemyBody(e,time);
      const badge={charger:'›',ranger:'•',blocker:'×',splitter:'÷'}[e.type];
      if(badge){ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e8ead8';ctx.fillText(badge,e.x,e.y-e.radius-7);}
      if(run.priority?.id===e.id){circle(e.x,e.y,e.radius+12,null,'#fff1a7',2);ctx.font='10px sans-serif';ctx.fillStyle='#fff1a7';ctx.textAlign='center';ctx.fillText('우선 표적',e.x,e.y+e.radius+28);}
    }
    for(const shot of run.shots){const previous={x:shot.x-shot.vx*.025,y:shot.y-shot.vy*.025};line(previous,shot,'#a7f7d033',8);line(previous,shot,'#d6ffe7',3);}
    for(const w of run.waves){ctx.save();ctx.globalAlpha=Math.min(1,w.fade/.14);circle(w.x,w.y,w.radius,null,'#91d9ff',3);if(w.radius>9)circle(w.x,w.y,w.radius-9,null,'#86cfff44',1);ctx.restore();}
    for(const p of survivalOrbitPositions(run)){circle(p.x,p.y,10,'#efc97433');circle(p.x,p.y,7,'#d9bc78','#ffe3a4',1.5);}
    for(const e of run.effects){
      const progress=Math.min(1,(run.time-e.born)/e.life);ctx.save();ctx.globalAlpha=1-progress;
      if(e.type==='chain'){
        const a=e.points[0],b=e.points[1],mid={x:(a.x+b.x)/2+8,y:(a.y+b.y)/2-8};
        line(a,mid,e.color,2.5);line(mid,b,e.color,2.5);
      }else if(e.type==='impact'){
        if(e.kind==='bolt'){line({x:e.x-8,y:e.y-8},{x:e.x+8,y:e.y+8},e.color,2);line({x:e.x-8,y:e.y+8},{x:e.x+8,y:e.y-8},e.color,2);}
        else circle(e.x,e.y,e.radius*(.8+progress*.4),null,e.color,2);
      }else if(e.type==='burst'){
        for(let i=0;i<5;i++){const a=i*TAU/5+e.id;circle(e.x+Math.cos(a)*progress*26,e.y+Math.sin(a)*progress*26,3*(1-progress),e.color);}
      }else circle(e.x,e.y,e.radius*(.5+progress*.5),null,e.color,2);
      ctx.restore();
    }
    // Danger and the player remain above friendly effects.
    for(const h of run.hazards)hazardBody(h,run.time);
    player(run,time);
    if(run.player.invulnerable>0)circle(run.player.x,run.player.y,29,null,'#d6fff099',2);
    if(run.hurt>0){
      ctx.beginPath();ctx.arc(run.player.x,run.player.y,37,run.hurtAngle-.45,run.hurtAngle+.45);
      ctx.strokeStyle='#ffb094';ctx.lineWidth=6;ctx.stroke();
    }
    for(const e of run.enemies.filter(e=>e.elite))marker(e,run.priority?.id===e.id?'표적':e.name,'#ffb19b');
    for(const e of run.enemies.filter(e=>e.state==='charge'&&!e.elite).slice(0,2))marker(e,'돌진','#ffb093');
    for(const h of run.hazards.filter(h=>h.type==='bullet'&&run.time>=h.at&&Math.hypot(h.x-run.player.x,h.y-run.player.y)<500).slice(0,2))marker(h,'탄','#ffba8d');
    if(run.pending.length)marker(run.pending[0],'유입','#ffd398');
    const site=run.sites.find(s=>s.type===(run.player.hp<45?'supply':'cache')&&s.readyAt<=run.time);
    if(site&&run.enemies.filter(e=>e.elite).length===0)marker(site,site.type==='supply'?'보급':'검체','#9ac8ae');
    ctx.restore();
    if(joystick){
      circle(joystick.startX,joystick.startY,44,'#c3ffe710','#c3ffe744',1.5);
      circle(joystick.startX+joystick.x*35,joystick.startY+joystick.y*35,18,'#c3ffe744','#c3ffe7aa',1.5);
    }
  }
  function worldPoint(x,y){return{x:(x-width/2)/scale+camera.x,y:(y-height/2)/scale+camera.y};}
  resize();return{resize,draw,worldPoint};
}
