#!/usr/bin/env node
/* =====================================================================
   tools/build.js  -  makes the Civic Guide pages
     /report/<problem>/   "Who do I report ___ to in Nigeria?"
     /offices/<office>/   "How do I write to ___?"
     /how-to/<topic>/     letters, petitions, follow-ups, FOI requests
     sitemap.xml and llms.txt
   Run:  node tools/build.js      The address comes from tools/site.json.
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(__dirname, 'site.json'), 'utf8'));
const URL_ = SITE.url.replace(/\/$/, ''), TODAY = new Date().toISOString().slice(0, 10);
const L = require('./library');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');
const short = s => s.length > 155 ? s.slice(0, 150).replace(/\s\S*$/, '') + '…' : s;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const an = w => /^[aeiou]/i.test(w) ? 'an' : 'a';
const STATIC = ['/', '/letters.html', '/sign-language.html', '/how-it-works.html', '/issues.html', '/who-to-send-to.html', '/petition.html'];
// letters.html and petition.html are personal (noindex, blocked in robots.txt), so they are not in the sitemap
const pages = STATIC.filter(l => !['/issues.html', '/letters.html', '/petition.html'].includes(l)).map((loc, i) => ({ loc, pri: i ? '0.6' : '1.0' }));
const write = (rel, text) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const VERIFY = (SITE.googleVerify ? `\n  <meta name="google-site-verification" content="${SITE.googleVerify}">` : '') + (SITE.bingVerify ? `\n  <meta name="msvalidate.01" content="${SITE.bingVerify}">` : '');
const ORG = { '@type': 'EducationalOrganization', '@id': URL_ + '/#org', name: SITE.publisher, url: URL_ + '/' };
const faqSchema = list => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const article = (h, d, loc) => ({ '@type': 'Article', headline: h, description: d, inLanguage: 'en-NG', datePublished: '2026-11-13', dateModified: TODAY, author: { '@id': URL_ + '/#org' }, publisher: { '@id': URL_ + '/#org' }, mainEntityOfPage: URL_ + loc, image: URL_ + '/assets/og-image.png' });
const grid = list => `<ul class="grid">${list.map(([href, b, sm]) => `<li><a href="${href}"><b>${esc(b)}</b><small>${esc(sm || '')}</small></a></li>`).join('')}</ul>`;
const cta = type => `<div class="cta"><a class="btn" href="/?type=${encodeURIComponent(type || '')}#main">Write my letter with AI ✍️</a><a class="btn ghost" href="/letters.html">Track my letters</a></div>`;

function page({ rel, title, description, h1, crumbs, body, schema }) {
  const url = URL_ + '/' + rel.replace(/index\.html$/, '');
  // Google shows about 60 letters of a title
  if (title.length > 60) title = title.replace(/ \| Community Voice AI$/, '');
  if (title.length > 60) title = title.replace(/^Who do I report (.*) to in Nigeria\?$/, (m, x) => 'Report ' + x + ': who to write to');
  if (title.length > 60) title = title.replace(/^Report (.*): who to write to$/, (m, x) => 'Who to report ' + x + ' to');
  if (title.length > 60) title = title.replace(/ in Nigeria\?$/, '?');
  if (title.length > 60) title = title.replace(/^How to write a letter to /, 'How to write to ');
  if (title.length > 60) title = title.replace(/ electricity distribution company \(DisCo\)$/, ' electricity company (DisCo)');
  if (title.length > 60) title = title.replace(/^How can students report a problem in their school or community\?$/, 'How students can report a school or community problem');
  for (let n = 58; title.length > 60 && n > 30; n -= 4) title = title.replace(/…$/, '').slice(0, n).replace(/\s\S*$/, '') + '…';
  return `<!doctype html>
<html lang="en-NG">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">${VERIFY}
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Community Voice AI">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${URL_}/assets/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${URL_}/assets/og-image.png">
  <meta name="theme-color" content="#1f1a4d">
  <link rel="icon" href="/assets/logo.svg">
  <link rel="stylesheet" href="/css/guide.css">
  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [ORG, { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: URL_ + c[1] })) }].concat(schema || []) })}</script>
</head>
<body>
<header class="bar"><a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="36" height="36"><span>COMMUNITY <span>VOICE</span> AI</span></a></header>
<nav class="gnav" aria-label="Main"><a href="/report/">Who do I report to?</a><a href="/offices/">Offices</a><a href="/who-to-send-to.html">Ogun offices</a><a href="/how-to/">How-to guides</a><a href="/">Write a letter</a><a href="/letters.html">My letters</a></nav>
<main class="guide">
  <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a> › ` : esc(c[0])).join('')}</nav>
  <h1>${esc(h1)}</h1>
${body}
  <p class="note"><b>Emergency?</b> A letter is not for emergencies. Call <b>112</b> (free on every network). If it does not connect, go to the nearest police station, fire station or hospital, or call your state's own emergency line.</p>
  <p class="updated">Written by students of the ${esc(SITE.publisher)}. Last updated <time datetime="${TODAY}">${TODAY}</time>. Offices are organised a little differently in each state: confirm the right office locally before you deliver a letter. In an emergency, call 112.</p>
</main>
<footer><p><a href="/report/">Who do I report to?</a> · <a href="/offices/">Offices</a> · <a href="/how-to/">How-to guides</a> · <a href="/">Write a letter with AI</a> · <a href="/faq/">FAQ</a> · <a href="/about/">About / who built this</a> · <a href="/whats-new/">What's new</a></p><p>Built by students of the ${esc(SITE.publisher)}</p></footer>
<script src="/js/translate.js" defer></script>
</body>
</html>
`;
}

// ---------- /report/<problem>/ ----------
L.PROBLEMS.forEach(([slug, name, type, office, next, answer, evidence, sample]) => {
  const loc = `/report/${slug}/`, h1 = `Who do I report ${name} to in Nigeria?`;
  const faq = [[h1, answer], [`What should I include in a letter about ${name}?`, evidence.join(' ') + ' State clearly what you are asking for.'], [`What if nobody responds to my complaint about ${name}?`, 'Wait about two weeks, send a short follow-up quoting your first letter, then go one level higher: ' + next]];
  const related = L.PROBLEMS.filter(p => p[0] !== slug && p[2] === type).slice(0, 4).concat(L.PROBLEMS.filter(p => p[2] !== type).slice(0, 2));
  write(`report/${slug}/index.html`, page({
    rel: `report/${slug}/index.html`, title: `Who do I report ${name} to in Nigeria? | Community Voice AI`, description: short(answer), h1,
    crumbs: [['Home', '/'], ['Who do I report to?', '/report/'], [cap(name), loc]],
    body: `
  <p class="answer-box"><b>Quick answer:</b> ${esc(answer)}</p>
  <div class="who"><div><small>Write to</small>${esc(office)}</div><div><small>If nothing happens, go to</small>${esc(next)}</div></div>
  <h2>Collect this before you write</h2>
  <ul class="check">${evidence.map(e => `<li>${esc(e)}</li>`).join('')}<li>The exact thing you are asking for, in one sentence.</li></ul>
  <h2>How your letter can begin</h2>
  <div class="letter">${esc(sample)} We respectfully request that your office inspects the site and tells us what action will be taken.</div>
  <p class="note">Replace the words in [brackets] with your own facts. Our AI can write the full letter from your answers, and you edit every word.</p>
  ${cta(type)}
  <h2>After you send it</h2>
  <ol class="steps"><li>Get a stamped, dated copy: see <a href="/how-to/get-an-acknowledgement-copy/">how to prove your letter was received</a>.</li><li>Save it in <a href="/letters.html">My Letters</a>; we remind you after 14 days.</li><li>No reply? See <a href="/how-to/follow-up-a-letter/">what to do if nobody replies</a>.</li></ol>
  <h2>Related problems</h2>
  ${grid(related.map(p => [`/report/${p[0]}/`, cap(p[1]), short(p[5]).slice(0, 90) + '…']))}`,
    schema: [article(h1, answer, loc), faqSchema(faq)]
  }));
  pages.push({ loc, pri: '0.8' });
});
const types = [...new Set(L.PROBLEMS.map(p => p[2]))];
write('report/index.html', page({
  rel: 'report/index.html', title: 'Who do I report a community problem to in Nigeria? | Community Voice AI',
  description: 'Find the right office for bad roads, no water, power outages, refuse, flooding, school and health-centre problems in Nigeria, and how to write the letter.',
  h1: 'Who do I report a community problem to?', crumbs: [['Home', '/'], ['Who do I report to?', '/report/']],
  body: `
  <p class="answer-box"><b>Quick answer:</b> Start with the level of government closest to the problem. Local streets, drains, refuse, markets and primary health centres are mainly Local Government matters. State roads, water supply and secondary schools belong to state ministries and agencies. Electricity goes to your distribution company first. Always write, date your letter and keep a stamped copy.</p>
  ${types.map(t => `<h2>${esc(t)}</h2>${grid(L.PROBLEMS.filter(p => p[2] === t).map(p => [`/report/${p[0]}/`, cap(p[1]), short(p[5]).slice(0, 90) + '…']))}`).join('')}
  ${cta('')}`,
  schema: [faqSchema([['Who do I report a community problem to in Nigeria?', 'Start with the level of government closest to the problem. Local streets, drains, refuse, markets and primary health centres are mainly Local Government matters. State roads, water supply and secondary schools belong to state ministries and agencies. Electricity goes to your distribution company first.']])]
}));
pages.push({ loc: '/report/', pri: '0.9' });

// ---------- /offices/<office>/ ----------
L.OFFICES.forEach(([slug, who, answer, handles, reach]) => {
  const loc = `/offices/${slug}/`, h1 = `How to write a letter to ${/^[A-Z]/.test(who) ? 'the' : an(who)} ${who}`.replace('to a ward', 'to your ward').replace('to an electricity', 'to your electricity').replace('to a school', 'to your school').replace('to a traditional', 'to a traditional');
  const KEY = { 'local-government-chairman': 'local government council', 'ward-councillor': 'councillor', 'community-development-association': 'community development association', 'state-ministry-of-works': 'ministry of works', 'state-water-corporation': 'water corporation', 'electricity-distribution-company': 'distribution company', 'school-principal': 'principal', 'traditional-ruler': 'traditional ruler', 'police-dpo': 'divisional police', 'state-house-of-assembly-member': 'assembly member', 'public-complaints-commission': 'public complaints' }[slug];
  const probs = L.PROBLEMS.filter(p => (p[3] + ' ' + p[4]).toLowerCase().includes(KEY)).slice(0, 8);
  write(`offices/${slug}/index.html`, page({
    rel: `offices/${slug}/index.html`, title: h1, description: short(answer + ' ' + reach), h1,
    crumbs: [['Home', '/'], ['Offices', '/offices/'], [cap(who), loc]],
    body: `
  <p class="answer-box"><b>Quick answer:</b> ${esc(answer)} ${esc(reach)}</p>
  <h2>What this office handles</h2>
  <ul class="check">${handles.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
  <h2>How to reach them</h2>
  <p>${esc(reach)}</p>
  ${probs.length ? `<h2>Problems to take to this office</h2>${grid(probs.map(p => [`/report/${p[0]}/`, cap(p[1]), '']))}` : ''}
  <p>New to formal letters? See <a href="/how-to/write-a-formal-letter/">how to write a formal letter</a>.</p>
  ${cta('')}`,
    schema: [article(h1, answer, loc), faqSchema([[`What does ${/^[A-Z]/.test(who) ? 'the' : an(who)} ${who} do?`, answer + ' They handle: ' + handles.join(', ') + '.'], [h1.replace('How to', 'How do I') + '?', reach]])]
  }));
  pages.push({ loc, pri: '0.7' });
});
write('offices/index.html', page({ rel: 'offices/index.html', title: 'Which office handles what in Nigeria? A simple guide | Community Voice AI', description: 'What the Local Government Chairman, councillor, state ministries, the DisCo, the DPO and others each handle, and how to address a letter to them.', h1: 'Which office handles what?', crumbs: [['Home', '/'], ['Offices', '/offices/']],
  body: `<p class="answer-box"><b>Quick answer:</b> Nigeria has three levels of government: Local, State and Federal. Most everyday community problems are solved at the Local Government or State level. Pick an office to see what it handles and how to write to it.</p>${grid(L.OFFICES.map(o => [`/offices/${o[0]}/`, cap(o[1]), short(o[2]).slice(0, 90) + '…']))}${cta('')}`,
  schema: [faqSchema(L.OFFICES.map(o => [`What does ${an(o[1])} ${o[1]} do?`, o[2]]))] }));
pages.push({ loc: '/offices/', pri: '0.8' });

// ---------- /how-to/<topic>/ ----------
L.HOWTO.forEach(([slug, q, answer, steps]) => {
  const loc = `/how-to/${slug}/`;
  write(`how-to/${slug}/index.html`, page({ rel: `how-to/${slug}/index.html`, title: `${q} | Community Voice AI`, description: short(answer), h1: q, crumbs: [['Home', '/'], ['How-to guides', '/how-to/'], [q, loc]],
    body: `
  <p class="answer-box"><b>Quick answer:</b> ${esc(answer)}</p>
  <h2>Step by step</h2>
  <ol class="steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  ${cta('')}
  <h2>More guides</h2>${grid(L.HOWTO.filter(h => h[0] !== slug).map(h => [`/how-to/${h[0]}/`, h[1], '']))}`,
    schema: [article(q, answer, loc), faqSchema([[q, answer]]), { '@type': 'HowTo', name: q, step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) }] }));
  pages.push({ loc, pri: '0.7' });
});
write('how-to/index.html', page({ rel: 'how-to/index.html', title: 'How to write letters, petitions and follow-ups in Nigeria | Community Voice AI', description: 'Step-by-step guides: formal letters, community petitions, follow-ups, acknowledgement copies, evidence photos and Freedom of Information requests.', h1: 'How-to guides for speaking up', crumbs: [['Home', '/'], ['How-to guides', '/how-to/']],
  body: `<p class="answer-box"><b>Quick answer:</b> A complaint works best when it is written, dated, factual, polite, signed by many, delivered with proof, and followed up after two weeks.</p>${grid(L.HOWTO.map(h => [`/how-to/${h[0]}/`, h[1], short(h[2]).slice(0, 90) + '…']))}${cta('')}`,
  schema: [faqSchema(L.HOWTO.map(h => [h[1], h[2]]))] }));
pages.push({ loc: '/how-to/', pri: '0.8' });


// ---------- /issues.html : the Community Issue Map ----------
write('issues.html', page({
  rel: 'issues.html', title: 'Community Issue Map: what Nigerians are reporting, by state | Community Voice AI',
  description: 'An anonymous, opt-in count of the community problems people write letters about in Nigeria, by state and type: water, roads, electricity, flooding, schools and more.',
  h1: 'Community Issue Map: what people are writing about', crumbs: [['Home', '/'], ['Issue Map', '/issues.html']],
  body: `
  <p class="answer-box"><b>How it works:</b> when someone writes a letter with Community Voice AI they can tick one box to add their problem to this map. We then count <b>only the state and the problem type</b>. We never receive the letter, the area or any words. Any number under 3 is hidden so nobody can be identified.</p>
  <div id="map" aria-live="polite"><p>Loading the map…</p></div>
  <h2>Why this matters</h2>
  <p>One letter is easy to ignore. A pattern is not. These counts show councillors, journalists, schools and community groups which problems people near them are raising, so that they can ask for the right fix.</p>
  <p class="note">You may quote these numbers with a link to this page. They show what <b>users of this app</b> chose to report, not every problem in the state.</p>
  <h2>Have a problem to report?</h2>
  <ul class="grid"><li><a href="/report/bad-road/"><b>Bad road</b><small>Who to write to and what to include</small></a></li><li><a href="/report/no-water/"><b>No water</b><small>Who to write to and what to include</small></a></li><li><a href="/report/no-electricity/"><b>Power outage</b><small>Who to write to and what to include</small></a></li><li><a href="/report/"><b>All problems</b><small>Find the right office</small></a></li></ul>
  ${cta('')}
  <script>
  (function () {
    var box = document.getElementById("map");
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var bars = function (rows) { var max = Math.max.apply(null, rows.map(function (r) { return r.count; }).concat(1));
      return rows.map(function (r) { return '<div class="ibar"><span>' + esc(r.id) + '</span><i style="width:' + Math.max(4, Math.round(r.count / max * 100)) + '%"></i><b>' + r.count + '</b></div>'; }).join(""); };
    fetch("/api/issues").then(function (r) { return r.json(); }).then(function (d) {
      if (!d.live) { box.innerHTML = '<p class="note">The Issue Map is not switched on yet.</p>'; return; }
      if (!d.total) { box.innerHTML = '<p class="note">No problems have been added in the last ' + d.months + ' months. <a href="/">Write a letter</a> and tick the map box to be the first.</p>'; return; }
      var opts = '<option value="">All states</option>' + d.states.map(function (s) { return '<option>' + esc(s.id) + '</option>'; }).join("");
      box.innerHTML = '<p class="itotal"><b>' + d.total + '</b> problems added in the last ' + d.months + ' months</p>' +
        '<label class="isel">See one state <select id="ist">' + opts + '</select></label><div id="ibody"></div>' +
        '<p><button class="btn ghost" id="icsv" type="button">Download these numbers (CSV)</button></p>';
      var sel = document.getElementById("ist"), body = document.getElementById("ibody");
      function draw() {
        var s = sel.value;
        if (!s) { body.innerHTML = '<h2>Problem types</h2>' + bars(d.types) + '<h2>States with the most problems added</h2>' + bars(d.states); return; }
        var c = d.cells[s] || {}, rows = Object.keys(c).map(function (t) { return { id: t, count: c[t] }; }).sort(function (a, b) { return b.count - a.count; });
        body.innerHTML = '<h2>' + esc(s) + '</h2>' + (rows.length ? bars(rows) : '<p>Fewer than ' + d.minShown + ' problems of any one type, so nothing is shown yet.</p>');
      }
      sel.onchange = draw; draw();
      document.getElementById("icsv").onclick = function () {
        var lines = ["state,problem_type,count"]; Object.keys(d.cells).forEach(function (s) { Object.keys(d.cells[s]).forEach(function (t) { lines.push('"' + s + '","' + t + '",' + d.cells[s][t]); }); });
        var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\\n")], { type: "text/csv" })); a.download = "community-issue-map.csv"; document.body.appendChild(a); a.click(); a.remove();
      };
    }).catch(function () { box.innerHTML = '<p class="note">The map could not load. Check your internet and try again.</p>'; });
  })();
  </script>`,
  schema: [{ '@type': 'Dataset', name: 'Community Issue Map: problems reported by users of Community Voice AI', description: 'Anonymous counts of community problem types by Nigerian state, added by users who opted in. No letter text, area or personal data is stored. Counts under 3 are hidden.', url: URL_ + '/issues.html', isAccessibleForFree: true, creator: { '@id': URL_ + '/#org' }, license: 'https://creativecommons.org/licenses/by/4.0/' }]
}));
pages.push({ loc: '/issues.html', pri: '0.8' });

// ---------- /faq/ : what people in Nigeria search before they complain (AEO) ----------
const P = id => L.PROBLEMS.find(p => p[0] === id), H = id => L.HOWTO.find(h => h[0] === id);
const SITE_FAQ = [
  [H('write-a-formal-letter')[1], H('write-a-formal-letter')[2] + ' Community Voice AI drafts this for you, and you edit every word.', '/how-to/write-a-formal-letter/'],
  ['Who do I report a bad road to in Nigeria?', P('bad-road')[5], '/report/bad-road/'],
  ['Who do I report a broken borehole or no water supply to?', P('no-water')[5] + ' ' + P('broken-borehole')[5].replace(/^Write to the Local Government Council or the state rural water agency, /, 'In your letter, '), '/report/broken-borehole/'],
  ['Who do I complain to about a long power outage or estimated bill?', P('no-electricity')[5], '/report/no-electricity/'],
  ['Who is responsible for refuse collection and blocked drains?', P('refuse-dump')[5] + ' For blocked drains, write to the Local Government Council before the rains.', '/report/refuse-dump/'],
  [H('get-an-acknowledgement-copy')[1], H('get-an-acknowledgement-copy')[2], '/how-to/get-an-acknowledgement-copy/'],
  [H('follow-up-a-letter')[1], H('follow-up-a-letter')[2] + ' Our letter tracker reminds you after 14 days and drafts the follow-up.', '/how-to/follow-up-a-letter/'],
  [H('write-a-petition')[1], H('write-a-petition')[2], '/how-to/write-a-petition/'],
  ['Can neighbours sign a petition online without an account?', 'Yes. In My Letters, press "Make it a petition". Neighbours add only a first name and an area, on their own phones with a link or passed around on your phone, and you download a signature list as a PDF to attach to your letter. Rude words and numbers are refused.', '/petition.html'],
  [H('freedom-of-information-request')[1], H('freedom-of-information-request')[2], '/how-to/freedom-of-information-request/'],
  [H('students-speak-up')[1], H('students-speak-up')[2], '/how-to/students-speak-up/'],
  ['Is Community Voice AI free? Is my information safe?', 'Yes, it is free and there is no sign-up. Before anything is sent to the AI, a privacy filter removes phone numbers, emails, long ID or account numbers and names, and letters are signed "A Concerned Resident" unless you change it.', '/how-it-works.html'],
  ['What should I do in an emergency?', 'A letter is not for emergencies. Call 112, which is free on every network. If it does not connect, go to the nearest police station, fire station or hospital.', '/how-it-works.html']
];
write('faq/index.html', page({
  rel: 'faq/index.html', title: 'Complaint letter questions in Nigeria | Community Voice AI',
  description: 'Simple answers: how to write a complaint letter, who to report bad roads, water, power or refuse problems to, and what to do if nobody replies.',
  h1: 'Questions about community complaint letters', crumbs: [['Home', '/'], ['FAQ', '/faq/']],
  body: `
  <p class="answer-box"><b>Quick answer:</b> find out which office is responsible, write a short polite letter (the problem, the effect, your request), keep an acknowledgement copy, and follow up after about two weeks.</p>
  ${SITE_FAQ.map(([q, a, href]) => `<h2>${esc(q)}</h2>\n  <p>${esc(a)} <a href="${href}">Read more</a></p>`).join('\n  ')}
  ${cta('')}`,
  schema: [faqSchema(SITE_FAQ)]
}));
pages.push({ loc: '/faq/', pri: '0.8' });

// ---------- /about/ : who built this ----------
write('about/index.html', page({
  rel: 'about/index.html', title: 'About Community Voice AI and who built it',
  description: "Community Voice AI was built by students of the ByteBusters coding club at Yewa College, Ilaro, Ogun State, a programme of Odu'a Investment Foundation.",
  h1: 'About Community Voice AI: who built this', crumbs: [['Home', '/'], ['About', '/about/']],
  body: `
  <p class="answer-box"><b>In short:</b> a free tool that turns a community problem into a polite formal letter, made by secondary school students in the ByteBusters coding club at Yewa College, Ilaro, Ogun State, Nigeria. ByteBusters is run by Odu'a Investment Foundation.</p>
  <h2>Why we built it</h2>
  <p>Many communities live with broken boreholes, dark streets, bad roads and blocked drains, but people are not sure which office to write to or how to write a formal letter. We wanted a free tool that helps anyone, in everyday English or Pidgin, write a respectful letter and follow it up.</p>
  <h2>Who built it</h2>
  <p>A team of students at the Yewa College ByteBusters centre, including the Generative AI Team, planned the app, wrote the guides and coded the website, with guidance from the ByteBusters Centre Lead. The Nigerian Sign Language page was made with Deaf and Hard-of-Hearing students. Along the way we learned HTML, CSS, JavaScript, how to use an AI model safely, how to put a website online with Vercel, and how search engines read pages.</p>
  <h2>What it is, and is not</h2>
  <ul>
    <li>It is a free writing helper. You are always the author: the AI drafts, you check and edit every word.</li>
    <li>It is <b>not</b> a government office and it does not deliver letters for you. Offices are organised differently in each state, so confirm the right office locally.</li>
    <li>It is not for emergencies: call 112.</li>
  </ul>
  <p>Read the <a href="/faq/">questions and answers</a> or <a href="/how-it-works.html">how it works</a>.</p>
  ${cta('')}`,
  schema: [{ '@type': 'AboutPage', name: 'About Community Voice AI', url: URL_ + '/about/', publisher: { '@id': URL_ + '/#org' } }]
}));
pages.push({ loc: '/about/', pri: '0.5' });

// ---------- /whats-new/ : what changed, and who built it ----------
const NEW = [
  ['📬 Letter tracker, upgraded', 'Every letter you send now has a status you can change: <b>Sent</b>, <b>Acknowledged</b> or <b>Resolved</b>. Choose when to be reminded (7, 14, 21 or 30 days) and add the reminder to your phone\'s calendar with one tap (an <code>.ics</code> file). A <b>one-tap follow-up draft</b> is written on your phone with no internet and no AI, using the date, office and reference you saved. You can also add letters you wrote on paper or somewhere else.', '/letters.html', 'Saved on your phone only. Nothing is sent to our server.'],
  ['✍️ Petitions with signatures', 'Turn any saved letter into a petition. Neighbours add only a <b>first name and an area</b>: either on their own phones with a link you share on WhatsApp, or by passing your phone around. Download the signature list as a <b>PDF</b> to attach to your letter, or print it. Rude words, surnames and numbers are refused; an online petition takes at most 500 signatures, one per name and area.', '/petition.html', 'Online petitions store the title, request, letter (phone numbers and emails hidden) and each signer\'s first name and area for 180 days. The person who started it can delete it. "Collect on this phone" stores nothing on our server.'],
  ['🏛️ Who to send it to (Ogun State)', 'Pick any of the 20 Local Government Areas in Ogun State and see the offices people usually write to: the Local Government Chairman, ward councillor, Ward Development Committee, LGEA, CDA, traditional ruler, state ministries, police (DPO, PCRC) and the electricity company (IBEDC customer care, then the NERC forum office). Each card shows how to address the letter and a <b>verify locally</b> note. We show office titles only and <b>never guess phone numbers, emails or names</b>; you can fill in details you have checked, and share a checked list with your class or CDA.', '/who-to-send-to.html', 'Details you type stay on your phone.']
];
write('whats-new/index.html', page({
  rel: 'whats-new/index.html', title: "What's new in Community Voice AI",
  description: 'New: letter tracker with calendar reminders and one-tap follow-ups, petitions with a signature list PDF, and who to write to in Ogun State.',
  h1: "What's new in Community Voice AI", crumbs: [['Home', '/'], ["What's new", '/whats-new/']],
  body: `
  <p class="answer-box"><b>Version 4 (November 2026):</b> three new features, added by <b>the ByteBusters team at Yewa College</b>, Ilaro, Ogun State. All of them work on a basic phone, need no account, and collect only what each feature needs.</p>
  ${NEW.map(([h, what, href, privacy]) => `<h2>${h}</h2>\n  <p>${what}</p>\n  <p class="note"><b>Your data:</b> ${esc(privacy)}</p>\n  <p><a class="btn ghost" href="${href}">Try it</a></p>`).join('\n  ')}
  <h2>Still the same</h2>
  <ul class="check"><li>You are always the author of your letter.</li><li>Phone numbers, emails and names are removed before anything reaches the AI.</li><li>Free, no sign-up. In an emergency, call 112.</li></ul>
  ${cta('')}`,
  schema: [{ '@type': 'WebPage', name: "What's new in Community Voice AI", url: URL_ + '/whats-new/', datePublished: '2026-11-27', dateModified: TODAY, publisher: { '@id': URL_ + '/#org' }, creator: { '@type': 'Organization', name: 'ByteBusters team at Yewa College, Ilaro' } }]
}));
pages.push({ loc: '/whats-new/', pri: '0.5' });

// ---------- 404.html : friendly "page not found" (not in the sitemap) ----------
write('404.html', page({
  rel: '404.html', title: 'Page not found | Community Voice AI',
  description: 'This page could not be found. Write a letter, find who to report a problem to, or read our how-to guides.',
  h1: 'Sorry, we could not find that page', crumbs: [['Home', '/'], ['Page not found', '/404.html']],
  body: `
  <p>The link may be old or mistyped. Try one of these:</p>
  <ul><li><a href="/">Write a letter with AI</a></li><li><a href="/report/">Who do I report to?</a></li><li><a href="/offices/">Offices</a></li><li><a href="/how-to/">How-to guides</a></li><li><a href="/faq/">FAQ</a></li></ul>`
}).replace('<meta name="robots" content="index, follow', '<meta name="robots" content="noindex, follow').replace(/\n  <link rel="canonical"[^>]*>/, ''));

// ---------- sitemap.xml, llms.txt, verification codes ----------
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${URL_}${p.loc}</loc><lastmod>${TODAY}</lastmod><priority>${p.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
// keep only the hand-written top of llms.txt; everything from "## Data" down is made again here
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').split(/\n## (?:Data|Who do I report to)/)[0].trimEnd();
write('llms.txt', llms + `\n\n## Data\n- [Community Issue Map](${URL_}/issues.html): anonymous, opt-in counts of community problems by Nigerian state and type (no letter text, counts under 3 hidden)\n\n## Who do I report to? (one page per problem)\n${L.PROBLEMS.map(p => `- [Who do I report ${p[1]} to in Nigeria?](${URL_}/report/${p[0]}/): ${p[5]}`).join('\n')}\n\n## Offices\n${L.OFFICES.map(o => `- [${cap(o[1])}](${URL_}/offices/${o[0]}/): ${o[2]}`).join('\n')}\n\n## How-to guides\n${L.HOWTO.map(h => `- [${h[1]}](${URL_}/how-to/${h[0]}/): ${h[2]}`).join('\n')}\n`);
['index.html', 'letters.html', 'sign-language.html', 'how-it-works.html', 'who-to-send-to.html', 'petition.html'].forEach(f => {
  let h = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\n\s*<meta name="(google-site-verification|msvalidate\.01)"[^>]*>/g, '');
  if (VERIFY) h = h.replace(/(<link rel="canonical"[^>]*>)/, '$1' + VERIFY);
  fs.writeFileSync(path.join(ROOT, f), h);
});
// ---------- llms-full.txt (GEO): the summary plus every answer in full ----------
write('llms-full.txt', fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8') + `
## About
Community Voice AI was built by students of the ByteBusters coding club at Yewa College, Ilaro, Ogun State, Nigeria, with guidance from the ByteBusters Centre Lead. ByteBusters is a programme of Odu'a Investment Foundation. Free, no sign-up. About page: ${URL_}/about/

## Questions and answers (also at ${URL_}/faq/)
${SITE_FAQ.map(([q, a]) => `### ${q}\n${a}\n`).join('\n')}
## Who to report each problem to, in full
${L.PROBLEMS.map(p => `### ${cap(p[1])}\n${p[5]}\nGuide: ${URL_}/report/${p[0]}/\n`).join('\n')}`);
console.log('Done:', pages.length, 'pages in the sitemap.');
require('./build-key-maker.js');
