const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const { getSignedDownloadUrl } = require('../services/storageService');

/**
 * Helper function to create a user-authenticated Supabase client
 * This is required for RLS to work properly
 */
function getUserSupabase(token) {
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
 * GET /api/dashboard/lessons
 * Get all lessons for the authenticated user
 */
router.get('/lessons', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    
    // Fetch user's lessons from database
    const { data: lessons, error } = await userSupabase
      .from('lessons')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null) // Only non-deleted lessons
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching lessons:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch lessons',
        message: error.message 
      });
    }
    
    res.json({
      success: true,
      lessons: lessons || [],
      count: lessons?.length || 0
    });
    
  } catch (error) {
    console.error('Dashboard lessons error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch lessons',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/stats
 * Get usage statistics for the authenticated user
 */
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const userTier = req.user.subscription_tier || 'free';
    
    // Define limits per tier
    const TIER_LIMITS = {
      free: 5,
      teacher: 50,
      school: -1 // unlimited
    };
    
    const limit = TIER_LIMITS[userTier];
    
    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: lessonsThisMonth, error: monthError } = await userSupabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());
    
    if (monthError) {
      console.error('Error fetching monthly usage:', monthError);
    }
    
    // Get all-time stats
    const { count: totalLessons, error: totalError } = await userSupabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);
    
    if (totalError) {
      console.error('Error fetching total lessons:', totalError);
    }
    
    // Get subject breakdown
    const { data: subjectData, error: subjectError } = await userSupabase
      .from('lessons')
      .select('subject')
      .eq('user_id', userId)
      .is('deleted_at', null);
    
    const subjectBreakdown = {};
    if (subjectData) {
      subjectData.forEach(lesson => {
        const subject = lesson.subject || 'Unknown';
        subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + 1;
      });
    }
    
    // Calculate days until reset
    const now = new Date();
    const nextMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth - now) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      stats: {
        // User info
        email: req.user.email,
        name: req.user.name,
        subscription_tier: userTier,
        
        // Usage
        lessons_this_month: lessonsThisMonth || 0,
        monthly_limit: limit,
        is_unlimited: limit === -1,
        remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - (lessonsThisMonth || 0)),
        days_until_reset: daysUntilReset,
        
        // All-time stats
        total_lessons: totalLessons || 0,
        member_since: req.user.created_at,
        last_login: req.user.last_login,
        
        // Breakdown
        subject_breakdown: subjectBreakdown
      }
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/dashboard/lessons/:id
 * Soft delete a lesson (mark as deleted, don't actually remove)
 */
router.delete('/lessons/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const lessonId = req.params.id;
    
    // Verify lesson belongs to user
    const { data: lesson, error: fetchError } = await userSupabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !lesson) {
      return res.status(404).json({ 
        error: 'Lesson not found or access denied' 
      });
    }
    
    // Soft delete (set deleted_at timestamp)
    const { error: deleteError } = await userSupabase
      .from('lessons')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', lessonId)
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error deleting lesson:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete lesson',
        message: deleteError.message 
      });
    }
    
    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ 
      error: 'Failed to delete lesson',
      message: error.message 
    });
  }
});

/**
 * PATCH /api/dashboard/lessons/:id/favorite
 * Toggle favorite status for a lesson
 */
router.patch('/lessons/:id/favorite', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const lessonId = req.params.id;
    const userSupabase = getUserSupabase(req.userToken);
    
    // Get current favorite status
    const { data: lesson, error: fetchError } = await userSupabase
      .from('lessons')
      .select('is_favorite')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !lesson) {
      return res.status(404).json({ 
        error: 'Lesson not found or access denied' 
      });
    }
    
    // Toggle favorite
    const newFavoriteStatus = !lesson.is_favorite;
    
    const { error: updateError } = await userSupabase
      .from('lessons')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', lessonId)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating favorite:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update favorite',
        message: updateError.message 
      });
    }
    
    res.json({
      success: true,
      is_favorite: newFavoriteStatus
    });
    
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle favorite',
      message: error.message 
    });
  }
});

/**
 * POST /api/dashboard/lessons/:id/duplicate
 * Duplicate a lesson
 */
