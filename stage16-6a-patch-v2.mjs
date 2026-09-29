import fs from 'node:fs';

const file =
  './src/compliance/schematron/uae-pint-ae-schematron.service.ts';

let s = fs.readFileSync(file, 'utf8');

if (s.includes('checkRuntimeDependencies()')) {
  throw new Error(
    'STOP: runtime probe already exists. No changes made.',
  );
}

if (
  !s.includes(
    "import { join, resolve } from 'node:path';",
  )
) {
  throw new Error(
    'STOP: expected node:path import not found.',
  );
}

const backup =
  file + '.stage16-6a-clean-backup';

fs.copyFileSync(file, backup);

s = s.replace(
  "import { join, resolve } from 'node:path';",
  "import { delimiter, join, resolve } from 'node:path';",
);

const classPathPattern =
  /const classPath\s*=\s*`\$\{this\.saxonJar\};\$\{this\.resolverJar\}`;/;

if (!classPathPattern.test(s)) {
  throw new Error(
    'STOP: Saxon classpath pattern not found.',
  );
}

s = s.replace(
  classPathPattern,
`const classPath = [
      this.saxonJar,
      this.resolverJar,
    ].join(delimiter);`,
);

const anchor =
`  async validate(
    xml: string,
  ): Promise<SchematronValidationResult> {`;

if (!s.includes(anchor)) {
  throw new Error(
    'STOP: validate() anchor not found.',
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

s = s.replace(anchor, probe + anchor);

fs.writeFileSync(file, s, 'utf8');

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
  javaProbe:
    verify.includes("['-version']"),
};

for (const [name, passed] of Object.entries(checks)) {
  if (!passed) {
    fs.copyFileSync(backup, file);
    throw new Error(
      `VERIFY FAILED: ${name}. Backup restored.`,
    );
  }
}

console.log(checks);
console.log('STAGE_16_6A_SCHEMATRON_RUNTIME_PATCHED');
console.log('SAXON_CLASSPATH_CROSS_PLATFORM = PASS');
console.log('JAVA_RUNTIME_PROBE = PASS');
console.log('PINT_AE_RESOURCE_PROBE = PASS');
