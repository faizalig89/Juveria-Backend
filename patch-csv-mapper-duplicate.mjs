import fs from "node:fs";

const path =
  "./src/invoice-ingestion/csv-invoice-mapper.service.ts";

let content = fs.readFileSync(path, "utf8");

const marker = `  map(content: string): InvoiceIngestionResult {
    let rows: CsvRow[];
`;

if (!content.includes(marker)) {
  throw new Error("Mapper map() marker not found - STOP");
}

const replacement = `  map(content: string): InvoiceIngestionResult {
    this.assertUniqueHeaders(content);

    let rows: CsvRow[];
`;

content = content.replace(marker, replacement);

const methodMarker = `  private assertSingleInvoice(
`;

if (!content.includes(methodMarker)) {
  throw new Error(
    "assertSingleInvoice marker not found - STOP"
  );
}

const method = `  private assertUniqueHeaders(
    content: string,
  ): void {
    let rawRows: string[][];

    try {
      rawRows = parse(content, {
        bom: true,
        skip_empty_lines: true,
        trim: true,
      }) as string[][];
    } catch {
      throw new BadRequestException(
        'Uploaded file contains invalid CSV',
      );
    }

    if (!rawRows.length) {
      throw new BadRequestException(
        'CSV invoice contains no records',
      );
    }

    const headers = rawRows[0].map(
      (header) => header.trim(),
    );

    const seenHeaders = new Set<string>();

    for (const header of headers) {
      if (seenHeaders.has(header)) {
        throw new BadRequestException(
          \`Duplicate CSV header: \${header}\`,
        );
      }

      seenHeaders.add(header);
    }
  }

`;

content = content.replace(
  methodMarker,
  method + methodMarker,
);

fs.writeFileSync(path, content, "utf8");

console.log(
  "CSV MAPPER DUPLICATE HEADER PATCH = PASS"
);