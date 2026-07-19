/* Training Planner view */
window.Views = window.Views || {};
Views.training = function (mount) {
  const team = Store.all('teams')[0];
  const sessions = Store.all('training').slice().sort((a, b) => a.date - b.date);
  const exercises = Store.all('exercises');

  mount.innerHTML = `
    <div class="page-head"><div><h1>${T('training.title')}</h1><p>Sessions, weekly &amp; season plans</p></div>
      <button class="btn primary" id="addSession">+ ${T('training.newSession')}</button></div>
    <div class="grid cols-3">
      ${sessions.map(s => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <div><h3 style="margin:0">${UI.esc(s.title)}</h3><p style="color:var(--muted)">${UI.fmtDate(s.date)} · ${s.duration} ${T('training.min')}</p></div>
            <span class="tag blue">${UI.esc(s.focus)}</span>
          </div>
          <div style="margin-top:10px">
            ${(s.exercises || []).map(id => { const e = Store.find('exercises', id); return e ? `<div class="tag" style="margin:2px">${UI.esc(e.title)}</div>` : ''; }).join('') || `<span style="color:var(--muted)">${T('common.noData')}</span>`}
          </div>
          <div style="margin-top:12px"><button class="btn sm" data-edit="${s.id}">${T('common.edit')}</button> <button class="btn sm danger" data-del="${s.id}">${T('common.delete')}</button></div>
        </div>`).join('') || `<div class="empty"><div class="big">${UI.icon('calendar', 40)}</div>${T('training.noSessions')}</div>`}
    </div>`;

  function form(s = {}) {
    const dstr = new Date(s.date || Date.now()).toISOString().slice(0, 10);
    UI.modal({
      title: s.id ? 'Edit Session' : 'New Session',
      body: `
        <label class="field"><span>Title</span><input id="t_title" value="${UI.esc(s.title || '')}"></label>
        <div class="row">
          <label class="field"><span>Date</span><input id="t_date" type="date" value="${dstr}"></label>
          <label class="field"><span>Duration (min)</span><input id="t_dur" type="number" value="${s.duration || 90}"></label>
          <label class="field"><span>Focus</span><select id="t_focus">${['Warm-up', 'Attack', 'Defense', 'Transition', 'Goalkeeper', 'Physical', 'Set Plays'].map(x => `<option ${x === s.focus ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>Drills</span><select id="t_ex" multiple size="5">${exercises.map(e => `<option value="${e.id}" ${(s.exercises || []).includes(e.id) ? 'selected' : ''}>${UI.esc(e.title)} (${e.category})</option>`).join('')}</select></label>`,
      footer: `<button class="btn ghost" data-close2>Cancel</button><button class="btn primary" data-save>Save</button>`,
      onOpen: (m, close) => {
        m.querySelector('[data-close2]').onclick = close;
        m.querySelector('[data-save]').onclick = async () => {
          const obj = Object.assign({}, s, {
            teamId: team.id, title: m.querySelector('#t_title').value.trim(),
            date: new Date(m.querySelector('#t_date').value).getTime(),
            duration: +m.querySelector('#t_dur').value, focus: m.querySelector('#t_focus').value,
            exercises: [...m.querySelector('#t_ex').selectedOptions].map(o => o.value)
          });
          if (!obj.title) return UI.toast('Title required', 'error');
          await Store.save('training', obj); close(); UI.toast('Session saved', 'success'); App.render();
        };
      }
    });
  }
  mount.querySelector('#addSession').onclick = () => form();
  mount.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(Store.find('training', b.dataset.edit)));
  mount.querySelectorAll('[data-del]').forEach(b => b.onclick = () => UI.confirm('Delete session?', async () => { await Store.remove('training', b.dataset.del); App.render(); }));
};
