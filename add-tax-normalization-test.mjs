import fs from "node:fs";

const file =
  "./src/invoice-ingestion/csv-invoice-mapper.service.spec.ts";

let src = fs.readFileSync(file, "utf8");

const marker =
  "treats equivalent numeric tax representations as the same tax group";

if (src.includes(marker)) {
  console.log("TEST ALREADY EXISTS");
  process.exit(0);
}

const test = String.raw`

  it('treats equivalent numeric tax representations as the same tax group', () => {
    const csv = [
      'invoiceNumber,invoiceDate,currency,totalAmount,taxableAmount,taxBreakdownAmount,taxCategoryCode,taxRate,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal,lineNetAmount,lineTaxCategoryCode,lineTaxRate',
      'CSV-TAX-006,2026-09-25,AED,210,200,10,S,5,Service A,1,100,5,105,100,S,5',
      'CSV-TAX-006,2026-09-25,AED,210,200.00,10.00,S,5.0,Service B,1,100,5,105,100,S,5.0',
    ].join('\n');

    const result = mapper.map(csv);

    expect(result.invoice.taxBreakdowns).toHaveLength(1);

    expect(result.invoice.taxBreakdowns?.[0]).toEqual(
      expect.objectContaining({
        categoryCode: 'S',
        taxRate: 5,
        taxableAmount: 200,
        taxAmount: 10,
      }),
    );
  });
`;

const pos = src.lastIndexOf("});");

if (pos < 0) {
  throw new Error("Final test-suite closing brace not found");
}

src =
  src.slice(0, pos) +
  test +
  "\n" +
  src.slice(pos);

fs.writeFileSync(file, src, "utf8");

if (!fs.readFileSync(file, "utf8").includes(marker)) {
  throw new Error("Test insertion verification failed");
}

console.log("JUVERIA TAX NORMALIZATION REGRESSION TEST = ADDED");
