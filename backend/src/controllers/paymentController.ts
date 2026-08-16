import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { generateSecureDownloadUrl } from '../services/storage';

const OPENPAY_MERCHANT_ID = process.env.OPENPAY_MERCHANT_ID || 'mktd5c3iik6oeyntnmy5';
const OPENPAY_PRIVATE_KEY = process.env.OPENPAY_PRIVATE_KEY || 'sk_39a1ca0d5403487f89fb73dff4b13a30';
const OPENPAY_BASE_URL = process.env.OPENPAY_BASE_URL || 'https://sandbox-api.openpay.mx/v1';

const getOpenPayHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Basic ${Buffer.from(OPENPAY_PRIVATE_KEY + ':').toString('base64')}`
});

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

    // 2. Crear Checkout en OpenPay
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    const checkoutPayload = {
      amount: total_amount,
      description: `Fotos Extra - ${gallery.name}`,
      currency: "MXN",
      redirect_url: `${FRONTEND_URL}/gallery/${gallery.access_code}/success`,
      customer: {
         name: client.name || "Cliente",
         last_name: "Galería",
         email: client.email,
         phone_number: "5555555555" // OpenPay requiere un teléfono válido o formato, ponemos dummy seguro
      },
      send_email: false,
      expiration_date: new Date(Date.now() + 86400000).toISOString().split('T')[0] + "T23:59:00-06:00",
      order_id: `GAL-${transaction.id}-${Date.now()}` // Unique per retry
    };

    const opRes = await fetch(`${OPENPAY_BASE_URL}/${OPENPAY_MERCHANT_ID}/checkouts`, {
      method: 'POST',
      headers: getOpenPayHeaders(),
      body: JSON.stringify(checkoutPayload)
    });

    const opData = await opRes.json();

    if (!opRes.ok) {
      console.error('OpenPay Checkout Error:', opData);
      return res.status(500).json({ error: 'Error configurando pasarela de pagos (OpenPay)' });
    }

    // Actualizar transacción con el ID de sesión de pago
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { payment_session_id: opData.id }
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
      preferenceId: opData.id, 
      transactionId: transaction.id, 
      amount: total_amount,
      init_point: opData.checkout_link // En OpenPay es checkout_link
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json({ error: 'Error processing payment request' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { payment_id, preference_id, transaction_id } = req.body;
    
    // OpenPay retorna `id` (transaction_id en frontend o payment_id en la redirección)
    const opChargeId = payment_id; 

    const opRes = await fetch(`${OPENPAY_BASE_URL}/${OPENPAY_MERCHANT_ID}/charges/${opChargeId}`, {
      headers: getOpenPayHeaders()
    });

    const payment = await opRes.json();

    if (!opRes.ok) {
      return res.status(400).json({ error: 'El pago no existe o hubo un error consultando OpenPay' });
    }

    if (payment.status === 'in_progress') {
      return res.status(202).json({ message: 'Pago en proceso' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: `El pago tiene estado: ${payment.status}` });
    }

    // Extraer ID de la transacción desde order_id (Ej: "GAL-123-170...")
    const parts = payment.order_id?.split('-');
    const dbTransactionId = parts && parts.length > 1 ? parseInt(parts[1]) : transaction_id;

    if (!dbTransactionId) {
      return res.status(400).json({ error: 'Pago no relacionado con una transacción válida' });
    }

    // Actualizar base de datos
    await prisma.transaction.update({
      where: { id: dbTransactionId },
      data: { status: 'completed', payment_id: opChargeId }
    });

    // Obtener las fotos desbloqueadas en esta transacción
    const unlocked = await prisma.unlockedPhoto.findMany({
      where: { transaction_id: dbTransactionId },
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

export const openpayWebhook = async (req: Request, res: Response) => {
  try {
    const { type, transaction } = req.body;
    
    // OpenPay envia type='charge.succeeded' y data en 'transaction'
    if (type === 'charge.succeeded' && transaction && transaction.id) {
      const opChargeId = transaction.id;
      
      const parts = transaction.order_id?.split('-');
      const orderType = parts ? parts[0] : null; // GAL or STORE
      const dbId = parts && parts.length > 1 ? parseInt(parts[1]) : null;
        
      if (dbId) {
        if (orderType === 'GAL') {
          const dbTx = await prisma.transaction.findUnique({ where: { id: dbId } });
          if (dbTx && dbTx.status === 'pending') {
            await prisma.transaction.update({
              where: { id: dbId },
              data: { status: 'completed', payment_id: opChargeId }
            });
            console.log(`[Webhook] Transacción OpenPay GAL-${dbId} completada.`);
          }
        } else if (orderType === 'STORE') {
          const dbOrder = await prisma.storeOrder.findUnique({ where: { id: dbId } });
          if (dbOrder && dbOrder.status === 'PENDING') {
            await prisma.storeOrder.update({
              where: { id: dbId },
              data: { status: 'PAID', payment_id: opChargeId }
            });
            console.log(`[Webhook] Transacción OpenPay STORE-${dbId} completada.`);
          }
        }
      }
    }

    // Siempre responder 200 a OpenPay para que no siga insistiendo
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook openpay:', error);
    res.status(500).send('Error');
  }
};
