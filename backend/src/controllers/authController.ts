import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';
import { sendPinEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, name } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (role === 'photographer') {
      // El registro de fotógrafos está deshabilitado públicamente
      // Solo el fotógrafo pre-creado (Admin) puede iniciar sesión.
      return res.status(403).json({ error: 'El registro de fotógrafos está deshabilitado.' });
    } else if (role === 'client') {
      const existingClient = await prisma.client.findUnique({ where: { email } });
      if (existingClient && existingClient.password_hash) {
        return res.status(400).json({ error: 'El cliente ya tiene una cuenta registrada.' });
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const client = await prisma.client.upsert({
        where: { email },
        update: { password_hash, name: name || null },
        create: { email, password_hash, name: name || null },
      });

      const token = jwt.sign({ id: client.id, role: 'client' }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, user: { id: client.id, email: client.email, role } });
    }
    
    return res.status(400).json({ error: 'Rol inválido' });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    if (role === 'photographer') {
      const user = await prisma.photographer.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      // Support plaintext for the seeded admin user
      const isValid = (password === user.password_hash) || await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

      const token = jwt.sign({ id: user.id, role: 'photographer' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email: user.email, role } });
    } else if (role === 'client') {
      const user = await prisma.client.findUnique({ where: { email } });
      if (!user || !user.password_hash) return res.status(404).json({ error: 'Cliente no encontrado o sin contraseña' });

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

      const token = jwt.sign({ id: user.id, role: 'client' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email: user.email, role } });
    }

    return res.status(400).json({ error: 'Rol inválido' });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Genera un PIN aleatorio de 4 dígitos
const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

export const requestClientPin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El correo es requerido' });

    let client = await prisma.client.findUnique({ where: { email } });
    if (!client) {
      client = await prisma.client.create({ data: { email } });
    }

    const pin = generatePin();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Expira en 15 minutos

    await prisma.client.update({
      where: { email },
      data: { otp_code: pin, otp_expires_at: expiresAt }
    });

    // Enviar correo de verdad si está configurado Resend, sino simular
    if (process.env.RESEND_API_KEY) {
      const sent = await sendPinEmail(email, pin);
      if (!sent) {
        console.error('No se pudo enviar el correo a', email);
      }
    } else {
      console.log(`\n========================================`);
      console.log(`🔐 PIN PARA CLIENTE: ${pin}`);
      console.log(`✉️ ENVIADO A: ${email}`);
      console.log(`⚠️ (SMTP NO CONFIGURADO - MODO DESARROLLO)`);
      console.log(`========================================\n`);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    res.status(200).json({ message: 'PIN enviado al correo' });
  } catch (error) {
    console.error('Error requesting pin:', error);
    res.status(500).json({ error: 'Error al solicitar PIN' });
  }
};

export const verifyClientPin = async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: 'Correo y PIN requeridos' });

    const client = await prisma.client.findUnique({ where: { email } });
    
    if (!client || !client.otp_code || client.otp_code !== pin) {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }

    if (client.otp_expires_at && new Date() > client.otp_expires_at) {
      return res.status(401).json({ error: 'El PIN ha expirado, solicita uno nuevo' });
    }

    // PIN válido, limpiar OTP y generar JWT
    await prisma.client.update({
      where: { email },
      data: { otp_code: null, otp_expires_at: null }
    });

    const token = jwt.sign(
      { id: client.id, email: client.email, role: 'client' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: 'Autenticación exitosa',
      token,
      client: { id: client.id, email: client.email }
    });
  } catch (error) {
    console.error('Error verifying pin:', error);
    res.status(500).json({ error: 'Error al verificar PIN' });
  }
};
