import fs from "node:fs";

const file =
  "./src/invoice-ingestion/csv-invoice-mapper.service.ts";

let src = fs.readFileSync(file, "utf8");

const oldKey = `      const rate =
        this.optional(row.taxRate) ?? '';

      const key = \`\${category}|\${rate}\`;`;

const newKey = `      const rate =
        this.optional(row.taxRate) ?? '';

      const numericRate =
        rate === '' ? '' : Number(rate);

      const normalizedRate =
        numericRate === '' || !Number.isFinite(numericRate)
          ? rate
          : String(numericRate);

      const key = \`\${category}|\${normalizedRate}\`;`;

if (!src.includes(oldKey)) {
  throw new Error("Tax grouping key block not found - production file unchanged");
}

src = src.replace(oldKey, newKey);

const oldCompare = `        if (actual !== expected) {
          throw new BadRequestException(
            \`CSV row \${index + 2} has conflicting tax breakdown for category \${category || '(blank)'} rate \${rate || '(blank)'}\`,
          );
        }`;

const newCompare = `        const numericFields = new Set([
          'taxableAmount',
          'taxAmount',
          'taxRate',
        ]);

        const equivalent =
          numericFields.has(field) &&
          actual !== '' &&
          expected !== '' &&
          Number.isFinite(Number(actual)) &&
          Number.isFinite(Number(expected))
            ? Number(actual) === Number(expected)
            : actual === expected;

        if (!equivalent) {
          throw new BadRequestException(
            \`CSV row \${index + 2} has conflicting tax breakdown for category \${category || '(blank)'} rate \${rate || '(blank)'}\`,
          );
        }`;

if (!src.includes(oldCompare)) {
  throw new Error("Tax comparison block not found - production file unchanged");
}

src = src.replace(oldCompare, newCompare);

fs.writeFileSync(file, src, "utf8");

const verify = fs.readFileSync(file, "utf8");

if (
  !verify.includes("normalizedRate") ||
  !verify.includes("numericFields.has(field)")
) {
  throw new Error("Production patch verification failed");
}

console.log("JUVERIA TAX NUMERIC NORMALIZATION = PATCHED");
