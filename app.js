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
    const res = await fetch(file);
    if (!res.ok) throw new Error(res.status);
    md = (await res.text()).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''); // drop the settings block at the top
  } catch {
    app.innerHTML = `<p>Couldn't load <code>${esc(file)}</code>.  <a href="#/">Back to home</a></p>`;
    return;
  }

  document.title = `${c.title} · ${s.title}`;
  app.innerHTML = `
    <div class="breadcrumb"><a href="#/">Home</a> › <a href="${storyLink(g, s)}">${esc(s.title)}</a></div>
    <article>
      <h1>${esc(c.title)}</h1>
      ${marked.parse(md)}
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
fetch('content/index.json', { cache: 'no-cache' })
  .then(r => r.text())
  .then(text => {
    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      app.innerHTML = `<p><strong>There's a typo in <code>content/index.json</code>.</strong></p>
        <p class="muted">${esc(e.message)}</p>
        <p class="muted">Common causes: a missing comma between items, an extra comma after the last item, or a missing quote. Paste the file into jsonlint.com to find it.</p>`;
      return;
    }
    site = prune(data);
    document.getElementById('site-title').textContent = site.title;
    if (site.footer) document.getElementById('site-footer').textContent = site.footer;
    window.addEventListener('hashchange', route);
    route();
  })
  .catch(() => {
    app.innerHTML = `<p>Couldn't load <code>content/index.json</code>. If you opened this file directly, run a local server instead (see README).</p>`;
  });
