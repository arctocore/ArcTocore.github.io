/* Settings view */
window.Views = window.Views || {};
Views.settings = async function (mount) {
  const theme = document.documentElement.getAttribute('data-theme');
  const role = await Store.getSetting('role', 'Coach');

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
        <div class="row" style="flex:0;margin-top:10px">
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
    </div>`;

  mount.querySelector('#s_theme').onchange = e => { App.setTheme(e.target.value); };
  mount.querySelector('#s_role').onchange = e => { Store.setSetting('role', e.target.value); document.getElementById('roleBadge').textContent = T('role.' + e.target.value); };

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
};
