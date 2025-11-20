const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, VerticalAlign, Header, Footer, PageNumber } = require('docx');
const fs = require('fs').promises;
const path = require('path');
const { getThemeForSubject, VISUAL_ICONS } = require('../data/subject-themes');
const { suggestVisualFormat } = require('../data/visual-formats');

console.log('✨ ENHANCED Resource Service Loaded - Interactive Worksheets + Visual Formats ACTIVE');

/**
 * Generate an interactive Word document resource sheet
 * @param {Object} slideData - The slide content and structure
 * @param {string} outputPath - Where to save the Word document
 * @param {Map} imageMap - Optional map of image description -> file path
 * @param {boolean} needsSENDScaffolding - Whether to include SEND support scaffolding
 */
async function generateResourceSheet(slideData, outputPath, imageMap = null, needsSENDScaffolding = false) {
  if (!outputPath.endsWith('.docx')) {
    throw new Error('Resource sheet must be a .docx file');
  }
  
  try {
    const subject = slideData.subject || 'general';
    const theme = getThemeForSubject(subject);
    
    console.log(`📋 Generating ${needsSENDScaffolding ? 'SCAFFOLDED ' : ''}${theme.name} resource sheet`);
    
    const children = [];
    
    // ============================================================
    // HEADER SECTION
    // ============================================================
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: slideData.title || 'Lesson Resources',
            size: 48,
            bold: true,
            color: theme.colors.primary
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );
    
    if (slideData.learningQuestion) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${VISUAL_ICONS.objectives} ${slideData.learningQuestion}`,
              size: 24,
              italics: true,
              color: theme.colors.primaryDark
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 2, color: theme.colors.secondary },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: theme.colors.secondary }
          }
        })
      );
    }
    
    // Info bar
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${theme.icon} ${slideData.subject || 'General'} | `,
            size: 20,
            bold: true
          }),
          new TextRun({
            text: `${slideData.keyStage || 'KS2'} | `,
            size: 20
          }),
          new TextRun({
            text: `Name: ___________________________ | `,
            size: 20
          }),
          new TextRun({
            text: `Date: _______________`,
            size: 20
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 }
      })
    );
    
    // ============================================================
    // LEARNING OBJECTIVES (with checkboxes)
    // ============================================================
    if (slideData.objectives && slideData.objectives.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${VISUAL_ICONS.objectives} Learning Objectives`,
              size: 28,
              bold: true,
              color: theme.colors.primary
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 }
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Tick each box when you can do it!',
              size: 20,
              italics: true,
              color: '666666'
            })
          ],
          spacing: { after: 150 }
        })
      );
      
      slideData.objectives.slice(0, 4).forEach((obj) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '☐  ',
                size: 24,
                bold: true,
                color: theme.colors.secondary
              }),
              new TextRun({
                text: convertToStudentLanguage(obj),
                size: 22
              })
            ],
            spacing: { after: 120 }
          })
        );
      });
      
      children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
    }
    
    // ============================================================
    // INTERACTIVE ACTIVITIES
    // ============================================================
    if (slideData.resourceContent && slideData.resourceContent.items && slideData.resourceContent.items.length > 0) {
      
      const activities = slideData.resourceContent.items;
      
      // Limit to 2-3 activities for focused practice
      for (let activityIndex = 0; activityIndex < Math.min(activities.length, 3); activityIndex++) {
        const activity = activities[activityIndex];
        
        // Activity header
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${VISUAL_ICONS.activity} Activity ${activityIndex + 1}: ${activity.title || 'Practice Task'}`,
                size: 32,
                bold: true,
                color: theme.colors.primary
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            pageBreakBefore: activityIndex > 0
          })
        );

        // Add Activity Image if present
        if (activity.imageUrl) {
            const imageData = await getImageData(activity.imageUrl);
            if (imageData) {
                try {
                    children.push(
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: imageData,
                                    transformation: {
                                        width: 400,
                                        height: 300,
                                    }
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 250 }
                        })
                    );
                } catch (imgErr) {
                    console.error('Error adding image to docx:', imgErr);
                }
            }
        }
        
        if (activity.instructions) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: activity.instructions,
                  size: 22
                })
              ],
              spacing: { after: 250 }
            })
          );
        }
        
        // SEND Scaffolding (only if requested)
        if (needsSENDScaffolding) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${VISUAL_ICONS.keyPoint} Help Box:`,
                  size: 24,
                  bold: true,
                  color: '4CAF50'
                })
              ],
              spacing: { before: 150, after: 100 }
            })
          );
          
          // Add scaffolding table
          const scaffoldingTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.DOUBLE, size: 6, color: '4CAF50' },
              bottom: { style: BorderStyle.DOUBLE, size: 6, color: '4CAF50' },
              left: { style: BorderStyle.DOUBLE, size: 6, color: '4CAF50' },
              right: { style: BorderStyle.DOUBLE, size: 6, color: '4CAF50' }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ text: '💭 Sentence Starters:', bold: true, spacing: { after: 100 } }),
                      new Paragraph({ text: '• "I think that..."', spacing: { after: 50 } }),
                      new Paragraph({ text: '• "This shows me..."', spacing: { after: 50 } }),
                      new Paragraph({ text: '• "I can see that..."', spacing: { after: 50 } }),
                      new Paragraph({ text: '• "The answer is... because..."', spacing: { after: 50 } })
                    ],
                    shading: { fill: 'E8F5E9' }
                  })
                ]
              })
            ]
          });
          
          children.push(scaffoldingTable);
          children.push(new Paragraph({ text: '', spacing: { after: 250 } }));
        }
        
        // Generate interactive content based on activity type/content
        const interactiveContent = generateInteractiveWorksheet(activity, theme, needsSENDScaffolding);
        interactiveContent.forEach(element => children.push(element));
        
        children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
      }
    }
    
    // ============================================================
    // CHALLENGE SECTION (always included)
    // ============================================================
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${VISUAL_ICONS.challenge} Challenge Yourself!`,
            size: 32,
            bold: true,
            color: 'F44336'
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Can you:',
            size: 22,
            bold: true
          })
        ],
        spacing: { after: 150 }
      })
    );
    
    // Challenge questions (open-ended)
    const challenges = generateChallengeQuestions(slideData, needsSENDScaffolding);
    challenges.forEach(challenge => children.push(challenge));
    
    // ============================================================
    // REFLECTION SECTION
    // ============================================================
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${VISUAL_ICONS.thinking} My Reflection`,
            size: 28,
            bold: true,
            color: theme.colors.primary
          })
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );
    
    // Reflection table
    const reflectionTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ text: '😊 What did I do well?', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '', spacing: { after: 800 } })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ text: '🤔 What did I find tricky?', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '', spacing: { after: 800 } })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ text: '🎯 My next step:', bold: true, spacing: { after: 100 } }),
                new Paragraph({ text: '', spacing: { after: 800 } })
              ]
            })
          ]
        })
      ]
    });
    
    children.push(reflectionTable);
    
    // ============================================================
    // CREATE DOCUMENT
    // ============================================================
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1200,
                right: 1200,
                bottom: 1200,
                left: 1200
              }
            }
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${theme.icon} ${slideData.title || 'Lesson Resources'}`,
                      size: 18,
                      color: theme.colors.textLight
                    })
                  ],
                  alignment: AlignmentType.RIGHT
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Page ',
                      size: 16,
                      color: theme.colors.textLight
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                      color: theme.colors.textLight
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ]
            })
          },
          children: children
        }
      ]
    });
    
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);
    
    console.log(`✓ Interactive resource sheet generated${needsSENDScaffolding ? ' with SEND scaffolding' : ''}: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.error('Error generating resource sheet:', error);
    throw error;
  }
}

/**
 * Generate interactive worksheet content based on activity from AI
 */
function generateInteractiveWorksheet(activity, theme, isSEND) {
  const elements = [];
  
  // ============ CONTENT TEXT (Model text, passage, template) ============
  console.log(`🔍 Checking for contentText in activity:`, activity.contentText ? 'FOUND' : 'MISSING');
  if (activity.contentText) {
    console.log(`📝 ContentText length: ${activity.contentText.length} characters`);
  }
  
  if (activity.contentText && activity.contentText.length > 0) {
    console.log('✅ Adding contentText section to resource sheet');
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '📖 Read this carefully:',
            size: 24,
            bold: true,
            color: theme.colors.primary
          })
        ],
        spacing: { before: 200, after: 150 }
      })
    );
    
    // Content in a bordered box
    const contentParagraphs = activity.contentText.split('\n').filter(p => p.trim());
    
    contentParagraphs.forEach((para, idx) => {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para,
              size: 22
            })
          ],
          spacing: { after: 150 },
          indent: { left: 400, right: 400 },
          border: idx === 0 ? {
            top: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary },
            bottom: idx === contentParagraphs.length - 1 ? { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary } : { style: BorderStyle.NONE },
            left: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary },
            right: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary }
          } : idx === contentParagraphs.length - 1 ? {
            bottom: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary },
            left: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary },
            right: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary }
          } : {
            left: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary },
            right: { style: BorderStyle.DOUBLE, size: 6, color: theme.colors.primary }
          },
          shading: { fill: theme.colors.background }
        })
      );
    });
    
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
  }
  
  // ============ TABLE QUESTIONS (from AI) ============
  if (activity.tableQuestions && activity.tableQuestions.length > 0) {
    const instructionText = activity.contentText ? 
      'Answer these questions using the text above:' : 
      'Complete the table using what you learned:';
    
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: instructionText,
            size: 22,
            bold: true
          })
        ],
        spacing: { after: 150 }
      })
    );
    
    const tableRows = [];
    
    // Header row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Question', bold: true, alignment: AlignmentType.CENTER })],
            shading: { fill: theme.colors.background },
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: 'My Answer', bold: true, alignment: AlignmentType.CENTER })],
            shading: { fill: theme.colors.background },
            width: { size: 50, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );
    
    // Use AI-generated questions (limit for SEND)
    const questionsToUse = isSEND ? activity.tableQuestions.slice(0, 4) : activity.tableQuestions.slice(0, 6);
    
    questionsToUse.forEach((question) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: question, spacing: { before: 150, after: 150 } })],
              verticalAlign: VerticalAlign.CENTER
            }),
            new TableCell({
              children: [new Paragraph({ text: '', spacing: { before: 400, after: 400 } })],
              verticalAlign: VerticalAlign.CENTER
            })
          ],
          height: { value: isSEND ? 900 : 700, rule: 'atLeast' }
        })
      );
    });
    
    const practiceTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows
    });
    
    elements.push(practiceTable);
    elements.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  }
  
  // ============ GAP FILL QUESTIONS (from AI) ============
  if (activity.gapFillQuestions && activity.gapFillQuestions.length > 0) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Fill in the missing words:',
            size: 22,
            bold: true
          })
        ],
        spacing: { before: 300, after: 150 }
      })
    );
    
    // Use AI-generated gap fill sentences (limit for SEND)
    const gapFillsToUse = isSEND ? activity.gapFillQuestions.slice(0, 3) : activity.gapFillQuestions;
    
    gapFillsToUse.forEach((sentence, idx) => {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${idx + 1}. `,
              bold: true,
              size: 20
            }),
            new TextRun({
              text: sentence,
              size: 20
            })
          ],
          spacing: { after: 250 }
        })
      );
    });
  }
  
  // ============ VISUAL FORMAT (Subject-Specific) ============
  if (activity.visualFormat && activity.visualFormat.type) {
    const visualElements = renderVisualFormat(activity.visualFormat, theme, isSEND);
    visualElements.forEach(element => elements.push(element));
  }
  
  return elements;
}

