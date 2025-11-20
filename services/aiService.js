const OpenAI = require('openai');
const curriculumStandards = require('../data/curriculum-standards');
const powerpointTemplate = require('../data/powerpoint-template');
const { detectTemplate } = require('../data/lesson-templates');
const { loadSubjectOverviews, formatSubjectOverviewsForPrompt } = require('../utils/subjectOverviewLoader');
const { findRelevantSubjectOverviews } = require('../utils/relevanceMatcher');
const { summarizeContent } = require('./summarizationService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

/**
 * Determine Key Stage from topic/notes
 */
function determineKeyStage(topic, notes) {
  const text = `${topic} ${notes}`.toLowerCase();
  
  // Simple heuristics - can be improved
  if (text.includes('year 1') || text.includes('year 2') || text.includes('reception') || text.includes('ks1')) {
    return 'ks1';
  }
  if (text.includes('year 3') || text.includes('year 4') || text.includes('year 5') || text.includes('year 6') || text.includes('ks2')) {
    return 'ks2';
  }
  
  // Default to KS2 if unclear
  return 'ks2';
}

/**
 * Determine subject from topic/notes
 */
function determineSubject(topic, notes) {
  const text = `${topic} ${notes}`.toLowerCase();
  
  const subjectKeywords = {
    english: ['english', 'reading', 'writing', 'literature', 'poetry', 'grammar', 'spelling', 'comprehension'],
    mathematics: ['math', 'maths', 'number', 'calculation', 'addition', 'subtraction', 'multiplication', 'division', 'fraction', 'geometry', 'shape'],
    science: ['science', 'biology', 'chemistry', 'physics', 'experiment', 'investigation', 'habitat', 'animal', 'plant', 'material', 'force', 'light', 'sound'],
    computing: ['computing', 'coding', 'programming', 'algorithm', 'digital', 'technology', 'ict'],
    art: ['art', 'drawing', 'painting', 'sculpture', 'creative', 'design'],
    history: ['history', 'historical', 'past', 'ancient', 'timeline', 'chronology'],
    geography: ['geography', 'geographical', 'map', 'country', 'continent', 'location', 'climate', 'weather'],
    spanish: ['spanish', 'español', 'language', 'foreign language'],
    dt: ['dt', 'design technology', 'design and technology', 'd&t', 'design tech']
  };
  
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return subject;
    }
  }
  
  return 'general';
}

/**
 * Get relevant curriculum standards
 */
function getRelevantStandards(keyStage, subject) {
  if (!curriculumStandards[keyStage]) {
    return [];
  }
  
  if (subject === 'general') {
    return [];
  }
  
  const standards = curriculumStandards[keyStage][subject];
  if (Array.isArray(standards)) {
    return standards;
  }
  
  // If subject has subcategories (like english.reading)
  if (typeof standards === 'object') {
    return Object.values(standards).flat();
  }
  
  return [];
}

/**
 * Process teacher notes and generate slide content using AI
 */
