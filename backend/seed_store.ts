import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mockItems = [
  {
    title: 'Atardecer en la Ciudad',
    description: 'Una vista espectacular del horizonte bañada en la luz dorada del atardecer. Ideal para fondos oscuros.',
    price: 49.99,
    thumbnail_url: 'https://images.unsplash.com/photo-1506744269153-b01831df051d?w=800&auto=format&fit=crop',
    high_res_key: 'mock-highres-key-1',
    is_active: true
  },
  {
    title: 'Minimalismo Urbano',
    description: 'Arquitectura moderna con un contraste perfecto. Líneas limpias que no distraen de tus íconos.',
    price: 35.50,
    thumbnail_url: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=800&auto=format&fit=crop',
    high_res_key: 'mock-highres-key-2',
    is_active: true
  },
  {
    title: 'Naturaleza Profunda',
    description: 'Adéntrate en el bosque con esta toma de larga exposición. Tonos verdes esmeralda vibrantes.',
    price: 25.00,
    thumbnail_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop',
    high_res_key: 'mock-highres-key-3',
    is_active: true
  },
  {
    title: 'Retrato Neón',
    description: 'Estilo cyberpunk en las calles de Tokio. Colores intensos de neón rosa y azul.',
    price: 60.00,
    thumbnail_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop',
    high_res_key: 'mock-highres-key-4',
    is_active: true
  },
  {
    title: 'Textura Abstracta',
    description: 'Macrofotografía de una hoja de otoño. Los detalles son impresionantes en pantallas OLED.',
    price: 20.00,
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
    high_res_key: 'mock-highres-key-5',
    is_active: true
  },
  {
    title: 'Montañas Heladas',
    description: 'Picos nevados en los Alpes. Una atmósfera fría y limpia para tu pantalla de bloqueo.',
    price: 55.00,
    thumbnail_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop',
    high_res_key: 'mock-highres-key-6',
    is_active: true
  }
];

async function seedStore() {
  console.log('Seeding store items...');
  for (const item of mockItems) {
    await prisma.storeItem.create({
      data: item
    });
  }
  console.log('Mock store items added successfully!');
}

seedStore()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
