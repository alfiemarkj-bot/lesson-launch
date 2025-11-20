// UK National Curriculum Standards for KS1 and KS2
// Based on UK Department for Education curriculum guidelines

const curriculumStandards = {
  ks1: {
    english: {
      reading: [
        "Develop pleasure in reading, motivation to read, vocabulary and understanding",
        "Listen to and discuss a wide range of poems, stories and non-fiction",
        "Understand both the books they can already read accurately and fluently and those they listen to",
        "Develop understanding through drawing on what they already know or on background information and vocabulary",
        "Participate in discussion about books, poems and other works",
        "Explain clearly their understanding of what is read to them"
      ],
      writing: [
        "Write sentences by: saying out loud what they are going to write about; composing a sentence orally before writing it",
        "Sequence sentences to form short narratives",
        "Re-read what they have written to check it makes sense",
        "Discuss what they have written with the teacher or other pupils",
        "Read aloud their writing clearly enough to be heard by their peers and the teacher"
      ],
      spokenLanguage: [
        "Listen and respond appropriately to adults and their peers",
        "Ask relevant questions to extend their understanding and knowledge",
        "Use relevant strategies to build their vocabulary",
        "Articulate and justify answers, arguments and opinions",
        "Give well-structured descriptions, explanations and narratives"
      ]
    },
    mathematics: {
      number: [
        "Count to and across 100, forwards and backwards, beginning with 0 or 1, or from any given number",
        "Count, read and write numbers to 100 in numerals",
        "Given a number, identify one more and one less",
        "Identify and represent numbers using objects and pictorial representations",
        "Read and write numbers from 1 to 20 in numerals and words"
      ],
      calculation: [
        "Add and subtract one-digit and two-digit numbers to 20, including zero",
        "Solve one-step problems that involve addition and subtraction",
        "Solve problems involving multiplication and division, using materials, arrays, repeated addition, mental methods, and multiplication and division facts"
      ],
      geometry: [
        "Recognise and name common 2-D and 3-D shapes",
        "Describe position, direction and movement, including whole, half, quarter and three-quarter turns"
      ],
      measures: [
        "Compare, describe and solve practical problems for: lengths and heights; mass/weight; capacity and volume; time",
        "Measure and begin to record lengths and heights, mass/weight, capacity and volume, and time"
      ]
    },
    science: {
      workingScientifically: [
        "Ask simple questions and recognise that they can be answered in different ways",
        "Observe closely, using simple equipment",
        "Perform simple tests",
        "Identify and classify",
        "Use their observations and ideas to suggest answers to questions",
        "Gather and record data to help in answering questions"
      ],
      biology: [
        "Identify and name a variety of common animals including fish, amphibians, reptiles, birds and mammals",
        "Identify and name a variety of common animals that are carnivores, herbivores and omnivores",
        "Describe and compare the structure of a variety of common animals",
        "Identify and name a variety of plants and animals in their habitats"
      ],
      chemistry: [
        "Distinguish between an object and the material from which it is made",
        "Identify and name a variety of everyday materials",
        "Describe the simple physical properties of a variety of everyday materials"
      ],
      physics: [
        "Observe changes across the four seasons",
        "Observe and describe weather associated with the seasons",
        "Identify how the weather affects the world around them"
      ]
    },
    computing: [
      "Understand what algorithms are; how they are implemented as programs on digital devices",
      "Create and debug simple programs",
      "Use logical reasoning to predict the behaviour of simple programs",
      "Use technology purposefully to create, organise, store, manipulate and retrieve digital content"
    ],
    art: [
      "Use a range of materials creatively to design and make products",
      "Use drawing, painting and sculpture to develop and share their ideas, experiences and imagination",
      "Develop a wide range of art and design techniques in using colour, pattern, texture, line, shape, form and space"
    ],
    history: [
      "Develop an awareness of the past, using common words and phrases relating to the passing of time",
      "Know where the people and events they study fit within a chronological framework",
      "Identify similarities and differences between ways of life in different periods"
    ],
    geography: [
      "Name and locate the world's seven continents and five oceans",
      "Name, locate and identify characteristics of the four countries and capital cities of the United Kingdom",
      "Understand geographical similarities and differences through studying the human and physical geography of a small area of the United Kingdom"
    ]
  },
  ks2: {
    english: {
      reading: [
        "Maintain positive attitudes to reading and understanding of what they read",
        "Read further exception words, noting the unusual correspondences between spelling and sound",
        "Listen to and discuss a wide range of fiction, poetry, plays, non-fiction and reference books or textbooks",
        "Read books that are structured in different ways and read for a range of purposes",
        "Use dictionaries to check the meaning of words that they have read",
        "Increase their familiarity with a wide range of books, including fairy stories, myths and legends"
      ],
      writing: [
        "Plan their writing by: discussing writing similar to that which they are planning to write in order to understand and learn from its structure, vocabulary and grammar",
        "Draft and write by: composing and rehearsing sentences orally, progressively building a varied and rich vocabulary",
        "Evaluate and edit by: assessing the effectiveness of their own and others' writing",
        "Proof-read for spelling and punctuation errors"
      ],
      spokenLanguage: [
        "Listen and respond appropriately to adults and their peers",
        "Ask relevant questions to extend their understanding and build their vocabulary",
        "Articulate and justify answers, arguments and opinions",
        "Give well-structured descriptions, explanations and narratives for different purposes"
      ]
    },
    mathematics: {
      number: [
        "Read, write, order and compare numbers to at least 1,000,000 and determine the value of each digit",
        "Count forwards or backwards in steps of powers of 10 for any given number up to 1,000,000",
        "Interpret negative numbers in context, count forwards and backwards with positive and negative whole numbers"
      ],
      calculation: [
        "Add and subtract whole numbers with more than 4 digits, including using formal written methods",
        "Multiply multi-digit numbers up to 4 digits by a two-digit whole number using the formal written method of long multiplication",
        "Divide numbers up to 4 digits by a two-digit whole number using the formal written method of long division"
      ],
      fractions: [
        "Compare and order fractions whose denominators are all multiples of the same number",
        "Identify, name and write equivalent fractions of a given fraction",
        "Add and subtract fractions with the same denominator and denominators that are multiples of the same number"
      ],
      geometry: [
        "Draw 2-D shapes and make 3-D shapes using modelling materials",
        "Recognise angles as a property of shape or a description of a turn",
        "Identify right angles, recognise that two right angles make a half-turn, three make three quarters of a turn and four a complete turn"
      ],
      statistics: [
        "Interpret and present discrete and continuous data using appropriate graphical methods, including bar charts and time graphs",
        "Solve comparison, sum and difference problems using information presented in bar charts, pictograms, tables and other graphs"
      ]
    },
    science: {
      workingScientifically: [
        "Ask relevant questions and use different types of scientific enquiries to answer them",
        "Set up simple practical enquiries, comparative and fair tests",
        "Make systematic and careful observations and, where appropriate, take accurate measurements using standard units",
        "Gather, record, classify and present data in a variety of ways to help in answering questions",
        "Report on findings from enquiries, including oral and written explanations, displays or presentations of results and conclusions"
      ],
      biology: [
        "Describe the life process of reproduction in some plants and animals",
        "Describe the differences in the life cycles of a mammal, an amphibian, an insect and a bird",
        "Describe the ways in which nutrients and water are transported within animals, including humans",
        "Recognise that living things have changed over time and that fossils provide information about living things that inhabited the Earth millions of years ago"
      ],
      chemistry: [
        "Compare and group together everyday materials on the basis of their properties",
        "Give reasons, based on evidence from comparative and fair tests, for the particular uses of everyday materials",
        "Know that some materials will dissolve in liquid to form a solution, and describe how to recover a substance from a solution"
      ],
      physics: [
        "Compare how things move on different surfaces",
        "Notice that some forces need contact between two objects, but magnetic forces can act at a distance",
        "Observe how magnets attract or repel each other and attract some materials and not others",
        "Recognise that light appears to travel in straight lines"
      ]
    },
    computing: [
      "Design, write and debug programs that accomplish specific goals",
      "Use sequence, selection, and repetition in programs",
      "Work with various forms of input and output",
      "Use logical reasoning to explain how some simple algorithms work"
    ],
    art: [
      "Create sketch books to record their observations and use them to review and revisit ideas",
      "Improve their mastery of art and design techniques, including drawing, painting and sculpture with a range of materials",
      "Learn about great artists, architects and designers in history"
    ],
    history: [
      "Develop a chronologically secure knowledge and understanding of British, local and world history",
      "Establish clear narratives within and across the periods they study",
      "Note connections, contrasts and trends over time and develop the appropriate use of historical terms"
    ],
    geography: [
      "Locate the world's countries, using maps to focus on Europe and North and South America",
      "Name and locate counties and cities of the United Kingdom, geographical regions and their identifying human and physical characteristics",
      "Understand geographical similarities and differences through the study of human and physical geography of a region of the United Kingdom"
    ]
  }
};

module.exports = curriculumStandards;

