const fs = require("fs");

const path = "./src/compliance/compliance.controller.ts";
const backup = path + ".bak-before-safe-pint-endpoint";

let s = fs.readFileSync(path, "utf8");

fs.copyFileSync(path, backup);

/* 1. Import */
const ublImport =
  "import { UaePintAeUblService } from './ubl/uae-pint-ae-ubl.service.js';";

const schematronImport =
  "import { UaePintAeSchematronService } from './schematron/uae-pint-ae-schematron.service.js';";

if (!s.includes(schematronImport)) {
  if (!s.includes(ublImport)) {
    throw new Error("UBL import not found");
  }

  s = s.replace(
    ublImport,
    ublImport + "\n" + schematronImport
  );
}

/* 2. Constructor dependency */
const ublDependency =
  "    private readonly ublService: UaePintAeUblService,";

const schematronDependency =
  "    private readonly schematronService: UaePintAeSchematronService,";

if (!s.includes(schematronDependency)) {
  if (!s.includes(ublDependency)) {
    throw new Error("UBL constructor dependency not found");
  }

  s = s.replace(
    ublDependency,
    ublDependency + "\n" + schematronDependency
  );
}

/* 3. Add method immediately before final class brace */
const marker =
  "@Get('invoice/:id/pint-ae-validation')";

if (!s.includes(marker)) {

  const lastBrace = s.lastIndexOf("}");

  if (lastBrace < 0) {
    throw new Error("Final class brace not found");
  }

  const method = `

  @Get('invoice/:id/pint-ae-validation')
  async validatePintAe(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const xml = await this.ublService.generate(
      id,
      req.user.tenantId,
    );

    const validation =
      await this.schematronService.validate(xml);

    return {
      invoiceId: id,
      standard: 'PINT-AE',
      version: '1.4.4',
      ublGenerated: true,
      ...validation,
    };
  }
`;

  s =
    s.slice(0, lastBrace) +
    method +
    s.slice(lastBrace);
}

fs.writeFileSync(path, s, "utf8");

/* Verification */

const result = fs.readFileSync(path, "utf8");

if (!result.includes(
  "export class ComplianceController"
)) {
  throw new Error(
    "ComplianceController export missing after patch"
  );
}

if (!result.includes(
  "private readonly schematronService"
)) {
  throw new Error(
    "Schematron dependency missing after patch"
  );
}

if (!result.includes(
  "@Get('invoice/:id/pint-ae-validation')"
)) {
  throw new Error(
    "PINT-AE endpoint missing after patch"
  );
}

console.log("Controller safe patch completed.");
