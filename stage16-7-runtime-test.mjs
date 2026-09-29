import fs from 'node:fs';
import path from 'node:path';
import { StorageService } from './dist/storage/service.js';

const testRoot = path.resolve(
  './tmp-stage16-7-storage-test',
);

fs.rmSync(testRoot, {
  recursive: true,
  force: true,
});

fs.mkdirSync(testRoot, {
  recursive: true,
});

process.env.STORAGE_ROOT = testRoot;

const storage = new StorageService();

const actualRoot =
  path.resolve(storage.getUploadDirectory());

if (actualRoot !== testRoot) {
  throw new Error(
    'FAIL: custom STORAGE_ROOT was not used.',
  );
}

const fileName =
  storage.generateFileName('invoice.pdf');

const filePath =
  path.join(testRoot, fileName);

const expected =
  Buffer.from('JUVERIA_STORAGE_TEST');

fs.writeFileSync(
  filePath,
  expected,
);

const resolved =
  storage.getFilePath(fileName);

if (path.resolve(resolved) !== path.resolve(filePath)) {
  throw new Error(
    'FAIL: stored file could not be resolved.',
  );
}

const chunks = [];

await new Promise((resolve, reject) => {
  const stream =
    storage.createReadStream(fileName);

  stream.on('data', (chunk) => {
    chunks.push(chunk);
  });

  stream.on('end', resolve);
  stream.on('error', reject);
});

const retrieved =
  Buffer.concat(chunks).toString('utf8');

if (retrieved !== 'JUVERIA_STORAGE_TEST') {
  throw new Error(
    'FAIL: retrieved content does not match.',
  );
}

let traversalRejected = false;

try {
  storage.getFilePath(
    '../outside-secret.txt',
  );
} catch {
  traversalRejected = true;
}

if (!traversalRejected) {
  throw new Error(
    'FAIL: path traversal was not rejected.',
  );
}

fs.rmSync(testRoot, {
  recursive: true,
  force: true,
});

console.log('');
console.log('STAGE_16_7_RUNTIME = PASS');
console.log('CUSTOM_STORAGE_ROOT = PASS');
console.log('DOCUMENT_WRITE = PASS');
console.log('DOCUMENT_RETRIEVAL = PASS');
console.log('STREAM_DOWNLOAD = PASS');
console.log('PATH_TRAVERSAL_REJECTION = PASS');
console.log('TEMP_TEST_CLEANUP = PASS');
