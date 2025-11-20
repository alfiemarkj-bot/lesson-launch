const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Bucket name for lesson files
const BUCKET_NAME = 'lessons';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Don't retry on certain errors (auth, validation, etc.)
      if (error.message?.includes('JWT') || 
          error.message?.includes('Unauthorized') ||
          error.message?.includes('not found') ||
          error.message?.includes('policy')) {
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const backoffDelay = delay * Math.pow(2, attempt);
        console.log(`Retrying storage operation (attempt ${attempt + 1}/${maxRetries}) after ${backoffDelay}ms...`);
        await sleep(backoffDelay);
      }
    }
  }
  throw lastError;
}

/**
 * Create an authenticated Supabase client
 */
function createAuthenticatedClient(token) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}

/**
 * Create an unauthenticated Supabase client (for health checks)
 */
function createUnauthenticatedClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

/**
 * Upload a file to Supabase Storage with retry logic
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Desired filename in storage
 * @param {string} contentType - MIME type of the file
 * @param {string} userId - ID of the user owning the file
 * @param {string} token - User's JWT token for authentication
 * @returns {Promise<string>} - The storage path (key) of the uploaded file
 */
async function uploadFileToStorage(filePath, fileName, contentType, userId, token) {
  return retryWithBackoff(async () => {
    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create authenticated client
    const supabase = createAuthenticatedClient(token);

    // Read file buffer
    const fileBuffer = await fs.readFile(filePath);

    // Storage path: user_id/filename
    const storagePath = `${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    return data.path;
  });
}

/**
 * Get a signed URL for downloading a file with retry logic
 * @param {string} storagePath - Path of the file in storage
 * @param {string} token - User's JWT token
 * @param {number} expiresIn - Expiration time in seconds (default 3600 / 1 hour)
 * @returns {Promise<string|null>} - Signed URL or null if failed
 */
async function getSignedDownloadUrl(storagePath, token, expiresIn = 3600) {
  try {
    return await retryWithBackoff(async () => {
      const supabase = createAuthenticatedClient(token);

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Delete a file from storage with retry logic
 * @param {string} storagePath - Path of the file in storage
 * @param {string} token - User's JWT token
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function deleteFileFromStorage(storagePath, token) {
  try {
    return await retryWithBackoff(async () => {
      const supabase = createAuthenticatedClient(token);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (error) {
        throw error;
      }
      
      return true;
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Check if storage bucket exists and is accessible
 * @returns {Promise<{healthy: boolean, bucketExists: boolean, error?: string}>}
 */
async function checkStorageHealth() {
  try {
    const supabase = createUnauthenticatedClient();
    
    // Try to list buckets to check connectivity
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return {
        healthy: false,
        bucketExists: false,
        error: `Cannot access storage: ${listError.message}`
      };
    }

    // Check if our bucket exists
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME) || false;

    if (!bucketExists) {
      return {
        healthy: false,
        bucketExists: false,
        error: `Bucket '${BUCKET_NAME}' not found. Available buckets: ${buckets?.map(b => b.name).join(', ') || 'none'}`
      };
    }

    return {
      healthy: true,
      bucketExists: true
    };
  } catch (error) {
    return {
      healthy: false,
      bucketExists: false,
      error: `Health check failed: ${error.message}`
    };
  }
}

/**
 * Validate bucket exists on startup (throws if not found)
 */
async function validateBucketExists() {
  const health = await checkStorageHealth();
  if (!health.healthy || !health.bucketExists) {
    throw new Error(`Storage bucket validation failed: ${health.error || 'Unknown error'}`);
  }
  console.log(`✓ Storage bucket '${BUCKET_NAME}' validated`);
}

module.exports = {
  uploadFileToStorage,
  getSignedDownloadUrl,
  deleteFileFromStorage,
  checkStorageHealth,
  validateBucketExists,
  BUCKET_NAME,
  createAuthenticatedClient,
  createUnauthenticatedClient
};

