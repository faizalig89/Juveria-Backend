import fs from "fs";

const file = "./src/asp/asp.module.ts";

let source = fs.readFileSync(file, "utf8");

const complianceImport =
  "import { ComplianceModule } from '../compliance/compliance.module.js';";

const authImport =
  "import { AuthModule } from '../auth/auth.module.js';";

if (!source.includes(complianceImport)) {
  throw new Error("ComplianceModule import not found");
}

if (!source.includes(authImport)) {
  source = source.replace(
    complianceImport,
    `${complianceImport}\n${authImport}`
  );
}

const oldImports =
  "imports: [ComplianceModule],";

const newImports =
  "imports: [AuthModule, ComplianceModule],";

if (source.includes(oldImports)) {
  source = source.replace(
    oldImports,
    newImports
  );
}

fs.writeFileSync(file, source, "utf8");

const verify =
  fs.readFileSync(file, "utf8");

if (!verify.includes(authImport)) {
  throw new Error("AuthModule import missing after write");
}

if (
  !verify.includes(
    "imports: [AuthModule, ComplianceModule],"
  )
) {
  throw new Error("AuthModule module registration missing");
}

console.log("\n===== ASP MODULE AFTER FIX =====");
console.log(verify);

console.log(
  "\nSTAGE_14_2_AUTH_WIRING_SOURCE_FIXED"
);
