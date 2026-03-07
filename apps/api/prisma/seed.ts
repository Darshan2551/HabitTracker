import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@habittracker.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN, emailVerified: true },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: 'Platform Admin',
      role: UserRole.ADMIN,
      emailVerified: true,
      settings: {
        create: {
          timezone: 'UTC',
          locale: 'en-US',
        },
      },
    },
  });

  await prisma.habitTemplate.upsert({
    where: { slug: 'exercise' },
    update: {},
    create: {
      slug: 'exercise',
      title: 'Exercise',
      description: '30-minute workout',
      schedule: { type: 'weekly', days: [1, 3, 5], time: '07:00' },
      goal: { type: 'count', value: 3, period: 'week' },
      tags: ['fitness', 'health'],
    },
  });

  await prisma.habitTemplate.upsert({
    where: { slug: 'meditation' },
    update: {},
    create: {
      slug: 'meditation',
      title: 'Meditation',
      description: '10-minute mindfulness session',
      schedule: { type: 'daily', time: '06:30' },
      goal: { type: 'count', value: 7, period: 'week' },
      tags: ['mindfulness'],
    },
  });

  await prisma.habitTemplate.upsert({
    where: { slug: 'reading' },
    update: {},
    create: {
      slug: 'reading',
      title: 'Reading',
      description: 'Read 20 pages',
      schedule: { type: 'daily', time: '21:00' },
      goal: { type: 'count', value: 5, period: 'week' },
      tags: ['learning'],
    },
  });

  console.log(`Seeded admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });