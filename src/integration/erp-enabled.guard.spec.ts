import {
  ForbiddenException,
} from '@nestjs/common';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  ErpEnabledGuard,
} from './erp-enabled.guard.js';

function context(
  tenantId = 'tenant-1',
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          tenantId,
        },
      }),
    }),
  } as any;
}

describe('ErpEnabledGuard', () => {
  it('denies a manual-upload tenant', async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn()
          .mockResolvedValue({
            erpEnabled: false,
            accessStatus:
              'PAID_ACTIVE',
            trialExpiresAt: null,
          }),
      },
    };

    const guard =
      new ErpEnabledGuard(
        prisma as any,
      );

    await expect(
      guard.canActivate(
        context(),
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows an ERP-enabled active tenant', async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn()
          .mockResolvedValue({
            erpEnabled: true,
            accessStatus:
              'PAID_ACTIVE',
            trialExpiresAt: null,
          }),
      },
    };

    const guard =
      new ErpEnabledGuard(
        prisma as any,
      );

    await expect(
      guard.canActivate(
        context(),
      ),
    ).resolves.toBe(true);
  });

  it('denies an expired one-month trial', async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn()
          .mockResolvedValue({
            erpEnabled: true,
            accessStatus:
              'TRIAL_ACTIVE',
            trialExpiresAt:
              new Date(
                Date.now() - 60_000,
              ),
          }),
      },
    };

    const guard =
      new ErpEnabledGuard(
        prisma as any,
      );

    await expect(
      guard.canActivate(
        context(),
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
