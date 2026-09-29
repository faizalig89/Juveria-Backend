import fs from 'node:fs';

const file =
  './src/compliance/schematron/uae-pint-ae-schematron.service.ts';

const backup =
  file + '.stage16-6a-final-backup';

let s = fs.readFileSync(file, 'utf8');

if (s.includes('checkRuntimeDependencies()')) {
  throw new Error(
    'STOP: runtime dependency probe already exists.',
  );
}

if (!s.includes("import { join, resolve } from 'node:path';")) {
  throw new Error(
    'STOP: expected node:path import not found.',
  );
}

if (!s.includes('async validate(')) {
  throw new Error(
    'STOP: validate method not found.',
  );
}

fs.copyFileSync(file, backup);

/* 1. Cross-platform Java classpath support */
s = s.replace(
  "import { join, resolve } from 'node:path';",
  "import { delimiter, join, resolve } from 'node:path';",
);

/* 2. Replace Windows-only ; classpath separator */
const classPathRegex =
  /const classPath\s*=\s*`\$\{this\.saxonJar\};\$\{this\.resolverJar\}`;/;

if (!classPathRegex.test(s)) {
  throw new Error(
    'STOP: existing Saxon classpath expression not found.',
  );
}

s = s.replace(
  classPathRegex,
`const classPath = [
      this.saxonJar,
      this.resolverJar,
    ].join(delimiter);`,
);

/* 3. Insert runtime dependency probe */
const validateIndex = s.indexOf('  async validate(');

if (validateIndex === -1) {
  throw new Error(
    'STOP: validate insertion point not found.',
  );
}

const probe =
`  async checkRuntimeDependencies(): Promise<void> {
    const requiredFiles = [
      this.saxonJar,
      this.resolverJar,
      this.sharedXslt,
      this.uaeXslt,
    ];

    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(
          'Required PINT-AE runtime resource is unavailable.',
        );
      }
    }

    await execFileAsync(
      this.resolveJavaExecutable(),
      ['-version'],
      {
        windowsHide: true,
        timeout: 5000,
        maxBuffer: 1024 * 1024,
      },
    );
  }

`;

s =
  s.slice(0, validateIndex) +
  probe +
  s.slice(validateIndex);

fs.writeFileSync(file, s, 'utf8');

/* 4. Machine verification */
const verify = fs.readFileSync(file, 'utf8');

const checks = {
  delimiterImport:
    verify.includes(
      "import { delimiter, join, resolve } from 'node:path';",
    ),

  portableClasspath:
    verify.includes('].join(delimiter);'),

  runtimeProbe:
    verify.includes(
      'async checkRuntimeDependencies(): Promise<void>',
    ),

  resourceCheck:
    verify.includes(
      "'Required PINT-AE runtime resource is unavailable.'",
    ),

  javaProbe:
    verify.includes("['-version']"),

  validateStillPresent:
    verify.includes('async validate('),
};

for (const [name, passed] of Object.entries(checks)) {
  if (!passed) {
    fs.copyFileSync(backup, file);

    throw new Error(
      `VERIFY FAILED: ${name}. Original restored.`,
    );
  }
}

console.log(checks);
console.log('STAGE_16_6A_SOURCE_PATCH = PASS');
console.log('CROSS_PLATFORM_CLASSPATH = PASS');
console.log('JAVA_DEPENDENCY_PROBE = PASS');
console.log('PINT_AE_RESOURCE_PROBE = PASS');
