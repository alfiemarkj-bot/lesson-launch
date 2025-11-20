const https = require('https');
const fs = require('fs').promises;
const path = require('path');

/**
 * Pexels Stock Image Service
 * Free tier: 200 requests/hour
 * https://www.pexels.com/api/documentation/
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

/**
 * Search for stock images on Pexels
 * @param {string} query - Search query
 * @param {number} count - Number of images to fetch
 * @returns {Promise<Array<string>>} Array of image URLs
 */
async function searchPexelsImages(query, count = 1) {
  if (!PEXELS_API_KEY) {
    console.log('⚠️ No Pexels API key. Set PEXELS_API_KEY in .env');
    return [];
  }

  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query);
    const options = {
      hostname: 'api.pexels.com',
      path: `/v1/search?query=${encodedQuery}&per_page=${count}&orientation=landscape`,
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.photos && response.photos.length > 0) {
            // Use 'large' size - good balance of quality and file size
            const imageUrls = response.photos.map(photo => photo.src.large);
            resolve(imageUrls);
          } else if (response.error) {
            console.error('Pexels API error:', response.error);
            resolve([]);
          } else {
            console.log(`No results found for: ${query}`);
            resolve([]);
          }
        } catch (error) {
          console.error('Error parsing Pexels response:', error.message);
          resolve([]);
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching from Pexels:', error.message);
      resolve([]);
    });
  });
}

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
 * Get a stock image for a description
 * @param {string} description - The image description
 * @param {string} outputDir - Directory to save the image
 * @param {string} filename - Filename for the image
 * @returns {Promise<string>} Path to downloaded image
 */
async function getPexelsImage(description, outputDir, filename) {
  try {
    console.log(`Searching Pexels: ${description.substring(0, 50)}...`);
    
    // Clean up description for better search results
    // Remove educational modifiers and keep core concept
    const searchQuery = description
      .replace(/educational illustration for primary school/gi, '')
      .replace(/diagram showing/gi, '')
      .replace(/photo of/gi, '')
      .replace(/image of/gi, '')
      .replace(/illustration of/gi, '')
      .replace(/picture of/gi, '')
      .replace(/ages 5-11/gi, '')
      .replace(/classroom use/gi, '')
      .replace(/child-friendly/gi, '')
      .trim();
    
    // Search for image
    const imageUrls = await searchPexelsImages(searchQuery, 1);
    
    if (imageUrls.length === 0) {
      throw new Error('No images found for query');
    }
    
    const imageUrl = imageUrls[0];
    
    // Download image to local file
    const imagePath = path.join(outputDir, filename);
    await downloadImage(imageUrl, imagePath);
    
    console.log(`✓ Pexels image downloaded: ${filename}`);
    return imagePath;
    
  } catch (error) {
    console.error(`Error getting Pexels image for "${description}":`, error.message);
    throw error;
  }
}

/**
 * Get multiple stock images from descriptions
 * @param {Array<string>} imageDescriptions - Array of image descriptions
 * @param {string} outputDir - Directory to save images
 * @param {string} prefix - Filename prefix
 * @returns {Promise<Array>} Array of { description, path, filename } objects
 */