/**
 * Render subject-specific visual formats
 */
function renderVisualFormat(visualFormat, theme, isSEND) {
  const elements = [];
  const { type, data } = visualFormat;
  
  if (!type || !data) return elements;
  
  elements.push(
    new Paragraph({
      text: '',
      spacing: { before: 400, after: 200 }
    })
  );
  
  // Route to appropriate renderer based on type
  switch (type) {
    case 'multiplicationGrid':
    case 'grid':
      elements.push(...renderMultiplicationGrid(data, theme, isSEND));
      break;
    case 'numberLine':
      elements.push(...renderNumberLine(data, theme, isSEND));
      break;
    case 'timeline':
      elements.push(...renderTimeline(data, theme, isSEND));
      break;
    case 'thenNow':
    case 'comparisonTable':
      elements.push(...renderComparisonTable(data, theme, isSEND));
      break;
    case 'labelingDiagram':
      elements.push(...renderLabelingDiagram(data, theme, isSEND));
      break;
    case 'resultsTable':
      elements.push(...renderResultsTable(data, theme, isSEND));
      break;
    case 'labelMap':
      elements.push(...renderMapLabeling(data, theme, isSEND));
      break;
    default:
      // Unknown format, skip
      break;
  }
  
  return elements;
}

/**
 * Render multiplication/practice grid
 */
