import { formatTime, RUN_DURATION, UPGRADE_BY_ID, WEAPONS } from './survival-data.mjs';
import { chooseSurvivalUpgrade, createSurvivalRun, pauseSurvival, resumeSurvival, startSurvival, survivalStats, tickSurvival } from './survival-engine.mjs';
import { createSurvivalRenderer } from './survival-renderer.mjs';

const STORAGE_KEY = 'pathopedia.survival.v1';
const button = (action, label, style = '', extra = '') => '<button type="button" class="' + style + '" data-survival-action="' + action + '" ' + extra + '>' + label + '</button>';
export function createSurvivalGame() {
  let run = createSurvivalRun(), game, canvas, renderer, observer, controller, frame = 0, lastTime = 0, accumulator = 0, hudTime = 0;
  let joystick = null, keys = new Set(), audio, audioOn = true, finishedSaved = false, storageAvailable = true;
  let record = { bestTime: 0, bestKills: 0, wins: 0, runs: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) {
      for (const key of Object.keys(record)) if (Number.isFinite(saved[key]) && saved[key] >= 0) record[key] = saved[key];
      audioOn = saved.audioOn !== false;
    }
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...record, audioOn })); }
    catch { storageAvailable = false; }
  }
  function sound(kind) {
    if (!audioOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') void audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
      const notes = { start: [260, 520, .15], kill: [230, 110, .045], upgrade: [440, 880, .2], hurt: [100, 50, .08], won: [520, 1040, .3] };
      const [from, to, duration] = notes[kind] || notes.kill;
      oscillator.type = kind === 'hurt' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(.035, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + duration);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Silent play remains available when Web Audio is unavailable. */ }
  }
  function equipment() {
    return WEAPONS.map(w => {
      const level = run.upgrades[w.id];
      return '<div class="sv-slot ' + (level ? 'equipped' : '') + '" title="' + w.name + (level ? ' · Lv.' + level : ' · 레벨업으로 획득') + '"><span class="sv-slot-icon" style="--weapon:' + w.color + '">' + w.icon + '</span><span><small>' + w.short + '</small><b>' + (level ? w.name : '미획득') + '</b></span><em>' + (level ? 'Lv.' + level : '—') + '</em></div>';
    }).join('');
  }
  function instructions() {
    return '<div class="sv-controls"><span><kbd>W A S D</kbd> / <kbd>↑ ← ↓ →</kbd> 이동</span><span><kbd>Esc</kbd> / <kbd>P</kbd> 일시정지</span><span><kbd>1 2 3</kbd> 강화 선택</span><span>모바일 · 전장을 드래그해 이동</span></div>';
  }
  function overlay() {
    if (run.status === 'running') return '';
    let body = '';
    if (run.status === 'menu') {
      body = '<div class="sv-intro"><div class="sv-intro-copy"><span class="sv-eyebrow"><i></i> CONTAINMENT BREACH / 01</span><h1 id="sv-dialog-title">survival<span>마지막까지 살아남아라.</span></h1><p>사방에서 몰려오는 군집.<br>멈추지 말고, 검체를 모으고, 더 강해지세요.</p>' +
        button('start', '생존 시작 <span>↗</span>', 'sv-primary') +
        '<div class="sv-run-label"><span>05:00 생존</span><i>·</i><span>자동 공격</span><i>·</i><span>레벨업 3택1</span></div></div>' +
        '<div class="sv-mission"><div class="sv-mission-top"><span>YOUR MISSION</span><b>01—05</b></div><div class="sv-mission-time">05<span>:00</span></div><p>격리 완료까지 버티고<br><strong>군집의 심장</strong>을 제거하세요.</p><ol><li><b>01</b><span>이동하며 포위망 피하기</span></li><li><b>02</b><span>빛나는 검체로 레벨업</span></li><li><b>03</b><span>무기 4종 조합 완성</span></li></ol><div class="sv-best">최고 생존 <b>' + formatTime(record.bestTime) + '</b><span>최고 처치 <b>' + record.bestKills + '</b></span></div></div></div>' + instructions() +
        '<p class="sv-fiction">병원체를 모티브로 한 아케이드 게임 · 무기와 전투 수치는 가상 설정입니다.</p>';
    } else if (run.status === 'upgrade') {
      body = '<div class="sv-choices">' +
        run.choices.map((id, index) => {
          const u = UPGRADE_BY_ID[id], level = run.upgrades[id];
          return '<button type="button" class="sv-upgrade" data-survival-upgrade="' + id + '" style="--weapon:' + u.color + '"><span class="sv-upgrade-top"><span>' + u.kind + '</span><kbd>' + (index + 1) + '</kbd></span><span class="sv-upgrade-icon">' + u.icon + '</span><strong>' + u.name + '</strong><p>' + u.description + '</p><span class="sv-upgrade-level">' + (id === 'repair' ? '즉시 회복' : level ? 'Lv.' + level + ' → Lv.' + (level + 1) : 'NEW EQUIPMENT') + '<span>↗</span></span></button>';
        }).join('') + '</div>';
    } else if (run.status === 'paused') {
      body = '<div class="sv-pause"><span class="sv-eyebrow">TAKE A BREATH</span><h2 id="sv-dialog-title">잠시 정비 중.</h2><p>' + formatTime(run.time) + ' 생존 · ' + run.kills + ' 처치 · LEVEL ' + run.level + '</p>' +
        button('resume', '계속 생존하기 <span>→</span>', 'sv-primary') + button('menu', '처음으로 돌아가기', 'sv-secondary') + instructions() + '<p class="sv-pause-hint">자동 공격 · 검체 수집으로 성장 · 01:30 / 03:00 중간보스 · 04:30 최종 보스</p></div>';
    } else {
      const won = run.status === 'won';
      body = '<div class="sv-result"><span class="sv-eyebrow">' + (won ? 'CONTAINMENT COMPLETE' : 'SIGNAL LOST') + '</span><h2 id="sv-dialog-title">' + (won ? '격리 완료.' : '이번 생존은 여기까지.') + '</h2><p>' + (won ? '군집의 심장을 제거하고 전장을 지켜냈습니다.' : '다른 무기 조합으로 다시 도전해 보세요.') + '</p><div class="sv-result-stats"><div><small>생존 시간</small><strong>' + formatTime(run.time) + '</strong></div><div><small>처치</small><strong>' + run.kills + '</strong></div><div><small>도달 레벨</small><strong>' + run.level + '</strong></div></div><div class="sv-result-build">' + WEAPONS.filter(w => run.upgrades[w.id]).map(w => '<span>' + w.icon + ' ' + w.name + ' <b>Lv.' + run.upgrades[w.id] + '</b></span>').join('') + '</div>' +
        button('restart', '다시 도전 <span>↗</span>', 'sv-primary') + button('menu', '시작 화면', 'sv-secondary') +
        '<p class="sv-record-note">' + (storageAvailable ? '최고 생존 ' + formatTime(record.bestTime) + ' · 최고 처치 ' + record.bestKills + ' · 격리 성공 ' + record.wins + '회' : '브라우저 저장을 사용할 수 없어 기록은 이번 방문에만 유지됩니다.') + '</p></div>';
    }
    return '<div class="sv-overlay sv-overlay--' + run.status + '"><section class="sv-dialog" role="dialog" ' + (run.status === 'upgrade' ? 'aria-label="강화 선택"' : 'aria-labelledby="sv-dialog-title"') + '>' + body + '</section></div>';
  }
  function render() {
    return '<section class="sv-game" aria-label="survival 자동 공격 생존 게임"><header class="sv-hud"><div class="sv-brand"><span class="sv-brand-mark">✣</span><div><strong>survival</strong><small>ISOLATION FIELD / 01</small></div></div><div class="sv-timer"><strong data-sv-time>' + formatTime(run.time) + '</strong><small>/ 05:00</small></div><div class="sv-hud-right"><span class="sv-kills">처치 <b data-sv-kills>' + run.kills + '</b></span>' +
      button('sound', audioOn ? '♫' : '♩', 'sv-icon-button', 'aria-label="효과음 ' + (audioOn ? '끄기' : '켜기') + '" aria-pressed="' + audioOn + '"') +
      button('fullscreen', '⛶', 'sv-icon-button sv-fullscreen', 'aria-label="게임 전체 화면"') +
      button('pause', 'Ⅱ', 'sv-icon-button', 'aria-label="일시정지"') +
      '</div></header><div class="sv-xp-track" role="progressbar" aria-label="다음 레벨 경험치" aria-valuemin="0" aria-valuemax="' + run.nextXp + '" aria-valuenow="' + run.xp + '"><i data-sv-xp></i></div><div class="sv-field"><canvas class="sv-canvas" tabindex="0" aria-label="생존 전장. WASD 또는 방향키로 이동, 공격은 자동입니다. 터치는 드래그, P 또는 Escape로 일시정지."></canvas><div class="sv-field-stats"><div class="sv-health"><span>✚</span><i><b data-sv-hp-bar></b></i><strong data-sv-hp>100 / 100</strong></div><span class="sv-level" data-sv-level>LV. 01</span></div><div class="sv-boss" hidden><span>군집의 심장</span><i><b data-sv-boss-hp></b></i></div><div class="sv-banner" data-sv-banner role="status" hidden></div><div class="sv-touch-hint">화면을 드래그해 이동</div><div class="sv-overlay-host">' + overlay() + '</div></div><footer class="sv-footer"><div class="sv-loadout">' + equipment() + '</div><div class="sv-footer-hint"><span class="sv-live-dot"></span><b>AUTO ATTACK</b><small>이동에 집중하세요</small></div></footer></section>';
  }
  function refreshHud() {
    if (!game) return;
    const stats = survivalStats(run), set = (selector, value) => { const el = game.querySelector(selector); if (el && el.textContent !== String(value)) el.textContent = value; };
    set('[data-sv-time]', formatTime(run.time)); set('[data-sv-kills]', run.kills);
    set('[data-sv-hp]', Math.ceil(run.player.hp) + ' / ' + stats.maxHp); set('[data-sv-level]', 'LV. ' + String(run.level).padStart(2, '0'));
    game.querySelector('[data-sv-hp-bar]').style.width = (run.player.hp / stats.maxHp * 100) + '%';
    const xp = game.querySelector('.sv-xp-track');
    xp.setAttribute('aria-valuemax', run.nextXp); xp.setAttribute('aria-valuenow', Math.min(run.xp, run.nextXp));
    game.querySelector('[data-sv-xp]').style.width = Math.min(100, run.xp / run.nextXp * 100) + '%';
    const boss = run.enemies.find(e => e.type === 'boss'), bossHud = game.querySelector('.sv-boss');
    bossHud.hidden = !boss;
    if (boss) game.querySelector('[data-sv-boss-hp]').style.width = boss.hp / boss.maxHp * 100 + '%';
    const banner = game.querySelector('[data-sv-banner]');
    const text = run.time >= RUN_DURATION && !run.bossDefeated ? '군집의 심장을 제거하면 격리 완료' : run.bannerUntil > run.time ? run.banner : '';
    if (banner.textContent !== text) banner.textContent = text;
    banner.hidden = !text || run.status !== 'running';
  }
  function saveResult() {
    if (finishedSaved || !['won', 'lost'].includes(run.status)) return;
    finishedSaved = true; record.runs++;
    record.bestTime = Math.max(record.bestTime, Math.floor(run.time));
    record.bestKills = Math.max(record.bestKills, run.kills);
    if (run.status === 'won') record.wins++;
    persist(); sound(run.status === 'won' ? 'won' : 'hurt');
  }
  function clearInput() {
    keys.clear();
    if (joystick && canvas?.hasPointerCapture(joystick.id)) canvas.releasePointerCapture(joystick.id);
    joystick = null;
    run.player.moving = false;
  }
  function sync(focus = true) {
    if (!game) return;
    clearInput(); saveResult();
    game.dataset.status = run.status;
    game.querySelector('.sv-overlay-host').innerHTML = overlay();
    game.querySelector('.sv-loadout').innerHTML = equipment();
    const pause = game.querySelector('[data-survival-action="pause"]');
    pause.disabled = !['running', 'paused'].includes(run.status);
    pause.textContent = run.status === 'paused' ? '▷' : 'Ⅱ';
    pause.setAttribute('aria-label', run.status === 'paused' ? '계속 생존하기' : '일시정지');
    const soundButton = game.querySelector('[data-survival-action="sound"]');
    soundButton.textContent = audioOn ? '♫' : '♩';
    soundButton.setAttribute('aria-pressed', audioOn); soundButton.setAttribute('aria-label', '효과음 ' + (audioOn ? '끄기' : '켜기'));
    refreshHud(); renderer?.draw(run, null);
    if (focus) queueMicrotask(() => {
      if (!game?.isConnected) return;
      (game.querySelector('.sv-overlay button') || canvas)?.focus({ preventScroll: true });
    });
  }
  function choose(id) {
    if (!chooseSurvivalUpgrade(run, id)) return;
    sound('upgrade'); sync();
  }
  function pause() { clearInput(); if (pauseSurvival(run)) sync(false); }
  function handleClick(target) {
    if (!game?.isConnected) return false;
    if (target.dataset.survivalUpgrade) { choose(target.dataset.survivalUpgrade); return true; }
    const action = target.dataset.survivalAction;
    if (!action) return false;
    if (action === 'start') { startSurvival(run); sound('start'); }
    if (action === 'restart') { run = createSurvivalRun(); finishedSaved = false; startSurvival(run); sound('start'); }
    if (action === 'menu') { run = createSurvivalRun(); finishedSaved = false; }
    if (action === 'pause') { if (run.status === 'paused') resumeSurvival(run); else pauseSurvival(run); }
    if (action === 'resume') resumeSurvival(run);
    if (action === 'sound') { audioOn = !audioOn; persist(); if (audioOn) sound('start'); }
    if (action === 'fullscreen') {
      const request = document.fullscreenElement ? document.exitFullscreen?.() : game.requestFullscreen?.();
      if (request?.catch) void request.catch(() => {});
      return true;
    }
    sync(action !== 'sound'); return true;
  }
  function mount(root, active) {
    cancelAnimationFrame(frame); frame = 0; controller?.abort(); observer?.disconnect(); clearInput();
    game = null; canvas = null; renderer = null;
    if (!active) { pauseSurvival(run); return; }
    game = root.querySelector('.sv-game'); canvas = game?.querySelector('canvas');
    if (!canvas) return;
    controller = new AbortController();
    const options = { signal: controller.signal };
    renderer = createSurvivalRenderer(canvas);
    observer = new ResizeObserver(() => { renderer?.resize(); renderer?.draw(run, joystick); });
    observer.observe(canvas);
    if (!game.requestFullscreen) game.querySelector('.sv-fullscreen').hidden = true;
    window.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable || document.querySelector('dialog[open]')) return;
      if (event.code === 'Escape' || event.code === 'KeyP') {
        if (!event.repeat && ['running', 'paused'].includes(run.status)) { event.preventDefault(); if (run.status === 'running') pauseSurvival(run); else resumeSurvival(run); sync(); }
        return;
      }
      if (run.status === 'upgrade' && /^Digit[123]$/.test(event.code) && !event.repeat) { event.preventDefault(); choose(run.choices[Number(event.code.slice(-1)) - 1]); return; }
      if (run.status === 'running' && ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) { event.preventDefault(); keys.add(event.code); }
    }, options);
    window.addEventListener('keyup', event => keys.delete(event.code), options);
    window.addEventListener('blur', pause, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { pause(); cancelAnimationFrame(frame); frame = 0; lastTime = 0; accumulator = 0; }
      else if (!frame) frame = requestAnimationFrame(animate);
    }, options);
    canvas.addEventListener('pointerdown', event => {
      if (run.status !== 'running' || event.button !== 0 || joystick) return;
      event.preventDefault(); canvas.focus({ preventScroll: true });
      const box = canvas.getBoundingClientRect();
      joystick = { id: event.pointerId, startX: event.clientX - box.left, startY: event.clientY - box.top, x: 0, y: 0 };
      canvas.setPointerCapture(event.pointerId);
    }, options);
    canvas.addEventListener('pointermove', event => {
      if (!joystick || event.pointerId !== joystick.id) return;
      const box = canvas.getBoundingClientRect(), x = event.clientX - box.left - joystick.startX, y = event.clientY - box.top - joystick.startY, length = Math.hypot(x, y);
      joystick.x = length > 4 ? x / Math.max(40, length) : 0; joystick.y = length > 4 ? y / Math.max(40, length) : 0;
    }, options);
    for (const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type, event => { if (joystick?.id === event.pointerId) joystick = null; }, options);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
    lastTime = 0; accumulator = 0; hudTime = 0;
    sync(false);
    function animate(now) {
      frame = 0;
      if (!game?.isConnected || document.hidden) return;
      const dt = lastTime ? Math.min((now - lastTime) / 1000, .1) : 0;
      lastTime = now;
      if (run.status === 'running') {
        accumulator += dt;
        const input = joystick || { x: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), y: Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')) };
        const kills = run.kills, hp = run.player.hp;
        while (accumulator >= 1 / 60 && run.status === 'running') {
          accumulator -= 1 / 60;
          if (tickSurvival(run, input, 1 / 60)) { if (run.status === 'upgrade') sound('upgrade'); sync(); break; }
        }
        if (run.player.hp < hp) sound('hurt');
        else if (run.kills > kills && Math.floor(now / 80) % 2 === 0) sound('kill');
        hudTime += dt;
        if (hudTime >= .12) { refreshHud(); hudTime = 0; }
      } else accumulator = 0;
      if (run.status === 'running' || run.status === 'menu') renderer.draw(run, joystick, now / 1000);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  }
  return { render, mount, handleClick };
}
