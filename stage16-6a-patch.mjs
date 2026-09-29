import fs from 'node:fs';

const file =
  './src/compliance/schematron/uae-pint-ae-schematron.service.ts';

let s = fs.readFileSync(file, 'utf8');

fs.copyFileSync(
  file,
  file + '.stage16-6-backup',
);

if (!s.includes("import { join, resolve } from 'node:path';")) {
  throw new Error('Expected node:path import not found.');
}

s = s.replace(
  "import { join, resolve } from 'node:path';",
  "import { delimiter, join, resolve } from 'node:path';",
);

const oldClasspath =
`    const classPath =
      \`\${this.saxonJar};\${this.resolverJar}\`;`;

const newClasspath =
`    const classPath = [
      this.saxonJar,
      this.resolverJar,
    ].join(delimiter);`;

if (!s.includes(oldClasspath)) {
  throw new Error('Expected Saxon classpath block not found.');
}

s = s.replace(oldClasspath, newClasspath);

const anchor =
`  async validate(
    xml: string,
  ): Promise<SchematronValidationResult> {`;

if (!s.includes(anchor)) {
  throw new Error('validate() anchor not found.');
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

if (!verify.includes("delimiter, join, resolve")) {
  throw new Error('Cross-platform path delimiter patch failed.');
}

if (!verify.includes('checkRuntimeDependencies')) {
  throw new Error('Runtime dependency probe patch failed.');
}

console.log('STAGE_16_6A_SCHEMATRON_RUNTIME_PATCHED');
console.log('SAXON_CLASSPATH_CROSS_PLATFORM');
console.log('JAVA_RUNTIME_PROBE_ADDED');
console.log('PINT_AE_RESOURCE_PROBE_ADDED');
