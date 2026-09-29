const fs = require("fs");

const path =
  "./src/compliance/ubl/uae-pint-ae-ubl.service.ts";

let s = fs.readFileSync(path, "utf8");

const oldBlock = `            party.legalRegistrationIdentifierType
              ? \` schemeAgencyID="\${this.esc(party.legalRegistrationIdentifierType)}"\`
              : ''
          }>\${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>`;

const newBlock = `            party.legalRegistrationIdentifierType
              ? \` schemeAgencyID="\${this.esc(party.legalRegistrationIdentifierType)}"\`
              : ''
          }\${
            party.legalRegistrationAuthorityName
              ? \` schemeAgencyName="\${this.esc(party.legalRegistrationAuthorityName)}"\`
              : ''
          }>\${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>`;

if (!s.includes(oldBlock)) {
  throw new Error(
    "Exact CompanyID serializer block not found. STOP."
  );
}

s = s.replace(oldBlock, newBlock);

fs.writeFileSync(path, s, "utf8");

const verify = fs.readFileSync(path, "utf8");

if (!verify.includes("legalRegistrationAuthorityName")) {
  throw new Error(
    "Authority-name serializer patch failed. STOP."
  );
}

if (!verify.includes("schemeAgencyName")) {
  throw new Error(
    "schemeAgencyName XML mapping missing. STOP."
  );
}

console.log("UBL authority-name mapping added.");
