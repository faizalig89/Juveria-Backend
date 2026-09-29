import fs from 'node:fs';

const file =
  './src/compliance/readiness/uae-einvoice-readiness.service.ts';

const backup =
  file + '.before-remediation-results';

let source = fs.readFileSync(file, 'utf8');

fs.copyFileSync(file, backup);

const anchor = `        passed: internalPassed,
      },`;

const replacement = `        passed: internalPassed,
        results: internal.results,
      },`;

if (!source.includes(anchor)) {
  throw new Error(
    'STOP: Readiness internal response anchor not found.',
  );
}

if (source.includes('results: internal.results')) {
  throw new Error(
    'STOP: Internal results already exist in readiness response.',
  );
}

source = source.replace(anchor, replacement);

fs.writeFileSync(file, source, 'utf8');

const verify = fs.readFileSync(file, 'utf8');

if (!verify.includes('results: internal.results')) {
  throw new Error(
    'STOP: Internal results were not added.',
  );
}

console.log(
  'READINESS_INTERNAL_RESULTS_PATCH = PASS',
);
