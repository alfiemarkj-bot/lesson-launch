/**
 * Subject-Specific Visual Format Templates
 * Define interactive visual elements for different subjects
 */

const VISUAL_FORMATS = {
  mathematics: {
    grids: {
      multiplication: {
        type: 'grid',
        rows: 5,
        cols: 5,
        headers: true,
        example: 'Complete the multiplication grid'
      },
      placeValue: {
        type: 'table',
        columns: ['Hundreds', 'Tens', 'Ones'],
        rows: 4,
        example: 'Write these numbers in the place value chart'
      },
      fractions: {
        type: 'diagram',
        shapes: ['circle', 'rectangle'],
        divisions: [2, 3, 4, 6, 8],
        example: 'Shade the fraction shown'
      }
    },
    numberLines: {
      basic: {
        type: 'numberline',
        min: 0,
        max: 100,
        intervals: 10,
        example: 'Mark these numbers on the number line'
      },
      decimal: {
        type: 'numberline',
        min: 0,
        max: 10,
        intervals: 1,
        decimals: true,
        example: 'Plot these decimal numbers'
      }
    },
    visualModels: {
      barModel: {
        type: 'bars',
        sections: 4,
        example: 'Draw a bar model to solve this problem'
      },
      partWhole: {
        type: 'circles',
        parts: 3,
        example: 'Complete the part-whole model'
      }
    }
  },

  science: {
    diagrams: {
      plant: {
        type: 'labelingDiagram',
        labels: ['roots', 'stem', 'leaves', 'flower', 'petals'],
        example: 'Label the parts of a plant'
      },
      waterCycle: {
        type: 'labelingDiagram',
        labels: ['evaporation', 'condensation', 'precipitation', 'collection'],
        example: 'Label the water cycle diagram'
      },
      humanBody: {
        type: 'labelingDiagram',
        labels: ['heart', 'lungs', 'stomach', 'brain', 'skeleton'],
        example: 'Label the parts of the body'
      }
    },
    tables: {
      results: {
        type: 'resultsTable',
        columns: ['What we tested', 'What happened', 'What we learned'],
        rows: 4,
        example: 'Record your experiment results'
      },
      observations: {
        type: 'observationTable',
        columns: ['Time', 'What I observed', 'Drawing'],
        rows: 5,
        example: 'Record your observations'
      },
      classification: {
        type: 'sortingTable',
        columns: ['Living', 'Non-living', 'Never alive'],
        rows: 6,
        example: 'Sort these objects into the table'
      }
    },
    predictions: {
      type: 'predictionTable',
      columns: ['My Prediction', 'What Actually Happened', 'Why?'],
      rows: 3,
      example: 'Make predictions and test them'
    }
  },

  history: {
    timelines: {
      basic: {
        type: 'timeline',
        points: 5,
        orientation: 'horizontal',
        example: 'Place these events on the timeline in order'
      },
      dated: {
        type: 'timeline',
        showDates: true,
        points: 6,
        example: 'Add dates to the timeline'
      }
    },
    comparison: {
      thenNow: {
        type: 'comparisonTable',
        columns: ['Then', 'Now'],
        rows: ['Homes', 'Transport', 'Schools', 'Food'],
        example: 'Compare life then and now'
      },
      twoSources: {
        type: 'comparisonTable',
        columns: ['Source A', 'Source B', 'What they tell us'],
        rows: 4,
        example: 'Compare these historical sources'
      }
    },
    factFiles: {
      type: 'factFile',
      fields: ['Name:', 'Dates:', 'Famous for:', 'Important events:', 'Why important:'],
      example: 'Complete the fact file about this historical figure'
    },
    sourceAnalysis: {
      type: 'sourceTable',
      prompts: [
        'What can you see?',
        'What does this tell us?',
        'What questions do you have?',
        'Is this source reliable? Why?'
      ],
      example: 'Analyze this historical source'
    }
  },

  geography: {
    maps: {
      blank: {
        type: 'labelingMap',
        features: ['countries', 'cities', 'rivers', 'mountains'],
        example: 'Label the map with the correct names'
      },
      directions: {
        type: 'directionGrid',
        size: 6,
        compass: true,
        example: 'Follow the directions to find the treasure'
      }
    },
    tables: {
      weather: {
        type: 'weatherChart',
        columns: ['Day', 'Weather', 'Temperature', 'Wind'],
        rows: 7,
        example: 'Record the weather each day'
      },
      location: {
        type: 'locationTable',
        columns: ['Place', 'Continent', 'Famous for', 'Climate'],
        rows: 4,
        example: 'Complete the location table'
      }
    },
    comparison: {
      places: {
        type: 'comparisonTable',
        columns: ['UK', 'Country X', 'Similarities', 'Differences'],
        rows: 4,
        example: 'Compare these two countries'
      }
    }
  },

  english: {
    storyMaps: {
      type: 'storySequence',
      boxes: ['Beginning', 'Build-up', 'Problem', 'Resolution', 'Ending'],
      example: 'Plan your story using this story mountain'
    },
    characterProfiles: {
      type: 'characterWeb',
      fields: ['Appearance', 'Personality', 'Likes', 'Dislikes', 'Relationships'],
      example: 'Create a character profile'
    },
    wordTables: {
      synonyms: {
        type: 'synonymTable',
        columns: ['Word', 'Synonym 1', 'Synonym 2', 'Use in a sentence'],
        rows: 5,
        example: 'Find synonyms for these words'
      },
      grammar: {
        type: 'sortingTable',
        columns: ['Noun', 'Verb', 'Adjective', 'Adverb'],
        rows: 6,
        example: 'Sort these words into the correct columns'
      }
    }
  }
};

