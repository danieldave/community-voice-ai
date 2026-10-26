/*
 * SIGN LANGUAGE CONTENT — American Sign Language (ASL)
 * ----------------------------------------------------
 * Nigerian Sign Language (NSL) grew from ASL through Andrew Foster's Deaf
 * schools (the first opened in Ibadan in 1960), so many signs are shared.
 * NSL has since developed in its own way, and some Nigerian signs differ.
 * Everything below is labelled as ASL. When a Nigerian Deaf signer confirms the
 * NSL sign for a word, update it and set nsl: "same" or nsl: "different".
 *
 * Descriptions are for a right-handed signer ("dominant hand" = the hand you
 * write with). Left-handed signers mirror them.
 *
 * Adding a video later: record a qualified signer (3–6 s, plain background),
 * save as assets/signs/<word>.mp4 and set video: "assets/signs/<word>.mp4".
 */
window.CV_SIGNS = {
  source: { name: "Lifeprint ASL University (Dr. Bill Vicars)", url: "https://lifeprint.com/asl101/pages-signs/a/abcs.htm" },

  alphabet: [
    ["A", "Make a fist. Rest your thumb against the side of your index finger."],
    ["B", "Hold four fingers straight up, close together. Fold your thumb across your palm."],
    ["C", "Curve your fingers and thumb into the shape of the letter C."],
    ["D", "Point your index finger up. Touch the other fingertips to your thumb to make a circle."],
    ["E", "Bend your fingertips down to touch your thumb, which is tucked across your palm."],
    ["F", "Touch your index finger and thumb in a circle. Hold the other three fingers up and spread."],
    ["G", "Point your index finger and thumb sideways, parallel. Close the other fingers."],
    ["H", "Point your index and middle fingers sideways, together. Close the other fingers."],
    ["I", "Make a fist with your little finger pointing up."],
    ["J", "Make the I handshape, then draw a J in the air with your little finger.", true],
    ["K", "Hold index and middle fingers up in a V. Touch your thumb to the middle of the middle finger."],
    ["L", "Point your index finger up and your thumb out to make an L."],
    ["M", "Make a fist with your thumb tucked under your first three fingers."],
    ["N", "Make a fist with your thumb tucked under your first two fingers."],
    ["O", "Touch all your fingertips to your thumb to make an O."],
    ["P", "Make the K handshape, then turn it so your fingers point down."],
    ["Q", "Make the G handshape, then turn it so your fingers point down."],
    ["R", "Cross your middle finger over your index finger, both pointing up."],
    ["S", "Make a fist with your thumb across the front of your fingers."],
    ["T", "Make a fist with your thumb tucked between your index and middle fingers."],
    ["U", "Hold your index and middle fingers up, pressed together."],
    ["V", "Hold your index and middle fingers up, spread apart."],
    ["W", "Hold your index, middle and ring fingers up and spread."],
    ["X", "Make a fist, then bend your index finger into a hook."],
    ["Y", "Stretch out your thumb and little finger. Fold the other fingers down."],
    ["Z", "Point your index finger and draw a Z in the air.", true]
  ].map(([letter, description, moves]) => ({ letter, description, moves: !!moves })),

  greetings: [
    { word: "Hello", emoji: "👋", description: "Flat hand at the side of your forehead, like a salute. Move it outward, away from your head.", nsl: "" },
    { word: "Thank you", emoji: "🙏", description: "Touch the fingertips of your flat hand to your chin, then move the hand forward and down toward the person.", nsl: "" },
    { word: "Please", emoji: "🤲", description: "Place your flat hand on your chest and rub it in a small circle.", nsl: "" },
    { word: "Sorry", emoji: "😔", description: "Make a fist (A handshape) and rub it in a small circle on your chest.", nsl: "" }
  ],

  community: [
    { word: "Water", emoji: "💧", description: "Make a W handshape and tap your index finger on your chin or lips twice.", url: "https://lifeprint.com/asl101/pages-signs/w/water.htm", nsl: "" },
    { word: "Road", emoji: "🛣️", description: "Hold both flat hands in front of you, palms facing each other, and move them forward together like the sides of a road.", nsl: "" },
    { word: "Light", emoji: "💡", description: "Hold your hand up near your head with fingertips pinched together, then flick the fingers open downward, like light shining.", nsl: "" },
    { word: "Help", emoji: "🆘", description: "Rest a thumbs-up fist on the flat palm of your other hand, then lift both hands up together.", nsl: "" },
    { word: "Danger", emoji: "⚠️", description: "Hold one fist still. Brush the thumb of your other fist upward against the back of it, two or three times.", url: "https://lifeprint.com/asl101/pages-signs/d/danger.htm", nsl: "" },
    { word: "School", emoji: "🏫", description: "Clap your dominant flat hand down onto your other palm (facing up) two times.", nsl: "" },
    { word: "Hospital", emoji: "🏥", description: "Make an H handshape (two fingers) and draw a small cross on your upper arm.", nsl: "" },
    { word: "Problem", emoji: "❗", description: "Bend the index and middle fingers of both hands (bent V). Touch the knuckles together and twist the hands in opposite directions.", nsl: "" }
  ]
};