async function processNotesAndGenerateSlides({
  topic,
  notes,
  duration,
  needsResources,
  isInteractive,
  needsSENDScaffolding,
  fileContent,
  curriculumCode,
  keyVocabulary
}) {
  const keyStage = determineKeyStage(topic, notes);
  const subject = determineSubject(topic, notes);
  const relevantStandards = getRelevantStandards(keyStage, subject);
  
  // Load subject overview files to enhance AI understanding (with token optimization)
  // First, load files from the detected subject folder
  const subjectOverviews = await loadSubjectOverviews(subject, topic);
  
  // Additionally, if user uploaded files, find relevant subject overview files across all subjects
  let relevantOverviews = [];
  if (fileContent && fileContent.trim().length > 0) {
    relevantOverviews = await findRelevantSubjectOverviews(fileContent, 2); // Max 2 additional relevant files
  }
  
  // Combine both sets of overviews (avoid duplicates by filename)
  const allOverviews = [...subjectOverviews];
  const existingFilenames = new Set(subjectOverviews.map(o => o.filename));
  
  // Use for...of loop to properly handle async/await
  for (const relevant of relevantOverviews) {
    // Only add if not already included from subject folder
    if (!existingFilenames.has(relevant.filename)) {
      // Process the relevant file content (summarize if large)
      let processedContent = relevant.content;
      if (processedContent.length > 2000) {
        // Summarize large relevant files
        try {
          processedContent = await summarizeContent(processedContent, 1500);
        } catch (error) {
          processedContent = processedContent.substring(0, 1500) + '\n\n[... content truncated ...]';
        }
      } else if (processedContent.length > 1500) {
        processedContent = processedContent.substring(0, 1500) + '\n\n[... content truncated ...]';
      }
      
      allOverviews.push({
        filename: `${relevant.folder}/${relevant.filename}`,
        content: processedContent
      });
    }
  }
  
  const subjectOverviewContent = formatSubjectOverviewsForPrompt(allOverviews, 2000);
  
  // Detect appropriate template to reduce token usage
  const template = detectTemplate(topic, notes, subject, keyStage);
  const usingTemplate = !!template;
  
  // Truncate content more aggressively to prevent token overflow
  // Limit to ~1500 chars each (roughly 375 tokens) to stay well under limits
  const truncateText = (text, maxLength = 1500) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '\n\n[... content truncated for length ...]';
  };
  
  // Combine all text content (with aggressive truncation)
  // Notes and fileContent should already be summarized, but add safety truncation
  const allContent = [
    `Topic: ${topic}`,
    `Notes: ${truncateText(notes)}`,
    fileContent ? `File Content: ${truncateText(fileContent)}` : ''
  ].filter(Boolean).join('\n\n');
  
  // Calculate approximate number of slides based on duration
  // Rough estimate: 2-3 minutes per slide
  const estimatedSlides = Math.max(5, Math.min(30, Math.floor(parseInt(duration) / 2.5)));
  
  // Build curriculum context (limit to 2 standards to save tokens)
  let curriculumContext = relevantStandards.length > 0
    ? `\n\nRelevant UK National Curriculum Standards (${keyStage.toUpperCase()} - ${subject}):\n${relevantStandards.slice(0, 2).map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : '';
    
  if (curriculumCode) {
    curriculumContext += `\n\nSPECIFIC CURRICULUM FOCUS: ${curriculumCode}`;
  }

  const vocabularyInstruction = keyVocabulary 
    ? `\n\nKEY VOCABULARY TO INCLUDE: ${keyVocabulary}\nEnsure these terms are defined and used correctly in the slides and resources.` 
    : '';
  
  // Use template structure if available, otherwise use minimal example
  let structuralExample;
  let templateGuidance = '';
  
  if (usingTemplate) {
    // Create example based on template structure
    const templateExample = {
      title: "Lesson Title",
      learningQuestion: "Main learning question",
      objectives: ["Objective 1", "Objective 2", "Objective 3"],
      slides: Object.values(template.structure).map((slideType, index) => ({
        slideNumber: index + 1,
        title: `[${slideType.type} slide title]`,
        content: `[${slideType.type} content - use structure: ${slideType.commonContent.join(', ')}]`,
        type: slideType.type,
        notes: slideType.notes,
        imageSuggestions: ["Image description 1", "Image description 2"]
      })),
      resources: ["Resource 1", "Resource 2"],
      resourceContent: needsResources ? {
        description: "Resource sheets description",
        items: [{
          title: "Resource title",
          instructions: "Activity instructions",
          content: "Full resource content/text (paragraphs, reading material, etc.)",
          questions: [{
            type: "multiple-choice",
            question: "What is the capital of Egypt?",
            options: ["Cairo", "Alexandria", "Luxor", "Giza"]
          }, {
            type: "fill-in-blank",
            question: "The Ancient Egyptians built _____ along the Nile River."
          }, {
            type: "true-false",
            question: "The River Nile flows from south to north."
          }],
          images: [{
            description: "Map of Ancient Egypt showing the Nile River and major cities",
            placement: "top"
          }, {
            description: "Diagram of Egyptian hieroglyphics alphabet",
            placement: "middle"
          }]
        }]
      } : undefined,
      differentiation: {
        support: "Support strategies",
        stretch: "Stretch strategies"
      }
    };
    
    structuralExample = JSON.stringify(templateExample, null, 2);
    templateGuidance = `\n\nTEMPLATE: Use the "${template.name}" template structure. Follow the slide sequence: ${Object.keys(template.structure).join(' → ')}. Each slide type has specific purposes:\n${Object.entries(template.structure).map(([key, slideType]) => `- ${slideType.type.toUpperCase()}: ${slideType.notes}`).join('\n')}`;
  } else {
    // Create a minimal structural example
    const minimalExample = {
      title: "Lesson Title",
      learningQuestion: "Main learning question",
      objectives: ["Objective 1", "Objective 2", "Objective 3"],
      slides: [
        {
          slideNumber: 1,
          title: "Slide title",
          content: "Slide content (bullets or paragraphs)",
          type: "starter|main|activity|assessment|plenary",
          notes: "Teacher guidance",
          imageSuggestions: ["Image description 1", "Image description 2"]
        }
      ],
      resources: ["Resource 1", "Resource 2"],
      resourceContent: needsResources ? {
        description: "Complete resource sheet with all materials needed",
        items: [{
          contentText: "MANDATORY: The River Nile was the most important feature of Ancient Egypt. It flowed from south to north, bringing water to the desert. Every year, the Nile flooded, depositing rich, black soil on the riverbanks. This made the land fertile for growing crops like wheat and barley. Ancient Egyptians built their villages along the Nile and used boats to travel and transport goods. Without the Nile, Ancient Egypt could not have existed. [THIS FIELD IS REQUIRED - 150-300 words of actual content students will read]",
          title: "Activity 1: Understanding the Nile",
          instructions: "Read the text above carefully, then answer the questions below",
          tableQuestions: [
            "What is the capital of Ancient Egypt?",
            "Name two important features of the River Nile"
          ],
          gapFillQuestions: [
            "The River Nile flows through _____ and provides _____ for farming.",
            "Ancient Egyptians used _____ to write and built _____ as tombs."
          ],
          openQuestions: [
            "Explain why the Nile was called 'the gift of Egypt'.",
            "Describe daily life for children in Ancient Egypt."
          ],
          visualFormat: {
            type: "timeline",
            data: {
              events: ["Pyramids built", "Tutankhamun ruled"],
              dates: ["2686 BCE", "1332 BCE"]
            }
          },
          imageSuggestions: ["Map of Ancient Egypt showing the Nile Delta"]
        }]
      } : undefined,
      differentiation: {
        support: "Support strategies",
        stretch: "Stretch strategies"
      }
    };
    
    structuralExample = JSON.stringify(minimalExample, null, 2);
  }
  
  const systemPrompt = `Create engaging, curriculum-aligned lesson presentations for UK primary schools (KS1/KS2).

