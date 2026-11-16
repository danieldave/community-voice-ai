/* Community Voice AI — main page logic
 * 1. Collect form choices  2. Run the privacy filter in the browser
 * 3. Send to /api/generate  4. Show the JSON reply  5. Colour the urgency pill
 */
(function () {
  const DIR = window.CV_DIRECTORY;
  const clean = window.cvClean;
  const toast = window.cvToast || function () {};
  const $ = id => document.getElementById(id);
  const SUBMIT_LABEL = "✨ Write My Letter";

  // ---- Fill the state dropdown (36 states + FCT) ----
  const stateSel = $("state");
  Object.keys(DIR.STATES).forEach(s => {
    const o = document.createElement("option");
    o.value = s; o.textContent = s;
    stateSel.appendChild(o);
  });

  // ---- Community copy languages (v2) ----
  const langSel = $("communityLang");
  Object.entries(window.CV_LANGS || {}).forEach(([code, name]) => {
    const o = document.createElement("option"); o.value = code; o.textContent = name; langSel.appendChild(o);
  });
  try { const l = localStorage.getItem("cv-community-lang"); if (l) langSel.value = l; } catch (e) {}
  langSel.addEventListener("change", () => { try { localStorage.setItem("cv-community-lang", langSel.value); } catch (e) {} });

  // ---- Follow-up mode: opened from "My Letters" with ?followup=ID (v2) ----
  let followUp = null, followUpId = null;
  const fid = new URLSearchParams(location.search).get("followup");
  const first = fid && window.CVTracker ? CVTracker.find(fid) : null;

  // ---- Fields, validation messages ----
  const FIELDS = [
    ["problemType", "Choose a problem type."],
    ["state", "Choose your state."],
    ["area", "Type your area or community."],
    ["duration", "Choose how long the problem has lasted."],
    ["affected", "Choose who is affected."],
    ["recipient", "Choose who the letter is for."],
    ["tone", "Choose a tone."],
    ["description", "Describe the problem (at least 20 characters)."]
  ];
  const isFilled = id => {
    const v = $(id).value.trim();
    return id === "description" ? v.length >= 20 : !!v;
  };

  // ---- Live character counter + progress bar ----
  const desc = $("description");
  const counter = $("desc-count");
  const bar = $("progress");
  function update() {
    const n = desc.value.length;
    counter.textContent = n + " / 1000";
    counter.classList.toggle("near", n >= 900);
    const done = FIELDS.filter(([id]) => isFilled(id)).length;
    bar.firstElementChild.style.width = (done / FIELDS.length * 100) + "%";
    bar.setAttribute("aria-valuenow", String(done));
    $("progress-text").textContent = done === FIELDS.length ? "All done — ready! 🎉" : done + " of 8 done";
  }
  FIELDS.forEach(([id]) => { $(id).addEventListener("input", update); $(id).addEventListener("change", update); });
  if (first) {
    Object.entries(first.form).forEach(([k, v]) => { if ($(k)) $(k).value = v; });
    $("tone").value = "Follow-up (we wrote before)";
    followUp = { sentOn: first.sentOn, how: first.how, office: first.office, reference: first.reference };
    followUpId = first.id;
    const note = $("followup-note");
    note.textContent = "🔁 Follow-up for your letter sent on " + CVTracker.nice(first.sentOn) + (first.office ? " to " + first.office : "") + ". We filled in the same details. Change the description if anything is new, then press Write My Letter.";
    note.classList.remove("hidden");
  }
  update();

  // ---- Example quick-fills (state and area are left for the user) ----
  const EXAMPLES = {
    water:  { problemType: "Water", duration: "1 to 6 months", affected: "A whole community", recipient: "Local Government Chairman", tone: "Polite request",
              description: "The public borehole for our area don spoil for over two months. Families now buy water every day and children carry jerrycans far before school." },
    light:  { problemType: "Electricity / Streetlights", duration: "1 to 6 months", affected: "A whole street", recipient: "Local Government Chairman", tone: "Firm and urgent",
              description: "All the street lights on our road have stopped working. It is very dark at night, people are afraid to walk home, and it is not safe for students coming back from lessons." },
    road:   { problemType: "Roads", duration: "More than 6 months", affected: "A whole community", recipient: "State Ministry or Agency", tone: "Follow-up (we wrote before)",
              description: "The main road into our community has big potholes. When it rains it fills with water, vehicles get stuck, and school children have to walk through mud." },
    waste:  { problemType: "Waste and Drainage", duration: "1 to 4 weeks", affected: "A whole street", recipient: "Community Development Association (CDA)", tone: "Polite request",
              description: "The gutter on our street is blocked with refuse. Dirty water now stands there, it smells badly and mosquitoes are increasing." }
  };
  document.querySelectorAll("[data-example]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ex = EXAMPLES[btn.getAttribute("data-example")];
      Object.entries(ex).forEach(([k, v]) => { $(k).value = v; });
      update();
      toast("Example added — now pick your state and area.");
      (stateSel.value ? $("area") : stateSel).focus();
    });
  });

  function validate() {
    const errors = [];
    FIELDS.forEach(([id, msg]) => {
      const bad = !isFilled(id);
      $(id).setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) errors.push({ id, msg });
    });
    return errors;
  }

  // ---- UI states ----
  function show(which) {
    ["out-empty", "out-loading", "out-error", "out-result"].forEach(id => $(id).classList.add("hidden"));
    if (which) $(which).classList.remove("hidden");
  }

  const PILL = {
    high:   { cls: "high",   text: "Urgent" },
    medium: { cls: "medium", text: "Important" },
    low:    { cls: "low",    text: "Can wait" }
  };

  function link(url) {
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = url.replace("https://", "");
    return a;
  }

  function renderOffice(officeType, state) {
    const box = $("office");
    box.innerHTML = "";
    const office = officeType ? DIR.findOffice(officeType) : null;

    const p1 = document.createElement("p");
    const s = document.createElement("strong"); s.textContent = "Suggested office: ";
    p1.appendChild(s);
    p1.appendChild(document.createTextNode(office ? office.name : "Your Local Government Council"));
    box.appendChild(p1);

    if (office && office.url) {
      const p = document.createElement("p");
      p.appendChild(document.createTextNode("Official website: "));
      p.appendChild(link(office.url));
      box.appendChild(p);
    }

    const stateUrl = DIR.STATES[state];
    const p2 = document.createElement("p");
    if (stateUrl) {
      p2.appendChild(document.createTextNode((state === "FCT (Abuja)" ? "FCT Administration" : state + " State Government") + ": "));
      p2.appendChild(link(stateUrl));
    } else {
      p2.appendChild(document.createTextNode("Your state website is not yet in our checked list. Federal portal: "));
      p2.appendChild(link(DIR.FEDERAL_PORTAL.url));
    }
    box.appendChild(p2);

    const tip = document.createElement("p");
    tip.className = "small";
    tip.textContent = "Tip: you can also print the letter and deliver it by hand. Keep a copy and write down the date you delivered it.";
    box.appendChild(tip);
  }

  const letterBox = $("letter");
  function updateMeta() {
    const words = letterBox.value.trim() ? letterBox.value.trim().split(/\s+/).length : 0;
    $("letter-meta").textContent = words + " words";
  }
  letterBox.addEventListener("input", updateMeta);

  function renderResult(data, state) {
    if (data.rejected) {
      $("out-error").textContent = data.message || "Please describe a real problem in your community.";
      show("out-error");
      return;
    }
    const u = PILL[data.urgency] || PILL.medium;   // conditional: red / amber / green
    $("pill").className = "pill " + u.cls;
    $("pill-text").textContent = u.text;
    $("urgency-reason").textContent = data.urgency_reason || "";

    const safety = $("safety");
    if (data.safety_note) { safety.textContent = "🚨 " + data.safety_note; safety.classList.remove("hidden"); }
    else { safety.classList.add("hidden"); }

    letterBox.value = data.letter || "";
    updateMeta();

    const steps = $("steps");
    steps.innerHTML = "";
    (data.self_help_steps || []).forEach(s => {
      const li = document.createElement("li"); li.textContent = s; steps.appendChild(li);
    });

    renderOffice(data.office_type, state);
    renderCommunity(data);
    lastResult = data;
    const off = data.office_type && DIR.findOffice(data.office_type);
    if (!$("sent-office").value) $("sent-office").value = followUp && followUp.office ? followUp.office : (off ? off.name : "");
    $("sent-text").textContent = data.sent_to_ai || "";
    show("out-result");
    toast("Your letter is ready ✉️");
    $("out-title").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  let lastForm = null, lastResult = null;

  // ---- Community copy (v2) ----
  function renderCommunity(data) {
    const wrap = $("community-wrap");
    if (!data.community_copy) { wrap.classList.add("hidden"); return; }
    const name = (window.CV_LANGS || {})[data.community_lang] || "Community";
    $("community-label").textContent = "Community copy in " + name;
    $("community-copy").value = data.community_copy;
    $("community-wa").href = "https://wa.me/?text=" + encodeURIComponent(data.community_copy);
    wrap.classList.remove("hidden");
  }

  // ---- "I have sent this letter" (v2) ----
  $("sent-on").value = window.CVTracker ? CVTracker.today() : "";
  $("sent-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!lastForm || !window.CVTracker) return;
    const sentOn = $("sent-on").value;
    if (!sentOn) { $("sent-msg").textContent = "Choose the date you sent it."; return; }
    if (followUpId) {                       // a follow-up: count it on the first letter and restart the 14-day clock
      const old = CVTracker.find(followUpId);
      CVTracker.update(followUpId, { followUps: ((old && old.followUps) || 0) + 1, lastFollowUp: sentOn, sentOn: sentOn, status: "waiting", letter: letterBox.value, how: $("sent-how").value, reference: clean($("sent-ref").value.trim()) || (old && old.reference) || "" });
    } else {
      CVTracker.add({ form: lastForm, subject: lastResult && lastResult.subject, letter: letterBox.value, sentOn: sentOn,
        how: $("sent-how").value, office: clean($("sent-office").value.trim()), reference: clean($("sent-ref").value.trim()) });
    }
    $("sent-msg").innerHTML = "Saved. We will remind you after " + CVTracker.DUE_DAYS + " days. <a href=\"letters.html\">See My Letters →</a>";
    toast("Letter saved to My Letters 📬");
  });

  // ---- Submit ----
  const form = $("cv-form");
  const btn = $("submit-btn");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formErr = $("form-error");
    const errors = validate();
    if (errors.length) {
      formErr.innerHTML = "<strong>Please fix these:</strong>";
      const ul = document.createElement("ul");
      errors.forEach(er => { const li = document.createElement("li"); li.textContent = er.msg; ul.appendChild(li); });
      formErr.appendChild(ul);
      formErr.classList.remove("hidden");
      $(errors[0].id).focus();
      return;
    }
    formErr.classList.add("hidden");

    // Privacy filter runs here, in the browser, BEFORE sending.
    const payload = {
      problemType: $("problemType").value,
      state: stateSel.value,
      area: clean($("area").value.trim()),
      duration: $("duration").value,
      affected: $("affected").value,
      recipient: $("recipient").value,
      tone: $("tone").value,
      description: clean(desc.value.trim()),
      communityLang: langSel.value || undefined,
      followUp: followUp || undefined
    };
    lastForm = { problemType: payload.problemType, state: payload.state, area: payload.area, duration: payload.duration,
      affected: payload.affected, recipient: payload.recipient, tone: payload.tone, description: payload.description };

    btn.disabled = true; btn.textContent = "Writing…";
    show("out-loading");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      let data = {};
      try { data = await r.json(); } catch (_) {}
      if (!r.ok) { const e = new Error(data.error || "We could not write your letter right now."); e.fromServer = true; throw e; }
      renderResult(data, payload.state);
      // Optional and anonymous: count the STATE and PROBLEM TYPE only (never the letter, area or words)
      const consent = document.getElementById("map-consent");
      if (consent && consent.checked) {
        fetch("/api/issues", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          body: JSON.stringify({ state: payload.state, type: payload.problemType }) }).catch(() => {});
      }
    } catch (err) {
      $("out-error").textContent = (err && err.fromServer) ? err.message : "We could not reach the server. Check your internet connection and try again.";
      show("out-error");
    } finally {
      btn.disabled = false; btn.textContent = SUBMIT_LABEL;
    }
  });

  // ---- Output buttons ----
  $("copy-btn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(letterBox.value); }
    catch (_) { letterBox.select(); document.execCommand("copy"); }
    toast("Letter copied 📋");
  });

  $("download-btn").addEventListener("click", () => {
    const blob = new Blob([letterBox.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "community-letter.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Letter downloaded ⬇️");
  });

  $("print-btn").addEventListener("click", () => {
    $("print-area").textContent = letterBox.value;
    window.print();
  });

  $("community-copy-btn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("community-copy").value); } catch (_) { $("community-copy").select(); document.execCommand("copy"); }
    toast("Community copy copied 📋");
  });

  $("reset-btn").addEventListener("click", () => {
    followUp = null; followUpId = null; $("followup-note").classList.add("hidden");
    if (location.search) history.replaceState(null, "", location.pathname);
    form.reset();
    FIELDS.forEach(([id]) => $(id).setAttribute("aria-invalid", "false"));
    letterBox.value = "";
    update();
    show("out-empty");
    $("problemType").focus();
  });
  // A Civic Guide page can send the problem type: /?type=Roads
  try { const sent = new URLSearchParams(location.search).get("type"); const box = $("problemType");
    if (sent && box && [...box.options].some(o => o.value === sent)) { box.value = sent; box.dispatchEvent(new Event("change", { bubbles: true })); } } catch (e) {}
})();
