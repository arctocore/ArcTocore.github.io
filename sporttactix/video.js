/* Video Analysis view */
window.Views = window.Views || {};
Views.video = function (mount) {
  let bookmarks = [];

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
    <div class="grid cols-2">
      <div class="card">
        <div id="mediaWrap">
          <video id="player" controls style="width:100%;border-radius:10px;background:#000"></video>
        </div>
        <div class="row" style="margin-top:10px;flex:0" id="localControls">
          <button class="btn sm" data-seek="-5">« 5s</button>
          <button class="btn sm" data-rate="0.5">0.5×</button>
          <button class="btn sm" data-rate="1">1×</button>
          <button class="btn sm" data-rate="2">2×</button>
          <button class="btn sm" data-seek="5">5s »</button>
          <button class="btn sm primary" id="bm">${T('video.bookmark')}</button>
        </div>
      </div>
      <div class="card">
        <h3>Bookmarks &amp; Tags</h3>
        <div id="bmList"><p style="color:var(--muted)">Import a video and add bookmarks at key moments.</p></div>
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
    const f = e.target.files[0]; if (f) { showLocalVideo(); v.src = URL.createObjectURL(f); UI.toast('Video loaded'); }
  };

  function bindLocalControls() {
    mount.querySelectorAll('[data-seek]').forEach(b => b.onclick = () => v.currentTime += +b.dataset.seek);
    mount.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => v.playbackRate = +b.dataset.rate);
    mount.querySelector('#bm').onclick = () => {
      const tag = prompt('Tag name for this moment:', 'Goal') || 'Bookmark';
      bookmarks.push({ t: v.currentTime, tag });
      renderBm();
    };
  }
  bindLocalControls();

  function renderBm() {
    const l = mount.querySelector('#bmList');
    l.innerHTML = bookmarks.length ? bookmarks.map((b, i) =>
      `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
        <span><span class="tag blue">${UI.fmtClock(Math.floor(b.t))}</span> ${UI.esc(b.tag)}</span>
        <span><button class="btn sm" data-go="${i}">Go</button> <button class="btn sm danger" data-rm="${i}">Remove</button></span>
      </div>`).join('') : '<p style="color:var(--muted)">No bookmarks.</p>';
    l.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { v.currentTime = bookmarks[+b.dataset.go].t; v.play(); });
    l.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { bookmarks.splice(+b.dataset.rm, 1); renderBm(); });
  }
};
