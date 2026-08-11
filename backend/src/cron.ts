import cron from 'node-cron';
import prisma from './prismaClient';
import { deleteFile } from './services/storage';

// Tarea programada para ejecutarse todos los días a las 3:00 AM
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] Iniciando limpieza de galerías expiradas...');
  
  try {
    const now = new Date();
    
    // Buscar galerías que hayan expirado
    const expiredGalleries = await prisma.gallery.findMany({
      where: {
        expires_at: {
          lt: now
        }
      },
      include: {
        photos: true
      }
    });

    if (expiredGalleries.length === 0) {
      console.log('[CRON] No hay galerías expiradas para eliminar.');
      return;
    }

    // 1. Eliminar archivos de R2
    for (const gallery of expiredGalleries) {
      for (const photo of gallery.photos) {
        // Eliminar versión de alta resolución
        if (photo.high_res_key) {
          try {
            await deleteFile(photo.high_res_key);
          } catch (e) {
            console.error(`Error borrando high_res_key: ${photo.high_res_key}`, e);
          }
        }
        
        // Asumiendo que thumbnail_url tiene el formato https://.../key o podemos inferir la key
        // En nuestro caso, al subir guardábamos key en R2. Para simplificar, asumiremos
        // que la miniatura tiene un patrón predecible y la borramos si lo deseamos.
        // O podríamos añadir un campo thumbnail_key en BD. Por simplicidad, si extraemos la key de la URL:
        try {
          const thumbKey = photo.thumbnail_url.split('.dev/')[1];
          if (thumbKey) await deleteFile(thumbKey);
        } catch (e) {
          // Ignorar errores de thumbnail
        }
      }
    }

    // 2. Eliminar de la base de datos
    const galleryIds = expiredGalleries.map(g => g.id);
    const result = await prisma.gallery.deleteMany({
      where: { id: { in: galleryIds } }
    });

    console.log(`[CRON] Se han eliminado ${result.count} galerías expiradas y sus archivos en R2.`);
  } catch (error) {
    console.error('[CRON] Error durante la limpieza:', error);
  }
});
