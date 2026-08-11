import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Importar controladores
import { createGallery, updateGallery, deleteGallery, getGallery, getGalleriesByPhotographer, getUnlockedPhotos, verifyAccess } from './controllers/galleryController';
import { uploadPhotos } from './controllers/photoController';
import { downloadFreePhotos } from './controllers/downloadController';
import { createPreference, verifyPayment, mpWebhook } from './controllers/paymentController';
import { login, register } from './controllers/authController';
import { authenticateJWT } from './middlewares/authMiddleware';

// Inicializar tarea cron
import './cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Configuración de Multer (Almacenamiento en memoria para AWS S3/R2)
// Límite de 50MB
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Rutas de Auth
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Rutas de Galerías
app.post('/api/galleries', authenticateJWT, createGallery);
app.put('/api/galleries/:id', authenticateJWT, updateGallery);
app.delete('/api/galleries/:id', authenticateJWT, deleteGallery);
app.get('/api/galleries/:access_code', getGallery);
app.get('/api/galleries/:id/unlocked', getUnlockedPhotos);
app.get('/api/photographers/:id/galleries', authenticateJWT, getGalleriesByPhotographer);
app.post('/api/galleries/:access_code/access', verifyAccess);

// Rutas de Fotos (Requiere multipart/form-data)
app.post('/api/photos/upload', authenticateJWT, upload.array('photos', 50), uploadPhotos);

// Rutas de Descarga
app.post('/api/downloads/free', downloadFreePhotos);

// Rutas de Pagos (Mercado Pago)
app.post('/api/payments/create', createPreference);
app.post('/api/payments/verify', verifyPayment);
app.post('/api/webhooks/mercadopago', mpWebhook);

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});