router.post('/lessons/:id/duplicate', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const lessonId = req.params.id;
    
    // Fetch original lesson
    const { data: originalLesson, error: fetchError } = await userSupabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !originalLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Create duplicate
    const duplicate = {
      ...originalLesson,
      id: undefined, // Let DB generate new ID
      title: `${originalLesson.title} (Copy)`,
      topic: `${originalLesson.topic} (Copy)`,
      created_at: undefined,
      updated_at: undefined,
      download_count: 0
    };
    
    const { data: newLesson, error: createError } = await userSupabase
      .from('lessons')
      .insert([duplicate])
      .select()
      .single();
    
    if (createError) {
      console.error('Error duplicating lesson:', createError);
      return res.status(500).json({ error: 'Failed to duplicate lesson' });
    }
    
    res.json({
      success: true,
      lesson: newLesson
    });
    
  } catch (error) {
    console.error('Duplicate lesson error:', error);
    res.status(500).json({ error: 'Failed to duplicate lesson' });
  }
});

/**
 * GET /api/dashboard/lessons/:id/download
 * Get download URLs for a lesson (re-download feature)
 */
router.get('/lessons/:id/download', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const lessonId = req.params.id;
    
    // Fetch lesson
    const { data: lesson, error } = await userSupabase
      .from('lessons')
      .select('pptx_url, docx_url, title')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    if (error || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    let pptxUrl = lesson.pptx_url;
    let docxUrl = lesson.docx_url;
    
    // If URL looks like a storage path (has slashes), generate signed URL
    if (pptxUrl && pptxUrl.includes('/')) {
      const signedUrl = await getSignedDownloadUrl(pptxUrl, req.userToken);
      if (signedUrl) pptxUrl = signedUrl;
    }
    
    if (docxUrl && docxUrl.includes('/')) {
      const signedUrl = await getSignedDownloadUrl(docxUrl, req.userToken);
      if (signedUrl) docxUrl = signedUrl;
    }
    
    res.json({
      success: true,
      pptx_url: pptxUrl,
      docx_url: docxUrl,
      title: lesson.title
    });
    
  } catch (error) {
    console.error('Download lesson error:', error);
    res.status(500).json({ error: 'Failed to get download links' });
  }
});

/**
 * GET /api/dashboard/folders
 * Get all folders for the authenticated user
 */
