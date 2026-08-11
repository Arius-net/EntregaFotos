import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const photographer = await prisma.photographer.upsert({
    where: { id: 1 },
    update: {},
    create: {
      email: 'admin@admin.com',
      password_hash: '123456'
    }
  });
  console.log('Photographer seeded:', photographer);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
