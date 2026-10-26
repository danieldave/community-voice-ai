# Community Voice AI — Build Prompt (5-Part Formula)

Built with AI by Yewa College Bytebusters (Generative AI Team & Special Student)

---

## 1. ROLE

You are a senior full-stack web developer and accessibility specialist. You are also an experienced Nigerian community leader and environmental advocate. You build safe, inclusive, mobile-first web apps for young Nigerians, and you know how formal letters are written to Nigerian government offices.

## 2. TASK

Build **Community Voice AI**, a complete website that is ready to deploy. It turns a real community problem into a polite, formal letter that the user reviews, edits and sends themselves.

**Pages**
1. **Write a Letter (home)**
   - Header with a pentagon "speech tag" logo, the title COMMUNITY VOICE AI, navigation, a 🌙 Night Mode button and an A+ Larger Text button.
   - Colourful hero: animated gradient with soft floating colour blobs, the intro text, and four feature cards (Private, Your words, For everyone, Real offices).
   - **Left column (form):**
     - a progress bar ("x of 8 done")
     - example chips that fill in the form (No water, Dark street, Bad road, Blocked drain)
     - **Problem type:** Water, Roads, Electricity/Streetlights, Waste and Drainage, Flooding, Environment and Pollution, School Facilities, Health Facility, Security, Other
     - **State:** all 36 states plus the FCT
     - **Area or community**, with the hint "Area only. Do not type your house address."
     - **How long:** Less than a week, 1 to 4 weeks, 1 to 6 months, More than 6 months
     - **Who is affected:** A few households, A whole street, A whole community, A school, Children/elderly/people with disabilities
     - **Letter is for:** LGA Chairman, State Ministry or Agency, Federal Agency, School Principal, CDA, Traditional Ruler
     - **Tone:** Polite request, Firm and urgent, Follow-up
     - **Description:** English or Pidgin, 1,000-character live counter
     - **Button:** "Write My Letter"
   - **Right column (output):**
     - an urgency pill
     - a safety note when needed
     - "Read and edit before sending. You are the author."
     - the letter in an EDITABLE, paper-styled box with a word count
     - Copy, Download .txt, Print and Start Again buttons
     - "What you can do yourselves" (2–4 safe steps)
     - "Where to send it" (official link plus state website)
     - a collapsible "See exactly what was sent to the AI"
     - a skeleton loading state, friendly error messages, and pop-up toast messages
2. **Sign Language**
   - American Sign Language (ASL), clearly labelled as ASL, with a note that Nigerian Sign Language grew from ASL (Andrew Foster, Ibadan, 1960) but some Nigerian signs differ.
   - Tabs:
     - **Words:** colourful flip cards. Greetings: Hello, Thank you, Please, Sorry. Community words: Water, Road, Light, Help, Danger, School, Hospital, Problem. The front shows an emoji and the word; the back shows a text description of the handshape and movement and an "NSL check" status.
     - **Alphabet A–Z:** fingerspelling cards with handshape descriptions; J and Z marked as moving letters.
     - **Fingerspell a word:** the user types a word, sees its letters as tiles, and can press "Play slowly" to highlight one letter at a time.
3. **How It Works**
   - the 6-step flow, the privacy explanation, a live privacy-filter tester, the guardrails, a table of official links and who the app is for.

**App logic**
- **Privacy filter (`js/privacy.js`)** runs in the browser before sending, then again on the server. It replaces with `[removed]`:
  - Nigerian phone numbers (080…, +234…)
  - emails
  - digit strings of 10 or more digits (account/BVN/NIN)
  - any name after "my name is", "I am called", "call me" or "na me be". It must not remove the next word in phrases like "call me on…".
- Join the form choices and the cleaned description into one prompt, then POST it to `/api/generate`.
- The server checks every choice against an allowed list, calls OpenAI with JSON output mode, cleans the reply, and returns JSON.
- **Urgency pill (conditional):** high → RED "Urgent", medium → AMBER "Important", low → GREEN "Can wait". Always show the word with the colour.
- Look up `office_type` in `js/directory.js` and show the official link plus the state government website. If the state's site isn't confirmed, use the federal portal.

**Night Mode**
- All colours are CSS variables, with a dark set under `:root[data-theme="dark"]`.
- It follows the phone's dark-mode setting by default; the 🌙/☀️ button switches it, and the choice is remembered (wrap localStorage in try/catch).
- A tiny script in `<head>` sets the theme before the page draws, so there is no white flash.

