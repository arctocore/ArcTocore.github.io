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
  let history = [];        // undo stack (JSON snapshots of current)
  let future = [];         // redo stack
  let autoRec = null;      // auto-frame recording state
  let recTimer = null;
  let physTimer = null;    // cue-sports physics loop
  let dartTurn = 0;        // round-robin dart index
  let cueCharge = null;    // cue press-and-hold state {x,y,t}
  let chargeTimer = null;  // redraw loop while charging the cue

  // ---------- Sound (single instance: reset & replay, never overlap) ----------
  const Sfx = (() => {
    let actx = null, activeNodes = [];
    function ac() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; }
    function stopAll() { activeNodes.forEach(n => { try { n.stop(); } catch (e) {} }); activeNodes = []; }
    function whistle() {
      if (window.SoundOn === false) return;
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
      if (window.SoundOn === false) return;
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
      if (window.SoundOn === false) return;
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
    const boxPanel = mount.querySelector('#boxingTools');
    const normalPanel = mount.querySelector('#normalTools');
    if (!boxPanel) return;
    if (sportId === 'boxing') {
      boxPanel.classList.remove('hidden');
      if (normalPanel) normalPanel.classList.add('hidden');
      resetBoxing();
    } else {
      boxPanel.classList.add('hidden');
      if (normalPanel) normalPanel.classList.remove('hidden');
    }
  }
  // Config for the launchable game bots (shown in the tool panel per sport).
  const BOTS = {
    chess: { sym: '\u265F', name: () => T('chess.playBot'), key: 'chessLevel', open: l => window.ChessBot && ChessBot.open(l) },
    bridge: { sym: '\u2663', name: () => T('bridge.playBot'), key: 'bridgeLevel', open: l => window.BridgeBot && BridgeBot.open(l) },
    poker: { sym: '\u2660', name: () => T('poker.playBot'), key: 'pokerLevel', open: l => window.PokerBot && PokerBot.open(l) },
    backgammon: { sym: '\u26C0', name: () => T('bg.playBot'), key: 'bgLevel', open: l => window.BackgammonBot && BackgammonBot.open(l) }
  };
  // Show + configure the game-bot launcher for chess/bridge/poker/backgammon.
  function setupBotMode() {
    const panel = mount.querySelector('#botTools');
    if (!panel) return;
    const cfg = BOTS[sportId];
    panel.classList.toggle('hidden', !cfg);
    if (!cfg) return;
    const btn = panel.querySelector('#playGameBot');
    const slider = panel.querySelector('#botLevelSlider');
    const lbl = panel.querySelector('#botLevelLbl');
    const saved = Math.max(1, Math.min(100, +(localStorage.getItem(cfg.key) || 20)));
    slider.value = saved; lbl.textContent = saved;
    btn.innerHTML = cfg.sym + ' ' + cfg.name();
    slider.oninput = () => { lbl.textContent = slider.value; try { localStorage.setItem(cfg.key, slider.value); } catch (e) { } };
    btn.onclick = () => { if (!cfg.open(+slider.value)) UI.toast(T('chess.unavailable'), 'error'); };
  }

  mount.innerHTML = `
    <div class="page-head">
      <div><h1>${T('tactics.title')}</h1><p>${T('tactics.subtitle')}</p></div>
      <div class="row" style="flex:0">
        <input id="playName" value="${UI.esc(current.name)}" style="width:150px">
        <button class="btn sm" id="undoBtn" title="${T('tactics.undo')}">↶ ${T('tactics.undo')}</button>
        <button class="btn sm" id="redoBtn" title="${T('tactics.redo')}">↷ ${T('tactics.redo')}</button>
        <button class="btn" id="savePlay">${T('tactics.save')}</button>
        <button class="btn" id="fullscreenBtn">⛶ ${T('tactics.fullscreen')}</button>
      </div>
    </div>
    <div class="board-wrap" id="boardWrap">
      <div class="tool-panel card">
        <h3>${T('tactics.sport')}</h3>
        <div class="tool-group sport-group" id="sports">
          ${SPORTS.LIST.map(s => `<div class="tool-btn sport-btn ${s.id === sportId ? 'active' : ''}" data-sport="${s.id}" title="${SPORTS.name(s.id, I18N.getLang())}">${s.icon}</div>`).join('')}
        </div>
        <div id="normalTools">
          <h3 style="margin-top:12px">${T('tactics.tools')}</h3>
          <div class="tool-group" id="tools"></div>
          <p class="hint" id="toolHint">${T('tactics.hint')}</p>
          <h3 style="margin-top:12px">${T('tactics.color')}</h3>
          <div class="tool-group">
            ${['#ffd400', '#ff3b30', '#34c759', '#0a84ff', '#ffffff', '#0b1220'].map(c => `<div class="tool-btn" data-color="${c}" style="background:${c};min-width:30px;height:30px"></div>`).join('')}
          </div>
          <button class="btn sm danger" id="clearShapes" style="margin-top:8px">${T('tactics.eraseTools')}</button>
        </div>
        <div id="boxingTools" class="boxing-panel hidden">
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
        <div id="botTools" class="chess-panel hidden">
          <h3 style="margin-top:12px">${T('chess.botTitle')}</h3>
          <p class="hint">${T('chess.botHint')}</p>
          <button class="btn primary" id="playGameBot" style="width:100%">♟</button>
          <label class="chess-level-row"><span>${T('chess.level')}</span> <b id="botLevelLbl">20</b></label>
          <input type="range" id="botLevelSlider" min="1" max="100" value="20">
        </div>
        <h3 style="margin-top:12px">${T('tactics.frames')}</h3>
        <div class="tool-group">
          <button class="btn sm" id="playAnim">▶ ${T('tactics.play')}</button>
          <button class="btn sm primary" id="recFramesBtn">● ${T('tactics.recFrames')}</button>
        </div>
        <div><span id="recDot" class="rec-dot hidden">REC <span id="recTime">0:00</span> · <span id="frameCount">0</span> ${T('tactics.framesCaptured')}</span></div>
        <h3 style="margin-top:12px">${T('play.formations')}</h3>
        <select id="formationSel"></select>
        <h3 style="margin-top:10px">${T('play.systems')} <span class="tag" id="playCount">0</span></h3>
        <input id="playSearch" class="play-search" placeholder="${T('play.search')}">
        <div class="play-list" id="playList"></div>
      </div>
      <div class="board-stage">
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

  // ---- Undo / Redo history ----
  function snapshot() { return JSON.stringify({ frames: current.frames, frameIdx }); }
  function pushHistory() {
    history.push(snapshot());
    if (history.length > 60) history.shift();
    future = [];
    updateUndoButtons();
  }
  function restore(json) {
    const s = JSON.parse(json);
    current.frames = s.frames;
    frameIdx = Math.min(s.frameIdx, current.frames.length - 1);
    draw(); renderTimeline();
  }
  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    updateUndoButtons();
  }
  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    updateUndoButtons();
  }
  function updateUndoButtons() {
    const u = mount.querySelector('#undoBtn'), r = mount.querySelector('#redoBtn');
    if (u) u.disabled = !history.length;
    if (r) r.disabled = !future.length;
  }

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
  // Glossy coloured ball for snooker / pool (numbered for pool).
  function drawCue(o, x, y) {
    const r = 12;
    if (o.id === selectedId) { ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    ctx.fillStyle = o.color || '#f4f4ef'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.34, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill();
    if (o.label) {
      ctx.beginPath(); ctx.arc(x, y, r * 0.58, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.label, x, y);
    }
  }
  // A thrown dart resting in the board.
  function drawDart(o, x, y) {
    if (o.id === selectedId) { ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.strokeStyle = 'rgba(230,230,235,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 15, y - 15); ctx.stroke();
    ctx.fillStyle = o.color || '#c81026';
    ctx.beginPath(); ctx.moveTo(x + 15, y - 15); ctx.lineTo(x + 24, y - 13); ctx.lineTo(x + 13, y - 24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fillStyle = '#e5e7eb'; ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Chess piece: silhouette glyph coloured by side with a contrasting outline.
  function drawPiece(o, x, y) {
    const glyphs = { K: '\u265A', Q: '\u265B', R: '\u265C', B: '\u265D', N: '\u265E', P: '\u265F' };
    const g = glyphs[o.piece] || glyphs.P;
    const white = o.team === 'atk';
    if (o.id === selectedId) {
      ctx.beginPath(); ctx.arc(x, y, 20, 0, 7);
      ctx.fillStyle = 'rgba(255,212,0,.28)'; ctx.fill();
      ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    const size = Math.max(22, Math.min(canvas.width, canvas.height) / 8 * 0.72);
    ctx.font = size + 'px "Segoe UI Symbol","Noto Sans Symbols2",serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = white ? '#15223a' : '#f4f4f0';
    ctx.strokeText(g, x, y);
    ctx.fillStyle = white ? '#f7f7f2' : '#151515';
    ctx.fillText(g, x, y);
  }
  // Bridge playing card: white rounded rectangle with rank + suit.
  function drawCard(o, x, y) {
    const w = 22, h = 30;
    if (o.id === selectedId) {
      ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5;
      ctx.strokeRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8);
    }
    ctx.fillStyle = '#fbfbf6'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    const red = o.suit === '\u2665' || o.suit === '\u2666';
    ctx.fillStyle = red ? '#c81026' : '#141414';
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((o.label || '') + (o.suit || ''), x, y);
  }
  // Backgammon checker: a glossy disc coloured by side.
  function drawChecker(o, x, y) {
    const r = 13;
    if (o.id === selectedId) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    ctx.fillStyle = o.team === 'atk' ? '#f4f1e8' : '#222';
    ctx.fill(); ctx.strokeStyle = o.team === 'atk' ? '#b9b09a' : '#000'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.strokeStyle = o.team === 'atk' ? '#d8d2c2' : '#3a3a3a'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
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

    if (aim && (aim.from || selected())) {
      const s = aim.from || selected();
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
      else if (o.kind === 'cue') drawCue(o, x, y);
      else if (o.kind === 'dart') drawDart(o, x, y);
      else if (o.kind === 'piece') drawPiece(o, x, y);
      else if (o.kind === 'card') drawCard(o, x, y);
      else if (o.kind === 'checker') drawChecker(o, x, y);
      else drawPlayer(o, x, y);
    });
    if (ballFx) drawBall(ballFx.x / 100 * canvas.width, ballFx.y / 100 * canvas.height);
    // Cue power ring while charging a shot (green → yellow → red as it fills).
    if (cueCharge) {
      const cue = cueBall();
      if (cue) {
        const charge = Math.min((Date.now() - cueCharge.t) / 1000, 1);
        const cx = cue.x / 100 * canvas.width, cy = cue.y / 100 * canvas.height;
        ctx.beginPath();
        ctx.arc(cx, cy, 17, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
        ctx.strokeStyle = charge > 0.8 ? '#ff3b30' : charge > 0.45 ? '#ffd400' : '#34c759';
        ctx.lineWidth = 4; ctx.stroke();
      }
    }
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

  // Distance from point p to the segment a→b (all in percent space).
  function distToSeg(p, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    let t = len2 ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  }
  // Topmost drawing (line/arrow/pass/run/free/circle/rect) near point p.
  function hitShape(p) {
    const tol = 3.5, shapes = frame().shapes;
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.type === 'free') {
        if (s.pts.length === 1 && dist(p, s.pts[0]) < tol) return s;
        for (let k = 1; k < s.pts.length; k++) if (distToSeg(p, s.pts[k - 1], s.pts[k]) < tol) return s;
      } else if (s.type === 'line' || s.type === 'arrow' || s.type === 'pass' || s.type === 'run') {
        if (distToSeg(p, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) < tol) return s;
      } else if (s.type === 'circle') {
        const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
        const dc = Math.hypot(p.x - s.x1, p.y - s.y1);
        if (Math.abs(dc - r) < tol || dc < tol) return s;
      } else if (s.type === 'rect') {
        const x1 = Math.min(s.x1, s.x2), x2 = Math.max(s.x1, s.x2), y1 = Math.min(s.y1, s.y2), y2 = Math.max(s.y1, s.y2);
        const inX = p.x > x1 - tol && p.x < x2 + tol, inY = p.y > y1 - tol && p.y < y2 + tol;
        if ((Math.abs(p.x - x1) < tol || Math.abs(p.x - x2) < tol) && inY) return s;
        if ((Math.abs(p.y - y1) < tol || Math.abs(p.y - y2) < tol) && inX) return s;
      }
    }
    return null;
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

  function isCueSport() { return sportId === 'snooker' || sportId === 'pool'; }
  function cueBall() { return frame().objects.find(o => o.kind === 'cue' && o.id === 'cue') || frame().objects.find(o => o.kind === 'cue'); }

  function shoot(p) {
    if (isCueSport()) { shootCue(p); return; }
    if (sportId === 'darts') { throwDart(p); return; }
    shootTeam(p);
  }

  function shootTeam(p) {
    const s = selected(); const b = ball();
    if (!s) { UI.toast(T('tactics.selectFirst'), 'error'); return; }
    const info = classifyAim(p);
    const from = { x: b.x, y: b.y }, to = info.target;
    pushHistory();
    Sfx.whoosh();
    let t = 0;
    const anim = setInterval(() => {
      t += 0.08;
      ballFx = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      draw();
      if (t >= 1) {
        clearInterval(anim); ballFx = null;
        b.x = to.x; b.y = to.y;
        if (info.mode === 'pass') { selectedId = info.mate.id; UI.toast(T('tactics.passDone'), 'success'); }
        else if (info.mode === 'save') { UI.toast(T('tactics.savedKeeper'), 'error'); }
        else { UI.toast(T('tactics.shotGoal'), 'success'); }
        draw();
        if (autoRec) captureAutoFrame();
      }
    }, 30);
  }

  // Begin charging a cue shot: the longer the press/touch, the harder the shot.
  function startCueCharge(p) {
    const cue = cueBall(); if (!cue) return;
    cueCharge = { x: p.x, y: p.y, t: Date.now() };
    aim = { x: p.x, y: p.y, mode: 'shot', from: { x: cue.x, y: cue.y } };
    if (chargeTimer) clearInterval(chargeTimer);
    chargeTimer = setInterval(draw, 40);   // animate the charge ring
    draw();
  }
  function releaseCueShot() {
    if (chargeTimer) { clearInterval(chargeTimer); chargeTimer = null; }
    const cc = cueCharge; cueCharge = null; aim = null;
    if (!cc) return;
    const charge = Math.min((Date.now() - cc.t) / 1000, 1);  // 0..1 over a 1-second hold
    shootCue({ x: cc.x, y: cc.y }, charge);
  }

  // Strike the cue ball toward the aim point. `charge` (0..1) sets the power:
  // a quick tap is soft, holding ~1s is a hard shot.
  function shootCue(p, charge) {
    const cue = cueBall();
    if (!cue) { UI.toast(T('tactics.selectFirst'), 'error'); return; }
    pushHistory();
    const W = canvas.width, H = canvas.height, R = 12, m = 34;
    const cpx = cue.x / 100 * W, cpy = cue.y / 100 * H;
    const dx = p.x / 100 * W - cpx, dy = p.y / 100 * H - cpy;
    const d = Math.hypot(dx, dy) || 1;
    const c = charge == null ? 0.55 : Math.max(0, Math.min(1, charge));
    const power = 2.5 + 27.5 * c;   // gentle tap (~2.5, low speed) → hard hold (~30)
    const balls = frame().objects.filter(o => o.kind === 'cue')
      .map(o => ({ o, x: o.x / 100 * W, y: o.y / 100 * H, vx: 0, vy: 0, potted: false }));
    const shooter = balls.find(bb => bb.o === cue);
    shooter.vx = dx / d * power; shooter.vy = dy / d * power;
    Sfx.whoosh();
    runPhysics(balls, {
      left: m + R, right: W - m - R, top: m + R, bottom: H - m - R, R, W, H,
      pockets: [[m, m], [W - m, m], [m, H - m], [W - m, H - m], [m, H / 2], [W - m, H / 2]], pocketR: 19
    });
  }

  function runPhysics(balls, env) {
    if (physTimer) { clearInterval(physTimer); physTimer = null; }
    let potted = 0;
    physTimer = setInterval(() => {
      balls.forEach(b => {
        if (b.potted) return;
        b.x += b.vx; b.y += b.vy;
        if (b.x < env.left) { b.x = env.left; b.vx = -b.vx * 0.9; }
        if (b.x > env.right) { b.x = env.right; b.vx = -b.vx * 0.9; }
        if (b.y < env.top) { b.y = env.top; b.vy = -b.vy * 0.9; }
        if (b.y > env.bottom) { b.y = env.bottom; b.vy = -b.vy * 0.9; }
        b.vx *= 0.985; b.vy *= 0.985;
        if (Math.hypot(b.vx, b.vy) < 0.16) { b.vx = 0; b.vy = 0; }
      });
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], c = balls[j];
          if (a.potted || c.potted) continue;
          const dx = c.x - a.x, dy = c.y - a.y, dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < 2 * env.R) {
            const nx = dx / dist, ny = dy / dist, overlap = (2 * env.R - dist) / 2;
            a.x -= nx * overlap; a.y -= ny * overlap; c.x += nx * overlap; c.y += ny * overlap;
            const rel = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
            if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; c.vx -= rel * nx; c.vy -= rel * ny; if (Sfx.hit) Sfx.hit(); }
          }
        }
      }
      balls.forEach(b => {
        if (b.potted) return;
        for (const [pxk, pyk] of env.pockets) {
          if (Math.hypot(b.x - pxk, b.y - pyk) < env.pocketR) {
            if (b.o.id === 'cue') { b.vx *= 0.4; b.vy *= 0.4; }   // respot rather than pot the cue
            else { b.potted = true; b.vx = 0; b.vy = 0; potted++; }
            break;
          }
        }
      });
      balls.forEach(b => { b.o.x = b.x / env.W * 100; b.o.y = b.y / env.H * 100; });
      const pottedObjs = balls.filter(b => b.potted).map(b => b.o);
      if (pottedObjs.length) frame().objects = frame().objects.filter(o => !pottedObjs.includes(o));
      draw();
      if (balls.every(b => b.potted || (b.vx === 0 && b.vy === 0))) {
        clearInterval(physTimer); physTimer = null;
        draw();
        if (potted) UI.toast(T('tactics.potted') + ' × ' + potted, 'success');
        if (autoRec) captureAutoFrame();
      }
    }, 20);
  }

  // Throw a dart to the aim point (round-robin across the three darts).
  function throwDart(p) {
    const darts = frame().objects.filter(o => o.kind === 'dart');
    if (!darts.length) return;
    pushHistory();
    const dart = darts[dartTurn % darts.length]; dartTurn++;
    const from = { x: 50, y: 97 }, to = { x: p.x, y: p.y };
    Sfx.whoosh();
    let t = 0;
    const anim = setInterval(() => {
      t += 0.1;
      dart.x = from.x + (to.x - from.x) * t;
      dart.y = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * 6; // slight arc
      draw();
      if (t >= 1) {
        clearInterval(anim);
        dart.x = to.x; dart.y = to.y; draw();
        if (Sfx.hit) Sfx.hit();
        UI.toast(T('tactics.dartThrown'), 'success');
        if (autoRec) captureAutoFrame();
      }
    }, 24);
  }

  function start(e) {
    e.preventDefault();
    const p = toPct(e);
    if (tool === 'select') {
      const o = hitObject(p, ['player', 'gk', 'boxer', 'piece', 'card', 'checker']);
      if (o) selectedId = o.id;
      drag = hitObject(p);
      if (drag) pushHistory();
      draw(); return;
    }
    if (tool === 'shoot') {
      if (isCueSport()) { startCueCharge(p); return; }   // press-and-hold to set power
      shoot(p); return;
    }
    if (tool === 'player') {
      pushHistory();
      frame().objects.push({ id: 't' + Date.now(), kind: 'player', team: 'atk', label: '+', x: p.x, y: p.y });
      draw(); if (autoRec) captureAutoFrame(); return;
    }
    if (tool === 'erase') {
      const sh = hitShape(p);
      if (sh) { pushHistory(); frame().shapes = frame().shapes.filter(x => x !== sh); draw(); if (autoRec) captureAutoFrame(); return; }
      const o = hitObject(p); if (o && o.kind !== 'ball') { pushHistory(); frame().objects = frame().objects.filter(x => x !== o); draw(); if (autoRec) captureAutoFrame(); }
      return;
    }
    if (tool === 'free') { pushHistory(); drawing = { type: 'free', color, pts: [p] }; return; }
    pushHistory();
    drawing = { type: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
  }
  function move(e) {
    const p = toPct(e);
    if (tool === 'shoot') {
      if (isCueSport()) { const c = cueBall(); if (c) { aim = { x: p.x, y: p.y, mode: 'shot', from: { x: c.x, y: c.y } }; if (cueCharge) { cueCharge.x = p.x; cueCharge.y = p.y; } draw(); return; } }
      else if (sportId === 'darts') { aim = { x: p.x, y: p.y, mode: 'shot', from: { x: 50, y: 97 } }; draw(); return; }
      else if (selected()) { const info = classifyAim(p); aim = { x: p.x, y: p.y, mode: info.mode }; draw(); return; }
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
    if (cueCharge) { releaseCueShot(); return; }   // fire the charged cue shot
    if (drawing) { frame().shapes.push(drawing); drawing = null; draw(); if (autoRec) captureAutoFrame(); }
    if (drag) {
      boxSuppressClick = (drag.kind === 'boxer');
      applyMagnet(); drag = null; draw();
      if (autoRec) captureAutoFrame();
    }
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
      `<button class="btn sm" id="addFrameTl" title="${T('tactics.addFrame')}">+</button>` +
      (current.frames.length > 1 ? `<button class="btn sm danger" id="delFrame">${T('tactics.deleteFrame')}</button>` : '');
    tl.querySelectorAll('[data-frame]').forEach(c => c.onclick = () => { frameIdx = +c.dataset.frame; draw(); renderTimeline(); });
    const af = tl.querySelector('#addFrameTl');
    if (af) af.onclick = () => { pushHistory(); current.frames.splice(frameIdx + 1, 0, JSON.parse(JSON.stringify(frame()))); frameIdx++; draw(); renderTimeline(); };
    const df = tl.querySelector('#delFrame');
    if (df) df.onclick = () => { pushHistory(); current.frames.splice(frameIdx, 1); frameIdx = 0; draw(); renderTimeline(); };
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
          if (o.kind === 'ball') drawBall(x, y); else if (o.kind === 'boxer') drawBoxer(o, x, y); else if (o.kind === 'cue') drawCue(o, x, y); else if (o.kind === 'dart') drawDart(o, x, y); else if (o.kind === 'piece') drawPiece(o, x, y); else if (o.kind === 'card') drawCard(o, x, y); else if (o.kind === 'checker') drawChecker(o, x, y); else drawPlayer(o, x, y);
        });
        if (t >= 1) { clearInterval(step); i = (i + 1) % current.frames.length; if (i === 0) { clearInterval(animTimer); animTimer = null; frameIdx = 0; draw(); } }
      }, 40);
    }, 1200);
  }

  // ---- Auto-frame recording ----
  // Records a WebM video while capturing a new frame each time the user moves
  // players. Movement automatically becomes animation frames.
  function pickMime() {
    const opts = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return opts.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
  }
  function captureAutoFrame() {
    if (!autoRec) return;
    // snapshot current frame as a new frame so movement is preserved
    current.frames.splice(frameIdx + 1, 0, JSON.parse(JSON.stringify(frame())));
    frameIdx++;
    autoRec.count++;
    const fc = mount.querySelector('#frameCount'); if (fc) fc.textContent = autoRec.count;
    draw(); renderTimeline();
  }
  function startAutoRecord() {
    pushHistory();
    autoRec = { count: 0, start: Date.now(), rec: null, chunks: [] };
    // try to also capture a WebM video of the board
    if (window.MediaRecorder && canvas.captureStream) {
      try {
        const stream = canvas.captureStream(30);
        const mime = pickMime();
        const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        const chunks = [];
        autoRec.rec = r; autoRec.chunks = chunks;
        r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        r.onstop = () => {
          if (!chunks.length) return;
          const blob = new Blob(chunks, { type: r.mimeType || 'video/webm' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = (current.name || 'tactic') + '.webm'; a.click();
        };
        r.start();
      } catch (e) { /* video capture optional */ }
    }
    const dot = mount.querySelector('#recDot'); if (dot) dot.classList.remove('hidden');
    const btn = mount.querySelector('#recFramesBtn');
    if (btn) { btn.textContent = '■ ' + T('tactics.stopRec'); btn.classList.add('danger'); btn.classList.remove('primary'); }
    const fc = mount.querySelector('#frameCount'); if (fc) fc.textContent = '0';
    recTimer = setInterval(() => {
      const s = Math.floor((Date.now() - autoRec.start) / 1000);
      const rt = mount.querySelector('#recTime'); if (rt) rt.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 500);
    UI.toast(T('tactics.recording'));
  }
  function stopAutoRecord() {
    if (!autoRec) return;
    if (autoRec.rec && autoRec.rec.state !== 'inactive') { try { autoRec.rec.stop(); } catch (e) {} }
    clearInterval(recTimer);
    const n = autoRec.count; autoRec = null;
    const dot = mount.querySelector('#recDot'); if (dot) dot.classList.add('hidden');
    const btn = mount.querySelector('#recFramesBtn');
    if (btn) { btn.textContent = '● ' + T('tactics.recFrames'); btn.classList.remove('danger'); btn.classList.add('primary'); }
    UI.toast(T('tactics.recDone') + ' — ' + n + ' ' + T('tactics.framesCaptured'), 'success');
    frameIdx = 0; draw(); renderTimeline();
  }
  function toggleAutoRecord() { if (autoRec) stopAutoRecord(); else startAutoRecord(); }

  // ---- Fullscreen ----
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || null; }
  function toggleFullscreen() {
    const el = mount.querySelector('#boardWrap');
    if (!fsElement()) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || function () {}).call(document);
    }
  }
  function onFsChange() {
    const wrap = mount.querySelector('#boardWrap');
    const btn = mount.querySelector('#fullscreenBtn');
    const on = !!fsElement();
    if (wrap) wrap.classList.toggle('fs', on);
    if (btn) btn.textContent = on ? '⛶ ' + T('tactics.exitFullscreen') : '⛶ ' + T('tactics.fullscreen');
    fitCanvas();
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // Keep the canvas responsive to its container (fits width AND height so the
  // board never needs scrolling).
  function fitCanvas() {
    const stage = mount.querySelector('.board-stage');
    if (!stage) return;
    const ratio = canvas.height / canvas.width;      // ~0.8 (700x560)
    const availW = stage.clientWidth;
    if (availW <= 0) { draw(); return; }
    const rect = stage.getBoundingClientRect();
    const reserve = document.fullscreenElement ? 60 : 78; // timeline + margins
    const availH = window.innerHeight - rect.top - reserve;
    let w = availW;
    let h = w * ratio;
    if (availH > 140 && h > availH) { h = availH; w = h / ratio; }
    canvas.style.width = Math.round(w) + 'px';
    canvas.style.height = Math.round(h) + 'px';
    draw();
  }
  const roResize = () => fitCanvas();
  window.addEventListener('resize', roResize);

  // ---- Sport-specific tools ----
  const ALL_TOOLS = [
    ['select', 'Select', 'Select / move'], ['shoot', 'Shoot', 'Shoot the ball'], ['player', 'Add', 'Add player'],
    ['pass', 'Pass', 'Pass line'], ['run', 'Run', 'Run path'], ['arrow', 'Arrow', 'Arrow'], ['line', 'Line', 'Line'],
    ['free', 'Draw', 'Freehand'], ['circle', 'Circle', 'Circle'], ['rect', 'Rect', 'Rectangle'], ['erase', 'Erase', 'Erase object']
  ];
  function toolIdsFor(id) {
    if (id === 'snooker' || id === 'pool') return ['select', 'shoot', 'arrow', 'line', 'free', 'circle', 'rect', 'erase'];
    if (id === 'darts') return ['select', 'shoot', 'arrow', 'line', 'free', 'erase'];
    if (id === 'badminton') return ['select', 'shoot', 'player', 'arrow', 'line', 'free', 'circle', 'rect', 'erase'];
    if (id === 'chess' || id === 'bridge' || id === 'poker' || id === 'backgammon') return ['select', 'arrow', 'line', 'free', 'circle', 'rect', 'erase'];
    return ALL_TOOLS.map(t => t[0]); // team sports: all tools
  }
  function renderTools() {
    const cont = mount.querySelector('#tools');
    if (!cont) return;
    const allowed = toolIdsFor(sportId);
    if (!allowed.includes(tool)) { tool = 'select'; aim = null; }
    cont.innerHTML = ALL_TOOLS.filter(t => allowed.includes(t[0]))
      .map(([t, i, tip]) => `<div class="tool-btn ${t === tool ? 'active' : ''}" data-tool="${t}" title="${tip}">${i}</div>`).join('');
    cont.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => {
      tool = b.dataset.tool; aim = null; cueCharge = null;
      if (chargeTimer) { clearInterval(chargeTimer); chargeTimer = null; }
      cont.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('active', x === b));
      draw();
    });
    const hint = mount.querySelector('#toolHint');
    if (hint) hint.textContent = isCueSport() ? T('tactics.hintCue') : (sportId === 'darts' ? T('tactics.hintDarts') : T('tactics.hint'));
  }
  mount.querySelectorAll('[data-sport]').forEach(b => b.onclick = () => {
    sportId = b.dataset.sport;
    if (window.App && App.setSport) App.setSport(sportId, true);
    current = loadOrNew();
    history = []; future = []; updateUndoButtons();
    frameIdx = 0; selectedId = null; aim = null;
    mount.querySelectorAll('[data-sport]').forEach(x => x.classList.toggle('active', x === b));
    setupBoxingMode();
    setupBotMode();
    renderPlaybook();
    renderTools();
    fitCanvas(); draw(); renderTimeline();
  });
  mount.querySelectorAll('[data-color]').forEach(b => b.onclick = () => {
    color = b.dataset.color;
    mount.querySelectorAll('[data-color]').forEach(x => x.style.outline = '');
    b.style.outline = '2px solid var(--primary)';
  });
  mount.querySelector('#playAnim').onclick = playAnimation;
  mount.querySelector('#clearShapes').onclick = () => { pushHistory(); frame().shapes = []; draw(); if (autoRec) captureAutoFrame(); };
  mount.querySelector('#recFramesBtn').onclick = toggleAutoRecord;
  mount.querySelector('#undoBtn').onclick = undo;
  mount.querySelector('#redoBtn').onclick = redo;
  mount.querySelector('#fullscreenBtn').onclick = toggleFullscreen;
  mount.querySelector('#savePlay').onclick = async () => {
    current.name = mount.querySelector('#playName').value.trim() || 'Untitled Play';
    current.sport = sportId;
    const saved = await Store.save('tactics', current); current.id = saved.id;
    UI.toast(T('tactics.saved'), 'success');
  };

  // ---- Boxing control bindings ----
  function boxAction(code) {
    const [who, act] = code.split(':');
    const id = who === 'A' ? 'boxerA' : 'boxerB';
    if (act === 'D') boxDefend(id); else boxPunch(id, act);
  }
  mount.querySelectorAll('[data-box]').forEach(b => b.onclick = () => boxAction(b.dataset.box));

  function onBoxKey(e) {
    if (e.target.matches('input,textarea,select')) return;
    // Undo/redo shortcuts (all sports)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (sportId !== 'boxing') return;
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

  // ---- Playbook: formations + 30 tactical animation systems per sport ----
  let playFilter = '';
  function renderPlaybook() {
    const fsel = mount.querySelector('#formationSel');
    if (fsel) {
      const forms = (window.PLAYBOOK && PLAYBOOK.formations(sportId)) || [];
      fsel.innerHTML = `<option value="-1">${T('play.default')}</option>` +
        forms.map((f, i) => `<option value="${i}">${UI.esc(f.name)}</option>`).join('');
    }
    const list = mount.querySelector('#playList');
    const cnt = mount.querySelector('#playCount');
    if (!list) return;
    const all = (window.PLAYBOOK && PLAYBOOK.plays(sportId)) || [];
    const lang = I18N.getLang();
    const q = playFilter.trim().toLowerCase();
    const items = all.map((p, i) => ({ i, name: p[lang] || p.en })).filter(x => !q || x.name.toLowerCase().includes(q));
    if (cnt) cnt.textContent = all.length;
    list.innerHTML = items.map(x => `<button class="play-item" data-play="${x.i}">${UI.esc((x.i + 1) + '. ' + x.name)}</button>`).join('') ||
      `<p class="hint">${T('common.noData')}</p>`;
    list.querySelectorAll('[data-play]').forEach(b => b.onclick = () => loadPlay(+b.dataset.play));
  }
  function loadPlay(index) {
    if (!window.PLAYBOOK) return;
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
    pushHistory();
    current.frames = PLAYBOOK.buildPlay(frame().objects, index, sportId);
    frameIdx = 0; selectedId = null; aim = null;
    draw(); renderTimeline();
    UI.toast(T('play.loaded') + ': ' + PLAYBOOK.playName(sportId, index), 'success');
    playAnimation();
  }
  const formSel = mount.querySelector('#formationSel');
  if (formSel) formSel.onchange = () => {
    const idx = +formSel.value;
    pushHistory();
    if (idx < 0) { frame().objects = defaultFrame().objects; draw(); return; }
    PLAYBOOK.applyFormation(frame().objects, sportId, idx);
    draw();
    UI.toast(T('play.formationApplied') + ': ' + PLAYBOOK.formations(sportId)[idx].name, 'success');
  };
  const playSearch = mount.querySelector('#playSearch');
  if (playSearch) playSearch.oninput = () => { playFilter = playSearch.value; renderPlaybook(); };

  setupBoxingMode();
  setupBotMode();
  renderPlaybook();
  renderTools();
  updateUndoButtons();
  fitCanvas();
  draw(); renderTimeline();
  return () => {
    if (animTimer) clearInterval(animTimer);
    if (physTimer) clearInterval(physTimer);
    if (chargeTimer) clearInterval(chargeTimer);
    Sfx.stopAll();
    if (autoRec) { if (autoRec.rec && autoRec.rec.state !== 'inactive') { try { autoRec.rec.stop(); } catch (e) {} } clearInterval(recTimer); }
    document.removeEventListener('keydown', onBoxKey);
    document.removeEventListener('fullscreenchange', onFsChange);
    window.removeEventListener('resize', roResize);
  };
};
