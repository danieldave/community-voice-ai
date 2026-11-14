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
    ['index.html', 'how-it-works.html', 'sign-language.html', 'letters.html'].forEach(f => {
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
  console.log(`\nAll ${passed} checks passed.`);
})().catch(e => { console.error('\n  ✗ FAILED:', e.message); process.exit(1); });
