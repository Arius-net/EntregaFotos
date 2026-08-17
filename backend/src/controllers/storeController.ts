import { Request, Response } from 'express';
import prisma from '../prismaClient';
import sharp from 'sharp';
import { getClipAuthHeader } from './paymentController';
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
    let isAdmin = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret_key_123');
        if (decoded.role === 'photographer') {
          isAdmin = true;
        }
      } catch (e) {}
    }
    
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

export const createStoreOrder = async (req: Request, res: Response) => {
  try {
    const client_id = (req as any).user?.id;
    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    const { items, total_amount, payment_method } = req.body;
    // items is an array of { id, quantity, price }

    const order = await prisma.storeOrder.create({
      data: {
        client_id,
        total_amount,
        payment_method,
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            store_item_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price
          }))
        }
      }
    });

    res.status(201).json({ order });
  } catch (error) {
    console.error('Error creating store order:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const getMyStoreOrders = async (req: Request, res: Response) => {
  try {
    const client_id = (req as any).user?.id;
    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    const orders = await prisma.storeOrder.findMany({
      where: { client_id },
      orderBy: { created_at: 'desc' },
      include: {
        items: {
          include: {
            store_item: { select: { title: true, thumbnail_url: true } }
          }
        }
      }
    });

    // Firmar URLs de las órdenes para el frontend
    const signedOrders = await Promise.all(orders.map(async (order: any) => {
      const signedItems = await Promise.all(order.items.map(async (item: any) => {
        let key = item.store_item.thumbnail_url;
        if (key && !key.startsWith('http')) {
          key = await generateSecureDownloadUrl(key);
        }
        return { ...item, store_item: { ...item.store_item, thumbnail_url: key } };
      }));
      return { ...order, items: signedItems };
    }));

    res.status(200).json({ orders: signedOrders });
  } catch (error) {
    console.error('Error fetching my store orders:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { items, total_amount, shipping_address } = req.body;
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    // 1. Crear Orden
    const order = await prisma.storeOrder.create({
      data: {
        client_id,
        total_amount: Number(total_amount),
        status: 'PENDING',
        payment_method: 'CLIP',
        items: {
          create: items.map((item: any) => ({
            store_item_id: item.store_item_id,
            quantity: item.quantity,
            price_at_time: Number(item.unit_price)
          }))
        }
      }
    });

    // 2. Crear Checkout con Clip
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const authHeader = getClipAuthHeader();

    const payload = {
      amount: Number(total_amount),
      currency: "MXN",
      purchase_description: `Compra en Tienda Oficial - Orden #${order.id}`,
      redirection_url: {
        success: `${FRONTEND_URL}/store/success?order=${order.id}`,
        error: `${FRONTEND_URL}/store?error=payment_failed`,
        default: `${FRONTEND_URL}/store`
      },
      custom_reference: order.id.toString(),
      metadata: {
        order_id: order.id.toString()
      }
    };

    const resClip = await fetch('https://api.payclip.com/v2/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!resClip.ok) {
      const err = await resClip.text();
      console.error('Error from Clip API:', err);
      throw new Error('No se pudo crear el pago en Clip');
    }

    const clipData = await resClip.json();

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { payment_id: clipData.payment_request_id }
    });

    res.status(200).json({ 
      preferenceId: clipData.payment_request_id,
      init_point: clipData.payment_request_url 
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error processing order' });
  }
};

export const getAllStoreOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.storeOrder.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        client: { select: { name: true, email: true } },
        items: {
          include: {
            store_item: { select: { title: true } }
          }
        }
      }
    });

    res.status(200).json({ orders });
  } catch (error) {
    console.error('Error fetching all store orders:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};
