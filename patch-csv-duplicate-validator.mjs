import fs from "node:fs";

const path =
  "./src/invoice-document/invoice-file-validator.service.ts";

let content = fs.readFileSync(path, "utf8");

const oldBlock = `    try {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      });

      if (!records || records.length === 0) {
        throw new Error('CSV contains no records');
      }
    } catch {
      throw new BadRequestException(
        'Uploaded file contains invalid CSV',
      );
    }`;

const newBlock = `    try {
      const rawRows = parse(content, {
        bom: true,
        skip_empty_lines: true,
        trim: true,
      }) as string[][];

      if (!rawRows.length) {
        throw new Error('CSV contains no records');
      }

      const headers = rawRows[0].map(
        (header) => header.trim(),
      );

      const seenHeaders = new Set<string>();

      for (const header of headers) {
        if (seenHeaders.has(header)) {
          throw new Error(
            \`Duplicate CSV header: \${header}\`,
          );
        }

        seenHeaders.add(header);
      }

      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      });

      if (!records || records.length === 0) {
        throw new Error('CSV contains no records');
      }
    } catch {
      throw new BadRequestException(
        'Uploaded file contains invalid CSV',
      );
    }`;

if (!content.includes(oldBlock)) {
  throw new Error(
    "Expected validateCsv block not found - STOP"
  );
}

content = content.replace(
  oldBlock,
  newBlock,
);

fs.writeFileSync(path, content, "utf8");

console.log(
  "CSV DUPLICATE HEADER VALIDATOR PATCH = PASS"
);