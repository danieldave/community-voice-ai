#!/usr/bin/env node
/* Community Voice AI — checks the letter API, the follow-up feature and SEO. No key or money needed. */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let passed = 0;
const ok = (n, f) => Promise.resolve().then(f).then(() => { passed++; console.log('  ✓', n); });
function call(h, { body = {}, origin = 'https://community-voice-ai-ziry.vercel.app', ip = '1.1.1.1', method = 'POST' } = {}) {
  return new Promise(r => { const res = { headers: {}, code: 200, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(d) { r({ code: this.code, data: d }); }, end() { r({ code: this.code }); } };
    h({ method, body, headers: { origin, host: 'community-voice-ai-ziry.vercel.app', 'x-forwarded-for': ip } }, res); });
}
let calls = 0, lastUser = '', lastSystem = '';
global.fetch = async (url, opts) => {
  calls++; const b = JSON.parse(opts.body); lastSystem = b.messages[0].content; lastUser = b.messages[1].content;
  const out = { rejected: false, message: '', urgency: 'high', urgency_reason: 'x', subject: 'RE: TEST', letter: 'Dear Sir/Madam, call 08031234567', self_help_steps: ['a', 'b'], office_type: 'Local Government Council', safety_note: '', community_copy: 'Ẹ̀yin ará àdúgbò…' };
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(out) } }] }) };
};
const FORM = { problemType: 'Water', state: 'Ogun', area: 'Ilaro', duration: '1 to 6 months', affected: 'A whole community', recipient: 'Local Government Chairman', tone: 'Polite request', description: 'The public borehole has been broken for two months and families buy water.' };
(async () => {
  console.log('Letter API (api/generate.js)');
  delete process.env.OPENAI_API_KEY;
  const gen = require('../api/generate');
  await ok('without a key the AI is switched off (503)', async () => assert.strictEqual((await call(gen, { body: FORM })).code, 503));
  process.env.OPENAI_API_KEY = 'test';
  await ok('a strange website is blocked (403)', async () => assert.strictEqual((await call(gen, { body: FORM, origin: 'https://evil.example' })).code, 403));
  await ok('missing fields are refused before paying for the AI (400)', async () => { const b = calls; assert.strictEqual((await call(gen, { body: { ...FORM, state: 'Atlantis' } })).code, 400); assert.strictEqual(calls, b); });
  await ok('writes a letter; phone numbers in the reply are removed', async () => {
    const r = await call(gen, { body: FORM }); assert.strictEqual(r.code, 200); assert.ok(!r.data.letter.includes('08031234567'));
    assert.strictEqual(r.data.community_copy, '', 'no copy unless a language is chosen');
  });
  await ok('community copy in Yoruba when asked', async () => {
    const r = await call(gen, { body: { ...FORM, communityLang: 'yo' } });
    assert.ok(lastUser.includes('COMMUNITY LANGUAGE: Yoruba')); assert.ok(r.data.community_copy.length > 0); assert.strictEqual(r.data.community_lang, 'yo');
  });
  await ok('follow-up details of the first letter reach the AI', async () => {
    await call(gen, { body: { ...FORM, tone: 'Follow-up (we wrote before)', followUp: { sentOn: '2026-10-28', how: 'by hand', office: 'Yewa South LG', reference: 'LG/114' } } });
    assert.ok(lastUser.includes('FIRST LETTER: sent on 2026-10-28 to Yewa South LG by hand') && lastUser.includes('reference: LG/114'));
  });
  await ok('a bad follow-up date is ignored', async () => { await call(gen, { body: { ...FORM, description: FORM.description + ' x', followUp: { sentOn: 'yesterday' } } }); assert.ok(!lastUser.includes('FIRST LETTER')); });
  await ok('the same request twice is answered from memory', async () => { const b = calls; const r = await call(gen, { body: FORM }); assert.ok(r.data.cached); assert.strictEqual(calls, b); });
  await ok('fair-use limit: 25 letters per hour', async () => { let last; for (let i = 0; i < 26; i++) last = await call(gen, { ip: '9.9.9.9', body: { ...FORM, description: FORM.description + i } }); assert.strictEqual(last.code, 429); });
  await ok('the 112 safety rule and the no-names rule are still in the prompt', () => { assert.ok(lastSystem.includes('112')); assert.ok(/Never name a real person/.test(lastSystem)); });

  console.log('SEO / AEO / GEO');
  await ok('every page has a title, description, canonical and valid JSON-LD', () => {
    ['index.html', 'how-it-works.html', 'sign-language.html', 'letters.html', 'who-to-send-to.html', 'petition.html', 'whats-new/index.html'].forEach(f => {
      const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.ok(/<link rel="canonical" href="https:\/\/community-voice-ai-ziry\.vercel\.app\//.test(h), f);
      const d = (h.match(/<meta name="description" content="([^"]*)">/) || [])[1] || ''; assert.ok(d.length >= 50 && d.length <= 170, f + ' ' + d.length);
      [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].forEach(m => JSON.parse(m[1]));
    });
  });
  await ok('FAQ is visible and labelled (AEO); robots, sitemap and llms.txt exist (GEO)', () => {
    const h = fs.readFileSync(path.join(ROOT, 'how-it-works.html'), 'utf8'); assert.ok(h.includes('"FAQPage"') && h.includes('id="faq"'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8').includes('GPTBot'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').includes('<loc>'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').startsWith('# Community Voice AI'));
  });
  await ok('photo upload is built but locked (coming soon)', () => { const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); assert.ok(/id="photos"[^>]*disabled/.test(h) && h.includes('Coming soon')); });
  await ok('civic guides: every problem, office and how-to has a page with a quick answer and schema; no phone numbers', () => {
    const L = require('./library'); const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    const types = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<option value="([^"]+)">/g)].map(m => m[1]);
    assert.ok(L.PROBLEMS.length >= 30);
    L.PROBLEMS.forEach(p => {
      assert.ok(types.includes(p[2]), p[0] + ' type must match the form: ' + p[2]);
      assert.ok(!/\b0[789]\d{9}\b|\+234/.test(p.flat().join(' ')), p[0]);
      const h = fs.readFileSync(path.join(ROOT, 'report', p[0], 'index.html'), 'utf8');
      assert.ok(h.includes('Quick answer') && h.includes('"FAQPage"') && (h.match(/<h1/g) || []).length === 1 && (h.match(/rel="canonical"/g) || []).length === 1, p[0]);
      assert.ok(sm.includes('/report/' + p[0] + '/'), p[0]);
    });
    L.OFFICES.forEach(o => assert.ok(fs.existsSync(path.join(ROOT, 'offices', o[0], 'index.html')), o[0]));
    L.HOWTO.forEach(o => assert.ok(fs.existsSync(path.join(ROOT, 'how-to', o[0], 'index.html')), o[0]));
  });
  console.log('\nIssue Map (api/issues.js)');
  const iss = require('../api/issues');
  const formStates = [...fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<option value="([^"]+)">/g)].map(m => m[1]);
  await ok('its states and problem types match the letter form', async () => {
    const dir = fs.readFileSync(path.join(ROOT, 'js', 'directory.js'), 'utf8'); iss.TYPES.forEach(t => assert.ok(formStates.includes(t), t)); iss.STATES.forEach(x => assert.ok(dir.includes('"' + x + '":'), x));
  });
  delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  await ok('without a database it says live:false and counts nothing', async () => {
    assert.strictEqual((await call(iss, { method: 'GET' })).data.live, false);
    const r = await call(iss, { body: { state: iss.STATES[0], type: iss.TYPES[0] } }); assert.strictEqual(r.data.counted, false);
  });
  await ok('made-up labels are refused (400)', async () => {
    assert.strictEqual((await call(iss, { body: { state: 'Atlantis', type: iss.TYPES[0] } })).code, 400);
    assert.strictEqual((await call(iss, { body: { state: iss.STATES[0], type: 'my street is Adeola Road' } })).code, 400);
  });
  await ok('a strange website is blocked (403)', async () => assert.strictEqual((await call(iss, { method: 'GET', origin: 'https://evil.example' })).code, 403));
  process.env.KV_REST_API_URL = 'https://db.example'; process.env.KV_REST_API_TOKEN = 't';
  const realFetch = global.fetch; let sent = null;
  global.fetch = async (u, o) => { const c = JSON.parse(o.body); if (c[0][0] === 'HGETALL') { return { ok: true, json: async () => c.map((_, i) => ({ result: i ? [] : ['total', '9', 's:Ogun', '5', 's:Lagos', '2', 't:Water', '5', 'c:Ogun|Water', '5', 'c:Lagos|Water', '2'] })) }; } sent = c; return { ok: true, json: async () => c.map(() => ({ result: 1 })) }; };
  await ok('only the state and type are written, nothing else', async () => {
    const r = await call(iss, { body: { state: 'Ogun', type: 'Water', area: 'Ilaro', description: 'secret words' }, ip: '9.9.9.9' });
    assert.strictEqual(r.data.counted, true); const flat = JSON.stringify(sent);
    assert.ok(!flat.includes('Ilaro') && !flat.includes('secret')); assert.ok(sent.every(c => ['HINCRBY', 'EXPIRE'].includes(c[0])));
  });
  await ok('numbers under 3 are hidden when the map is read', async () => {
    const d = (await call(iss, { method: 'GET' })).data; assert.strictEqual(d.live, true);
    assert.deepStrictEqual(d.states.map(x => x.id), ['Ogun']); assert.strictEqual(d.cells.Ogun.Water, 5); assert.ok(!d.cells.Lagos);
  });
  global.fetch = realFetch;
  await ok('the Issue Map page exists, is in the sitemap and has Dataset data', async () => {
    const h = fs.readFileSync(path.join(ROOT, 'issues.html'), 'utf8'); const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    assert.ok(sm.includes('/issues.html') && h.includes('"Dataset"') && (h.match(/<h1/g) || []).length === 1 && (h.match(/rel="canonical"/g) || []).length === 1);
  });
  console.log('\nOfficials\' inbox (api/inbox.js) and translator (api/translate.js)');
  {
    const inbox = require('../api/inbox'), tr = require('../api/translate');
    const q = (h, query, ip) => new Promise(r => { const res = { setHeader() {}, code: 200, status(c) { this.code = c; return this; }, json(d) { r({ code: this.code, data: d }); }, end() { r({ code: this.code }); } };
      h({ method: 'GET', query, headers: { origin: 'https://community-voice-ai-ziry.vercel.app', host: 'community-voice-ai-ziry.vercel.app', 'x-forwarded-for': ip || '3.3.3.3' } }, res); });
    // a small pretend database
    const H = {}, Z = {}, K = {}; const real = global.fetch;
    global.fetch = async (u, o) => {
      const cmds = JSON.parse(o.body);
      if (String(u).includes('openai')) { const list = JSON.parse(cmds.messages[1].content.startsWith('[') ? cmds.messages[1].content : '[]');
        const out = list.length ? { t: list.map(x => 'YO:' + x) } : { translation: 'YO:' + cmds.messages[1].content };
        return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(out) } }] }) }; }
      return { ok: true, json: async () => cmds.map(c => {
        if (c[0] === 'HSETNX') { if (H[c[1]]) return { result: 0 }; H[c[1]] = { [c[2]]: c[3] }; return { result: 1 }; }
        if (c[0] === 'HSET') { H[c[1]] = H[c[1]] || {}; for (let i = 2; i < c.length; i += 2) H[c[1]][c[i]] = c[i + 1]; return { result: 1 }; }
        if (c[0] === 'HGETALL') return { result: [].concat(...Object.entries(H[c[1]] || {})) };
        if (c[0] === 'ZADD') { (Z[c[1]] = Z[c[1]] || []).unshift([c[2], c[3]]); return { result: 1 }; }
        if (c[0] === 'ZREVRANGE') return { result: [].concat(...(Z[c[1]] || []).map(x => c[4] === 'WITHSCORES' ? [x[1], String(x[0])] : [x[1]])) };
        if (c[0] === 'GET') return { result: K[c[1]] || null };
        if (c[0] === 'SET') { K[c[1]] = c[2]; return { result: 'OK' }; }
        return { result: 1 }; }) };
    };
    process.env.KV_REST_API_URL = 'https://db.example'; process.env.KV_REST_API_TOKEN = 't'; process.env.OPENAI_API_KEY = 'test';
    process.env.ADMIN_KEYS = JSON.stringify({ 'ogun-office-key-0001': { name: 'Ogun State Office', state: 'Ogun' }, 'short': { name: 'Bad', state: 'all' } });
    const letter = 'Dear Sir, the road in our area has been bad for three years. Call me on 08031234567 or a@b.com. We respectfully request repairs.';
    let code;
    await ok('a citizen files a copy and gets a tracking code; phone and email are hidden', async () => {
      const r = await call(inbox, { body: { action: 'file', state: 'Ogun', type: 'Roads', office: 'Local Government Council', how: 'by hand', sentOn: '2026-11-01', subject: 'BAD ROAD', letter }, ip: '4.4.4.1' });
      assert.strictEqual(r.data.filed, true); code = r.data.code; assert.ok(/^[A-Z2-9]{8}$/.test(code));
      const stored = JSON.stringify(H); assert.ok(!stored.includes('08031234567') && !stored.includes('a@b.com'));
      await call(inbox, { body: { action: 'file', state: 'Lagos', type: 'Water', how: 'by email', sentOn: '2026-11-02', subject: 'NO WATER', letter }, ip: '4.4.4.2' });
      assert.strictEqual((await call(inbox, { body: { action: 'file', state: 'Atlantis', type: 'Roads', letter } })).code, 400);
    });
    await ok('the inbox opens only with a real key, and a state office sees only its state', async () => {
      assert.strictEqual((await call(inbox, { body: { action: 'list', key: 'wrong-key-wrong-key-1' }, ip: '4.4.4.3' })).code, 401);
      assert.strictEqual((await call(inbox, { body: { action: 'list', key: 'short' }, ip: '4.4.4.3' })).code, 401);
      const r = await call(inbox, { body: { action: 'list', key: 'ogun-office-key-0001' }, ip: '4.4.4.4' });
      assert.strictEqual(r.data.me.name, 'Ogun State Office'); assert.deepStrictEqual(r.data.letters.map(l => l.state), ['Ogun']);
      assert.strictEqual(r.data.letters[0].online, false); assert.strictEqual(r.data.letters[0].how, 'by hand');
    });
    await ok('an official answers, and the citizen sees the answer with the tracking code', async () => {
      const lagos = Object.keys(H).find(k => H[k].state === 'Lagos').slice(5);
      assert.strictEqual((await call(inbox, { body: { action: 'react', key: 'ogun-office-key-0001', id: lagos, status: 'solved' }, ip: '4.4.4.4' })).code, 403);
      const r = await call(inbox, { body: { action: 'react', key: 'ogun-office-key-0001', id: code, status: 'planned', reply: 'Engineers will inspect next week. Call 08031234567.' }, ip: '4.4.4.4' });
      assert.strictEqual(r.data.saved, true); assert.ok(!r.data.reply.includes('08031234567'));
      const seen = (await q(inbox, { code })).data; assert.strictEqual(seen.status, 'planned'); assert.strictEqual(seen.repliedBy, 'Ogun State Office');
      assert.ok(!('letter' in seen), 'the tracking view never shows the letter');
      assert.strictEqual((await q(inbox, { code: 'ZZZZZZZZ' })).data.found, false);
    });
    await ok('one key per office: an LGA sees only its LGA, a state office only its problem types', async () => {
      const I = require('../api/inbox'), L = require('../js/lgas.js');
      const yewa = L.byCode('Ogun', '05'), abk = L.byCode('Ogun', '01');
      const keys = { lga: 'K7MQ-2XRT-9WBH-4PZN-6CDF-JV3S', water: 'M3NB-7QXR-2TKW-9HPF-4ZDC-8GVJ', fed: 'P9WX-3MRT-6BKQ-2HZN-7FDC-4GVS', nema: 'R2TB-8MXQ-5WKH-3PZF-9NDC-6GVJ' };
      process.env.ADMIN_KEYS = [[keys.lga, 'OG.05'], [keys.water, 'OG#WAT'], [keys.fed, 'NG'], [keys.nema, 'NG#NEMA']].map(([k, sc]) => I.fingerprint(k) + ':' + sc).join(',') + ',junk:XX#ZZZ';
      assert.ok(!process.env.ADMIN_KEYS.includes('K7MQ'), 'the setting holds fingerprints, never the keys');
      const file = (lga, type, state = 'Ogun') => call(inbox, { body: { action: 'file', state, lga, type, how: 'by hand', sentOn: '2026-11-10', subject: type, letter }, ip: '4.5.' + Math.floor(Math.random() * 250) + '.1' });
      const a = (await file(yewa, 'Roads')).data.code, b = (await file(yewa, 'Water')).data.code, c = (await file(abk, 'Water')).data.code, d = (await file('Not a real LGA', 'Flooding', 'Lagos')).data.code;
      const ids = async k => (await call(inbox, { body: { action: 'list', key: k }, ip: '4.6.0.1' })).data.letters.map(l => l.id).sort();
      assert.deepStrictEqual(await ids(keys.lga.toLowerCase().replace(/-/g, ' ')), [a, b].sort(), 'Yewa South sees only Yewa South, typed in any case');
      assert.deepStrictEqual(await ids(keys.water), [b, c].sort(), 'the Ogun water office sees only water letters in Ogun');
      assert.deepStrictEqual(await ids(keys.nema), [d], 'NEMA sees flooding letters in every state');
      assert.ok((await ids(keys.fed)).includes(d) && (await ids(keys.fed)).includes(a), 'the Federal Desk sees everything');
      assert.strictEqual(H['cv:l:' + d].lga, '', 'an LGA that is not in the state is not stored');
      const r = await call(inbox, { body: { action: 'react', key: keys.lga, id: c, status: 'solved' }, ip: '4.6.0.2' });
      assert.strictEqual(r.code, 403, 'an office cannot answer a letter outside its scope');
      const me = (await call(inbox, { body: { action: 'list', key: keys.water }, ip: '4.6.0.3' })).data.me;
      assert.strictEqual(me.name, 'Ogun State Water Corporation / Water Board');
    });
    await ok('the LGA list has all 774 LGAs and the office scopes are valid', async () => {
      const L = require('../js/lgas.js'), I = require('../api/inbox'); let n = 0, codes = new Set();
      Object.entries(L.LGAS).forEach(([st, list]) => { n += list.length; codes.add(L.CODES[st]); list.forEach((x, i) => assert.strictEqual(Number(x[0]), i + 1, st)); });
      assert.strictEqual(n, 774); assert.strictEqual(codes.size, 37); assert.strictEqual(L.LGAS['Ogun'].length, 20); assert.strictEqual(L.LGAS['Kano'].length, 44); assert.strictEqual(L.LGAS['FCT (Abuja)'].length, 6);
      assert.ok(I.officeFor('KN.44') && !I.officeFor('KN.45') && I.officeFor('FC#GOV').name === 'Office of the FCT Minister');
    });
    await ok('the offline key maker is built from the same LGA list and is not deployed', async () => {
      const km = fs.readFileSync(path.join(ROOT, 'tools', 'office-key-maker.html'), 'utf8');
      assert.ok(km.includes('"OG":') || km.includes('"Ogun":"OG"')); assert.ok(km.includes('Yewa South (Egbado South)') && !km.includes('/*DATA*/null'));
      assert.ok(fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').includes('tools/office-key-maker.html'));
    });
    await ok('too many wrong keys from one visitor are stopped (429)', async () => {
      let last; for (let i = 0; i < 10; i++) last = await call(inbox, { body: { action: 'list', key: 'guess-guess-guess-' + i }, ip: '4.4.4.9' });
      assert.strictEqual(last.code, 429);
    });
    await ok('translator: any text is capped at 500 letters and 10 uses an hour', async () => {
      assert.strictEqual((await call(tr, { body: { mode: 'text', text: 'x'.repeat(501), to: 'yo' }, ip: '5.5.5.1' })).code, 400);
      assert.strictEqual((await call(tr, { body: { mode: 'text', text: 'Good morning', to: 'xx' }, ip: '5.5.5.1' })).code, 400);
      let r; for (let i = 0; i < 10; i++) r = await call(tr, { body: { mode: 'text', text: 'Good morning ' + i, to: 'yo' }, ip: '5.5.5.2' });
      assert.ok(r.data.translation.startsWith('YO:'));
      assert.strictEqual((await call(tr, { body: { mode: 'text', text: 'one more', to: 'yo' }, ip: '5.5.5.2' })).code, 429);
    });
    await ok('translator: a page sentence is paid for once, then comes from the database', async () => {
      const a = await call(tr, { body: { mode: 'page', strings: ['Write a letter', 'Who do I report to?'], to: 'ha' }, ip: '5.5.5.3' });
      assert.deepStrictEqual(a.data.t, ['YO:Write a letter', 'YO:Who do I report to?']); assert.strictEqual(a.data.fresh, 2);
      const b = await call(tr, { body: { mode: 'page', strings: ['Who do I report to?', 'New words'], to: 'ha' }, ip: '5.5.5.3' });
      assert.strictEqual(b.data.fresh, 1);
    });
    await ok('the inbox page is hidden from search engines and not in the sitemap', async () => {
      assert.ok(fs.readFileSync(path.join(ROOT, 'inbox.html'), 'utf8').includes('noindex'));
      assert.ok(!fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').includes('inbox'));
    });
    global.fetch = real;
  }

  console.log('\nVersion 4: petitions, letter tracker, who to send it to');
  {
    const iss = require('../api/issues'), PC = require('../js/petition-words.js');
    const q = (query, ip) => new Promise(r => { const res = { setHeader() {}, code: 200, status(c) { this.code = c; return this; }, json(d) { r({ code: this.code, data: d }); }, end() { r({ code: this.code }); } };
      iss({ method: 'GET', query, headers: { origin: 'https://community-voice-ai-ziry.vercel.app', host: 'community-voice-ai-ziry.vercel.app', 'x-forwarded-for': ip || '6.6.6.6' } }, res); });
    const real = global.fetch;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    await ok('petitions: without a database they say live:false (the page offers "collect on this phone")', async () => {
      assert.strictEqual((await q({ petition: 'check' })).data.live, false);
      const r = await call(iss, { body: { action: 'petition-create', title: 'Fix our borehole', ask: 'We ask the council to repair it.', state: 'Ogun' }, ip: '6.0.0.1' });
      assert.strictEqual(r.data.created, false);
    });
    await ok('signer check: first name + area only; numbers, surnames and rude words refused', () => {
      assert.ok(PC.checkSigner('Tunde', 'Oke-Ela, Ilaro').ok && PC.checkSigner('Ọlá', 'Ijebu-Ode').ok && PC.checkSigner('Dickson', 'Sagamu').ok);
      assert.ok(!PC.checkSigner('Tunde Bakare', 'Ilaro').ok, 'surname');
      assert.ok(!PC.checkSigner('Ada', '08031234567').ok, 'phone number');
      assert.ok(!PC.checkSigner('F4ck', 'Ilaro').ok && !PC.checkSigner('Kemi', 'werey street').ok && !PC.checkSigner('Sh1thead', 'Ilaro').ok, 'rude');
    });
    // a pretend Upstash database
    const H = {}, Lst = {}, St = {};
    global.fetch = async (u, o) => { const cmds = JSON.parse(o.body); return { ok: true, json: async () => cmds.map(c => {
      const [cmd, k] = c;
      if (cmd === 'HSETNX') { if (H[k]) return { result: 0 }; H[k] = { [c[2]]: c[3] }; return { result: 1 }; }
      if (cmd === 'HSET') { H[k] = H[k] || {}; for (let i = 2; i < c.length; i += 2) H[k][c[i]] = c[i + 1]; return { result: 1 }; }
      if (cmd === 'HGETALL') return { result: [].concat(...Object.entries(H[k] || {})) };
      if (cmd === 'HGET') return { result: (H[k] || {})[c[2]] || null };
      if (cmd === 'HEXISTS') return { result: H[k] && c[2] in H[k] ? 1 : 0 };
      if (cmd === 'LLEN') return { result: (Lst[k] || []).length };
      if (cmd === 'RPUSH') { (Lst[k] = Lst[k] || []).push(c[2]); return { result: Lst[k].length }; }
      if (cmd === 'LRANGE') return { result: (Lst[k] || []).slice(c[2], c[3] + 1) };
      if (cmd === 'SADD') { St[k] = St[k] || new Set(); if (St[k].has(c[2])) return { result: 0 }; St[k].add(c[2]); return { result: 1 }; }
      if (cmd === 'DEL') { c.slice(1).forEach(x => { delete H[x]; delete Lst[x]; delete St[x]; }); return { result: 1 }; }
      return { result: 1 }; }) }; };
    process.env.KV_REST_API_URL = 'https://db.example'; process.env.KV_REST_API_TOKEN = 't';
    let pid, owner;
    await ok('a petition is created with a code and a secret owner key; phone numbers in the letter are hidden', async () => {
      assert.strictEqual((await q({ petition: 'check' })).data.live, true);
      assert.strictEqual((await call(iss, { body: { action: 'petition-create', title: 'Hi', ask: 'x', state: 'Ogun' }, ip: '6.0.0.2' })).code, 400);
      assert.strictEqual((await call(iss, { body: { action: 'petition-create', title: 'Fix the road', ask: 'We ask for repairs now please.', state: 'Atlantis' }, ip: '6.0.0.2' })).code, 400);
      const r = await call(iss, { body: { action: 'petition-create', title: 'Repair the Oke-Ela borehole', ask: 'We ask the Local Government to repair it within a month.', letter: 'Dear Sir, call 08031234567 or me@x.com', state: 'Ogun', area: 'Oke-Ela' }, ip: '6.0.0.2' });
      assert.strictEqual(r.data.created, true); pid = r.data.id; owner = r.data.owner; assert.ok(/^[A-Z2-9]{8}$/.test(pid) && owner.length === 32);
      const stored = JSON.stringify(H); assert.ok(!stored.includes('08031234567') && !stored.includes('me@x.com') && !stored.includes(owner), 'no phone, email or raw owner key stored');
    });
    await ok('neighbours sign with first name + area; duplicates, rude words and bad codes are refused', async () => {
      const a = await call(iss, { body: { action: 'petition-sign', id: pid, first: 'tunde', area: 'Oke-Ela' }, ip: '6.0.1.1' });
      assert.strictEqual(a.data.signed, true); assert.strictEqual(a.data.first, 'Tunde'); assert.strictEqual(a.data.count, 1);
      assert.strictEqual((await call(iss, { body: { action: 'petition-sign', id: pid, first: 'Tunde', area: 'oke-ela' }, ip: '6.0.1.2' })).code, 409, 'duplicate');
      assert.strictEqual((await call(iss, { body: { action: 'petition-sign', id: pid, first: 'Bitch', area: 'Ilaro' }, ip: '6.0.1.3' })).code, 400);
      assert.strictEqual((await call(iss, { body: { action: 'petition-sign', id: 'ZZZZZZZZ', first: 'Ada', area: 'Ilaro' }, ip: '6.0.1.3' })).code, 404);
      assert.strictEqual((await call(iss, { body: { action: 'petition-sign', id: 'bad', first: 'Ada', area: 'Ilaro' }, ip: '6.0.1.3' })).code, 400);
      await call(iss, { body: { action: 'petition-sign', id: pid, first: 'Ada', area: 'Ilaro', phone: '08031234567', surname: 'Okafor' }, ip: '6.0.1.4' });
      const d = (await q({ petition: pid })).data;
      assert.strictEqual(d.count, 2); assert.deepStrictEqual(d.signatures.map(x => x.first), ['Tunde', 'Ada']);
      assert.ok(!JSON.stringify(d).includes('Okafor') && !JSON.stringify(Lst).includes('0803'), 'only first name and area are kept');
      assert.ok(!('owner' in d), 'the owner key is never shown');
    });
    await ok('limits: 20 signatures an hour per connection, 3 new petitions an hour, 500 per petition', async () => {
      let last; for (let i = 0; i < 21; i++) last = await call(iss, { body: { action: 'petition-sign', id: pid, first: 'Name' + 'abcdefghijklmnopqrstu'[i], area: 'Ilaro' }, ip: '6.0.2.1' });
      assert.strictEqual(last.code, 429);
      for (let i = 0; i < 3; i++) await call(iss, { body: { action: 'petition-create', title: 'Petition number ' + i, ask: 'We ask for something good.', state: 'Ogun' }, ip: '6.0.2.2' });
      assert.strictEqual((await call(iss, { body: { action: 'petition-create', title: 'One petition too many', ask: 'We ask for something good.', state: 'Ogun' }, ip: '6.0.2.2' })).code, 429);
      Lst['cv:p:' + pid + ':s'] = new Array(iss.P_CAP).fill('{"f":"X","a":"Y","d":"2026-11-27"}');
      assert.strictEqual((await call(iss, { body: { action: 'petition-sign', id: pid, first: 'Late', area: 'Ilaro' }, ip: '6.0.2.3' })).code, 409);
    });
    await ok('only the creator (with the owner key) can delete a petition', async () => {
      assert.strictEqual((await call(iss, { body: { action: 'petition-delete', id: pid, owner: 'f'.repeat(32) }, ip: '6.0.3.1' })).code, 403);
      assert.strictEqual((await call(iss, { body: { action: 'petition-delete', id: pid, owner }, ip: '6.0.3.1' })).data.deleted, true);
      assert.strictEqual((await q({ petition: pid })).data.found, false);
    });
    await ok('the Issue Map still counts with the petition code in the same file', async () => {
      assert.strictEqual((await call(iss, { body: { state: 'Ogun', type: 'Water' }, ip: '6.0.4.1' })).data.counted, true);
    });
    global.fetch = real;
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
  }
  await ok('tracker: calendar reminder (.ics) and one-tap follow-up draft are made on the phone', () => {
    const store = {}; const sandbox = { window: {}, document: { addEventListener() {} }, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } } };
    new Function('window', 'document', 'localStorage', fs.readFileSync(path.join(ROOT, 'js', 'tracker.js'), 'utf8'))(sandbox.window, sandbox.document, sandbox.localStorage);
    const T = sandbox.window.CVTracker;
    const l = T.add({ subject: 'RE: BROKEN BOREHOLE', office: 'The Executive Chairman, Yewa South Local Government', sentOn: '2026-11-01', how: 'by hand', reference: 'LG/114', remindDays: 21, form: { state: 'Ogun', area: 'Oke-Ela' } });
    const ics = T.ics(l);
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.includes('DTSTART;VALUE=DATE:20261122') && ics.includes('BEGIN:VALARM') && ics.trim().endsWith('END:VCALENDAR'));
    assert.ok(ics.split('\r\n').every(x => x.length <= 75), 'lines are folded');
    const d = T.draft(l); assert.ok(d.includes('1 November 2026') && d.includes('LG/114') && d.includes('FOLLOW-UP') && d.includes('A Concerned Resident'));
    T.update(l.id, { status: 'replied' }); assert.ok(/Acknowledged/.test(T.status(T.find(l.id)).text));
    T.update(l.id, { status: 'solved' }); assert.strictEqual(T.status(T.find(l.id)).text, '✅ Resolved');
  });
  await ok('who to send it to: all 20 Ogun LGAs, office titles only, no invented phone numbers or emails', () => {
    const O = require('../js/ogun-offices.js'), Lg = require('../js/lgas.js');
    assert.strictEqual(Lg.names(O.STATE).length, 20);
    const src = fs.readFileSync(path.join(ROOT, 'js', 'ogun-offices.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//, '');
    assert.ok(!/\b0[789]\d{9}\b|\+234|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(src), 'no phone numbers or emails in the data');
    ['lga-chairman', 'councillor', 'ward', 'works', 'dpo', 'pcrc', 'disco'].forEach(id => assert.ok(O.OFFICES.some(o => o.id === id), id));
    O.OFFICES.forEach(o => { assert.ok(o.verify && o.title && o.to && o.handles, o.id); if (o.link) assert.ok(/^https:\/\/[a-z.]+\.gov\.ng$/.test(o.link), o.link); });
    Object.values(O.KNOWN).forEach(k => assert.ok(k.checkedOn && k.source, 'admin details need a date and a source'));
  });
  await ok("new pages: who-to-send-to and what's new are in the sitemap; the petition page is private", () => {
    const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    assert.ok(sm.includes('/who-to-send-to.html') && sm.includes('/whats-new/') && !sm.includes('/petition.html'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'petition.html'), 'utf8').includes('<meta name="robots" content="noindex">'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8').includes('Disallow: /petition.html'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'whats-new', 'index.html'), 'utf8').includes('the ByteBusters team at Yewa College'));
    assert.strictEqual((fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').match(/\n## Data/g) || []).length, 1, 'llms.txt is not repeated on every build');
    assert.ok(fs.readdirSync(path.join(ROOT, 'api')).filter(f => f.endsWith('.js')).length <= 12, 'Vercel Hobby: at most 12 functions');
  });
  console.log(`\nAll ${passed} checks passed.`);
})().catch(e => { console.error('\n  ✗ FAILED:', e.message); process.exit(1); });
