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

   WHO IS AN OFFICIAL?  Only the site owner decides. Access keys live in
   the Vercel setting ADMIN_KEYS, never in this code, for example:
       {"ogun-9F3k-PLEASE-CHANGE-ME": {"name": "Ogun State Office", "state": "Ogun"},
        "abuja-7Qp2-PLEASE-CHANGE-ME": {"name": "Federal Desk", "state": "all"}}
   A key must be at least 16 characters long. Without ADMIN_KEYS nobody
   can open the inbox.

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
function admins() {
  try { const o = JSON.parse(process.env.ADMIN_KEYS || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}
function whoIs(key) {
  if (typeof key !== 'string' || key.length < 16 || key.length > 200) return null;
  const given = crypto.createHash('sha256').update(key).digest();
  let found = null;
  for (const [k, v] of Object.entries(admins())) {           // compare every key the same way, so timing tells nothing
    if (k.length < 16 || !v || typeof v !== 'object') continue;
    if (crypto.timingSafeEqual(given, crypto.createHash('sha256').update(k).digest())) found = v;
  }
  if (!found) return null;
  const state = found.state === 'all' || STATES.includes(found.state) ? found.state : null;
  return state ? { name: String(found.name || 'Official').slice(0, 80), state } : null;
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
          ['HSET', 'cv:l:' + id, 'type', body.type, 'office', office, 'how', how, 'sentOn', sentOn, 'subject', subject, 'letter', letter, 'status', 'new', 'filedAt', new Date(now).toISOString()],
          ['EXPIRE', 'cv:l:' + id, TTL],
          ['ZADD', 'cv:idx:' + body.state, now, id], ['ZADD', 'cv:idx:all', now, id],
          ['ZREMRANGEBYSCORE', 'cv:idx:' + body.state, 0, now - TTL * 1000], ['ZREMRANGEBYSCORE', 'cv:idx:all', 0, now - TTL * 1000]
        ]);
        return res.status(200).json({ live: true, filed: true, code: id });
      }
      return res.status(503).json({ error: 'Could not file the letter. Please try again.' });
    } catch (e) { console.error('inbox file:', e.message); return res.status(200).json({ live: false, filed: false }); }
  }

  // ---- 3. an official ----
  if (body.action === 'list' || body.action === 'react') {
    if (!process.env.ADMIN_KEYS) return res.status(200).json({ live: false, reason: 'no-keys' });
    if (!Object.keys(admins()).some(k => k.length >= 16)) return res.status(200).json({ live: false, reason: 'bad-keys' });
    if (!live) return res.status(200).json({ live: false, reason: 'no-database' });
    if (!S.allowed(ip + ':adm', 600)) return res.status(429).json({ error: 'Too many requests. Please wait a little.' });
    const me = whoIs(body.key);
    if (!me) {
      if (!S.allowed(ip + ':wrongkey', 8)) return res.status(429).json({ error: 'Too many wrong keys. Please try again in an hour.' });
      return res.status(401).json({ error: 'That access key is not recognised.' });
    }
    try {
      if (body.action === 'list') {
        const [ids] = await db([['ZREVRANGE', 'cv:idx:' + me.state, 0, MAX_LIST - 1]]);
        const list = ids.result || [];
        const rows = list.length ? await db(list.map(id => ['HGETALL', 'cv:l:' + id])) : [];
        const letters = rows.map((r, i) => ({ id: list[i], ...toObject(r.result) })).filter(l => l.state)
          .map(l => ({ id: l.id, state: l.state, type: l.type, office: l.office, how: l.how, online: ONLINE.includes(l.how), sentOn: l.sentOn, subject: l.subject, letter: l.letter,
            status: STATUSES.includes(l.status) ? l.status : 'new', reply: l.reply || '', by: l.by || '', at: l.at || '', filedAt: l.filedAt || '' }));
        return res.status(200).json({ live: true, me, letters, statuses: STATUSES });
      }
      const id = String(body.id || '').toUpperCase();
      if (!validCode(id) || !STATUSES.includes(body.status) || body.status === 'new') return res.status(400).json({ error: 'Choose a letter and a reaction.' });
      const [r] = await db([['HGETALL', 'cv:l:' + id]]);
      const l = toObject(r.result);
      if (!l.state) return res.status(404).json({ error: 'That letter is no longer here.' });
      if (me.state !== 'all' && l.state !== me.state) return res.status(403).json({ error: 'That letter belongs to another state.' });
      const reply = tidy(body.reply, 400), at = new Date().toISOString();
      await db([['HSET', 'cv:l:' + id, 'status', body.status, 'reply', reply, 'by', me.name, 'at', at]]);
      return res.status(200).json({ live: true, saved: true, id, status: body.status, reply, by: me.name, at });
    } catch (e) { console.error('inbox admin:', e.message); return res.status(502).json({ error: 'The inbox could not be reached. Please try again.' }); }
  }
  return res.status(400).json({ error: 'Unknown action.' });
};
module.exports.HOWS = HOWS; module.exports.STATUSES = STATUSES;
