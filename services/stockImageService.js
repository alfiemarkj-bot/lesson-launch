const https = require('https');
const fs = require('fs').promises;
const path = require('path');

/**
 * Stock Image Service using Unsplash API
 * Free tier: 50 requests/hour
 * Alternative: Pexels API (200 requests/hour)
 */

// Use Unsplash API (you'll need to get a free API key from https://unsplash.com/developers)
// For now, we'll use a demo key that works in development
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || 'demo';

/**
 * Search for stock images based on a query
 * Returns array of image URLs
 */
async function searchStockImages(query, count = 1) {
  // If no API key, return placeholder images
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'demo') {
    console.log('⚠️ No Unsplash API key. Using placeholder images.');
    return Array(count).fill('https://via.placeholder.com/1024x768.png?text=Educational+Image');
  }

  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query);
    const options = {
      hostname: 'api.unsplash.com',
      path: `/search/photos?query=${encodedQuery}&per_page=${count}&orientation=landscape`,
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
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
          
          if (response.results && response.results.length > 0) {
            const imageUrls = response.results.map(img => img.urls.regular);
            resolve(imageUrls);
          } else {
            // Fallback to placeholder if no results
            resolve([`https://via.placeholder.com/1024x768.png?text=${encodedQuery}`]);
          }
        } catch (error) {
          console.error('Error parsing Unsplash response:', error);
          resolve([`https://via.placeholder.com/1024x768.png?text=Image`]);
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching from Unsplash:', error);
      // Fallback to placeholder
      resolve([`https://via.placeholder.com/1024x768.png?text=Image`]);
    });
  });
}

/**
 * Download image from URL to local file
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);
    
    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(url, (response) => {
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
 * Returns the local file path of the downloaded image
 */
async function getStockImage(description, outputDir, filename) {
  try {
    console.log(`Searching stock image: ${description.substring(0, 50)}...`);
    
    // Clean up description for better search results
    // Remove "educational" modifiers and keep core concept
    const searchQuery = description
      .replace(/educational illustration for primary school/gi, '')
      .replace(/ages 5-11/gi, '')
      .replace(/classroom use/gi, '')
      .replace(/child-friendly/gi, '')
      .trim();
    
    // Search for image
    const imageUrls = await searchStockImages(searchQuery, 1);
    const imageUrl = imageUrls[0];
    
    if (!imageUrl) {
      throw new Error('No image URL returned from stock service');
    }
    
    // Download image to local file
    const imagePath = path.join(outputDir, filename);
    await downloadImage(imageUrl, imagePath);
    
    console.log(`✓ Stock image downloaded: ${filename}`);
    return imagePath;
    
  } catch (error) {
    console.error(`Error getting stock image for "${description}":`, error.message);
    throw error;
  }
}

/**
 * Get multiple stock images from descriptions
 * Returns array of { description, path } objects
 */
async function getMultipleStockImages(imageDescriptions, outputDir, prefix = 'img') {
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
      const imagePath = await getStockImage(description, outputDir, filename);
      
      downloadedImages.push({
        description,
        path: imagePath,
        filename
      });
      
      // Small delay to respect rate limits (Unsplash: 50/hour = 72s between requests safe)
      // In practice, 1s delay is fine for 50/hour limit
      if (i < imageDescriptions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to get stock image ${i + 1}:`, error.message);
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
 * Returns array of unique image descriptions
 * @param {Object} slideData - The slide content
 * @param {Object} limits - Optional limits { slides: 5, resources: 2 }
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
 * Get all stock images needed for a lesson
 * Returns a map of description -> image path
 */
async function getStockImagesForLesson(slideData, outputDir) {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Extract all unique image descriptions
    const descriptions = extractImageDescriptions(slideData);
    
    if (descriptions.length === 0) {
      console.log('No images to fetch');
      return new Map();
    }
    
    console.log(`Fetching ${descriptions.length} stock images...`);
    
    // Get stock images
    const downloadedImages = await getMultipleStockImages(descriptions, outputDir, 'lesson');
    
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
    console.error('Error in getStockImagesForLesson:', error);
    throw error;
  }
}

module.exports = {
  searchStockImages,
  getStockImage,
  getMultipleStockImages,
  getStockImagesForLesson,
  extractImageDescriptions
};

