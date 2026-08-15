import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://390c88470b29c5211794d102328d536f.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = 'fotospapa';

export const uploadFile = async (buffer: Buffer, key: string, mimeType: string) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return key;
};

export const generateSecureDownloadUrl = async (key: string, forceDownload: boolean = false): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: forceDownload ? `attachment; filename="foto_${Date.now()}.jpg"` : undefined,
  });

  // URL firmada que expira en 15 minutos (900 segundos)
  return await getSignedUrl(s3Client, command, { expiresIn: 900 });
};

export const getFileStream = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const response = await s3Client.send(command);
  return response.Body as NodeJS.ReadableStream;
};

// Utilidad extra para el cron job y borrado de galerías
import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

export const deleteFile = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
};

export const deleteFilesBatch = async (keys: string[]) => {
  if (keys.length === 0) return;
  const command = new DeleteObjectsCommand({
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: true
    }
  });
  await s3Client.send(command);
};