Requirements:
- Age-appropriate for ${keyStage.toUpperCase()}
- Align with UK National Curriculum
- Clear learning objectives
${usingTemplate ? `- Use the "${template.name}" template structure${templateGuidance}` : '- Structure: starter → main → activity → assessment → plenary'}
- Include differentiation (stretch & support)
  ${needsResources ? `- 🚨 ABSOLUTE REQUIREMENT FOR RESOURCES - READ CAREFULLY:
      
      EVERY resource item MUST START with contentText as the FIRST FIELD.
      The contentText field is 150-300 words of ACTUAL CONTENT that appears ON THE RESOURCE SHEET.
      
      ⚠️ contentText MUST BE FIRST IN THE JSON STRUCTURE:
      {
        contentText: "150-300 words of actual content here...",
        title: "Activity title",
        instructions: "Instructions here",
        ...other fields
      }
      
      What goes in contentText by subject:
      • ENGLISH: Full model paragraph/poem/story that students read (not "see the model text" - BE the model text)
      • HISTORY: Complete historical account/source document with dates and details
      • SCIENCE: Full experiment procedure OR information text about the topic
      • GEOGRAPHY: Complete case study OR location description with facts
      • MATHEMATICS: Worked example with step-by-step solution OR explanation of concept
      
      After contentText, add:
      1. title - Activity name
      2. instructions - What students should do
      3. tableQuestions (5-6) - Questions answerable from the contentText
      4. gapFillQuestions (3-4) - Fill-in-the-blank from contentText vocabulary
      5. openQuestions (3-4) - Deeper thinking questions
      6. visualFormat - Subject-specific interactive element:
         MATH: { type: "multiplicationGrid", rows: [2,3,5], cols: [4,6,10] }
         SCIENCE: { type: "labelingDiagram", diagramType: "plant", labels: ["roots","stem","leaves"] }
         HISTORY: { type: "timeline", events: ["Event 1","Event 2"], dates: ["Date 1","Date 2"] }
         GEOGRAPHY: { type: "labelMap", locations: ["City1","City2"] }
      7. imageSuggestions - 1-2 image descriptions
      
      🚫 NEVER write instructions like "Read the model text below" without INCLUDING the actual text!
      🚫 NEVER reference "the template" or "the passage" without BEING the template/passage!
      ✅ The contentText IS what students read - it must be complete and standalone!` : ''}
