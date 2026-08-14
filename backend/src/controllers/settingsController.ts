import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadFile, generateSecureDownloadUrl } from '../services/storage';

const prisma = new PrismaClient();

// Obtener la configuración actual (o crear la por defecto si no existe)
export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.landingSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.landingSettings.create({
        data: {}
      });
    }

    // Firmar URLs de las imágenes
    const signedSettings = { ...settings } as any;

    if (settings.about_image) {
      signedSettings.about_image_url = await generateSecureDownloadUrl(settings.about_image);
    }

    if (settings.logo_image) {
      signedSettings.logo_image_url = await generateSecureDownloadUrl(settings.logo_image);
    }

    if (settings.hero_images && settings.hero_images.length > 0) {
      signedSettings.hero_images_urls = await Promise.all(
        settings.hero_images.map(key => generateSecureDownloadUrl(key))
      );
    }

    if (settings.portfolio_images && settings.portfolio_images.length > 0) {
      signedSettings.portfolio_images_urls = await Promise.all(
        settings.portfolio_images.map(key => generateSecureDownloadUrl(key))
      );
    }

    res.json(signedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
};

// Actualizar la configuración
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let settings = await prisma.landingSettings.findFirst();

    if (!settings) {
      settings = await prisma.landingSettings.create({ data });
    } else {
      settings = await prisma.landingSettings.update({
        where: { id: settings.id },
        data: {
          ...data,
          updated_at: new Date()
        }
      });
    }

    res.json({ message: 'Configuración actualizada con éxito', settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
};

// Subir una imagen específica para la landing page (ej: hero, portafolio)
export const uploadLandingPhoto = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // Definir un prefijo de carpeta exclusivo para la landing
    const folder = 'landing_assets';
    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const key = `${folder}/${timestamp}_${safeName}`;

    await uploadFile(req.file.buffer, key, req.file.mimetype);

    // Para activos de la landing, que son públicos, el frontend puede requerir la URL directa
    // Asumiendo que el bucket es público, la URL sería algo como:
    // https://pub-[tu_cloudflare_id].r2.dev/landing_assets/...
    // Como no sabemos si el bucket es público en R2 o se requiere generar URL prefirmada constante,
    // Devolvemos el "key", el frontend tendrá que usar una ruta para obtenerla o
    // usar una URL base si está expuesto.
    // Lo ideal: Guardar el KEY y tener una ruta de "proxy" o generar URL prefirmada on the fly, 
    // pero para landing, usualmente el bucket es público. 
    // Vamos a enviar el endpoint raw por si acaso o que la app maneje esto.
    
    // NOTA: Para no romper nada, devolveremos el "key". 
    res.json({ key });

  } catch (error) {
    console.error('Error uploading landing photo:', error);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
};