function renderMultiplicationGrid(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📊 Complete the grid:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const rows = data.rows || [2, 3, 5, 10];
  const cols = data.cols || [2, 4, 5, 10];
  const gridRows = [];
  
  // Header row
  const headerCells = [
    new TableCell({
      children: [new Paragraph({ text: '×', bold: true, alignment: AlignmentType.CENTER })],
      shading: { fill: theme.colors.background }
    })
  ];
  
  cols.forEach(col => {
    headerCells.push(
      new TableCell({
        children: [new Paragraph({ text: col.toString(), bold: true, alignment: AlignmentType.CENTER })],
        shading: { fill: theme.colors.background }
      })
    );
  });
  
  gridRows.push(new TableRow({ children: headerCells }));
  
  // Data rows (some filled, some blank for practice)
  rows.forEach((row, rowIdx) => {
    const rowCells = [
      new TableCell({
        children: [new Paragraph({ text: row.toString(), bold: true, alignment: AlignmentType.CENTER })],
        shading: { fill: theme.colors.background }
      })
    ];
    
    cols.forEach((col, colIdx) => {
      // Show first example, leave rest blank
      const showAnswer = rowIdx === 0 && colIdx === 0;
      rowCells.push(
        new TableCell({
          children: [new Paragraph({ 
            text: showAnswer ? (row * col).toString() : '', 
            alignment: AlignmentType.CENTER,
            spacing: { before: 250, after: 250 }
          })],
          shading: { fill: showAnswer ? theme.colors.highlight : 'FFFFFF' }
        })
      );
    });
    
    gridRows.push(new TableRow({ children: rowCells }));
  });
  
  const grid = new Table({
    width: { size: 80, type: WidthType.PERCENTAGE },
    rows: gridRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2 },
      bottom: { style: BorderStyle.SINGLE, size: 2 },
      left: { style: BorderStyle.SINGLE, size: 2 },
      right: { style: BorderStyle.SINGLE, size: 2 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    }
  });
  
  elements.push(grid);
  return elements;
}

