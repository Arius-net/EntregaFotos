import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { generateSecureDownloadUrl } from '../services/storage';

export const createGallery = async (req: Request, res: Response) => {
  try {
    const { photographer_id, name, free_limit, extra_photo_price, expires_at, max_clients_allowed } = req.body;

    const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const gallery = await prisma.gallery.create({
      data: {
        photographer_id: parseInt(photographer_id),
        name,
        access_code,
        free_limit: parseInt(free_limit),
        extra_photo_price: parseFloat(extra_photo_price),
        expires_at: new Date(expires_at),
        max_clients_allowed: max_clients_allowed ? parseInt(max_clients_allowed) : 0
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
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const client = await prisma.client.findUnique({ where: { email } });
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
      select: { photo_id: true }
    });

    const unlockedIds = unlockedPhotos.map((u: { photo_id: number }) => u.photo_id);
    res.status(200).json({ unlockedIds });
  } catch (error) {
    console.error('Error fetching unlocked photos:', error);
    res.status(500).json({ error: 'Error fetching unlocked photos' });
  }
};

export const verifyAccess = async (req: Request, res: Response) => {
  try {
    const access_code = req.params.access_code as string;
    const email = req.body.email as string;

    if (!email) return res.status(400).json({ error: 'El correo es requerido' });

    const gallery = await prisma.gallery.findUnique({ where: { access_code } });
    if (!gallery) return res.status(404).json({ error: 'Galería no encontrada' });

    // Buscar o crear cliente
    let client = await prisma.client.findUnique({ where: { email } });
    if (!client) {
      client = await prisma.client.create({ data: { email } });
    }

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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getGalleriesByPhotographer = async (req: Request, res: Response) => {
  try {
    const photographer_id = parseInt(req.params.id as string);

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
