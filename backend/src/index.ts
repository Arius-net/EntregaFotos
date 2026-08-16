import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Importar controladores
import { createGallery, updateGallery, deleteGallery, getGallery, getGalleriesByPhotographer, getUnlockedPhotos, verifyAccess, getSelectedPhotos, toggleSelection, submitSelection, getAdminSelection } from './controllers/galleryController';
import { uploadPhotos } from './controllers/photoController';
import { downloadFreePhotos, getDeliveryUrls } from './controllers/downloadController';
import { createPreference, verifyPayment, openpayWebhook } from './controllers/paymentController';
import { login, register, requestClientPin, verifyClientPin } from './controllers/authController';
import { getSettings, updateSettings, uploadLandingPhoto } from './controllers/settingsController';
import { createStoreItem, getStoreItems, updateStoreItem, deleteStoreItem, createStoreOrder, getMyStoreOrders, getAllStoreOrders } from './controllers/storeController';
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
app.post('/api/auth/client/request-pin', requestClientPin);
app.post('/api/auth/client/verify-pin', verifyClientPin);

// Rutas de Galerías
app.post('/api/galleries', authenticateJWT, createGallery);
app.put('/api/galleries/:id', authenticateJWT, updateGallery);
app.delete('/api/galleries/:id', authenticateJWT, deleteGallery);
app.get('/api/galleries/:access_code', getGallery);
app.get('/api/galleries/:id/unlocked', authenticateJWT, getUnlockedPhotos);
app.get('/api/galleries/:id/selections', authenticateJWT, getSelectedPhotos);
app.get('/api/admin/galleries/:id/selections', authenticateJWT, getAdminSelection);
app.post('/api/galleries/select', authenticateJWT, toggleSelection);
app.post('/api/galleries/submit-selection', authenticateJWT, submitSelection);
app.get('/api/photographers/:id/galleries', authenticateJWT, getGalleriesByPhotographer);
app.post('/api/galleries/:access_code/access', authenticateJWT, verifyAccess);

// Rutas de Fotos (Requiere multipart/form-data)
app.post('/api/photos/upload', authenticateJWT, upload.array('photos', 500), uploadPhotos);

// Rutas del CMS de la Landing Page
app.get('/api/settings/landing', getSettings);
app.put('/api/settings/landing', authenticateJWT, updateSettings);
app.post('/api/settings/upload-landing-image', authenticateJWT, upload.single('photo'), uploadLandingPhoto);

// Rutas de la Tienda de Fotos (Store)
app.get('/api/store', getStoreItems);
app.post('/api/store', authenticateJWT, upload.single('photo'), createStoreItem);
app.put('/api/store/:id', authenticateJWT, updateStoreItem);
app.delete('/api/store/:id', authenticateJWT, deleteStoreItem);

// Rutas de Órdenes de Tienda
app.post('/api/store/orders', authenticateJWT, createStoreOrder);
app.get('/api/store/orders/me', authenticateJWT, getMyStoreOrders);
app.get('/api/admin/store/orders', authenticateJWT, getAllStoreOrders);

// Rutas de Descarga
app.post('/api/downloads/free', authenticateJWT, downloadFreePhotos);
app.get('/api/downloads/:gallery_id/all-urls', authenticateJWT, getDeliveryUrls);

// Rutas de Pagos (Mercado Pago)
app.post('/api/payments/create', authenticateJWT, createPreference);
app.post('/api/payments/verify', authenticateJWT, verifyPayment);
app.post('/api/webhooks/openpay', express.json(), openpayWebhook);

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});
