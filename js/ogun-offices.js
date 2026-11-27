/* Community Voice AI - WHO TO SEND IT TO (Ogun State)          version 4
 * ------------------------------------------------------------------
 * Office TITLES and what each office handles, for all 20 Local Government
 * Areas of Ogun State (the LGA names come from INEC's list in js/lgas.js).
 *
 * THE RULE: we never invent a phone number, email, address or name.
 *   - Every contact field below starts EMPTY.
 *   - A user can fill in details they have checked. Those stay on their
 *     own phone (localStorage), never on our server.
 *   - The site owner (ADMIN) may fill in KNOWN details here, but ONLY
 *     after checking them in person or on an official .gov.ng website,
 *     and must write the date and the source. Example:
 *       KNOWN["Yewa South (Egbado South)|lga-chairman"] =
 *         { address: "...", phone: "", email: "", checkedOn: "2026-12-01", source: "visited the secretariat" };
 *     The page then shows it with "Checked by the ByteBusters team on <date>: still verify locally".
 *   - Office names change (ministries are renamed, office holders change
 *     after elections), so every card says "verify locally".
 * ------------------------------------------------------------------ */
(function (root) {
  "use strict";
  var STATE = "Ogun";

  // {LGA} is replaced by the LGA the user picks. guide = our Civic Guide page.
  var OFFICES = [
    { id: "lga-chairman", group: "Local Government", title: "Executive Chairman, {LGA} Local Government", to: "The Executive Chairman,\n{LGA} Local Government", recipient: "Local Government Chairman",
      handles: "Local streets and drains, refuse, markets and motor parks, streetlights, primary health centres (with the state).",
      where: "The Local Government secretariat in the LGA headquarters town. Give the letter to the Chairman's office or the registry.",
      verify: "Ask at the secretariat for the exact address and the Chairman's current name. Names change after elections, so \"The Executive Chairman\" is always safe.", guide: "/offices/local-government-chairman/" },
    { id: "lga-secretary", group: "Local Government", title: "Secretary to the Local Government, {LGA}", to: "The Secretary to the Local Government,\n{LGA} Local Government", recipient: "Local Government Chairman",
      handles: "Receives and directs letters inside the council when the Chairman is not available.",
      where: "Local Government secretariat (same building as the Chairman's office).",
      verify: "Confirm at the registry that letters can be addressed this way in your LGA.", guide: "/offices/local-government-chairman/" },
    { id: "councillor", group: "Local Government", title: "Ward Councillor, {WARD}, {LGA}", to: "The Honourable Councillor,\n{WARD},\n{LGA} Local Government", recipient: "Local Government Chairman",
      handles: "Speaks for your ward in the Local Government council and follows up council projects in the ward.",
      where: "Ask at the Local Government secretariat for your ward councillor's office.",
      verify: "Every LGA is divided into wards. Write your ward name or number in the box above (ask your CDA or at the secretariat if you do not know it).", guide: "/offices/ward-councillor/" },
    { id: "ward", group: "Local Government", title: "Ward Development Committee, {WARD}, {LGA}", to: "The Chairman,\nWard Development Committee,\n{WARD}, {LGA} Local Government", recipient: "Local Government Chairman",
      handles: "A committee of community members that supports the primary health centre and other projects in the ward.",
      where: "Ask at your ward's primary health centre or the Local Government health department.",
      verify: "Not every ward's committee is active. Confirm locally who chairs it now.", guide: "/report/health-centre/" },
    { id: "lgea", group: "Local Government", title: "Education Secretary, {LGA} Local Government Education Authority (LGEA)", to: "The Education Secretary,\n{LGA} Local Government Education Authority", recipient: "State Ministry or Agency",
      handles: "Public primary schools in the LGA: buildings, furniture, teachers (working with SUBEB).",
      where: "The LGEA office, usually in the LGA headquarters town. Go through the head teacher first.",
      verify: "Confirm the office address with your head teacher or at the Local Government secretariat.", guide: "/report/school-building/" },
    { id: "cda", group: "Community", title: "Chairman, Community Development Association (CDA)", to: "The Chairman,\n{AREA} Community Development Association", recipient: "Community Development Association (CDA)",
      handles: "Community meetings, self-help projects, and speaking for the community to government.",
      where: "At the monthly CDA meeting, or through the CDA secretary.",
      verify: "Ask a neighbour or your landlord which CDA covers your street.", guide: "/offices/community-development-association/" },
    { id: "traditional-ruler", group: "Community", title: "Traditional ruler of {AREA} (Oba, Olu or Baale)", to: "His Royal Highness,\nThe [title] of {AREA}", recipient: "Traditional Ruler",
      handles: "Community matters, land and disputes; can take the community's request to government.",
      where: "The palace. Go through the palace secretary or a chief, and follow local custom.",
      verify: "Confirm the correct royal title and how to address the ruler with the palace secretary.", guide: "/offices/traditional-ruler/" },
    { id: "works", group: "Ogun State Government", title: "Honourable Commissioner, Ministry of Works (Ogun State)", to: "The Honourable Commissioner,\nMinistry of Works,\nOgun State", recipient: "State Ministry or Agency",
      handles: "State roads, bridges and culverts on state roads, road drainage.",
      where: "The ministry at the State Secretariat, Oke-Mosan, Abeokuta, or its zonal office.",
      verify: "Ministries are sometimes renamed (for example \"Works and Infrastructure\"). Check the exact name on ogunstate.gov.ng before you send.", guide: "/offices/state-ministry-of-works/", link: "https://ogunstate.gov.ng" },
    { id: "water", group: "Ogun State Government", title: "General Manager, Ogun State Water Corporation", to: "The General Manager,\nOgun State Water Corporation", recipient: "State Ministry or Agency",
      handles: "Pipe-borne (tap) water in towns: burst pipes, no supply, water bills.",
      where: "The nearest district or zonal office of the Water Corporation.",
      verify: "Rural boreholes may belong to a different state agency or to the Local Government. Ask at the district office.", guide: "/offices/state-water-corporation/", link: "https://ogunstate.gov.ng" },
    { id: "environment", group: "Ogun State Government", title: "Honourable Commissioner, Ministry of Environment (Ogun State)", to: "The Honourable Commissioner,\nMinistry of Environment,\nOgun State", recipient: "State Ministry or Agency",
      handles: "Major drains, flooding, erosion, pollution, refuse policy.",
      where: "State Secretariat, Oke-Mosan, Abeokuta.",
      verify: "Some matters go to a state environmental protection agency instead. Check on ogunstate.gov.ng.", guide: "/report/flooding/", link: "https://ogunstate.gov.ng" },
    { id: "education", group: "Ogun State Government", title: "Honourable Commissioner, Ministry of Education (Ogun State)", to: "The Honourable Commissioner,\nMinistry of Education,\nOgun State", recipient: "State Ministry or Agency",
      handles: "Public secondary schools: buildings, toilets, furniture, teachers.",
      where: "State Secretariat, Oke-Mosan, Abeokuta, or the zonal education office. Go through your principal first.",
      verify: "The ministry's full name can include \"Science and Technology\". Check the exact name before you send.", guide: "/report/school-toilets/", link: "https://ogunstate.gov.ng" },
    { id: "assembly", group: "Ogun State Government", title: "Member, Ogun State House of Assembly ({LGA} constituency)", to: "The Honourable Member representing\n[constituency name],\nOgun State House of Assembly", recipient: "State Ministry or Agency",
      handles: "Raises your problem in the House and with state ministries; constituency projects.",
      where: "The member's constituency office, or the House of Assembly complex, Abeokuta.",
      verify: "Some LGAs have more than one constituency. Ask at the Local Government secretariat which one covers your area.", guide: "/offices/state-house-of-assembly-member/" },
    { id: "dpo", group: "Police", title: "Divisional Police Officer (DPO), [division] Division", to: "The Divisional Police Officer,\n[division] Police Division,\n{LGA}", recipient: "State Ministry or Agency",
      handles: "Patrols, crime reports and community safety in your area.",
      where: "Your nearest police division headquarters. Go with community leaders.",
      verify: "Ask at your nearest police station which division covers your street. In an emergency call 112, not a letter.", guide: "/offices/police-dpo/" },
    { id: "pcrc", group: "Police", title: "Police Community Relations Committee (PCRC), [division] Division", to: "The Chairman,\nPolice Community Relations Committee,\n[division] Division", recipient: "Community Development Association (CDA)",
      handles: "A committee of residents and police that discusses community safety and how police and residents work together.",
      where: "Ask at the police division for the PCRC chairman or meeting day.",
      verify: "Confirm locally that the committee meets in your division.", guide: "/report/insecurity/" },
    { id: "police-pro", group: "Police", title: "Police Public Relations Officer, Ogun State Police Command", to: "The Police Public Relations Officer,\nOgun State Police Command,\nEleweran, Abeokuta", recipient: "Federal Agency",
      handles: "Public enquiries and complaints about police conduct at state level.",
      where: "Ogun State Police Command headquarters, Abeokuta.",
      verify: "Write to your DPO first. Check the current address and contact channels on npf.gov.ng or at your division.", guide: "/offices/police-dpo/", link: "https://npf.gov.ng" },
    { id: "disco", group: "Electricity", title: "Customer Care, IBEDC (Ibadan Electricity Distribution Company)", to: "The Head, Customer Care,\nIbadan Electricity Distribution Company (IBEDC),\n[business hub name] Business Hub", recipient: "Federal Agency",
      handles: "Power outages, faulty transformers, fallen cables, meters and estimated bills. (People still say \"NEPA\" but today it is the distribution company.)",
      where: "Your nearest IBEDC business hub or service centre. Ask for a complaint (ticket) number.",
      verify: "Most of Ogun State is served by IBEDC, but CHECK the company name printed on your electricity bill or prepaid receipt. Get the customer care line from your bill, never from a social media post.", guide: "/offices/electricity-distribution-company/" },
    { id: "nerc", group: "Electricity", title: "NERC Forum Office (electricity complaints not solved by the company)", to: "The Chairman,\nNERC Forum Office,\n[forum office location]", recipient: "Federal Agency",
      handles: "Complaints the electricity company did not resolve. Go here only after you complained to the company and have a ticket number.",
      where: "The forum office that covers your area: find it on the regulator's website.",
      verify: "Find the forum office for your area on nerc.gov.ng.", guide: "/report/estimated-billing/", link: "https://nerc.gov.ng" }
  ];

  // Details checked by the site owner. EMPTY on purpose: fill only after checking, with date and source.
  var KNOWN = {};

  var api = { STATE: STATE, OFFICES: OFFICES, KNOWN: KNOWN, FIELDS: ["holder", "address", "phone", "email", "checkedOn", "source"] };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CV_OGUN = api;
})(typeof window !== "undefined" ? window : globalThis);