/**
 * Render number line
 */
function renderNumberLine(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📏 Mark these numbers on the number line:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const min = data.min || 0;
  const max = data.max || 100;
  const intervals = Math.min(10, (max - min) / 10);
  
  // Create number line representation using table
  const numberLineCells = [];
  for (let i = min; i <= max; i += intervals) {
    numberLineCells.push(
      new TableCell({
        children: [new Paragraph({ text: i.toString(), alignment: AlignmentType.CENTER, size: 18 })],
        width: { size: 100 / ((max - min) / intervals + 1), type: WidthType.PERCENTAGE }
      })
    );
  }
  
  const numberLine = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: numberLineCells })
    ],
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.THICK, size: 6, color: theme.colors.primary },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE }
    }
  });
  
  elements.push(numberLine);
  
  // Space for marking
  if (data.markPoints && data.markPoints.length > 0) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Mark these points: ${data.markPoints.join(', ')}`,
            size: 20,
            italics: true
          })
        ],
        spacing: { before: 150 }
      })
    );
  }
  
  return elements;
}

/**
 * Render timeline
 */
function renderTimeline(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '📅 Complete the timeline:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const events = data.events || [];
  const dates = data.dates || [];
  
  // Timeline table
  const timelineRows = [];
  
  // Events row
  const eventCells = events.map(event => 
    new TableCell({
      children: [new Paragraph({ text: event, alignment: AlignmentType.CENTER, size: 18 })],
      width: { size: 100 / events.length, type: WidthType.PERCENTAGE }
    })
  );
  timelineRows.push(new TableRow({ children: eventCells }));
  
  // Dates row (with some blanks)
  const dateCells = dates.map((date, idx) => 
    new TableCell({
      children: [new Paragraph({ 
        text: idx === 0 ? date : '___________', // Show first date as example
        alignment: AlignmentType.CENTER,
        size: 18,
        spacing: { before: 200, after: 200 }
      })],
      shading: { fill: idx === 0 ? theme.colors.highlight : 'FFFFFF' }
    })
  );
  timelineRows.push(new TableRow({ children: dateCells }));
  
  const timeline = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: timelineRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2 },
      bottom: { style: BorderStyle.THICK, size: 4, color: theme.colors.primary },
      left: { style: BorderStyle.SINGLE, size: 2 },
      right: { style: BorderStyle.SINGLE, size: 2 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2 },
      insideVertical: { style: BorderStyle.SINGLE, size: 2 }
    }
  });
  
  elements.push(timeline);
  return elements;
}

/**
 * Render comparison table (Then/Now, etc.)
 */
function renderComparisonTable(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '⚖️ Compare and contrast:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const categories = data.categories || ['Item 1', 'Item 2', 'Item 3'];
  const tableRows = [];
  
  // Header row
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: 'Category', bold: true, alignment: AlignmentType.CENTER })],
          shading: { fill: theme.colors.background }
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Then', bold: true, alignment: AlignmentType.CENTER })],
          shading: { fill: theme.colors.background }
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Now', bold: true, alignment: AlignmentType.CENTER })],
          shading: { fill: theme.colors.background }
        })
      ]
    })
  );
  
  // Data rows
  categories.forEach(category => {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: category, bold: true })],
            shading: { fill: theme.colors.background }
          }),
          new TableCell({
            children: [new Paragraph({ text: '', spacing: { before: 400, after: 400 } })]
          }),
          new TableCell({
            children: [new Paragraph({ text: '', spacing: { before: 400, after: 400 } })]
          })
        ]
      })
    );
  });
  
  const comparisonTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
  
  elements.push(comparisonTable);
  return elements;
}

/**
 * Render labeling diagram
 */
function renderLabelingDiagram(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🏷️ Label the diagram:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const labels = data.labels || [];
  const diagramType = data.diagramType || 'diagram';
  
  // Description
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Draw arrows from these labels to the correct parts of the ${diagramType}:`,
          size: 20,
          italics: true
        })
      ],
      spacing: { after: 200 }
    })
  );
  
  // Large space for diagram (student will draw/label)
  elements.push(
    new Paragraph({
      text: '',
      spacing: { before: 1500, after: 1500 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 2 },
        bottom: { style: BorderStyle.SINGLE, size: 2 },
        left: { style: BorderStyle.SINGLE, size: 2 },
        right: { style: BorderStyle.SINGLE, size: 2 }
      }
    })
  );
  
  // Labels to use
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Labels: ${labels.join(' • ')}`,
          size: 20,
          bold: true
        })
      ],
      spacing: { before: 200 }
    })
  );
  
  return elements;
}

/**
 * Render results table (for science experiments)
 */
function renderResultsTable(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🔬 Record your results:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const headers = data.headers || ['What we tested', 'What happened', 'What we learned'];
  const rowCount = isSEND ? 3 : (data.rows || 4);
  const tableRows = [];
  
  // Header row
  const headerCells = headers.map(header => 
    new TableCell({
      children: [new Paragraph({ text: header, bold: true, alignment: AlignmentType.CENTER })],
      shading: { fill: theme.colors.background }
    })
  );
  tableRows.push(new TableRow({ children: headerCells }));
  
  // Empty rows for recording
  for (let i = 0; i < rowCount; i++) {
    const rowCells = headers.map(() => 
      new TableCell({
        children: [new Paragraph({ text: '', spacing: { before: 400, after: 400 } })]
      })
    );
    tableRows.push(new TableRow({ children: rowCells }));
  }
  
  const resultsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
  
  elements.push(resultsTable);
  return elements;
}

/**
 * Render map labeling activity
 */
function renderMapLabeling(data, theme, isSEND) {
  const elements = [];
  
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '🗺️ Label the map:',
          size: 24,
          bold: true,
          color: theme.colors.primary
        })
      ],
      spacing: { after: 150 }
    })
  );
  
  const locations = data.locations || [];
  
  // Description
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Mark and label these locations on the map:',
          size: 20,
          italics: true
        })
      ],
      spacing: { after: 200 }
    })
  );
  
  // Large space for map
  elements.push(
    new Paragraph({
      text: '',
      spacing: { before: 2000, after: 2000 },
      border: {
        top: { style: BorderStyle.DOUBLE, size: 4, color: theme.colors.primary },
        bottom: { style: BorderStyle.DOUBLE, size: 4, color: theme.colors.primary },
        left: { style: BorderStyle.DOUBLE, size: 4, color: theme.colors.primary },
        right: { style: BorderStyle.DOUBLE, size: 4, color: theme.colors.primary }
      }
    })
  );
  
  // Locations to mark
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Locations to mark: ${locations.join(' • ')}`,
          size: 20,
          bold: true
        })
      ],
      spacing: { before: 200 }
    })
  );
  
  return elements;
}

