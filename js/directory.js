/*
 * OFFICIAL GOVERNMENT DIRECTORY — Community Voice AI
 * ---------------------------------------------------
 * Each link must be checked by hand before launch.
 *
 * Rules:
 *  - Only official .gov.ng websites.
 *  - Never guess or build a URL. If a website is not confirmed, set url to null.
 *  - Every URL below was checked against official/public sources on
 *    22 October 2026. Re-check them before your launch and update LAST_VERIFIED.
 */

window.CV_DIRECTORY = (function () {
  const LAST_VERIFIED = "22 October 2026";

  // Office types the AI is allowed to choose from (sent to the AI).
  // Federal entries have a confirmed URL. Local offices have no single website,
  // so the app shows the state government website instead.
  const OFFICES = [
    { officeType: "Local Government Council", name: "Your Local Government Council (LGA Secretariat)", url: null },
    { officeType: "State Ministry or Agency", name: "Your State Government (relevant ministry or agency)", url: null },
    { officeType: "Community Development Association", name: "Your Community Development Association (CDA)", url: null },
    { officeType: "Traditional Ruler's Palace", name: "Your Traditional Ruler's Palace", url: null },
    { officeType: "School Management", name: "The School Principal / School Management", url: null },
    { officeType: "Federal Ministry of Environment", name: "Federal Ministry of Environment", url: "https://environment.gov.ng" },
    { officeType: "NESREA", name: "National Environmental Standards and Regulations Enforcement Agency (NESREA)", url: "https://nesrea.gov.ng" },
    { officeType: "FERMA", name: "Federal Roads Maintenance Agency (FERMA) — for federal roads", url: "https://ferma.gov.ng" },
    { officeType: "Federal Ministry of Works", name: "Federal Ministry of Works", url: "https://fmw.gov.ng" },
    // Federal Ministry of Water Resources and Sanitation: its own website could
    // NOT be confirmed as live on 22 Oct 2026, so the url is left empty.
    // Add it only after you open it and confirm it is the official site.
    { officeType: "Federal Ministry of Water Resources and Sanitation", name: "Federal Ministry of Water Resources and Sanitation", url: null },
    { officeType: "NEMA", name: "National Emergency Management Agency (NEMA)", url: "https://nema.gov.ng" },
    { officeType: "NERC", name: "Nigerian Electricity Regulatory Commission (NERC)", url: "https://nerc.gov.ng" },
    { officeType: "Nigeria Police Force", name: "Nigeria Police Force", url: "https://npf.gov.ng" },
    { officeType: "NCDC", name: "Nigeria Centre for Disease Control and Prevention (NCDC)", url: "https://ncdc.gov.ng" }
  ];

  // State government websites. null = not yet confirmed (do not guess).
  // Confirmed so far: Lagos, Ogun, Rivers, FCT. Add others after checking.
  const STATES = {
    "Abia": null, "Adamawa": null, "Akwa Ibom": null, "Anambra": null,
    "Bauchi": null, "Bayelsa": null, "Benue": null, "Borno": null,
    "Cross River": null, "Delta": null, "Ebonyi": null, "Edo": null,
    "Ekiti": null, "Enugu": null, "FCT (Abuja)": "https://fcta.gov.ng",
    "Gombe": null, "Imo": null, "Jigawa": null, "Kaduna": null,
    "Kano": null, "Katsina": null, "Kebbi": null, "Kogi": null,
    "Kwara": null, "Lagos": "https://lagosstate.gov.ng", "Nasarawa": null,
    "Niger": null, "Ogun": "https://ogunstate.gov.ng", "Ondo": null,
    "Osun": null, "Oyo": null, "Plateau": null,
    "Rivers": "https://riversstate.gov.ng", "Sokoto": null, "Taraba": null,
    "Yobe": null, "Zamfara": null
  };

  // Fallback when a state's own site is not confirmed: the official
  // Federal Government of Nigeria portal.
  const FEDERAL_PORTAL = { name: "Federal Government of Nigeria portal", url: "https://nigeria.gov.ng" };

  function findOffice(type) {
    return OFFICES.find(o => o.officeType === type) || null;
  }

  return { LAST_VERIFIED, OFFICES, STATES, FEDERAL_PORTAL, findOffice };
})();

// NOTE: the same officeType names are listed in /api/generate.js (OFFICE_TYPES).
// If you add or rename an office type here, update that list too.
