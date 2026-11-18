#!/usr/bin/env node
/* Builds tools/office-key-maker.html (an offline page for the site owner) from the
   LGA list and the office roles, so the key maker always matches the website.
   Run: node tools/build-key-maker.js   (tools/build.js runs it too) */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('../js/lgas.js'), R = require('../js/office-roles.js');
const data = { codes: L.CODES, lgas: L.LGAS, stateRoles: R.STATE_ROLES, natRoles: R.NATIONAL_ROLES };
const tpl = fs.readFileSync(path.join(__dirname, 'key-maker.template.html'), 'utf8');
fs.writeFileSync(path.join(__dirname, 'office-key-maker.html'), tpl.replace('/*DATA*/null', JSON.stringify(data)));
console.log('Key maker ready: tools/office-key-maker.html');
