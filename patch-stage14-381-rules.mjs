import fs from "fs";

const rulePack =
  "./src/compliance/rules/uae-pint-ae.rule-pack.ts";

const semantic =
  "./src/compliance/rules/uae-pint-ae-semantic.validator.ts";

const codeLists =
  "./src/compliance/rules/uae/pint-ae-code-lists.ts";

/* ============================================================
   BACKUPS
   ============================================================ */

for (const file of [rulePack, semantic, codeLists]) {
  fs.copyFileSync(
    file,
    `${file}.stage14-381-backup`
  );
}

/* ============================================================
   1. UAE-INV-006
   Payment due date:
   - 380 retains existing requirement
   - 381 becomes SKIPPED
   ============================================================ */

let rules = fs.readFileSync(rulePack, "utf8");

const old006 = `    // UAE mandatory field 6
    const validPaymentDueDate =
      invoice.paymentDueDate instanceof Date &&
      !Number.isNaN(invoice.paymentDueDate.getTime());

    results.push({
      ruleCode: 'UAE-INV-006',
      ruleName: 'Payment due date',
      status: validPaymentDueDate ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: validPaymentDueDate
        ? 'Payment due date is present and valid'
        : 'Payment due date is required',
      field: 'paymentDueDate',
      actualValue: validPaymentDueDate
        ? invoice.paymentDueDate!.toISOString()
        : '',
    });`;

const new006 = `    // UAE mandatory field 6
    // Payment due date is evaluated for Invoice (380).
    // Current verified Credit Note (381) scenario does not require it.
    const isCreditNote =
      invoice.invoiceTypeCode?.trim() === '381';

    const validPaymentDueDate =
      invoice.paymentDueDate instanceof Date &&
      !Number.isNaN(invoice.paymentDueDate.getTime());

    results.push({
      ruleCode: 'UAE-INV-006',
      ruleName: 'Payment due date',
      status: isCreditNote
        ? 'SKIPPED'
        : validPaymentDueDate
          ? 'PASS'
          : 'FAIL',
      severity: 'ERROR',
      message: isCreditNote
        ? 'Payment due date validation is not applicable to the current Credit Note scenario'
        : validPaymentDueDate
          ? 'Payment due date is present and valid'
          : 'Payment due date is required',
      field: 'paymentDueDate',
      actualValue: validPaymentDueDate
        ? invoice.paymentDueDate!.toISOString()
        : '',
    });`;

if (!rules.includes(old006)) {
  throw new Error(
    "UAE-INV-006 exact source block not found; no changes written"
  );
}

rules = rules.replace(old006, new006);

/* ============================================================
   2. UAE-INV-009
   ============================================================ */

const old009 = `    // UAE mandatory field 9
    results.push(
      this.requiredTextRule(
        'UAE-INV-009',
        'Payment means type code',
        'paymentMeansTypeCode',
        invoice.paymentMeansTypeCode,
      ),
    );`;

const new009 = `    // UAE mandatory field 9
    if (isCreditNote) {
      results.push({
        ruleCode: 'UAE-INV-009',
        ruleName: 'Payment means type code',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Payment means validation is not applicable to the current Credit Note scenario',
        field: 'paymentMeansTypeCode',
        actualValue: invoice.paymentMeansTypeCode ?? '',
      });
    } else {
      results.push(
        this.requiredTextRule(
          'UAE-INV-009',
          'Payment means type code',
          'paymentMeansTypeCode',
          invoice.paymentMeansTypeCode,
        ),
      );
    }`;

if (!rules.includes(old009)) {
  throw new Error(
    "UAE-INV-009 exact source block not found; no changes written"
  );
}

rules = rules.replace(old009, new009);

fs.writeFileSync(rulePack, rules, "utf8");

/* ============================================================
   3. UAE-SEM-003
   Missing value belongs to applicability/mandatory layer.
   Present value still receives semantic validation.
   ============================================================ */

let sem = fs.readFileSync(semantic, "utf8");

const oldSem = `    const paymentMeansFormatValid =
      /^\\d{1,3}$/.test(paymentMeans);

    results.push({
      ruleCode: 'UAE-SEM-003',
      ruleName: 'Payment means type code format',
      status: paymentMeansFormatValid ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: paymentMeansFormatValid
        ? 'Payment means uses numeric code format'
        : 'Payment means must use a numeric UNCL4461 code',
      field: 'paymentMeansTypeCode',
      actualValue: paymentMeans,
    });`;

const newSem = `    const paymentMeansFormatValid =
      /^\\d{1,3}$/.test(paymentMeans);

    const paymentMeansMissing =
      paymentMeans.length === 0;

    results.push({
      ruleCode: 'UAE-SEM-003',
      ruleName: 'Payment means type code format',
      status: paymentMeansMissing
        ? 'SKIPPED'
        : paymentMeansFormatValid
          ? 'PASS'
          : 'FAIL',
      severity: 'ERROR',
      message: paymentMeansMissing
        ? 'Payment means format validation skipped because the value is missing'
        : paymentMeansFormatValid
          ? 'Payment means uses numeric code format'
          : 'Payment means must use a numeric UNCL4461 code',
      field: 'paymentMeansTypeCode',
      actualValue: paymentMeans,
    });`;

if (!sem.includes(oldSem)) {
  throw new Error(
    "UAE-SEM-003 exact source block not found; no changes written"
  );
}

sem = sem.replace(oldSem, newSem);

fs.writeFileSync(semantic, sem, "utf8");

/* ============================================================
   4. CURRENT VERIFIED DOCUMENT TYPE SET
   ============================================================ */

let lists = fs.readFileSync(codeLists, "utf8");

const oldTypes = `export const PINT_AE_INVOICE_TYPE_CODES =
  new Set<string>([
    '380',
  ]);`;

const newTypes = `export const PINT_AE_INVOICE_TYPE_CODES =
  new Set<string>([
    '380',
    '381',
  ]);`;

if (!lists.includes(oldTypes)) {
  throw new Error(
    "Invoice type code-list block not found; no changes written"
  );
}

lists = lists.replace(oldTypes, newTypes);

fs.writeFileSync(codeLists, lists, "utf8");

/* ============================================================
   VERIFY FILES FROM DISK
   ============================================================ */

const verifyRules =
  fs.readFileSync(rulePack, "utf8");

const verifySem =
  fs.readFileSync(semantic, "utf8");

const verifyLists =
  fs.readFileSync(codeLists, "utf8");

const checks = {
  creditNoteDetection:
    verifyRules.includes(
      "invoice.invoiceTypeCode?.trim() === '381'"
    ),

  rule006Skip:
    verifyRules.includes(
      "ruleCode: 'UAE-INV-006'"
    ) &&
    verifyRules.includes(
      "status: isCreditNote"
    ),

  rule009Skip:
    verifyRules.includes(
      "ruleCode: 'UAE-INV-009'"
    ) &&
    verifyRules.includes(
      "if (isCreditNote)"
    ),

  semanticMissingSkip:
    verifySem.includes(
      "const paymentMeansMissing ="
    ) &&
    verifySem.includes(
      "? 'SKIPPED'"
    ),

  type380:
    verifyLists.includes("'380'"),

  type381:
    verifyLists.includes("'381'"),
};

console.log(
  "\n===== 381 INTERNAL RULE PATCH ASSERTIONS ====="
);

console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true
  )
) {
  throw new Error(
    "381 internal rule source verification failed"
  );
}

console.log(
  "\nSTAGE_14_381_INTERNAL_RULE_PATCH_VERIFIED"
);