/**
 * Generate challenge questions (open-ended, no multiple choice)
 * Uses AI-generated questions from lesson content if available
 */
function generateChallengeQuestions(slideData, isSEND) {
  const questions = [];
  
  // Try to get AI-generated open questions from resource content
  let challengePrompts = [];
  
  if (slideData.resourceContent && slideData.resourceContent.items && slideData.resourceContent.items.length > 0) {
    // Use AI-generated openQuestions from first activity
    const firstActivity = slideData.resourceContent.items[0];
    if (firstActivity.openQuestions && firstActivity.openQuestions.length > 0) {
      challengePrompts = isSEND ? 
        firstActivity.openQuestions.slice(0, 3) : 
        firstActivity.openQuestions.slice(0, 4);
    }
  }
  
  // Fallback to generic prompts if AI didn't generate specific ones
  if (challengePrompts.length === 0) {
    challengePrompts = isSEND ? [
      'Explain what you learned today in your own words.',
      'Draw a picture or diagram to show what you learned.',
      'Write one question you still have about this topic.'
    ] : [
      'Explain what you learned today and why it\'s important.',
      'How does this connect to something else you\'ve learned?',
      'Can you think of a real-life example where you might use this?',
      'What question would you ask someone who wants to learn about this topic?'
    ];
  }
  
  challengePrompts.forEach(prompt => {
    questions.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '• ' + prompt,
            size: 22
          })
        ],
        spacing: { after: 100 }
      })
    );
    
    // Space for answer (more for SEND)
    const lineCount = isSEND ? 4 : 3;
    for (let i = 0; i < lineCount; i++) {
      questions.push(
        new Paragraph({
          text: '_________________________________________________________________________',
          spacing: { after: i === lineCount - 1 ? 250 : 50 }
        })
      );
    }
  });
  
  return questions;
}

