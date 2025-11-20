const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateUser } = require('../middleware/auth');
const { regenerateSlide } = require('../services/aiService');
const { searchPexelsImages } = require('../services/pexelsImageService');
const { searchLocalImages } = require('../services/localImageService');

// Regenerate a specific slide using AI
router.post('/regenerate', authenticateUser, async (req, res) => {
  try {
    const { slideContext, lessonTopic, slideType, allSlides } = req.body;

    if (!slideContext || !lessonTopic) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: slideContext and lessonTopic are required' 
      });
    }

    console.log(`Regenerating slide: "${slideContext.title}" for topic: "${lessonTopic}"`);

    // Use AI to regenerate the slide
    const regeneratedSlide = await regenerateSlide({
      slideContext,
      lessonTopic,
      slideType: slideType || slideContext.type,
      allSlides: allSlides || [] // Provide context of other slides
    });

    res.json({
      success: true,
      data: regeneratedSlide
    });
  } catch (error) {
    console.error('Regeneration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Failed to regenerate slide',
      message: error.message 
    });
  }
});

// Search for alternative images via Pexels
router.get('/images/search', authenticateUser, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing search query' 
      });
    }

    let images = await searchPexelsImages(query, 10); // Fetch 10 results
    
    // Fallback to local placeholder images if Pexels fails or returns no results
    if (!images || images.length === 0) {
      console.log('No Pexels images found, falling back to local placeholders');
      const uploadsDir = path.join(__dirname, '../uploads/search');
      images = await searchLocalImages(query, 4, uploadsDir);
    }
    
    if (!images || images.length === 0) {
      return res.json({
        success: true,
        images: [],
        message: 'No images found. Try different keywords.'
      });
    }
    
    res.json({
      success: true,
      images: images
    });
  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search images',
      message: error.message 
    });
  }
});

module.exports = router;