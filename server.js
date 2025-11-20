require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;
const { readFileContent, isSupportedDocumentType } = require('./utils/fileReader');
const { processNotesAndGenerateSlides } = require('./services/aiService');
const { generatePowerPoint } = require('./services/powerpointService');
const { generateResourceSheet } = require('./services/resourceSheetService');
const { summarizeFiles, summarizeContent } = require('./services/summarizationService');
const { getPexelsImagesForLesson } = require('./services/pexelsImageService');
const { uploadFileToStorage, getSignedDownloadUrl, checkStorageHealth, validateBucketExists } = require('./services/storageService');
const { checkStorageQuota, getStorageUsage } = require('./services/storageMonitoringService');
const { cleanupOldFiles, cleanupUserFiles } = require('./services/storageCleanupService');
const { authenticateUser, checkUsageLimit } = require('./middleware/auth');
const { supabase } = require('./config/supabase');
const { createClient } = require('@supabase/supabase-js');
const dashboardRoutes = require('./routes/dashboard');
const slidesRoutes = require('./routes/slides');
const unitRoutes = require('./routes/units');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables on startup
function validateEnv() {
  const required = ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and SUPABASE_SETUP.md\n');
    process.exit(1);
  }
}

validateEnv();

// Validate storage bucket on startup
async function initializeStorage() {
  try {
    await validateBucketExists();
  } catch (error) {
    console.error('\n❌ Storage initialization failed:');
    console.error(`   ${error.message}`);
    console.error('\nPlease check SUPABASE-STORAGE-SETUP.md and ensure:');
    console.error('   1. The "lessons" bucket exists in Supabase Storage');
    console.error('   2. Storage policies are configured correctly');
    console.error('   3. SUPABASE_URL and SUPABASE_ANON_KEY are correct\n');
    // Don't exit - allow server to start but storage operations will fail
    // This allows the app to run in development even if storage isn't set up
  }
}

// Initialize storage (non-blocking)
initializeStorage().catch(console.error);

function sanitizeFilename(name) {
  if (!name) return 'lesson';
  // Replace invalid characters with empty string, keep spaces, alphanumeric, hyphens, underscores, parentheses
  return name.replace(/[^a-zA-Z0-9 \-_()]/g, '').trim();
}

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.static('.')); // Serve static files (HTML, CSS)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Helper to map URL to local path
function mapUrlToLocalPath(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/')) {
    return path.join(__dirname, url);
  }
  return url; // Return as is (e.g. remote URL)
}

// Temporary store for file paths (keyed by timestamp)
// ... (keep existing tempFileStore code)
const tempFileStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [timestamp, fileData] of tempFileStore.entries()) {
    if (now - timestamp > 5 * 60 * 1000) { // 5 minutes
      tempFileStore.delete(timestamp);
      if (fileData.pptxPath) fs.unlink(fileData.pptxPath).catch(console.error);
      if (fileData.docxPath) fs.unlink(fileData.docxPath).catch(console.error);
    }
  }
}, 60000); // Clean up every minute

// Scheduled storage cleanup job (runs daily)
// Clean up files for soft-deleted lessons older than 90 days
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_DAYS_OLD = parseInt(process.env.STORAGE_CLEANUP_DAYS_OLD) || 90;

async function runScheduledCleanup() {
  try {
    console.log('🧹 Running scheduled storage cleanup...');
    const result = await cleanupOldFiles(CLEANUP_DAYS_OLD, true); // Only deleted lessons
    console.log(`✓ Cleanup complete: ${result.deleted} files deleted, ${result.errors} errors`);
    if (result.warning) {
      console.warn(`⚠️ ${result.warning}`);
    }
  } catch (error) {
    console.error('❌ Scheduled cleanup failed:', error);
  }
}

