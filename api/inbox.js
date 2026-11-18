/* =====================================================================
   api/inbox.js  -  THE OFFICIALS' INBOX (runs on the server)
   ---------------------------------------------------------------------
   Three kinds of people use this file:

   1. A CITIZEN who has sent a letter (by hand, post, email, website...)
      may tick "put a copy in the officials' inbox". We store the letter
      and give back a short TRACKING CODE.
          POST { action: "file", state, type, office, how, sentOn, subject, letter }

   2. ANYONE with a tracking code can see what the office answered.
          GET  ?code=ABCD2345

   3. AN OFFICIAL with an ACCESS KEY can read the letters for their
      state (or all states) and answer with one tap.
          POST { action: "list",  key }
          POST { action: "react", key, id, status, reply }

   WHO IS AN OFFICIAL?  Only the site owner decides, with the Vercel setting
   ADMIN_KEYS. Each office gets its OWN key and sees only its own letters:
     a Local Government sees only letters from its LGA,
     a State office (Water, Works...) sees only its problem types in its state,
     the Governor's office sees its whole state, a Federal agency sees its
     problem types in every state. (Scopes are listed in js/office-roles.js.)
   The keys are made on the owner's own device with tools/office-key-maker.html.
   ADMIN_KEYS holds only a SCRAMBLED fingerprint of each key, never the key, like:
       3f9a0c...e1:OG.05,7b21d4...9c:OG#WAT,0c55aa...03:NG#NEMA
   (The old, hand-written form still works for small tests:
    {"a-key-of-16-or-more": {"name": "Test Office", "state": "Ogun", "lga": "Yewa South (Egbado South)"}} )

   PRIVACY
   - Filing a copy is the citizen's own choice (a tick box, off by default).
   - Phone numbers, emails and long ID numbers are hidden before storing.
   - Letters are kept for 400 days, then they disappear.
   - A wrong key is counted: 8 wrong tries an hour, then that visitor waits.
   ===================================================================== */
'use strict';
const crypto = require('crypto');
const S = require('./_lib/shared');
const { STATES, TYPES } = require('./issues');
const L = require('../js/lgas.js');
const R = require('../js/office-roles.js');

const HOWS = ['by hand', 'by post', 'by email', 'through the official website', 'by WhatsApp', 'through the CDA'];
const ONLINE = ['by email', 'through the official website', 'by WhatsApp'];
const STATUSES = ['new', 'received', 'review', 'planned', 'solved', 'redirect'];
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TTL = 400 * 86400, MAX_LIST = 150;

