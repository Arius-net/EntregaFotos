import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    if (role === 'photographer') {
      const exists = await prisma.photographer.findUnique({ where: { email } });
      if (exists) return res.status(400).json({ error: 'El fotógrafo ya existe' });

      const user = await prisma.photographer.create({ data: { email, password_hash } });
      return res.status(201).json({ message: 'Fotógrafo registrado', id: user.id });
    } else if (role === 'client') {
      let client = await prisma.client.findUnique({ where: { email } });
      if (client) {
        if (client.password_hash) return res.status(400).json({ error: 'El cliente ya tiene cuenta' });
        client = await prisma.client.update({ where: { id: client.id }, data: { password_hash } });
      } else {
        client = await prisma.client.create({ data: { email, password_hash } });
      }
      return res.status(201).json({ message: 'Cliente registrado', id: client.id });
    }
    
    return res.status(400).json({ error: 'Rol inválido' });
  } catch (error) {
    console.error('Error en register:', error);
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
