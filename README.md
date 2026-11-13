# Game Story Translations

A free story-translation website with a built-in editor at **`/admin/`**.
Add chapters, paste text, upload images and hide/show things with buttons. No code needed after setup.

---

## One-time setup (about 10 minutes)

### 1. Upload the files to a new GitHub repository
1. Create a new **public** repository on GitHub (e.g. `stories`).
2. Click **uploading an existing file**, select **everything** inside this folder and drag it in, then **Commit changes**.
   - ⚠️ There's a hidden folder called **`.github`** that must be uploaded too. On a Mac, press **Cmd + Shift + .** in Finder to show hidden files before selecting. On Windows it's visible already.
   - Check: your repo should list `.github`, `admin`, `content`, `app.js`, `build.js`, `index.html`, `style.css`, `README.md`.

### 2. Turn on GitHub Pages
Repo → **Settings** → **Pages** → under **Source** choose **GitHub Actions**. (Not "Deploy from a branch".)

Then go to the **Actions** tab. If you see a "Publish site" run, wait for the green ✓. If nothing has run yet, click **Publish site** → **Run workflow**.

Your site is now at `https://YOUR-USERNAME.github.io/stories/`.

### 3. Create your editor key (access token)
The editor needs permission to save into your repository.

1. On GitHub: your profile picture → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `Story editor`. Expiration: pick a date (you'll make a new one when it expires).
3. **Repository access** → **Only select repositories** → choose your stories repo.
4. **Permissions** → **Repository permissions** → **Contents** → **Read and write**.
5. **Generate token** and copy it. (GitHub only shows it once. If you lose it, just make a new one.)

### 4. Open the editor
Go to `https://YOUR-USERNAME.github.io/stories/admin/` → **Sign In Using Access Token** → paste the token.
(The "Sign In with GitHub" button needs extra server setup. Use the token button instead.)

Bookmark this page. The browser remembers you, so you only paste the token once per browser.

---

## Using the editor

The left menu has five lists:

| List | What it is |
|---|---|
| **Chapters** | The translated text. This is where you'll spend most of your time. |
| **Stories** | A book, event or character story that chapters belong to. |
| **Sections** | Groups on the home page: Main Story, Events, Character Stories, Sparkrider Stories… |
| **Games** | Only needed if you translate more than one game. |
| **Site settings** | Site title, intro text and footer. |

### Add a chapter
**Chapters → New Chapter** → type the title → pick the **Story** → set the **Chapter number** (its order) → paste the text → **Save**.
The site updates by itself in 1–2 minutes.

### Start a new event / book / character story
**Stories → New Story** → title, pick the **Section**, add a cover image if you like → **Save**. Then add chapters to it.

### Hide or show something
Open it and flip **Hide this chapter / story / section** → **Save**.

Things also hide **automatically** when they have nothing to show: a story with no visible chapters, or a section with no visible stories, won't appear. So you can set up "Sparkrider Stories" now and it'll appear once you add its first chapter.

### Images
- **Inside a chapter:** click the **image** button in the text toolbar → upload → it's inserted where your cursor is.
- **Story cover:** use the **Cover image** field on the story. Portrait images (3:4, e.g. 600×800) look best.
- Keep images under ~500 KB so pages load fast. squoosh.app shrinks them for free.

### Formatting tips
- Speaker names: make them **bold**, e.g. **Aria:** Hello there. They show in the accent color.
- Narration / scene text: use the **quote** style.
- Scene break: a line with just `---`.

### The home page
Builds itself: **Latest updates** (newest chapter dates first), then each section with its stories.

---

## If something goes wrong
- **Site didn't update:** check the **Actions** tab. A red ✗ means the build failed; click it to see why. A green ✓ means it worked, so refresh your site (Ctrl/Cmd + Shift + R).
- **Editor says it can't find the repository:** make sure your token has access to this repo with Contents → Read and write.
- **Hosting somewhere other than github.io** (e.g. a custom domain or Vercel): open `admin/config.js` and replace `YOUR-USERNAME/YOUR-REPO-NAME` with your GitHub username/repository.

## For the curious: how it works
Each save in the editor commits a file to your repo (`content/chapters/*.md`, `content/stories/*.json`…). A GitHub Action (`.github/workflows/deploy.yml`) then runs `build.js`, which assembles `content/index.json`, and publishes the site. The editor is the free, open-source Sveltia CMS.
