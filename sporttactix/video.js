/* Video Analysis view */
window.Views = window.Views || {};
Views.video = function (mount) {
  // Bookmarks are auto-saved to IndexedDB (store 'videos', id 'bookmarks').
  let bookmarks = [];
  const BM_ID = 'bookmarks';
  let clipLenSec = 6; // WebM sequence length around each bookmark

  function loadBookmarks() {
    const rec = Store.find('videos', BM_ID);
    bookmarks = (rec && Array.isArray(rec.bookmarks)) ? rec.bookmarks.slice() : [];
  }
  async function saveBookmarks() {
    await Store.save('videos', { id: BM_ID, bookmarks });
  }

  // Convert a shareable streaming URL into an embeddable iframe URL.
  function toEmbed(url) {
    url = (url || '').trim();
    if (!url) return null;
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      // YouTube (watch, youtu.be, shorts, live)
      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        let id = u.searchParams.get('v');
        if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2];
        if (!id && u.pathname.startsWith('/live/')) id = u.pathname.split('/')[2];
        if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2];
        if (id) return 'https://www.youtube.com/embed/' + id;
      }
      if (host === 'youtu.be') { const id = u.pathname.slice(1); if (id) return 'https://www.youtube.com/embed/' + id; }
      // Twitch (video or channel live)
      if (host === 'twitch.tv') {
        const parent = location.hostname || 'localhost';
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0] === 'videos' && parts[1]) return 'https://player.twitch.tv/?video=' + parts[1] + '&parent=' + parent;
        if (parts[0]) return 'https://player.twitch.tv/?channel=' + parts[0] + '&parent=' + parent;
      }
      if (host === 'clips.twitch.tv') { const parent = location.hostname || 'localhost'; const clip = u.pathname.split('/').filter(Boolean)[0]; if (clip) return 'https://clips.twitch.tv/embed?clip=' + clip + '&parent=' + parent; }
      // Vimeo
      if (host === 'vimeo.com') { const id = u.pathname.split('/').filter(Boolean)[0]; if (id) return 'https://player.vimeo.com/video/' + id; }
      // Dailymotion
      if (host === 'dailymotion.com') { const id = u.pathname.split('/video/')[1]; if (id) return 'https://www.dailymotion.com/embed/video/' + id.split('_')[0]; }
      if (host === 'dai.ly') { const id = u.pathname.slice(1); if (id) return 'https://www.dailymotion.com/embed/video/' + id; }
      // Facebook video
      if (host === 'facebook.com' || host === 'fb.watch') return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url) + '&show_text=false';
      // Direct file or already-embed URL — return as-is
      return url;
    } catch (e) { return null; }
  }

  mount.innerHTML = `
    <div class="page-head"><div><h1>${T('video.title')}</h1><p>${T('video.subtitle')}</p></div>
      <label class="btn primary" style="cursor:pointer">${T('video.import')}<input id="vfile" type="file" accept="video/*" hidden></label>
    </div>
    <div class="card" style="margin-bottom:16px">
      <h3>${T('video.stream')}</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:8px">${T('video.streamHint')}</p>
      <div class="row" style="flex:0">
        <input id="streamUrl" type="url" placeholder="https://youtube.com/watch?v=… , twitch.tv/… , vimeo.com/…" style="min-width:260px">
        <button class="btn primary" id="loadStream">${T('video.watch')}</button>
      </div>
      <div class="stream-services">
        <span class="tag">YouTube</span><span class="tag">Twitch</span><span class="tag">Vimeo</span>
        <span class="tag">Dailymotion</span><span class="tag">Facebook</span>
      </div>
    </div>
    <div class="card video-panel" id="videoPanel">
      <div class="video-head">
        <h3 style="margin:0">${T('video.title')}</h3>
        <button class="btn sm" id="videoFs" title="${T('video.fullscreen')}">⛶ ${T('video.fullscreen')}</button>
      </div>
      <div id="mediaWrap">
        <video id="player" controls style="width:100%;border-radius:10px;background:#000"></video>
      </div>
      <div class="row" style="margin-top:10px;flex:0" id="localControls">
        <button class="btn sm" data-seek="-5">« 5s</button>
        <button class="btn sm" data-rate="0.5">0.5×</button>
        <button class="btn sm" data-rate="1">1×</button>
        <button class="btn sm" data-rate="2">2×</button>
        <button class="btn sm" data-seek="5">5s »</button>
        <button class="btn sm primary" id="bm">★ ${T('video.bookmark')}</button>
      </div>
      <div class="bm-section">
        <div class="bm-head">
          <h3 style="margin:0">${T('video.bookmarks')}</h3>
          <button class="btn sm primary" id="exportWebm">${T('video.exportWebm')}</button>
        </div>
        <p class="hint" style="margin:6px 0 4px">${T('video.bmEmpty')}</p>
        <div id="bmList"></div>
      </div>
    </div>`;

  const wrap = mount.querySelector('#mediaWrap');
  const localControls = mount.querySelector('#localControls');
  let v = mount.querySelector('#player');

  function showLocalVideo() {
    wrap.innerHTML = `<video id="player" controls style="width:100%;border-radius:10px;background:#000"></video>`;
    v = mount.querySelector('#player');
    localControls.style.display = '';
    bindLocalControls();
  }
  function showEmbed(src) {
    wrap.innerHTML = `<div class="embed-frame"><iframe src="${UI.esc(src)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen frameborder="0"></iframe></div>`;
    localControls.style.display = 'none';
  }

  mount.querySelector('#loadStream').onclick = () => {
    const src = toEmbed(mount.querySelector('#streamUrl').value);
    if (!src) { UI.toast(T('video.badUrl'), 'error'); return; }
    showEmbed(src);
    UI.toast(T('video.streaming'), 'success');
  };
  mount.querySelector('#streamUrl').addEventListener('keydown', e => { if (e.key === 'Enter') mount.querySelector('#loadStream').click(); });

  mount.querySelector('#vfile').onchange = e => {
    const f = e.target.files[0]; if (f) { showLocalVideo(); v.src = URL.createObjectURL(f); UI.toast(T('video.streaming')); }
  };

  function bindLocalControls() {
    mount.querySelectorAll('[data-seek]').forEach(b => b.onclick = () => v.currentTime += +b.dataset.seek);
    mount.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => v.playbackRate = +b.dataset.rate);
    mount.querySelector('#bm').onclick = createBookmark;
  }

  // Create a bookmark with a tag + comment. Auto-saved immediately on confirm.
  function createBookmark() {
    const t = v ? (v.currentTime || 0) : 0;
    if (v && !v.paused) v.pause();
    UI.modal({
      title: T('video.addBookmark') + ' · ' + UI.fmtClock(Math.floor(t)),
      body: `
        <label class="field"><span>${T('video.tag')}</span><input id="bm_tag" value="Goal" placeholder="${T('video.tag')}"></label>
        <label class="field"><span>${T('video.comment')}</span><textarea id="bm_comment" rows="3" placeholder="${T('video.commentPh')}"></textarea></label>`,
      footer: `<button class="btn ghost" data-close2>${T('common.cancel')}</button><button class="btn primary" data-save>${T('common.save')}</button>`,
      onOpen: (m, close) => {
        const tagEl = m.querySelector('#bm_tag');
        if (tagEl) { tagEl.focus(); tagEl.select(); }
        m.querySelector('[data-close2]').onclick = close;
        m.querySelector('[data-save]').onclick = async () => {
          const tag = (m.querySelector('#bm_tag').value || '').trim() || 'Bookmark';
          const comment = (m.querySelector('#bm_comment').value || '').trim();
          bookmarks.push({ t, tag, comment });
          bookmarks.sort((a, b) => a.t - b.t);
          await saveBookmarks();               // auto-save immediately
          close();
          UI.toast(T('video.bmSaved'), 'success');
          renderBm();
        };
      }
    });
  }

  // Toggle fullscreen on the whole video panel (bookmarks & tips move with it).
  function toggleVideoFullscreen() {
    const el = mount.querySelector('#videoPanel');
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  }
  function onVideoFsChange() {
    const el = mount.querySelector('#videoPanel');
    const btn = mount.querySelector('#videoFs');
    const fs = document.fullscreenElement === el;
    if (el) el.classList.toggle('fs', fs);
    if (btn) btn.innerHTML = '⛶ ' + (fs ? T('video.exitFullscreen') : T('video.fullscreen'));
  }
  document.addEventListener('fullscreenchange', onVideoFsChange);
  const vfsBtn = mount.querySelector('#videoFs');
  if (vfsBtn) vfsBtn.onclick = toggleVideoFullscreen;
  bindLocalControls();

  loadBookmarks();

  // ---- Export bookmarks as WebM sequences ----
  function pickMime() {
    const opts = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return opts.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';
  }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  // Record a segment [start,end] of the local video into a WebM blob.
  function recordSegment(start, end) {
    return new Promise((resolve, reject) => {
      const cap = v.captureStream || v.mozCaptureStream;
      if (!cap) { reject(new Error('captureStream unsupported')); return; }
      let stream;
      try { stream = cap.call(v); } catch (e) { reject(e); return; }
      if (!stream || !stream.getTracks || !stream.getTracks().length) { reject(new Error('empty stream')); return; }
      let rec;
      try { rec = new MediaRecorder(stream, { mimeType: pickMime() }); }
      catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { reject(e2); return; } }
      const chunks = [];
      let settled = false, safety = null;
      const cleanup = () => { if (safety) clearTimeout(safety); v.removeEventListener('timeupdate', onTime); v.removeEventListener('seeked', onSeeked); };
      const finishOk = () => { if (settled) return; settled = true; cleanup(); resolve(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); };
      const finishErr = (err) => { if (settled) return; settled = true; cleanup(); reject(err); };
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = finishOk;
      rec.onerror = e => finishErr(e.error || new Error('recorder error'));
      const stop = () => {
        try { v.pause(); } catch (e) {}
        if (rec.state !== 'inactive') { try { rec.stop(); } catch (e) { finishOk(); } }
        else finishOk();
      };
      const onTime = () => { if (v.currentTime >= end - 0.05) stop(); };
      const begin = () => {
        try { rec.start(); } catch (e) { finishErr(e); return; }
        v.addEventListener('timeupdate', onTime);
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
        // Safety net: real playback duration + buffer, in case timeupdate stalls.
        safety = setTimeout(stop, ((end - start) / (v.playbackRate || 1)) * 1000 + 2500);
      };
      const onSeeked = () => { v.removeEventListener('seeked', onSeeked); begin(); };
      const target = Math.max(0, Math.min(start, (v.duration || start + 1) - 0.05));
      v.addEventListener('seeked', onSeeked);
      try { v.pause(); } catch (e) {}
      // If we're already at the target, no 'seeked' fires — start immediately.
      if (Math.abs(v.currentTime - target) < 0.08) { v.removeEventListener('seeked', onSeeked); begin(); }
      else { try { v.currentTime = target; } catch (e) { v.removeEventListener('seeked', onSeeked); begin(); } }
    });
  }
  async function exportWebmSequences() {
    if (!v || !v.src || !v.duration || isNaN(v.duration)) { UI.toast(T('video.needLocal'), 'error'); return; }
    if (!window.MediaRecorder || !(v.captureStream || v.mozCaptureStream)) { UI.toast(T('video.needLocal'), 'error'); return; }
    if (!bookmarks.length) { UI.toast(T('video.noBm'), 'error'); return; }
    UI.toast(T('video.exporting'));
    const wasRate = v.playbackRate, wasMuted = v.muted;
    v.playbackRate = 1; v.muted = true;   // mute so playback is silent and never autoplay-blocked
    let ok = 0;
    for (let i = 0; i < bookmarks.length; i++) {
      const b = bookmarks[i];
      const start = Math.max(0, b.t - clipLenSec / 2);
      const end = Math.min(v.duration, Math.max(b.t + clipLenSec / 2, start + 1));
      try {
        const blob = await recordSegment(start, end);
        if (blob && blob.size) {
          const safe = String(b.tag).replace(/[^\w\-]+/g, '_').slice(0, 40) || 'clip';
          download(blob, `clip-${String(i + 1).padStart(2, '0')}-${safe}-${Math.floor(b.t)}s.webm`);
          ok++;
        }
      } catch (e) { /* skip failed segment */ }
    }
    v.playbackRate = wasRate; v.muted = wasMuted; v.pause();
    UI.toast(ok ? T('video.exported') : T('video.needLocal'), ok ? 'success' : 'error');
  }
  mount.querySelector('#exportWebm').onclick = exportWebmSequences;

  async function renderBm() {
    const l = mount.querySelector('#bmList');
    l.innerHTML = bookmarks.length ? bookmarks.map((b, i) =>
      `<div class="bm-item">
        <div class="bm-main">
          <span><span class="tag blue">${UI.fmtClock(Math.floor(b.t))}</span> ${UI.esc(b.tag)}</span>
          <span><button class="btn sm" data-go="${i}">${T('common.go')}</button> <button class="btn sm danger" data-rm="${i}">${T('common.remove')}</button></span>
        </div>
        ${b.comment ? `<p class="bm-comment">${UI.esc(b.comment)}</p>` : ''}
      </div>`).join('') : `<p style="color:var(--muted)">${T('video.noBm')}</p>`;
    l.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (v) { v.currentTime = bookmarks[+b.dataset.go].t; v.play(); } });
    l.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { bookmarks.splice(+b.dataset.rm, 1); await saveBookmarks(); renderBm(); });
  }
  renderBm();

  return () => { document.removeEventListener('fullscreenchange', onVideoFsChange); };
};