// Schedule periodic cleanup (if enabled)
if (process.env.ENABLE_STORAGE_CLEANUP !== 'false') {
  // Run cleanup 1 hour after startup, then every 24 hours
  setTimeout(() => {
    runScheduledCleanup().catch(console.error);
    setInterval(runScheduledCleanup, CLEANUP_INTERVAL);
  }, 60 * 60 * 1000); // 1 hour delay
  console.log(`✓ Storage cleanup scheduled (every 24 hours, files older than ${CLEANUP_DAYS_OLD} days)`);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept document files and images
    if (isSupportedDocumentType(file.originalname) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload .txt, .docx, .pdf, or image files.'));
    }
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    message: 'LessonLaunch API is running',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check storage health
  try {
    const storageHealth = await checkStorageHealth();
    health.services.storage = storageHealth;
  } catch (error) {
    health.services.storage = {
      healthy: false,
      error: error.message
    };
  }

  const allHealthy = health.services.storage?.healthy !== false;
  res.status(allHealthy ? 200 : 503).json(health);
});

// Storage health check endpoint (detailed)
app.get('/api/health/storage', async (req, res) => {
  try {
    const health = await checkStorageHealth();
    
    // Add quota check if healthy
    if (health.healthy) {
      const quotaGB = parseFloat(process.env.SUPABASE_STORAGE_QUOTA_GB) || 1; // Default 1GB for free tier
      const quota = await checkStorageQuota(quotaGB, 80); // 80% warning threshold
      health.quota = quota;
    }
    
    res.status(health.healthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      error: error.message
    });
  }
});

// Storage usage endpoint (authenticated)
app.get('/api/storage/usage', authenticateUser, async (req, res) => {
  try {
    const usage = await getStorageUsage(req.userToken);
    const quotaGB = parseFloat(process.env.SUPABASE_STORAGE_QUOTA_GB) || 1;
    const quota = await checkStorageQuota(quotaGB, 80, req.userToken);
    
    res.json({
      success: true,
      usage,
      quota
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Storage cleanup endpoint (admin/authenticated)
app.post('/api/storage/cleanup', authenticateUser, async (req, res) => {
  try {
    const { daysOld = 90, onlyDeleted = true } = req.body;
    
    // For now, allow any authenticated user to clean up their own files
    // In production, you might want to restrict this to admins
    const result = await cleanupUserFiles(req.user.id, req.userToken, daysOld);
    
    res.json({
      success: true,
      deleted: result.deleted,
      errors: result.errors,
      message: `Cleaned up ${result.deleted} files, ${result.errors} errors`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Admin storage cleanup endpoint (all users)
// Note: This requires SUPABASE_SERVICE_ROLE_KEY to be set
app.post('/api/storage/cleanup/all', authenticateUser, async (req, res) => {
  try {
    // In production, add admin check here
    // For now, we'll allow if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Service role key not configured. This endpoint requires SUPABASE_SERVICE_ROLE_KEY.'
      });
    }
    
    const { daysOld = 90, onlyDeleted = true } = req.body;
    const result = await cleanupOldFiles(daysOld, onlyDeleted);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Image Upload Endpoint
app.post('/api/upload/image', authenticateUser, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false,
            error: 'File too large. Maximum size is 10MB.' 
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ 
            success: false,
            error: 'Unexpected file field. Please use the correct upload form.' 
          });
        }
        return res.status(400).json({ 
          success: false,
          error: `Upload error: ${err.message}` 
        });
      }
      // Handle fileFilter errors (these are regular Errors, not MulterErrors)
      if (err.message && err.message.includes('Unsupported file type')) {
        return res.status(400).json({ 
          success: false,
          error: err.message 
        });
      }
      // Other errors
      console.error('Image upload error:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to upload image' 
      });
    }
    
    // No file provided
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided' 
      });
    }
    
    // Success - return relative URL path
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename
    });
  });
});

