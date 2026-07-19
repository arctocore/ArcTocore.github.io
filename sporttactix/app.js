/* app.js — router, global search, autosave, theme, shortcuts, bootstrap */
const App = (() => {
  let currentRoute = 'dashboard';
  let cleanup = null;
  let currentSport = 'handball';
  const ROUTES = ['dashboard', 'teams', 'matches', 'scouting', 'statistics', 'tactics', 'video', 'training', 'exercises', 'opponents', 'reports', 'settings'];

  function go(route, params) {
    if (!Views[route]) route = 'dashboard';
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    currentRoute = route;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === route));
    const view = document.getElementById('view');
    view.innerHTML = '';
    const ret = Views[route](view, params);
    if (typeof ret === 'function') cleanup = ret;
    document.getElementById('sidebar').classList.remove('open');
  }

  function render() { go(currentRoute); }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const svg = t === 'dark'
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
    const tt = document.getElementById('themeToggle'); if (tt) tt.innerHTML = svg;
    Store.setSetting('theme', t);
  }

  function setLang(l) {
    I18N.setLang(l);
    Store.setSetting('lang', l);
    document.querySelectorAll('#langSwitch button').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
    populateSportPicker();
    render();
  }

  function getSport() { return currentSport; }
  function setSport(id, silent) {
    currentSport = id;
    Store.setSetting('sport', id);
    const sel = document.getElementById('sportSelect');
    if (sel && sel.value !== id) sel.value = id;
    if (!silent) { render(); UI.toast(T('sport.changed') + ': ' + SPORTS.name(id, I18N.getLang()), 'success'); }
  }
  function populateSportPicker() {
    const sel = document.getElementById('sportSelect');
    if (!sel) return;
    const lang = I18N.getLang();
    sel.innerHTML = SPORTS.LIST.map(s => `<option value="${s.id}">${SPORTS.name(s.id, lang)}</option>`).join('');
    sel.value = currentSport;
  }

  // ---- Global search ----
  function search(q) {
    q = q.trim().toLowerCase();
    const box = document.getElementById('searchResults');
    if (!q) { box.classList.add('hidden'); return; }
    const results = [];
    const add = (cat, label, route, params) => results.push({ cat, label, route, params });
    Store.all('players').forEach(p => { if ((p.firstName + ' ' + p.lastName).toLowerCase().includes(q)) add('Player', `#${p.number} ${p.firstName} ${p.lastName}`, 'teams'); });
    Store.all('matches').forEach(m => { if (m.opponent.toLowerCase().includes(q)) add('Match', `${m.opponent} · ${UI.fmtDate(m.date)}`, 'matches'); });
    Store.all('exercises').forEach(e => { if (e.title.toLowerCase().includes(q) || (e.tags || []).join(' ').toLowerCase().includes(q)) add('Drill', e.title, 'exercises'); });
    Store.all('training').forEach(t => { if (t.title.toLowerCase().includes(q)) add('Training', t.title, 'training'); });
    Store.all('opponents').forEach(o => { if (o.name.toLowerCase().includes(q)) add('Opponent', o.name, 'opponents'); });
    Store.all('tactics').forEach(t => { if ((t.name || '').toLowerCase().includes(q)) add('Tactic', t.name, 'tactics'); });

    box.innerHTML = results.length ? results.slice(0, 12).map((r, i) =>
      `<div class="sr-item" data-i="${i}"><div class="sr-cat">${r.cat}</div>${UI.esc(r.label)}</div>`).join('')
      : '<div class="sr-item">No results</div>';
    box.classList.remove('hidden');
    box.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
      const r = results[+el.dataset.i]; box.classList.add('hidden');
      document.getElementById('globalSearch').value = ''; go(r.route, r.params);
    });
  }

  function bindChrome() {
    document.getElementById('mainNav').addEventListener('click', e => {
      const item = e.target.closest('.nav-item'); if (item) go(item.dataset.route);
    });
    document.getElementById('menuToggle').onclick = () => document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('themeToggle').onclick = () => {
      const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; setTheme(t);
    };
    const ntt = document.getElementById('navThemeToggle');
    if (ntt) ntt.onclick = () => {
      const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; setTheme(t);
    };
    const ls = document.getElementById('langSwitch');
    if (ls) ls.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLang(b.dataset.lang); });
    const sp = document.getElementById('sportSelect');
    if (sp) sp.addEventListener('change', () => setSport(sp.value));
    const gs = document.getElementById('globalSearch');
    gs.addEventListener('input', () => search(gs.value));
    document.addEventListener('click', e => { if (!e.target.closest('.search-box')) document.getElementById('searchResults').classList.add('hidden'); });

    document.addEventListener('keydown', e => {
      if (e.target.matches('input,textarea,select')) { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.key === '/') { e.preventDefault(); gs.focus(); }
      else if (e.key === 'Escape') { const h = document.getElementById('modalHost'); if (!h.classList.contains('hidden')) { h.classList.add('hidden'); h.innerHTML = ''; } }
      else if (/^[1-9]$/.test(e.key)) { const r = ROUTES[+e.key - 1]; if (r) go(r); }
    });
  }

  // ---- Autosave indicator (data persists immediately; this reflects status) ----
  function startAutosave() {
    const ind = document.getElementById('autosaveIndicator');
    Store.onChange(() => { ind.textContent = 'Saving…'; setTimeout(() => ind.textContent = 'Saved', 400); });
    setInterval(() => { ind.textContent = 'Auto-saved'; setTimeout(() => ind.textContent = 'Saved', 1500); }, 30000);
  }

  async function boot() {
    await Store.loadAll();
    await Store.seedIfEmpty();
    const theme = await Store.getSetting('theme', 'dark');
    setTheme(theme);
    const lang = await Store.getSetting('lang', 'en');
    setLang(lang);
    const role = await Store.getSetting('role', 'Coach');
    document.getElementById('roleBadge').textContent = role;
    currentSport = await Store.getSetting('sport', 'handball');
    populateSportPicker();
    bindChrome();
    startAutosave();
    go('dashboard');
  }

  return { go, render, setTheme, setLang, getSport, setSport, boot };
})();

window.addEventListener('DOMContentLoaded', App.boot);
