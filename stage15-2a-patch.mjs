import fs from "fs";

const servicePath = "./src/asp/asp.service.ts";
const interfacePath = "./src/asp/contracts/asp-adapter.interface.ts";

const service = fs.readFileSync(servicePath, "utf8");
const contract = fs.readFileSync(interfacePath, "utf8");

fs.copyFileSync(
  servicePath,
  `${servicePath}.stage15-1-backup`,
);

fs.copyFileSync(
  interfacePath,
  `${interfacePath}.stage15-1-backup`,
);

if (!contract.includes("ublXml: string;")) {
  throw new Error("Expected ASP request contract was not found.");
}

if (contract.includes("idempotencyKey: string;")) {
  throw new Error("Contract already contains idempotencyKey.");
}

const newContract = contract.replace(
  "  ublXml: string;",
  `  ublXml: string;
  idempotencyKey: string;`,
);

const expectedServiceFragment = `import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';`;

if (!service.includes(expectedServiceFragment)) {
  throw new Error("Expected AspService import block was not found.");
}

let newService = service.replace(
  expectedServiceFragment,
  `import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';`,
);

const oldGeneration = `    const ublXml = await this.ublService.generate(
      invoiceId,
      tenantId,
    );

    const request: AspSubmissionRequest = {
      invoiceId,
      tenantId,
      documentType,
      documentNumber: invoice.invoiceNumber,
      ublXml,
    };

    const result = await this.adapter.submit(request);

    return {
      invoiceId,
      documentNumber: invoice.invoiceNumber,
      documentType,
      readinessStatus: readiness.readinessStatus,
      provider: result.provider,
      submission: result,
    };`;

if (!newService.includes(oldGeneration)) {
  throw new Error(
    "Expected current ASP submission block was not found.",
  );
}

const newGeneration = `    const ublXml = await this.ublService.generate(
      invoiceId,
      tenantId,
    );

    const documentFingerprint = createHash('sha256')
      .update(ublXml, 'utf8')
      .digest('hex');

    const idempotencyKey = createHash('sha256')
      .update(
        [
          tenantId,
          invoiceId,
          this.adapter.providerName,
          documentFingerprint,
        ].join(':'),
        'utf8',
      )
      .digest('hex');

    let persistentSubmission;
    let ownsSubmission = false;

    try {
      persistentSubmission =
        await this.prisma.aspSubmission.create({
          data: {
            invoiceId,
            tenantId,
            provider: this.adapter.providerName,
            documentType,
            documentNumber: invoice.invoiceNumber,
            status: 'CREATED',
            idempotencyKey,
          },
        });

      ownsSubmission = true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        persistentSubmission =
          await this.prisma.aspSubmission.findUnique({
            where: {
              idempotencyKey,
            },
          });

        if (!persistentSubmission) {
          throw error;
        }
      } else {
        throw error;
      }
    }

    if (!ownsSubmission) {
      return {
        invoiceId,
        documentNumber: invoice.invoiceNumber,
        documentType,
        readinessStatus: readiness.readinessStatus,
        provider: persistentSubmission.provider,
        duplicate: true,
        submission: persistentSubmission,
      };
    }

    const attempt =
      await this.prisma.aspSubmissionAttempt.create({
        data: {
          submissionId: persistentSubmission.id,
          attemptNumber: 1,
          status: 'SUBMITTING',
        },
      });

    await this.prisma.aspSubmission.update({
      where: {
        id: persistentSubmission.id,
      },
      data: {
        status: 'SUBMITTING',
        attemptCount: 1,
        submittedAt: new Date(),
      },
    });

    const request: AspSubmissionRequest = {
      invoiceId,
      tenantId,
      documentType,
      documentNumber: invoice.invoiceNumber,
      ublXml,
      idempotencyKey,
    };

    const result = await this.adapter.submit(request);

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

newService = newService.replace(
  oldGeneration,
  newGeneration,
);

fs.writeFileSync(
  interfacePath,
  newContract,
  "utf8",
);

fs.writeFileSync(
  servicePath,
  newService,
  "utf8",
);

const verifyService =
  fs.readFileSync(servicePath, "utf8");

const verifyContract =
  fs.readFileSync(interfacePath, "utf8");

const checks = {
  contractHasIdempotencyKey:
    verifyContract.includes("idempotencyKey: string;"),

  cryptoImported:
    verifyService.includes(
      "createHash } from 'node:crypto'",
    ),

  prismaErrorImported:
    verifyService.includes(
      "Prisma } from '@prisma/client'",
    ),

  sha256Used:
    verifyService.includes("createHash('sha256')"),

  durableClaim:
    verifyService.includes(
      "this.prisma.aspSubmission.create",
    ),

  duplicateLookup:
    verifyService.includes(
      "this.prisma.aspSubmission.findUnique",
    ),

  uniqueRaceHandled:
    verifyService.includes("error.code === 'P2002'"),

  attemptPersisted:
    verifyService.includes(
      "this.prisma.aspSubmissionAttempt.create",
    ),

  adapterReceivesIdempotency:
    verifyService.includes(
      "idempotencyKey,",
    ),
};

console.log("\n===== STAGE 15.2A SOURCE ASSERTIONS =====");
console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true
  )
) {
  throw new Error(
    "Stage 15.2A source verification failed.",
  );
}

console.log(
  "\nSTAGE_15_2A_SOURCE_PATCHED",
);
