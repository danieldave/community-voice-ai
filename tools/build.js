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
const STATIC = ['/', '/letters.html', '/sign-language.html', '/how-it-works.html', '/issues.html'];
const pages = STATIC.filter(l => l !== '/issues.html').map((loc, i) => ({ loc, pri: i ? '0.6' : '1.0' }));
const write = (rel, text) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const VERIFY = (SITE.googleVerify ? `\n  <meta name="google-site-verification" content="${SITE.googleVerify}">` : '') + (SITE.bingVerify ? `\n  <meta name="msvalidate.01" content="${SITE.bingVerify}">` : '');
const ORG = { '@type': 'EducationalOrganization', '@id': URL_ + '/#org', name: SITE.publisher, url: URL_ + '/' };
const faqSchema = list => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const article = (h, d, loc) => ({ '@type': 'Article', headline: h, description: d, inLanguage: 'en-NG', datePublished: '2026-11-13', dateModified: TODAY, author: { '@id': URL_ + '/#org' }, publisher: { '@id': URL_ + '/#org' }, mainEntityOfPage: URL_ + loc, image: URL_ + '/assets/og-image.png' });
const grid = list => `<ul class="grid">${list.map(([href, b, sm]) => `<li><a href="${href}"><b>${esc(b)}</b><small>${esc(sm || '')}</small></a></li>`).join('')}</ul>`;
const cta = type => `<div class="cta"><a class="btn" href="/?type=${encodeURIComponent(type || '')}#main">Write my letter with AI ✍️</a><a class="btn ghost" href="/letters.html">Track my letters</a></div>`;

function page({ rel, title, description, h1, crumbs, body, schema }) {
  const url = URL_ + '/' + rel.replace(/index\.html$/, '');
  if (title.length > 68) title = title.replace(/ \| Community Voice AI$/, '');
  if (title.length > 68) title = title.replace(/^Who do I report (.*) to in Nigeria\?$/, (m, x) => 'Report ' + x + ': who to write to');
  if (title.length > 68) title = title.slice(0, 66).replace(/\s\S*$/, '') + '…';
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
  <meta name="theme-color" content="#1f1a4d">
  <link rel="icon" href="/assets/logo.svg">
  <link rel="stylesheet" href="/css/guide.css">
  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [ORG, { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: URL_ + c[1] })) }].concat(schema || []) })}</script>
</head>
<body>
<header class="bar"><a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="36" height="36"><span>COMMUNITY <span>VOICE</span> AI</span></a></header>
<nav class="gnav" aria-label="Main"><a href="/report/">Who do I report to?</a><a href="/offices/">Offices</a><a href="/how-to/">How-to guides</a><a href="/">Write a letter</a><a href="/letters.html">My letters</a></nav>
<main class="guide">
  <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => i < crumbs.length - 1 ? `<a href="${c[1]}">${esc(c[0])}</a> › ` : esc(c[0])).join('')}</nav>
  <h1>${esc(h1)}</h1>
${body}
  <p class="note"><b>Emergency?</b> A letter is not for emergencies. Call <b>112</b> (free on every network). If it does not connect, go to the nearest police station, fire station or hospital, or call your state's own emergency line.</p>
  <p class="updated">Written by students of the ${esc(SITE.publisher)}. Last updated <time datetime="${TODAY}">${TODAY}</time>. Offices are organised a little differently in each state: confirm the right office locally before you deliver a letter. In an emergency, call 112.</p>
</main>
<footer><p><a href="/report/">Who do I report to?</a> · <a href="/offices/">Offices</a> · <a href="/how-to/">How-to guides</a> · <a href="/">Write a letter with AI</a></p><p>Built by students of the ${esc(SITE.publisher)}</p></footer>
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

// ---------- sitemap.xml, llms.txt, verification codes ----------
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(p => `  <url><loc>${URL_}${p.loc}</loc><lastmod>${TODAY}</lastmod><priority>${p.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
const llms = fs.readFileSync(path.join(ROOT, 'llms.txt'), 'utf8').split('\n## Who do I report to')[0].trimEnd();
write('llms.txt', llms + `\n\n## Data\n- [Community Issue Map](${URL_}/issues.html): anonymous, opt-in counts of community problems by Nigerian state and type (no letter text, counts under 3 hidden)\n\n## Who do I report to? (one page per problem)\n${L.PROBLEMS.map(p => `- [Who do I report ${p[1]} to in Nigeria?](${URL_}/report/${p[0]}/): ${p[5]}`).join('\n')}\n\n## Offices\n${L.OFFICES.map(o => `- [${cap(o[1])}](${URL_}/offices/${o[0]}/): ${o[2]}`).join('\n')}\n\n## How-to guides\n${L.HOWTO.map(h => `- [${h[1]}](${URL_}/how-to/${h[0]}/): ${h[2]}`).join('\n')}\n`);
['index.html', 'letters.html', 'sign-language.html', 'how-it-works.html'].forEach(f => {
  let h = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\n\s*<meta name="(google-site-verification|msvalidate\.01)"[^>]*>/g, '');
  if (VERIFY) h = h.replace(/(<link rel="canonical"[^>]*>)/, '$1' + VERIFY);
  fs.writeFileSync(path.join(ROOT, f), h);
});
console.log('Done:', pages.length, 'pages in the sitemap.');
require('./build-key-maker.js');