const DB_URL = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const DB_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
async function db(commands) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(DB_URL() + '/pipeline', { method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + DB_TOKEN(), 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
    if (!r.ok) throw new Error('The database said ' + r.status);
    return r.json();
  } finally { clearTimeout(timer); }
}
const toObject = arr => { const o = {}; for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1]; return o; };
const tidy = (s, max) => S.hidePersonal(String(s == null ? '' : s)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const newCode = () => Array.from(crypto.randomBytes(8), b => ALPHABET[b % ALPHABET.length]).join('');
const validCode = c => typeof c === 'string' && c.length === 8 && [...c].every(ch => ALPHABET.includes(ch));

// ---- who holds a key? ----
// A key is typed in any case, with or without dashes or spaces. Its fingerprint is the first
// 20 letters of SHA-256("cv-office-key:" + key). The key maker uses exactly the same recipe.
const normal = k => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fingerprint = k => crypto.createHash('sha256').update('cv-office-key:' + normal(k)).digest('hex').slice(0, 20);

// Turn a scope code into an office: { name, state, lga, types }
function officeFor(scope) {
  let m;
  if (scope === 'NG') return { name: 'Federal Desk (all states)', state: 'all', lga: '', types: null, scope };
  if ((m = /^NG#([A-Z]+)$/.exec(scope)) && R.NATIONAL_ROLES[m[1]]) return { name: R.NATIONAL_ROLES[m[1]].name, state: 'all', lga: '', types: R.NATIONAL_ROLES[m[1]].types, scope };
  if (!(m = /^([A-Z]{2})([.#])([A-Z0-9]+)$/.exec(scope))) return null;
  const state = L.stateOfCode(m[1]); if (!state) return null;
  if (m[2] === '.') { const lga = L.byCode(state, m[3]); return lga ? { name: state === 'FCT (Abuja)' ? lga + ' Area Council, FCT' : lga + ' Local Government, ' + state + ' State', state, lga, types: null, scope } : null; }
  const role = R.STATE_ROLES[m[3]]; if (!role) return null;
  const fct = state === 'FCT (Abuja)';
  const name = fct && role.fct ? role.fct : m[3] === 'GOV' ? role.name + ', ' + state + ' State' : (fct ? 'FCT ' : state + ' State ') + role.name;
  return { name, state, lga: '', types: role.types, scope };
}

let cache = { raw: null, map: null, legacy: null };
function keyBook() {
  const raw = process.env.ADMIN_KEYS || '';
  if (cache.raw === raw) return cache;
  const map = new Map(); let legacy = null;
  if (raw.trim().startsWith('{')) {                        // the old hand-written form
    try { legacy = JSON.parse(raw); } catch (e) { legacy = {}; }
  } else {
    raw.split(/[\s,]+/).forEach(entry => {
      const m = /^([0-9a-f]{20}):([A-Z0-9.#]+)$/.exec(entry.trim());
      if (m) { const o = officeFor(m[2]); if (o) map.set(m[1], o); }
    });
  }
  cache = { raw, map, legacy };
  return cache;
}
function keysReady() {
  const b = keyBook();
  return b.legacy ? Object.keys(b.legacy).some(k => k.length >= 16) : b.map.size > 0;
}
function whoIs(key) {
  if (typeof key !== 'string' || key.length < 16 || key.length > 200) return null;
  const b = keyBook();
  if (!b.legacy) return b.map.get(fingerprint(key)) || null;
  const given = crypto.createHash('sha256').update(key).digest();
  let found = null;
  for (const [k, v] of Object.entries(b.legacy)) {           // compare every key the same way, so timing tells nothing
    if (k.length < 16 || !v || typeof v !== 'object') continue;
    if (crypto.timingSafeEqual(given, crypto.createHash('sha256').update(k).digest())) found = v;
  }
  if (!found) return null;
  const state = found.state === 'all' || STATES.includes(found.state) ? found.state : null;
  if (!state) return null;
  const lga = state !== 'all' && L.names(state).includes(found.lga) ? found.lga : '';
  const types = Array.isArray(found.types) ? found.types.filter(t => TYPES.includes(t)) : null;
  return { name: String(found.name || 'Official').slice(0, 80), state, lga, types: types && types.length ? types : null, scope: 'custom' };
}

// Can this office read this letter?
function sees(me, l) {
  if (me.state !== 'all' && l.state !== me.state) return false;
  if (me.lga && l.lga !== me.lga) return false;
  if (me.types && !me.types.includes(l.type)) return false;
  return true;
}
// Which lists in the database hold this office's letters?
function listsFor(me) {
  if (me.lga) return ['cv:idx:' + me.state + '|L|' + me.lga];
  if (me.types) return me.types.map(t => me.state === 'all' ? 'cv:idx:T|' + t : 'cv:idx:' + me.state + '|T|' + t);
  return [me.state === 'all' ? 'cv:idx:all' : 'cv:idx:' + me.state];
}

function publicView(l) {
  return { found: true, status: STATUSES.includes(l.status) ? l.status : 'new', reply: l.reply || '', repliedBy: l.by || '', repliedOn: l.at ? l.at.slice(0, 10) : '',
    office: l.office || '', how: l.how || '', sentOn: l.sentOn || '' };
}

module.exports = async function handler(req, res) {
  if (!S.allowOrigin(req, res)) return res.status(403).json({ error: 'This website is not allowed to use the inbox.' });
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const live = !!(DB_URL() && DB_TOKEN());
  const ip = S.visitor(req);

  // ---- 2. anyone with a tracking code ----
  if (req.method === 'GET') {
    const code = String((req.query && req.query.code) || '').toUpperCase();
    if (!live) return res.status(200).json({ live: false });
    if (!validCode(code)) return res.status(400).json({ error: 'That tracking code does not look right.' });
    if (!S.allowed(ip + ':track', 120)) return res.status(429).json({ error: 'Too many checks. Please try again later.' });
    try {
      const [r] = await db([['HGETALL', 'cv:l:' + code]]);
      const l = toObject(r.result);
      return res.status(200).json(l.state ? { live: true, ...publicView(l) } : { live: true, found: false });
    } catch (e) { console.error('inbox track:', e.message); return res.status(200).json({ live: false }); }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // ---- 1. a citizen files a copy ----
  if (body.action === 'file') {
    if (!STATES.includes(body.state) || !TYPES.includes(body.type)) return res.status(400).json({ error: 'Choose a state and a problem type from the lists.' });
    const how = HOWS.includes(body.how) ? body.how : 'by hand';
    const sentOn = /^\d{4}-\d{2}-\d{2}$/.test(String(body.sentOn)) ? body.sentOn : new Date().toISOString().slice(0, 10);
    const letter = tidy(body.letter, 5000), subject = tidy(body.subject, 200), office = tidy(body.office, 120);
    const lga = L.names(body.state).includes(body.lga) ? body.lga : '';      // only a real LGA of that state, or none
    if (letter.length < 80) return res.status(400).json({ error: 'The letter is too short to file.' });
    if (!live) return res.status(200).json({ live: false, filed: false });
    if (!S.allowed(ip + ':file', 5)) return res.status(429).json({ error: 'You have filed several letters this hour. Please try again later.' });
    try {
      const now = Date.now();
      for (let tries = 0; tries < 4; tries++) {
        const id = newCode();
        const [made] = await db([['HSETNX', 'cv:l:' + id, 'state', body.state]]);
        if (!made.result) continue;
        await db([
          ['HSET', 'cv:l:' + id, 'type', body.type, 'lga', lga, 'office', office, 'how', how, 'sentOn', sentOn, 'subject', subject, 'letter', letter, 'status', 'new', 'filedAt', new Date(now).toISOString()],
          ['EXPIRE', 'cv:l:' + id, TTL]
        ].concat(...['cv:idx:all', 'cv:idx:' + body.state, 'cv:idx:T|' + body.type, 'cv:idx:' + body.state + '|T|' + body.type].concat(lga ? ['cv:idx:' + body.state + '|L|' + lga] : [])
          .map(k => [['ZADD', k, now, id], ['ZREMRANGEBYSCORE', k, 0, now - TTL * 1000]])));
        return res.status(200).json({ live: true, filed: true, code: id });
      }
      return res.status(503).json({ error: 'Could not file the letter. Please try again.' });
    } catch (e) { console.error('inbox file:', e.message); return res.status(200).json({ live: false, filed: false }); }
  }

  // ---- 3. an official ----
  if (body.action === 'list' || body.action === 'react') {
    if (!process.env.ADMIN_KEYS) return res.status(200).json({ live: false, reason: 'no-keys' });
    if (!keysReady()) return res.status(200).json({ live: false, reason: 'bad-keys' });
    if (!live) return res.status(200).json({ live: false, reason: 'no-database' });
    if (!S.allowed(ip + ':adm', 600)) return res.status(429).json({ error: 'Too many requests. Please wait a little.' });
    const me = whoIs(body.key);
    if (!me) {
      if (!S.allowed(ip + ':wrongkey', 8)) return res.status(429).json({ error: 'Too many wrong keys. Please try again in an hour.' });
      return res.status(401).json({ error: 'That access key is not recognised.' });
    }
    try {
      if (body.action === 'list') {
        const lists = listsFor(me);
        const got = await db(lists.map(k => ['ZREVRANGE', k, 0, MAX_LIST - 1, 'WITHSCORES']));
        const score = new Map();
        got.forEach(g => { const a = g.result || []; for (let i = 0; i < a.length; i += 2) score.set(a[i], Number(a[i + 1])); });
        const ids = [...score.keys()].sort((x, y) => score.get(y) - score.get(x)).slice(0, MAX_LIST);
        const rows = ids.length ? await db(ids.map(id => ['HGETALL', 'cv:l:' + id])) : [];
        const letters = rows.map((r, i) => ({ id: ids[i], ...toObject(r.result) })).filter(l => l.state && sees(me, l))
          .map(l => ({ id: l.id, state: l.state, lga: l.lga || '', type: l.type, office: l.office, how: l.how, online: ONLINE.includes(l.how), sentOn: l.sentOn, subject: l.subject, letter: l.letter,
            status: STATUSES.includes(l.status) ? l.status : 'new', reply: l.reply || '', by: l.by || '', at: l.at || '', filedAt: l.filedAt || '' }));
        return res.status(200).json({ live: true, me: { name: me.name, state: me.state, lga: me.lga, types: me.types }, letters, statuses: STATUSES });
      }
      const id = String(body.id || '').toUpperCase();
      if (!validCode(id) || !STATUSES.includes(body.status) || body.status === 'new') return res.status(400).json({ error: 'Choose a letter and a reaction.' });
      const [r] = await db([['HGETALL', 'cv:l:' + id]]);
      const l = toObject(r.result);
      if (!l.state) return res.status(404).json({ error: 'That letter is no longer here.' });
      if (!sees(me, l)) return res.status(403).json({ error: 'That letter belongs to another office.' });
      const reply = tidy(body.reply, 400), at = new Date().toISOString();
      await db([['HSET', 'cv:l:' + id, 'status', body.status, 'reply', reply, 'by', me.name, 'at', at]]);
      return res.status(200).json({ live: true, saved: true, id, status: body.status, reply, by: me.name, at });
    } catch (e) { console.error('inbox admin:', e.message); return res.status(502).json({ error: 'The inbox could not be reached. Please try again.' }); }
  }
  return res.status(400).json({ error: 'Unknown action.' });
};
module.exports.HOWS = HOWS; module.exports.STATUSES = STATUSES; module.exports.fingerprint = fingerprint; module.exports.officeFor = officeFor;