router.get('/folders', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    
    const { data: folders, error } = await userSupabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching folders:', error);
      return res.status(500).json({ error: 'Failed to fetch folders' });
    }
    
    res.json({
      success: true,
      folders: folders || []
    });
    
  } catch (error) {
    console.error('Folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

/**
 * POST /api/dashboard/folders
 * Create a new folder
 */
router.post('/folders', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const { name, color, icon, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    const { data: folder, error } = await userSupabase
      .from('folders')
      .insert([{
        user_id: userId,
        name,
        color: color || '#4c6ef5',
        icon: icon || '📁',
        description
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating folder:', error);
      return res.status(500).json({ error: 'Failed to create folder' });
    }
    
    res.json({
      success: true,
      folder
    });
    
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * PATCH /api/dashboard/folders/:id
 * Update a folder
 */
router.patch('/folders/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const folderId = req.params.id;
    const { name, color, icon, description } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;
    
    const { data: folder, error } = await userSupabase
      .from('folders')
      .update(updates)
      .eq('id', folderId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating folder:', error);
      return res.status(500).json({ error: 'Failed to update folder' });
    }
    
    res.json({
      success: true,
      folder
    });
    
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

/**
 * DELETE /api/dashboard/folders/:id
 * Delete a folder
 */
router.delete('/folders/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const folderId = req.params.id;
    
    const { error } = await userSupabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting folder:', error);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }
    
    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

/**
 * POST /api/dashboard/lessons/:lessonId/folders/:folderId
 * Add lesson to folder
 */
router.post('/lessons/:lessonId/folders/:folderId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const { lessonId, folderId } = req.params;
    
    // Verify ownership
    const { data: lesson } = await userSupabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    const { data: folder } = await userSupabase
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', userId)
      .single();
    
    if (!lesson || !folder) {
      return res.status(404).json({ error: 'Lesson or folder not found' });
    }
    
    // Add to folder
    const { error } = await userSupabase
      .from('lesson_folders')
      .insert([{ lesson_id: lessonId, folder_id: folderId }]);
    
    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('Error adding lesson to folder:', error);
      return res.status(500).json({ error: 'Failed to add lesson to folder' });
    }
    
    res.json({
      success: true,
      message: 'Lesson added to folder'
    });
    
  } catch (error) {
    console.error('Add to folder error:', error);
    res.status(500).json({ error: 'Failed to add lesson to folder' });
  }
});

/**
 * DELETE /api/dashboard/lessons/:lessonId/folders/:folderId
 * Remove lesson from folder
 */
router.delete('/lessons/:lessonId/folders/:folderId', authenticateUser, async (req, res) => {
  try {
    const { lessonId, folderId } = req.params;
    const userSupabase = getUserSupabase(req.userToken);
    
    const { error } = await userSupabase
      .from('lesson_folders')
      .delete()
      .eq('lesson_id', lessonId)
      .eq('folder_id', folderId);
    
    if (error) {
      console.error('Error removing lesson from folder:', error);
      return res.status(500).json({ error: 'Failed to remove lesson from folder' });
    }
    
    res.json({
      success: true,
      message: 'Lesson removed from folder'
    });
    
  } catch (error) {
    console.error('Remove from folder error:', error);
    res.status(500).json({ error: 'Failed to remove lesson from folder' });
  }
});

/**
 * POST /api/dashboard/lessons/:id/share
 * Create a share link for a lesson
 */
router.post('/lessons/:id/share', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const lessonId = req.params.id;
    const { password, maxViews, expiresInDays, allowDownload, allowCopy } = req.body;
    
    // Verify lesson ownership
    const { data: lesson } = await userSupabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Generate unique share token
    const shareToken = require('crypto').randomBytes(16).toString('hex');
    
    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    
    // Create share link
    const { data: shareLink, error } = await userSupabase
      .from('shared_lessons')
      .insert([{
        lesson_id: lessonId,
        shared_by_user_id: userId,
        share_token: shareToken,
        password: password || null,
        max_views: maxViews || null,
        expires_at: expiresAt,
        allow_download: allowDownload !== false,
        allow_copy: allowCopy === true,
        is_public: !password // Public if no password
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating share link:', error);
      return res.status(500).json({ error: 'Failed to create share link' });
    }
    
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${shareToken}`;
    
    res.json({
      success: true,
      share_link: shareLink,
      share_url: shareUrl
    });
    
  } catch (error) {
    console.error('Share lesson error:', error);
    res.status(500).json({ error: 'Failed to share lesson' });
  }
});

/**
 * GET /api/dashboard/lessons/:id/shares
 * Get all share links for a lesson
 */
router.get('/lessons/:id/shares', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const lessonId = req.params.id;
    
    const { data: shares, error } = await userSupabase
      .from('shared_lessons')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('shared_by_user_id', userId);
    
    if (error) {
      console.error('Error fetching shares:', error);
      return res.status(500).json({ error: 'Failed to fetch share links' });
    }
    
    // Add full URLs
    const sharesWithUrls = shares.map(share => ({
      ...share,
      share_url: `${req.protocol}://${req.get('host')}/shared/${share.share_token}`
    }));
    
    res.json({
      success: true,
      shares: sharesWithUrls
    });
    
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ error: 'Failed to get share links' });
  }
});

/**
 * DELETE /api/dashboard/shares/:shareId
 * Delete a share link
 */
router.delete('/shares/:shareId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSupabase = getUserSupabase(req.userToken);
    const shareId = req.params.shareId;
    
    const { error } = await userSupabase
      .from('shared_lessons')
      .delete()
      .eq('id', shareId)
      .eq('shared_by_user_id', userId);
    
    if (error) {
      console.error('Error deleting share link:', error);
      return res.status(500).json({ error: 'Failed to delete share link' });
    }
    
    res.json({
      success: true,
      message: 'Share link deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete share error:', error);
    res.status(500).json({ error: 'Failed to delete share link' });
  }
});

module.exports = router;

