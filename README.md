# Community Voice AI

Built by Nigerian secondary school students. Community Voice AI helps young people turn a real community problem (no clean water, a broken road, a dark street) into a polite, formal letter. The user picks who it is for and the tone, the AI drafts it, and the user edits it. **The user is always the author.**

## What's inside

| File | What it does |
|---|---|
| `index.html` | Letter writer (main page): form on the left, editable letter on the right |
| `sign-language.html` | Nigerian Sign Language page (videos added only after checking with a qualified signer) |
| `how-it-works.html` | How it works, privacy, guardrails, live privacy-filter tester, official links |
| `css/style.css` | Purple, gold and indigo design |
| `js/app.js` | Form, validation, rendering, urgency pill (red / amber / green) |
| `js/privacy.js` | Privacy filter (used in the browser AND on the server) |
| `js/directory.js` | Checked list of official `.gov.ng` websites |
| `js/signs.js` | Sign language content (fill in videos here) |
| `js/common.js` | Larger-text button and "last verified" date |
| `api/generate.js` | Server function that talks to OpenAI. The API key stays here, hidden. |

---

## Put it online (GitHub + Vercel) — step by step

### A. Upload to GitHub
1. Unzip `community-voice-ai.zip` on your computer.
2. Go to <https://github.com> and sign in (or create a free account).
3. Click **+** (top right) → **New repository**. Name it `community-voice-ai`. Choose **Public** or **Private**. Click **Create repository**.
4. On the next page click **uploading an existing file**.
5. Open the unzipped folder, select **everything inside it** (not the folder itself) and drag it into the GitHub page.
   - Hidden files like `.gitignore` may not show on some computers. That is okay — the site still works.
6. Click **Commit changes**.

### B. Import into Vercel
1. Go to <https://vercel.com> and click **Sign Up / Log in with GitHub**.
2. Click **Add New… → Project**.
3. Find `community-voice-ai` in the list and click **Import**.
4. Leave **Framework Preset** as **Other**. Do not change the build settings.

### C. Add your secret settings (Environment Variables)
Before clicking Deploy, open **Environment Variables** and add these two:

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | Your key from <https://platform.openai.com/api-keys> (starts with `sk-`) |
| `OPENAI_MODEL` | The name of the latest model on your OpenAI account, exactly as OpenAI writes it (check <https://platform.openai.com/docs/models>) |

> ⚠️ Never paste your API key into any file, chat, or GitHub. Only put it in Vercel.

Click **Deploy**. After about a minute you will get a link like `community-voice-ai.vercel.app`. Share it with everyone!

### D. Redeploy after changes
- If you change a setting in **Settings → Environment Variables**, go to **Deployments**, click the **⋯** on the latest one, and choose **Redeploy**.
- If you upload new files to GitHub, Vercel redeploys automatically.

---

## Before launch: checklist
- [ ] Open every link on the **How It Works** page and confirm it is the official site. Update `LAST_VERIFIED` in `js/directory.js`.
- [ ] To add more states, open the state's official website, confirm it, and put the address in `STATES` in `js/directory.js`. **Never guess an address.**
- [ ] The Federal Ministry of Water Resources and Sanitation link is empty on purpose — we could not confirm its website. Add it only after checking.
- [ ] Record Nigerian Sign Language videos with a qualified signer and add them in `js/signs.js` (instructions are at the top of that file).
- [ ] Test on a phone: fill the form, write a letter, copy, download, print.
- [ ] Try the privacy filter on the How It Works page.
- [ ] Set a monthly spending limit on your OpenAI account (Settings → Limits) so the site never costs more than you planned.

## Changing an office type
The list of office types appears in **two** places: `js/directory.js` (`OFFICES`) and `api/generate.js` (`OFFICE_TYPES`). If you add or rename one, change both.

## Privacy
No sign-up, no database, no cookies. The privacy filter removes phone numbers, emails, long ID/account numbers and names after "my name is" — first in the browser, then again on the server. Users can see exactly what was sent to the AI.
