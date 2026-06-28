#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const OUT = path.join(__dirname, '..', 'build');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
copyDir(SRC, OUT);

// Copy vercel.json and api/ at the project root for the deploy step.
fs.copyFileSync(
  path.join(__dirname, '..', 'vercel.json'),
  path.join(OUT, 'vercel.json')
);
copyDir(path.join(__dirname, '..', 'api'), path.join(OUT, 'api'));

console.log('Build OK →', OUT);