/**
 * Convert teacher-language objectives to student-friendly "I can..." statements
 */
function convertToStudentLanguage(objective) {
  let studentVersion = objective
    .replace(/^(Students|Pupils|Learners) will (be able to )?/i, 'I can ')
    .replace(/^To /, 'I can ')
    .replace(/^Understand /i, 'I can explain ')
    .replace(/^Learn (about )?/i, 'I can describe ')
    .replace(/^Identify /i, 'I can find and name ')
    .replace(/^Recognize /i, 'I can spot ')
    .replace(/^Demonstrate /i, 'I can show ');
  
  // Ensure it starts with "I can"
  if (!studentVersion.toLowerCase().startsWith('i can')) {
    studentVersion = 'I can ' + studentVersion.charAt(0).toLowerCase() + studentVersion.slice(1);
  }
  
  return studentVersion;
}

async function getImageData(urlOrPath) {
    try {
        if (!urlOrPath) return null;
        
        // Handle data URLs (base64)
        if (urlOrPath.startsWith('data:image')) {
            const base64Data = urlOrPath.split(',')[1];
            return Buffer.from(base64Data, 'base64');
        }

        // Handle remote URLs
        if (urlOrPath.startsWith('http')) {
            // We need to use fetch. Since node 18 fetch is global.
            const response = await fetch(urlOrPath);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } 
        
        // Handle local paths
        // If it starts with /uploads/, resolve relative to project root
        if (urlOrPath.startsWith('/uploads/')) {
             // Assuming this service is in services/, uploads is in ../uploads
             // But better to rely on absolute path if possible or relative to CWD
             const localPath = path.join(process.cwd(), urlOrPath); 
             return await fs.readFile(localPath);
        } else {
             // Try as absolute path or direct path
             return await fs.readFile(urlOrPath);
        }
    } catch (e) {
        console.error(`Failed to load image: ${urlOrPath}`, e.message);
        return null;
    }
}

module.exports = {
  generateResourceSheet
};
