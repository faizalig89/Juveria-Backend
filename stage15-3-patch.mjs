import fs from "fs";

const servicePath = "./src/asp/asp.service.ts";
const contractPath =
  "./src/asp/contracts/asp-adapter.interface.ts";

let service =
  fs.readFileSync(servicePath, "utf8");

let contract =
  fs.readFileSync(contractPath, "utf8");

fs.copyFileSync(
  servicePath,
  `${servicePath}.stage15-2a-backup`,
);

fs.copyFileSync(
  contractPath,
  `${contractPath}.stage15-2a-backup`,
);

/* ---------- CONTRACT ---------- */

if (
  !contract.includes(
    "  | 'PENDING'\n  | 'ERROR';"
  )
) {
  throw new Error(
    "Expected ASP status contract not found."
  );
}

contract = contract.replace(
  "  | 'PENDING'\n  | 'ERROR';",
  "  | 'PENDING'\n  | 'ERROR'\n  | 'UNKNOWN';",
);

/* ---------- SERVICE ---------- */

const oldCall = `    const result = await this.adapter.submit(request);

    const completedAt = new Date();

    await this.prisma.aspSubmissionAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        status: result.status,
        providerReference:
          result.providerReference ?? null,
        message: result.message ?? null,
        completedAt,
      },
    });

    const persistedResult =
      await this.prisma.aspSubmission.update({
        where: {
          id: persistentSubmission.id,
        },
        data: {
          status: result.status,
          providerReference:
            result.providerReference ?? null,
          completedAt,
          acceptedAt:
            result.status === 'ACCEPTED'
              ? completedAt
              : null,
          rejectedAt:
            result.status === 'REJECTED'
              ? completedAt
              : null,
        },
      });

    return {
      invoiceId,
      documentNumber: invoice.invoiceNumber,
      documentType,
      readinessStatus: readiness.readinessStatus,
      provider: result.provider,
      duplicate: false,
      submission: persistedResult,
      providerResult: result,
    };`;

if (!service.includes(oldCall)) {
  throw new Error(
    "Expected Stage 15.2A adapter block not found."
  );
}

const newCall = `    try {
      const result =
        await this.adapter.submit(request);

      const completedAt = new Date();

      await this.prisma.aspSubmissionAttempt.update({
        where: {
          id: attempt.id,
        },
        data: {
          status: result.status,
          providerReference:
            result.providerReference ?? null,
          message: result.message ?? null,
          completedAt,
        },
      });

      const persistedResult =
        await this.prisma.aspSubmission.update({
          where: {
            id: persistentSubmission.id,
          },
          data: {
            status: result.status,
            providerReference:
              result.providerReference ?? null,
            completedAt,
            acceptedAt:
              result.status === 'ACCEPTED'
                ? completedAt
                : null,
            rejectedAt:
              result.status === 'REJECTED'
                ? completedAt
                : null,
          },
        });

      return {
        invoiceId,
        documentNumber: invoice.invoiceNumber,
        documentType,
        readinessStatus:
          readiness.readinessStatus,
        provider: result.provider,
        duplicate: false,
        submission: persistedResult,
        providerResult: result,
      };
    } catch (error) {
      const completedAt = new Date();

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown ASP submission error';

      await this.prisma.$transaction([
        this.prisma.aspSubmissionAttempt.update({
          where: {
            id: attempt.id,
          },
          data: {
            status: 'UNKNOWN',
            errorCode:
              'ASP_RESPONSE_UNKNOWN',
            errorMessage,
            completedAt,
          },
        }),

        this.prisma.aspSubmission.update({
          where: {
            id: persistentSubmission.id,
          },
          data: {
            status: 'UNKNOWN',
            lastError: errorMessage,
            completedAt,
          },
        }),
      ]);

      throw new BadRequestException({
        message:
          'ASP submission outcome is unknown. Automatic retry is blocked pending reconciliation.',
        invoiceId,
        submissionId:
          persistentSubmission.id,
        status: 'UNKNOWN',
      });
    }`;

service = service.replace(
  oldCall,
  newCall,
);

fs.writeFileSync(
  contractPath,
  contract,
  "utf8",
);

fs.writeFileSync(
  servicePath,
  service,
  "utf8",
);

/* ---------- VERIFY ---------- */

const verifyContract =
  fs.readFileSync(contractPath, "utf8");

const verifyService =
  fs.readFileSync(servicePath, "utf8");

const checks = {
  unknownStatusAdded:
    verifyContract.includes("| 'UNKNOWN';"),

  adapterTryCatch:
    verifyService.includes(
      "await this.adapter.submit(request)",
    ) &&
    verifyService.includes(
      "} catch (error) {",
    ),

  unknownAttemptPersisted:
    verifyService.includes(
      "status: 'UNKNOWN'",
    ),

  reconciliationCode:
    verifyService.includes(
      "ASP_RESPONSE_UNKNOWN",
    ),

  transactionUsed:
    verifyService.includes(
      "this.prisma.$transaction",
    ),

  retryBlockedMessage:
    verifyService.includes(
      "Automatic retry is blocked pending reconciliation.",
    ),
};

console.log(
  "\n===== STAGE 15.3 SOURCE ASSERTIONS ====="
);

console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true
  )
) {
  throw new Error(
    "Stage 15.3 source verification failed."
  );
}

console.log(
  "\nSTAGE_15_3_UNKNOWN_OUTCOME_PATCHED"
);