(function () {
  const S = window.CV_SIGNS;
  const COLORS = ["g1", "g2", "g3", "g4", "g5", "g6"];
  const byLetter = {};
  S.alphabet.forEach(a => { byLetter[a.letter] = a; });

  // ---- Alphabet cards ----
  const alpha = document.getElementById("signs-alphabet");
  if (alpha) {
    S.alphabet.forEach((a, i) => {
      const c = document.createElement("article");
      c.className = "letter-card";
      const big = document.createElement("div");
      big.className = "big " + COLORS[i % COLORS.length];
      big.textContent = a.letter;
      big.setAttribute("aria-hidden", "true");
      const h = document.createElement("h3");
      h.className = "visually-hidden";
      h.style.cssText = "position:absolute;left:-9999px";
      h.textContent = "Letter " + a.letter;
      const p = document.createElement("p");
      p.textContent = a.description;
      c.append(big, h, p);
      if (a.moves) {
        const t = document.createElement("span");
        t.className = "tag"; t.textContent = "↪ This letter moves";
        c.appendChild(t);
      }
      alpha.appendChild(c);
    });
  }

  // ---- Word flip cards ----
  function flipCard(item, i) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "flip";
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", item.word + ". Press to see how to sign it in ASL.");
    const inner = document.createElement("div"); inner.className = "flip-inner";

    const front = document.createElement("div");
    front.className = "face front " + COLORS[i % COLORS.length];
    front.innerHTML = '<span class="emoji" aria-hidden="true"></span><h3></h3><small>Tap to learn the sign</small>';
    front.querySelector(".emoji").textContent = item.emoji;
    front.querySelector("h3").textContent = item.word;

    const back = document.createElement("div");
    back.className = "face back";
    const h = document.createElement("h3"); h.textContent = item.emoji + " " + item.word + " (ASL)";
    const p = document.createElement("p"); p.textContent = item.description;
    const meta = document.createElement("p"); meta.className = "meta";
    meta.textContent = item.nsl === "same" ? "✅ Same sign confirmed in NSL"
      : item.nsl === "different" ? "ℹ️ NSL uses a different sign"
      : "NSL check: ask a Deaf signer near you";
    back.append(h, p);
    if (item.url) {
      const a = document.createElement("a");
      a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = "▶ Watch on Lifeprint";
      a.addEventListener("click", e => e.stopPropagation());
      const pl = document.createElement("p"); pl.appendChild(a);
      back.appendChild(pl);
    }
    back.appendChild(meta);

    inner.append(front, back);
    b.appendChild(inner);
    b.addEventListener("click", () => {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
    });
    return b;
  }
  function fill(id, list, offset) {
    const el = document.getElementById(id);
    if (el) list.forEach((it, i) => el.appendChild(flipCard(it, i + offset)));
  }
  fill("signs-greetings", S.greetings, 0);
  fill("signs-community", S.community, 2);

  // ---- Fingerspeller ----
  const input = document.getElementById("spell-input");
  const out = document.getElementById("spell-out");
  const play = document.getElementById("spell-play");
  let timer = null;

  function render() {
    clearInterval(timer); timer = null;
    if (play) play.textContent = "▶ Play slowly";
    out.innerHTML = "";
    const text = input.value.toUpperCase().replace(/[^A-Z ]/g, "").slice(0, 24);
    text.split("").forEach(ch => {
      const t = document.createElement("div");
      if (ch === " ") { t.className = "spell-tile space"; out.appendChild(t); return; }
      t.className = "spell-tile";
      const b = document.createElement("b"); b.textContent = ch;
      const d = document.createElement("span"); d.textContent = byLetter[ch].description;
      t.append(b, d);
      out.appendChild(t);
    });
  }
  if (input && out) {
    input.addEventListener("input", render);
    render();
    play.addEventListener("click", () => {
      const tiles = Array.from(out.querySelectorAll(".spell-tile:not(.space)"));
      if (!tiles.length) return;
      if (timer) { clearInterval(timer); timer = null; tiles.forEach(t => t.classList.remove("active")); play.textContent = "▶ Play slowly"; return; }
      let i = 0;
      play.textContent = "⏸ Stop";
      const step = () => {
        tiles.forEach(t => t.classList.remove("active"));
        if (i >= tiles.length) { clearInterval(timer); timer = null; play.textContent = "▶ Play slowly"; return; }
        tiles[i].classList.add("active");
        tiles[i].scrollIntoView({ block: "nearest", inline: "nearest" });
        i++;
      };
      step();
      timer = setInterval(step, 1600);
    });
  }

  // ---- Tabs ----
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      document.querySelectorAll("[data-panel]").forEach(p => {
        p.classList.toggle("hidden", p.id !== tab.getAttribute("aria-controls"));
      });
    });
  });
})();
