/* =====================================================================
   /api/issues  -  THE COMMUNITY ISSUE MAP (anonymous counters)
   ---------------------------------------------------------------------
   POST { state, type }   adds 1 to this month's counter for that state and
                          problem type. It is ONLY called when the person
                          ticks "Add my problem to the public Issue Map".
   GET                    returns totals for the last 3 months.

   PRIVACY BY DESIGN
   - We never receive the letter, the area, the description or anything typed.
     Only a state and a problem type, both chosen from fixed lists below.
   - Any number smaller than 3 is hidden ("fewer than 3"), so a single
     person can never be picked out.
   - The counters live in the free Upstash Redis database from Vercel Storage.
     Until it is connected the map says it is not switched on.

   PETITIONS (added by the ByteBusters team at Yewa College, version 4)
   The same file also keeps online petitions, so the site stays within
   Vercel Hobby's limit of 12 server functions.
     GET  ?petition=check             is the petition database switched on?
     GET  ?petition=CODE              the petition and its signatures
     POST { action: "petition-create", title, ask, letter, state, area }
     POST { action: "petition-sign", id, first, area }
     POST { action: "petition-delete", id, owner }
   - A signer gives ONLY a first name and an area (checked by js/petition-words.js:
     letters only, no numbers, no rude words). Nothing else is asked or stored.
   - Limits: 3 new petitions and 20 signatures an hour per visitor, 500 signatures
     per petition, one signature per first name + area. Petitions disappear after 180 days.
   - The person who made a petition gets a secret owner key on their phone and can delete it.
   ===================================================================== */
'use strict';
const crypto = require('crypto');
const S = require('./_lib/shared');
const PC = require('../js/petition-words.js');

const STATES = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];
const TYPES = ['Water', 'Roads', 'Electricity / Streetlights', 'Waste and Drainage', 'Flooding', 'Environment and Pollution', 'School Facilities', 'Health Facility', 'Security', 'Other'];
const MONTHS = 3, MIN_SHOWN = 3;

const DB_URL = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const DB_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const month = (back = 0) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - back); return d.toISOString().slice(0, 7); };

async function db(commands) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(DB_URL() + '/pipeline', { method: 'POST', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + DB_TOKEN(), 'Content-Type': 'application/json' }, body: JSON.stringify(commands) });
    if (!r.ok) throw new Error('The database said ' + r.status);
    return r.json();
  } finally { clearTimeout(timer); }
}

let memo = null;   // totals are remembered for 5 minutes

// ---------- petitions ----------
const P_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', P_CAP = 500, P_TTL = 180 * 86400;
const pCode = () => Array.from(crypto.randomBytes(8), b => P_ALPHABET[b % P_ALPHABET.length]).join('');
const pValid = c => typeof c === 'string' && c.length === 8 && [...c].every(ch => P_ALPHABET.includes(ch));
const pOwnerHash = k => crypto.createHash('sha256').update('cv-petition-owner:' + String(k || '')).digest('hex').slice(0, 32);
const pClean = (s, max) => S.hidePersonal(PC.tidy(s, max * 2)).slice(0, max);
const pObj = arr => { const o = {}; for (let i = 0; i < (arr || []).length; i += 2) o[arr[i]] = arr[i + 1]; return o; };

async function petitionGet(res, id, live) {
  if (!live) return res.status(200).json({ live: false });
  if (id === 'check') return res.status(200).json({ live: true, cap: P_CAP });
  if (!pValid(id)) return res.status(400).json({ error: 'That petition link does not look right.' });
  try {
    const [m, list] = await db([['HGETALL', 'cv:p:' + id], ['LRANGE', 'cv:p:' + id + ':s', 0, P_CAP - 1]]);
    const meta = pObj(m.result);
    if (!meta.title) return res.status(200).json({ live: true, found: false });
    const signatures = (list.result || []).map(x => { try { const o = JSON.parse(x); return { first: o.f, area: o.a, on: o.d }; } catch (e) { return null; } }).filter(Boolean);
    return res.status(200).json({ live: true, found: true, id, title: meta.title, ask: meta.ask, letter: meta.letter || '', state: meta.state, area: meta.area, createdOn: meta.createdOn, cap: P_CAP, count: signatures.length, signatures });
  } catch (e) { console.error('petition read:', e.message); return res.status(200).json({ live: false }); }
}

