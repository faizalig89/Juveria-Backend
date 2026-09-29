import fs from "node:fs";

const path =
  "./src/invoice-document/invoice-file-validator.service.spec.ts";

let content = fs.readFileSync(path, "utf8");

const marker = "\n});";
const position = content.lastIndexOf(marker);

if (position < 0) {
  throw new Error("Final describe marker not found - STOP");
}

const test = `

  it('rejects duplicate CSV headers', async () => {
    const file = join(directory, 'duplicate-headers.csv');

    await writeFile(
      file,
      [
        'invoiceNumber,invoiceNumber,currency,totalAmount',
        'INV-001,INV-999,AED,105',
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
  test +
  content.slice(position);

fs.writeFileSync(path, content, "utf8");

console.log("DUPLICATE HEADER TEST PATCH = PASS");