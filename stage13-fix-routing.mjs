import fs from 'node:fs';

const path = './src/compliance/ubl/uae-pint-ae-ubl.service.ts';
const backup = './src/compliance/ubl/uae-pint-ae-ubl.service.ts.stage13-routing-backup';

const original = fs.readFileSync(path, 'utf8');

fs.writeFileSync(backup, original, 'utf8');

if (original.includes("String(invoice.invoiceTypeCode) === '381'")) {
  console.log('ROUTE_ALREADY_PRESENT');
  process.exit(0);
}

const marker =
`    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const seller =`;

const replacement =
`    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (String(invoice.invoiceTypeCode) === '381') {
      return this.generateCreditNote(invoice);
    }

    const seller =`;

if (!original.includes(marker)) {
  throw new Error('INSERTION_MARKER_NOT_FOUND');
}

const updated = original.replace(marker, replacement);

fs.writeFileSync(path, updated, 'utf8');

const verify = fs.readFileSync(path, 'utf8');

if (!verify.includes("String(invoice.invoiceTypeCode) === '381'")) {
  throw new Error('ROUTE_NOT_PERSISTED');
}

if (!verify.includes('return this.generateCreditNote(invoice);')) {
  throw new Error('DISPATCH_NOT_PERSISTED');
}

console.log('ROUTE_WRITTEN_TO_SOURCE');