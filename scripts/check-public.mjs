import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { inspectDemoJpeg, inspectDemoPackage } from './demo-public.mjs';

// Scan Git's actual candidate files, including forcibly tracked ignored paths.
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean),
  ),
];
const deniedPaths =
  /(?:^|\/)(?:\.local|\.private|exports|imports|data|work)(?:\/|$)|\.(?:apk|aab|arsc|har|pem|p12|jks|keystore|zip)$|(?:^|\/)(?:strings|shots|points)\.(?:csv|json)$|(?:service[-_]?account|google-services).*\.json$/i;
const patterns = [
  ['Google client key', /AIza[0-9A-Za-z_-]{35}/],
  ['GitHub credential', /(?:gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,})/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['JWT', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/],
];

/** Permit the explicitly published source-type metadata, never account fields or arbitrary keys. */
function isPublicCaldwellConfiguration(content) {
  try {
    const value = JSON.parse(content);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const fields = Object.keys(value);
    return (
      fields.length === 2 &&
      fields.includes('projectId') &&
      fields.includes('apiKey') &&
      typeof value.projectId === 'string' &&
      /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(value.projectId) &&
      typeof value.apiKey === 'string' &&
      /^AIza[0-9A-Za-z_-]{35}$/.test(value.apiKey)
    );
  } catch {
    return false;
  }
}

const failures = [];
for (const file of files) {
  if (file.startsWith('public/demo/')) {
    if (file === 'public/demo/sample.json')
      failures.push(
        ...inspectDemoPackage(readFileSync(file, 'utf8')).map((reason) => `${file}: ${reason}`),
      );
    else if (file === 'public/demo/target-session.jpg')
      failures.push(...inspectDemoJpeg(readFileSync(file)).map((reason) => `${file}: ${reason}`));
    else failures.push(`${file}: unreviewed public demo asset`);
  }
  if (
    deniedPaths.test(file) ||
    (/(?:^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example'))
  )
    failures.push(`${file}: private file type`);
  if (file === 'scripts/check-public.mjs' || /\.(?:png|jpg|ico|woff2?)$/.test(file)) continue;
  const content = readFileSync(file, 'utf8');
  const sourceConfiguration = file === 'public/sources/caldwell.json';
  const allowedClientMetadata = sourceConfiguration && isPublicCaldwellConfiguration(content);
  if (sourceConfiguration && !allowedClientMetadata)
    failures.push(`${file}: invalid public source configuration`);
  for (const [reason, pattern] of patterns) {
    // Only this exact two-field file may contain the shared Firebase client identifier.
    if (reason === 'Google client key' && allowedClientMetadata) continue;
    if (pattern.test(content)) failures.push(`${file}: ${reason}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n')); // Never print matching values.
  process.exitCode = 1;
} else
  console.log(
    `Public-content check passed (${files.length} files). Review staged content and history manually before publishing.`,
  );
