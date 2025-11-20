// Pre-defined lesson templates for common lesson types
// These reduce token usage by providing structure that AI only needs to fill in

const lessonTemplates = {
  science: {
    investigation: {
      name: "Science Investigation",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["What do you already know about [topic]?", "Look at these images/diagrams", "Share your ideas with a partner"],
          notes: "Engage prior knowledge, use visual prompts"
        },
        main: {
          type: "main",
          commonContent: ["Key concepts and explanations", "Scientific vocabulary", "How to conduct the investigation"],
          notes: "Introduce key concepts, explain investigation method"
        },
        activity: {
          type: "activity",
          commonContent: ["Investigation task", "Step-by-step instructions", "What to observe/record"],
          notes: "Hands-on investigation, provide clear instructions"
        },
        assessment: {
          type: "assessment",
          commonContent: ["What did you discover?", "Questions to check understanding", "Record your findings"],
          notes: "Check understanding, assess learning"
        },
        plenary: {
          type: "plenary",
          commonContent: ["What have we learned?", "Key findings", "Next steps or homework"],
          notes: "Consolidate learning, reflect on findings"
        }
      }
    },
    explanation: {
      name: "Science Explanation",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["Review prior learning", "Hook question or observation", "What do you notice?"],
          notes: "Connect to previous learning, engage interest"
        },
        main: {
          type: "main",
          commonContent: ["Key scientific concepts", "How it works", "Examples and diagrams"],
          notes: "Explain concepts clearly with visual aids"
        },
        activity: {
          type: "activity",
          commonContent: ["Practice questions", "Label diagrams", "Complete sentences"],
          notes: "Apply understanding, practice skills"
        },
        assessment: {
          type: "assessment",
          commonContent: ["Quick quiz", "True/false questions", "Explain in your own words"],
          notes: "Assess understanding"
        },
        plenary: {
          type: "plenary",
          commonContent: ["Summary of key points", "What questions do you have?", "Review learning objectives"],
          notes: "Consolidate, address questions"
        }
      }
    }
  },
  mathematics: {
    problemSolving: {
      name: "Math Problem Solving",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["Mental maths warm-up", "Review key skills", "Quick calculation practice"],
          notes: "Warm up mathematical thinking"
        },
        main: {
          type: "main",
          commonContent: ["Introduce problem type", "Model solving strategy", "Key steps and methods"],
          notes: "Teach problem-solving strategy, model examples"
        },
        activity: {
          type: "activity",
          commonContent: ["Practice problems", "Worked examples", "Guided practice"],
          notes: "Practice with support, then independently"
        },
        assessment: {
          type: "assessment",
          commonContent: ["Solve problems independently", "Show your working", "Check your answers"],
          notes: "Assess independent problem-solving"
        },
        plenary: {
          type: "plenary",
          commonContent: ["Share solutions", "Discuss different methods", "What did you learn?"],
          notes: "Share strategies, consolidate learning"
        }
      }
    },
    conceptIntroduction: {
      name: "Math Concept Introduction",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["Quick review", "Hook activity", "What do you notice?"],
          notes: "Engage interest, activate prior knowledge"
        },
        main: {
          type: "main",
          commonContent: ["Introduce new concept", "Key vocabulary", "Examples and non-examples"],
          notes: "Introduce concept clearly with examples"
        },
        activity: {
          type: "activity",
          commonContent: ["Practice with manipulatives", "Complete exercises", "Apply the concept"],
          notes: "Hands-on practice, apply understanding"
        },
        assessment: {
          type: "assessment",
          commonContent: ["Quick check questions", "Demonstrate understanding", "Self-assessment"],
          notes: "Check understanding"
        },
        plenary: {
          type: "plenary",
          commonContent: ["Key points summary", "What can you do now?", "Next steps"],
          notes: "Consolidate learning"
        }
      }
    }
  },
  english: {
    reading: {
      name: "Reading Comprehension",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["Predict from title/cover", "What do you think this is about?", "Activate prior knowledge"],
          notes: "Engage interest, make predictions"
        },
        main: {
          type: "main",
          commonContent: ["Read text together", "Key vocabulary", "Discuss meaning"],
          notes: "Shared reading, explore vocabulary and meaning"
        },
        activity: {
          type: "activity",
          commonContent: ["Comprehension questions", "Find evidence in text", "Discuss with partner"],
          notes: "Check understanding, find evidence"
        },
        assessment: {
          type: "assessment",
          commonContent: ["Answer questions", "Explain your thinking", "What did you learn?"],
          notes: "Assess comprehension"
        },
        plenary: {
          type: "plenary",
          commonContent: ["Share answers", "Key points from text", "What did you enjoy?"],
          notes: "Consolidate understanding"
        }
      }
    },
    writing: {
      name: "Writing Lesson",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["Review writing features", "Look at examples", "What makes good writing?"],
          notes: "Review key features, analyze examples"
        },
        main: {
          type: "main",
          commonContent: ["Model writing", "Key features to include", "Success criteria"],
          notes: "Model writing process, set success criteria"
        },
        activity: {
          type: "activity",
          commonContent: ["Plan your writing", "Write first draft", "Use success criteria"],
          notes: "Guided writing, apply learning"
        },
        assessment: {
          type: "assessment",
          commonContent: ["Share writing", "Peer feedback", "Self-assess against criteria"],
          notes: "Share and assess writing"
        },
        plenary: {
          type: "plenary",
          commonContent: ["What did you learn?", "What will you improve?", "Celebrate good examples"],
          notes: "Reflect on learning, celebrate success"
        }
      }
    }
  },
  general: {
    inquiry: {
      name: "Inquiry-Based Learning",
      structure: {
        starter: {
          type: "starter",
          commonContent: ["Big question", "What do you wonder?", "Share initial ideas"],
          notes: "Pose inquiry question, activate thinking"
        },
        main: {
          type: "main",
          commonContent: ["Explore the question", "Key information", "Different perspectives"],
          notes: "Explore topic, present information"
        },
        activity: {
          type: "activity",
          commonContent: ["Investigate", "Research or explore", "Record findings"],
          notes: "Hands-on investigation or research"
        },
        assessment: {
          type: "assessment",
          commonContent: ["What did you discover?", "Answer the big question", "Present findings"],
          notes: "Assess understanding and findings"
        },
        plenary: {
          type: "plenary",
          commonContent: ["Share discoveries", "What have we learned?", "New questions"],
          notes: "Consolidate learning, extend thinking"
        }
      }
    }
  }
};

/**
 * Detect which template best matches the lesson based on topic and notes
 */
function detectTemplate(topic, notes, subject, keyStage) {
  const text = `${topic} ${notes}`.toLowerCase();
  
  // Check subject-specific templates first
  if (subject === 'science') {
    if (text.includes('investigat') || text.includes('experiment') || text.includes('observe') || text.includes('test')) {
      return lessonTemplates.science.investigation;
    }
    return lessonTemplates.science.explanation;
  }
  
  if (subject === 'mathematics') {
    if (text.includes('problem') || text.includes('solve') || text.includes('word problem')) {
      return lessonTemplates.mathematics.problemSolving;
    }
    return lessonTemplates.mathematics.conceptIntroduction;
  }
  
  if (subject === 'english') {
    if (text.includes('read') || text.includes('comprehension') || text.includes('text') || text.includes('story')) {
      return lessonTemplates.english.reading;
    }
    if (text.includes('write') || text.includes('composition') || text.includes('draft')) {
      return lessonTemplates.english.writing;
    }
  }
  
  // Default to general inquiry template
  return lessonTemplates.general.inquiry;
}

module.exports = {
  lessonTemplates,
  detectTemplate
};

