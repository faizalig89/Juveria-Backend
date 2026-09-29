const fs = require("fs");

const path = "./src/compliance/compliance.module.ts";
let s = fs.readFileSync(path, "utf8");

const importLine =
  "import { UaePintAeSchematronService } from './schematron/uae-pint-ae-schematron.service.js';";

if (!s.includes(importLine)) {
  const lines = s.split(/\r?\n/);

  const moduleIndex = lines.findIndex(line =>
    line.includes("from '@nestjs/common'")
  );

  if (moduleIndex < 0) {
    throw new Error("Cannot locate module imports");
  }

  lines.splice(moduleIndex + 1, 0, importLine);
  s = lines.join("\n");
}

if (!s.includes("    UaePintAeSchematronService,")) {
  const providerAnchor = "    UaePintAeUblService,";

  if (!s.includes(providerAnchor)) {
    throw new Error("UaePintAeUblService provider anchor not found");
  }

  s = s.replace(
    providerAnchor,
    providerAnchor + "\n    UaePintAeSchematronService,"
  );
}

fs.writeFileSync(path, s, "utf8");

const check = fs.readFileSync(path, "utf8");

if (!check.includes(
  "import { UaePintAeSchematronService }"
)) {
  throw new Error("Schematron import missing");
}

if (!check.includes(
  "    UaePintAeSchematronService,"
)) {
  throw new Error("Schematron provider missing");
}

console.log("Schematron provider registered.");
