import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

// Esta función se puede llamar desde cualquier parte del backend
export const sendSelectionNotification = async (
  clientEmail: string, 
  galleryName: string, 
  photographerEmail: string,
  selectedCount: number
) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY no está configurada. Simulando envío de correo:');
    console.warn(`De: sistema@tu-dominio.com -> Para: ${photographerEmail} y ${clientEmail}`);
    return { success: true, simulated: true };
  }

  try {
    // 1. Correo al fotógrafo
    await resend.emails.send({
      from: 'EntregaFotos <onboarding@resend.dev>', // Cambia a tu dominio cuando lo verifiques
      to: photographerEmail,
      subject: `¡Selección completada! - ${galleryName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #282e70;">¡El cliente ha enviado su selección!</h2>
          <p>El cliente <strong>${clientEmail}</strong> ha finalizado su selección de fotos para la galería <strong>${galleryName}</strong>.</p>
          <p>Fotos seleccionadas: <strong>${selectedCount}</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; my: 20px;" />
          <p style="font-size: 14px; color: #666;">Puedes revisar las fotos seleccionadas desde tu Panel de Administrador.</p>
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
          <hr style="border: none; border-top: 1px solid #eee; my: 20px;" />
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
