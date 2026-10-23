/* Community Voice AI — main page logic
 * 1. Collect form choices  2. Run the privacy filter in the browser
 * 3. Send to /api/generate  4. Show the JSON reply  5. Colour the urgency pill
 */
(function () {
  const DIR = window.CV_DIRECTORY;
  const clean = window.cvClean;
  const $ = id => document.getElementById(id);

  // ---- Fill the state dropdown (36 states + FCT) ----
  const stateSel = $("state");
  Object.keys(DIR.STATES).forEach(s => {
    const o = document.createElement("option");
    o.value = s; o.textContent = s;
    stateSel.appendChild(o);
  });

  // ---- Live character counter ----
  const desc = $("description");
  const counter = $("desc-count");
  function updateCount() {
    const n = desc.value.length;
    counter.textContent = n + " / 1000";
    counter.classList.toggle("near", n >= 900);
  }
  desc.addEventListener("input", updateCount);
  updateCount();

  // ---- Form validation ----
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

  function validate() {
    const errors = [];
    FIELDS.forEach(([id, msg]) => {
      const el = $(id);
      const v = el.value.trim();
      const bad = !v || (id === "description" && v.length < 20);
      el.setAttribute("aria-invalid", bad ? "true" : "false");
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

  function renderOffice(officeType, state) {
    const box = $("office");
    box.innerHTML = "";
    const office = officeType ? DIR.findOffice(officeType) : null;

    const p1 = document.createElement("p");
    p1.innerHTML = "<strong>Suggested office:</strong> ";
    p1.appendChild(document.createTextNode(office ? office.name : "Your Local Government Council"));
    box.appendChild(p1);

    if (office && office.url) {
      const p = document.createElement("p");
      p.appendChild(document.createTextNode("Official website: "));
      const a = document.createElement("a");
      a.href = office.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = office.url.replace("https://", "");
      p.appendChild(a);
      box.appendChild(p);
    }

    const stateUrl = DIR.STATES[state];
    const p2 = document.createElement("p");
    if (stateUrl) {
      p2.appendChild(document.createTextNode(state + " State Government: "));
      const a = document.createElement("a");
      a.href = stateUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = stateUrl.replace("https://", "");
      p2.appendChild(a);
    } else {
      p2.appendChild(document.createTextNode("Your state website is not yet in our checked list. Federal portal: "));
      const a = document.createElement("a");
      a.href = DIR.FEDERAL_PORTAL.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = DIR.FEDERAL_PORTAL.url.replace("https://", "");
      p2.appendChild(a);
    }
    box.appendChild(p2);

    const tip = document.createElement("p");
    tip.className = "small";
    tip.textContent = "Tip: you can also print the letter and deliver it by hand to the office. Keep a copy and write down the date you delivered it.";
    box.appendChild(tip);
  }

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
    if (data.safety_note) { safety.textContent = data.safety_note; safety.classList.remove("hidden"); }
    else { safety.classList.add("hidden"); }

    $("letter").value = data.letter || "";

    const steps = $("steps");
    steps.innerHTML = "";
    (data.self_help_steps || []).forEach(s => {
      const li = document.createElement("li"); li.textContent = s; steps.appendChild(li);
    });

    renderOffice(data.office_type, state);
    $("sent-text").textContent = data.sent_to_ai || "";
    show("out-result");
    $("out-title").scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
      state: $("state").value,
      area: clean($("area").value.trim()),
      duration: $("duration").value,
      affected: $("affected").value,
      recipient: $("recipient").value,
      tone: $("tone").value,
      description: clean(desc.value.trim())
    };

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
      if (!r.ok) throw new Error(data.error || "We could not write your letter right now.");
      renderResult(data, payload.state);
    } catch (err) {
      $("out-error").textContent = (err && err.message ? err.message : "Something went wrong.") + " Check your internet connection and try again.";
      show("out-error");
    } finally {
      btn.disabled = false; btn.textContent = "Write My Letter";
    }
  });

  // ---- Output buttons ----
  const status = $("action-status");
  function say(msg) { status.textContent = msg; setTimeout(() => { if (status.textContent === msg) status.textContent = ""; }, 4000); }

  $("copy-btn").addEventListener("click", async () => {
    const text = $("letter").value;
    try { await navigator.clipboard.writeText(text); say("Letter copied."); }
    catch (_) { $("letter").select(); document.execCommand("copy"); say("Letter copied."); }
  });

  $("download-btn").addEventListener("click", () => {
    const blob = new Blob([$("letter").value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "community-letter.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    say("Letter downloaded.");
  });

  $("print-btn").addEventListener("click", () => {
    $("print-area").textContent = $("letter").value;
    window.print();
  });

  $("reset-btn").addEventListener("click", () => {
    form.reset();
    updateCount();
    FIELDS.forEach(([id]) => $(id).setAttribute("aria-invalid", "false"));
    $("letter").value = "";
    show("out-empty");
    $("problemType").focus();
  });
})();
