/**
 * Subject-Specific Color Schemes and Branding
 * Professional, education-focused color palettes for each subject
 */

const SUBJECT_THEMES = {
  history: {
    name: 'History',
    icon: '📜',
    colors: {
      primary: '8B4513',      // Rich brown
      primaryDark: '5D2F0A',  // Darker brown
      secondary: 'DAA520',    // Goldenrod
      accent: 'CD853F',       // Peru (warm tan)
      text: '2C1810',         // Dark brown
      textLight: '5D4E37',    // Taupe
      background: 'F5F0E8',   // Warm cream
      white: 'FFFFFF',
      highlight: 'FFE4B5'     // Moccasin
    },
    gradient: ['8B4513', 'DAA520']
  },
  
  science: {
    name: 'Science',
    icon: '🔬',
    colors: {
      primary: '2E7D32',      // Forest green
      primaryDark: '1B5E20',  // Dark green
      secondary: '00ACC1',    // Cyan
      accent: '66BB6A',       // Light green
      text: '1B3A1B',         // Deep forest
      textLight: '4A7C4E',    // Muted green
      background: 'F1F8E9',   // Light green tint
      white: 'FFFFFF',
      highlight: 'A5D6A7'     // Mint
    },
    gradient: ['2E7D32', '00ACC1']
  },
  
  mathematics: {
    name: 'Mathematics',
    icon: '🔢',
    colors: {
      primary: 'FF6F00',      // Deep orange
      primaryDark: 'E65100',  // Darker orange
      secondary: '424242',    // Charcoal
      accent: 'FFA726',       // Light orange
      text: '212121',         // Almost black
      textLight: '616161',    // Gray
      background: 'FFF8E1',   // Cream
      white: 'FFFFFF',
      highlight: 'FFE0B2'     // Peach
    },
    gradient: ['FF6F00', 'FFA726']
  },
  
  english: {
    name: 'English',
    icon: '📚',
    colors: {
      primary: '6A1B9A',      // Deep purple
      primaryDark: '4A148C',  // Darker purple
      secondary: 'E91E63',    // Pink accent
      accent: '9C27B0',       // Medium purple
      text: '311B92',         // Indigo
      textLight: '673AB7',    // Medium purple
      background: 'F3E5F5',   // Lavender tint
      white: 'FFFFFF',
      highlight: 'CE93D8'     // Light purple
    },
    gradient: ['6A1B9A', 'E91E63']
  },
  
  geography: {
    name: 'Geography',
    icon: '🌍',
    colors: {
      primary: '0277BD',      // Ocean blue
      primaryDark: '01579B',  // Deep blue
      secondary: '558B2F',    // Earth green
      accent: '29B6F6',       // Sky blue
      text: '01344C',         // Deep ocean
      textLight: '4A7A8C',    // Teal
      background: 'E1F5FE',   // Sky tint
      white: 'FFFFFF',
      highlight: '81D4FA'     // Light blue
    },
    gradient: ['0277BD', '558B2F']
  },
  
  art: {
    name: 'Art & Design',
    icon: '🎨',
    colors: {
      primary: 'D32F2F',      // Bold red
      primaryDark: 'C62828',  // Dark red
      secondary: 'FFA000',    // Amber
      accent: 'F57C00',       // Orange
      text: '3E2723',         // Brown
      textLight: '6D4C41',    // Taupe
      background: 'FFF3E0',   // Warm cream
      white: 'FFFFFF',
      highlight: 'FFCC80'     // Peach
    },
    gradient: ['D32F2F', 'FFA000']
  },
  
  computing: {
    name: 'Computing',
    icon: '💻',
    colors: {
      primary: '1976D2',      // Tech blue
      primaryDark: '0D47A1',  // Dark blue
      secondary: '00BCD4',    // Cyan
      accent: '42A5F5',       // Light blue
      text: '0D3C61',         // Deep blue
      textLight: '546E7A',    // Blue gray
      background: 'E3F2FD',   // Ice blue
      white: 'FFFFFF',
      highlight: '90CAF9'     // Sky blue
    },
    gradient: ['1976D2', '00BCD4']
  },
  
  dt: {
    name: 'Design & Technology',
    icon: '🔧',
    colors: {
      primary: '607D8B',      // Blue gray
      primaryDark: '455A64',  // Dark blue gray
      secondary: 'FF9800',    // Orange (tools)
      accent: '78909C',       // Light blue gray
      text: '263238',         // Very dark gray
      textLight: '546E7A',    // Medium gray
      background: 'ECEFF1',   // Light gray
      white: 'FFFFFF',
      highlight: 'FFB74D'     // Light orange
    },
    gradient: ['607D8B', 'FF9800']
  },
  
  spanish: {
    name: 'Spanish',
    icon: '🇪🇸',
    colors: {
      primary: 'C62828',      // Spanish red
      primaryDark: 'B71C1C',  // Dark red
      secondary: 'FBC02D',    // Spanish yellow
      accent: 'F44336',       // Bright red
      text: '880E4F',         // Deep red
      textLight: 'C2185B',    // Pink
      background: 'FFF9C4',   // Light yellow
      white: 'FFFFFF',
      highlight: 'FFEB3B'     // Yellow
    },
    gradient: ['C62828', 'FBC02D']
  },
  
  pe: {
    name: 'Physical Education',
    icon: '⚽',
    colors: {
      primary: '388E3C',      // Sport green
      primaryDark: '2E7D32',  // Dark green
      secondary: 'FFA726',    // Energy orange
      accent: '66BB6A',       // Light green
      text: '1B5E20',         // Deep green
      textLight: '558B2F',    // Forest
      background: 'E8F5E9',   // Mint tint
      white: 'FFFFFF',
      highlight: 'AED581'     // Lime
    },
    gradient: ['388E3C', 'FFA726']
  },
  
  music: {
    name: 'Music',
    icon: '🎵',
    colors: {
      primary: '5E35B1',      // Deep violet
      primaryDark: '4527A0',  // Dark violet
      secondary: 'EC407A',    // Pink
      accent: '7E57C2',       // Medium purple
      text: '311B92',         // Indigo
      textLight: '512DA8',    // Purple
      background: 'EDE7F6',   // Lavender
      white: 'FFFFFF',
      highlight: 'BA68C8'     // Light purple
    },
    gradient: ['5E35B1', 'EC407A']
  },
  
  // Default fallback
  general: {
    name: 'General',
    icon: '📖',
    colors: {
      primary: '4C6EF5',      // Professional blue
      primaryDark: '3C5CE0',  // Dark blue
      secondary: '35C97A',    // Green
      accent: 'FF6B6B',       // Coral
      text: '1A1C25',         // Dark
      textLight: '4B4E5D',    // Gray
      background: 'F5F7FB',   // Light blue
      white: 'FFFFFF',
      highlight: '90A4FC'     // Light blue
    },
    gradient: ['4C6EF5', '35C97A']
  }
};

