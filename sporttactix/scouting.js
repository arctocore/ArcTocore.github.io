/* Live Scouting view */
window.Views = window.Views || {};
Views.scouting = function (mount, params) {
  const team = Store.all('teams')[0];
  const matches = Store.all('matches');
  let matchId = (params && params.matchId) || (matches[0] && matches[0].id);
  const players = Store.all('players').filter(p => p.teamId === (team && team.id));

  const EVENTS = {
    attack: [
      { type: 'Fast Break', result: 'goal', cls: 'goal' },
      { type: 'Backcourt Shot', result: 'goal', cls: 'goal' },
      { type: 'Wing Shot', result: 'goal', cls: 'goal' },
      { type: 'Pivot Shot', result: 'goal', cls: 'goal' },
      { type: '7m Throw', result: 'goal', cls: 'goal' },
      { type: 'Breakthrough', result: 'goal', cls: 'goal' },
      { type: 'Shot Saved', result: 'save', cls: '' },
      { type: 'Shot Missed', result: 'miss', cls: '' },
      { type: 'Assist', result: 'assist', cls: '' }
    ],
    defense: [
      { type: 'Block', result: 'block', cls: '' },
      { type: 'Steal', result: 'steal', cls: '' },
      { type: 'Save', result: 'save', cls: '' },
      { type: 'Penalty Save', result: 'save', cls: '' }
    ],
    foul: [
      { type: 'Offensive foul', result: 'foul', cls: 'foul' },
      { type: 'Defensive foul', result: 'foul', cls: 'foul' },
      { type: 'Yellow card', result: 'card', cls: 'foul' },
      { type: '2-minute suspension', result: 'suspension', cls: 'foul' },
      { type: 'Red card', result: 'card', cls: 'turnover' },
      { type: 'Blue card', result: 'card', cls: 'turnover' }
    ],
    turnover: [
      { type: 'Bad pass', result: 'turnover', cls: 'turnover' },
      { type: 'Technical fault', result: 'turnover', cls: 'turnover' },
      { type: 'Stepping', result: 'turnover', cls: 'turnover' },
      { type: 'Double dribble', result: 'turnover', cls: 'turnover' }
    ]
  };

  let clock = 0, timer = null, activeCat = 'attack', selPlayer = players[0] && players[0].id;

  function render() {
    const match = Store.find('matches', matchId);
    const events = Store.matchEvents(matchId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const goals = events.filter(e => e.result === 'goal').length;
    mount.innerHTML = `
      <div class="page-head">
        <div><h1>${T('scout.title')}</h1><p>Latency-optimized event logging</p></div>
        <select id="matchSel" style="max-width:260px">${matches.map(m => `<option value="${m.id}" ${m.id === matchId ? 'selected' : ''}>${UI.esc(m.home ? T('common.vs') : T('common.at'))} ${UI.esc(m.opponent)} · ${UI.fmtDate(m.date)}</option>`).join('')}</select>
      </div>
      <div class="scoreboard">
        <div style="text-align:center"><div style="color:var(--muted);font-size:12px">${UI.esc(team ? team.name : 'Home')}</div><div class="score" id="ourScore">${goals}</div></div>
        <div style="text-align:center"><div class="clock" id="clock">${UI.fmtClock(clock)}</div><div style="margin-top:8px"><button class="btn sm primary" id="startBtn">${T('scout.start')}</button> <button class="btn sm" id="resetBtn">${T('scout.reset')}</button></div></div>
        <div style="text-align:center"><div style="color:var(--muted);font-size:12px">${UI.esc(match ? match.opponent : 'Opponent')}</div><div class="score">${match ? (match.home ? match.awayScore : match.homeScore) : 0}</div></div>
      </div>
      <div class="scout-grid">
        <div>
          <div class="pill-row">
            ${Object.keys(EVENTS).map(c => `<span class="pill ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c[0].toUpperCase() + c.slice(1)}</span>`).join('')}
          </div>
          <label class="field"><span>${T('scout.player')}</span><select id="playerSel">${players.map(p => `<option value="${p.id}" ${p.id === selPlayer ? 'selected' : ''}>#${p.number} ${UI.esc(p.lastName)}</option>`).join('')}</select></label>
          <div class="event-buttons">
            ${EVENTS[activeCat].map((e, i) => `<div class="event-btn ${e.cls}" data-ev="${i}">${UI.esc(e.type)}</div>`).join('')}
          </div>
        </div>
        <div class="card">
          <h3>${T('scout.eventLog')} <span class="tag">${events.length}</span></h3>
          <div class="event-log">
            ${events.map(e => {
              const p = Store.find('players', e.playerId);
              return `<div class="log-item"><span><span class="log-time">${UI.fmtClock((e.minute || 0) * 60)}</span> ${UI.esc(e.type)} ${e.result === 'goal' ? '&#9917;' : ''} — ${p ? '#' + p.number + ' ' + UI.esc(p.lastName) : ''}</span><button class="btn sm danger" data-rmev="${e.id}">Remove</button></div>`;
            }).join('') || `<p style="color:var(--muted)">${T('scout.noEvents')}</p>`}
          </div>
        </div>
      </div>`;

    mount.querySelector('#matchSel').onchange = e => { matchId = e.target.value; render(); };
    mount.querySelector('#playerSel').onchange = e => { selPlayer = e.target.value; };
    mount.querySelector('#startBtn').onclick = toggleClock;
    mount.querySelector('#resetBtn').onclick = () => { clock = 0; stopClock(); mount.querySelector('#clock').textContent = UI.fmtClock(0); };
    mount.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { activeCat = b.dataset.cat; render(); });
    mount.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => logEvent(EVENTS[activeCat][+b.dataset.ev]));
    mount.querySelectorAll('[data-rmev]').forEach(b => b.onclick = async () => { await Store.remove('events', b.dataset.rmev); render(); });
  }

  async function logEvent(def) {
    const evt = {
      matchId, playerId: mount.querySelector('#playerSel').value,
      category: activeCat, type: def.type, result: def.result,
      minute: Math.floor(clock / 60), createdAt: Date.now()
    };
    await Store.save('events', evt);
    if (def.result === 'goal') {
      const m = Store.find('matches', matchId);
      if (m) { if (m.home) m.homeScore++; else m.awayScore++; await Store.save('matches', m); }
    }
    UI.toast(def.type + ' logged', 'success');
    render();
  }

  function toggleClock() {
    if (timer) stopClock(); else {
      timer = setInterval(() => { clock++; const c = mount.querySelector('#clock'); if (c) c.textContent = UI.fmtClock(clock); }, 1000);
      const b = mount.querySelector('#startBtn'); if (b) { b.textContent = 'Pause'; b.classList.remove('primary'); }
    }
  }
  function stopClock() {
    clearInterval(timer); timer = null;
    const b = mount.querySelector('#startBtn'); if (b) { b.textContent = 'Start'; b.classList.add('primary'); }
  }

  render();
  return () => stopClock(); // cleanup on route change
};