**AI system prompt (inside `/api/generate.js`)**
- **ROLE:** Community Voice AI, an experienced community leader helping young Nigerians raise concerns respectfully.
- **TASK:**
  - (a) rewrite the description as a correct formal Nigerian letter
  - (b) give 2–4 safe self-help steps
  - (c) choose an office type ONLY from the given list
- **AUDIENCE:** students; simple English a 12-year-old understands.
- **FORMAT:** "A Concerned Resident, [Area], [State]" / [Date] / recipient by title only / "Dear Sir/Madam," / "RE:" subject in capitals / body / "Yours faithfully, A Concerned Resident". Return ONLY this JSON:
  `{"rejected","message","urgency","urgency_reason","subject","letter","self_help_steps","office_type","safety_note"}`
- **LIMITS:** see section 5.

**Tech and deployment**
- Plain HTML, CSS and JavaScript; no framework, no build step.
- One Vercel serverless function, `/api/generate.js`, on Node 22.
- Read `OPENAI_API_KEY` and `OPENAI_MODEL` from environment variables.
- `vercel.json` with `"framework": null`, an empty `buildCommand` and an empty `installCommand`.
- `server.js` plus `npm start` for local testing; it reads `.env` and prefers IPv4. Exclude it from Vercel with `.vercelignore`.
- Include `.gitignore` (`.env`, `node_modules`), `.env.example`, `README.md` (GitHub → Vercel → Environment Variables → Redeploy) and `PROMPT.md`.

## 3. AUDIENCE

- Nigerian secondary school students and young community members who want to raise a real concern formally but are not confident writing in a formal register.
- Deaf and hard-of-hearing people, and people with speech impairments. The whole app must work without sound.
- Anyone practising formal communication.
- Most users are on Android phones with slow or expensive data.

## 4. FORMAT

**File structure**
```
/index.html  /sign-language.html  /how-it-works.html
/css/style.css
/js/app.js  /js/privacy.js  /js/directory.js  /js/signs.js  /js/common.js
/assets/logo.svg  /assets/signs/
/api/generate.js
server.js  package.json  vercel.json  .vercelignore  .gitignore  .env.example  README.md  PROMPT.md
```

**Design**
- Colours: royal purple (primary), gold (accents and buttons) and indigo (header, footer, dark areas), plus bright accent colours (pink, teal, orange, blue) for cards, chips and gradients.
- Nunito font from Google Fonts. Rounded cards with a rainbow top stripe, gradient buttons, emoji icons, smooth animations.
- Mobile-first: one column at 360px, two columns on desktop, no sideways scrolling.
- Accessibility: WCAG AA contrast in both day and night mode, no white text on gold, visible labels on every field, text-based error messages, keyboard use with visible focus outlines, ARIA labels, a skip link, and animations turned off when the device asks for reduced motion.

**Footer (every page)**
- "Built with AI by Yewa College Bytebusters (Generative AI Team & Special Student)"
- a small line: "Last verified: [date]" and "In an emergency, call 112."

## 5. LIMITS

- **No personal data:** no sign-up, no database, no cookies; nothing is saved on the server. Never ask for or repeat names, phone numbers, addresses or ages. Ignore `[removed]` markers.
- **No names, blame or insults:** report the problem, not a person. Stay polite and respectful to officials, even in "Firm and urgent" tone.
- **No made-up facts:** do not invent statistics, dates, laws, people or organisations. Use only the user's facts. If unsure, leave it out (no "non-sure" output).
- **No wrong organisations:** suggest only office types from the list, never one outside the user's area, and never a made-up person.
- **No wrong formal letter:** always follow the formal letter format above.
- **Real government links only:** only official `.gov.ng` sites that have been checked. Never guess or build a URL; leave it empty if not confirmed. Every link must be checked by hand before launch.
- **Safety:** if there is danger to life (live wires, a collapsed bridge, flooding, fire, a disease outbreak, a crime in progress), set urgency to high and say "If anyone is in immediate danger, call 112 (Nigeria's emergency number) first." Self-help steps must never involve touching wires, entering floodwater, confronting people or dangerous repairs.
- **Abuse or non-problems:** return a polite message asking for a real community concern.
- **Sign language honesty:** label ASL as ASL. Do not present it as Nigerian Sign Language. Do not draw or invent sign images; use text descriptions, and add videos only from qualified signers.
- **Security:** the API key must never appear in the browser or the repository.
