const fs = require("fs");

const path = "src/compliance/ubl/uae-pint-ae-ubl.service.ts";
const backup = path + ".bak-node-final-fix";

let s = fs.readFileSync(path, "utf8");
fs.copyFileSync(path, backup);

function replaceRequired(name, oldText, newText) {
  if (!s.includes(oldText)) {
    console.error("\nNOT FOUND:", name);
    process.exit(1);
  }

  s = s.replace(oldText, newText);
  console.log("PATCHED:", name);
}

/* 1. Endpoint scheme */
replaceRequired(
  "Endpoint scheme",
  `<cbc:EndpointID>\${this.esc(party.electronicAddress)}</cbc:EndpointID>`,
  `<cbc:EndpointID schemeID="0235">\${this.esc(party.electronicAddress)}</cbc:EndpointID>`
);

/* 2. Tax currency */
replaceRequired(
  "Conditional TaxCurrencyCode",
  `<cbc:TaxCurrencyCode>AED</cbc:TaxCurrencyCode>`,
  `\${String(currency).toUpperCase() !== 'AED'
    ? \`<cbc:TaxCurrencyCode>AED</cbc:TaxCurrencyCode>\`
    : ''}`
);

/* 3. Payment account */
replaceRequired(
  "Payment account",
  `<cbc:PaymentMeansCode>\${this.esc(invoice.paymentMeansTypeCode)}</cbc:PaymentMeansCode>`,
  `<cbc:PaymentMeansCode>\${this.esc(invoice.paymentMeansTypeCode)}</cbc:PaymentMeansCode>
          \${invoice.paymentAccountIdentifier
            ? \`<cac:PayeeFinancialAccount>
                 <cbc:ID>\${this.esc(invoice.paymentAccountIdentifier)}</cbc:ID>
               </cac:PayeeFinancialAccount>\`
            : ''}`
);

/* 4. Item description */
replaceRequired(
  "Item description",
  `<cac:Item>
          <cbc:Name>`,
  `<cac:Item>
          <cbc:Description>\${this.esc(line.description)}</cbc:Description>
          <cbc:Name>`
);

/* 5. Gross price */
replaceRequired(
  "Gross price",
  `<cbc:BaseQuantity unitCode="\${this.esc(line.unitOfMeasureCode ?? 'C62')}">\${this.num(line.priceBaseQuantity, '1')}</cbc:BaseQuantity>
        </cac:Price>`,
  `<cbc:BaseQuantity unitCode="\${this.esc(line.unitOfMeasureCode ?? 'C62')}">\${this.num(line.priceBaseQuantity, '1')}</cbc:BaseQuantity>
          <cac:AllowanceCharge>
            <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
            <cbc:Amount currencyID="\${this.esc(currency)}">0.00</cbc:Amount>
            <cbc:BaseAmount currencyID="\${this.esc(currency)}">\${this.money(line.itemGrossPrice ?? line.itemNetPrice ?? line.unitPrice)}</cbc:BaseAmount>
          </cac:AllowanceCharge>
        </cac:Price>`
);

fs.writeFileSync(path, s, "utf8");

console.log("\n===== SOURCE VERIFICATION =====");

const checks = [
  'schemeID="0235"',
  "paymentAccountIdentifier",
  "PayeeFinancialAccount",
  "cbc:Description",
  "itemGrossPrice",
  "TaxCurrencyCode"
];

for (const check of checks) {
  if (!s.includes(check)) {
    console.error("MISSING:", check);
    process.exit(1);
  }

  console.log("FOUND:", check);
}

console.log("\nSOURCE PATCH VERIFIED");
