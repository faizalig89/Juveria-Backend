import fs from "node:fs";

const path =
  "./src/invoice-document/invoice-file-validator.service.spec.ts";

let content = fs.readFileSync(path, "utf8");

const marker = "\n});";
const position = content.lastIndexOf(marker);

if (position < 0) {
  throw new Error(
    "Final describe marker not found - STOP"
  );
}

const tests = `

  it('accepts a structurally valid CSV file', async () => {
    const file = join(directory, 'invoice.csv');

    await writeFile(
      file,
      [
        'invoiceNumber,invoiceDate,currency,totalAmount',
        'CSV-VALID-001,2026-09-25,AED,105',
      ].join('\\n'),
      'utf8',
    );

    await expect(
      service.validate(file, '.csv'),
    ).resolves.toBeUndefined();
  });

  it('accepts UTF-8 CSV containing a BOM', async () => {
    const file = join(directory, 'invoice-bom.csv');

    await writeFile(
      file,
      '\\uFEFF' +
        [
          'invoiceNumber,invoiceDate,currency,totalAmount',
          'CSV-BOM-001,2026-09-25,AED,105',
        ].join('\\n'),
      'utf8',
    );

    await expect(
      service.validate(file, '.csv'),
    ).resolves.toBeUndefined();
  });

  it('rejects an empty CSV file', async () => {
    const file = join(directory, 'empty.csv');

    await writeFile(file, '', 'utf8');

    await expect(
      service.validate(file, '.csv'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects CSV containing headers but no records', async () => {
    const file = join(directory, 'headers-only.csv');

    await writeFile(
      file,
      'invoiceNumber,invoiceDate,currency,totalAmount',
      'utf8',
    );

    await expect(
      service.validate(file, '.csv'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects malformed CSV quoting', async () => {
    const file = join(directory, 'malformed.csv');

    await writeFile(
      file,
      [
        'invoiceNumber,invoiceDate,currency,totalAmount',
        '"CSV-BROKEN-001,2026-09-25,AED,105',
      ].join('\\n'),
      'utf8',
    );

    await expect(
      service.validate(file, '.csv'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
`;

content =
  content.slice(0, position) +
  tests +
  content.slice(position);

fs.writeFileSync(path, content, "utf8");

console.log(
  "CSV VALIDATOR TEST PATCH = PASS"
);