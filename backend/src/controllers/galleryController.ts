import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { generateSecureDownloadUrl, deleteFilesBatch } from '../services/storage';

export const createGallery = async (req: Request, res: Response) => {
  try {
    const { name, free_limit, extra_photo_price, expires_at, max_clients_allowed, type, selection_limit } = req.body;
    const photographer_id = (req as any).user?.id;

    if (!photographer_id) return res.status(401).json({ error: 'No autorizado' });

    const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const gallery = await prisma.gallery.create({
      data: {
        photographer_id: parseInt(photographer_id),
        name,
        access_code,
        free_limit: parseInt(free_limit || 0),
        extra_photo_price: parseFloat(extra_photo_price || 0),
        expires_at: new Date(expires_at),
        max_clients_allowed: max_clients_allowed ? parseInt(max_clients_allowed) : 0,
        type: type || 'FINAL',
        selection_limit: selection_limit ? parseInt(selection_limit) : 0,
        status: 'PENDING'
      }
    });

    res.status(201).json({ gallery });
  } catch (error) {
    console.error('Error creating gallery:', error);
    res.status(500).json({ error: 'Error creating gallery' });
  }
};

export const getGallery = async (req: Request, res: Response) => {
  try {
    const access_code = req.params.access_code as string;

    const gallery = await prisma.gallery.findUnique({
      where: { access_code },
      include: {
        photos: {
          select: {
            id: true,
            thumbnail_url: true,
            folder: true,
          }
        }
      }
    });

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    // Firmar las miniaturas sobre la marcha para que sean visibles y seguras
    const photosWithSignedUrls = await Promise.all(
      gallery.photos.map(async (photo: any) => {
        // Limpiar URL por si tiene el placeholder viejo
        let key = photo.thumbnail_url;
        if (key.includes('pub-your-public-r2-url.r2.dev/')) {
          key = key.split('.dev/')[1];
        }
        const signedUrl = await generateSecureDownloadUrl(key);
        return {
          ...photo,
          thumbnail_url: signedUrl
        };
      })
    );

    res.status(200).json({
      gallery: {
        ...gallery,
        photos: photosWithSignedUrls
      }
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Error fetching gallery' });
  }
};

export const getUnlockedPhotos = async (req: Request, res: Response) => {
  try {
    const gallery_id = parseInt(req.params.id as string);
    const client_id = (req as any).user?.id;

    if (!client_id) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client) {
      return res.status(200).json({ unlockedIds: [] });
    }

    const unlockedPhotos = await prisma.unlockedPhoto.findMany({
      where: {
        client_id: client.id,
        photo: {
          gallery_id: gallery_id
        },
        OR: [
          { unlock_method: 'free' },
          { transaction: { status: 'completed' } }
        ]
      },
      select: { photo_id: true, unlock_method: true }
    });

    const unlockedIds = unlockedPhotos.map((u: { photo_id: number }) => u.photo_id);
    const freeUnlockedCount = unlockedPhotos.filter((u: { unlock_method: string }) => u.unlock_method === 'free').length;

    res.status(200).json({ unlockedIds, freeUnlockedCount });
  } catch (error) {
    console.error('Error fetching unlocked photos:', error);
    res.status(500).json({ error: 'Error fetching unlocked photos' });
  }
};

export const verifyAccess = async (req: Request, res: Response) => {
  try {
    const access_code = req.params.access_code as string;
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'Debes iniciar sesión con tu PIN' });

    const gallery = await prisma.gallery.findUnique({ where: { access_code } });
    if (!gallery) return res.status(404).json({ error: 'Galería no encontrada' });

    const client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Si la galería no tiene límite, registrar acceso (si no existe) y permitir
    if (gallery.max_clients_allowed === 0) {
      await prisma.galleryAccess.upsert({
        where: { gallery_id_client_id: { gallery_id: gallery.id, client_id: client.id } },
        update: {},
        create: { gallery_id: gallery.id, client_id: client.id }
      });
      return res.status(200).json({ success: true, message: 'Acceso permitido' });
    }

    // Verificar si ya tiene acceso
    const existingAccess = await prisma.galleryAccess.findUnique({
      where: { gallery_id_client_id: { gallery_id: gallery.id, client_id: client.id } }
    });

    if (existingAccess) {
      return res.status(200).json({ success: true, message: 'Acceso permitido (recurrente)' });
    }

    // No tiene acceso, contar cuántos hay
    const accessCount = await prisma.galleryAccess.count({
      where: { gallery_id: gallery.id }
    });

    if (accessCount >= gallery.max_clients_allowed) {
      return res.status(403).json({ error: 'Esta galería ha alcanzado el límite máximo de personas permitidas' });
    }

    // Hay espacio, conceder acceso
    await prisma.galleryAccess.create({
      data: { gallery_id: gallery.id, client_id: client.id }
    });

    res.status(200).json({ success: true, message: 'Acceso concedido por primera vez' });
  } catch (error) {
    console.error('Error verifying access:', error);
    res.status(500).json({ error: 'Error verifying access' });
  }
};

