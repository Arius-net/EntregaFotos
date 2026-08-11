import { Request, Response } from 'express';
import prisma from '../prismaClient';
import sharp from 'sharp';
import { uploadFile } from '../services/storage';

export const uploadPhotos = async (req: Request, res: Response) => {
  try {
    const { gallery_id, folder } = req.body;
    const files = req.files as Express.Multer.File[];
    const folderName = folder || 'General';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const savedPhotos = [];

    for (const file of files) {
      const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
      
      const highResKey = `galleries/${gallery_id}/highres/${uniqueId}-${file.originalname}`;
      const thumbnailKey = `galleries/${gallery_id}/thumbnails/thumb-${uniqueId}.webp`;

      // 1. Procesar miniatura con Sharp (800px WebP)
      const thumbnailBuffer = await sharp(file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // 2. Subir miniatura a R2
      await uploadFile(thumbnailBuffer, thumbnailKey, 'image/webp');

      // 3. Subir alta resolución a R2
      await uploadFile(file.buffer, highResKey, file.mimetype);

      // 4. Guardar en la base de datos
      const photo = await prisma.photo.create({
        data: {
          gallery_id: parseInt(gallery_id),
          thumbnail_url: thumbnailKey,
          high_res_key: highResKey,
          folder: folderName,
        }
      });

      savedPhotos.push(photo);
    }

    res.status(201).json({ photos: savedPhotos });
  } catch (error) {
    console.error('Error en uploadPhotos:', error);
    res.status(500).json({ error: 'Error uploading photos' });
  }
};
