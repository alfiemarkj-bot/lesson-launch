const { createClient } = require('@supabase/supabase-js');
const { deleteFileFromStorage, BUCKET_NAME } = require('./storageService');

/**
 * Clean up old files from storage based on database records
 * This uses the database to find lessons that are soft-deleted or old
 * @param {number} daysOld - Delete files older than this many days (default: 90)
 * @param {boolean} onlyDeleted - Only clean up files for soft-deleted lessons (default: true)
 * @returns {Promise<{deleted: number, errors: number, details: Array}>}
 */
async function cleanupOldFiles(daysOld = 90, onlyDeleted = true) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Build query to find old lessons
    let query = supabase
      .from('lessons')
      .select('id, user_id, pptx_url, docx_url, created_at, deleted_at');

    if (onlyDeleted) {
      // Only get soft-deleted lessons
      query = query.not('deleted_at', 'is', null);
    } else {
      // Get all old lessons (deleted or not)
      query = query.or(`deleted_at.not.is.null,created_at.lt.${cutoffDate.toISOString()}`);
    }

    const { data: lessons, error } = await query;

    if (error) {
      throw error;
    }

    if (!lessons || lessons.length === 0) {
      return {
        deleted: 0,
        errors: 0,
        details: [],
        message: 'No old files to clean up'
      };
    }

    const results = {
      deleted: 0,
      errors: 0,
      details: []
    };

    // Process each lesson
    for (const lesson of lessons) {
      // Get user token for authenticated deletion
      // Note: In production, you might want to use a service role key for cleanup
      // For now, we'll try to delete without auth (may fail if RLS is strict)
      
      const filesToDelete = [];
      if (lesson.pptx_url && lesson.pptx_url.includes('/')) {
        filesToDelete.push({ path: lesson.pptx_url, type: 'pptx' });
      }
      if (lesson.docx_url && lesson.docx_url.includes('/')) {
        filesToDelete.push({ path: lesson.docx_url, type: 'docx' });
      }

      for (const file of filesToDelete) {
        try {
          // Note: deleteFileFromStorage requires a token
          // For automated cleanup, you might need to use service role key
          // For now, we'll mark it for manual cleanup or use a service account
          // This is a placeholder - actual implementation depends on your auth setup
          
          // Option 1: Use service role key (if available)
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (serviceRoleKey) {
            const serviceSupabase = createClient(
              process.env.SUPABASE_URL,
              serviceRoleKey
            );
            
            const { error: deleteError } = await serviceSupabase.storage
              .from(BUCKET_NAME)
              .remove([file.path]);
            
            if (deleteError) {
              throw deleteError;
            }
            
            results.deleted++;
            results.details.push({
              lessonId: lesson.id,
              file: file.path,
              type: file.type,
              status: 'deleted'
            });
          } else {
            // Option 2: Mark for manual cleanup
            results.details.push({
              lessonId: lesson.id,
              file: file.path,
              type: file.type,
              status: 'pending',
              note: 'Service role key not configured - manual cleanup required'
            });
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            lessonId: lesson.id,
            file: file.path,
            type: file.type,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Cleanup error:', error);
    return {
      deleted: 0,
      errors: 1,
      details: [],
      error: error.message
    };
  }
}

/**
 * Clean up files for a specific user (authenticated)
 * @param {string} userId - User ID
 * @param {string} token - User's JWT token
 * @param {number} daysOld - Delete files older than this many days
 * @returns {Promise<{deleted: number, errors: number}>}
 */
async function cleanupUserFiles(userId, token, daysOld = 90) {
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

    // Get user's old or deleted lessons
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('id, pptx_url, docx_url, created_at, deleted_at')
      .eq('user_id', userId)
      .or(`deleted_at.not.is.null,created_at.lt.${cutoffDate.toISOString()}`);

    if (error) {
      throw error;
    }

    let deleted = 0;
    let errors = 0;

    for (const lesson of lessons) {
      const filesToDelete = [];
      if (lesson.pptx_url && lesson.pptx_url.includes('/')) {
        filesToDelete.push(lesson.pptx_url);
      }
      if (lesson.docx_url && lesson.docx_url.includes('/')) {
        filesToDelete.push(lesson.docx_url);
      }

      for (const filePath of filesToDelete) {
        try {
          const success = await deleteFileFromStorage(filePath, token);
          if (success) {
            deleted++;
          } else {
            errors++;
          }
        } catch (error) {
          errors++;
          console.error(`Error deleting ${filePath}:`, error);
        }
      }
    }

    return { deleted, errors };
  } catch (error) {
    console.error('User cleanup error:', error);
    throw error;
  }
}

module.exports = {
  cleanupOldFiles,
  cleanupUserFiles
};

