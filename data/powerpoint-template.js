// Structural template for PowerPoint presentations
// This template guides the AI on how to structure slide content

const powerpointTemplate = {
  structure: {
    title: "A clear, engaging lesson title (e.g., 'Exploring Habitats: Year 3 Science')",
    learningQuestion: "One main question that guides the lesson (e.g., 'What makes a good habitat?')",
    objectives: [
      "Specific, measurable learning objective 1",
      "Specific, measurable learning objective 2",
      "Specific, measurable learning objective 3"
    ],
    slides: [
      {
        slideNumber: 1,
        title: "Clear, concise slide title",
        content: "Main content - can be bullet points or paragraphs. Keep it age-appropriate and engaging.",
        type: "starter|main|activity|assessment|plenary",
        notes: "Brief teacher guidance for this slide",
        imageSuggestions: [
          "Description of relevant image/diagram from KS1/KS2 textbooks (e.g., 'Diagram showing animal habitats', 'Illustration of woodland ecosystem')"
        ]
      }
    ],
    resources: [
      "Specific resource needed (e.g., 'Worksheet: Habitat classification')",
      "Another resource if needed"
    ],
    resourceContent: {
      description: "Full content for resource sheets that accompany the PowerPoint. Include any paragraphs, texts, worksheets, or materials referenced in slides.",
      items: [
        {
          title: "Resource title (e.g., 'Punctuation Practice Paragraph')",
          content: "Full text/paragraph/content that students will work with. Include everything referenced in the PowerPoint (e.g., if a slide says 'Look at this paragraph, what punctuation is missing?', include the full paragraph here).",
          instructions: "Instructions for how students should use this resource"
        }
      ]
    },
    differentiation: {
      support: "Specific ways to help struggling learners (e.g., 'Provide word banks, use visual aids, pair work')",
      stretch: "Specific ways to challenge advanced learners (e.g., 'Research additional habitats, create habitat comparison charts')"
    }
  },
  
  slideTypes: {
    starter: {
      purpose: "Engage students at the beginning of the lesson",
      content: "Should include: hook activity, review of prior learning, or introduction to new topic",
      example: {
        title: "What do you know about habitats?",
        content: "- Look at these pictures\n- Which animals live in which habitat?\n- What do you notice?",
        type: "starter",
        notes: "Use images to prompt discussion. Allow 5 minutes for pair talk."
      }
    },
    main: {
      purpose: "Core teaching content and explanation",
      content: "Should include: key concepts, explanations, examples, visual aids",
      example: {
        title: "Key Features of Habitats",
        content: "A habitat provides:\n- Food and water\n- Shelter and protection\n- Space to live and grow\n- Suitable temperature",
        type: "main",
        notes: "Use diagrams to illustrate each feature. Pause for questions."
      }
    },
    activity: {
      purpose: "Hands-on learning or practice",
      content: "Should include: clear instructions, what students will do, expected outcomes",
      example: {
        title: "Habitat Investigation",
        content: "Your task:\n- Choose a habitat to investigate\n- Record what you find\n- Share your findings with the class",
        type: "activity",
        notes: "Provide investigation sheets. Support groups as needed."
      }
    },
    assessment: {
      purpose: "Check understanding and progress",
      content: "Should include: questions, tasks, or activities to assess learning",
      example: {
        title: "Quick Check",
        content: "- Name three features of a good habitat\n- Why do animals need shelter?\n- Draw an animal in its habitat",
        type: "assessment",
        notes: "Use as exit ticket or mid-lesson check. Differentiate questions."
      }
    },
    plenary: {
      purpose: "Review and consolidate learning",
      content: "Should include: summary of key points, reflection questions, next steps",
      example: {
        title: "What have we learned?",
        content: "Today we discovered:\n- Habitats provide essential needs\n- Different animals need different habitats\n- We can investigate habitats around us",
        type: "plenary",
        notes: "Encourage students to share one thing they learned. Set homework if needed."
      }
    }
  },
  
  contentGuidelines: {
    ageAppropriate: {
      ks1: "Use simple language, short sentences, lots of visuals, concrete examples",
      ks2: "Can use more complex language, longer explanations, abstract concepts"
    },
    formatting: {
      bullets: "Use bullet points for lists and key information",
      paragraphs: "Use paragraphs for explanations and longer content",
      questions: "Include questions to engage students and check understanding",
      activities: "Make activities clear with step-by-step instructions"
    },
    curriculumAlignment: "Ensure all content aligns with UK National Curriculum standards for the subject and key stage",
    engagement: "Include interactive elements, questions, activities, and visual prompts where appropriate"
  },
  
  exampleFullStructure: {
    title: "Exploring Habitats: Year 3 Science",
    learningQuestion: "What makes a good habitat?",
    objectives: [
      "To identify the key features that make a habitat suitable for animals",
      "To compare different habitats and their characteristics",
      "To investigate a local habitat and record findings"
    ],
    slides: [
      {
        slideNumber: 1,
        title: "What do you know about habitats?",
        content: "- Look at these pictures of different places\n- Which animals might live here?\n- What do you notice about each place?",
        type: "starter",
        notes: "Display images of woodland, ocean, desert. Allow 5 minutes for discussion.",
        imageSuggestions: [
          "Photograph or illustration of woodland habitat with visible animals (common in KS2 science textbooks)",
          "Photograph of ocean habitat showing marine life",
          "Illustration of desert habitat with desert animals"
        ]
      },
      {
        slideNumber: 2,
        title: "What is a habitat?",
        content: "A habitat is where an animal or plant lives.\n\nIt provides everything they need to survive:\n- Food and water\n- Shelter\n- Space\n- Right temperature",
        type: "main",
        notes: "Use diagrams to illustrate. Pause for questions after each point.",
        imageSuggestions: [
          "Labelled diagram showing the four basic needs of animals (food, water, shelter, space) - commonly found in KS2 science textbooks",
          "Illustration showing how different animals meet their needs in their habitat"
        ]
      },
      {
        slideNumber: 3,
        title: "Investigating Habitats",
        content: "Your task:\n1. Choose a habitat to investigate (woodland, pond, or garden)\n2. Use your investigation sheet\n3. Record what you find\n4. Be ready to share!",
        type: "activity",
        notes: "Provide investigation sheets. Support groups as needed. Allow 15 minutes.",
        imageSuggestions: [
          "Example investigation sheet template showing habitat recording format (common in KS2 science resources)",
          "Photograph of children conducting habitat investigation outdoors"
        ]
      },
      {
        slideNumber: 4,
        title: "Quick Check",
        content: "Answer these questions:\n- Name three things a habitat provides\n- Why do animals need shelter?\n- What habitat would a fish need?",
        type: "assessment",
        notes: "Use as exit ticket. Differentiate - some students can draw answers.",
        imageSuggestions: [
          "Simple diagram showing different habitats with labels (from KS2 science textbook)"
        ]
      },
      {
        slideNumber: 5,
        title: "What have we learned?",
        content: "Today we discovered:\n- Habitats provide food, water, shelter, and space\n- Different animals need different habitats\n- We can investigate habitats around us",
        type: "plenary",
        notes: "Encourage sharing. Set homework: find one habitat near home.",
        imageSuggestions: [
          "Summary diagram showing key habitat features (commonly found in KS2 science revision materials)"
        ]
      }
    ],
    resources: [
      "Investigation sheets (differentiated)",
      "Habitat images and diagrams",
      "Clipboards and pencils for outdoor work"
    ],
    resourceContent: {
      description: "Resource sheets for students to use alongside the PowerPoint presentation",
      items: [
        {
          title: "Habitat Investigation Sheet",
          content: "Habitat Name: _______________\n\nLocation: _______________\n\nWhat animals did you see?\n1. _______________\n2. _______________\n3. _______________\n\nWhat plants did you find?\n1. _______________\n2. _______________\n\nWhat does this habitat provide?\n- Food: _______________\n- Water: _______________\n- Shelter: _______________\n- Space: _______________\n\nDraw a picture of your habitat:",
          instructions: "Use this sheet to record your findings when investigating a habitat. Fill in all sections and draw what you observe."
        }
      ]
    },
    differentiation: {
      support: "Provide word banks, use visual aids, pair struggling students with confident peers, offer sentence starters",
      stretch: "Challenge students to research additional habitats, create comparison charts, write habitat descriptions"
    }
  }
};

module.exports = powerpointTemplate;

