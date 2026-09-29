import 'dotenv/config';
import { HealthService } from './dist/health/health.service.js';

const fakePrisma = {
  $queryRawUnsafe: async () => [{ value: 1 }],
};

const brokenComplianceRuntime = {
  checkRuntimeDependencies: async () => {
    throw new Error('SIMULATED_COMPLIANCE_RUNTIME_FAILURE');
  },
};

const health = new HealthService(
  fakePrisma,
  brokenComplianceRuntime,
);

try {
  await health.readiness();

  throw new Error(
    'FAIL: readiness incorrectly succeeded.',
  );
} catch (error) {
  if (
    typeof error?.getStatus !== 'function' ||
    error.getStatus() !== 503
  ) {
    throw error;
  }

  const response = error.getResponse();

  console.log('HTTP_STATUS=' + error.getStatus());
  console.log(response);

  if (response.database !== 'reachable') {
    throw new Error(
      'Database state was not preserved as reachable.',
    );
  }

  if (
    response.complianceRuntime !== 'unavailable'
  ) {
    throw new Error(
      'Compliance runtime did not fail closed.',
    );
  }

  console.log(
    'STAGE_16_6B_COMPLIANCE_FAILURE_PATH = PASS',
  );
  console.log('DATABASE_REACHABLE = PASS');
  console.log('COMPLIANCE_RUNTIME_UNAVAILABLE = PASS');
  console.log('READINESS_HTTP_503 = PASS');
}