async function petitionPost(req, res, body, live) {
  const ip = S.visitor(req);
  if (body.action === 'petition-create') {
    const title = pClean(body.title, 120), ask = pClean(body.ask, 300), letter = pClean(body.letter, 3000), area = pClean(body.area, 60);
    if (title.length < 5 || ask.length < 10) return res.status(400).json({ error: 'Give the petition a title and say clearly what you are asking for.' });
    if (!STATES.includes(body.state)) return res.status(400).json({ error: 'Choose a state from the list.' });
    if (PC.rude(title) || PC.rude(ask)) return res.status(400).json({ error: 'Please use polite words. This petition will be read by officials.' });
    if (!live) return res.status(200).json({ live: false, created: false });
    if (!S.allowed(ip + ':pnew', 3)) return res.status(429).json({ error: 'You have started several petitions this hour. Please try again later.' });
    try {
      for (let tries = 0; tries < 4; tries++) {
        const id = pCode(), owner = crypto.randomBytes(16).toString('hex');
        const [made] = await db([['HSETNX', 'cv:p:' + id, 'title', title]]);
        if (!made.result) continue;
        await db([['HSET', 'cv:p:' + id, 'ask', ask, 'letter', letter, 'state', body.state, 'area', area, 'owner', pOwnerHash(owner), 'createdOn', new Date().toISOString().slice(0, 10)], ['EXPIRE', 'cv:p:' + id, P_TTL]]);
        return res.status(200).json({ live: true, created: true, id, owner });
      }
      return res.status(503).json({ error: 'Could not start the petition. Please try again.' });
    } catch (e) { console.error('petition create:', e.message); return res.status(502).json({ error: 'The petition could not be saved right now. Please try again.' }); }
  }
  if (body.action === 'petition-sign') {
    const id = String(body.id || '').toUpperCase();
    if (!pValid(id)) return res.status(400).json({ error: 'That petition link does not look right.' });
    const who = PC.checkSigner(body.first, body.area);
    if (!who.ok) return res.status(400).json({ error: who.error });
    if (!live) return res.status(200).json({ live: false, signed: false });
    if (!S.allowed(ip + ':psign', 20)) return res.status(429).json({ error: 'Too many signatures from this connection this hour. Please try again later.' });
    try {
      const [m, n] = await db([['HEXISTS', 'cv:p:' + id, 'title'], ['LLEN', 'cv:p:' + id + ':s']]);
      if (!m.result) return res.status(404).json({ error: 'This petition is no longer here.' });
      if (Number(n.result) >= P_CAP) return res.status(409).json({ error: 'This petition is full (' + P_CAP + ' signatures). Thank you!' });
      const dedupe = (who.first + '|' + who.area).toLowerCase();
      const [added] = await db([['SADD', 'cv:p:' + id + ':k', dedupe]]);
      if (!added.result) return res.status(409).json({ error: 'Someone with this first name and area has already signed.' });
      const on = new Date().toISOString().slice(0, 10);
      const rows = await db([['RPUSH', 'cv:p:' + id + ':s', JSON.stringify({ f: who.first, a: who.area, d: on })], ['EXPIRE', 'cv:p:' + id + ':s', P_TTL], ['EXPIRE', 'cv:p:' + id + ':k', P_TTL]]);
      return res.status(200).json({ live: true, signed: true, first: who.first, area: who.area, on, count: Number(rows[0].result) || 0 });
    } catch (e) { console.error('petition sign:', e.message); return res.status(502).json({ error: 'Your signature could not be saved right now. Please try again.' }); }
  }
  if (body.action === 'petition-delete') {
    const id = String(body.id || '').toUpperCase();
    if (!pValid(id) || typeof body.owner !== 'string' || body.owner.length !== 32) return res.status(400).json({ error: 'Missing petition or owner key.' });
    if (!live) return res.status(200).json({ live: false, deleted: false });
    if (!S.allowed(ip + ':pdel', 10)) return res.status(429).json({ error: 'Too many tries. Please wait.' });
    try {
      const [o] = await db([['HGET', 'cv:p:' + id, 'owner']]);
      const a = Buffer.from(String(o.result || '')), b = Buffer.from(pOwnerHash(body.owner));
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: 'Only the person who started this petition can delete it.' });
      await db([['DEL', 'cv:p:' + id, 'cv:p:' + id + ':s', 'cv:p:' + id + ':k']]);
      return res.status(200).json({ live: true, deleted: true });
    } catch (e) { console.error('petition delete:', e.message); return res.status(502).json({ error: 'Could not delete right now. Please try again.' }); }
  }
  return res.status(400).json({ error: 'Unknown action.' });
}

