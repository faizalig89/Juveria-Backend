import { HealthService } from './dist/health/health.service.js';

const fakePrisma = {
  $queryRaw: async () => {
    throw new Error('SIMULATED_DATABASE_UNAVAILABLE');
  },
};

const service = new HealthService(fakePrisma);

let blocked = false;
let status = null;
let response = null;

try {
  await service.readiness();
} catch (error) {
  blocked = true;
  status =
    typeof error.getStatus === 'function'
      ? error.getStatus()
      : null;

  response =
    typeof error.getResponse === 'function'
      ? error.getResponse()
      : null;
}

console.log({
  blocked,
  status,
  response,
});

if (!blocked)
  throw new Error('READINESS DID NOT FAIL CLOSED');

if (status !== 503)
  throw new Error(`EXPECTED 503, RECEIVED ${status}`);

if (response?.status !== 'not_ready')
  throw new Error('EXPECTED not_ready STATUS');

if (response?.database !== 'unreachable')
  throw new Error('EXPECTED DATABASE unreachable');

console.log('STAGE_16_4_FAILURE_PATH_PASSED');
console.log('DATABASE_FAILURE -> HTTP_503 = PASS');
console.log('READINESS_FAIL_CLOSED = PASS');