/**
 * Get appropriate visual formats for a subject and topic
 */
function getVisualFormatsForSubject(subject, topic = '', keyStage = 'ks2') {
  const normalizedSubject = subject.toLowerCase().trim();
  
  // Subject mapping
  const subjectMap = {
    'math': 'mathematics',
    'maths': 'mathematics',
    'sci': 'science',
    'hist': 'history',
    'geo': 'geography',
    'geog': 'geography',
    'eng': 'english',
    'literacy': 'english'
  };
  
  const mappedSubject = subjectMap[normalizedSubject] || normalizedSubject;
  const formats = VISUAL_FORMATS[mappedSubject] || {};
  
  return {
    subject: mappedSubject,
    formats: formats,
    hasVisuals: Object.keys(formats).length > 0
  };
}

/**
 * Suggest specific visual format based on topic keywords
 */
function suggestVisualFormat(subject, topic) {
  const topicLower = topic.toLowerCase();
  const subjectFormats = getVisualFormatsForSubject(subject);
  
  if (!subjectFormats.hasVisuals) {
    return null;
  }
  
  // Topic-specific suggestions
  const suggestions = {
    mathematics: {
      multiplication: ['times', 'multiply', 'times tables', 'multiplication'],
      placeValue: ['place value', 'hundreds', 'tens', 'ones', 'digits'],
      fractions: ['fraction', 'half', 'quarter', 'third', 'divide'],
      numberLines: ['number line', 'counting', 'sequence', 'order'],
      barModel: ['problem solving', 'word problem', 'bar model']
    },
    science: {
      plant: ['plant', 'flower', 'seed', 'roots', 'photosynthesis'],
      waterCycle: ['water cycle', 'evaporation', 'condensation', 'rain'],
      humanBody: ['body', 'skeleton', 'organs', 'heart', 'lungs'],
      results: ['experiment', 'test', 'investigation'],
      observations: ['observe', 'watching', 'changes over time'],
      classification: ['classify', 'sort', 'group', 'living things']
    },
    history: {
      timelines: ['timeline', 'chronology', 'order', 'sequence', 'dates'],
      thenNow: ['change', 'compare', 'past', 'modern', 'today'],
      factFiles: ['famous', 'person', 'leader', 'pharaoh', 'king', 'queen'],
      sourceAnalysis: ['source', 'evidence', 'artifact', 'picture']
    },
    geography: {
      maps: ['map', 'location', 'country', 'continent', 'city'],
      weather: ['weather', 'climate', 'temperature', 'season'],
      directions: ['direction', 'compass', 'north', 'south', 'route'],
      comparison: ['compare', 'contrast', 'different countries']
    },
    english: {
      storyMaps: ['story', 'narrative', 'plot', 'beginning', 'ending'],
      characterProfiles: ['character', 'describe', 'protagonist'],
      synonyms: ['synonym', 'vocabulary', 'word choice'],
      grammar: ['grammar', 'noun', 'verb', 'adjective', 'word class']
    }
  };
  
  const subjectSuggestions = suggestions[subjectFormats.subject] || {};
  
  for (const [formatType, keywords] of Object.entries(subjectSuggestions)) {
    if (keywords.some(keyword => topicLower.includes(keyword))) {
      return {
        formatType,
        formatConfig: getFormatByPath(subjectFormats.formats, formatType)
      };
    }
  }
  
  // Return first available format as fallback
  const firstCategory = Object.keys(subjectFormats.formats)[0];
  if (firstCategory) {
    const firstFormat = Object.keys(subjectFormats.formats[firstCategory])[0];
    return {
      formatType: firstFormat,
      formatConfig: subjectFormats.formats[firstCategory][firstFormat]
    };
  }
  
  return null;
}

/**
 * Helper to get format config by path
 */
function getFormatByPath(formats, path) {
  for (const category of Object.values(formats)) {
    if (typeof category === 'object' && category[path]) {
      return category[path];
    }
  }
  return null;
}

module.exports = {
  VISUAL_FORMATS,
  getVisualFormatsForSubject,
  suggestVisualFormat
};

