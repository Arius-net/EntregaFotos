import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

// Esta función se puede llamar desde cualquier parte del backend
export const sendSelectionNotification = async (
  clientEmail: string, 
  galleryName: string, 
  photographerEmail: string,
  photoNames: string[]
) => {
  const selectedCount = photoNames.length;
  
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no está configurada. Simulando envío de correo:');
    console.warn(`De: sistema@tu-dominio.com -> Para: ${photographerEmail} y ${clientEmail}`);
    console.warn(`Fotos seleccionadas: ${photoNames.join(', ')}`);
    return { success: true, simulated: true };
  }

  try {
    // 1. Correo al fotógrafo
    const photoListHtml = photoNames.map(name => `<li>${name}</li>`).join('');

    await resend.emails.send({
      from: 'EntregaFotos <onboarding@resend.dev>', // Cambia a tu dominio cuando lo verifiques
      to: photographerEmail,
      subject: `¡Selección completada! - ${galleryName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #282e70;">¡El cliente ha enviado su selección!</h2>
          <p>El cliente <strong>${clientEmail}</strong> ha finalizado su selección para la galería <strong>${galleryName}</strong>.</p>
          <p>Fotos seleccionadas (${selectedCount}):</p>
          <ul style="background: #f9f9f9; padding: 15px 30px; border-radius: 5px; color: #555; max-height: 300px; overflow-y: auto;">
            ${photoListHtml}
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; color: #666;">Puedes revisar y descargar las fotos desde tu Panel de Administrador.</p>
        </div>
      `,
    });

    // 2. Correo de confirmación al cliente
    await resend.emails.send({
      from: 'EntregaFotos <onboarding@resend.dev>',
      to: clientEmail,
      subject: `Hemos recibido tu selección - ${galleryName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #282e70;">¡Gracias por tu selección!</h2>
          <p>Hemos recibido correctamente tu selección de <strong>${selectedCount}</strong> fotos para la galería <strong>${galleryName}</strong>.</p>
          <p>El fotógrafo ya ha sido notificado y comenzará a trabajar en la edición final.</p>
          <p>Tus selecciones:</p>
          <ul style="background: #f9f9f9; padding: 15px 30px; border-radius: 5px; color: #555; max-height: 300px; overflow-y: auto;">
            ${photoListHtml}
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 14px; color: #666;">Te enviaremos un correo cuando tus fotos editadas estén listas para descargar.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error al enviar correos con Resend:', error);
    return { success: false, error };
  }
};

export const sendPinEmail = async (to: string, pin: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'Galería <onboarding@resend.dev>',
      to: [to],
      subject: 'Tu Código de Acceso (PIN) - Galería de Fotos',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="color: #333; text-align: center;">¡Hola!</h2>
          <p style="color: #555; font-size: 16px; text-align: center;">
            Has solicitado acceso a tu galería de fotos. Utiliza el siguiente PIN de 4 dígitos para entrar:
          </p>
          <div style="background-color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px dashed #007bff;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">${pin}</span>
          </div>
          <p style="color: #777; font-size: 14px; text-align: center;">
            Este código expirará en 15 minutos. Si no solicitaste este código, puedes ignorar este correo.
          </p>
          <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 30px;">
            Atentamente, <br>
            El equipo de Fotografía
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[EmailService] Error de Resend:', error);
      return false;
    }

    console.log(`[EmailService] PIN enviado a ${to}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Excepción enviando correo:', error);
    return false;
  }
};

export const sendDeliveryNotification = async (clientEmail: string, galleryName: string, accessCode: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no está configurada. Simulando envío de correo:');
    console.warn(`De: sistema@tu-dominio.com -> Para: ${clientEmail}`);
    console.warn(`Galería ${galleryName} lista para descarga.`);
    return { success: true, simulated: true };
  }

  try {
    const galleryUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/gallery/${accessCode}`;
    await resend.emails.send({
      from: process.env.SMTP_FROM || 'EntregaFotos <onboarding@resend.dev>',
      to: clientEmail,
      subject: `¡Tus fotos editadas ya están listas! - ${galleryName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #282e70; text-align: center;">¡Tus fotos están listas! 🎉</h2>
          <p style="font-size: 16px; color: #444;">¡Buenas noticias! La edición de tus fotografías para la galería <strong>${galleryName}</strong> ha concluido.</p>
          <p style="font-size: 16px; color: #444;">Ya puedes entrar a tu galería para verlas y descargarlas en alta resolución y sin marca de agua.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${galleryUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ir a mi Galería</a>
          </div>
          <p style="font-size: 14px; color: #666;">Te recomendamos descargarlas desde una computadora para mayor comodidad y asegurar la mejor calidad.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Error al enviar notificación de entrega:', error);
    return { success: false, error };
  }
};
