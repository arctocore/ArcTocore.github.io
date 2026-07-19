/* Tactical Board view — interactive canvas with objects, drawing, frames,
   animation, ball shooting + magnet, whistle sound, and video recording. */
window.Views = window.Views || {};
Views.tactics = function (mount) {
  let tool = 'select';
  let color = '#ffd400';
  let current;
  let frameIdx = 0;
  let drag = null;      // dragging object
  let drawing = null;   // freehand/shape in progress
  let animTimer = null;
  let selectedId = null;   // currently selected player (for shooting/magnet)
  let aim = null;          // {x,y,mode} live aiming marker while using shoot tool
  let ballFx = null;       // active ball flight position
  let boxSuppressClick = false;
  let rec = null;          // MediaRecorder
  let recChunks = [];
  let recTimer = null, recStart = 0;

  // ---------- Sound (single instance: reset & replay, never overlap) ----------
  const Sfx = (() => {
    let actx = null, activeNodes = [];
    function ac() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; }
    function stopAll() { activeNodes.forEach(n => { try { n.stop(); } catch (e) {} }); activeNodes = []; }
    function whistle() {
      const a = ac(); if (a.state === 'suspended') a.resume();
      stopAll();                                   // reset before replay
      const now = a.currentTime;
      const osc = a.createOscillator(), gain = a.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.setValueAtTime(2100, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain).connect(a.destination);
      osc.start(now); osc.stop(now + 0.36);
      activeNodes = [osc];
    }
    function whoosh() {
      const a = ac(); if (a.state === 'suspended') a.resume();
      const now = a.currentTime;
      const osc = a.createOscillator(), gain = a.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain).connect(a.destination);
      osc.start(now); osc.stop(now + 0.3);
    }
    function hit() {
      const a = ac(); if (a.state === 'suspended') a.resume();
      const now = a.currentTime;
      const osc = a.createOscillator(), gain = a.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.14);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain).connect(a.destination);
      osc.start(now); osc.stop(now + 0.17);
    }
    return { whistle, whoosh, hit, stopAll };
  })();

  let sportId = (window.App && App.getSport && App.getSport()) || 'handball';
  function sport() { return SPORTS.get(sportId); }

  function loadOrNew() {
    const saved = Store.all('tactics').find(t => (t.sport || 'handball') === sportId);
    if (saved) { return JSON.parse(JSON.stringify(saved)); }
    return { id: null, name: 'New Play', sport: sportId, frames: [defaultFrame()] };
  }
  function defaultFrame() {
    return { objects: sport().formation(), shapes: [] };
  }
  current = loadOrNew();

  // ---------- Boxing mode ----------
  let boxLog = [];          // list of {t, actor, action, hit}
  let boxStart = 0;
  const boxState = { aScore: 0, bScore: 0, aHealth: 100, bHealth: 100 };
  function boxer(id) { return frame().objects.find(o => o.kind === 'boxer' && o.id === id); }
  function boxPunchSfx() { Sfx.whoosh(); }
  function resetBoxing() {
    boxState.aScore = 0; boxState.bScore = 0; boxState.aHealth = 100; boxState.bHealth = 100;
    boxLog = []; boxStart = Date.now();
  }
  // A punch from `attacker` toward the opponent; success reduced by opponent guard.
  function boxPunch(attackerId, hand) {
    const atk = boxer(attackerId);
    const defId = attackerId === 'boxerA' ? 'boxerB' : 'boxerA';
    const def = boxer(defId);
    if (!atk || !def) return;
    boxPunchSfx();
    // animate the glove toward the opponent then back
    const glove = hand === 'L' ? atk.glL : atk.glR;
    const home = { x: glove.x, y: glove.y };
    const target = { x: def.x + (Math.random() * 8 - 4), y: def.y + (Math.random() * 8 - 4) };
    const landed = def.guard < 55 || Math.random() > def.guard / 140;
    let t = 0;
    const iv = setInterval(() => {
      t += 0.16;
      const ph = t <= 1 ? t : 2 - t;
      glove.x = home.x + (target.x - home.x) * ph;
      glove.y = home.y + (target.y - home.y) * ph;
      draw();
      if (t >= 2) {
        clearInterval(iv);
        glove.x = home.x; glove.y = home.y;
        const secs = ((Date.now() - boxStart) / 1000).toFixed(1);
        if (landed) {
          if (attackerId === 'boxerA') { boxState.aScore++; boxState.bHealth = Math.max(0, boxState.bHealth - 6); }
          else { boxState.bScore++; boxState.aHealth = Math.max(0, boxState.aHealth - 6); }
          Sfx.hit && Sfx.hit();
        }
        boxLog.push({ t: secs, actor: attackerId === 'boxerA' ? 'A' : 'B', action: 'punch-' + hand, hit: landed });
        draw();
      }
    }, 24);
  }
  // Raise guard (defend) for a boxer; decays over time.
  function boxDefend(id) {
    const b = boxer(id); if (!b) return;
    b.guard = Math.min(100, (b.guard || 0) + 30);
    const secs = ((Date.now() - boxStart) / 1000).toFixed(1);
    boxLog.push({ t: secs, actor: id === 'boxerA' ? 'A' : 'B', action: 'defend', hit: null });
    draw();
    setTimeout(() => { if (boxer(id)) { boxer(id).guard = Math.max(40, (boxer(id).guard || 40) - 15); draw(); } }, 900);
  }
  function drawBoxingHud() {
    // health / score bars for both boxers
    const W = canvas.width;
    const bar = (x, y, w, pct, col, label) => {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y, w, 16);
      ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, pct) / 100, 16);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 16);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 4, y + 8);
    };
    bar(16, 16, 180, boxState.aHealth, '#0a84ff', 'A  ' + boxState.aScore + ' pts');
    bar(W - 196, 16, 180, boxState.bHealth, '#ff3b30', 'B  ' + boxState.bScore + ' pts');
  }
  function setupBoxingMode() {
    const panel = mount.querySelector('#boxingPanel');
    if (!panel) return;
    if (sportId === 'boxing') { panel.classList.remove('hidden'); resetBoxing(); }
    else panel.classList.add('hidden');
  }

  mount.innerHTML = `
    <div class="page-head">
      <div><h1>${T('tactics.title')}</h1><p>${T('tactics.subtitle')}</p></div>
      <div class="row" style="flex:0">
        <input id="playName" value="${UI.esc(current.name)}" style="width:170px">
        <button class="btn" id="savePlay">${T('tactics.save')}</button>
        <button class="btn" id="exportPlay">JSON</button>
      </div>
    </div>
    <div class="board-wrap">
      <div class="tool-panel card">
        <h3>${T('tactics.sport')}</h3>
        <div class="tool-group sport-group" id="sports">
          ${SPORTS.LIST.map(s => `<div class="tool-btn sport-btn ${s.id === sportId ? 'active' : ''}" data-sport="${s.id}" title="${s.name.en}">${s.icon}</div>`).join('')}
        </div>
        <h3 style="margin-top:12px">${T('tactics.tools')}</h3>
        <div class="tool-group" id="tools">
          ${[['select', 'Select', 'Select / move'], ['shoot', 'Shoot', 'Shoot the ball'], ['player', 'Add', 'Add player'], ['pass', 'Pass', 'Pass line'], ['run', 'Run', 'Run path'], ['arrow', 'Arrow', 'Arrow'], ['line', 'Line', 'Line'], ['free', 'Draw', 'Freehand'], ['circle', 'Circle', 'Circle'], ['rect', 'Rect', 'Rectangle'], ['erase', 'Erase', 'Erase object']]
            .map(([t, i, tip]) => `<div class="tool-btn ${t === tool ? 'active' : ''}" data-tool="${t}" title="${tip}">${i}</div>`).join('')}
        </div>
        <p class="hint">${T('tactics.hint')}</p>
        <h3 style="margin-top:12px">${T('tactics.color')}</h3>
        <div class="tool-group">
          ${['#ffd400', '#ff3b30', '#34c759', '#0a84ff', '#ffffff', '#0b1220'].map(c => `<div class="tool-btn" data-color="${c}" style="background:${c};min-width:30px;height:30px"></div>`).join('')}
        </div>
        <h3 style="margin-top:12px">${T('tactics.frames')}</h3>
        <button class="btn sm primary" id="addFrame">${T('tactics.addFrame')}</button>
        <button class="btn sm" id="dupFrame">${T('tactics.duplicate')}</button>
        <button class="btn sm" id="playAnim">${T('tactics.play')}</button>
        <button class="btn sm danger" id="clearShapes">${T('tactics.clearDraw')}</button>
        <h3 style="margin-top:12px">${T('tactics.record')}</h3>
        <button class="btn sm" id="recBtn">${T('tactics.recBtn')}</button>
        <button class="btn sm" id="recStop" disabled>${T('tactics.stop')}</button>
        <div><span id="recDot" class="rec-dot hidden">REC <span id="recTime">0:00</span></span></div>
        <div id="boxingPanel" class="boxing-panel hidden">
          <h3 style="margin-top:12px">${T('boxing.title')}</h3>
          <p class="hint">${T('boxing.help')}</p>
          <div class="boxing-controls">
            <div class="box-side">
              <span class="box-tag" style="color:#0a84ff">A</span>
              <button class="btn sm" data-box="A:L">${T('boxing.jabL')}</button>
              <button class="btn sm" data-box="A:R">${T('boxing.jabR')}</button>
              <button class="btn sm primary" data-box="A:D">${T('boxing.defend')}</button>
            </div>
            <div class="box-side">
              <span class="box-tag" style="color:#ff3b30">B</span>
              <button class="btn sm" data-box="B:L">${T('boxing.jabL')}</button>
              <button class="btn sm" data-box="B:R">${T('boxing.jabR')}</button>
              <button class="btn sm primary" data-box="B:D">${T('boxing.defend')}</button>
            </div>
          </div>
          <p class="hint">${T('boxing.keys')}</p>
        </div>
      </div>
      <div>
        <canvas id="tacticalCanvas" width="700" height="560"></canvas>
        <div class="timeline" id="timeline"></div>
      </div>
    </div>`;

  const canvas = mount.querySelector('#tacticalCanvas');
  const ctx = canvas.getContext('2d');

  function frame() { return current.frames[frameIdx]; }
  function ball() { return frame().objects.find(o => o.kind === 'ball'); }
  function selected() { return frame().objects.find(o => o.id === selectedId && (o.kind === 'player' || o.kind === 'gk')); }
  function goalkeeper() { return frame().objects.find(o => o.kind === 'gk'); }

  function toPct(e) {
    const r = canvas.getBoundingClientRect();
    const px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 100;
    const py = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) / r.height * 100;
    return { x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) };
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function drawCourt() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    sport().court(ctx, W, H);
  }

  function drawPlayer(o, x, y) {
    if (o.id === selectedId) {
      ctx.beginPath(); ctx.arc(x, y, 22, 0, 7);
      ctx.fillStyle = 'rgba(255,212,0,.25)'; ctx.fill();
      ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y, o.kind === 'gk' ? 16 : 15, 0, 7);
    ctx.fillStyle = o.kind === 'gk' ? '#f59e0b' : (o.team === 'atk' ? '#0a84ff' : '#ff3b30'); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.label, x, y);
  }
  function drawBall(x, y) {
    ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fillStyle = '#ffeffb';
    ctx.fill(); ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
    ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Draw a boxer from top-down: torso, head, two arms + gloves, guard ring.
  function drawBoxer(o, x, y) {
    const col = o.team === 'atk' ? '#0a84ff' : '#ff3b30';
    const gloveCol = o.team === 'atk' ? '#ffd400' : '#e11d48';
    // selection glow
    if (o.id === selectedId) {
      ctx.beginPath(); ctx.arc(x, y, 40, 0, 7);
      ctx.fillStyle = 'rgba(255,212,0,.18)'; ctx.fill();
      ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    // guard ring (thicker = better guard)
    const gp = (o.guard == null ? 100 : o.guard) / 100;
    ctx.beginPath(); ctx.arc(x, y, 34, 0, 7);
    ctx.strokeStyle = `rgba(52,199,89,${0.25 + 0.5 * gp})`; ctx.lineWidth = 2 + 5 * gp; ctx.stroke();
    // body (torso ellipse)
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 26, 0, 0, 7);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    // head (toward facing direction)
    const hy = (o.facing || -1) * 20;
    ctx.beginPath(); ctx.arc(0, hy, 10, 0, 7);
    ctx.fillStyle = '#f2c9a0'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
    // gloves (relative positions stored in pct)
    [o.glL, o.glR].forEach(g => {
      if (!g) return;
      const gx = g.x / 100 * canvas.width, gy = g.y / 100 * canvas.height;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(gx, gy);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(gx, gy, 9, 0, 7);
      ctx.fillStyle = gloveCol; ctx.fill();
      ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // label
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.label, x, y);
  }

  function draw() {
    drawCourt();
    const f = frame();
    f.shapes.forEach(drawShape);
    if (drawing) drawShape(drawing);

    if (aim && selected()) {
      const s = selected();
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x / 100 * canvas.width, s.y / 100 * canvas.height);
      ctx.lineTo(aim.x / 100 * canvas.width, aim.y / 100 * canvas.height);
      ctx.stroke(); ctx.setLineDash([]);
      const tx = aim.x / 100 * canvas.width, ty = aim.y / 100 * canvas.height;
      ctx.strokeStyle = aim.mode === 'save' ? '#ff3b30' : aim.mode === 'pass' ? '#34c759' : '#ffd400';
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tx, ty, 12, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 16, ty); ctx.lineTo(tx + 16, ty); ctx.moveTo(tx, ty - 16); ctx.lineTo(tx, ty + 16); ctx.stroke();
    }

    f.objects.forEach(o => {
      const x = o.x / 100 * canvas.width, y = o.y / 100 * canvas.height;
      if (o.kind === 'ball') { if (!ballFx) drawBall(x, y); }
      else if (o.kind === 'boxer') drawBoxer(o, x, y);
      else drawPlayer(o, x, y);
    });
    if (ballFx) drawBall(ballFx.x / 100 * canvas.width, ballFx.y / 100 * canvas.height);
    if (sportId === 'boxing') drawBoxingHud();
  }

  function drawShape(s) {
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = 3;
    const sx = s.x1 / 100 * canvas.width, sy = s.y1 / 100 * canvas.height;
    const ex = s.x2 / 100 * canvas.width, ey = s.y2 / 100 * canvas.height;
    ctx.beginPath();
    if (s.type === 'free') {
      s.pts.forEach((p, i) => { const px = p.x / 100 * canvas.width, py = p.y / 100 * canvas.height; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
    } else if (s.type === 'line' || s.type === 'arrow' || s.type === 'pass' || s.type === 'run') {
      if (s.type === 'run' || s.type === 'pass') ctx.setLineDash([8, 6]);
      ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      if (s.type !== 'line') arrowHead(sx, sy, ex, ey, s.color);
    } else if (s.type === 'circle') {
      const r = Math.hypot(ex - sx, ey - sy); ctx.arc(sx, sy, r, 0, 7); ctx.stroke();
    } else if (s.type === 'rect') {
      ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    }
  }
  function arrowHead(sx, sy, ex, ey, c) {
    const a = Math.atan2(ey - sy, ex - sx);
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 12 * Math.cos(a - 0.4), ey - 12 * Math.sin(a - 0.4));
    ctx.lineTo(ex - 12 * Math.cos(a + 0.4), ey - 12 * Math.sin(a + 0.4));
    ctx.closePath(); ctx.fill();
  }

  function hitObject(p, kinds) {
    return frame().objects.slice().reverse().find(o =>
      (!kinds || kinds.includes(o.kind)) && dist(o, p) < 4);
  }

  // Ball magnet: snap ball to selected player when close
  function applyMagnet() {
    const s = selected(), b = ball();
    if (s && b && dist(s, b) < 8) { b.x = s.x; b.y = s.y - 3; }
  }

  function classifyAim(p) {
    const gk = goalkeeper();
    const mate = frame().objects.find(o => o.kind === 'player' && o.id !== selectedId && dist(o, p) < 7);
    const nearGoal = p.y < 22 || p.y > 78;
    if (mate) return { mode: 'pass', target: { x: mate.x, y: mate.y }, mate };
    if (gk && dist(gk, p) < 10) return { mode: 'save', target: { x: gk.x, y: gk.y } };
    return { mode: 'shot', target: p, nearGoal };
  }

  function shoot(p) {
    const s = selected(); const b = ball();
    if (!s) { UI.toast('Select a player first (Select tool)', 'error'); return; }
    const info = classifyAim(p);
    const from = { x: b.x, y: b.y }, to = info.target;
    Sfx.whoosh();
    let t = 0;
    const anim = setInterval(() => {
      t += 0.08;
      ballFx = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      draw();
      if (t >= 1) {
        clearInterval(anim); ballFx = null;
        b.x = to.x; b.y = to.y;
        if (info.mode === 'pass') { selectedId = info.mate.id; UI.toast('Pass completed ?', 'success'); }
        else if (info.mode === 'save') { UI.toast('Saved by the keeper!', 'error'); }
        else { UI.toast('Shot on goal!', 'success'); }
        draw();
      }
    }, 30);
  }

  function start(e) {
    e.preventDefault();
    const p = toPct(e);
    if (tool === 'select') {
      const o = hitObject(p, ['player', 'gk', 'boxer']);
      if (o) selectedId = o.id;
      drag = hitObject(p);
      draw(); return;
    }
    if (tool === 'shoot') { shoot(p); return; }
    if (tool === 'player') {
      frame().objects.push({ id: 't' + Date.now(), kind: 'player', team: 'atk', label: '+', x: p.x, y: p.y });
      draw(); return;
    }
    if (tool === 'erase') {
      const o = hitObject(p); if (o && o.kind !== 'ball') { frame().objects = frame().objects.filter(x => x !== o); draw(); } return;
    }
    if (tool === 'free') { drawing = { type: 'free', color, pts: [p] }; return; }
    drawing = { type: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  }
  function move(e) {
    const p = toPct(e);
    if (tool === 'shoot' && selected()) {
      const info = classifyAim(p);
      aim = { x: p.x, y: p.y, mode: info.mode };
      draw(); return;
    }
    if (!drag && !drawing) return;
    e.preventDefault();
    if (drag) {
      if (drag.kind === 'boxer') {
        const dx = p.x - drag.x, dy = p.y - drag.y;
        if (drag.glL) { drag.glL.x += dx; drag.glL.y += dy; }
        if (drag.glR) { drag.glR.x += dx; drag.glR.y += dy; }
      }
      drag.x = p.x; drag.y = p.y; applyMagnet(); draw(); return;
    }
    if (drawing.type === 'free') drawing.pts.push(p); else { drawing.x2 = p.x; drawing.y2 = p.y; }
    draw();
  }
  function end() {
    if (drawing) { frame().shapes.push(drawing); drawing = null; draw(); }
    if (drag) { boxSuppressClick = (drag.kind === 'boxer'); applyMagnet(); drag = null; draw(); }
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  function renderTimeline() {
    const tl = mount.querySelector('#timeline');
    tl.innerHTML = current.frames.map((f, i) => `<span class="frame-chip ${i === frameIdx ? 'active' : ''}" data-frame="${i}">${T('tactics.frame')} ${i + 1}</span>`).join('') +
      (current.frames.length > 1 ? `<button class="btn sm danger" id="delFrame">${T('tactics.deleteFrame')}</button>` : '');
    tl.querySelectorAll('[data-frame]').forEach(c => c.onclick = () => { frameIdx = +c.dataset.frame; draw(); renderTimeline(); });
    const df = tl.querySelector('#delFrame');
    if (df) df.onclick = () => { current.frames.splice(frameIdx, 1); frameIdx = 0; draw(); renderTimeline(); };
  }

  // Animation — whistle resets & replays on every start
  function playAnimation() {
    if (animTimer) { clearInterval(animTimer); animTimer = null; return; }
    Sfx.whistle();
    let i = 0;
    animTimer = setInterval(() => {
      const a = current.frames[i], b = current.frames[(i + 1) % current.frames.length];
      let t = 0;
      const step = setInterval(() => {
        t += 0.1;
        drawCourt();
        a.shapes.forEach(drawShape);
        a.objects.forEach(o => {
          const bo = b.objects.find(x => x.id === o.id) || o;
          const x = (o.x + (bo.x - o.x) * t) / 100 * canvas.width;
          const y = (o.y + (bo.y - o.y) * t) / 100 * canvas.height;
          if (o.kind === 'ball') drawBall(x, y); else if (o.kind === 'boxer') drawBoxer(o, x, y); else drawPlayer(o, x, y);
        });
        if (t >= 1) { clearInterval(step); i = (i + 1) % current.frames.length; if (i === 0) { clearInterval(animTimer); animTimer = null; frameIdx = 0; draw(); } }
      }, 40);
    }, 1200);
  }

  // Video recording (WebM / MP4)
  function pickMime() {
    const opts = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return opts.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }
  function startRecording() {
    if (!window.MediaRecorder || !canvas.captureStream) { UI.toast('Recording not supported here', 'error'); return; }
    const stream = canvas.captureStream(30);
    const mime = pickMime();
    recChunks = [];
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType || 'video/webm';
      const blob = new Blob(recChunks, { type });
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = (current.name || 'tactic') + '.' + ext; a.click();
      UI.toast('Recording exported (.' + ext + ')', 'success');
    };
    rec.start();
    recStart = Date.now();
    mount.querySelector('#recDot').classList.remove('hidden');
    mount.querySelector('#recBtn').disabled = true;
    mount.querySelector('#recStop').disabled = false;
    recTimer = setInterval(() => {
      const s = Math.floor((Date.now() - recStart) / 1000);
      mount.querySelector('#recTime').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 500);
    playAnimation();
  }
  function stopRecording() {
    if (rec && rec.state !== 'inactive') rec.stop();
    clearInterval(recTimer);
    const dot = mount.querySelector('#recDot'); if (dot) dot.classList.add('hidden');
    const rb = mount.querySelector('#recBtn'); if (rb) rb.disabled = false;
    const rs = mount.querySelector('#recStop'); if (rs) rs.disabled = true;
  }

  mount.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => {
    tool = b.dataset.tool; aim = null;
    mount.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('active', x === b));
    draw();
  });
  mount.querySelectorAll('[data-sport]').forEach(b => b.onclick = () => {
    sportId = b.dataset.sport;
    if (window.App && App.setSport) App.setSport(sportId, true);
    current = { id: null, name: mount.querySelector('#playName').value.trim() || 'New Play', sport: sportId, frames: [defaultFrame()] };
    frameIdx = 0; selectedId = null; aim = null;
    mount.querySelectorAll('[data-sport]').forEach(x => x.classList.toggle('active', x === b));
    setupBoxingMode();
    draw(); renderTimeline();
  });
  mount.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { color = b.dataset.color; });
  mount.querySelector('#addFrame').onclick = () => { current.frames.push(defaultFrame()); frameIdx = current.frames.length - 1; draw(); renderTimeline(); };
  mount.querySelector('#dupFrame').onclick = () => { current.frames.splice(frameIdx + 1, 0, JSON.parse(JSON.stringify(frame()))); frameIdx++; draw(); renderTimeline(); };
  mount.querySelector('#playAnim').onclick = playAnimation;
  mount.querySelector('#clearShapes').onclick = () => { frame().shapes = []; draw(); };
  mount.querySelector('#recBtn').onclick = startRecording;
  mount.querySelector('#recStop').onclick = stopRecording;
  mount.querySelector('#savePlay').onclick = async () => {
    current.name = mount.querySelector('#playName').value.trim() || 'Untitled Play';
    current.sport = sportId;
    const saved = await Store.save('tactics', current); current.id = saved.id;
    UI.toast(T('tactics.saved'), 'success');
  };
  mount.querySelector('#exportPlay').onclick = () => {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (current.name || 'tactic') + '.json'; a.click();
  };

  // ---- Boxing control bindings ----
  function boxAction(code) {
    const [who, act] = code.split(':');
    const id = who === 'A' ? 'boxerA' : 'boxerB';
    if (act === 'D') boxDefend(id); else boxPunch(id, act);
  }
  mount.querySelectorAll('[data-box]').forEach(b => b.onclick = () => boxAction(b.dataset.box));

  function onBoxKey(e) {
    if (sportId !== 'boxing') return;
    if (e.target.matches('input,textarea,select')) return;
    const map = { a: 'A:L', d: 'A:R', s: 'A:D', j: 'B:L', l: 'B:R', k: 'B:D' };
    const code = map[e.key.toLowerCase()];
    if (code) { e.preventDefault(); boxAction(code); }
  }
  document.addEventListener('keydown', onBoxKey);

  // Click a glove to punch, click a boxer body to raise guard (mouse boxing)
  function onBoxClick(e) {
    if (sportId !== 'boxing') return;
    if (boxSuppressClick) { boxSuppressClick = false; return; }
    const p = toPct(e);
    for (const o of frame().objects) {
      if (o.kind !== 'boxer') continue;
      for (const hand of ['glL', 'glR']) {
        const g = o[hand]; if (!g) continue;
        if (Math.hypot(g.x - p.x, g.y - p.y) < 5) { boxPunch(o.id, hand === 'glL' ? 'L' : 'R'); return; }
      }
      if (Math.hypot(o.x - p.x, o.y - p.y) < 8) { boxDefend(o.id); return; }
    }
  }
  canvas.addEventListener('click', onBoxClick);

  setupBoxingMode();
  draw(); renderTimeline();
  return () => {
    if (animTimer) clearInterval(animTimer); Sfx.stopAll(); stopRecording();
    document.removeEventListener('keydown', onBoxKey);
  };
};
