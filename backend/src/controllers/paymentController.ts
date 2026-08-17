import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { generateSecureDownloadUrl } from '../services/storage';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-dummy' });

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

    // 2. Crear Preferencia en Mercado Pago
    const preference = new Preference(mpClient);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const BACKEND_URL = process.env.BACKEND_URL;

    const prefBody: any = {
      items: [
        {
          id: 'fotos_extra',
          title: `Fotos Extra - ${gallery.name}`,
          quantity: extraPhotos,
          unit_price: Number(gallery.extra_photo_price)
        }
      ],
      back_urls: {
        success: `${FRONTEND_URL}/gallery/${gallery.access_code}/success`,
        failure: `${FRONTEND_URL}/gallery/${gallery.access_code}`,
        pending: `${FRONTEND_URL}/gallery/${gallery.access_code}`
      },
      external_reference: transaction.id.toString()
    };

    if (BACKEND_URL) {
      prefBody.notification_url = `${BACKEND_URL}/api/webhooks/mercadopago`;
    }

    const prefResponse = await preference.create({ body: prefBody });

    // Actualizar transacción con el ID de preferencia real
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { mp_preference_id: prefResponse.id }
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
      preferenceId: prefResponse.id, 
      transactionId: transaction.id, 
      amount: total_amount,
      init_point: prefResponse.init_point // La URL a donde el frontend debe redirigir
    });
  } catch (error) {
    console.error('Error creating preference:', error);
    res.status(500).json({ error: 'Error processing payment request' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { payment_id, preference_id } = req.body;
    
    // Consultar el SDK de MercadoPago
    const paymentClient = new Payment(mpClient);
    const payment = await paymentClient.get({ id: payment_id });

    if (payment.status === 'in_process' || payment.status === 'pending') {
      return res.status(202).json({ message: 'Pago en proceso' });
    }

    if (payment.status !== 'approved') {
      return res.status(400).json({ error: 'El pago no está aprobado' });
    }

    const transaction_id = payment.external_reference || payment.metadata?.transaction_id;
    if (!transaction_id) {
      return res.status(400).json({ error: 'Pago no relacionado con la app' });
    }

    // Actualizar base de datos
    await prisma.transaction.update({
      where: { id: parseInt(transaction_id) },
      data: { status: 'completed', mp_payment_id: payment_id }
    });

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

export const mpWebhook = async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    
    // MercadoPago envia type='payment' y data.id
    if (type === 'payment' && data && data.id) {
      const paymentClient = new Payment(mpClient);
      const payment = await paymentClient.get({ id: data.id });

      if (payment.status === 'approved') {
        const transaction_id = payment.external_reference || payment.metadata?.transaction_id;
        
        if (transaction_id) {
          const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transaction_id) }
          });

          // Solo actualizamos si sigue pendiente
          if (transaction && transaction.status === 'pending') {
            await prisma.transaction.update({
              where: { id: parseInt(transaction_id) },
              data: { status: 'completed', mp_payment_id: payment.id?.toString() }
            });
            console.log(`[Webhook] Transacción ${transaction_id} completada.`);
          }
        }
      }
    }

    // Siempre responder 200 a MercadoPago para que no siga insistiendo
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).send('Error');
  }
};
