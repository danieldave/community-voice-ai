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
   ===================================================================== */
'use strict';
const S = require('./_lib/shared');

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

module.exports = async function handler(req, res) {
  if (!S.allowOrigin(req, res)) return res.status(403).json({ error: 'This website is not allowed to use the Issue Map.' });
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const live = !!(DB_URL() && DB_TOKEN());

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
  if (!S.allowed(S.visitor(req) + ':issues', 6)) return res.status(429).json({ error: 'Too many.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (!STATES.includes(body.state) || !TYPES.includes(body.type)) return res.status(400).json({ error: 'Nothing to count.' });   // only labels from OUR lists
  if (!live) return res.status(200).json({ counted: false, live: false });
  try {
    const key = 'issues:' + month();
    await db([['HINCRBY', key, 'total', 1], ['HINCRBY', key, 's:' + body.state, 1], ['HINCRBY', key, 't:' + body.type, 1], ['HINCRBY', key, 'c:' + body.state + '|' + body.type, 1], ['EXPIRE', key, 200 * 86400]]);
    return res.status(200).json({ counted: true, live: true });
  } catch (e) { console.error('issues write:', e.message); return res.status(200).json({ counted: false, live: true }); }
};
module.exports.STATES = STATES; module.exports.TYPES = TYPES;
