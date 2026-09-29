import fs from "fs";

const file = "./src/compliance/ubl/uae-pint-ae-ubl.service.ts";
const backup = file + ".before-final-cn-price-fix.bak";

const original = fs.readFileSync(file, "utf8");
fs.writeFileSync(backup, original, "utf8");

const methodStart = original.indexOf("private generateCreditNote");

if (methodStart === -1) {
  throw new Error("generateCreditNote not found");
}

const priceStart = original.indexOf("<cac:Price>", methodStart);

if (priceStart === -1) {
  throw new Error("CreditNote Price start not found");
}

const priceClose = original.indexOf("</cac:Price>", priceStart);

if (priceClose === -1) {
  throw new Error("CreditNote Price end not found");
}

const oldPrice = original.slice(
  priceStart,
  priceClose + "</cac:Price>".length
);

console.log("\n===== BEFORE =====");
console.log(oldPrice);

if (oldPrice.includes("<cac:AllowanceCharge>")) {
  console.log("\nCREDITNOTE_PRICE_ALREADY_PATCHED");
  process.exit(0);
}

const insertion = `      <cac:AllowanceCharge>
        <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
        <cbc:Amount currencyID="\${this.esc(currency)}">\${this.money(0)}</cbc:Amount>
        <cbc:BaseAmount currencyID="\${this.esc(currency)}">\${this.money(line.itemGrossPrice ?? line.itemNetPrice ?? line.unitPrice)}</cbc:BaseAmount>
      </cac:AllowanceCharge>

`;

const patched =
  original.slice(0, priceClose) +
  insertion +
  original.slice(priceClose);

fs.writeFileSync(file, patched, "utf8");

const disk = fs.readFileSync(file, "utf8");

const m = disk.indexOf("private generateCreditNote");
const p = disk.indexOf("<cac:Price>", m);
const e = disk.indexOf("</cac:Price>", p);

if (m === -1 || p === -1 || e === -1) {
  fs.writeFileSync(file, original, "utf8");
  throw new Error("Could not verify CreditNote Price after write");
}

const actual = disk.slice(
  p,
  e + "</cac:Price>".length
);

console.log("\n===== AFTER — ACTUAL FILE CONTENT =====");
console.log(actual);

const checks = {
  allowanceCharge: actual.includes("<cac:AllowanceCharge>"),
  chargeIndicator: actual.includes(
    "<cbc:ChargeIndicator>false</cbc:ChargeIndicator>"
  ),
  baseAmount: actual.includes("<cbc:BaseAmount"),
};

console.log("\n===== ASSERTIONS =====");
console.log(checks);

if (
  !checks.allowanceCharge ||
  !checks.chargeIndicator ||
  !checks.baseAmount
) {
  fs.writeFileSync(file, original, "utf8");
  throw new Error("SOURCE ASSERTION FAILED — original restored");
}

console.log("\nREAL_SOURCE_CREDITNOTE_PRICE_PASSED");