module.exports = async function handler(req, res) {
  if (!S.allowOrigin(req, res)) return res.status(403).json({ error: 'This website is not allowed to use the Issue Map.' });
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const live = !!(DB_URL() && DB_TOKEN());

  if (req.method === 'GET' && req.query && req.query.petition) return petitionGet(res, String(req.query.petition).toUpperCase() === 'CHECK' ? 'check' : String(req.query.petition).toUpperCase(), live);
  if (req.method === 'GET') {
    const empty = { live: false, months: MONTHS, total: 0, states: [], types: [], cells: {} };
    if (!live) return res.status(200).json(empty);
    if (memo && Date.now() - memo.t < 300000) return res.status(200).json(memo.v);
    try {
      const rows = await db(Array.from({ length: MONTHS }, (_, i) => ['HGETALL', 'issues:' + month(i)]));
      const sum = {};
      rows.forEach(row => { const a = (row && row.result) || []; for (let i = 0; i < a.length; i += 2) sum[a[i]] = (sum[a[i]] || 0) + Number(a[i + 1] || 0); });
      const total = sum.total || 0;
      const shown = n => (n >= MIN_SHOWN ? n : 0);                         // numbers under 3 are hidden
      const states = STATES.map(s => ({ id: s, count: shown(sum['s:' + s] || 0) })).filter(x => x.count).sort((a, b) => b.count - a.count);
      const types = TYPES.map(t => ({ id: t, count: shown(sum['t:' + t] || 0) })).filter(x => x.count).sort((a, b) => b.count - a.count);
      const cells = {};
      STATES.forEach(s => TYPES.forEach(t => { const n = shown(sum['c:' + s + '|' + t] || 0); if (n) (cells[s] = cells[s] || {})[t] = n; }));
      const v = { live: true, months: MONTHS, total, states, types, cells, minShown: MIN_SHOWN, updated: new Date().toISOString() };
      memo = { t: Date.now(), v };
      return res.status(200).json(v);
    } catch (e) { console.error('issues read:', e.message); return res.status(200).json(empty); }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use GET or POST.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (typeof body.action === 'string' && body.action.startsWith('petition-')) return petitionPost(req, res, body, live);
  if (!S.allowed(S.visitor(req) + ':issues', 6)) return res.status(429).json({ error: 'Too many.' });
  if (!STATES.includes(body.state) || !TYPES.includes(body.type)) return res.status(400).json({ error: 'Nothing to count.' });   // only labels from OUR lists
  if (!live) return res.status(200).json({ counted: false, live: false });
  try {
    const key = 'issues:' + month();
    await db([['HINCRBY', key, 'total', 1], ['HINCRBY', key, 's:' + body.state, 1], ['HINCRBY', key, 't:' + body.type, 1], ['HINCRBY', key, 'c:' + body.state + '|' + body.type, 1], ['EXPIRE', key, 200 * 86400]]);
    return res.status(200).json({ counted: true, live: true });
  } catch (e) { console.error('issues write:', e.message); return res.status(200).json({ counted: false, live: true }); }
};
module.exports.STATES = STATES; module.exports.TYPES = TYPES; module.exports.P_CAP = P_CAP;
