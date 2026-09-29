import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const PLATFORM_TENANT_NAME = 'Juveria Platform';
const PLATFORM_TENANT_SLUG = 'juveria-platform';

function requireEnvironment(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const databaseUrl = requireEnvironment('DATABASE_URL');
  const email = requireEnvironment(
    'PLATFORM_ADMIN_EMAIL',
  )
    .toLowerCase();

  const password = requireEnvironment(
    'PLATFORM_ADMIN_PASSWORD',
  );

  const firstName =
    process.env.PLATFORM_ADMIN_FIRST_NAME?.trim() ||
    'Platform';

  const lastName =
    process.env.PLATFORM_ADMIN_LAST_NAME?.trim() ||
    'Admin';

  if (password.length < 16) {
    throw new Error(
      'PLATFORM_ADMIN_PASSWORD must contain at least 16 characters.',
    );
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      throw new Error(
        `A user already exists for ${email}. Bootstrap aborted.`,
      );
    }

    const existingPlatformAdmins =
      await prisma.user.count({
        where: {
          role: 'PLATFORM_ADMIN',
        },
      });

    if (existingPlatformAdmins > 0) {
      throw new Error(
        'A PLATFORM_ADMIN already exists. Bootstrap aborted.',
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12,
    );

    const result = await prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.upsert({
          where: {
            slug: PLATFORM_TENANT_SLUG,
          },
          update: {},
          create: {
            name: PLATFORM_TENANT_NAME,
            slug: PLATFORM_TENANT_SLUG,
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            firstName,
            lastName,
            passwordHash,
            role: 'PLATFORM_ADMIN',
            isActive: true,
          },
          select: {
            id: true,
            tenantId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });

        return {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          },
          user,
        };
      },
    );

    console.log(
      '\nPLATFORM ADMIN BOOTSTRAP COMPLETE',
    );

    console.log(
      JSON.stringify(result, null, 2),
    );
  }
  finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    '\nPLATFORM ADMIN BOOTSTRAP FAILED',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exit(1);
});