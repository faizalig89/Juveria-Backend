import fs from 'node:fs';

const file = './src/main.ts';
let s = fs.readFileSync(file, 'utf8');

const oldText = `  app.use(
    new RequestContextMiddleware().use.bind(
      new RequestContextMiddleware(),
    ),
  );`;

const newText = `  const requestContextMiddleware =
    new RequestContextMiddleware();

  app.use(
    requestContextMiddleware.use.bind(
      requestContextMiddleware,
    ),
  );`;

if (!s.includes(oldText)) {
  throw new Error('Expected Stage 16.3 middleware block not found. No changes written.');
}

s = s.replace(oldText, newText);
fs.writeFileSync(file, s, 'utf8');

console.log('STAGE_16_3_SINGLE_INSTANCE_FIXED');
