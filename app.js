// Simple static story reader.
// Everything is driven by content/index.json, which build.js generates from the editor's files:
//   games → sections (Main Story, Events, Character Stories…) → stories → chapters
// Hidden items, and sections/stories with no visible chapters, are left out automatically.

const app = document.getElementById('app');
let site = null;
const stories = {}; // "gameId/storyId" → { game, section, story }

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Theme ----------
const savedTheme = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
else if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark';

document.getElementById('theme-toggle').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
};

// ---------- Helpers ----------
const storyLink = (g, s) => `#/${encodeURIComponent(g.id)}/${encodeURIComponent(s.id)}`;
const chapterLink = (g, s, c) => `${storyLink(g, s)}/${encodeURIComponent(c.id)}`;

// Images: full URLs are left alone; "content/images/x.jpg" or "/content/images/x.jpg" become
// relative to the site (so it works at username.github.io/repo/); a bare "x.jpg" means content/images/x.jpg.
const resolveImg = src => {
  if (!src || /^(https?:|data:)/.test(src)) return src;
  src = src.replace(/^\/+/, '');
  return src.startsWith('content/') ? src : 'content/images/' + src;
};

const lastDate = s => s.chapters.map(c => c.date || '').sort().pop() || '';

// ---------- Fonts ----------
const FONTS = {
  serif:   { css: '"Noto Serif", "Noto Serif Thai", Georgia, serif', google: 'Noto+Serif:ital,wght@0,400;0,700;1,400&family=Noto+Serif+Thai:wght@400;700' },
  sans:    { css: '"Noto Sans", "Noto Sans Thai", system-ui, sans-serif', google: 'Noto+Sans:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Thai:wght@400;700' },
  rounded: { css: '"Nunito", "Mitr", system-ui, sans-serif', google: 'Nunito:ital,wght@0,400;0,700;1,400&family=Mitr:wght@300;500' },
  hand:    { css: '"Caveat", "Mali", cursive', google: 'Caveat:wght@500;700&family=Mali:wght@400;600' },
  mono:    { css: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }
};
const loadedFonts = new Set();
function loadFont(name) {
  const f = FONTS[name];
  if (!f || !f.google || loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
  document.head.append(l);
}

// ---------- Site style (from Site settings) ----------
const SIZES = { small: '1rem', medium: '1.12rem', large: '1.25rem', 'x-large': '1.4rem' };
function applySiteStyle(style = {}) {
  const root = document.documentElement.style;
  const font = FONTS[style.font] ? style.font : 'serif';
  loadFont(font);
  root.setProperty('--font-main', FONTS[font].css);
  root.setProperty('--base-size', SIZES[style.textSize] || SIZES.medium);
  if (/^#[0-9a-f]{3,8}$/i.test(style.accent || '')) root.setProperty('--accent', style.accent);
  if (/^#[0-9a-f]{3,8}$/i.test(style.highlight || '')) root.setProperty('--highlight', style.highlight);
}

// ---------- Reader preferences (A− / A+ / font) ----------
const pref = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
};
function applyReaderPrefs() {
  const scale = parseFloat(pref.get('readerScale', '1')) || 1;
  document.documentElement.style.setProperty('--reader-scale', scale);
  const f = pref.get('readerFont', '');
  if (f && FONTS[f]) { loadFont(f); document.documentElement.style.setProperty('--font-reader', FONTS[f].css); }
  else document.documentElement.style.removeProperty('--font-reader');
}
applyReaderPrefs();

function readerToolbar() {
  return `
    <div class="reader-tools" role="group" aria-label="Reading settings">
      <button data-act="smaller" title="Smaller text">A−</button>
      <button data-act="bigger" title="Bigger text">A+</button>
      <select data-act="font" title="Font">
        <option value="">Default font</option>
        <option value="serif">Serif</option>
        <option value="sans">Sans-serif</option>
        <option value="rounded">Rounded</option>
      </select>
    </div>`;
}
function wireReaderToolbar() {
  const box = app.querySelector('.reader-tools');
  if (!box) return;
  const sel = box.querySelector('select');
  sel.value = pref.get('readerFont', '');
  box.onclick = e => {
    const act = e.target.dataset.act;
    if (act !== 'smaller' && act !== 'bigger') return;
    let s = parseFloat(pref.get('readerScale', '1')) || 1;
    s = Math.min(1.8, Math.max(0.75, s + (act === 'bigger' ? 0.1 : -0.1)));
    pref.set('readerScale', s.toFixed(2));
    applyReaderPrefs();
  };
  sel.onchange = () => { pref.set('readerFont', sel.value); applyReaderPrefs(); };
}

// ---------- Text formatting codes ----------
// Typed in the editor as e.g. [red]text[/red], ==highlight==, [big]text[/big], [center]…[/center]
const COLOR_NAMES = ['red', 'blue', 'green', 'purple', 'orange', 'pink', 'gray', 'grey', 'gold', 'teal'];
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i;
function applyFormatting(md) {
  const open = (tag, arg) => {
    tag = tag.toLowerCase();
    if (COLOR_NAMES.includes(tag)) return `<span class="c-${tag === 'grey' ? 'gray' : tag}">`;
    switch (tag) {
      case 'color': return SAFE_COLOR.test(arg || '') ? `<span style="color:${arg}">` : '<span>';
      case 'hl': return SAFE_COLOR.test(arg || '') ? `<mark style="background:${arg}">` : '<mark>';
      case 'big': case 'huge': case 'small': case 'u': return `<span class="t-${tag}">`;
      case 'font': loadFont((arg || '').toLowerCase()); return FONTS[(arg || '').toLowerCase()] ? `<span class="f-${arg.toLowerCase()}">` : '<span>';
      case 'spoiler': return '<span class="spoiler" tabindex="0" title="Tap to reveal">';
      case 'center': case 'right': return `\n\n<div class="align-${tag}">\n\n`;
    }
    return null;
  };
  const close = tag => {
    tag = tag.toLowerCase();
    if (tag === 'center' || tag === 'right') return '\n\n</div>\n\n';
    if (tag === 'hl') return '</mark>';
    return '</span>';
  };
  const known = [...COLOR_NAMES, 'color', 'hl', 'big', 'huge', 'small', 'u', 'font', 'spoiler', 'center', 'right'].join('|');
  return md
    .replace(new RegExp(`\\\\?\\[(${known})(?:=([^\\]\\s]+))?\\\\?\\]`, 'gi'), (m, t, a) => open(t, a) ?? m)
    .replace(new RegExp(`\\\\?\\[\\/(${known})\\\\?\\]`, 'gi'), (m, t) => close(t))
    .replace(/==([^=\n][^\n]*?)==/g, '<mark>$1</mark>');
}

// Drop hidden chapters, then empty stories, sections and games.
function prune(data) {
  data.games = (data.games || []).map(g => ({
    ...g,
    sections: (g.sections || []).filter(sec => !sec.hidden).map(sec => ({
      ...sec,
      stories: (sec.stories || [])
        .map(s => ({ ...s, chapters: (s.chapters || []).filter(c => !c.hidden) }))
        .filter(s => !s.hidden && s.chapters.length)
    })).filter(sec => sec.stories.length)
  })).filter(g => g.sections.length);

  for (const g of data.games)
    for (const sec of g.sections)
      for (const s of sec.stories) stories[`${g.id}/${s.id}`] = { game: g, section: sec, story: s };
  return data;
}

function coverHTML(g, s, cls) {
  return s.cover
    ? `<img class="${cls}" src="${esc(resolveImg(s.cover))}" alt="" loading="lazy">`
    : `<div class="${cls} placeholder">${esc(s.title.slice(0, 1))}</div>`;
}

// ---------- Views ----------
function renderHome() {
  document.title = site.title;

  // Latest updates: newest dated chapters across everything
  const updates = [];
  for (const { game, story } of Object.values(stories))
    for (const c of story.chapters) if (c.date) updates.push({ game, story, c });
  updates.sort((a, b) => b.c.date.localeCompare(a.c.date));

  const showGameTitles = site.games.length > 1;

  app.innerHTML = `
    ${site.intro ? `<p class="intro">${esc(site.intro)}</p>` : ''}

    ${updates.length ? `
      <section class="updates">
        <h2>Latest updates</h2>
        <ul>
          ${updates.slice(0, site.latestCount || 8).map(({ game, story, c }) => `
            <li>
              <span class="date">${esc(c.date)}</span>
              <span><span class="muted">${esc(story.title)} ·</span>
              <a href="${chapterLink(game, story, c)}">${esc(c.title)}</a></span>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    ${site.games.map(g => `
      <section class="game">
        ${showGameTitles ? `<h2 class="game-title">${esc(g.title)}</h2>` : ''}
        ${g.sections.map(sec => `
          <h3 class="section-title">${esc(sec.title)}</h3>
          ${sec.description ? `<p class="muted">${esc(sec.description)}</p>` : ''}
          <div class="story-grid">
            ${sec.stories.map(s => `
              <a class="story-card" href="${storyLink(g, s)}">
                ${coverHTML(g, s, 'card-cover')}
                <div class="card-body">
                  <strong>${esc(s.title)}</strong>
                  <span class="muted small">${s.chapters.length} chapter${s.chapters.length > 1 ? 's' : ''}${lastDate(s) ? ` · ${esc(lastDate(s))}` : ''}</span>
                </div>
              </a>`).join('')}
          </div>`).join('')}
      </section>`).join('')}

    ${site.games.length ? '' : '<p class="muted">No translations yet.</p>'}
  `;
  window.scrollTo(0, 0);
}

function renderStory(gameId, storyId) {
  const entry = stories[`${gameId}/${storyId}`];
  if (!entry) return notFound();
  const { game: g, section, story: s } = entry;
  document.title = `${s.title} · ${site.title}`;

  app.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> › ${esc(g.title)} › ${esc(section.title)}</div>
    <div class="story-head">
      ${coverHTML(g, s, 'story-cover')}
      <div>
        <h1>${esc(s.title)}</h1>
        ${s.description ? `<p>${esc(s.description)}</p>` : ''}
      </div>
    </div>
    <ol class="chapter-list">
      ${s.chapters.map(c => `
        <li>
          <a href="${chapterLink(g, s, c)}">${esc(c.title)}</a>
          ${c.date ? `<span class="date">${esc(c.date)}</span>` : ''}
        </li>`).join('')}
    </ol>
  `;
  window.scrollTo(0, 0);
}

async function renderChapter(gameId, storyId, chapterId) {
  const entry = stories[`${gameId}/${storyId}`];
  const idx = entry ? entry.story.chapters.findIndex(c => c.id === chapterId) : -1;
  if (idx < 0) return notFound();
  const { game: g, story: s } = entry;
  const c = s.chapters[idx];
  const prev = s.chapters[idx - 1];
  const next = s.chapters[idx + 1];
  const file = `content/${c.file || `chapters/${c.id}.md`}`;

  app.innerHTML = `<p class="muted">Loading…</p>`;
  let md;
  try {
    const res = await fetch(`${file}?v=${site.version || Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    md = (await res.text()).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''); // drop the settings block at the top
  } catch {
    app.innerHTML = `<p>Couldn't load <code>${esc(file)}</code>.  <a href="#/">Back to home</a></p>`;
    return;
  }

  document.title = `${c.title} · ${s.title}`;
  app.innerHTML = `
    <div class="reader-bar">
      <div class="breadcrumb"><a href="#/">Home</a> › <a href="${storyLink(g, s)}">${esc(s.title)}</a></div>
      ${readerToolbar()}
    </div>
    <article>
      <h1>${esc(c.title)}</h1>
      ${marked.parse(applyFormatting(md))}
    </article>
    <nav class="chapter-nav">
      <span>${prev ? `<a href="${chapterLink(g, s, prev)}">← ${esc(prev.title)}</a>` : ''}</span>
      <a href="${storyLink(g, s)}">Contents</a>
      <span class="next">${next ? `<a href="${chapterLink(g, s, next)}">${esc(next.title)} →</a>` : ''}</span>
    </nav>
  `;

  // Fix image paths and turn images with alt text into captioned figures
  app.querySelectorAll('article img').forEach(img => {
    img.src = resolveImg(img.getAttribute('src'));
    img.loading = 'lazy';
    const p = img.parentElement;
    if (img.alt && p.tagName === 'P' && p.childNodes.length === 1) {
      const fig = document.createElement('figure');
      fig.append(img.cloneNode());
      const cap = document.createElement('figcaption');
      cap.textContent = img.alt;
      fig.append(cap);
      p.replaceWith(fig);
    }
  });
  app.querySelectorAll('.spoiler').forEach(sp => sp.onclick = () => sp.classList.toggle('revealed'));
  wireReaderToolbar();
  window.scrollTo(0, 0);
}

function notFound() {
  app.innerHTML = `<p>Page not found. <a href="#/">Back to home</a></p>`;
}

// ---------- Router ----------
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length >= 3) renderChapter(parts[0], parts[1], parts[2]);
  else if (parts.length === 2) renderStory(parts[0], parts[1]);
  else renderHome();
}

// ---------- Init ----------
// Always fetch the newest story list (the timestamp skips any cached copy).
// Readers who keep the site open get fresh data again when they navigate after a minute.
let loadedAt = 0;
async function loadSite() {
  const text = await (await fetch(`content/index.json?t=${Date.now()}`, { cache: 'no-store' })).text();
  let data;
  try { data = JSON.parse(text); }
  catch (e) {
    app.innerHTML = `<p><strong>There's a typo in <code>content/index.json</code>.</strong></p>
      <p class="muted">${esc(e.message)}</p>`;
    throw e;
  }
  for (const k in stories) delete stories[k];
  site = prune(data);
  loadedAt = Date.now();
  applySiteStyle(site.style);
  document.getElementById('site-title').textContent = site.title;
  if (site.footer) document.getElementById('site-footer').textContent = site.footer;
}

window.addEventListener('hashchange', async () => {
  if (Date.now() - loadedAt > 60000) { try { await loadSite(); } catch {} }
  route();
});

loadSite()
  .then(route)
  .catch(() => {
    if (!site) app.innerHTML = `<p>Couldn't load <code>content/index.json</code>. If you opened this file directly, run a local server instead (see README).</p>`;
  });
