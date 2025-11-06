import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize R2 client (R2 is S3-compatible)
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 configuration is missing. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.')
  }

  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Add retry configuration for SSL errors and network issues
    maxAttempts: 3,
  })
}

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || ''
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '' // e.g., https://pub-xxxxx.r2.dev

/**
 * Upload a file to R2 with retry logic for SSL errors and network issues
 */
export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<string> {
  if (!R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set')
  }

  const r2Client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  })

  try {
    await r2Client.send(command)

    // Return the public URL
    if (R2_PUBLIC_DOMAIN) {
      return `${R2_PUBLIC_DOMAIN}/${key}`
    }

    // Fallback: generate a signed URL (if public domain not configured)
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
    return await getSignedUrl(r2Client, getCommand, { expiresIn: 31536000 }) // 1 year
  } catch (error: any) {
    // Check if this is a retryable error (SSL errors, network issues)
    const isRetryableError = 
      error?.code === 'ERR_SSL_SSL/TLS_ALERT_BAD_RECORD_MAC' ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND' ||
      error?.code === 'NetworkError' ||
      error?.name === 'NetworkError' ||
      (error?.message && (
        error.message.includes('SSL') ||
        error.message.includes('TLS') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network')
      ))

    if (isRetryableError && retryCount < maxRetries) {
      // Exponential backoff: wait 1s, 2s, 4s before retrying
      const delay = Math.pow(2, retryCount) * 1000
      console.warn(`R2 upload failed (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error?.code || error?.message)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Retry with a new client instance (in case of connection issues)
      return uploadToR2(file, key, contentType, retryCount + 1, maxRetries)
    }

    // If not retryable or max retries reached, throw the error
    console.error('Error uploading to R2:', error)
    throw error
  }
}

/**
 * Generate a unique file key for R2
 */
export function generateFileKey(userId: string, filename: string, folder: 'audio' | 'artwork' = 'audio'): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${folder}/${userId}/${timestamp}-${sanitizedFilename}`
}

/**
 * Get public URL for an R2 object
 */
export function getR2PublicUrl(key: string): string {
  if (key.startsWith('http')) {
    return key // Already a full URL
  }

  if (R2_PUBLIC_DOMAIN) {
    return `${R2_PUBLIC_DOMAIN}/${key}`
  }

  // If key doesn't start with folder, assume it's a legacy local path
  // Return as-is for backward compatibility during migration
  return key
}

