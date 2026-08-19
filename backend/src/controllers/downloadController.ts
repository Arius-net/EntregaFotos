import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { generateSecureDownloadUrl, getFileStream } from '../services/storage';
import archiver from 'archiver';

export const downloadFreePhotos = async (req: Request, res: Response) => {
  try {
    const { gallery_id, selected_photo_ids } = req.body;
    const client_id = (req as any).user?.id;
    
    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    // 1. Obtener al cliente
    let client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    // 2. Obtener galería para verificar el límite gratuito
    const gallery = await prisma.gallery.findUnique({
      where: { id: parseInt(gallery_id) }
    });

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    // Calcular cuántas fotos de esta galería ya ha desbloqueado el cliente de forma GRATUITA
    const alreadyUnlockedTotal = await prisma.unlockedPhoto.count({
      where: {
        client_id: client.id,
        photo: { gallery_id: parseInt(gallery_id) },
        unlock_method: 'free'
      }
    });

    // Calcular cuántas de las seleccionadas en esta petición YA estaban desbloqueadas legítimamente
    const alreadyUnlockedSelected = await prisma.unlockedPhoto.findMany({
      where: {
        client_id: client.id,
        photo_id: { in: selected_photo_ids.map((id: any) => parseInt(id)) },
        OR: [
          { unlock_method: 'free' },
          { transaction: { status: 'completed' } }
        ]
      }
    });

    const newPhotosCount = selected_photo_ids.length - alreadyUnlockedSelected.length;

    // Verificar si las nuevas fotos superan el límite gratuito restante. 
    // Solo comprobamos el límite si realmente está intentando desbloquear fotos nuevas (newPhotosCount > 0)
    if (newPhotosCount > 0 && (alreadyUnlockedTotal + newPhotosCount > gallery.free_limit)) {
      return res.status(400).json({ error: 'Excede el límite de fotos gratuitas de la galería' });
    }

    // 3. Registrar el desbloqueo en UnlockedPhoto
    const unlockedRecords = [];
    const downloadUrls = [];

    const alreadyUnlockedIds = new Set(alreadyUnlockedSelected.map((u: any) => u.photo_id));

    for (const photoId of selected_photo_ids) {
      const parsedId = parseInt(photoId);
      // Buscar la foto para obtener su high_res_key
      const photo = await prisma.photo.findUnique({ where: { id: parsedId } });
      if (!photo) continue;

      if (!alreadyUnlockedIds.has(parsedId)) {
        // Upsert (crear o actualizar si existe una versión pendiente) del UnlockedPhoto
        try {
          await prisma.unlockedPhoto.upsert({
            where: {
              client_id_photo_id: {
                client_id: client.id,
                photo_id: photo.id,
              }
            },
            update: {
              unlock_method: 'free',
              transaction_id: null
            },
            create: {
              client_id: client.id,
              photo_id: photo.id,
              unlock_method: 'free',
            }
          });
        } catch (e) {
          console.error('Error upserting UnlockedPhoto in downloadFreePhotos:', e);
        }
      }

      // Generar URL firmada forzando la descarga
      const secureUrl = await generateSecureDownloadUrl(photo.high_res_key, true);
      downloadUrls.push({ photoId: photo.id, url: secureUrl });
    }

    res.status(200).json({ urls: downloadUrls });
  } catch (error) {
    console.error('Error downloading free photos:', error);
    res.status(500).json({ error: 'Error processing download request' });
  }
};