/**
 * Get theme for a subject
 * @param {string} subject - The subject name
 * @returns {Object} Theme object with colors and metadata
 */
function getThemeForSubject(subject) {
  if (!subject) return SUBJECT_THEMES.general;
  
  const normalizedSubject = subject.toLowerCase().trim();
  
  // Direct match
  if (SUBJECT_THEMES[normalizedSubject]) {
    return SUBJECT_THEMES[normalizedSubject];
  }
  
  // Fuzzy matching
  const subjectMappings = {
    'hist': 'history',
    'sci': 'science',
    'math': 'mathematics',
    'maths': 'mathematics',
    'eng': 'english',
    'literacy': 'english',
    'reading': 'english',
    'writing': 'english',
    'geo': 'geography',
    'design': 'dt',
    'technology': 'dt',
    'd&t': 'dt',
    'art': 'art',
    'comp': 'computing',
    'ict': 'computing',
    'coding': 'computing',
    'pe': 'pe',
    'sport': 'pe',
    'physical': 'pe',
    'music': 'music'
  };
  
  for (const [key, value] of Object.entries(subjectMappings)) {
    if (normalizedSubject.includes(key)) {
      return SUBJECT_THEMES[value];
    }
  }
  
  return SUBJECT_THEMES.general;
}

/**
 * Visual icons for different slide types and elements
 */
const VISUAL_ICONS = {
  objectives: '🎯',
  task: '📝',
  keyPoint: '💡',
  question: '❓',
  activity: '✏️',
  discussion: '💬',
  experiment: '🔬',
  reading: '📖',
  writing: '✍️',
  thinking: '🤔',
  success: '✅',
  challenge: '⭐',
  timer: '⏱️',
  group: '👥',
  individual: '🙋',
  homework: '🏠',
  extension: '🚀'
};

/**
 * Difficulty level styling
 */
const DIFFICULTY_LEVELS = {
  support: {
    name: 'Support',
    icon: '🟢',
    color: '4CAF50',
    description: 'Scaffolded activities with extra support'
  },
  core: {
    name: 'Core',
    icon: '🟡',
    color: 'FFC107',
    description: 'Standard expectations for all learners'
  },
  challenge: {
    name: 'Challenge',
    icon: '🔴',
    color: 'F44336',
    description: 'Extension activities for deeper learning'
  }
};

module.exports = {
  SUBJECT_THEMES,
  getThemeForSubject,
  VISUAL_ICONS,
  DIFFICULTY_LEVELS
};

