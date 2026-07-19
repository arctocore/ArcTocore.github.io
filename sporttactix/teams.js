/* Teams & Players view */
window.Views = window.Views || {};
Views.teams = function (mount) {
  const teams = Store.all('teams');
  const team = teams[0];
  const players = team ? Store.all('players').filter(p => p.teamId === team.id) : [];
  const coaches = team ? Store.all('coaches').filter(c => c.teamId === team.id) : [];

  mount.innerHTML = `
    <div class="page-head">
      <div><h1>${T('teams.title')}</h1><p>${UI.esc(team ? team.name : T('teams.noTeam'))} · ${UI.esc(team ? team.division : '')}</p></div>
      <button class="btn primary" id="addPlayer">+ ${T('teams.addPlayer')}</button>
    </div>
    <div class="grid cols-4" style="margin-bottom:16px">
      ${UI.statCard(players.length, T('dash.players'))}
      ${UI.statCard(players.filter(p => p.position === 'Goalkeeper').length, 'GK')}
      ${UI.statCard(coaches.length, 'Staff')}
      ${UI.statCard(players.filter(p => p.status === 'active').length, T('status.available'))}
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>${T('teams.number')}</th><th>${T('teams.name')}</th><th>${T('teams.position')}</th><th>${T('teams.height')}</th><th>${T('teams.status')}</th><th></th></tr></thead>
        <tbody>
          ${players.map(p => `
            <tr>
              <td><strong>${p.number}</strong></td>
              <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar">${UI.initials(p.firstName, p.lastName)}</span>${UI.esc(p.firstName)} ${UI.esc(p.lastName)}</div></td>
              <td>${UI.esc(p.position)}</td>
              <td>${p.height || '—'} cm</td>
              <td>
                <span class="tag ${p.status === 'injured' ? 'red' : 'green'}">${UI.esc(p.status === 'injured' ? T('status.injured') : T('status.available'))}</span>
                <button class="btn sm danger" data-del="${p.id}" title="${T('common.delete')}">${UI.icon('trash', 14)}</button>
              </td>
              <td style="text-align:right"><button class="btn sm" data-edit="${p.id}">${T('common.edit')}</button></td>
            </tr>`).join('') || `<tr><td colspan="6" class="empty">${T('common.noData')}</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Staff</h3>
      ${coaches.map(c => `<div style="display:flex;justify-content:space-between;padding:6px 0"><span>${UI.esc(c.name)}</span><span class="tag blue">${UI.esc(c.role)}</span></div>`).join('') || `<p style="color:var(--muted)">${T('common.noData')}</p>`}
    </div>`;

  function form(p = {}) {
    const positions = ['Goalkeeper', 'Left Wing', 'Left Back', 'Center Back', 'Right Back', 'Right Wing', 'Pivot'];
    UI.modal({
      title: p.id ? T('teams.editPlayer') : T('teams.newPlayer'),
      body: `
        <div class="row"><label class="field"><span>${T('teams.firstName')}</span><input id="f_first" value="${UI.esc(p.firstName || '')}"></label>
        <label class="field"><span>${T('teams.lastName')}</span><input id="f_last" value="${UI.esc(p.lastName || '')}"></label></div>
        <div class="row"><label class="field"><span>${T('teams.number')}</span><input id="f_num" type="number" value="${p.number || ''}"></label>
        <label class="field"><span>${T('teams.position')}</span><select id="f_pos">${positions.map(x => `<option ${x === p.position ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
        <div class="row"><label class="field"><span>${T('teams.height')} (cm)</span><input id="f_h" type="number" value="${p.height || ''}"></label>
        <label class="field"><span>${T('teams.status')}</span><select id="f_st"><option ${p.status === 'active' ? 'selected' : ''}>active</option><option ${p.status === 'injured' ? 'selected' : ''}>injured</option><option ${p.status === 'suspended' ? 'selected' : ''}>suspended</option></select></label></div>`,
      footer: `<button class="btn ghost" data-close2>${T('common.cancel')}</button><button class="btn primary" data-save>${T('common.save')}</button>`,
      onOpen: (m, close) => {
        m.querySelector('[data-close2]').onclick = close;
        m.querySelector('[data-save]').onclick = async () => {
          const obj = Object.assign({}, p, {
            teamId: team.id,
            firstName: m.querySelector('#f_first').value.trim(),
            lastName: m.querySelector('#f_last').value.trim(),
            number: +m.querySelector('#f_num').value,
            position: m.querySelector('#f_pos').value,
            height: +m.querySelector('#f_h').value,
            status: m.querySelector('#f_st').value
          });
          if (!obj.firstName) return UI.toast(T('teams.firstName'), 'error');
          await Store.save('players', obj);
          close(); UI.toast(T('common.save'), 'success'); App.render();
        };
      }
    });
  }

  mount.querySelector('#addPlayer').onclick = () => form();
  mount.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(Store.find('players', b.dataset.edit)));
  mount.querySelectorAll('[data-del]').forEach(b => b.onclick = () => UI.confirm(T('teams.delPlayer'), async () => { await Store.remove('players', b.dataset.del); UI.toast(T('common.delete')); App.render(); }));
};
