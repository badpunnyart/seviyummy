import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.startsWith('node_modules/') && !file.startsWith('dist/'));

const patterns = [
  /service[_-]?role/i,
  /secret[_-]?key/i,
  /api[_-]?key\s*[:=]\s*["'][^"']{12,}/i,
  /password\s*[:=]\s*["'][^"']{3,}/i,
  /(?:abc[^\r\n]{0,120}123|123[^\r\n]{0,120}abc)/i,
  /(?:username|login-user|user)[^\r\n]{0,80}(?:placeholder|value)\s*=\s*["']abc["']/i,
  /(?:password|login-pass|pass)[^\r\n]{0,80}(?:placeholder|value)\s*=\s*["']123["']/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/,
];

const ignored = [/\.env\.example$/, /README\.md$/i, /check-secrets\.mjs$/];
const findings = [];

for (const file of files) {
  if (ignored.some((pattern) => pattern.test(file))) continue;
  let content;
  try { content = readFileSync(file, 'utf8'); }
  catch { continue; }
  content.split(/\r?\n/).forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line))) findings.push(`${file}:${index + 1}`);
  });
}

if (findings.length) {
  console.error('Potential secrets found in tracked files:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked files checked).`);
