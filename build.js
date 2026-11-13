// Builds content/index.json from the files the editor creates.
// Runs automatically on GitHub every time you save. You don't need to run it yourself.
//
//   content/settings.json        site title, intro, footer
//   content/games/*.json         games (optional: skip if you only translate one game)
//   content/sections/*.json      Main Story, Events, Character Stories…
//   content/stories/*.json       a book / event / character story
//   content/chapters/*.md        chapter text, with title/story/number/date/hidden at the top

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const C = path.join(__dirname, 'content');
const warnings = [];

const slugOf = f => path.basename(f).replace(/\.(json|md)$/, '');
const readDir = (dir, ext) => {
  const d = path.join(C, dir);
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(ext)).sort() : [];
};
const readJson = (dir) => readDir(dir, '.json').map(f => {
  try { return { id: slugOf(f), ...JSON.parse(fs.readFileSync(path.join(C, dir, f), 'utf8')) }; }
  catch (e) { warnings.push(`Skipped ${dir}/${f}: ${e.message}`); return null; }
}).filter(Boolean);

const toDate = v => v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : '';
const byOrder = (a, b) =>
  (a.number ?? 9999) - (b.number ?? 9999) || String(a.title).localeCompare(String(b.title));

// ---- Read everything ----
const settings = fs.existsSync(path.join(C, 'settings.json'))
  ? JSON.parse(fs.readFileSync(path.join(C, 'settings.json'), 'utf8')) : {};
const games = readJson('games');
const sections = readJson('sections');
const stories = readJson('stories');
const chapters = readDir('chapters', '.md').map(f => {
  const text = fs.readFileSync(path.join(C, 'chapters', f), 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  let meta = {};
  try { meta = m ? yaml.load(m[1]) || {} : {}; }
  catch (e) { warnings.push(`Skipped chapters/${f}: ${e.message}`); return null; }
  return { id: slugOf(f), file: `chapters/${f}`, ...meta, date: toDate(meta.date) };
}).filter(Boolean);

// ---- Fallbacks so nothing gets lost ----
const DEFAULT_GAME = '__default';
if (!games.length || sections.some(s => !games.find(g => g.id === s.game)))
  games.push({ id: DEFAULT_GAME, title: settings.title || 'Stories', number: 99999 });
const OTHER = '__other';
if (stories.some(s => !sections.find(sec => sec.id === s.section)))
  sections.push({ id: OTHER, title: 'Other', number: 99999, game: games[0].id });

// ---- Assemble ----
const out = {
  title: settings.title || 'Game Story Translations',
  intro: settings.intro || '',
  footer: settings.footer || '',
  latestCount: settings.latestCount || 8,
  style: {
    font: settings.font || 'serif',
    textSize: settings.textSize || 'medium',
    accent: settings.accentColor || '',
    highlight: settings.highlightColor || ''
  },
  games: games.sort(byOrder).map(g => ({
    id: g.id === DEFAULT_GAME ? 'stories' : g.id,
    title: g.title,
    sections: sections
      .filter(sec => (games.find(x => x.id === sec.game) ? sec.game : DEFAULT_GAME) === g.id)
      .sort(byOrder)
      .map(sec => ({
        title: sec.title,
        description: sec.description || '',
        hidden: !!sec.hidden,
        stories: stories
          .filter(s => (sections.find(x => x.id === s.section) ? s.section : OTHER) === sec.id)
          .sort(byOrder)
          .map(s => ({
            id: s.id,
            title: s.title,
            description: s.description || '',
            cover: s.cover || '',
            hidden: !!s.hidden,
            chapters: chapters
              .filter(c => c.story === s.id)
              .sort((a, b) => byOrder(a, b) || a.date.localeCompare(b.date))
              .map(c => ({ id: c.id, title: c.title || c.id, date: c.date, hidden: !!c.hidden, file: c.file }))
          }))
      }))
  }))
};

for (const c of chapters)
  if (!stories.find(s => s.id === c.story)) warnings.push(`Chapter "${c.title}" isn't linked to an existing story, so it won't show.`);

fs.writeFileSync(path.join(C, 'index.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`Built content/index.json: ${stories.length} stories, ${chapters.length} chapters.`);
warnings.forEach(w => console.warn('⚠ ' + w));
