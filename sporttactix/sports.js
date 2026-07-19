/* sports.js — sport category definitions: courts, formations & colors.
   Each sport provides:
     id, name {en, da}, icon (inline SVG string),
     court(ctx, W, H) — draws the playing surface,
     formation() — returns the default objects for a frame. */
const SPORTS = (() => {
  // ---- helpers ----
  function bg(ctx, W, H, c1, c2) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function frame(ctx, W, H) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, W - 16, H - 16);
  }
  function midline(ctx, W, H) {
    ctx.beginPath(); ctx.moveTo(8, H / 2); ctx.lineTo(W - 8, H / 2); ctx.stroke();
  }
  function centerCircle(ctx, W, H, r) {
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, 7); ctx.stroke();
  }
  function team(objs, list, tkey, prefix) {
    list.forEach((c, i) => objs.push({ id: prefix + i, kind: 'player', team: tkey, label: i + 1, x: c[0], y: c[1] }));
  }

  // ---- individual court renderers ----
  const courts = {
    handball(ctx, W, H) {
      bg(ctx, W, H, '#0d5c2b', '#127a37'); frame(ctx, W, H); midline(ctx, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      for (const yBase of [8, H - 8]) {
        const dir = yBase === 8 ? 1 : -1;
        ctx.beginPath();
        ctx.arc(W / 2, yBase, 120, dir === 1 ? 0 : Math.PI, dir === 1 ? Math.PI : Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd400';
        ctx.fillRect(W / 2 - 35, yBase === 8 ? 4 : H - 12, 70, 8);
      }
    },
    soccer(ctx, W, H) {
      bg(ctx, W, H, '#0d5c2b', '#159a45'); frame(ctx, W, H); midline(ctx, W, H); centerCircle(ctx, W, H, 60);
      ctx.strokeRect(W / 2 - 70, 8, 140, 46);
      ctx.strokeRect(W / 2 - 70, H - 54, 140, 46);
      ctx.fillStyle = '#ffd400';
      ctx.fillRect(W / 2 - 30, 4, 60, 6); ctx.fillRect(W / 2 - 30, H - 10, 60, 6);
    },
    basketball(ctx, W, H) {
      bg(ctx, W, H, '#a5642e', '#c17a3a'); frame(ctx, W, H); midline(ctx, W, H); centerCircle(ctx, W, H, 50);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      for (const yBase of [8, H - 8]) {
        const dir = yBase === 8 ? 1 : -1;
        ctx.beginPath(); ctx.arc(W / 2, yBase, 150, dir === 1 ? 0.4 : Math.PI + 0.4, dir === 1 ? Math.PI - 0.4 : Math.PI * 2 - 0.4); ctx.stroke();
        ctx.strokeRect(W / 2 - 40, yBase === 8 ? 8 : H - 108, 80, 100);
      }
    },
    boxing(ctx, W, H) {
      bg(ctx, W, H, '#123', '#1a2540');
      ctx.fillStyle = '#2b3a5c'; ctx.fillRect(20, 20, W - 40, H - 40);
      ctx.strokeStyle = '#e11'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const o = 20 + i * 8; ctx.strokeRect(o, o, W - 2 * o, H - 2 * o); }
      ctx.fillStyle = '#c9d3ee';
      for (const [x, y] of [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]]) { ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); }
    },
    volleyball(ctx, W, H) {
      bg(ctx, W, H, '#b5651d', '#d2792b'); frame(ctx, W, H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; midline(ctx, W, H); ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(8, H / 2 - 60); ctx.lineTo(W - 8, H / 2 - 60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, H / 2 + 60); ctx.lineTo(W - 8, H / 2 + 60); ctx.stroke();
      ctx.setLineDash([]);
    },
    baseball(ctx, W, H) {
      bg(ctx, W, H, '#0d5c2b', '#127a37');
      ctx.fillStyle = '#b5651d';
      ctx.beginPath(); ctx.moveTo(W / 2, H - 40); ctx.lineTo(W - 60, H / 2); ctx.lineTo(W / 2, 60); ctx.lineTo(60, H / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H - 40, 90, Math.PI, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (const [x, y] of [[W / 2, H - 40], [W - 60, H / 2], [W / 2, 60], [60, H / 2]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-7, -7, 14, 14); ctx.restore(); }
    },
    rugby(ctx, W, H) {
      bg(ctx, W, H, '#0d5c2b', '#159a45'); frame(ctx, W, H); midline(ctx, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      for (const y of [40, H - 40]) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke(); }
      ctx.setLineDash([6, 6]);
      for (const y of [H / 2 - 60, H / 2 + 60]) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd400'; ctx.fillRect(W / 2 - 4, 8, 8, 20); ctx.fillRect(W / 2 - 4, H - 28, 8, 20);
    },
    football(ctx, W, H) { // American football
      bg(ctx, W, H, '#0d5c2b', '#127a37'); frame(ctx, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      for (let i = 1; i < 10; i++) { const y = 8 + (H - 16) * i / 10; ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,106,0,.25)';
      ctx.fillRect(8, 8, W - 16, 40); ctx.fillRect(8, H - 48, W - 16, 40);
    },
    badminton(ctx, W, H) {
      bg(ctx, W, H, '#0a5c66', '#0c7580'); frame(ctx, W, H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; midline(ctx, W, H); ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 8, W - 60, H - 16);
      ctx.beginPath(); ctx.moveTo(W / 2, 8); ctx.lineTo(W / 2, H - 8); ctx.stroke();
      for (const y of [H / 2 - 40, H / 2 + 40]) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 30, y); ctx.stroke(); }
    }
  };

  // ---- default formations ----
  function withBallGk(objs, ballY) {
    objs.push({ id: 'gk', kind: 'gk', team: 'def', label: 'GK', x: 50, y: 12 });
    objs.push({ id: 'ball', kind: 'ball', x: 50, y: ballY });
    return objs;
  }
  const formations = {
    handball() {
      const o = [];
      team(o, [[50, 88], [22, 70], [38, 60], [50, 55], [62, 60], [78, 70], [50, 74]], 'atk', 'a');
      team(o, [[35, 30], [50, 28], [65, 30], [28, 42], [50, 40], [72, 42]], 'def', 'd');
      return withBallGk(o, 84);
    },
    soccer() {
      const o = [];
      team(o, [[50, 90], [25, 78], [42, 72], [58, 72], [75, 78], [35, 60], [65, 60], [50, 55], [30, 45], [70, 45], [50, 38]], 'atk', 'a');
      team(o, [[50, 25], [30, 20], [70, 20], [42, 32], [58, 32]], 'def', 'd');
      return withBallGk(o, 82);
    },
    basketball() {
      const o = [];
      team(o, [[50, 82], [28, 70], [72, 70], [38, 55], [62, 55]], 'atk', 'a');
      team(o, [[50, 30], [35, 40], [65, 40], [42, 22], [58, 22]], 'def', 'd');
      return withBallGk(o, 78);
    },
    boxing() {
      // Two boxers viewed from top: each has a body plus two gloves and guard pads.
      return [
        { id: 'boxerA', kind: 'boxer', team: 'atk', label: 'A', x: 50, y: 70, facing: -1,
          glL: { x: 44, y: 60 }, glR: { x: 56, y: 60 }, guard: 100, stamina: 100 },
        { id: 'boxerB', kind: 'boxer', team: 'def', label: 'B', x: 50, y: 30, facing: 1,
          glL: { x: 56, y: 40 }, glR: { x: 44, y: 40 }, guard: 100, stamina: 100 }
      ];
    },
    volleyball() {
      const o = [];
      team(o, [[30, 78], [50, 88], [70, 78], [30, 60], [50, 58], [70, 60]], 'atk', 'a');
      team(o, [[30, 22], [50, 12], [70, 22], [30, 40], [50, 42], [70, 40]], 'def', 'd');
      o.push({ id: 'ball', kind: 'ball', x: 50, y: 50 });
      return o;
    },
    baseball() {
      const o = [];
      team(o, [[50, 60], [50, 82], [70, 58], [30, 58], [30, 38], [70, 38], [50, 32], [40, 45], [60, 45]], 'def', 'd');
      o.push({ id: 'a0', kind: 'player', team: 'atk', label: 'B', x: 50, y: 80 });
      o.push({ id: 'ball', kind: 'ball', x: 50, y: 60 });
      return o;
    },
    rugby() {
      const o = [];
      team(o, [[50, 85], [35, 78], [65, 78], [20, 70], [80, 70], [40, 65], [60, 65], [50, 60]], 'atk', 'a');
      team(o, [[50, 40], [35, 35], [65, 35], [25, 45], [75, 45], [50, 48]], 'def', 'd');
      o.push({ id: 'ball', kind: 'ball', x: 50, y: 83 });
      return o;
    },
    football() {
      const o = [];
      team(o, [[50, 78], [30, 72], [40, 72], [60, 72], [70, 72], [50, 68], [50, 85]], 'atk', 'a');
      team(o, [[30, 55], [40, 55], [50, 55], [60, 55], [70, 55], [50, 45]], 'def', 'd');
      o.push({ id: 'ball', kind: 'ball', x: 50, y: 82 });
      return o;
    },
    badminton() {
      const o = [];
      o.push({ id: 'a0', kind: 'player', team: 'atk', label: 1, x: 50, y: 78 });
      o.push({ id: 'd0', kind: 'player', team: 'def', label: 2, x: 50, y: 22 });
      o.push({ id: 'ball', kind: 'ball', x: 50, y: 50 });
      return o;
    }
  };

  const icon = p => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  const LIST = [
    { id: 'handball', name: { en: 'Handball', da: 'Håndbold' }, icon: icon('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/>') },
    { id: 'soccer', name: { en: 'Soccer', da: 'Fodbold' }, icon: icon('<circle cx="12" cy="12" r="9"/><path d="m12 7 3 2-1 3.5h-4L9 9z"/>') },
    { id: 'basketball', name: { en: 'Basketball', da: 'Basketball' }, icon: icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5 5c4 3 4 11 0 14M19 5c-4 3-4 11 0 14"/>') },
    { id: 'boxing', name: { en: 'Boxing', da: 'Boksning' }, icon: icon('<path d="M7 11V7a3 3 0 0 1 6 0v3"/><path d="M13 8h3a3 3 0 0 1 3 3v3a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4v-3a2 2 0 0 1 4 0"/>') },
    { id: 'volleyball', name: { en: 'Volleyball', da: 'Volleyball' }, icon: icon('<circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 0 0 0 18M3.5 8A15 15 0 0 0 20 15M20.5 8A15 15 0 0 1 4 15"/>') },
    { id: 'baseball', name: { en: 'Baseball', da: 'Baseball' }, icon: icon('<circle cx="12" cy="12" r="9"/><path d="M6 5c3 3 3 11 0 14M18 5c-3 3-3 11 0 14"/>') },
    { id: 'rugby', name: { en: 'Rugby', da: 'Rugby' }, icon: icon('<ellipse cx="12" cy="12" rx="9" ry="6"/><path d="M8 12h8M12 9v6"/>') },
    { id: 'football', name: { en: 'American Football', da: 'Amerikansk Fodbold' }, icon: icon('<ellipse cx="12" cy="12" rx="9" ry="6"/><path d="M7 12h10M10 10v4M14 10v4"/>') },
    { id: 'badminton', name: { en: 'Badminton', da: 'Badminton' }, icon: icon('<path d="M4 20l7-7"/><circle cx="15" cy="9" r="5"/><path d="M15 4v10M10 9h10"/>') }
  ];

  LIST.forEach(s => { s.court = courts[s.id]; s.formation = formations[s.id]; });

  function get(id) { return LIST.find(s => s.id === id) || LIST[0]; }
  function name(id, lang) { const s = get(id); return (s.name && s.name[lang]) || s.name.en; }
  return { LIST, get, name };
})();
if (typeof window !== 'undefined') window.SPORTS = SPORTS;