export const downloadAllFinalPhotos = async (req: Request, res: Response) => {
  try {
    const gallery_id = parseInt(req.params.gallery_id as string);
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    const gallery = await prisma.gallery.findUnique({
      where: { id: gallery_id },
      include: {
        photos: {
          where: { is_final: true }
        }
      }
    });

    if (!gallery) {
      return res.status(404).json({ error: 'Galería no encontrada' });
    }

    if (gallery.status !== 'DELIVERED') {
      return res.status(403).json({ error: 'La galería aún no está lista para descarga' });
    }

    if (gallery.photos.length === 0) {
      return res.status(404).json({ error: 'No hay fotos finales disponibles' });
    }

    // Ordenar naturalmente
    gallery.photos.sort((a, b) => {
      const nameA = (a.high_res_key.split('/').pop() || '').replace(/^\d+-/, '');
      const nameB = (b.high_res_key.split('/').pop() || '').replace(/^\d+-/, '');
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const downloadUrls = [];
    for (const photo of gallery.photos) {
      const secureUrl = await generateSecureDownloadUrl(photo.high_res_key, true);
      downloadUrls.push({ photoId: photo.id, url: secureUrl });
    }

    res.status(200).json({ urls: downloadUrls });

  } catch (error) {
    console.error('Error en downloadAllFinalPhotos:', error);
    res.status(500).json({ error: 'Error al obtener URLs de descarga completas' });
  }
};

// NUEVOS ENDPOINTS PARA DESCARGAR ZIP (usando método GET con ids pasados por query param o todos si no hay ids)
export const downloadZip = async (req: Request, res: Response) => {
  try {
    const gallery_id = parseInt(req.params.gallery_id);
    const { ids } = req.query; // e.g. ids=1,2,3
    const client_id = (req as any).user?.id;

    if (!client_id || isNaN(gallery_id)) return res.status(401).json({ error: 'No autorizado o parámetros inválidos' });

    let client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    const gallery = await prisma.gallery.findUnique({ where: { id: gallery_id } });
    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    let photosToDownload = [];

    if (ids) {
      // Descargar selección específica (requiere verificar que estén desbloqueadas de alguna manera)
      const selectedIds = (ids as string).split(',').map(id => parseInt(id));
      
      const unlocked = await prisma.unlockedPhoto.findMany({
        where: {
          client_id: client.id,
          photo_id: { in: selectedIds },
          OR: [
            { unlock_method: 'free' },
            { transaction: { status: 'completed' } }
          ]
        },
        include: { photo: true }
      });
      photosToDownload = unlocked.map(u => u.photo);
      
      // NOTA: No hacemos logica de descontar limites gratis aquí. 
      // Se asume que el usuario primero desbloqueó las fotos vía POST /api/downloads/free
      // y luego de que se desbloquearon, apretó "Descargar ZIP".
    } else {
      // Descargar TODO (finalizado)
      if (gallery.status !== 'completed' && gallery.status !== 'delivered') {
        return res.status(403).json({ error: 'La galería no está completada' });
      }
      
      // Si el cliente pagó la galería completa (para las galerías enteras pagadas o con pin full access)
      // O solo las que haya desbloqueado. Para "Descargar Todo" en PhotoGrid.tsx, bajamos todas las que tengan high_res_key en galerías completed/delivered
      photosToDownload = await prisma.photo.findMany({
        where: {
          gallery_id: gallery_id,
          high_res_key: { not: null }
        }
      });
    }

    if (photosToDownload.length === 0) {
      return res.status(404).json({ error: 'No hay fotos para descargar' });
    }

    // Configurar encabezados para el ZIP
    res.attachment(`fotos_galeria_${gallery_id}.zip`);
    const archive = archiver('zip', { zlib: { level: 5 } }); // Nivel 5 para balancear velocidad/compresión
    
    // Si la conexión se cierra temprano
    req.on('close', () => {
      archive.abort();
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    // Añadir cada foto al zip
    for (const photo of photosToDownload) {
      if (photo.high_res_key) {
        try {
          const stream = await getFileStream(photo.high_res_key);
          archive.append(stream, { name: `foto_${photo.id}.jpg` });
        } catch (err) {
          console.error(`Error al incluir la foto ${photo.id} en el ZIP`, err);
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error generando ZIP:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error procesando la descarga ZIP' });
    }
  }
};
