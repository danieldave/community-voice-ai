/* Community Voice AI - WHICH OFFICE SEES WHICH LETTERS
 * An office key has a SCOPE. The scope decides which letters that office can read.
 *
 *   OG.05        a Local Government: only letters from that LGA (all problem types)
 *   OG#WAT       a State office: letters of its problem types, anywhere in that state
 *   OG#GOV       the Governor's office: every letter from that state
 *   NG#NEMA      a Federal agency: letters of its problem types, in every state
 *   NG           the Federal Desk: every letter in Nigeria
 *
 * DO NOT CHANGE THE SHORT CODES (GOV, WRK, WAT ...). Keys already given out use them.
 * You may improve the names shown on screen. */
(function (root) {
  var STATE_ROLES = {
    GOV: { name: "Office of the Governor", fct: "Office of the FCT Minister", types: null },
    WRK: { name: "Ministry of Works", types: ["Roads"] },
    WAT: { name: "Water Corporation / Water Board", types: ["Water"] },
    ENV: { name: "Ministry of Environment", types: ["Waste and Drainage", "Environment and Pollution", "Flooding"] },
    EMA: { name: "State Emergency Management Agency (SEMA)", fct: "FCT Emergency Management Department (FEMD)", types: ["Flooding"] },
    PWR: { name: "Ministry of Energy / Power", types: ["Electricity / Streetlights"] },
    EDU: { name: "Ministry of Education / SUBEB", fct: "FCT Education Secretariat / UBEB", types: ["School Facilities"] },
    HLT: { name: "Ministry of Health / Primary Health Care Board", fct: "FCT Health Secretariat / PHC Board", types: ["Health Facility"] },
    SEC: { name: "Security Adviser / Ministry of Internal Security", fct: "FCT Security Department", types: ["Security"] }
  };
  var NATIONAL_ROLES = {
    FMENV: { name: "Federal Ministry of Environment", types: ["Environment and Pollution", "Waste and Drainage"] },
    NESREA: { name: "NESREA", types: ["Environment and Pollution"] },
    FERMA: { name: "FERMA (federal roads)", types: ["Roads"] },
    FMW: { name: "Federal Ministry of Works", types: ["Roads"] },
    FMWR: { name: "Federal Ministry of Water Resources and Sanitation", types: ["Water"] },
    NEMA: { name: "NEMA", types: ["Flooding"] },
    NERC: { name: "NERC (electricity regulator)", types: ["Electricity / Streetlights"] },
    NPF: { name: "Nigeria Police Force", types: ["Security"] },
    NCDC: { name: "NCDC", types: ["Health Facility"] }
  };
  var api = { STATE_ROLES: STATE_ROLES, NATIONAL_ROLES: NATIONAL_ROLES };
  if (typeof module === "object" && module.exports) module.exports = api; else root.CVROLES = api;
})(this);
