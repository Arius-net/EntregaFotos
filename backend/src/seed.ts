import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'fotografo@prueba.com';
  
  // Buscar si ya existe el fotógrafo con ID 1
  let fotografo = await prisma.photographer.findUnique({
    where: { id: 1 }
  });

  if (!fotografo) {
    fotografo = await prisma.photographer.create({
      data: {
        id: 1, // Forzar ID 1
        email,
        password_hash: 'dummy_hash_for_now'
      }
    });
    console.log('✅ Fotógrafo inicial creado con ID:', fotografo.id);
  } else {
    console.log('El fotógrafo ya existía con ID:', fotografo.id);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
