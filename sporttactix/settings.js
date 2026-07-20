/* Settings view */
window.Views = window.Views || {};
Views.settings = async function (mount) {
  const theme = document.documentElement.getAttribute('data-theme');
  const role = await Store.getSetting('role', 'Coach');
  const sport = (window.App && App.getSport && App.getSport()) || 'handball';
  const isTeamSport = !!(window.SPORTS && SPORTS.isTeam && SPORTS.isTeam(sport));
  const isPlayer = role === 'Player';
  const team = Store.all('teams')[0];
  const myPlayerId = await Store.getSetting('myPlayerId', '');
  let syncTraining = await Store.getSetting('syncTraining', {}) || {};
  let syncMsgs = await Store.getSetting('syncMsgs', {}) || {};

  mount.innerHTML = `
    <div class="page-head"><div><h1>${T('settings.title')}</h1><p>${T('settings.subtitle')}</p></div></div>
    <div class="grid cols-2">
      <div class="card">
        <h3>${T('settings.appearance')}</h3>
        <label class="field"><span>${T('settings.theme')}</span><select id="s_theme"><option value="dark" ${theme === 'dark' ? 'selected' : ''}>${T('settings.dark')}</option><option value="light" ${theme === 'light' ? 'selected' : ''}>${T('settings.light')}</option></select></label>
      </div>
      <div class="card">
        <h3>${T('settings.roleAccess')}</h3>
        <label class="field"><span>${T('settings.activeRole')}</span><select id="s_role">${['Super Admin', 'Club Admin', 'Coach', 'Analyst', 'Player'].map(r => `<option value="${r}" ${r === role ? 'selected' : ''}>${T('role.' + r)}</option>`).join('')}</select></label>
        <p style="color:var(--muted);font-size:12px">${T('settings.roleHint')}</p>
      </div>
      <div class="card">
        <h3>${T('settings.dataSync')}</h3>
        <p style="color:var(--muted);font-size:13px">${T('settings.dataHint')}</p>
        <div class="row" style="flex:0;margin-top:10px;flex-wrap:wrap">
          <button class="btn" id="exportAll">${T('settings.exportBackup')}</button>
          <label class="btn" style="cursor:pointer">${T('settings.importBackup')}<input id="importAll" type="file" accept="application/json" hidden></label>
          <button class="btn" id="emailAll">${T('settings.sendCoach')}</button>
          <button class="btn danger" id="wipe">${T('settings.resetData')}</button>
        </div>
      </div>
      <div class="card">
        <h3>${T('settings.shortcuts')}</h3>
        <p style="font-size:13px;line-height:1.9">
          <span class="tag">1–9</span> ${T('settings.switchModules')} · <span class="tag">/</span> ${T('settings.focusSearch')} · <span class="tag">Esc</span> ${T('settings.closeDialog')}
        </p>
      </div>
    </div>
    ${isTeamSport ? teamSyncCard() : ''}`;

  function teamSyncCard() {
    const players = team ? Store.all('players').filter(p => p.teamId === team.id) : [];
    if (isPlayer) {
      return `
      <div class="card" style="margin-top:16px" id="teamSyncCard">
        <h3>${T('sync.title')}</h3>
        <p style="color:var(--muted);font-size:13px">${T('sync.hintOffline')}</p>
        <label class="field"><span>${T('sync.iam')}</span><select id="myPlayer"><option value="">${T('sync.selectPlayer')}</option>${players.map(p => `<option value="${p.id}" ${p.id === myPlayerId ? 'selected' : ''}>${UI.esc(p.firstName + ' ' + p.lastName)}</option>`).join('')}</select></label>
        <div class="row" style="flex:0;margin-top:8px;flex-wrap:wrap">
          <button class="btn primary" id="exportTraining">${T('sync.exportTraining')}</button>
          <button class="btn" id="msgCoach">${T('sync.messageCoach')}</button>
          <label class="btn" style="cursor:pointer">${T('sync.importFromCoach')}<input id="importCoach" type="file" accept=".txt,.json,text/plain,application/json" hidden></label>
        </div>
      </div>`;
    }
    return `
      <div class="card" style="margin-top:16px" id="teamSyncCard">
        <h3>${T('sync.title')}</h3>
        <p style="color:var(--muted);font-size:13px">${T('sync.hintOffline')}</p>
        <div class="row" style="flex:0;flex-wrap:wrap">
          <label class="btn primary" style="cursor:pointer">${T('sync.importTraining')}<input id="importTraining" type="file" accept=".txt,.json,text/plain,application/json" hidden></label>
          <button class="btn" id="pasteImport">${T('sync.pasteCode')}</button>
        </div>
        <div class="table-wrap" style="margin-top:10px">
          <table>
            <thead><tr><th>${T('sync.player')}</th><th>${T('sync.email')}</th><th>${T('sync.status')}</th><th></th></tr></thead>
            <tbody>
              ${players.map(p => `<tr>
                <td>${UI.esc(p.firstName + ' ' + p.lastName)}</td>
                <td>${UI.esc(p.email || '—')}</td>
                <td id="st_${p.id}" style="color:var(--muted)">${statusText(p.id)}</td>
                <td style="text-align:right"><button class="btn sm" data-msg="${p.id}">${T('sync.message')}</button></td>
              </tr>`).join('') || `<tr><td colspan="4" class="empty">${T('common.noData')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  mount.querySelector('#s_theme').onchange = e => { App.setTheme(e.target.value); };
  mount.querySelector('#s_role').onchange = e => { Store.setSetting('role', e.target.value); document.getElementById('roleBadge').textContent = T('role.' + e.target.value); App.render(); };

  mount.querySelector('#exportAll').onclick = async () => {
    const dump = {};
    for (const s of DB.STORES) dump[s] = Store.all(s);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump)], { type: 'application/json' }));
    a.download = 'sporttactix-backup.json'; a.click();
    UI.toast(T('settings.exported'), 'success');
  };
  mount.querySelector('#importAll').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const dump = JSON.parse(r.result);
        for (const s of DB.STORES) { if (dump[s]) { await DB.clear(s); await DB.bulkPut(s, dump[s]); } }
        await Store.loadAll(); UI.toast(T('settings.imported'), 'success'); App.render();
      } catch { UI.toast(T('settings.invalidBackup'), 'error'); }
    };
    r.readAsText(f);
  };
  mount.querySelector('#emailAll').onclick = async () => {
    // Build JSON backup, offer download, and open the mail client with instructions.
    const dump = {};
    for (const s of DB.STORES) dump[s] = Store.all(s);
    const json = JSON.stringify(dump);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = 'sporttactix-share.json'; a.click();
    const players = Store.all('players').length, matches = Store.all('matches').length, tactics = Store.all('tactics').length;
    const subject = encodeURIComponent('SportTactix data share');
    const body = encodeURIComponent(
      'Hi coach,\n\nI am sharing my SportTactix data with you.\n\n' +
      'Summary:\n- Players: ' + players + '\n- Matches: ' + matches + '\n- Tactics: ' + tactics + '\n\n' +
      'The data file (sporttactix-share.json) was just downloaded to my device — please attach it to this email before sending.\n' +
      'To load it: open SportTactix ? Settings ? Import Backup ? select the JSON file.\n\nBest regards');
    window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
    UI.toast('JSON downloaded — attach it to the email', 'success');
  };
  mount.querySelector('#wipe').onclick = () => UI.confirm(T('settings.resetConfirm'), async () => {
    for (const s of DB.STORES) await DB.clear(s);
    await Store.loadAll(); await Store.seedIfEmpty(); UI.toast('Data reset', 'success'); App.render();
  });

  // ---- Offline team sync (file / code based, no account required) ----
  const enc = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  const dec = (str) => JSON.parse(decodeURIComponent(escape(atob(String(str).trim()))));
  const safeName = s => String(s || 'sporttactix').replace(/[^\w.-]+/g, '_');

  function statusText(pid) {
    const d = syncTraining[pid];
    if (!d) return T('sync.noData');
    return T('sync.trained') + ' · ' + ((d.sessions || []).length) + ' ' + T('sync.sessions') + ' · ' + UI.fmtDate(d.updatedAt);
  }

  // Show a shareable code and let the user copy it or download it as a small file.
  function shareModal(title, hintKey, code, filename) {
    UI.modal({
      title,
      body: `<p style="color:var(--muted);font-size:13px">${T(hintKey)}</p>
        <textarea id="shareCode" readonly rows="5" style="width:100%;margin-top:8px;font-family:monospace;font-size:12px;word-break:break-all">${UI.esc(code)}</textarea>
        <div class="row" style="flex:0;margin-top:8px;gap:6px;flex-wrap:wrap">
          <button class="btn primary" id="shareCopy">${T('sync.copyCode')}</button>
          <button class="btn" id="shareDownload">${T('sync.downloadFile')}</button>
        </div>`,
      footer: `<button class="btn ghost" data-mclose>${T('common.close')}</button>`,
      onOpen: (m, close) => {
        const cb = m.querySelector('[data-mclose]'); if (cb) cb.onclick = close;
        m.querySelector('#shareCopy').onclick = () => {
          const el = m.querySelector('#shareCode');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value);
          else { el.removeAttribute('readonly'); el.select(); try { document.execCommand('copy'); } catch (e) { } el.setAttribute('readonly', ''); }
          UI.toast(T('sync.copied'), 'success');
        };
        m.querySelector('#shareDownload').onclick = () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
          a.download = filename; a.click();
          UI.toast(T('sync.fileDownloaded'), 'success');
        };
      }
    });
  }

  // Let the user paste a code to import.
  function pasteModal(title, onData) {
    UI.modal({
      title,
      body: `<p style="color:var(--muted);font-size:13px">${T('sync.pasteHint')}</p>
        <textarea id="pasteCode" rows="5" placeholder="${T('sync.pasteCode')}" style="width:100%;margin-top:8px;font-family:monospace;font-size:12px"></textarea>`,
      footer: `<button class="btn ghost" data-mclose>${T('common.close')}</button><button class="btn primary" id="pasteGo">${T('sync.import')}</button>`,
      onOpen: (m, close) => {
        const cb = m.querySelector('[data-mclose]'); if (cb) cb.onclick = close;
        m.querySelector('#pasteGo').onclick = async () => {
          let pkt; try { pkt = dec(m.querySelector('#pasteCode').value); } catch (e) { UI.toast(T('sync.badCode'), 'error'); return; }
          close(); await onData(pkt);
        };
      }
    });
  }

  // Merge an imported packet (training data or a message thread) into local state.
  async function applyPacket(pkt) {
    if (!pkt || !pkt.t) { UI.toast(T('sync.badCode'), 'error'); return; }
    if (pkt.t === 'training') {
      syncTraining[pkt.pid] = { playerName: pkt.playerName || '', updatedAt: pkt.updatedAt || Date.now(), sessions: pkt.sessions || [] };
      await Store.setSetting('syncTraining', syncTraining);
      const cell = mount.querySelector('#st_' + pkt.pid);
      if (cell) { cell.textContent = statusText(pkt.pid); cell.style.color = '#34c759'; }
      UI.toast(T('sync.trainingImported'), 'success');
    } else if (pkt.t === 'thread') {
      const key = String(pkt.pid);
      const cur = syncMsgs[key] || [];
      const seen = new Set(cur.map(mm => mm.at + '|' + mm.from + '|' + mm.text));
      (pkt.messages || []).forEach(mm => { const k = mm.at + '|' + mm.from + '|' + mm.text; if (!seen.has(k)) { cur.push(mm); seen.add(k); } });
      cur.sort((a, b) => a.at - b.at);
      syncMsgs[key] = cur;
      await Store.setSetting('syncMsgs', syncMsgs);
      UI.toast(T('sync.messagesImported'), 'success');
    } else { UI.toast(T('sync.badCode'), 'error'); }
  }

  // Coach <-> player message thread: stored locally, shareable via code/file.
  function openThread(pid, meRole, meName, otherName) {
    const key = String(pid);
    const bubble = (msg) => {
      const mine = msg.from === meRole;
      const align = mine ? 'flex-end' : 'flex-start';
      const bg = mine ? 'var(--primary)' : 'var(--surface-2)';
      const col = mine ? '#fff' : 'var(--text)';
      const who = UI.esc(msg.fromName || '');
      return `<div style="align-self:${align};max-width:82%;background:${bg};color:${col};padding:6px 10px;border-radius:12px">
        ${who ? `<div style="font-size:10px;opacity:.75;margin-bottom:2px">${who}</div>` : ''}
        <div style="white-space:pre-wrap;word-break:break-word">${UI.esc(msg.text)}</div>
        <div style="font-size:10px;opacity:.6;text-align:right;margin-top:2px">${UI.fmtDate(msg.at)}</div></div>`;
    };
    UI.modal({
      title: T('sync.message') + ' · ' + otherName,
      body: `<div id="msgList" style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto;padding:4px"></div>
        <div class="row" style="margin-top:10px;gap:6px"><input id="msgText" placeholder="${T('sync.typeMessage')}" style="flex:1"><button class="btn primary" id="msgSend">${T('sync.send')}</button></div>
        <div class="row" style="flex:0;margin-top:8px;gap:6px;flex-wrap:wrap"><button class="btn sm" id="msgShare">${T('sync.shareThread')}</button><button class="btn sm" id="msgImport">${T('sync.importThread')}</button></div>`,
      footer: `<button class="btn ghost" data-mclose>${T('common.close')}</button>`,
      onOpen: (m, close) => {
        const list = m.querySelector('#msgList');
        const input = m.querySelector('#msgText');
        const cb = m.querySelector('[data-mclose]'); if (cb) cb.onclick = close;
        function render() {
          const arr = syncMsgs[key] || [];
          list.innerHTML = arr.length ? arr.map(bubble).join('') : `<p style="color:var(--muted)">${T('sync.noMessages')}</p>`;
          list.scrollTop = list.scrollHeight;
        }
        async function send() {
          const t = input.value.trim(); if (!t) return;
          input.value = '';
          const arr = syncMsgs[key] || [];
          arr.push({ from: meRole, fromName: meName, text: t, at: Date.now() });
          syncMsgs[key] = arr; await Store.setSetting('syncMsgs', syncMsgs);
          render();
        }
        m.querySelector('#msgSend').onclick = send;
        input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); send(); } };
        m.querySelector('#msgShare').onclick = () => {
          const code = enc({ t: 'thread', pid, playerName: otherName, messages: syncMsgs[key] || [] });
          shareModal(T('sync.shareThread'), 'sync.shareThreadHint', code, 'messages-' + safeName(otherName) + '.txt');
        };
        m.querySelector('#msgImport').onclick = () => pasteModal(T('sync.importThread'), async (pkt) => { await applyPacket(pkt); render(); });
        render();
      }
    });
  }

  // Coach controls: import training / message players.
  const importTraining = mount.querySelector('#importTraining');
  if (importTraining) importTraining.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => { try { await applyPacket(dec(r.result)); } catch (x) { UI.toast(T('sync.badCode'), 'error'); } };
    r.readAsText(f); e.target.value = '';
  };
  const pasteImport = mount.querySelector('#pasteImport');
  if (pasteImport) pasteImport.onclick = () => pasteModal(T('sync.pasteCode'), applyPacket);
  mount.querySelectorAll('[data-msg]').forEach(b => b.onclick = () => {
    const p = Store.find('players', b.dataset.msg); if (!p) return;
    openThread(p.id, 'coach', T('sync.coach'), p.firstName + ' ' + p.lastName);
  });

  // Player controls: pick who I am, export training, message coach, import from coach.
  const myPlayer = mount.querySelector('#myPlayer');
  if (myPlayer) myPlayer.onchange = () => { Store.setSetting('myPlayerId', myPlayer.value); };
  const exportTraining = mount.querySelector('#exportTraining');
  if (exportTraining) exportTraining.onclick = () => {
    const pid = mount.querySelector('#myPlayer').value;
    if (!pid) { UI.toast(T('sync.selectPlayer'), 'error'); return; }
    const p = Store.find('players', pid);
    const name = p ? (p.firstName + ' ' + p.lastName) : '';
    const code = enc({ t: 'training', pid, playerName: name, updatedAt: Date.now(), sessions: Store.all('training') });
    shareModal(T('sync.exportTraining'), 'sync.exportTrainingHint', code, 'training-' + safeName(name) + '.txt');
  };
  const msgCoach = mount.querySelector('#msgCoach');
  if (msgCoach) msgCoach.onclick = () => {
    const pid = mount.querySelector('#myPlayer').value;
    if (!pid) { UI.toast(T('sync.selectPlayer'), 'error'); return; }
    const p = Store.find('players', pid);
    openThread(pid, 'player', p ? (p.firstName + ' ' + p.lastName) : T('role.Player'), T('sync.coach'));
  };
  const importCoach = mount.querySelector('#importCoach');
  if (importCoach) importCoach.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = async () => { try { await applyPacket(dec(r.result)); } catch (x) { UI.toast(T('sync.badCode'), 'error'); } };
    r.readAsText(f); e.target.value = '';
  };
};
