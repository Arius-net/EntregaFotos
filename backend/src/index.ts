import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Importar controladores
import { createGallery, getGallery, getGalleriesByPhotographer, getUnlockedPhotos, verifyAccess } from './controllers/galleryController';
import { uploadPhotos } from './controllers/photoController';
import { downloadFreePhotos } from './controllers/downloadController';
import { createPreference, verifyPayment, mpWebhook } from './controllers/paymentController';

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

// Rutas de Galerías
app.post('/api/galleries', createGallery);
app.get('/api/galleries/:access_code', getGallery);
app.get('/api/galleries/:id/unlocked', getUnlockedPhotos);
app.get('/api/photographers/:id/galleries', getGalleriesByPhotographer);
app.post('/api/galleries/:access_code/access', verifyAccess);

// Rutas de Fotos (Requiere multipart/form-data)
app.post('/api/photos/upload', upload.array('photos', 50), uploadPhotos);

// Rutas de Descarga
app.post('/api/downloads/free', downloadFreePhotos);

// Rutas de Pagos (Mercado Pago)
app.post('/api/payments/create', createPreference);
app.post('/api/payments/verify', verifyPayment);
app.post('/api/webhooks/mercadopago', mpWebhook);

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});
