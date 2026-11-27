# Community Voice AI

Built by Nigerian secondary school students. Community Voice AI helps young people turn a real community problem (no clean water, a broken road, a dark street) into a polite, formal letter. The user picks who it is for and the tone, the AI drafts it, and the user edits it. **The user is always the author.**

**New in version 4 (by the ByteBusters team at Yewa College):** see also `/whats-new/`.

| Feature | What it does | Data collected | Where |
|---|---|---|---|
| **Letter tracker, upgraded** | Status Sent / Acknowledged / Resolved, reminder after 7–30 days, calendar reminder as an `.ics` file, one-tap follow-up draft written on the phone (no AI, no internet), "Add a letter I sent somewhere else" | Nothing on the server (phone only) | `letters.html`, `js/tracker.js` |
| **Petitions** | "Make it a petition" from any saved letter. Neighbours add a **first name + area** with an online link, or on one phone. Signature list as a PDF (made in the browser, no library) or printed | Online mode: title, request, letter (phones/emails hidden), first name + area of each signer, 180 days, deletable by the creator. Phone mode: nothing | `petition.html`, `js/petition.js`, `js/petition-words.js`, `api/issues.js` (no new function) |
| **Who to send it to (Ogun State)** | All 20 Ogun LGAs: LGA chairman, secretary, councillor, ward committee, LGEA, CDA, traditional ruler, state ministries, Assembly member, DPO, PCRC, police PRO, IBEDC customer care, NERC forum office. Office titles and "address the letter to" only, each with a **verify locally** note. Users fill in checked details (kept on the phone) and can share a checked list as a file | Phone only | `who-to-send-to.html`, `js/ogun-offices.js`, `js/who.js` |

Petition safety without a moderator: first name must be one word of letters, area cannot contain long numbers, a profanity filter (English, Pidgin, Yoruba) runs in the browser and on the server, 20 signatures and 3 new petitions per visitor per hour, 500 signatures per petition, one signature per first name + area. Without the Upstash database the page offers only "Collect on this phone".

**Admin: filling in real office contacts.** `js/ogun-offices.js` has an empty `KNOWN` list. Add an address, phone or email there **only after checking it in person or on an official .gov.ng site**, with `checkedOn` and `source` (the tests refuse entries without them). Never copy numbers from social media. The site still tells users to verify locally.

The site still has 4 server functions (Vercel Hobby allows 12).

**Version 3: the Civic Guide library.** `tools/library.js` holds 30 community problems, 11 offices and 8 how-to guides. `node tools/build.js` turns them into real pages: "Who do I report ___ to in Nigeria?" (`/report/`), "How to write a letter to ___" (`/offices/`) and step-by-step guides (`/how-to/`), each with the right kind of office, the evidence to collect and a sample opening. The guides never print phone numbers or names of office holders, because those change. To add a page: add an entry, run the build, then `node tools/test.js`. Search Console codes go in `tools/site.json`.

## New in version 2

| Upgrade | What it does | Where |
|---|---|---|
| **Follow-up Tracker** | Press "I have sent this letter" to save the date, office and reference. After 14 days a banner reminds you, and one tap writes a polite follow-up that mentions the first letter | `letters.html`, `js/tracker.js` |
| **Community copy** | The official letter stays in English; you also get a short copy in one of 16 Nigerian languages to read out at community meetings | `api/generate.js`, `js/app.js` |
| **Photos (coming soon)** | The photo button is built but locked | `index.html` |
| **Ready to scale** | Only our website can call the AI, 25 letters per hour per visitor, the same request twice costs nothing, 20-second timeout | `api/_lib/shared.js` |
| **SEO, AEO, GEO** | Page addresses, social preview, FAQ with labels for answer engines, sitemap, robots.txt that welcomes AI search, `llms.txt` | all pages |
| **Tests** | `npm test` runs 13 checks with no key and no cost | `tools/test.js` |

`OPENAI_MODEL` is now optional (default `gpt-4o-mini`).

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
| `js/tracker.js` | Follow-up Tracker: saves sent letters on the phone, counts days, prepares follow-ups |
| `letters.html` | My Letters page |

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
No sign-up, no accounts, no cookies. My Letters, reminders and directory notes stay on the phone. Optional server storage only for the officials' inbox, the Issue Map counters and online petitions (see above). The privacy filter removes phone numbers, emails, long ID/account numbers and names after "my name is" — first in the browser, then again on the server. Users can see exactly what was sent to the AI.

## Issue Map
`/issues.html` + `api/issues.js`: an opt-in tick box on the letter form adds only the **state and problem type** to monthly counters in the Upstash database. No letter text, no area. Counts under 3 are hidden. Without the database the page says it is not switched on.

## Officials' inbox (`/inbox.html` + `api/inbox.js`)
- When a citizen saves a sent letter, they may tick **"put a copy in the officials' inbox"**. The letter is stored (phone numbers and emails hidden) for 400 days and the citizen gets an 8-character **tracking code**.
- The inbox shows each letter with how it reached the office: **by hand or by post** (came to the office) or **by email, website or WhatsApp** (came online).
- An official answers with one tap: received, looking into it, work planned, solved, or passed to the right office, plus a short message. The citizen sees the answer in **My Letters**.
- **Each office sees only its own letters.** The letter form asks for the Local Government Area (all 774 LGAs, from INEC's official list in `js/lgas.js`). Scopes (in `js/office-roles.js`):
  - a **Local Government** (e.g. code `OG.05`, Yewa South) sees every letter from its LGA;
  - a **State office** (Works, Water, Environment, Emergency, Power, Education, Health, Security) sees only its problem types in its state;
  - the **Governor's office** (`OG#GOV`) sees its whole state;
  - a **Federal office** (FERMA, NEMA, NERC, NESREA, Police, NCDC and others) sees its problem types in every state; the **Federal Desk** (`NG`) sees everything.
  Letters where the citizen chose "I am not sure" of the LGA go to the state and federal offices only.
- **Keys:** made on the owner's own device with `tools/office-key-maker.html` (offline, never deployed). It makes one unguessable 24-character key per office (about 119 bits) and the value for the Vercel setting `ADMIN_KEYS`. That value holds only a 20-character SHA-256 fingerprint of each key with its scope, e.g. `3f9a0c…e1:OG.05,7b21d4…9c:OG#WAT`, so the keys themselves are never stored anywhere online. A full set (1,117 offices) is about 30 KB; Vercel allows 64 KB for all settings together. Run `node tools/build.js` to rebuild the key maker after changing the LGA list.
- The old hand-written form still works for tests: `{"a-key-of-16-or-more": {"name": "Test Office", "state": "Ogun", "lga": "Yewa South (Egbado South)"}}`.
- Needs the Upstash database (`KV_REST_API_*`).

## Language button (`js/translate.js` + `api/translate.js`)
- **Whole site:** pick one of 17 languages and every page is shown in it. Each sentence is translated by AI once, then saved in the database, so it is not paid for again.
- **Any text:** up to 500 letters, 10 times an hour per visitor.
- Translations are made by AI and are labelled so on the page. Ask a native speaker to check before relying on them.