// New Endpoint: Finalize and Download from Preview
app.post('/api/generate-slides/finalize', authenticateUser, async (req, res) => {
  try {
    const { lessonId, slideData } = req.body;

    if (!slideData) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing slide data' 
      });
    }

    if (!slideData.slides || !Array.isArray(slideData.slides) || slideData.slides.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid slide data: no slides found' 
      });
    }

    const timestamp = Date.now();
    
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const uniqueFilename = `lesson-${timestamp}.pptx`;
    const pptxPath = path.join(uploadsDir, uniqueFilename);
    
    // Determine user-friendly filename from title or topic
    // Try to find topic first as that matches user input "what are you teaching"
    const lessonTitle = slideData.topic || req.body.topic || slideData.title || 'lesson';
    const safeTitle = sanitizeFilename(lessonTitle);
    const pptxFilename = `${safeTitle}.pptx`;

    console.log(`Generating PowerPoint from edited slide data (${slideData.slides.length} slides)...`);
    
    // Build image map from selected images in slides
    // We need to map URLs back to local paths for PptxGenJS where possible
    // For Pexels (remote URLs), PptxGenJS handles them directly
    // For uploaded images (/uploads/...), we need full local path
    
    // Pre-process slides to ensure selectedImages are valid for generation
    // Note: generatePowerPoint handles selectedImages array in slide object directly now
    // We just need to ensure local paths are resolved correctly in powerpointService or here.
    // Let's pass a helper or pre-process here.
    
    // Actually, let's pre-process the selectedImages to be full paths if they are local uploads
    slideData.slides.forEach(slide => {
      if (slide.selectedImages && Array.isArray(slide.selectedImages)) {
        slide.selectedImages = slide.selectedImages.map(url => mapUrlToLocalPath(url));
      }
    });

    // Generate PowerPoint with the EDITED data
    // Pass null for imageMap as we are using selectedImages primarily now
    await generatePowerPoint(slideData, pptxPath, null);

    // Verify file was created
    try {
      await fs.access(pptxPath);
    } catch (fileError) {
      throw new Error('PowerPoint file was not created successfully');
    }
    
    // Generate Resource Sheet if content exists
    let docxFilename = null;
    let docxPath = null;
    let docxStoragePath = null;
    
    if (slideData.resourceContent && slideData.resourceContent.items && slideData.resourceContent.items.length > 0) {
       const uniqueDocxName = `lesson-resources-${timestamp}.docx`;
       docxPath = path.join(uploadsDir, uniqueDocxName);
       docxFilename = `${safeTitle} +Resource.docx`;
       
       // Check if scaffolding needed
       const needsSEND = slideData.needsSENDScaffolding || false;
       
       await generateResourceSheet(slideData, docxPath, null, needsSEND);
    }

    // Upload to Supabase Storage if we have a lesson ID
    let storagePath = null;
    if (lessonId) {
      try {
        const userId = req.user.id;
        const token = req.userToken;
        
        console.log('☁️ Uploading finalized file to Supabase Storage...');
        storagePath = await uploadFileToStorage(
          pptxPath,
          uniqueFilename,
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          userId,
          token
        );
        console.log(`   ✓ PPTX Uploaded to: ${storagePath}`);
        
        // Upload DOCX if exists
        if (docxPath) {
            const uniqueDocxName = path.basename(docxPath);
            docxStoragePath = await uploadFileToStorage(
                docxPath, 
                uniqueDocxName,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                userId,
                token
             );
             console.log(`   ✓ DOCX Uploaded to: ${docxStoragePath}`);
        }
        
        // Update lesson record with storage path
        const userSupabase = createClient(
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
        
        const updateData = { pptx_url: storagePath };
        if (docxStoragePath) {
            updateData.docx_url = docxStoragePath;
            // Also update content in case it changed
            updateData.ai_response = slideData;
        } else {
             // Update AI response anyway to save edits
            updateData.ai_response = slideData;
        }
        
        await userSupabase
          .from('lessons')
          .update(updateData)
          .eq('id', lessonId)
          .eq('user_id', userId);
      } catch (uploadError) {
        console.error('⚠️ Storage upload failed:', uploadError.message);
        // Store error for user notification
        if (!storagePath) storagePath = null; // Keep null if pptx failed
        // Continue - file is available locally, but user should be notified
      }
    }

    // Store file paths for download
    tempFileStore.set(timestamp, {
      pptxPath,
      pptxFilename,
      docxPath,
      docxFilename,
      lessonId: lessonId || null
    });

    res.json({
      success: true,
      timestamp: timestamp,
      pptxFilename,
      docxFilename,
      storagePath: storagePath || null,
      docxStoragePath: docxStoragePath || null,
      storageWarning: storagePath ? null : 'File saved locally but could not be uploaded to cloud storage. It will be available for 5 minutes only.'
    });
  } catch (error) {
    console.error('Finalization error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate final file',
      message: error.message 
    });
  }
});

// Route Handlers
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/slides', slidesRoutes);
app.use('/api/units', unitRoutes);

