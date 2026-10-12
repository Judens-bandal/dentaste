import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const versionJsonPath = path.resolve(
  __dirname,
  'src',
  'assets',
  'version.json',
);

let versionData = {};

if (fs.existsSync(versionJsonPath)) {
  const raw = fs.readFileSync(versionJsonPath, 'utf8').trim();

  versionData = raw ? JSON.parse(raw) : {};
}

function getSemanticParts(version) {
  const match = version?.match(/^(\d+)\.(\d+)/);

  return match ? [parseInt(match[1]), parseInt(match[2])] : [1, 0];
}

function bumpVersion(major, minor) {
  minor += 1;

  if (minor > 99) {
    major += 1;
    minor = 1;
  }

  return [major, minor];
}

function getManilaTimestamp() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;

    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

const previousCustomVersion = versionData.bump?.version;

const [major, minor] = getSemanticParts(previousCustomVersion);

const [newMajor, newMinor] = bumpVersion(major, minor);

const timestamp = getManilaTimestamp();

const newVersion = `${newMajor}.${newMinor} ${timestamp}`;

const commitHash = execSync('git rev-parse --short HEAD', { cwd: __dirname })
  .toString()
  .trim();

let remoteUrl = execSync('git config --get remote.origin.url', {
  cwd: __dirname,
})
  .toString()
  .trim();

if (remoteUrl.startsWith('git@')) {
  remoteUrl = remoteUrl
    .replace(':', '/')
    .replace('git@', 'https://')
    .replace('.git', '');
} else if (remoteUrl.endsWith('.git')) {
  remoteUrl = remoteUrl.replace('.git', '');
}

const commitUrl = `${remoteUrl}/commit/${commitHash}`;

versionData.bump = { version: newVersion, lastCommit: commitUrl };

fs.mkdirSync(path.dirname(versionJsonPath), { recursive: true });

fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');

console.log(`Version Bump: ${newVersion}`);

console.log(`Commit URL: ${commitUrl}`);
