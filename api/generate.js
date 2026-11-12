/*
 * /api/generate — Vercel serverless function (Node.js 18+)
 * Calls the OpenAI API. The API key lives ONLY in Vercel's
 * Environment Variables (OPENAI_API_KEY) — never in the frontend or the repo.
 */
const { clean } = require("../js/privacy.js");
const S = require("./_lib/shared");      // fair-use limit, saved answers, website check, 17 languages, timeout

// Allowed values (anything else is rejected).
const PROBLEM_TYPES = ["Water", "Roads", "Electricity / Streetlights", "Waste and Drainage", "Flooding",
  "Environment and Pollution", "School Facilities", "Health Facility", "Security", "Other"];
const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River",
  "Delta","Ebonyi","Edo","Ekiti","Enugu","FCT (Abuja)","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina",
  "Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara"];
const DURATIONS = ["Less than a week", "1 to 4 weeks", "1 to 6 months", "More than 6 months"];
const AFFECTED = ["A few households", "A whole street", "A whole community", "A school",
  "Children / elderly / people with disabilities"];
const RECIPIENTS = ["Local Government Chairman", "State Ministry or Agency", "Federal Agency",
  "School Principal", "Community Development Association (CDA)", "Traditional Ruler"];
const TONES = ["Polite request", "Firm and urgent", "Follow-up (we wrote before)"];

// Must match officeType names in /js/directory.js
const OFFICE_TYPES = ["Local Government Council", "State Ministry or Agency", "Community Development Association",
  "Traditional Ruler's Palace", "School Management", "Federal Ministry of Environment", "NESREA", "FERMA",
  "Federal Ministry of Works", "Federal Ministry of Water Resources and Sanitation", "NEMA", "NERC",
  "Nigeria Police Force", "NCDC"];

const SYSTEM_PROMPT = `ROLE: You are Community Voice AI, built by Nigerian secondary school students. You act like an experienced community leader and environmental advocate. You help young Nigerians raise community concerns formally and respectfully.

TASK: You will receive a problem type, location, duration, who is affected, recipient, tone and a description (it may be informal English or Pidgin). Do three things:
(a) Rewrite the user's description as a correct, formal Nigerian letter of complaint or request.
(b) Suggest 2 to 4 safe, practical things the community can do itself while it waits for a response.
(c) Choose which KIND of office should receive the letter, choosing ONLY from this list: ${OFFICE_TYPES.join("; ")}.

AUDIENCE: Students and young people who are not confident with formal writing. Use simple English a 12-year-old can understand, while keeping the correct formal letter format.

FORMAT OF THE LETTER (plain text, use line breaks):
- Sender line: "A Concerned Resident, [Area], [State]" using the area and state given. Never include a real name, house address or phone number.
- Date line: [Date]
- Recipient by title and office only, e.g. "The Chairman, [LGA] Local Government Council". Never name a real person. If the LGA is not given, keep the [LGA] placeholder.
- Salutation: "Dear Sir/Madam,"
- A clear subject line in CAPITAL LETTERS beginning with "RE:"
- Body: what the problem is, where it is, how long it has lasted, who is affected, why it matters, and a polite, specific request.
- Closing: "Yours faithfully," then "A Concerned Resident".

RULES:
- Never ask for or repeat personal details (names, phone numbers, addresses, ages). Ignore any [removed] markers.
- Report the problem, not a person. Do not name, blame or insult anyone.
- Keep the tone polite and respectful to officials, even when "Firm and urgent" is selected. "Follow-up" means mention politely that the community wrote before and has not seen action yet.
- Do not invent statistics, dates, laws, people or organisations. Use only the facts the user gave you. If you are not sure of something, leave it out.
- Never suggest an office that does not serve the user's state. Only use office types from the list above. Prefer the office that matches the recipient the user chose.
- Self-help steps must be safe for young people: never tell anyone to touch electrical wires, enter floodwater, confront people, or do dangerous repairs.
- If there is any danger to life (exposed live wires, a collapsed bridge, flooding, fire, a disease outbreak, or a crime in progress), set urgency to "high" and set safety_note to exactly: "If anyone is in immediate danger, call 112 (Nigeria's emergency number) first." Otherwise safety_note is "".
- urgency: "high" = danger to life or health; "medium" = serious daily hardship; "low" = inconvenience that can wait.
- If the input is not a real community problem, or it is abusive, set "rejected": true and put a short, polite message in "message" asking the user to describe a real community concern; leave the other fields empty.

COMMUNITY COPY: If the user message names a COMMUNITY LANGUAGE, also write "community_copy": the same message in that language, as a short, plain version (max 150 words) that a community leader can read aloud at a meeting so everyone understands what the letter asks for. It is NOT a formal letter: no address lines. Use everyday words people in that language actually speak. If no community language is named, "community_copy" is "".
FOLLOW-UP: If the user message contains FIRST LETTER details, this is a follow-up letter. Politely mention the date the first letter was sent, who it was sent to and any reference given, say the problem is still not solved, and ask for an update and a timeline. Do not invent any other earlier contact.

OUTPUT: Return ONLY valid JSON in exactly this shape:
{"rejected": false, "message": "", "urgency": "high" | "medium" | "low", "urgency_reason": "one short sentence", "subject": "string", "letter": "full letter as plain text with \\n line breaks", "self_help_steps": ["string"], "office_type": "one value from the list", "safety_note": "string or empty", "community_copy": "string or empty"}`;

