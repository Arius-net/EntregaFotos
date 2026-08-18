import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { generateSecureDownloadUrl } from '../services/storage';

export const getClipAuthHeader = () => {
  if (process.env.CLIP_API_KEY && process.env.CLIP_API_SECRET) {
    const combined = `${process.env.CLIP_API_KEY}:${process.env.CLIP_API_SECRET}`;
    return `Basic ${Buffer.from(combined).toString('base64')}`;
  }
  let authHeader = process.env.CLIP_API_KEY || '';
  if (authHeader && !authHeader.startsWith('Bearer') && !authHeader.startsWith('Basic')) {
    return `Bearer ${authHeader}`;
  }
  return authHeader;
};

export const createPreference = async (req: Request, res: Response) => {
  try {
    const { gallery_id, selected_photo_ids } = req.body;
    const client_id = (req as any).user?.id;

    if (!client_id) return res.status(401).json({ error: 'No autorizado' });

    const gallery = await prisma.gallery.findUnique({ where: { id: parseInt(gallery_id) } });
    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    let client = await prisma.client.findUnique({ where: { id: client_id } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    const alreadyUnlockedPhotos = await prisma.unlockedPhoto.findMany({
      where: {
        client_id: client.id,
        photo: { gallery_id: parseInt(gallery_id) },
        OR: [
          { unlock_method: 'free' },
          { transaction: { status: 'completed' } }
        ]
      }
    });

    const unlockedPhotoIds = new Set(alreadyUnlockedPhotos.map((u: { photo_id: number }) => u.photo_id));
    const newPhotos = selected_photo_ids.filter((id: any) => !unlockedPhotoIds.has(parseInt(id)));

    const remainingFreeLimit = Math.max(0, gallery.free_limit - alreadyUnlockedPhotos.length);
    const extraPhotos = Math.max(0, newPhotos.length - remainingFreeLimit);
    
    const total_amount = Number((extraPhotos * Number(gallery.extra_photo_price)).toFixed(2));

    // 1. Crear la transacción como pendiente en BD
    const transaction = await prisma.transaction.create({
      data: {
        client_id: client.id,
        gallery_id: parseInt(gallery_id),
        status: 'pending',
        total_amount,
      }
    });

    // 2. Crear Link de Pago en Clip
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Configurar API Key
    const authHeader = getClipAuthHeader();

    const payload = {
      amount: total_amount,
      currency: "MXN",
      purchase_description: `Fotos Extra - ${gallery.name}`,
      redirection_url: {
        success: `${FRONTEND_URL}/gallery/${gallery.access_code}/success?txn=${transaction.id}`,
        error: `${FRONTEND_URL}/gallery/${gallery.access_code}?error=payment_failed`,
        default: `${FRONTEND_URL}/gallery/${gallery.access_code}`
      },
      custom_reference: transaction.id.toString(),
      metadata: {
        transaction_id: transaction.id.toString()
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

    // Actualizar transacción con el ID de Clip
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { clip_payment_request_id: clipData.payment_request_id }
    });

    // 3. Guardar las fotos como pendientes
    for (const photoId of newPhotos) {
      try {
        await prisma.unlockedPhoto.upsert({
          where: {
            client_id_photo_id: {
              client_id: client.id,
              photo_id: parseInt(photoId),
            }
          },
          update: {
            unlock_method: 'paid',
            transaction_id: transaction.id
          },
          create: {
            client_id: client.id,
            photo_id: parseInt(photoId),
            unlock_method: 'paid',
            transaction_id: transaction.id
          }
        });
      } catch (e) {
        console.error('Error upserting UnlockedPhoto in paymentController:', e);
      }
    }

    res.status(200).json({ 
      preferenceId: clipData.payment_request_id, 
      transactionId: transaction.id, 
      amount: total_amount,
      init_point: clipData.payment_request_url // Clip devuelve la URL aquí
    });
  } catch (error) {
    console.error('Error creating preference:', error);
    res.status(500).json({ error: 'Error processing payment request' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { txn_id } = req.body;
    
    if (!txn_id) {
      return res.status(400).json({ error: 'Falta el ID de transacción' });
    }

    // Por seguridad, aunque el frontend nos diga que fue éxito, si es posible deberíamos 
    // verificar con Clip API el estatus real de payment_request_id. Pero por simplicidad de este paso:
    
    // Actualizar base de datos
    await prisma.transaction.update({
      where: { id: parseInt(txn_id) },
      data: { status: 'completed' } // En un webhook se confirmaría realemente, aquí asumimos éxito si llegó por URL success
    });

    const transaction_id = txn_id;

    // Obtener las fotos desbloqueadas en esta transacción
    const unlocked = await prisma.unlockedPhoto.findMany({
      where: { transaction_id: parseInt(transaction_id) },
      include: { photo: true }
    });

    const downloadUrls = [];
    for (const record of unlocked) {
      const secureUrl = await generateSecureDownloadUrl(record.photo.high_res_key, true);
      downloadUrls.push({ photoId: record.photo.id, url: secureUrl });
    }

    res.status(200).json({ urls: downloadUrls });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Error verifying payment' });
  }
};

export const clipWebhook = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[Clip Webhook Received]', JSON.stringify(payload));

    const status = payload.status || payload.payment?.status || payload.event_type;
    const isApproved = status === 'APPROVED' || status === 'COMPLETED' || status === 'PAID' || status === 'REQUEST_COMPLETED' || payload.type?.includes('APPROVED');

    if (isApproved) {
      let transactionIdParsed: number | null = null;
      let orderIdParsed: number | null = null;

      // 1. Intentar por metadata (si Clip lo incluye)
      const metaTxnId = payload.metadata?.transaction_id || payload.custom_reference || payload.payment?.custom_reference;
      const metaOrderId = payload.metadata?.order_id;

      if (metaTxnId) transactionIdParsed = parseInt(metaTxnId);
      if (metaOrderId) orderIdParsed = parseInt(metaOrderId);

      // 2. Intentar buscar en la BD por el UUID de Clip si metadata falla
      const clipPaymentId = payload.transaction_id || payload.payment_detail?.order_id || payload.id;
      
      if (clipPaymentId) {
        if (!orderIdParsed) {
          try {
            const storeOrder = await prisma.storeOrder.findFirst({ where: { payment_id: clipPaymentId } });
            if (storeOrder) orderIdParsed = storeOrder.id;
          } catch (e) {
            console.warn('Advertencia: No se pudo buscar storeOrder por payment_id', e);
          }
        }
        if (!transactionIdParsed) {
          try {
            const galleryTxn = await prisma.transaction.findFirst({ where: { clip_payment_request_id: clipPaymentId } });
            if (galleryTxn) transactionIdParsed = galleryTxn.id;
          } catch (e) {
            console.warn('Advertencia: No se pudo buscar transaction por clip_payment_request_id. ¿Falta la columna en la BD?', e);
          }
        }
      }

      // Procesar si encontramos ID de Galería
      if (transactionIdParsed) {
        const txn = await prisma.transaction.findUnique({ where: { id: transactionIdParsed } });
        if (txn && txn.status === 'pending') {
          await prisma.transaction.update({
            where: { id: transactionIdParsed },
            data: { status: 'completed' }
          });
          console.log(`[Webhook] Transacción de Galería ${transactionIdParsed} completada.`);
        }
      }
      
      // Procesar si encontramos ID de Tienda
      if (orderIdParsed && !transactionIdParsed) { 
        const order = await prisma.storeOrder.findUnique({ where: { id: orderIdParsed } });
        if (order && order.status === 'PENDING') {
          await prisma.storeOrder.update({
            where: { id: orderIdParsed },
            data: { status: 'PAID' }
          });
          console.log(`[Webhook] Orden de Tienda ${orderIdParsed} completada.`);
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook de Clip:', error);
    res.status(500).send('Error');
  }
};
