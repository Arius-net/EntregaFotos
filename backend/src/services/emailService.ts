import { Resend } from 'resend';

// Usa la variable de entorno obligatoriamente por seguridad
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPinEmail = async (to: string, pin: string) => {
  try {
    const { data, error } = await resend.emails.send({
      // Resend requiere que uses su correo de onboarding si no has verificado tu dominio
      from: 'Acme <onboarding@resend.dev>',
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