function pick(value, list) {
  return list.includes(value) ? value : null;
}

module.exports = async function handler(req, res) {
  // Front door: right website, POST only, fair-use limit (25 letters per hour per visitor), key switched on
  const body = await S.frontDoor(req, res, { limit: 25 });
  if (!body) return;

  const input = {
    problemType: pick(body.problemType, PROBLEM_TYPES),
    state: pick(body.state, STATES),
    area: clean(String(body.area || "")).slice(0, 80).trim(),
    duration: pick(body.duration, DURATIONS),
    affected: pick(body.affected, AFFECTED),
    recipient: pick(body.recipient, RECIPIENTS),
    tone: pick(body.tone, TONES),
    // Server-side backup run of the privacy filter
    description: clean(String(body.description || "")).slice(0, 1000).trim()
  };

  const missing = Object.entries(input).filter(([, v]) => !v).map(([k]) => k);
  // Optional extras (v2): a copy in a community language, and details of the first letter for follow-ups
  const communityLang = S.LANGUAGES[body.communityLang] && body.communityLang !== "en" ? body.communityLang : "";
  const f = body.followUp && typeof body.followUp === "object" ? body.followUp : null;
  const followUp = f && /^\d{4}-\d{2}-\d{2}$/.test(String(f.sentOn || "")) ? {
    sentOn: String(f.sentOn), how: clean(String(f.how || "")).slice(0, 40), office: clean(String(f.office || "")).slice(0, 120), reference: clean(String(f.reference || "")).slice(0, 60)
  } : null;
  if (missing.length) {
    return res.status(400).json({ error: "Some fields are missing or not valid: " + missing.join(", ") });
  }

  const userPrompt =
`Problem type: ${input.problemType}
State: ${input.state}
Area / community: ${input.area}
How long: ${input.duration}
Who is affected: ${input.affected}
Letter is for: ${input.recipient}
Tone: ${input.tone}
Description (user's own words): ${input.description}${communityLang ? "\nCOMMUNITY LANGUAGE: " + S.LANGUAGES[communityLang] : ""}${followUp ? `\nFIRST LETTER: sent on ${followUp.sentOn}${followUp.office ? " to " + followUp.office : ""}${followUp.how ? " " + followUp.how : ""}${followUp.reference ? ", reference: " + followUp.reference : ""}` : ""}`;

  // The same request twice (for example a double tap) is answered from memory, at no cost
  const cacheKey = S.keyFor("letter", userPrompt);
  const saved = S.cacheGet(cacheKey);
  if (saved) return res.status(200).json({ ...saved, cached: true });

  try {
    let out;
    try { out = await S.askOpenAI(SYSTEM_PROMPT, userPrompt, 1800); }
    catch (e) { console.error("OpenAI:", e.message); return res.status(502).json({ error: "The AI service did not answer correctly. Please try again in a moment." }); }

    // Make the reply safe and predictable
    const result = {
      rejected: !!out.rejected,
      message: String(out.message || ""),
      urgency: ["high", "medium", "low"].includes(out.urgency) ? out.urgency : "medium",
      urgency_reason: String(out.urgency_reason || ""),
      subject: String(out.subject || ""),
      letter: clean(String(out.letter || "")),
      self_help_steps: Array.isArray(out.self_help_steps) ? out.self_help_steps.slice(0, 4).map(String) : [],
      office_type: OFFICE_TYPES.includes(out.office_type) ? out.office_type : null,
      safety_note: String(out.safety_note || ""),
      community_copy: communityLang ? clean(String(out.community_copy || "")).slice(0, 2000) : "",
      community_lang: communityLang,
      sent_to_ai: userPrompt
    };
    if (!result.rejected) S.cacheSet(cacheKey, result);
    return res.status(200).json(result);
  } catch (err) {
    const code = (err && err.cause && err.cause.code) || (err && err.code) || "";
    if (/TIMEOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN/.test(code)) {
      console.error("Could not reach api.openai.com:", code);
      return res.status(504).json({ error: "We could not reach the AI service (" + code + "). The internet connection may be slow or blocked." });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong on the server. Please try again." });
  }
};