${isInteractive ? '- Include hands-on activities/experiments' : ''}
${needsSENDScaffolding ? '- Include scaffolded resources for SEND/lower performers' : ''}

${!usingTemplate ? 'Slide types: starter (hook), main (teaching), activity (practice), assessment (check), plenary (review)\n' : ''}Content: ${keyStage === 'ks1' ? 'Simple language, visuals, concrete examples' : 'More complex language, abstract concepts'}

CRITICAL - IMAGE SUGGESTIONS:
- EVERY slide MUST include imageSuggestions array with 1-3 descriptive image prompts
- Descriptions should be specific, educational, and relevant to the slide content
- Example: "Diagram showing water cycle with evaporation, condensation, and precipitation"
- Example: "Photo of Victorian classroom with students at wooden desks"
- These will be used to find appropriate educational images

Respond with valid JSON only. Follow this structure:
${structuralExample}`;

  // Build subject overview context if available
  const subjectOverviewContext = subjectOverviewContent
    ? `\n\nSubject-Specific Guidance and Resources:\n${subjectOverviewContent}\n\nUse this subject-specific information to enhance the lesson content, ensure accuracy, and align with best practices for teaching ${subject}.`
    : '';

  const userPrompt = `Create a ${duration}-minute ${keyStage.toUpperCase()} ${subject} lesson.
  
  ${curriculumContext}${vocabularyInstruction}${subjectOverviewContext}
  
  Teacher requirements:
${allContent}

Generate ~${estimatedSlides} slides: starter → main → activity → assessment → plenary.

  ${needsResources ? `\n
🚨 CRITICAL - READ THIS CAREFULLY:
For resourceContent.items, the FIRST field in EVERY item MUST be "contentText" containing 150-300 words.

JSON structure MUST be:
{
  resourceContent: {
    items: [
      {
        contentText: "[WRITE 150-300 WORDS OF ACTUAL CONTENT HERE - this is what students read]",
        title: "Activity name",
        instructions: "What to do",
        tableQuestions: [...],
        ...
      }
    ]
  }
}

The contentText is NOT optional. It is NOT "TBD". It is 150-300 words of complete, standalone content.
If you write "Read the model paragraph" in instructions, the contentText field MUST CONTAIN that paragraph.
If you write "Use this template", the contentText field MUST CONTAIN that template.

WITHOUT contentText, the resource is completely useless and will fail validation.
\n` : ''}

