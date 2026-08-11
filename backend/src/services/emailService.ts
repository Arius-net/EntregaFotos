import nodemailer from 'nodemailer';

// Configuración del transporter usando variables de entorno
// Se usa SMTP genérico para que funcione con cualquier proveedor (Gmail, Resend, SendGrid, Hostinger, etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros puertos (587, 25)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 5000, // No colgarse más de 5 segundos
  family: 4, // Forzar uso de IPv4 para evitar el error ENETUNREACH en Railway
} as any);

export const sendPinEmail = async (to: string, pin: string) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Galería de Fotos" <${process.env.SMTP_USER}>`,
      to,
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
    console.log(`[EmailService] PIN enviado a ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Error enviando correo:', error);
    return false;
  }
};
