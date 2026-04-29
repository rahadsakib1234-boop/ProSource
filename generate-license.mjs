#!/usr/bin/env node
const crypto = require('crypto');

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const [name, email, seatsArg, expiresAtArg] = process.argv.slice(2);

if (!name || !email) {
  console.error('Usage: node generate-license.mjs "Name" "email" [seats] [expiresAt-ISO]');
  process.exit(1);
}

const privateKey = process.env.PROSOURCE_LICENSE_PRIVATE_KEY;

if (!privateKey) {
  console.error('Missing PROSOURCE_LICENSE_PRIVATE_KEY');
  process.exit(1);
}

const payload = {
  product: 'ProSource CRM',
  name,
  email,
  seats: Number.isFinite(Number(seatsArg)) && Number(seatsArg) > 0 ? Number(seatsArg) : 2,
  issuedAt: new Date().toISOString(),
  expiresAt: expiresAtArg || null
};

const payloadPart = base64UrlEncode(JSON.stringify(payload));
const signaturePart = base64UrlEncode(
  crypto.sign(null, Buffer.from(payloadPart, 'utf8'), privateKey)
);

process.stdout.write(`${payloadPart}.${signaturePart}\n`);
