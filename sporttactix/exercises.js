/* Exercise Library view */
window.Views = window.Views || {};
Views.exercises = function (mount) {
  const CATS = ['All', 'Attack', 'Defense', 'Goalkeeper', 'Passing', 'Shooting', 'Transition', 'Conditioning'];
  let cat = 'All';

  function render() {
    const list = Store.all('exercises').filter(e => cat === 'All' || e.category === cat);
    mount.innerHTML = `
      <div class="page-head"><div><h1>${T('exercises.title')}</h1><p>Reusable drills with diagrams &amp; tags</p></div>
        <button class="btn primary" id="addEx">+ ${T('exercises.newExercise')}</button></div>
      <div class="pill-row">${CATS.map(c => `<span class="pill ${c === cat ? 'active' : ''}" data-cat="${c}">${c}</span>`).join('')}</div>
      <div class="grid cols-3">
        ${list.map(e => `
          <div class="card">
            <div style="display:flex;justify-content:space-between"><h3 style="margin:0">${UI.esc(e.title)}</h3><span class="tag blue">${UI.esc(e.category)}</span></div>
            <p style="color:var(--text-soft);margin:8px 0;font-size:13px">${UI.esc(e.description || '')}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
              <span class="tag">${e.duration || 0} ${T('training.min')}</span><span class="tag ${e.intensity === 'High' ? 'red' : e.intensity === 'Medium' ? 'amber' : 'green'}">${UI.esc(e.intensity || '—')}</span>
              ${(e.tags || []).map(t => `<span class="tag">#${UI.esc(t)}</span>`).join('')}
            </div>
            <button class="btn sm" data-edit="${e.id}">${T('common.edit')}</button> <button class="btn sm danger" data-del="${e.id}">${T('common.delete')}</button>
          </div>`).join('') || `<div class="empty"><div class="big">${UI.icon('dumbbell', 40)}</div>${T('exercises.none')}</div>`}
      </div>`;
    mount.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; render(); });
    mount.querySelector('#addEx').onclick = () => form();
    mount.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => form(Store.find('exercises', b.dataset.edit)));
    mount.querySelectorAll('[data-del]').forEach(b => b.onclick = () => UI.confirm('Delete exercise?', async () => { await Store.remove('exercises', b.dataset.del); render(); }));
  }

  function form(e = {}) {
    const cats = CATS.slice(1);
    UI.modal({
      title: e.id ? 'Edit Exercise' : 'New Exercise',
      body: `
        <label class="field"><span>Title</span><input id="e_t" value="${UI.esc(e.title || '')}"></label>
        <div class="row">
          <label class="field"><span>Category</span><select id="e_c">${cats.map(x => `<option ${x === e.category ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="field"><span>Duration (min)</span><input id="e_d" type="number" value="${e.duration || 15}"></label>
          <label class="field"><span>Intensity</span><select id="e_i">${['Low', 'Medium', 'High'].map(x => `<option ${x === e.intensity ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>Description</span><textarea id="e_desc" rows="4">${UI.esc(e.description || '')}</textarea></label>
        <label class="field"><span>Tags (comma separated)</span><input id="e_tags" value="${UI.esc((e.tags || []).join(', '))}"></label>`,
      footer: `<button class="btn ghost" data-close2>Cancel</button><button class="btn primary" data-save>Save</button>`,
      onOpen: (m, close) => {
        m.querySelector('[data-close2]').onclick = close;
        m.querySelector('[data-save]').onclick = async () => {
          const obj = Object.assign({}, e, {
            title: m.querySelector('#e_t').value.trim(), category: m.querySelector('#e_c').value,
            duration: +m.querySelector('#e_d').value, intensity: m.querySelector('#e_i').value,
            description: m.querySelector('#e_desc').value.trim(),
            tags: m.querySelector('#e_tags').value.split(',').map(s => s.trim()).filter(Boolean)
          });
          if (!obj.title) return UI.toast('Title required', 'error');
          await Store.save('exercises', obj); close(); UI.toast('Exercise saved', 'success'); render();
        };
      }
    });
  }
  render();
};
