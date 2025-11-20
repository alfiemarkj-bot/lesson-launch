const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

/**
 * Summarize long content to extract key points for AI processing
 * Uses lightweight gpt-3.5-turbo for cost efficiency
 */
async function summarizeContent(content, maxLength = 1500) {
  // If content is already short enough, return as-is
  if (!content || content.length <= maxLength) {
    return content;
  }

  try {
    const summary = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a content summarizer. Extract the key points, learning objectives, important details, and essential information from the provided content. Keep the summary concise but comprehensive. Focus on information relevant to creating lesson plans and educational content."
        },
        {
          role: "user",
          content: `Summarize the following content, extracting all key points, learning objectives, important details, and essential information:\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: Math.floor(maxLength / 2) // Rough estimate: 1 token ≈ 4 characters
    });

    // Validate response structure
    if (!summary || !summary.choices || !summary.choices[0] || !summary.choices[0].message) {
      throw new Error('Invalid response from OpenAI API during summarization');
    }
    
    const summaryText = summary.choices[0].message.content;
    if (!summaryText) {
      throw new Error('Empty summary response from OpenAI API');
    }
    
    return summaryText.trim();
  } catch (error) {
    console.error('Error summarizing content:', error);
    // Fallback: simple truncation if summarization fails
    return content.substring(0, maxLength) + '\n\n[... content truncated ...]';
  }
}

/**
 * Summarize multiple file contents
 */
async function summarizeFiles(fileContents) {
  if (!fileContents || fileContents.length === 0) {
    return [];
  }

  const summaries = await Promise.all(
    fileContents.map(async (fileContent) => {
      // Extract filename if present
      const filenameMatch = fileContent.match(/^\[From file: (.+)\]\n/);
      const filename = filenameMatch ? filenameMatch[1] : 'Unknown file';
      const content = filenameMatch ? fileContent.substring(filenameMatch[0].length) : fileContent;

      const summary = await summarizeContent(content, 1500);
      return `[From file: ${filename}]\n${summary}`;
    })
  );

  return summaries;
}

module.exports = {
  summarizeContent,
  summarizeFiles
};

