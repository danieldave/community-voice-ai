/*
 * NIGERIAN SIGN LANGUAGE (NSL) CONTENT
 * ------------------------------------
 * ACCURACY RULE: do NOT invent signs or descriptions.
 * Only fill in "video" and "description" after a qualified NSL signer or
 * a Deaf teacher has recorded/checked the sign.
 *
 * How to add a sign:
 *   1. Record a short clip (3–6 seconds, plain background, good light) of the
 *      signer. Save it as e.g. assets/signs/water.mp4 (keep it under 1 MB).
 *   2. Set  video: "assets/signs/water.mp4"
 *   3. Write the handshape and movement in "description", as the signer explains it.
 *   4. Put the signer's name or organisation in "checkedBy" (with their permission).
 *   You can also use a YouTube link from a recognised NSL educator:
 *      youtube: "VIDEO_ID"   (only the id after watch?v=)
 */
window.CV_SIGNS = {
  alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => ({
    word: l, video: "", youtube: "", description: "", checkedBy: ""
  })),
  greetings: [
    { word: "Hello", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Thank you", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Please", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Sorry", video: "", youtube: "", description: "", checkedBy: "" }
  ],
  community: [
    { word: "Water", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Road", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Light", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Help", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Danger", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "School", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Hospital", video: "", youtube: "", description: "", checkedBy: "" },
    { word: "Problem", video: "", youtube: "", description: "", checkedBy: "" }
  ]
};

(function () {
  function card(item, isLetter) {
    const c = document.createElement("article");
    c.className = "sign-card";

    const media = document.createElement("div");
    media.className = "sign-media";
    if (item.video) {
      const v = document.createElement("video");
      v.src = item.video; v.controls = true; v.preload = "none"; v.muted = true; v.playsInline = true;
      v.setAttribute("aria-label", "Nigerian Sign Language video for " + item.word);
      media.appendChild(v);
    } else if (item.youtube) {
      const f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(item.youtube);
      f.title = "Nigerian Sign Language video for " + item.word;
      f.loading = "lazy"; f.allowFullscreen = true;
      media.appendChild(f);
    } else {
      media.innerHTML = (isLetter ? '<span class="letter-badge" aria-hidden="true"></span><br>' : "") + "Video coming soon";
      if (isLetter) media.querySelector(".letter-badge").textContent = item.word;
    }
    c.appendChild(media);

    const body = document.createElement("div");
    body.className = "sign-body";
    const h = document.createElement("h3");
    h.textContent = isLetter ? "Letter " + item.word : item.word;
    const p = document.createElement("p");
    p.textContent = item.description || "Handshape and movement: to be added after checking with a qualified NSL signer.";
    body.appendChild(h); body.appendChild(p);
    if (item.checkedBy) {
      const s = document.createElement("p");
      s.textContent = "Checked by: " + item.checkedBy;
      body.appendChild(s);
    }
    c.appendChild(body);
    return c;
  }

  function fill(id, list, isLetter) {
    const el = document.getElementById(id);
    if (!el) return;
    list.forEach(item => el.appendChild(card(item, isLetter)));
  }

  fill("signs-alphabet", window.CV_SIGNS.alphabet, true);
  fill("signs-greetings", window.CV_SIGNS.greetings, false);
  fill("signs-community", window.CV_SIGNS.community, false);
})();
