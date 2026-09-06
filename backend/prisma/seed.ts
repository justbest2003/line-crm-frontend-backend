import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed default admin
  const passwordHash = await bcrypt.hash('admin1234', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@linecrm.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@linecrm.local',
      passwordHash,
      role: 'admin',
    },
  });
  console.log(`Admin: ${admin.email} (password: admin1234)`);

  // Seed staff user
  const staffHash = await bcrypt.hash('staff1234', 12);
  const staff = await prisma.admin.upsert({
    where: { email: 'staff@linecrm.local' },
    update: {},
    create: {
      name: 'Staff',
      email: 'staff@linecrm.local',
      passwordHash: staffHash,
      role: 'staff',
    },
  });
  console.log(`Staff: ${staff.email} (password: staff1234)`);

  // Seed sample tags
  const tagData = [
    { name: 'VIP', color: '#8B5CF6' },
    { name: 'สนใจสินค้า', color: '#0E7C86' },
    { name: 'งบสูง', color: '#D4923B' },
    { name: 'ติดตามต่อ', color: '#3B82F6' },
    { name: 'ปิดการขายแล้ว', color: '#22C55E' },
  ];

  for (const tag of tagData) {
    const created = await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
    console.log(`Tag: ${created.name} (${created.color})`);
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
