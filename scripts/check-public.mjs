import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Scan Git's actual candidate files, including forcibly tracked ignored paths.
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean))];
const deniedPaths = /(?:^|\/)(?:\.local|\.private|exports|imports|data|work)(?:\/|$)|\.(?:apk|aab|arsc|har|pem|p12|jks|keystore|zip)$|(?:^|\/)(?:strings|shots|points)\.(?:csv|json)$|(?:service[-_]?account|google-services).*\.json$/i;
const patterns = [
  ['Google client key', /AIza[0-9A-Za-z_-]{35}/],
  ['GitHub credential', /(?:gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,})/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['JWT', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/]
];
const failures = [];
for (const file of files) {
  if (deniedPaths.test(file) || /(?:^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) failures.push(`${file}: private file type`);
  if (file === 'scripts/check-public.mjs' || /\.(?:png|jpg|ico|woff2?)$/.test(file)) continue;
  const content = readFileSync(file, 'utf8');
  for (const [reason, pattern] of patterns) if (pattern.test(content)) failures.push(`${file}: ${reason}`);
}
if (failures.length) {
  console.error(failures.join('\n')); // Never print matching values.
  process.exitCode = 1;
} else console.log(`Public-content check passed (${files.length} files). Review staged content and history manually before publishing.`);
