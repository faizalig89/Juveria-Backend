import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserAccessDto } from './dto/update-user-access.dto.js';

type ClientRole =
  | 'CLIENT_ADMIN'
  | 'CLIENT_USER';

type AuditActor = {
  userId: string;
  email: string;
  role: string;
};

const CLIENT_ROLES: ClientRole[] = [
  'CLIENT_ADMIN',
  'CLIENT_USER',
];

const publicUserSelect = {
  id: true,
  tenantId: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private assertClientRole(
    role: string,
  ): asserts role is ClientRole {
    if (
      !CLIENT_ROLES.includes(
        role as ClientRole,
      )
    ) {
      throw new BadRequestException(
        'Unsupported client role',
      );
    }
  }

  private assertPassword(
    password: string,
  ) {
    if (
      password.length < 12 ||
      !password.trim()
    ) {
      throw new BadRequestException(
        'Password must contain at least 12 characters',
      );
    }

    /*
     * bcrypt processes at most 72 bytes.
     * Reject longer inputs rather than silently truncating them.
     */
    if (
      Buffer.byteLength(
        password,
        'utf8',
      ) > 72
    ) {
      throw new BadRequestException(
        'Password must not exceed 72 UTF-8 bytes',
      );
    }
  }

  async create(
    actor: AuditActor,
    tenantId: string,
    email: string,
    firstName: string,
    lastName: string | undefined,
    password: string,
    role: string,
  ) {
    this.assertClientRole(role);
    this.assertPassword(password);

    const normalizedFirstName =
      firstName.trim();

    if (!normalizedFirstName) {
      throw new BadRequestException(
        'First name is required',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const created =
            await tx.user.create({
              data: {
                tenantId,
                email:
                  email
                    .trim()
                    .toLowerCase(),
                firstName:
                  normalizedFirstName,
                lastName:
                  lastName?.trim() ||
                  null,
                passwordHash,
                role,
              },
              select:
                publicUserSelect,
            });

          await tx.auditEvent.create({
            data: {
              tenantId,
              actorUserId:
                actor.userId,
              actorEmail:
                actor.email,
              actorRole:
                actor.role,
              category:
                'ACCESS',
              action:
                'USER_CREATED',
              entityType:
                'USER',
              entityId:
                created.id,
              entityLabel:
                created.email,
              outcome:
                'SUCCESS',
              after: {
                role:
                  created.role,
                isActive:
                  created.isActive,
              },
              metadata: {
                targetUserId:
                  created.id,
                targetEmail:
                  created.email,
              },
            },
          });

          return created;
        },
      );
    }
    catch (cause: unknown) {
      if (
        typeof cause === 'object' &&
        cause !== null &&
        'code' in cause &&
        cause.code === 'P2002'
      ) {
        throw new ConflictException(
          'A user with this email already exists',
        );
      }

      throw cause;
    }
  }

  async findWorkspaceIdentity(
    userId: string,
    tenantId: string,
  ) {
    const user =
      await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenantId,
        },
        select: {
          ...publicUserSelect,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              accessStatus: true,
              trialStartedAt: true,
              trialExpiresAt: true,
              erpEnabled: true,
              productionEnabled:
                true,
            },
          },
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    const trialExpired =
      user.tenant.accessStatus ===
        'TRIAL_ACTIVE' &&
      user.tenant.trialExpiresAt !==
        null &&
      user.tenant.trialExpiresAt
        .getTime() <= Date.now();

    return {
      ...user,
      tenant: {
        ...user.tenant,
        effectiveAccessStatus:
          trialExpired
            ? 'TRIAL_EXPIRED'
            : user.tenant
                .accessStatus,
      },
    };
  }

  async findAllByTenant(
    tenantId: string,
  ) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: {
          in:
            CLIENT_ROLES,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select:
        publicUserSelect,
    });
  }

  async updateAccess(
    actor: AuditActor,
    tenantId: string,
    id: string,
    changes: UpdateUserAccessDto,
  ) {
    if (
      changes.role === undefined &&
      changes.isActive === undefined
    ) {
      throw new BadRequestException(
        'Provide a role or active status',
      );
    }

    if (
      changes.role !== undefined
    ) {
      this.assertClientRole(
        changes.role,
      );
    }

    /*
     * Prevent administrators from accidentally revoking,
     * demoting, or otherwise mutating their own access.
     */
    if (
      id === actor.userId
    ) {
      throw new ConflictException(
        'You cannot change your own access',
      );
    }

    /*
     * Serializable transaction protects the last-active-admin
     * invariant from concurrent access changes.
     */
    for (
      let attempt = 0;
      attempt < 3;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const target =
              await tx.user.findFirst({
                where: {
                  id,
                  tenantId,
                  role: {
                    in:
                      CLIENT_ROLES,
                  },
                },
                select: {
                  ...publicUserSelect,
                  authVersion:
                    true,
                },
              });

            if (!target) {
              throw new NotFoundException(
                'User not found',
              );
            }

            const nextRole =
              changes.role ??
              target.role;

            const nextIsActive =
              changes.isActive ??
              target.isActive;

            this.assertClientRole(
              nextRole,
            );

            if (
              nextRole ===
                target.role &&
              nextIsActive ===
                target.isActive
            ) {
              const {
                authVersion:
                  _authVersion,
                ...publicTarget
              } = target;

              return publicTarget;
            }

            const removesActiveAdmin =
              target.role ===
                'CLIENT_ADMIN' &&
              target.isActive &&
              (
                nextRole !==
                  'CLIENT_ADMIN' ||
                nextIsActive ===
                  false
              );

            if (removesActiveAdmin) {
              const activeAdmins =
                await tx.user.count({
                  where: {
                    tenantId,
                    role:
                      'CLIENT_ADMIN',
                    isActive:
                      true,
                  },
                });

              if (
                activeAdmins <= 1
              ) {
                throw new ConflictException(
                  'At least one active client administrator is required',
                );
              }
            }

            const updated =
              await tx.user.update({
                where: {
                  id:
                    target.id,
                },
                data: {
                  role:
                    nextRole,
                  isActive:
                    nextIsActive,

                  /*
                   * Existing JWTs become invalid immediately because
                   * JwtStrategy compares token authVersion to DB state.
                   */
                  authVersion: {
                    increment: 1,
                  },
                },
                select:
                  publicUserSelect,
              });

            const roleChanged =
              target.role !==
              updated.role;

            const activeChanged =
              target.isActive !==
              updated.isActive;

            const action =
              roleChanged &&
              activeChanged
                ? 'USER_ACCESS_UPDATED'
                : roleChanged
                  ? 'USER_ROLE_CHANGED'
                  : updated.isActive
                    ? 'USER_REACTIVATED'
                    : 'USER_DISABLED';

            await tx.auditEvent.create({
              data: {
                tenantId,
                actorUserId:
                  actor.userId,
                actorEmail:
                  actor.email,
                actorRole:
                  actor.role,
                category:
                  'ACCESS',
                action,
                entityType:
                  'USER',
                entityId:
                  updated.id,
                entityLabel:
                  updated.email,
                outcome:
                  'SUCCESS',
                before: {
                  role:
                    target.role,
                  isActive:
                    target.isActive,
                },
                after: {
                  role:
                    updated.role,
                  isActive:
                    updated.isActive,
                },
                metadata: {
                  targetUserId:
                    updated.id,
                  targetEmail:
                    updated.email,
                },
              },
            });

            return updated;
          },
          {
            isolationLevel:
              'Serializable',
          },
        );
      }
      catch (cause: unknown) {
        const retryable =
          typeof cause === 'object' &&
          cause !== null &&
          'code' in cause &&
          cause.code === 'P2034';

        if (
          retryable &&
          attempt < 2
        ) {
          continue;
        }

        throw cause;
      }
    }

    throw new ConflictException(
      'User access update could not be completed',
    );
  }

  async deactivate(
    actor: AuditActor,
    tenantId: string,
    id: string,
  ) {
    return this.updateAccess(
      actor,
      tenantId,
      id,
      {
        isActive: false,
      },
    );
  }
}
