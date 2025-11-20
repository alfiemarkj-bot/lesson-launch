const fs = require('fs').promises;
const path = require('path');
const { readFileContent } = require('./fileReader');
const { summarizeContent } = require('../services/summarizationService');

/**
 * Extract keywords from content for relevance matching
 * Returns an array of significant keywords
 */
function extractKeywords(content, maxKeywords = 20) {
  if (!content || typeof content !== 'string') {
    return [];
  }
  
  // Convert to lowercase and split into words
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3); // Only words longer than 3 characters
  
  // Common stop words to exclude
  const stopWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should',
    'their', 'there', 'these', 'them', 'then', 'than', 'they', 'what', 'when',
    'where', 'which', 'while', 'were', 'been', 'being', 'into', 'over', 'under',
    'about', 'above', 'after', 'before', 'during', 'through', 'within', 'without'
  ]);
  
  // Count word frequency
  const wordCounts = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Calculate relevance score between content and keywords
 * Returns a score from 0-1
 */
function calculateRelevance(content, keywords) {
  if (!content || !keywords || keywords.length === 0) {
    return 0;
  }
  
  const contentLower = content.toLowerCase();
  let matches = 0;
  
  keywords.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      matches++;
    }
  });
  
  // Score is percentage of keywords found, with bonus for multiple matches
  return Math.min(1, (matches / keywords.length) * 1.2);
}

/**
 * Find relevant subject overview files based on uploaded file content
 * Searches across all subject folders and returns most relevant files
 */
async function findRelevantSubjectOverviews(uploadedFileContent, maxFiles = 3) {
  if (!uploadedFileContent || uploadedFileContent.trim().length === 0) {
    return [];
  }
  
  // Extract keywords from uploaded content
  const keywords = extractKeywords(uploadedFileContent);
  
  if (keywords.length === 0) {
    return [];
  }
  
  console.log(`Extracted keywords from uploaded files: ${keywords.slice(0, 10).join(', ')}...`);
  
  const subjectOverviewBasePath = path.join(__dirname, '..', 'Subject Overviews');
  
  try {
    // Get all subject folders
    const subjectFolders = await fs.readdir(subjectOverviewBasePath);
    
    // Collect all files with their relevance scores
    const fileRelevanceScores = [];
    
    for (const folder of subjectFolders) {
      const folderPath = path.join(subjectOverviewBasePath, folder);
      
      try {
        // Check if it's a directory
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
          continue;
        }
        
        // Get all files in the folder
        const files = await fs.readdir(folderPath);
        
        // Filter to supported file types
        const supportedFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.txt', '.docx', '.pdf', '.md', '.pptx'].includes(ext);
        });
        
        // Check relevance of each file (read sample first for efficiency)
        for (const filename of supportedFiles) {
          try {
            const filePath = path.join(folderPath, filename);
            
            // For efficiency, read a sample first (filename + first 2000 chars)
            // This avoids reading entire large files just to check relevance
            let sampleContent = filename.toLowerCase() + ' '; // Include filename in relevance
            
            try {
              // Read full content once
              const fullContent = await readFileContent(filePath);
              sampleContent += fullContent.substring(0, 2000).toLowerCase();
              
              // Calculate relevance score based on sample
              const relevance = calculateRelevance(sampleContent, keywords);
              
              if (relevance > 0.1) { // Only include files with at least 10% relevance
                fileRelevanceScores.push({
                  folder,
                  filename,
                  path: filePath,
                  relevance,
                  fullContent // Store full content so we don't need to read again
                });
              }
            } catch (readError) {
              // If we can't read the file, skip it
              continue;
            }
          } catch (error) {
            // Skip files that can't be accessed
            continue;
          }
        }
      } catch (error) {
        // Skip folders that can't be accessed
        continue;
      }
    }
    
    // Sort by relevance (highest first) and get top matches
    const topMatches = fileRelevanceScores
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxFiles);
    
    // Use the full content we already read (no need to re-read)
    const relevantFiles = topMatches.map((file) => ({
      filename: file.filename,
      folder: file.folder,
      content: file.fullContent,
      relevance: file.relevance
    }));
    
    if (relevantFiles.length > 0) {
      console.log(`Found ${relevantFiles.length} relevant subject overview files:`);
      relevantFiles.forEach(file => {
        console.log(`  - ${file.folder}/${file.filename} (relevance: ${(file.relevance * 100).toFixed(1)}%)`);
      });
    }
    
    return relevantFiles;
    
  } catch (error) {
    console.error('Error finding relevant subject overviews:', error.message);
    return [];
  }
}

module.exports = {
  findRelevantSubjectOverviews,
  extractKeywords,
  calculateRelevance
};

