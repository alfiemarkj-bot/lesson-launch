const fs = require('fs').promises;
const path = require('path');
const { readFileContent } = require('./fileReader');
const { summarizeContent } = require('../services/summarizationService');

/**
 * Map subject names from determineSubject() to folder names in Subject Overviews
 */
function getSubjectFolderName(subject) {
  const subjectMap = {
    'english': 'English',
    'mathematics': 'Mathematics',
    'science': 'Science',
    'computing': 'Computing',
    'art': 'Art',
    'history': 'History',
    'geography': 'Geography',
    'spanish': 'Spanish',
    'dt': 'DT'
  };
  
  return subjectMap[subject.toLowerCase()] || null;
}

/**
 * Load and process files from a subject overview folder
 * Returns an array of { filename, content } objects with optimized content
 * 
 * Token optimization strategies:
 * - Limits number of files (max 5)
 * - Prioritizes smaller files first
 * - Summarizes large files automatically
 * - Per-file truncation before combining
 */
async function loadSubjectOverviews(subject, topic = '') {
  const folderName = getSubjectFolderName(subject);
  
  if (!folderName) {
    return []; // Subject doesn't have a folder
  }
  
  const subjectOverviewPath = path.join(__dirname, '..', 'Subject Overviews', folderName);
  
  try {
    // Check if folder exists
    await fs.access(subjectOverviewPath);
  } catch (error) {
    // Folder doesn't exist, return empty array
    return [];
  }
  
  try {
    // Read all files in the folder
    const files = await fs.readdir(subjectOverviewPath);
    
    // Filter to only supported document types
    const supportedFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.txt', '.docx', '.pdf', '.md', '.pptx'].includes(ext);
    });
    
    if (supportedFiles.length === 0) {
      return [];
    }
    
    // Get file stats to prioritize smaller/newer files (more token efficient)
    const filesWithStats = await Promise.all(
      supportedFiles.map(async (filename) => {
        try {
          const filePath = path.join(subjectOverviewPath, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          };
        } catch (error) {
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by size (smallest first) to prioritize smaller files
    const validFiles = filesWithStats
      .filter(f => f !== null)
      .sort((a, b) => a.size - b.size)
      .slice(0, 5); // Limit to 5 files max for token efficiency
    
    if (validFiles.length === 0) {
      return [];
    }
    
    // Read and process files (with summarization for large content)
    const fileContents = await Promise.all(
      validFiles.map(async (fileInfo) => {
        try {
          const content = await readFileContent(fileInfo.path);
          const trimmedContent = content.trim();
          
          // If content is large (>2000 chars), summarize it
          // This is more token-efficient than truncating
          let processedContent = trimmedContent;
          if (trimmedContent.length > 2000) {
            console.log(`Summarizing large subject overview file: ${fileInfo.filename} (${trimmedContent.length} chars)`);
            try {
              processedContent = await summarizeContent(trimmedContent, 1500);
            } catch (summarizeError) {
              // If summarization fails, just truncate
              console.warn(`Summarization failed for ${fileInfo.filename}, truncating instead`);
              processedContent = trimmedContent.substring(0, 1500) + '\n\n[... content truncated ...]';
            }
          } else if (trimmedContent.length > 1500) {
            // Truncate moderately large files
            processedContent = trimmedContent.substring(0, 1500) + '\n\n[... content truncated ...]';
          }
          
          return {
            filename: fileInfo.filename,
            content: processedContent
          };
        } catch (error) {
          console.error(`Error reading subject overview file ${fileInfo.filename}:`, error.message);
          return null; // Skip files that can't be read
        }
      })
    );
    
    // Filter out null results (files that failed to read)
    return fileContents.filter(item => item !== null);
    
  } catch (error) {
    console.error(`Error loading subject overviews for ${subject}:`, error.message);
    return [];
  }
}

/**
 * Format subject overview content for AI prompt
 * Limits total content length to prevent token overflow
 * Uses smart truncation: keeps file headers and distributes content evenly
 */
function formatSubjectOverviewsForPrompt(overviews, maxLength = 2000) {
  if (!overviews || overviews.length === 0) {
    return '';
  }
  
  // Calculate available space per file (reserve space for headers and separators)
  const headerOverhead = overviews.length * 50; // Approximate space for filenames and separators
  const availableContentSpace = maxLength - headerOverhead;
  const maxPerFile = Math.floor(availableContentSpace / overviews.length);
  
  // Truncate each file's content to fit within the limit
  const truncatedOverviews = overviews.map(overview => {
    let content = overview.content;
    if (content.length > maxPerFile) {
      content = content.substring(0, maxPerFile) + '\n[...]';
    }
    return `[From ${overview.filename}]\n${content}`;
  });
  
  // Combine with separators
  const combined = truncatedOverviews.join('\n\n---\n\n');
  
  // Final safety truncation (should rarely be needed due to per-file limits)
  if (combined.length > maxLength) {
    return combined.substring(0, maxLength) + '\n\n[... subject overview content truncated ...]';
  }
  
  return combined;
}

module.exports = {
  loadSubjectOverviews,
  formatSubjectOverviewsForPrompt,
  getSubjectFolderName
};

