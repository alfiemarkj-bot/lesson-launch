const { createClient } = require('@supabase/supabase-js');
const { BUCKET_NAME } = require('./storageService');

/**
 * Get storage usage statistics for the lessons bucket
 * Note: Supabase doesn't provide direct quota API, so we estimate by listing files
 * @param {string} token - Optional JWT token for authenticated requests
 * @returns {Promise<{totalFiles: number, estimatedSizeMB: number, error?: string}>}
 */
async function getStorageUsage(token = null) {
  try {
    const supabase = token 
      ? createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        )
      : createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );

    // List all files in the bucket (this is an estimate)
    // Note: Supabase Storage API doesn't provide direct size info for all files
    // We'd need to iterate through folders, which can be slow
    // For now, we'll return a basic check
    
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000, // Limit to prevent timeout
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      return {
        totalFiles: 0,
        estimatedSizeMB: 0,
        error: error.message
      };
    }

    // Estimate: average file size ~500KB for PPTX, ~200KB for DOCX
    // This is a rough estimate since we can't get exact sizes without listing all files
    const estimatedSizeMB = (files?.length || 0) * 0.5; // Conservative estimate

    return {
      totalFiles: files?.length || 0,
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
      note: 'Estimated size - Supabase doesn\'t provide direct quota API'
    };
  } catch (error) {
    return {
      totalFiles: 0,
      estimatedSizeMB: 0,
      error: error.message
    };
  }
}

/**
 * Check if storage is approaching quota limits
 * @param {number} quotaGB - Storage quota in GB (default: 1 for free tier)
 * @param {number} warningThreshold - Warning threshold as percentage (default: 80)
 * @returns {Promise<{isHealthy: boolean, usagePercent: number, warning?: string}>}
 */
async function checkStorageQuota(quotaGB = 1, warningThreshold = 80, token = null) {
  try {
    const usage = await getStorageUsage(token);
    
    if (usage.error) {
      return {
        isHealthy: false,
        usagePercent: 0,
        warning: `Cannot check quota: ${usage.error}`
      };
    }

    const quotaMB = quotaGB * 1024;
    const usagePercent = (usage.estimatedSizeMB / quotaMB) * 100;

    let warning = null;
    if (usagePercent >= 100) {
      warning = `Storage quota exceeded! (${usage.estimatedSizeMB.toFixed(2)} MB / ${quotaMB} MB)`;
    } else if (usagePercent >= warningThreshold) {
      warning = `Storage quota warning: ${usagePercent.toFixed(1)}% used (${usage.estimatedSizeMB.toFixed(2)} MB / ${quotaMB} MB)`;
    }

    return {
      isHealthy: usagePercent < 100,
      usagePercent: Math.round(usagePercent * 10) / 10,
      estimatedSizeMB: usage.estimatedSizeMB,
      quotaMB: quotaMB,
      totalFiles: usage.totalFiles,
      warning: warning || undefined
    };
  } catch (error) {
    return {
      isHealthy: false,
      usagePercent: 0,
      warning: `Quota check failed: ${error.message}`
    };
  }
}

/**
 * Get files older than specified days for cleanup
 * @param {number} daysOld - Files older than this many days
 * @param {string} token - JWT token
 * @returns {Promise<Array<{path: string, created_at: string}>>}
 */
async function getOldFiles(daysOld = 90, token) {
  try {
    const supabase = createClient(
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

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    // List all files and filter by date
    // Note: This is a simplified approach - in production you'd want to
    // track file creation dates in your database
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' }
      });

    if (error) {
      throw error;
    }

    // Filter files older than cutoff
    // Note: Supabase Storage API doesn't always provide created_at
    // You may need to track this in your database
    const oldFiles = files?.filter(file => {
      if (!file.created_at) return false;
      return new Date(file.created_at) < cutoffDate;
    }) || [];

    return oldFiles.map(file => ({
      path: file.name,
      created_at: file.created_at
    }));
  } catch (error) {
    console.error('Error getting old files:', error);
    return [];
  }
}

module.exports = {
  getStorageUsage,
  checkStorageQuota,
  getOldFiles
};

