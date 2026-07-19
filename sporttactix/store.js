/* store.js — in-memory cache over IndexedDB + seed data + domain helpers */
const Store = (() => {
  const cache = {};
  const listeners = new Set();

  function uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  async function loadAll() {
    for (const s of DB.STORES) cache[s] = await DB.getAll(s);
  }

  function all(store) { return cache[store] || []; }
  function find(store, id) { return (cache[store] || []).find(x => x.id === id); }

  async function save(store, obj) {
    if (!obj.id) obj.id = uid(store.slice(0, 3));
    obj.updatedAt = Date.now();
    await DB.put(store, obj);
    const arr = cache[store] || (cache[store] = []);
    const idx = arr.findIndex(x => x.id === obj.id);
    if (idx >= 0) arr[idx] = obj; else arr.push(obj);
    emit();
    return obj;
  }

  async function remove(store, id) {
    await DB.remove(store, id);
    cache[store] = (cache[store] || []).filter(x => x.id !== id);
    emit();
  }

  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { listeners.forEach(fn => fn()); }

  // ---- Settings ----
  async function getSetting(key, def) {
    const s = find('settings', key);
    return s ? s.value : def;
  }
  async function setSetting(key, value) {
    await save('settings', { id: key, value });
  }

  // ---- Statistics helpers ----
  const GOAL_TYPES = ['Fast Break', 'Backcourt Shot', 'Wing Shot', 'Pivot Shot', '7m Throw', 'Breakthrough'];
  function matchEvents(matchId) { return all('events').filter(e => e.matchId === matchId); }

  function teamStats(matchId) {
    const ev = matchEvents(matchId);
    const goals = ev.filter(e => e.result === 'goal').length;
    const shots = ev.filter(e => e.category === 'attack' && (e.result === 'goal' || e.result === 'miss' || e.result === 'save')).length;
    const assists = ev.filter(e => e.type === 'Assist').length;
    const turnovers = ev.filter(e => e.category === 'turnover').length;
    const fastbreaks = ev.filter(e => e.type === 'Fast Break').length;
    const saves = ev.filter(e => e.type === 'Save' || e.type === 'Penalty Save').length;
    const suspensions = ev.filter(e => e.type === '2-minute suspension').length;
    return {
      goals, shots, assists, turnovers, fastbreaks, saves, suspensions,
      shotPct: shots ? Math.round((goals / shots) * 100) : 0
    };
  }

  function playerStats(playerId) {
    const ev = all('events').filter(e => e.playerId === playerId);
    const goals = ev.filter(e => e.result === 'goal').length;
    const attempts = ev.filter(e => e.category === 'attack').length;
    const assists = ev.filter(e => e.type === 'Assist').length;
    const turnovers = ev.filter(e => e.category === 'turnover').length;
    const saves = ev.filter(e => e.type === 'Save' || e.type === 'Penalty Save').length;
    return {
      goals, attempts, assists, turnovers, saves,
      shotPct: attempts ? Math.round((goals / attempts) * 100) : 0,
      rating: Math.min(10, (goals * 1.2 + assists * 0.8 + saves * 1.0 - turnovers * 0.7 + 5)).toFixed(1)
    };
  }

  async function seedIfEmpty() {
    if (all('clubs').length) return;
    const club = { id: uid('clu'), name: 'Metropolis HC', country: 'Germany', founded: 1974 };
    const season = { id: uid('sea'), name: '2024/2025', clubId: club.id, active: true };
    const team = { id: uid('tea'), name: 'Metropolis Men A', clubId: club.id, seasonId: season.id, division: 'Bundesliga', category: 'Senior Men' };
    await DB.bulkPut('clubs', [club]);
    await DB.bulkPut('seasons', [season]);
    await DB.bulkPut('teams', [team]);

    const positions = ['Goalkeeper', 'Left Wing', 'Left Back', 'Center Back', 'Right Back', 'Right Wing', 'Pivot'];
    const names = [
      ['Jonas', 'Keller', 'Goalkeeper', 1], ['Milan', 'Horvat', 'Goalkeeper', 12],
      ['Erik', 'Sandberg', 'Left Wing', 7], ['Tomas', 'Novak', 'Left Back', 4],
      ['Andre', 'Costa', 'Center Back', 10], ['Petar', 'Ilic', 'Right Back', 9],
      ['Leon', 'Fischer', 'Right Wing', 22], ['Marko', 'Babic', 'Pivot', 44],
      ['Nils', 'Berg', 'Left Back', 6], ['Sven', 'Ott', 'Pivot', 15],
      ['David', 'Krause', 'Right Back', 8], ['Ivan', 'Peric', 'Center Back', 11]
    ];
    const players = names.map(([f, l, pos, num]) => ({
      id: uid('ply'), teamId: team.id, firstName: f, lastName: l,
      position: pos, number: num, height: 180 + Math.floor(Math.random() * 25),
      dob: '199' + Math.floor(Math.random() * 9) + '-0' + (1 + Math.floor(Math.random() * 8)) + '-15',
      status: 'active'
    }));
    await DB.bulkPut('players', players);

    const coaches = [
      { id: uid('coa'), teamId: team.id, name: 'Heinrich Vogel', role: 'Head Coach' },
      { id: uid('coa'), teamId: team.id, name: 'Lukas Bauer', role: 'Assistant Coach' },
      { id: uid('coa'), teamId: team.id, name: 'Mia Wolf', role: 'Goalkeeper Coach' }
    ];
    await DB.bulkPut('coaches', coaches);

    const opponents = [
      { id: uid('opp'), name: 'Rhein Löwen', formation: '6-0', tendencies: 'Strong pivot play, slow transitions', keyPlayers: 'No. 10 (playmaker), No. 44 (pivot)' },
      { id: uid('opp'), name: 'Nord Sturm', formation: '5-1', tendencies: 'Fast breaks, aggressive defense', keyPlayers: 'No. 7 (left wing sprinter)' }
    ];
    await DB.bulkPut('opponents', opponents);

    const matches = [
      { id: uid('mat'), teamId: team.id, opponent: 'Rhein Löwen', date: Date.now() - 6 * 864e5, type: 'League', venue: 'City Arena', home: true, homeScore: 28, awayScore: 25, status: 'finished' },
      { id: uid('mat'), teamId: team.id, opponent: 'Nord Sturm', date: Date.now() + 3 * 864e5, type: 'League', venue: 'North Hall', home: false, homeScore: 0, awayScore: 0, status: 'scheduled' }
    ];
    await DB.bulkPut('matches', matches);

    const exercises = [
      { id: uid('exe'), title: '3v3 Continuous Attack', category: 'Attack', duration: 15, intensity: 'High', description: 'Three attackers vs three defenders, continuous rotation focusing on quick passing and creating gaps.', tags: ['passing', 'decision-making'] },
      { id: uid('exe'), title: 'Goalkeeper Reaction Wall', category: 'Goalkeeper', duration: 12, intensity: 'Medium', description: 'Rapid successive shots to improve reaction time and positioning.', tags: ['reaction', 'positioning'] },
      { id: uid('exe'), title: 'Fast Break Waves', category: 'Transition', duration: 18, intensity: 'High', description: 'Structured 1st, 2nd and 3rd wave fast break patterns.', tags: ['transition', 'conditioning'] },
      { id: uid('exe'), title: '6-0 Defensive Shifting', category: 'Defense', duration: 20, intensity: 'Medium', description: 'Block shifting and communication drills against backcourt shooters.', tags: ['defense', 'communication'] }
    ];
    await DB.bulkPut('exercises', exercises);

    const training = [
      { id: uid('trn'), teamId: team.id, title: 'Tuesday Tactical', date: Date.now() + 864e5, duration: 90, focus: 'Attack', exercises: exercises.slice(0, 2).map(e => e.id) }
    ];
    await DB.bulkPut('training', training);

    await loadAll();

    // seed some events for the finished match
    const finished = matches[0];
    const evs = [];
    for (let i = 0; i < 40; i++) {
      const p = players[2 + Math.floor(Math.random() * (players.length - 2))];
      const r = Math.random();
      const cat = r < 0.6 ? 'attack' : r < 0.8 ? 'turnover' : 'defense';
      let type, result;
      if (cat === 'attack') { type = GOAL_TYPES[Math.floor(Math.random() * GOAL_TYPES.length)]; result = Math.random() < 0.55 ? 'goal' : (Math.random() < 0.5 ? 'save' : 'miss'); }
      else if (cat === 'turnover') { type = ['Bad pass', 'Stepping', 'Technical fault'][Math.floor(Math.random() * 3)]; result = 'turnover'; }
      else { type = 'Block'; result = 'block'; }
      evs.push({ id: uid('evt'), matchId: finished.id, playerId: p.id, category: cat, type, result, minute: Math.floor(Math.random() * 60), createdAt: Date.now() });
    }
    await DB.bulkPut('events', evs);
    await loadAll();
  }

  return {
    uid, loadAll, all, find, save, remove, onChange,
    getSetting, setSetting, teamStats, playerStats, matchEvents,
    seedIfEmpty, GOAL_TYPES
  };
})();