MANDATORY: EVERY slide MUST include "imageSuggestions" array with 1-3 specific, descriptive image prompts (e.g., "Map of Ancient Egypt showing the Nile Delta", "Diagram of photosynthesis process with labeled parts").`;

  try {
    // Use gpt-4o-2024-08-06 or gpt-4o which has 128k context window
    // Try the latest model first, fallback to gpt-4o
    let model = "gpt-4o-2024-08-06"; // Latest gpt-4o with 128k context
    let useJsonMode = true;
    
    // Log prompt sizes for debugging
    const systemPromptTokens = Math.ceil(systemPrompt.length / 4); // Rough estimate
    const userPromptTokens = Math.ceil(userPrompt.length / 4);
    const totalInputTokens = systemPromptTokens + userPromptTokens;
    console.log(`Estimated token usage - System: ${systemPromptTokens}, User: ${userPromptTokens}, Total: ${totalInputTokens}`);
    
    if (totalInputTokens > 10000) {
      console.warn(`Warning: High token usage detected (${totalInputTokens}). Consider reducing content.`);
    }
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000, // Increased to allow for questions and images in resources
        response_format: { type: "json_object" }
      });
    } catch (jsonModeError) {
      // If JSON mode fails, check if it's a context length error
      if (jsonModeError.message && jsonModeError.message.includes('context length')) {
        throw new Error(`Context length exceeded. System prompt: ${systemPromptTokens} tokens, User prompt: ${userPromptTokens} tokens. Total: ${totalInputTokens} tokens. Please reduce input content.`);
      }
      
      // Fallback: try without JSON mode and parse manually
      console.log('JSON mode not supported, falling back to text parsing');
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-2024-08-06",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 8000 // Increased to allow for questions and images in resources
        });
        useJsonMode = false;
      } catch (fallbackError) {
        // Try gpt-4o without version
        console.log('Trying gpt-4o without version');
        try {
          completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 8000 // Increased to allow for questions and images in resources
          });
          useJsonMode = false;
        } catch (gpt4oError) {
          // Last resort: gpt-4-turbo-preview (128k context)
          console.log('Falling back to gpt-4-turbo-preview');
          completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 8000 // Increased to allow for questions and images in resources
          });
          useJsonMode = false;
        }
      }
    }
    
    // Validate response structure
    if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Invalid response from OpenAI API: missing choices or message');
    }
    
    let responseContent = completion.choices[0].message.content;
    
    if (!responseContent) {
      throw new Error('Empty response from OpenAI API');
    }
    
    // If not using JSON mode, extract JSON from response
    if (!useJsonMode) {
      // Try to extract JSON from the response (might have markdown code blocks)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseContent = jsonMatch[0];
      }
    }
    
    let slideData;
    try {
      slideData = JSON.parse(responseContent);
      
      // DEBUG: Log resourceContent structure to verify contentText is present
      if (slideData.resourceContent && slideData.resourceContent.items) {
        console.log('\n🔍 AI RESPONSE - Resource Content Structure:');
        slideData.resourceContent.items.forEach((item, index) => {
          console.log(`  Item ${index + 1}:`);
          console.log(`    - title: ${item.title || 'MISSING'}`);
          console.log(`    - contentText: ${item.contentText ? `PRESENT (${item.contentText.length} chars)` : '❌ MISSING'}`);
          if (item.contentText) {
            console.log(`    - contentText preview: "${item.contentText.substring(0, 100)}..."`);
          }
        });
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response content:', responseContent.substring(0, 500));
      throw new Error('Failed to parse AI response. The response may not be valid JSON.');
    }
    
    // Validate required fields
    if (!slideData.title || !slideData.slides || !Array.isArray(slideData.slides)) {
      throw new Error('AI response missing required fields: title and slides array are required');
    }
    
    return {
      ...slideData,
      keyStage,
      subject,
      estimatedSlides
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Failed to generate slides: ${error.message}`);
  }
}


