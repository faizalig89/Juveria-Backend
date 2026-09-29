import fs from 'node:fs';

const file = './.env.example';

const content = `# Juveria eInvoice Compliance Hub
# Example configuration only.
# NEVER place real production secrets in this file.

NODE_ENV=development
PORT=4000

# PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

# Replace with a strong secret in the real environment.
# Production requires at least 32 characters.
JWT_SECRET=replace-with-a-secure-secret-at-least-32-characters

# Comma-separated allowed frontend origins.
CORS_ORIGINS=http://localhost:3000

# Optional.
# Leave empty for ./uploads during local development.
# Production can point this to persistent mounted storage.
STORAGE_ROOT=

# Optional Java overrides.
# Normally Java is discovered automatically.
JAVA_EXECUTABLE=
JAVA_HOME=
`;

fs.writeFileSync(
  file,
  content,
  'utf8',
);

const verify =
  fs.readFileSync(file, 'utf8');

const requiredNames = [
  'NODE_ENV=',
  'PORT=',
  'DATABASE_URL=',
  'JWT_SECRET=',
  'CORS_ORIGINS=',
  'STORAGE_ROOT=',
  'JAVA_EXECUTABLE=',
  'JAVA_HOME=',
];

for (const name of requiredNames) {
  if (!verify.includes(name)) {
    throw new Error(
      `FAIL: missing ${name}`,
    );
  }
}

console.log(
  'ENV_EXAMPLE_CREATED = PASS',
);
console.log(
  'ENV_VARIABLE_CONTRACT_DOCUMENTED = PASS',
);