async function getMultiplePexelsImages(imageDescriptions, outputDir, prefix = 'img') {
  const downloadedImages = [];
  
  // Process images sequentially to avoid rate limits
  for (let i = 0; i < imageDescriptions.length; i++) {
    const description = imageDescriptions[i];
    
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      console.warn(`Skipping invalid image description at index ${i}`);
      continue;
    }
    
    try {
      const filename = `${prefix}-${i + 1}-${Date.now()}.jpg`;
      const imagePath = await getPexelsImage(description, outputDir, filename);
      
      downloadedImages.push({
        description,
        path: imagePath,
        filename
      });
      
      // Small delay to respect rate limits (200/hour = 18s safe, but 1s is reasonable)
      if (i < imageDescriptions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to get Pexels image ${i + 1}:`, error.message);
      // Continue with other images even if one fails
      downloadedImages.push({
        description,
        path: null,
        filename: null,
        error: error.message
      });
    }
  }
  
  return downloadedImages;
}

/**
 * Extract image descriptions from slide data with limits
 * @param {Object} slideData - The slide content
 * @param {Object} limits - Optional limits { slides: 5, resources: 2 }
 * @returns {Array<string>} Array of unique image descriptions
 */
function extractImageDescriptions(slideData, limits = { slides: 5, resources: 2 }) {
  const slideDescriptions = [];
  const resourceDescriptions = [];
  
  console.log(`📋 Extracting image descriptions from slide data...`);
  console.log(`   Slides in data: ${slideData.slides ? slideData.slides.length : 0}`);
  
  // Extract from slide image suggestions (limit to 5 for slides)
  if (slideData.slides && Array.isArray(slideData.slides)) {
    const maxSlideImages = limits.slides || 5;
    
    for (const slide of slideData.slides) {
      if (slideDescriptions.length >= maxSlideImages) break;
      
      if (slide.imageSuggestions && Array.isArray(slide.imageSuggestions)) {
        console.log(`   Slide "${slide.title}" has ${slide.imageSuggestions.length} image suggestions`);
        for (const desc of slide.imageSuggestions) {
          if (slideDescriptions.length >= maxSlideImages) break;
          
          if (desc && typeof desc === 'string' && !slideDescriptions.includes(desc)) {
            slideDescriptions.push(desc);
            console.log(`   ✓ Added: ${desc.substring(0, 60)}...`);
          }
        }
      } else {
        console.log(`   Slide "${slide.title}" has no imageSuggestions`);
      }
    }
  }
  
  // Extract from resource content images (limit to 2 for resources)
  if (slideData.resourceContent && slideData.resourceContent.items) {
    const maxResourceImages = limits.resources || 2;
    console.log(`   Resource items: ${slideData.resourceContent.items.length}`);
    
    for (const item of slideData.resourceContent.items) {
      if (resourceDescriptions.length >= maxResourceImages) break;
      
      if (item.images && Array.isArray(item.images)) {
        console.log(`   Resource "${item.title}" has ${item.images.length} images`);
        for (const img of item.images) {
          if (resourceDescriptions.length >= maxResourceImages) break;
          
          if (img && img.description && !resourceDescriptions.includes(img.description)) {
            resourceDescriptions.push(img.description);
            console.log(`   ✓ Added resource image: ${img.description.substring(0, 60)}...`);
          }
        }
      } else {
        console.log(`   Resource "${item.title}" has no images array`);
      }
    }
  } else {
    console.log(`   No resourceContent.items found`);
  }
  
  // Combine both arrays (removing duplicates between slides and resources)
  const allDescriptions = [...slideDescriptions];
  resourceDescriptions.forEach(desc => {
    if (!allDescriptions.includes(desc)) {
      allDescriptions.push(desc);
    }
  });
  
  console.log(`📊 Total image descriptions extracted: ${allDescriptions.length}`);
  if (allDescriptions.length > 0) {
    console.log(`   Descriptions:`, allDescriptions);
  }
  
  return allDescriptions;
}

/**
 * Get all stock images needed for a lesson from Pexels
 * @param {Object} slideData - The slide content
 * @param {string} outputDir - Directory to save images
 * @returns {Promise<Map>} Map of description -> image path
 */
async function getPexelsImagesForLesson(slideData, outputDir) {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Extract all unique image descriptions
    const descriptions = extractImageDescriptions(slideData);
    
    if (descriptions.length === 0) {
      console.log('No images to fetch');
      return new Map();
    }
    
    console.log(`Fetching ${descriptions.length} stock images from Pexels...`);
    
    // Get stock images
    const downloadedImages = await getMultiplePexelsImages(descriptions, outputDir, 'lesson');
    
    // Create map of description -> path for easy lookup
    const imageMap = new Map();
    downloadedImages.forEach(img => {
      if (img.path) {
        imageMap.set(img.description, img.path);
      }
    });
    
    console.log(`Successfully downloaded ${imageMap.size} out of ${descriptions.length} images`);
    
    return imageMap;
    
  } catch (error) {
    console.error('Error in getPexelsImagesForLesson:', error);
    throw error;
  }
}

module.exports = {
  searchPexelsImages,
  getPexelsImage,
  getMultiplePexelsImages,
  getPexelsImagesForLesson,
  extractImageDescriptions
};