export const updateGallery = async (req: Request, res: Response) => {
  try {
    const galleryId = parseInt(req.params.id as string);
    const photographer_id = (req as any).user?.id;
    if (!photographer_id) return res.status(401).json({ error: 'No autorizado' });

    const { name, free_limit, extra_photo_price, expires_at, max_clients_allowed, type, selection_limit } = req.body;

    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery || gallery.photographer_id !== photographer_id) {
      return res.status(404).json({ error: 'Galería no encontrada o no te pertenece' });
    }

    const updated = await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        name,
        free_limit: parseInt(free_limit || 0),
        extra_photo_price: parseFloat(extra_photo_price || 0),
        expires_at: new Date(expires_at),
        max_clients_allowed: max_clients_allowed ? parseInt(max_clients_allowed) : 0,
        type: type || gallery.type,
        selection_limit: selection_limit !== undefined ? parseInt(selection_limit) : gallery.selection_limit,
      }
    });

    res.status(200).json({ message: 'Galería actualizada', gallery: updated });
  } catch (error) {
    console.error('Error updating gallery:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const deleteGallery = async (req: Request, res: Response) => {
  try {
    const galleryId = parseInt(req.params.id as string);
    const photographer_id = (req as any).user?.id;
    if (!photographer_id) return res.status(401).json({ error: 'No autorizado' });

    const gallery = await prisma.gallery.findUnique({ 
      where: { id: galleryId },
      include: { photos: true }
    });

    if (!gallery || gallery.photographer_id !== photographer_id) {
      return res.status(404).json({ error: 'Galería no encontrada o no te pertenece' });
    }

    // Recopilar keys de R2
    const keysToDelete: string[] = [];
    for (const photo of gallery.photos) {
      keysToDelete.push(photo.high_res_key);
      let thumbKey = photo.thumbnail_url;
      if (thumbKey.includes('pub-your-public-r2-url.r2.dev/')) {
        thumbKey = thumbKey.split('.dev/')[1];
      }
      keysToDelete.push(thumbKey);
    }

    // Borrar en R2 en lotes (hasta 1000 a la vez)
    // S3 DeleteObjects soporta max 1000
    for (let i = 0; i < keysToDelete.length; i += 1000) {
      await deleteFilesBatch(keysToDelete.slice(i, i + 1000));
    }

    // Borrar de BD (Esto borra en cascada fotos, accesos, etc.)
    await prisma.gallery.delete({ where: { id: galleryId } });

    res.status(200).json({ message: 'Galería y fotos eliminadas exitosamente' });
  } catch (error) {
    console.error('Error deleting gallery:', error);
    res.status(500).json({ error: 'Error interno al eliminar galería' });
  }
};

export const getGalleriesByPhotographer = async (req: Request, res: Response) => {
  try {
    const photographer_id = (req as any).user?.id;
    if (!photographer_id) return res.status(401).json({ error: 'No autorizado' });

    const galleries = await prisma.gallery.findMany({
      where: { photographer_id },
      orderBy: { id: 'desc' },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    });

    res.status(200).json({ galleries });
  } catch (error) {
    console.error('Error fetching galleries:', error);
    res.status(500).json({ error: 'Error fetching galleries' });
  }
};

export const getSelectedPhotos = async (req: Request, res: Response) => {
  try {
    const gallery_id = parseInt(req.params.id as string);
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    const selectedPhotos = await prisma.selectedPhoto.findMany({
      where: { client_id, gallery_id },
      select: { photo_id: true }
    });

    const selectedIds = selectedPhotos.map((s: any) => s.photo_id);
    res.status(200).json({ selectedIds });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

export const toggleSelection = async (req: Request, res: Response) => {
  try {
    const { gallery_id, photo_id } = req.body;
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    const gallery = await prisma.gallery.findUnique({ where: { id: gallery_id } });
    if (!gallery) return res.status(404).json({ error: 'Galería no encontrada' });
    if (gallery.status === 'SUBMITTED') return res.status(400).json({ error: 'La selección ya fue enviada' });

    const existing = await prisma.selectedPhoto.findUnique({
      where: {
        client_id_photo_id: { client_id, photo_id }
      }
    });

    if (existing) {
      await prisma.selectedPhoto.delete({ where: { id: existing.id } });
      return res.status(200).json({ action: 'removed' });
    } else {
      const currentCount = await prisma.selectedPhoto.count({ where: { client_id, gallery_id } });
      if (currentCount >= gallery.selection_limit) {
        return res.status(400).json({ error: `Límite alcanzado (${gallery.selection_limit} fotos).` });
      }

      await prisma.selectedPhoto.create({
        data: { client_id, gallery_id, photo_id }
      });
      return res.status(200).json({ action: 'added' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

export const submitSelection = async (req: Request, res: Response) => {
  try {
    const { gallery_id } = req.body;
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    await prisma.gallery.update({
      where: { id: gallery_id },
      data: { status: 'SUBMITTED' }
    });

    res.status(200).json({ message: 'Selección enviada con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

export const getAdminSelection = async (req: Request, res: Response) => {
  try {
    const gallery_id = parseInt(req.params.id as string);
    const photographer_id = (req as any).user?.id;
    if (!photographer_id) return res.status(401).json({ error: 'No autorizado' });

    const gallery = await prisma.gallery.findUnique({ where: { id: gallery_id } });
    if (!gallery || gallery.photographer_id !== photographer_id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const selections = await prisma.selectedPhoto.findMany({
      where: { gallery_id },
      include: {
        photo: { select: { thumbnail_url: true, folder: true, high_res_key: true } },
        client: { select: { email: true } }
      }
    });

    const selectionsWithSignedUrls = await Promise.all(
      selections.map(async (selection: any) => {
        let key = selection.photo.thumbnail_url;
        if (key.includes('pub-your-public-r2-url.r2.dev/')) {
          key = key.split('.dev/')[1];
        }
        const signedUrl = await generateSecureDownloadUrl(key);
        return {
          ...selection,
          photo: {
            ...selection.photo,
            thumbnail_url: signedUrl
          }
        };
      })
    );

    res.status(200).json({ selections: selectionsWithSignedUrls });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};
