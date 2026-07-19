/* Opponent Analysis view */
window.Views = window.Views || {};
Views.opponents = function (mount) {
  const opponents = Store.all('opponents');
  mount.innerHTML = `
    <div class="page-head"><div><h1>${T('opponents.title')}</h1><p>Scouting reports &amp; tendencies</p></div>
      <button class="btn primary" id="addOpp">+ ${T('opponents.newOpponent')}</button></div>
    <div class="grid cols-2">
      ${opponents.map(o => `
        <div class="card">
          <div style="display:flex;justify-content:space-between"><h3 style="margin:0">${UI.esc(o.name)}</h3><span class="tag amber">${UI.esc(o.formation || '—')}</span></div>
          <p style="margin:8px 0"><strong>Key players:</strong> ${UI.esc(o.keyPlayers || '—')}</p>
          <p style="margin:8px 0;color:var(--text-soft)"><strong>Tendencies:</strong> ${UI.esc(o.tendencies || '—')}</p>
          <button class="btn sm" data-edit="${o.id}">${T('common.edit')}</button>
          <button class="btn sm" data-report="${o.id}">${T('opponents.report')}</button>
          <button class="btn sm danger" data-del="${o.id}">${T('common.delete')}</button>
        </div>`).join('') || `<div class="empty"><div class="big">${UI.icon('search', 40)}</div>${T('opponents.none')}</div>`}
    </div>`;

  function form(o = {}) {
    UI.modal({
      title: o.id ? 'Edit Opponent' : 'New Opponent',
      body: `
        <label class="field"><span>Name</span><input id="o_n" value="${UI.esc(o.name || '')}"></label>
        <label class="field"><span>Preferred formation</span><select id="o_f">${['6-0', '5-1', '3-2-1', '4-2', 'Man-to-Man'].map(x => `<option ${x === o.formation ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="field"><span>Key players</span><input id="o_k" value="${UI.esc(o.keyPlayers || '')}"></label>
        <label class="field"><span>Tendencies</span><textarea id="o_t" rows="4">${UI.esc(o.tendencies || '')}</textarea></label>`,
      footer: `<button class="btn ghost" data-close2>Cancel</button><button class="btn primary" data-save>Save</button>`,
      onOpen: (m, close) => {
        m.querySelector('[data-close2]').onclick = close;
        m.querySelector('[data-save]').onclick = async () => {
          const obj = Object.assign({}, o, {
            name: m.querySelector('#o_n').value.trim(), formation: m.querySelector('#o_f').value,
            keyPlayers: m.querySelector('#o_k').value.trim(), tendencies: m.querySelector('#o_t').value.trim()
          });
          if (!obj.name) return UI.toast('Name required', 'error');
          await Store.save('opponents', obj); close(); UI.toast('Saved', 'success'); Views.opponents(mount);
        };
      }
    });
  }
  mount.querySelector('#addOpp').onclick = () => form();
  mount.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(Store.find('opponents', b.dataset.edit)));
  mount.querySelectorAll('[data-del]').forEach(b => b.onclick = () => UI.confirm('Delete opponent?', async () => { await Store.remove('opponents', b.dataset.del); Views.opponents(mount); }));
  mount.querySelectorAll('[data-report]').forEach(b => b.onclick = () => {
    const o = Store.find('opponents', b.dataset.report);
    UI.modal({
      title: 'Scouting Report — ' + o.name,
      body: `<p><strong>Formation:</strong> ${UI.esc(o.formation)}</p><p><strong>Key players:</strong> ${UI.esc(o.keyPlayers)}</p><p style="margin-top:10px">${UI.esc(o.tendencies)}</p>
        <p style="margin-top:12px;color:var(--muted)">Recommended: neutralize key players with a ${o.formation === '6-0' ? '5-1 offensive setup to break the flat block' : 'patient 6-0 defense to slow their tempo'}.</p>`,
      footer: `<button class="btn primary" data-close2>Close</button>`,
      onOpen: (m, close) => { m.querySelector('[data-close2]').onclick = close; }
    });
  });
};
