import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);

const skip = new Set([
  'package-lock.json',
  'frontend/trailcheck-web/package-lock.json',
  'backend/trailcheck-api/package-lock.json',
]);

const contentPatterns = [
  { name: 'private key', pattern: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Google API key', pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'OpenAI-style key', pattern: /sk-(?:live|proj|test)-[A-Za-z0-9]{10,}/ },
  { name: 'GitHub token', pattern: /ghp_[A-Za-z0-9]{20,}/ },
  { name: 'Slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
];

const assignmentPattern =
  /\b(JWT_SECRET|NPS_API_KEY|GEMINI_API_KEY|RESEND_API_KEY|DATABASE_URL|MAIL_FROM_ADDRESS)\b\s*[:=]\s*['"]([^'"]+)['"]/g;

const allowedAssignmentValues = new Set([
  '',
  'changeme',
  'replace-me',
  'placeholder',
  'disabled',
  'example',
]);

function isPlaceholder(value) {
  const normalized = value.trim().replace(/\/$/, '');
  if (!normalized || allowedAssignmentValues.has(normalized.toLowerCase())) {
    return true;
  }
  if (
    normalized.startsWith('your-') ||
    normalized.startsWith('replace-with-') ||
    normalized.includes('localhost') ||
    normalized.startsWith('postgresql://postgres:postgres@') ||
    normalized.startsWith('ci-test-secret')
  ) {
    return true;
  }
  return false;
}

const findings = [];

for (const file of tracked) {
  if (skip.has(file) || file.endsWith('.png') || file.endsWith('.svg')) {
    continue;
  }

  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const check of contentPatterns) {
    if (check.pattern.test(text)) {
      findings.push(`${file}: matched ${check.name}`);
    }
  }

  if (
    file.endsWith('.env.example') ||
    file === '.github/workflows/ci.yml' ||
    file.endsWith('.spec.ts') ||
    file.endsWith('.e2e-spec.ts')
  ) {
    continue;
  }

  for (const match of text.matchAll(assignmentPattern)) {
    const [, name, value] = match;
    if (!isPlaceholder(value)) {
      findings.push(`${file}: ${name} is set to a non-placeholder value`);
    }
  }
}

if (findings.length > 0) {
  console.error('Secret scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed for ${tracked.length} tracked files.`);
