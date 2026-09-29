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

  it('rejects missing invoice number', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      ',2026-09-25,AED,105,Service,1,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('invoiceNumber is required');
  });

  it('rejects missing invoice date', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-002,,AED,105,Service,1,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('invoiceDate is required');
  });

  it('rejects missing currency', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-003,2026-09-25,,105,Service,1,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('currency is required');
  });

  it('rejects missing total amount', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-004,2026-09-25,AED,,Service,1,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('totalAmount is required');
  });

  it('rejects missing line description', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-005,2026-09-25,AED,105,,1,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('CSV row 2: lineDescription is required');
  });

  it('rejects missing line quantity', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-006,2026-09-25,AED,105,Service,,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('CSV row 2: lineQuantity is required');
  });

  it('rejects missing line unit price', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-007,2026-09-25,AED,105,Service,1,,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('CSV row 2: lineUnitPrice is required');
  });

  it('rejects missing line tax amount', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-008,2026-09-25,AED,105,Service,1,100,,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('CSV row 2: lineTaxAmount is required');
  });

  it('rejects missing line total', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-009,2026-09-25,AED,105,Service,1,100,5,',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('CSV row 2: lineTotal is required');
  });

  it('rejects malformed currency', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'CSV-REQ-010,2026-09-25,AED1,105,Service,1,100,5,105',
    ].join('\\n');

    expect(() => mapper.map(csv))
      .toThrow('currency must be a 3-letter currency code');
  });
`;

content =
  content.slice(0, position) +
  tests +
  content.slice(position);

fs.writeFileSync(path, content, "utf8");

console.log("CSV REQUIRED FIELD TEST PATCH = PASS");