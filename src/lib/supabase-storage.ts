import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 Client for Supabase Storage.
// This is much more secure than using the Service Role Key as it can be scoped specifically for storage.
const s3Client = new S3Client({
  forcePathStyle: true,
  region: process.env.S3_REGION || "ap-south-1",
  endpoint: process.env.S3_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME || 'pos_backups';

export async function uploadBackupToStorage(filename: string, content: string | Buffer): Promise<boolean> {
  const binaryContent = typeof content === 'string' ? Buffer.from(content) : content;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: binaryContent,
    ContentType: 'application/octet-stream',
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    console.error(`[S3 Storage] Upload failed for ${filename}:`, error.message);
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}

export async function downloadBackupFromStorage(filename: string): Promise<Blob> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });

  try {
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error("Empty response body from storage");
    }
    
    // S3 Body can be a stream, we convert it to a Blob for the application
    const bytes = await response.Body.transformToByteArray();
    return new Blob([bytes] as any[]);
  } catch (error: any) {
    console.error(`[S3 Storage] Download failed for ${filename}:`, error.message);
    throw new Error(`Storage download failed: ${error.message}`);
  }
}

export async function deleteBackupFromStorage(filename: string): Promise<boolean> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    console.error(`[S3 Storage] Delete failed for ${filename}:`, error.message);
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
