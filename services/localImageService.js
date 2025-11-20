const fs = require('fs').promises;
const path = require('path');

/**
 * Local Image Service - Creates simple colored placeholder images
 * No external API needed, works completely offline
 */

// Color palette for educational images
const COLORS = [
  '#4C6EF5', // Primary blue
  '#35C97A', // Green
  '#FF6B6B', // Red
  '#FFA500', // Orange
  '#9B59B6', // Purple
  '#3498DB', // Light blue
  '#E74C3C', // Coral
  '#1ABC9C', // Teal
];

/**
 * Create a simple SVG placeholder image
 * @param {string} description - The image description
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} SVG content
 */
function createSVGPlaceholder(description, width = 1024, height = 768) {
  // Pick a color based on the description hash
  const colorIndex = Math.abs(description.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % COLORS.length;
  const backgroundColor = COLORS[colorIndex];
  
  // Create gradient for more visual interest
  const lighterColor = adjustColor(backgroundColor, 30);
  
  // Truncate description for display
  const displayText = description.length > 60 ? description.substring(0, 57) + '...' : description;
  const lines = wrapText(displayText, 40);
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${lighterColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad1)"/>
  
  <!-- Icon/Symbol -->
  <circle cx="${width/2}" cy="${height/2 - 60}" r="80" fill="rgba(255,255,255,0.2)"/>
  <text x="${width/2}" y="${height/2 - 40}" font-family="Arial, sans-serif" font-size="64" fill="white" text-anchor="middle">🖼️</text>
  
  <!-- Text -->
  ${lines.map((line, idx) => `
  <text x="${width/2}" y="${height/2 + 80 + (idx * 30)}" 
        font-family="Arial, sans-serif" font-size="20" font-weight="600"
        fill="white" text-anchor="middle">${escapeXml(line)}</text>
  `).join('')}
  
  <!-- Watermark -->
  <text x="${width - 10}" y="${height - 10}" 
        font-family="Arial, sans-serif" font-size="14" 
        fill="rgba(255,255,255,0.6)" text-anchor="end">LessonLaunch</text>
</svg>`;
  
  return svg;
}

/**
 * Lighten or darken a hex color
 */
function adjustColor(color, amount) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/**
 * Wrap text into multiple lines
 */
function wrapText(text, maxLength) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines.slice(0, 3); // Max 3 lines
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a local placeholder image
 * @param {string} description - The image description
 * @param {string} outputPath - Where to save the image
 */
async function createLocalImage(description, outputPath) {
  try {
    console.log(`Creating local placeholder: ${description.substring(0, 50)}...`);
    
    const svg = createSVGPlaceholder(description);
    await fs.writeFile(outputPath, svg, 'utf8');
    
    console.log(`✓ Local image created: ${path.basename(outputPath)}`);
    return outputPath;
    
  } catch (error) {
    console.error(`Error creating local image:`, error.message);
    throw error;
  }
}

/**
 * Create multiple local placeholder images
 * @param {Array<string>} descriptions - Array of image descriptions
 * @param {string} outputDir - Directory to save images
 * @param {string} prefix - Filename prefix
 */
async function createLocalImages(descriptions, outputDir, prefix = 'img') {
  const createdImages = [];
  
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i];
    
    if (!description || typeof description !== 'string') {
      console.warn(`Skipping invalid description at index ${i}`);
      continue;
    }
    
    try {
      const filename = `${prefix}-${i + 1}-${Date.now()}.svg`;
      const filepath = path.join(outputDir, filename);
      
      await createLocalImage(description, filepath);
      
      createdImages.push({
        description,
        path: filepath,
        filename
      });
      
    } catch (error) {
      console.error(`Failed to create image ${i + 1}:`, error.message);
      createdImages.push({
        description,
        path: null,
        filename: null,
        error: error.message
      });
    }
  }
  
  return createdImages;
}

/**
 * Extract image descriptions from slide data (same as stockImageService)
 */
function extractImageDescriptions(slideData, limits = { slides: 5, resources: 2 }) {
  const slideDescriptions = [];
  const resourceDescriptions = [];
  
  console.log(`📋 Extracting image descriptions from slide data...`);
  console.log(`   Slides in data: ${slideData.slides ? slideData.slides.length : 0}`);
  
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
 * Get local images for a lesson
 * @param {Object} slideData - The slide content
 * @param {string} outputDir - Directory to save images
 */
async function getLocalImagesForLesson(slideData, outputDir) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    const descriptions = extractImageDescriptions(slideData);
    
    if (descriptions.length === 0) {
      console.log('No images to create');
      return new Map();
    }
    
    console.log(`Creating ${descriptions.length} local placeholder images...`);
    
    const createdImages = await createLocalImages(descriptions, outputDir, 'lesson');
    
    const imageMap = new Map();
    createdImages.forEach(img => {
      if (img.path) {
        imageMap.set(img.description, img.path);
      }
    });
    
    console.log(`Successfully created ${imageMap.size} out of ${descriptions.length} images`);
    
    return imageMap;
    
  } catch (error) {
    console.error('Error in getLocalImagesForLesson:', error);
    throw error;
  }
}

/**
 * Search for local images (generates placeholders)
 * @param {string} query - Search query
 * @param {number} count - Number of images to generate
 * @param {string} outputDir - Directory to save images
 * @returns {Promise<Array<string>>} Array of image URLs
 */
async function searchLocalImages(query, count = 4, outputDir) {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    const imageUrls = [];
    const styles = ['default', 'minimal', 'abstract', 'geometric'];
    
    for (let i = 0; i < count; i++) {
      // Create slightly different descriptions for variety
      const variant = styles[i % styles.length];
      const filename = `search-${Date.now()}-${i}.svg`;
      const filepath = path.join(outputDir, filename);
      
      // Create SVG with variant
      const svg = createSVGPlaceholder(`${query} (${variant})`);
      await fs.writeFile(filepath, svg, 'utf8');
      
      // Return relative URL
      imageUrls.push(`/uploads/search/${filename}`);
    }
    
    return imageUrls;
  } catch (error) {
    console.error('Error searching local images:', error);
    return [];
  }
}

module.exports = {
  createLocalImage,
  createLocalImages,
  getLocalImagesForLesson,
  extractImageDescriptions,
  searchLocalImages
};

