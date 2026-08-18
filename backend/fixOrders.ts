import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updatedOrders = await prisma.storeOrder.updateMany({
    where: {
      status: 'PENDING',
    },
    data: {
      status: 'PAID',
    },
  });

  console.log(`Updated ${updatedOrders.count} pending store orders to PAID status.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