// Main endpoint: Generate PowerPoint from teacher notes
// Protected with authentication and usage limits
app.post('/api/generate-slides', 
  authenticateUser,          // Require authentication
  checkUsageLimit,           // Check monthly usage limits
  upload.fields([
    { name: 'notesFiles', maxCount: 20 }, // Allow up to 20 files
    { name: 'images', maxCount: 10 }
  ]), 
  async (req, res) => {
  try {
    const {
      topic,
      duration,
      curriculumCode,
      keyVocabulary,
      notes,
      additionalResources,
      interactiveLesson,
      sendScaffolding,
      generateImages
    } = req.body;
    
    // Validate required fields
    if (!topic || !duration) {
      return res.status(400).json({
        error: 'Missing required fields: topic and duration are required'
      });
    }
    
    // Read all notes files if provided
    let allFileContent = [];
    if (req.files && req.files.notesFiles) {
      // Handle both single file (backward compatibility) and multiple files
      const files = Array.isArray(req.files.notesFiles) 
        ? req.files.notesFiles 
        : [req.files.notesFiles];
      
      // Process all uploaded files
      const rawFileContents = [];
      for (const file of files) {
        try {
          const filePath = file.path;
          const content = await readFileContent(filePath);
          
          // Add filename as header for context
          rawFileContents.push(`[From file: ${file.originalname}]\n${content}`);
          
          // Clean up uploaded file after reading
          await fs.unlink(filePath).catch(console.error);
        } catch (error) {
          console.error(`Error reading file ${file.originalname}:`, error);
          // Continue with other files if one fails
        }
      }
      
      // Summarize file contents to reduce token usage (more aggressive threshold)
      if (rawFileContents.length > 0) {
        // Check if any file is longer than 1000 chars before summarizing (lowered threshold)
        const needsSummarization = rawFileContents.some(content => {
          const actualContent = content.replace(/^\[From file: .+\]\n/, '');
          return actualContent.length > 1000;
        });
        
        if (needsSummarization) {
          console.log('Summarizing file contents to reduce token usage...');
          allFileContent = await summarizeFiles(rawFileContents);
        } else {
          allFileContent = rawFileContents;
        }
      }
    }
    
    // Summarize notes if they're over 1000 chars (more aggressive)
    const processedNotes = notes && notes.length > 1000 
      ? await summarizeContent(notes, 1500) 
      : (notes || '');
    
    // Combine notes and all file content
    const combinedNotes = [processedNotes, ...allFileContent].filter(Boolean).join('\n\n---\n\n');
    
    // Process with AI
    const slideData = await processNotesAndGenerateSlides({
      topic,
      notes: combinedNotes || 'No specific notes provided',
      curriculumCode,
      keyVocabulary,
      duration,
      needsResources: additionalResources === 'true' || additionalResources === true,
      isInteractive: interactiveLesson === 'true' || interactiveLesson === true,
      needsSENDScaffolding: sendScaffolding === 'true' || sendScaffolding === true,
      fileContent: allFileContent.join('\n\n---\n\n') // Combined content from all files
    });
    
    const needsResources = additionalResources === 'true' || additionalResources === true;
    const shouldGenerateImages = generateImages === 'true' || generateImages === true;
    const timestamp = Date.now();
    
    // Generate AI images if requested
    let imageMap = null;
    if (shouldGenerateImages) {
      console.log('📸 Fetching professional stock photos from Pexels...');
      try {
        const imagesDir = path.join(uploadsDir, `images-${timestamp}`);
        imageMap = await getPexelsImagesForLesson(slideData, imagesDir);
        console.log(`✓ Downloaded ${imageMap.size} stock photos from Pexels`);
      } catch (imageError) {
        console.error('Error fetching stock images:', imageError);
        console.log('Continuing without images...');
        // Continue without images rather than failing completely
      }
    }
    
    // Generate PowerPoint
    const uniquePptxName = `lesson-${timestamp}.pptx`;
    const pptxPath = path.join(uploadsDir, uniquePptxName);
    
    const safeTopic = sanitizeFilename(topic || 'lesson');
    const pptxFilename = `${safeTopic}.pptx`;
    
    await generatePowerPoint(slideData, pptxPath, imageMap);
    
    // If resources are needed, generate resource sheet (Word document)
    let docxFilename = null;
    let docxPath = null;
    if (needsResources) {
      const uniqueDocxName = `lesson-resources-${timestamp}.docx`;
      docxPath = path.join(uploadsDir, uniqueDocxName);
      docxFilename = `${safeTopic} +Resource.docx`;
      
      await generateResourceSheet(slideData, docxPath, imageMap, sendScaffolding === 'true' || sendScaffolding === true);
    }
    
    // Upload files to Supabase Storage
    let pptxStoragePath = null;
    let docxStoragePath = null;
    let storageErrors = [];

    try {
      const userId = req.user.id;
      const token = req.userToken;
      
      console.log('☁️ Uploading files to Supabase Storage...');
      
      // Upload PPTX
      try {
        pptxStoragePath = await uploadFileToStorage(
          pptxPath,
          uniquePptxName, // Unique filename for storage
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          userId,
          token
        );
        console.log(`   - PPTX uploaded: ${pptxStoragePath}`);
      } catch (pptxError) {
        console.error('⚠️ PPTX storage upload failed:', pptxError.message);
        storageErrors.push(`PowerPoint upload failed: ${pptxError.message}`);
      }
      
      // Upload DOCX if exists
      if (docxPath) {
        try {
          docxStoragePath = await uploadFileToStorage(
            docxPath,
            path.basename(docxPath), // Unique filename
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            userId,
            token
          );
          console.log(`   - DOCX uploaded: ${docxStoragePath}`);
        } catch (docxError) {
          console.error('⚠️ DOCX storage upload failed:', docxError.message);
          storageErrors.push(`Resource sheet upload failed: ${docxError.message}`);
        }
      }
      
    } catch (uploadError) {
      console.error('⚠️ Storage upload failed:', uploadError.message);
      storageErrors.push(`Storage upload failed: ${uploadError.message}`);
    }
    
    // Clean up generated images after inserting them into documents
    if (shouldGenerateImages && imageMap && imageMap.size > 0) {
      console.log('Cleaning up temporary image files...');
      for (const imagePath of imageMap.values()) {
        try {
          await fs.unlink(imagePath).catch(() => {}); // Ignore errors
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
      // Remove the images directory
      try {
        const imagesDir = path.join(uploadsDir, `images-${timestamp}`);
        await fs.rmdir(imagesDir).catch(() => {});
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    // Store file paths for later download
    tempFileStore.set(timestamp, {
      pptxPath,
      pptxFilename,
      docxPath,
      docxFilename
    });
    
    // Save lesson to database
    try {
      // Create a user-authenticated Supabase client
      // This is required for RLS to work - it needs the user's JWT token
      const userSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${req.userToken}`
            }
          }
        }
      );
      
      const lessonToSave = {
        user_id: req.user.id,
        title: slideData.title || topic,
        topic: topic,
        key_stage: slideData.keyStage,
        subject: slideData.subject,
        duration: parseInt(duration),
        pptx_url: pptxStoragePath || pptxFilename,
        docx_url: docxStoragePath || docxFilename,
        additional_resources: needsResources,
        interactive_lesson: interactiveLesson === 'true' || interactiveLesson === true,
        send_scaffolding: sendScaffolding === 'true' || sendScaffolding === true,
        generate_images: shouldGenerateImages,
        slides_count: slideData.slides?.length || 0,
        questions_count: slideData.resourceContent?.items?.reduce((sum, item) => 
          sum + (item.questions?.length || 0), 0) || 0,
        images_count: imageMap?.size || 0,
        ai_response: slideData,
        status: 'completed'
      };
      
      // Use the user-authenticated client for the insert
      const { data: lessonData, error: dbError } = await userSupabase
        .from('lessons')
        .insert([lessonToSave])
        .select()
        .single();
      
      let savedLessonId = null;
      
      if (dbError) {
        console.error('❌ Error saving lesson to database:', dbError);
        console.error('❌ Error details:', JSON.stringify(dbError, null, 2));
        // Don't fail the request if database save fails
      } else {
        console.log('✅ Lesson saved to database successfully!');
        console.log('✅ Lesson ID:', lessonData.id);
        savedLessonId = lessonData.id;
      }
      
      // Store lesson ID in temp file store for later use
      if (savedLessonId) {
        const currentData = tempFileStore.get(timestamp);
        if (currentData) {
          currentData.lessonId = savedLessonId;
        }
      }
    } catch (dbSaveError) {
      console.error('❌ Database save exception:', dbSaveError);
      console.error('❌ Exception details:', dbSaveError.message);
      // Don't fail the request
    }
    
    // Get saved lesson ID from temp store
    const fileData = tempFileStore.get(timestamp);
    const savedLessonId = fileData?.lessonId || null;
    
    // Return JSON with download tokens instead of sending files
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      timestamp: timestamp.toString(),
      storageWarnings: storageErrors.length > 0 ? storageErrors : undefined,
      pptxFilename,
      docxFilename: docxFilename || null,
      hasResources: needsResources,
      lessonId: savedLessonId, // Include lesson ID for folder organization
      usage: req.usage // Include usage info from middleware
    });
    
  } catch (error) {
    console.error('Error generating slides:', error);
    res.status(500).json({
      error: 'Failed to generate slides',
      message: error.message
    });
  }
});

// Endpoint to download PowerPoint file
app.get('/api/download-pptx/:timestamp', async (req, res) => {
  try {
    const timestamp = parseInt(req.params.timestamp);
    const fileData = tempFileStore.get(timestamp);
    
    // First, try to get from Supabase Storage if we have a lesson ID
    if (fileData?.lessonId) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );
        
        const { data: lesson, error: dbError } = await supabase
          .from('lessons')
          .select('pptx_url')
          .eq('id', fileData.lessonId)
          .single();
        
        if (!dbError && lesson?.pptx_url && lesson.pptx_url.includes('/')) {
          // File is in Supabase Storage - redirect to signed URL
          const token = req.headers.authorization?.replace('Bearer ', '') || '';
          const signedUrl = await getSignedDownloadUrl(lesson.pptx_url, token);
          
          if (signedUrl) {
            return res.redirect(signedUrl);
          }
        }
      } catch (storageError) {
        console.error('Error accessing Supabase Storage:', storageError);
        // Fall through to local file check
      }
    }
    
    // Fallback to local file
    if (!fileData || !fileData.pptxPath) {
      return res.status(404).json({ error: 'PowerPoint file not found or expired' });
    }
    
    // Check if local file exists
    try {
      await fs.access(fileData.pptxPath);
    } catch (fileError) {
      tempFileStore.delete(timestamp);
      return res.status(404).json({ error: 'PowerPoint file not found' });
    }
    
    // Send PowerPoint file from local storage
    res.download(fileData.pptxPath, fileData.pptxFilename, async (err) => {
      if (err) {
        console.error('Error sending PowerPoint file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error sending PowerPoint file', message: err.message });
        }
      } else {
        console.log('PowerPoint file sent successfully');
        // Clean up file after sending (but keep in store in case resources are also downloaded)
        setTimeout(async () => {
          try {
            await fs.unlink(fileData.pptxPath);
            // If resources were also downloaded, clean up the entire entry
            const currentData = tempFileStore.get(timestamp);
            if (currentData && !currentData.docxPath) {
              tempFileStore.delete(timestamp);
            } else if (currentData) {
              // Keep entry but mark PowerPoint as deleted
              currentData.pptxPath = null;
            }
          } catch (error) {
            console.error('Error cleaning up PowerPoint file:', error);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error('Error downloading PowerPoint:', error);
    res.status(500).json({
      error: 'Failed to download PowerPoint',
      message: error.message
    });
  }
});

// Endpoint to download Word document resources separately
app.get('/api/download-resources/:timestamp', async (req, res) => {
  try {
    const timestamp = parseInt(req.params.timestamp);
    const fileData = tempFileStore.get(timestamp);
    
    // First, try to get from Supabase Storage if we have a lesson ID
    if (fileData?.lessonId) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );
        
        const { data: lesson, error: dbError } = await supabase
          .from('lessons')
          .select('docx_url')
          .eq('id', fileData.lessonId)
          .single();
        
        if (!dbError && lesson?.docx_url && lesson.docx_url.includes('/')) {
          // File is in Supabase Storage - redirect to signed URL
          const token = req.headers.authorization?.replace('Bearer ', '') || '';
          const signedUrl = await getSignedDownloadUrl(lesson.docx_url, token);
          
          if (signedUrl) {
            return res.redirect(signedUrl);
          }
        }
      } catch (storageError) {
        console.error('Error accessing Supabase Storage:', storageError);
        // Fall through to local file check
      }
    }
    
    // Fallback to local file
    if (!fileData || !fileData.docxPath) {
      return res.status(404).json({ error: 'Resource file not found or expired' });
    }
    
    // Check if local file exists
    try {
      await fs.access(fileData.docxPath);
    } catch (fileError) {
      tempFileStore.delete(timestamp);
      return res.status(404).json({ error: 'Resource file not found' });
    }
    
    // Send Word document from local storage
    res.download(fileData.docxPath, fileData.docxFilename, async (err) => {
      if (err) {
        console.error('Error sending Word document:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error sending Word document', message: err.message });
        }
      } else {
        console.log('Word document sent successfully');
        // Clean up file after sending
        setTimeout(async () => {
          try {
            await fs.unlink(fileData.docxPath);
            // If PowerPoint was also downloaded, clean up the entire entry
            const currentData = tempFileStore.get(timestamp);
            if (currentData && !currentData.pptxPath) {
              tempFileStore.delete(timestamp);
            } else if (currentData) {
              // Keep entry but mark Word doc as deleted
              currentData.docxPath = null;
            }
          } catch (error) {
            console.error('Error cleaning up Word document:', error);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error('Error downloading resources:', error);
    res.status(500).json({
      error: 'Failed to download resources',
      message: error.message
    });
  }
});

// Endpoint to download files by lesson ID (for dashboard)
app.get('/api/lessons/:lessonId/download/:fileType', authenticateUser, async (req, res) => {
  try {
    const { lessonId, fileType } = req.params;
    const userId = req.user.id;
    const token = req.userToken;
    
    if (!['pptx', 'docx'].includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type. Use pptx or docx' });
    }
    
    // Create authenticated Supabase client
    const userSupabase = createClient(
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
    
    // Fetch lesson
    const { data: lesson, error } = await userSupabase
      .from('lessons')
      .select(`pptx_url, docx_url, title, topic`)
      .eq('id', lessonId)
      .eq('user_id', userId)
      .single();
    
    if (error || !lesson) {
      return res.status(404).json({ error: 'Lesson not found or access denied' });
    }
    
    const storagePath = fileType === 'pptx' ? lesson.pptx_url : lesson.docx_url;
    
    if (!storagePath) {
      return res.status(404).json({ error: `${fileType.toUpperCase()} file not found for this lesson` });
    }
    
    // Check if it's a Supabase Storage path (contains '/')
    if (storagePath.includes('/')) {
      // Get signed URL from Supabase Storage
      const signedUrl = await getSignedDownloadUrl(storagePath, token);
      
      if (signedUrl) {
        // Check if request wants JSON (from fetch) or direct redirect (from browser)
        const acceptsJson = req.headers.accept?.includes('application/json');
        
        if (acceptsJson) {
          // Return JSON with URL for fetch requests
          return res.json({ 
            success: true, 
            url: signedUrl,
            filename: `${lesson.title || lesson.topic || 'lesson'}.${fileType}`
          });
        } else {
          // Redirect for direct browser access
          return res.redirect(signedUrl);
        }
      } else {
        return res.status(500).json({ error: 'Failed to generate download URL' });
      }
    } else {
      // Legacy local file (shouldn't happen for new lessons, but handle gracefully)
      return res.status(404).json({ 
        error: 'File not available. This lesson was created before cloud storage was enabled.' 
      });
    }
    
  } catch (error) {
    console.error('Error downloading lesson file:', error);
    res.status(500).json({
      error: 'Failed to download file',
      message: error.message
    });
  }
});

// API 404 Handler - catch any API requests not handled by routes above
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API Endpoint Not Found', 
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist` 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LessonLaunch server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/generate-slides`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set. AI features will not work.');
    console.warn('   Please create a .env file with your OpenAI API key.');
  }
});

module.exports = app;
