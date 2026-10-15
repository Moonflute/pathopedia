import { ENEMIES, WORLD } from './survival-data.mjs';
import { survivalOrbitPositions, survivalStats } from './survival-engine.mjs';

const TAU = Math.PI * 2;
export function createSurvivalRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = 1, height = 1, ratio = 1, scale = 1;
  let camera = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    scale = Math.max(width / 1180, height / 760);
  }
  function circle(x, y, r, fill, stroke, line = 1) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
  }
  function floor() {
    const left = camera.x - width / scale / 2, top = camera.y - height / scale / 2;
    const right = left + width / scale, bottom = top + height / scale;
    ctx.fillStyle = '#101e23'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.lineWidth = 1 / scale;
    for (let x = Math.floor(left / 80) * 80; x <= right; x += 80) {
      for (let y = Math.floor(top / 80) * 80; y <= bottom; y += 80) {
        if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) continue;
        const hash = Math.abs(Math.sin(x * 2.17 + y * 7.13));
        ctx.fillStyle = hash > .7 ? '#142328' : '#122126';
        ctx.fillRect(x + 2, y + 2, 77, 77);
        ctx.strokeStyle = '#26373a'; ctx.beginPath();
        ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke();
        if (hash > .96) {
          ctx.fillStyle = '#4c63571f';
          ctx.beginPath(); ctx.ellipse(x + 40, y + 40, 15, 7, hash * 5, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.strokeStyle = '#487570'; ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, WORLD.width - 36, WORLD.height - 36);
    ctx.setLineDash([14, 10]); ctx.strokeStyle = '#d6b57366'; ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, WORLD.width - 16, WORLD.height - 16); ctx.setLineDash([]);
    const cx = WORLD.width / 2, cy = WORLD.height / 2;
    circle(cx, cy, 160, null, '#698b7933', 2);
    circle(cx, cy, 170, null, '#698b7917', 1);
    ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#6b8b7b66';
    ctx.fillText('P A T H O P E D I A   /   S E C T O R  0 1', cx, cy + 205);
    ctx.fillText('C O N T A I N M E N T   Z O N E', cx, cy - 193);
    ctx.strokeStyle = '#78978933'; ctx.lineWidth = 2;
    for (const [x,y] of [[cx-230,cy-230],[cx+230,cy-230],[cx-230,cy+230],[cx+230,cy+230]]) {
      ctx.strokeRect(x - 7, y - 7, 14, 14);
      circle(x,y,2,'#91ac8766');
    }
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
    const r = enemy.radius, color = enemy.hitUntil > time ? '#faffed' : enemy.color;
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
    } else if (enemy.type === 'virus') {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*.6,Math.sin(a)*r*.6);ctx.lineTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2);ctx.stroke();
        circle(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2,2,color);
      }
      circle(0,0,r*.7,'#79424e',color,1.8);
      circle(-3,-2,3,'#ffc3cd');
    } else if (enemy.type === 'bacilli') {
      ctx.fillStyle = '#78603d'; ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-r,-r*.55,r*2,r*1.1,r*.55); ctx.fill();ctx.stroke();
      for (let i = -1; i <= 1; i++) circle(i*7,-1,2.5,color);
      ctx.strokeStyle = '#dfb56177';ctx.beginPath();ctx.moveTo(-r,1);ctx.quadraticCurveTo(-r-14,-12,-r-19,1);ctx.stroke();
    } else if (enemy.type === 'spore') {
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
    const radius = survivalStats(run).magnet;
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
  function draw(run, joystick, idleTime = 0) {
    camera = { x: run.player.x, y: run.player.y };
    const time = run.status === 'menu' ? idleTime : run.time;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.fillStyle = '#0a141a';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-camera.x,-camera.y);
    floor();
    for (const hazard of run.hazards) {
      const active = run.time >= hazard.at;
      circle(hazard.x,hazard.y,hazard.radius,active?'#ff7f6866':'#ff7f6812','#ff8f82aa',2);
      if (!active) circle(hazard.x,hazard.y,hazard.radius*Math.max(0,1-(hazard.at-run.time)/1.15),null,'#ff8f8255',2);
    }
    for (const pickup of run.pickups) {
      ctx.save();ctx.translate(pickup.x,pickup.y);
      if (pickup.type === 'health') {
        circle(0,0,10,'#392d31','#e4a59e',1);
        ctx.fillStyle='#ffbbb2';ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);
      } else if(pickup.type === 'vacuum') {
        circle(0,0,11,'#32344e','#bcb5ff',2);
        ctx.fillStyle='#ded9ff';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('⊕',0,5);
      } else {
        ctx.rotate(Math.PI/4);const size=pickup.value>10?8:5;
        ctx.fillStyle=pickup.value>10?'#ffce7c':'#9df3ca';ctx.fillRect(-size/2,-size/2,size,size);
        ctx.fillStyle='#e8fff1';ctx.fillRect(-size/2,-size/2,2,2);
      }
      ctx.restore();
    }
    if(run.status === 'menu') {
      ['cocci','bacilli','spore','virus','cocci','virus','bacilli','spore'].forEach((type,i)=>{
        const angle=i*TAU/8+time*.015,r=240+(i%3)*60;
        enemyBody({...ENEMIES[type],type,id:i,x:camera.x+Math.cos(angle)*r,y:camera.y+Math.sin(angle)*r,born:-1,hitUntil:0},time);
      });
    }
    for (const enemy of run.enemies) {
      if(Math.abs(enemy.x-camera.x)>width/scale/2+80||Math.abs(enemy.y-camera.y)>height/scale/2+80)continue;
      enemyBody(enemy,time);
    }
    for (const shot of run.shots) {
      ctx.strokeStyle='#a7f7d038';ctx.lineWidth=9;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(shot.x-shot.vx*.035,shot.y-shot.vy*.035);ctx.lineTo(shot.x,shot.y);ctx.stroke();
      ctx.strokeStyle='#caffdd';ctx.lineWidth=3;ctx.stroke();
    }
    for(const p of survivalOrbitPositions(run)) {
      circle(p.x,p.y,12,'#f9d18718');circle(p.x,p.y,7,'#d9bc78','#ffe3a4',1.5);
      circle(p.x-2,p.y-2,2,'#fff3ce');
    }
    player(run,time);
    for (const effect of run.effects) {
      const progress=(run.time-effect.born)/effect.life;ctx.save();ctx.globalAlpha=1-progress;
      if(effect.type==='nova') {
        circle(effect.x,effect.y,effect.radius*(.3+progress*.7),'#86cfff0a',effect.color,3);
        circle(effect.x,effect.y,effect.radius*(.2+progress*.6),null,effect.color+'66',1);
      } else if(effect.type==='chain') {
        ctx.strokeStyle=effect.color;ctx.lineWidth=2.5;ctx.beginPath();
        effect.points.forEach((p,i)=>{
          if(!i)ctx.moveTo(p.x,p.y);
          else {const prev=effect.points[i-1];ctx.lineTo((p.x+prev.x)/2+9,(p.y+prev.y)/2-9);ctx.lineTo(p.x,p.y);}
        });ctx.stroke();
      } else if(effect.type==='burst') {
        for(let i=0;i<6;i++){const a=i*TAU/6+effect.id;circle(effect.x+Math.cos(a)*progress*30,effect.y+Math.sin(a)*progress*30,3*(1-progress),effect.color);}
      }
      ctx.restore();
    }
    // A directional marker keeps a required boss findable beyond the camera.
    const boss=run.enemies.find(e=>e.type==='boss');
    if(boss && (Math.abs(boss.x-camera.x)>width/scale/2-65 || Math.abs(boss.y-camera.y)>height/scale/2-65)) {
      const angle=Math.atan2(boss.y-camera.y,boss.x-camera.x);
      const r=Math.min((width/scale/2-38)/Math.max(.01,Math.abs(Math.cos(angle))),(height/scale/2-50)/Math.max(.01,Math.abs(Math.sin(angle))));
      ctx.save();ctx.translate(camera.x+Math.cos(angle)*r,camera.y+Math.sin(angle)*r);ctx.rotate(angle);
      ctx.fillStyle='#ff9a8f';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.fill();ctx.restore();
    }
    ctx.restore();
    const vignette=ctx.createRadialGradient(width/2,height/2,height*.2,width/2,height/2,Math.max(width,height)*.68);
    vignette.addColorStop(0,'#070f1400');vignette.addColorStop(1,'#070f1499');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
    if(run.hurt>0&&!reduced){ctx.fillStyle='rgba(242,112,104,'+run.hurt*.38+')';ctx.fillRect(0,0,width,height);}
    if(joystick) {
      circle(joystick.startX,joystick.startY,44,'#c3ffe710','#c3ffe744',1.5);
      circle(joystick.startX+joystick.x*35,joystick.startY+joystick.y*35,18,'#c3ffe744','#c3ffe7aa',1.5);
    }
  }
  resize();
  return { resize, draw };
}
