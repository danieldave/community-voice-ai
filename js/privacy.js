/*
 * PRIVACY FILTER — Community Voice AI
 * Removes personal details BEFORE anything is sent to the AI.
 * The same file is used in the browser (window.cvClean) and on the server.
 */
(function (root) {
  const RULES = [
    // Emails
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    // Nigerian phone numbers: +234 / 234 / 0 followed by 7,8,9 then 0/1 and 8 digits (spaces or dashes allowed)
    /(?:\+?234[\s-]?|\b0)[789][01](?:[\s-]?\d){8}\b/g,
    // Any long string of 10 or more digits (account, BVN, NIN, ID numbers)
    /\b(?:\d[\s-]?){9,}\d\b/g,
    // Names after "my name is", "I am called", "call me", "na me be" (Pidgin).
    //  Skips words like "on", "at", "via" so "call me on 080..." is not treated as a name.
    /\b(my name is|my name's|i am called|i'm called|call me|na me be|my names are)\s+(?!(?:on|at|via|with|through|for|if|when|any|anytime|back|later|now|today|tomorrow)\b)([A-Za-z'-]+)((?:\s+[A-Za-z'-]+){0,3})/gi
  ];

  function clean(text) {
    if (typeof text !== "string") return "";
    let out = text;
    out = out.replace(RULES[0], "[removed]");
    out = out.replace(RULES[1], "[removed]");
    out = out.replace(RULES[2], "[removed]");
    out = out.replace(RULES[3], (m, lead, first, rest) => {
      // Also remove following words only while they start with a capital letter (surnames).
      let kept = "";
      const words = rest.match(/\s+[A-Za-z'-]+/g) || [];
      let i = 0;
      while (i < words.length && /^[A-Z]/.test(words[i].trim())) i++;
      kept = words.slice(i).join("");
      return lead + " [removed]" + kept;
    });
    return out;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { clean };
  } else {
    root.cvClean = clean;
  }
})(typeof window !== "undefined" ? window : globalThis);
