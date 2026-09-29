import fs from "node:fs";

const path =
  "./src/invoice-ingestion/csv-invoice-mapper.service.spec.ts";

let content = fs.readFileSync(path, "utf8");

const marker = "\n});";

const position = content.lastIndexOf(marker);

if (position < 0) {
  throw new Error("Final describe marker not found - STOP");
}

const tests = `

  it('keeps consistent repeated data across multiple lines', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,totalTaxAmount,sellerTaxIdentifier,buyerTaxIdentifier,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-MULTI-001,2026-09-25,AED,210,10,100000000000003,100000000000003,Service A,1,100,5,105',
      'CSV-MULTI-001,2026-09-25,AED,210,10,100000000000003,100000000000003,Service B,1,100,5,105',
    ].join('\\n');

    const result = mapper.map(csv);

    expect(result.invoice.invoiceNumber)
      .toBe('CSV-MULTI-001');

    expect(result.invoice.lines)
      .toHaveLength(2);

    expect(result.invoice.totalTaxAmount)
      .toBe(10);
  });

  it('rejects inconsistent seller data across invoice lines', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,sellerTaxIdentifier,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-MULTI-002,2026-09-25,AED,210,100000000000003,Service A,1,100,5,105',
      'CSV-MULTI-002,2026-09-25,AED,210,100000000000004,Service B,1,100,5,105',
    ].join('\\n');

    expect(() =>
      mapper.map(csv),
    ).toThrow(
      'CSV row 3 has inconsistent sellerTaxIdentifier',
    );
  });

  it('rejects inconsistent monetary totals across invoice lines', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,totalTaxAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-MULTI-003,2026-09-25,AED,210,10,Service A,1,100,5,105',
      'CSV-MULTI-003,2026-09-25,AED,210,11,Service B,1,100,5,105',
    ].join('\\n');

    expect(() =>
      mapper.map(csv),
    ).toThrow(
      'CSV row 3 has inconsistent totalTaxAmount',
    );
  });

  it('rejects inconsistent buyer data across invoice lines', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,buyerLegalRegistrationIdentifier,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-MULTI-004,2026-09-25,AED,210,BUYER-001,Service A,1,100,5,105',
      'CSV-MULTI-004,2026-09-25,AED,210,BUYER-002,Service B,1,100,5,105',
    ].join('\\n');

    expect(() =>
      mapper.map(csv),
    ).toThrow(
      'CSV row 3 has inconsistent buyerLegalRegistrationIdentifier',
    );
  });
`;

content =
  content.slice(0, position) +
  tests +
  content.slice(position);

fs.writeFileSync(path, content, "utf8");

console.log("CSV MULTI-LINE TEST PATCH = PASS");