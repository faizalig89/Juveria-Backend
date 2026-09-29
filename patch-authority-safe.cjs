const fs = require("fs");

const path = "./src/compliance/ubl/uae-pint-ae-ubl.service.ts";
let s = fs.readFileSync(path, "utf8");

const oldText = [
"    const legalId = party.legalRegistrationIdentifier",
"      ? `<cac:PartyLegalEntity>",
"          <cbc:RegistrationName>${this.esc(party.name ?? '')}</cbc:RegistrationName>",
"          <cbc:CompanyID${",
"            party.legalRegistrationIdentifierType",
"              ? ` schemeAgencyID=\"${this.esc(party.legalRegistrationIdentifierType)}\"`",
"              : ''",
"          }>${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>",
"        </cac:PartyLegalEntity>`",
"      : `<cac:PartyLegalEntity>",
"          <cbc:RegistrationName>${this.esc(party.name ?? '')}</cbc:RegistrationName>",
"        </cac:PartyLegalEntity>`;"
].join("\n");

const newText = [
"    const legalRegistrationAttributes = [",
"      party.legalRegistrationIdentifierType",
"        ? `schemeAgencyID=\"${this.esc(party.legalRegistrationIdentifierType)}\"`",
"        : '',",
"      party.legalRegistrationAuthorityName",
"        ? `schemeAgencyName=\"${this.esc(party.legalRegistrationAuthorityName)}\"`",
"        : '',",
"    ]",
"      .filter(Boolean)",
"      .join(' ');",
"",
"    const legalId = party.legalRegistrationIdentifier",
"      ? `<cac:PartyLegalEntity>",
"          <cbc:RegistrationName>${this.esc(party.name ?? '')}</cbc:RegistrationName>",
"          <cbc:CompanyID${",
"            legalRegistrationAttributes ? ` ${legalRegistrationAttributes}` : ''",
"          }>${this.esc(party.legalRegistrationIdentifier)}</cbc:CompanyID>",
"        </cac:PartyLegalEntity>`",
"      : `<cac:PartyLegalEntity>",
"          <cbc:RegistrationName>${this.esc(party.name ?? '')}</cbc:RegistrationName>",
"        </cac:PartyLegalEntity>`;"
].join("\n");

if (!s.includes(oldText)) {
  throw new Error("EXACT LEGAL-ID BLOCK NOT FOUND. FILE LEFT UNCHANGED.");
}

s = s.replace(oldText, newText);

fs.writeFileSync(path, s, "utf8");

console.log("Safe authority-name serializer patch applied.");
