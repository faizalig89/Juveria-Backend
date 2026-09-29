import fs from "node:fs";

const path =
  "./src/invoice-ingestion/csv-invoice-mapper.service.spec.ts";

let content = fs.readFileSync(path, "utf8");

const marker = "\n});";
const position = content.lastIndexOf(marker);

if (position < 0) {
  throw new Error("Final describe marker not found - STOP");
}

const test = `

  it('rejects duplicate CSV headers before mapping', () => {
    const csv = [
      'invoiceNumber,invoiceNumber,currency,totalAmount,lineDescription,lineQuantity,lineUnitPrice,lineTaxAmount,lineTotal',
      'INV-001,INV-999,AED,105,Service,1,100,5,105',
    ].join('\\n');

    expect(() =>
      mapper.map(csv),
    ).toThrow(
      'Duplicate CSV header: invoiceNumber',
    );
  });
`;

content =
  content.slice(0, position) +
  test +
  content.slice(position);

fs.writeFileSync(path, content, "utf8");

console.log("CSV MAPPER DUPLICATE TEST PATCH = PASS");