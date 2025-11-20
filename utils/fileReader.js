const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const PptxParser = require('node-pptx-parser').default;

/**
 * Read text from various file types
 */
async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    switch (ext) {
      case '.txt':
      case '.md':
        return await readTextFile(filePath);
      
      case '.docx':
        return await readDocxFile(filePath);
      
      case '.pdf':
        return await readPdfFile(filePath);
      
      case '.pptx':
        return await readPptxFile(filePath);
      
      case '.doc':
        // .doc files require different handling, for now return error
        throw new Error('Legacy .doc files are not supported. Please convert to .docx or .txt');
      
      default:
        // Try to read as text for other file types
        return await readTextFile(filePath);
    }
  } catch (error) {
    throw new Error(`Error reading file: ${error.message}`);
  }
}

async function readTextFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.trim();
}

async function readDocxFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

async function readPdfFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function readPptxFile(filePath) {
  try {
    const parser = new PptxParser(filePath);
    const slides = await parser.extractText();
    
    // Combine text from all slides
    const allText = slides.map((slide, index) => {
      const slideText = slide.text && slide.text.length > 0 
        ? slide.text.join('\n') 
        : '';
      return `[Slide ${index + 1}]\n${slideText}`;
    }).filter(text => text.trim().length > 0).join('\n\n');
    
    return allText.trim();
  } catch (error) {
    throw new Error(`Error reading PowerPoint file: ${error.message}`);
  }
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if file is a supported text/document type
 */
function isSupportedDocumentType(filename) {
  const supportedTypes = ['.txt', '.docx', '.pdf', '.md', '.pptx'];
  const ext = getFileExtension(filename);
  return supportedTypes.includes(ext);
}

module.exports = {
  readFileContent,
  getFileExtension,
  isSupportedDocumentType
};

