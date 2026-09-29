import fs from "node:fs";

const path =
  "./src/invoice-ingestion/csv-invoice-mapper.service.spec.ts";

let text = fs.readFileSync(path, "utf8");

if (text.includes(
  "maps different VAT category/rate groups as separate tax breakdowns"
)) {
  throw new Error("MULTI-TAX TESTS ALREADY EXIST - STOP");
}

const tests = String.raw`

  it('maps different VAT category/rate groups as separate tax breakdowns', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,taxableAmount,taxBreakdownAmount,taxCategoryCode,taxRate,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal,lineNetAmount,lineTaxCategoryCode,lineTaxRate',
      'CSV-TAX-001,2026-09-25,AED,105,100,5,S,5,Standard Service,1,100,5,105,100,S,5',
      'CSV-TAX-001,2026-09-25,AED,105,50,0,Z,0,Zero Rated Service,1,50,0,50,50,Z,0',
    ].join('\n');

    const result = mapper.map(csv);

    expect(result.invoice.taxBreakdowns)
      .toHaveLength(2);

    expect(result.invoice.taxBreakdowns)
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryCode: 'S',
            taxRate: 5,
            taxableAmount: 100,
            taxAmount: 5,
          }),
          expect.objectContaining({
            categoryCode: 'Z',
            taxRate: 0,
            taxableAmount: 50,
            taxAmount: 0,
          }),
        ]),
      );
  });

  it('deduplicates identical repeated tax breakdowns', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,taxableAmount,taxBreakdownAmount,taxCategoryCode,taxRate,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal,lineNetAmount,lineTaxCategoryCode,lineTaxRate',
      'CSV-TAX-002,2026-09-25,AED,210,200,10,S,5,Service A,1,100,5,105,100,S,5',
      'CSV-TAX-002,2026-09-25,AED,210,200,10,S,5,Service B,1,100,5,105,100,S,5',
    ].join('\n');

    const result = mapper.map(csv);

    expect(result.invoice.taxBreakdowns)
      .toHaveLength(1);

    expect(result.invoice.taxBreakdowns?.[0])
      .toEqual(
        expect.objectContaining({
          categoryCode: 'S',
          taxRate: 5,
          taxableAmount: 200,
          taxAmount: 10,
        }),
      );
  });

  it('rejects conflicting taxable amount for the same tax group', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,taxableAmount,taxBreakdownAmount,taxCategoryCode,taxRate,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal,lineNetAmount,lineTaxCategoryCode,lineTaxRate',
      'CSV-TAX-003,2026-09-25,AED,210,200,10,S,5,Service A,1,100,5,105,100,S,5',
      'CSV-TAX-003,2026-09-25,AED,210,100,10,S,5,Service B,1,100,5,105,100,S,5',
    ].join('\n');

    expect(() =>
      mapper.map(csv),
    ).toThrow(
      'CSV row 3 has conflicting tax breakdown for category S rate 5',
    );
  });

  it('rejects conflicting tax amount for the same tax group', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,taxableAmount,taxBreakdownAmount,taxCategoryCode,taxRate,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal,lineNetAmount,lineTaxCategoryCode,lineTaxRate',
      'CSV-TAX-004,2026-09-25,AED,210,200,10,S,5,Service A,1,100,5,105,100,S,5',
      'CSV-TAX-004,2026-09-25,AED,210,200,11,S,5,Service B,1,100,5,105,100,S,5',
    ].join('\n');

    expect(() =>
      mapper.map(csv),
    ).toThrow(
      'CSV row 3 has conflicting tax breakdown for category S rate 5',
    );
  });

  it('preserves one tax breakdown for a single tax group', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,taxableAmount,taxBreakdownAmount,taxCategoryCode,taxRate,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal,lineNetAmount,lineTaxCategoryCode,lineTaxRate',
      'CSV-TAX-005,2026-09-25,AED,105,100,5,S,5,Service,1,100,5,105,100,S,5',
    ].join('\n');

    const result = mapper.map(csv);

    expect(result.invoice.taxBreakdowns)
      .toHaveLength(1);

    expect(result.invoice.taxBreakdowns?.[0])
      .toEqual(
        expect.objectContaining({
          categoryCode: 'S',
          taxRate: 5,
          taxableAmount: 100,
          taxAmount: 5,
        }),
      );
  });
`;

const closingIndex = text.lastIndexOf("\n});");

if (closingIndex === -1) {
  throw new Error("FINAL DESCRIBE CLOSING NOT FOUND - STOP");
}

text =
  text.slice(0, closingIndex) +
  tests +
  text.slice(closingIndex);

fs.writeFileSync(path, text, "utf8");

console.log("MULTI-TAX TESTS = ADDED");