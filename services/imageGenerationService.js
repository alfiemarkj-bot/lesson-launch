const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

/**
 * Download image from URL to local file
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
      
      file.on('error', (err) => {
        require('fs').unlink(filepath, () => {}); // Clean up on error
        reject(err);
      });
    }).on('error', (err) => {
      require('fs').unlink(filepath, () => {}); // Clean up on error
      reject(err);
    });
  });
}

/**
 * Generate image using DALL-E 3
 * Returns the local file path of the generated image
 */
async function generateImage(description, outputDir, filename) {
  try {
    console.log(`Generating image: ${description.substring(0, 50)}...`);
    
    // Create more educational/appropriate prompt
    // CRITICAL: Emphasize NO TEXT multiple times as AI often ignores this
    const educationalPrompt = `Educational illustration for primary school (ages 5-11): ${description}. Style: clear, simple, colorful, child-friendly diagram or illustration, suitable for classroom use. IMPORTANT: Absolutely NO text, letters, words, numbers, or labels in the image. Pure visual illustration only, no written content whatsoever.`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: educationalPrompt,
      n: 1,
      size: "1024x1024", // Good balance of quality and cost
      quality: "standard" // Standard is cheaper than HD
    });
    
    const imageUrl = response.data[0].url;
    
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }
    
    // Download image to local file
    const imagePath = path.join(outputDir, filename);
    await downloadImage(imageUrl, imagePath);
    
    console.log(`✓ Image generated and saved: ${filename}`);
    return imagePath;
    
  } catch (error) {
    console.error(`Error generating image for "${description}":`, error.message);
    throw error;
  }
}

/**
 * Generate multiple images from descriptions
 * Returns array of { description, path } objects
 */
async function generateMultipleImages(imageDescriptions, outputDir, prefix = 'img') {
  const generatedImages = [];
  
  // Process images sequentially to avoid rate limits
  for (let i = 0; i < imageDescriptions.length; i++) {
    const description = imageDescriptions[i];
    
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      console.warn(`Skipping invalid image description at index ${i}`);
      continue;
    }
    
    try {
      const filename = `${prefix}-${i + 1}-${Date.now()}.png`;
      const imagePath = await generateImage(description, outputDir, filename);
      
      generatedImages.push({
        description,
        path: imagePath,
        filename
      });
      
      // Small delay to avoid rate limiting
      if (i < imageDescriptions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error.message);
      // Continue with other images even if one fails
      generatedImages.push({
        description,
        path: null,
        filename: null,
        error: error.message
      });
    }
  }
  
  return generatedImages;
}

/**
 * Extract image descriptions from slide data with limits
 * Returns array of unique image descriptions
 * @param {Object} slideData - The slide content
 * @param {Object} limits - Optional limits { slides: 3, resources: 1 }
 */
function extractImageDescriptions(slideData, limits = { slides: 3, resources: 1 }) {
  const slideDescriptions = [];
  const resourceDescriptions = [];
  
  // Extract from slide image suggestions (limit to 3)
  if (slideData.slides && Array.isArray(slideData.slides)) {
    const maxSlideImages = limits.slides || 3;
    
    for (const slide of slideData.slides) {
      if (slideDescriptions.length >= maxSlideImages) break;
      
      if (slide.imageSuggestions && Array.isArray(slide.imageSuggestions)) {
        for (const desc of slide.imageSuggestions) {
          if (slideDescriptions.length >= maxSlideImages) break;
          
          if (desc && typeof desc === 'string' && !slideDescriptions.includes(desc)) {
            slideDescriptions.push(desc);
          }
        }
      }
    }
  }
  
  // Extract from resource content images (limit to 1)
  if (slideData.resourceContent && slideData.resourceContent.items) {
    const maxResourceImages = limits.resources || 1;
    
    for (const item of slideData.resourceContent.items) {
      if (resourceDescriptions.length >= maxResourceImages) break;
      
      if (item.images && Array.isArray(item.images)) {
        for (const img of item.images) {
          if (resourceDescriptions.length >= maxResourceImages) break;
          
          if (img && img.description && !resourceDescriptions.includes(img.description)) {
            resourceDescriptions.push(img.description);
          }
        }
      }
    }
  }
  
  // Combine both arrays (removing duplicates between slides and resources)
  const allDescriptions = [...slideDescriptions];
  resourceDescriptions.forEach(desc => {
    if (!allDescriptions.includes(desc)) {
      allDescriptions.push(desc);
    }
  });
  
  return allDescriptions;
}

/**
 * Generate all images needed for a lesson
 * Returns a map of description -> image path
 */
async function generateLessonImages(slideData, outputDir) {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Extract all unique image descriptions
    const descriptions = extractImageDescriptions(slideData);
    
    if (descriptions.length === 0) {
      console.log('No images to generate');
      return new Map();
    }
    
    console.log(`Generating ${descriptions.length} images...`);
    
    // Generate images
    const generatedImages = await generateMultipleImages(descriptions, outputDir, 'lesson');
    
    // Create map of description -> path for easy lookup
    const imageMap = new Map();
    generatedImages.forEach(img => {
      if (img.path) {
        imageMap.set(img.description, img.path);
      }
    });
    
    console.log(`Successfully generated ${imageMap.size} out of ${descriptions.length} images`);
    
    return imageMap;
    
  } catch (error) {
    console.error('Error in generateLessonImages:', error);
    throw error;
  }
}

module.exports = {
  generateImage,
  generateMultipleImages,
  generateLessonImages,
  extractImageDescriptions
};