/**
 * Regenerate a single slide using AI
 * @param {Object} params - { slideContext, lessonTopic, slideType, allSlides }
 * @returns {Promise<Object>} Regenerated slide object
 */
async function regenerateSlide({ slideContext, lessonTopic, slideType, allSlides = [] }) {
  try {
    const keyStage = determineKeyStage(lessonTopic, '');
    const subject = determineSubject(lessonTopic, '');
    
    // Build context from other slides
    const otherSlidesContext = allSlides
      .filter((s, idx) => s.title !== slideContext.title) // Exclude current slide
      .slice(0, 3) // Limit to 3 slides for context
      .map((s, idx) => `Slide ${idx + 1}: ${s.title} - ${s.content?.substring(0, 100)}...`)
      .join('\n');

    const systemPrompt = `You are an expert primary school teacher creating educational slides for ${keyStage.toUpperCase()} ${subject} lessons.

Your task is to regenerate a single slide that:
- Maintains the same slide type (${slideType || slideContext.type})
- Is appropriate for the lesson topic: "${lessonTopic}"
- Is suitable for ${keyStage.toUpperCase()} students
- Follows UK National Curriculum standards
- Is clear, engaging, and educational

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Slide title (concise, clear)",
  "content": "Main content (bullets or paragraphs)",
  "type": "${slideType || slideContext.type}",
  "notes": "Teacher notes (optional)",
  "imageSuggestions": ["suggestion 1", "suggestion 2"]
}`;

    const userPrompt = `Regenerate this slide for the lesson topic: "${lessonTopic}"

Current slide:
- Title: ${slideContext.title}
- Type: ${slideType || slideContext.type}
- Content: ${slideContext.content || 'No content'}

${otherSlidesContext ? `\nContext from other slides in this lesson:\n${otherSlidesContext}\n` : ''}

Please create a fresh, improved version of this slide that:
1. Keeps the same slide type
2. Is relevant to "${lessonTopic}"
3. Is appropriate for ${keyStage.toUpperCase()} students
4. Is clear and engaging
5. Includes helpful teacher notes if applicable
6. Suggests relevant images

Return the regenerated slide as JSON only.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8, // Slightly higher for more variation
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    let regeneratedSlide;

    try {
      regeneratedSlide = JSON.parse(responseContent);
    } catch (parseError) {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        regeneratedSlide = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and merge with original slide structure
    const finalSlide = {
      ...slideContext, // Preserve original structure
      title: regeneratedSlide.title || slideContext.title,
      content: regeneratedSlide.content || slideContext.content,
      type: regeneratedSlide.type || slideType || slideContext.type,
      notes: regeneratedSlide.notes || slideContext.notes || '',
      imageSuggestions: regeneratedSlide.imageSuggestions || slideContext.imageSuggestions || []
    };

    console.log(`✓ Slide regenerated: "${finalSlide.title}"`);
    return finalSlide;

  } catch (error) {
    console.error('Slide regeneration error:', error);
    throw new Error(`Failed to regenerate slide: ${error.message}`);
  }
}

/**
 * Generate a unit plan outline (series of lessons)
 */
async function generateUnitPlan({ topic, keyStage, subject, numLessons, additionalContext }) {
  const prompt = `Create a ${numLessons}-lesson unit plan for ${keyStage.toUpperCase()} ${subject} on "${topic}".
  
  Context: ${additionalContext || 'None'}
  
  For each lesson, provide:
  1. Title
  2. Learning Objective
  3. Brief summary of activities
  
  Respond in JSON format:
  {
    "unitTitle": "Unit Title",
    "lessons": [
      { "lessonNumber": 1, "title": "...", "objective": "...", "summary": "..." },
      ...
    ]
  }`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert curriculum planner." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Unit Plan Error:', error);
    throw new Error('Failed to generate unit plan');
  }
}

module.exports = {
  processNotesAndGenerateSlides,
  regenerateSlide,
  generateUnitPlan,
  determineKeyStage,
  determineSubject
};

