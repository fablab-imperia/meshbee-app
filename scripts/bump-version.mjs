#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appJsonPath = join(root, 'app.json');
const packageJsonPath = join(root, 'package.json');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, data) => writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);

const RELEASE_TYPES = ['patch', 'minor', 'major'];
const arg = process.argv[2];

if (!arg || (!RELEASE_TYPES.includes(arg) && !/^\d+\.\d+\.\d+$/.test(arg))) {
  console.error(`Uso: node scripts/bump-version.mjs <patch|minor|major|x.y.z>`);
  process.exit(1);
}

const appJson = readJson(appJsonPath);
const packageJson = readJson(packageJsonPath);

const current = appJson.expo.version;
const [major, minor, patch] = current.split('.').map(Number);

let next;
if (RELEASE_TYPES.includes(arg)) {
  if (arg === 'major') next = `${major + 1}.0.0`;
  else if (arg === 'minor') next = `${major}.${minor + 1}.0`;
  else next = `${major}.${minor}.${patch + 1}`;
} else {
  next = arg;
}

const nextCode = (appJson.expo.android?.versionCode ?? 0) + 1;
const nextBuild = String((Number(appJson.expo.ios?.buildNumber) || 0) + 1);

appJson.expo.version = next;
appJson.expo.android = { ...appJson.expo.android, versionCode: nextCode };
appJson.expo.ios = { ...appJson.expo.ios, buildNumber: nextBuild };
packageJson.version = next;

writeJson(appJsonPath, appJson);
writeJson(packageJsonPath, packageJson);

console.log(`Versione: ${current} -> ${next}`);
console.log(`Android versionCode -> ${nextCode}`);
console.log(`iOS buildNumber  -> ${nextBuild}`);
