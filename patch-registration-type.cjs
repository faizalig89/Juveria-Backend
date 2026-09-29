const fs = require("fs");

const path = "src/compliance/ubl/uae-pint-ae-ubl.service.ts";
const backup = path + ".bak-before-registration-type-fix";

let s = fs.readFileSync(path, "utf8");

fs.copyFileSync(path, backup);

const oldBlock = `          <cbc:CompanyID\${ 
            party.legalRegistrationIdentifierType
              ? \` schemeID="\${this.esc(party.legalRegistrationIdentifierType)}"\`
              : ''
          }>\${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>`;

const simpleOld =
`          <cbc:CompanyID>\${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>`;

const replacement =
`          <cbc:CompanyID\${party.legalRegistrationIdentifierType
            ? \` schemeAgencyID="\${this.esc(party.legalRegistrationIdentifierType)}"\`
            : ''}>\${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>`;

if (s.includes(simpleOld)) {
  s = s.replace(simpleOld, replacement);
}
else if (s.includes(oldBlock)) {
  s = s.replace(oldBlock, replacement);
}
else {
  console.error("CompanyID serializer block not found.");
  process.exit(1);
}

fs.writeFileSync(path, s, "utf8");

const result = fs.readFileSync(path, "utf8");

if (!result.includes("schemeAgencyID")) {
  console.error("schemeAgencyID was not written.");
  process.exit(1);
}

console.log("LEGAL REGISTRATION SERIALIZER PATCHED");
console.log("schemeAgencyID mapping verified");
