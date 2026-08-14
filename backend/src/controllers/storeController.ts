import { Request, Response } from 'express';
import prisma from '../prismaClient';
import sharp from 'sharp';
import { uploadFile, generateSecureDownloadUrl, deleteFilesBatch } from '../services/storage';

export const createStoreItem = async (req: Request, res: Response) => {
  try {
    const { title, description, price } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const highResKey = `store/highres/${uniqueId}-${file.originalname}`;
    const thumbnailKey = `store/thumbnails/thumb-${uniqueId}.webp`;

    // Generar miniatura
    const thumbnailBuffer = await sharp(file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Subir ambas a R2
    await uploadFile(thumbnailBuffer, thumbnailKey, 'image/webp');
    await uploadFile(file.buffer, highResKey, file.mimetype);

    const item = await prisma.storeItem.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        thumbnail_url: thumbnailKey,
        high_res_key: highResKey,
        is_active: true
      }
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('Error creating store item:', error);
    res.status(500).json({ error: 'Error creating store item' });
  }
};

export const getStoreItems = async (req: Request, res: Response) => {
  try {
    // Si req.user existe y es admin, quizá devolvemos is_active = false también, 
    // pero por ahora devolvemos todos. Si es public, solo is_active = true.
    // Como es simple, devolvemos todo y el frontend filtra si hace falta, o pedimos parámetro.
    const isAdmin = (req as any).user?.role === 'photographer';
    
    const items = await prisma.storeItem.findMany({
      where: isAdmin ? undefined : { is_active: true },
      orderBy: { created_at: 'desc' }
    });

    // Firmar URLs para el frontend (si no son URLs externas de mock)
    const signedItems = await Promise.all(items.map(async (item: any) => {
      const signedUrl = item.thumbnail_url.startsWith('http') 
        ? item.thumbnail_url 
        : await generateSecureDownloadUrl(item.thumbnail_url);
      return { ...item, thumbnail_url: signedUrl };
    }));

    res.status(200).json({ items: signedItems });
  } catch (error) {
    console.error('Error fetching store items:', error);
    res.status(500).json({ error: 'Error fetching store items' });
  }
};

export const updateStoreItem = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, price, is_active } = req.body;

    const item = await prisma.storeItem.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        is_active: is_active !== undefined ? is_active : undefined
      }
    });

    res.status(200).json({ item });
  } catch (error) {
    console.error('Error updating store item:', error);
    res.status(500).json({ error: 'Error updating store item' });
  }
};

export const deleteStoreItem = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const item = await prisma.storeItem.findUnique({ where: { id: parseInt(id) } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Borrar de R2
    await deleteFilesBatch([item.high_res_key, item.thumbnail_url]);

    await prisma.storeItem.delete({ where: { id: parseInt(id) } });

    res.status(200).json({ message: 'Store item deleted successfully' });
  } catch (error) {
    console.error('Error deleting store item:', error);
    res.status(500).json({ error: 'Error deleting store item' });
  }
};
