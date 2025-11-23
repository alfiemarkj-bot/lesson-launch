const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs').promises;
const { getThemeForSubject, VISUAL_ICONS } = require('../data/subject-themes');

console.log('✨ ENHANCED PowerPoint Service Loaded - TEMPLATE EDITION');

/**
 * Define Master Slides (Templates) for the Presentation
 * This creates the "XML Template" structure within the PPTX file
 */
function defineMasterSlides(pptx, theme) {
  const { colors } = theme;

  // Slide Types to create Masters for
  const slideTypes = [
    { type: 'starter', color: colors.secondary, label: 'STARTER' },
    { type: 'main', color: colors.primary, label: 'MAIN ACTIVITY' },
    { type: 'activity', color: colors.accent, label: 'ACTIVITY' },
    { type: 'assessment', color: colors.warning, label: 'ASSESSMENT' },
    { type: 'plenary', color: colors.purple, label: 'PLENARY' },
    { type: 'standard', color: colors.primary, label: 'LESSON' } // Fallback
  ];

  slideTypes.forEach(typeConfig => {
    pptx.defineSlideMaster({
      title: `MASTER_${typeConfig.type.toUpperCase()}`,
      background: { color: colors.background },
      objects: [
        // 1. Header Bar (Background)
        {
          rect: {
            x: 0, y: 0, w: '100%', h: 0.8,
            fill: { color: typeConfig.color },
            line: { color: 'transparent' }
          }
        },
        // 2. Header Underline
        {
          rect: {
            x: 0.5, y: 1.6, w: 2, h: 0.05,
            fill: { color: typeConfig.color },
            line: { color: 'transparent' }
          }
        },
        // 3. Footer Bar (Background for notes)
        {
          rect: {
            x: 0, y: 6.8, w: '100%', h: 0.7,
            fill: { color: colors.gray, transparency: 80 } // Subtle footer
          }
        },
        // 4. Slide Number
        {
          placeholder: {
            options: { name: 'slideNumber', type: 'slideNumber', x: 9.2, y: 6.9, w: 0.5, h: 0.5, fontSize: 12, color: colors.subtext }
          },
          text: {
             text: function(slide) { return slide.slideNumber; }, // Dynamic slide number logic if needed, usually handled by PPTX
          }
        },
        // 5. Branding / Logo (Optional placeholder)
        // { text: { text: "LessonLaunch", x: 9.0, y: 0.1, fontSize: 10, color: colors.white, align: 'right' } }
      ]
    });
  });

  // Title Slide Master
  pptx.defineSlideMaster({
    title: 'MASTER_TITLE',
    background: { color: colors.primary },
    objects: [
       // Decorative shapes for title slide
       { rect: { x: 0, y: 0, w: '100%', h: '100%', fill: { color: colors.primary } } },
       { rect: { x: 0.5, y: 0.5, w: 9, h: 6.5, line: { color: colors.white, width: 3 }, fill: { color: 'transparent' } } } // White border
    ]
  });
}

/**
 * Layout Definitions
 */
const Layouts = {
  /**
   * Standard layout: Title top, content below (full width)
   */
  standard: (pptx, slide, theme, options) => {
    const { colors } = theme;
    
    // Determine Master Name based on slide type
    const type = slide.type || 'standard';
    const masterName = `MASTER_${type.toUpperCase()}`;
    
    // Fallback if master doesn't exist (shouldn't happen with correct mapping)
    const safeMaster = ['starter', 'main', 'activity', 'assessment', 'plenary'].includes(type) ? masterName : 'MASTER_STANDARD';

    const slideObj = pptx.addSlide({ masterName: safeMaster });

    // Header Text (Dynamic)
    renderHeaderDynamicText(slideObj, slide, theme, options.index);

    // Content
    if (slide.content) {
      // Increased Y position from 1.8 to 2.0 to clear header
      renderContentText(slideObj, slide.content, {
        x: 0.7, y: 2.0, w: 8.6, h: 4.5,
        fontSize: 28, color: colors.text, fontFace: 'Comic Sans MS'
      }, theme);
    }

    // Notes Text (Dynamic)
    renderFooterNotes(slideObj, slide, theme);
    
    return slideObj;
  },

  /**
   * Image Right layout: Content left, Images right
   */
  imageRight: (pptx, slide, theme, options) => {
    const { colors } = theme;
    
    const type = slide.type || 'standard';
    const masterName = `MASTER_${type.toUpperCase()}`;
    const safeMaster = ['starter', 'main', 'activity', 'assessment', 'plenary'].includes(type) ? masterName : 'MASTER_STANDARD';

    const slideObj = pptx.addSlide({ masterName: safeMaster });

    // Header Text (Dynamic)
    renderHeaderDynamicText(slideObj, slide, theme, options.index);

    // Content (Left Column)
    if (slide.content) {
      // Increased Y from 1.8 to 2.0 to clear header
      renderContentText(slideObj, slide.content, {
        x: 0.5, y: 2.0, w: 4.5, h: 4.5,
        fontSize: 24, color: colors.text, fontFace: 'Comic Sans MS'
      }, theme);
    }

    // Images (Right Column)
    if (options.images && options.images.length > 0) {
      const imgY = 2.0; // Matched Y with content
      const imgH = 4.0;
      const imgW = 4.5;
      const imgX = 5.2;
      
      if (options.images.length === 1) {
        // 1 Large Image
        slideObj.addImage({
          path: options.images[0],
          x: imgX, y: imgY, w: imgW, h: imgH,
          sizing: { type: 'contain', w: imgW, h: imgH }
        });
      } else if (options.images.length === 2) {
        // 2 Images stacked
        const splitH = (imgH - 0.2) / 2;
        slideObj.addImage({
          path: options.images[0],
          x: imgX, y: imgY, w: imgW, h: splitH,
          sizing: { type: 'contain', w: imgW, h: splitH }
        });
        slideObj.addImage({
          path: options.images[1],
          x: imgX, y: imgY + splitH + 0.2, w: imgW, h: splitH,
          sizing: { type: 'contain', w: imgW, h: splitH }
        });
      } else {
        // 3 or 4 Images (Grid Layout)
        const gridW = (imgW - 0.2) / 2;
        const gridH = (imgH - 0.2) / 2;
        
        // Image 1: Top Left
        slideObj.addImage({
          path: options.images[0],
          x: imgX, y: imgY, w: gridW, h: gridH,
          sizing: { type: 'contain', w: gridW, h: gridH }
        });
        
        // Image 2: Top Right
        slideObj.addImage({
          path: options.images[1],
          x: imgX + gridW + 0.2, y: imgY, w: gridW, h: gridH,
          sizing: { type: 'contain', w: gridW, h: gridH }
        });
        
        // Image 3: Bottom Left
        if (options.images[2]) {
           slideObj.addImage({
            path: options.images[2],
            x: imgX, y: imgY + gridH + 0.2, w: gridW, h: gridH,
            sizing: { type: 'contain', w: gridW, h: gridH }
          });
        }
        
        // Image 4: Bottom Right
        if (options.images[3]) {
          slideObj.addImage({
            path: options.images[3],
            x: imgX + gridW + 0.2, y: imgY + gridH + 0.2, w: gridW, h: gridH,
            sizing: { type: 'contain', w: gridW, h: gridH }
          });
        }
      }
    }

    renderFooterNotes(slideObj, slide, theme);
    return slideObj;
  }
};

/**
 * Helper: Render Header Texts (Icon, Title, Type Label)
 * Background shapes are now in the Master Slide!
 */
function renderHeaderDynamicText(slideObj, slide, theme, index) {
  const { colors } = theme;
  const typeConfig = getTypeConfig(slide.type, colors);

  // Icon
  const slideIcon = getSlideIcon(slide.type);
  slideObj.addText(slideIcon, {
    x: 0.2, y: 0.1, w: 0.6, h: 0.6,
    fontSize: 32, align: 'center', valign: 'middle'
  });

  // Type Label
  slideObj.addText(`${typeConfig.label}`, {
    x: 0.9, y: 0.1, w: 4, h: 0.6,
    fontSize: 18, fontFace: 'Comic Sans MS', color: colors.white, bold: true, valign: 'middle'
  });

  // Title
  // Adjusted Y from 1.0 to 1.1 to clear top bar, decreased height slightly
  slideObj.addText(slide.title || `Slide ${index + 1}`, {
    x: 0.5, y: 1.1, w: 9, h: 0.8,
    fontSize: 40, fontFace: 'Comic Sans MS', bold: true, color: colors.text, valign: 'top'
  });
}

/**
 * Helper: Render Content Text (Bullets or Paragraphs)
 */
function renderContentText(slideObj, content, layout, theme) {
  const { colors } = theme;
  
  // Force bullet points for better readability
  // Split by newlines, but also try to split by sentences if it's a big block
  let lines = content.split('\n').filter(l => l.trim());
  
  // If only one long line, try to split by full stops to make bullets
  if (lines.length === 1 && lines[0].length > 100) {
     lines = lines[0].split('. ').map(l => l.trim()).filter(l => l);
  }

  // Check if it's already a list
  const isList = lines.some(l => l.trim().startsWith('-') || l.trim().startsWith('•'));

  // If it's not a list, we treat every line as a bullet point
  const bullets = lines.map(l => l.replace(/^[-•]\s*/, '').trim()).filter(l => l);
  
  let y = layout.y;
  bullets.forEach(bullet => {
    // Draw custom bullet point
    slideObj.addShape('ellipse', {
      x: layout.x, y: y + 0.15, w: 0.1, h: 0.1,
      fill: { color: colors.primary }
    });
    
    // Add text
    slideObj.addText(bullet, {
      x: layout.x + 0.25, y: y, w: layout.w - 0.25, h: 0.5, // Fixed height per bullet
      fontSize: layout.fontSize, 
      color: layout.color, 
      fontFace: layout.fontFace || 'Comic Sans MS', 
      valign: 'top',
      autoFit: true, // Ensure text fits
      wrap: true
    });
    
    // Calculate next Y position based on text length (rough approximation)
    const lineCount = Math.ceil((bullet.length * 12) / (layout.w * 100)); // approx chars per line
    const heightIncrement = Math.max(0.6, lineCount * 0.5);
    y += heightIncrement;
  });
}

/**
 * Helper: Render Footer Notes (Text only, background in Master)
 */
function renderFooterNotes(slideObj, slide, theme) {
  const { colors } = theme;
  if (slide.notes) {
    // Background is already in Master Slide (rect at y: 6.8)
    slideObj.addText(`Teacher Note: ${slide.notes}`, {
      x: 0.2, y: 6.8, w: 9.6, h: 0.7,
      fontSize: 14, fontFace: 'Comic Sans MS', color: colors.subtext, italic: true, valign: 'middle'
    });
  }
}

/**
 * Utility: Get Slide Type Config
 */
function getTypeConfig(type, colors) {
  const map = {
    starter: { color: colors.secondary, label: 'STARTER' },
    main: { color: colors.primary, label: 'MAIN ACTIVITY' },
    activity: { color: colors.accent, label: 'ACTIVITY' },
    assessment: { color: colors.warning, label: 'ASSESSMENT' },
    plenary: { color: colors.purple, label: 'PLENARY' }
  };
  return map[type] || { color: colors.primary, label: 'LESSON' };
}

/**
 * Utility: Get Icon for Slide Type
 */
function getSlideIcon(type) {
  const map = {
    starter: '🤔',
    main: '📚',
    activity: '⚡',
    assessment: '❓',
    plenary: '🎓'
  };
  return map[type] || '📄';
}

/**
 * Main Generation Function
 */
async function generatePowerPoint(slideData, outputPath, imageMap = null) {
  if (!slideData) throw new Error('slideData is required');
  if (!outputPath) throw new Error('outputPath is required');

  const pptx = new PptxGenJS();
  const subject = slideData.subject || 'general';
  const theme = getThemeForSubject(subject);

  // Setup Metadata
  pptx.author = 'LessonLaunch';
  pptx.title = slideData.title;
  pptx.layout = 'LAYOUT_WIDE';

  // 0. Define Templates (Master Slides)
  defineMasterSlides(pptx, theme);

  // 1. Title Slide
  renderTitleSlide(pptx, slideData, theme);

  // 2. Objectives Slide
  renderObjectivesSlide(pptx, slideData, theme);

  // 3. Content Slides
  if (slideData.slides) {
    slideData.slides.forEach((slide, index) => {
      // Determine Images
      let slideImages = [];
      if (imageMap) {
        if (slide.selectedImages && Array.isArray(slide.selectedImages) && slide.selectedImages.length > 0) {
           slide.selectedImages.forEach(img => { if (img) slideImages.push(img); });
        }
        if (slideImages.length === 0 && slide.imageSuggestions) {
          slide.imageSuggestions.forEach(desc => {
            if (imageMap.has(desc)) {
              slideImages.push(imageMap.get(desc));
            }
          });
        }
      } else if (slide.selectedImages && Array.isArray(slide.selectedImages) && slide.selectedImages.length > 0) {
        slide.selectedImages.forEach(img => { if (img) slideImages.push(img); });
      }

      // Choose Layout
      let layout = 'standard';
      if (slideImages.length > 0) {
        layout = 'imageRight';
      }

      // Render
      if (Layouts[layout]) {
        Layouts[layout](pptx, slide, theme, { index, images: slideImages });
      } else {
        Layouts.standard(pptx, slide, theme, { index });
      }
    });
  }

  // 4. Resources & Differentiation
  if (slideData.differentiation) renderDifferentiationSlide(pptx, slideData, theme);
  if (slideData.resources) renderResourcesSlide(pptx, slideData, theme);

  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

/**
 * Render Helper: Title Slide
 */
function renderTitleSlide(pptx, data, theme) {
  // Use the Title Master
  const slide = pptx.addSlide({ masterName: 'MASTER_TITLE' });
  const { colors } = theme;
  
  // Background is handled by Master
  
  slide.addText(data.title, {
    x: 0.5, y: 2, w: 9, h: 1.5,
    fontSize: 60, fontFace: 'Comic Sans MS', color: colors.white, bold: true, align: 'center'
  });
  
  if (data.learningQuestion) {
    slide.addText(data.learningQuestion, {
      x: 1, y: 4, w: 8, h: 1,
      fontSize: 32, fontFace: 'Comic Sans MS', color: colors.white, align: 'center', italic: true
    });
  }
}

/**
 * Render Helper: Objectives
 */
function renderObjectivesSlide(pptx, data, theme) {
  if (!data.objectives || data.objectives.length === 0) return;
  
  // Use Standard Master (or generic)
  const slide = pptx.addSlide({ masterName: 'MASTER_STANDARD' });
  const { colors } = theme;

  // Manually add title for non-standard slides, or use renderHeader if we wanted consistency
  // But Objectives slide usually looks different. We'll stick to custom drawing but use Master background
  
  slide.addText('Learning Objectives', {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 44, fontFace: 'Comic Sans MS', color: colors.primary, bold: true
  });
  
  let y = 1.8;
  data.objectives.forEach(obj => {
    slide.addShape('roundRect', {
      x: 0.8, y: y, w: 8.4, h: 0.8,
      fill: { color: colors.white },
      line: { color: colors.secondary, width: 2 }
    });
    slide.addText(obj, {
      x: 1, y: y, w: 8, h: 0.8,
      fontSize: 28, fontFace: 'Comic Sans MS', color: colors.text, valign: 'middle'
    });
    y += 1.0;
  });
}

/**
 * Render Helper: Differentiation
 */
function renderDifferentiationSlide(pptx, data, theme) {
  const slide = pptx.addSlide({ masterName: 'MASTER_STANDARD' });
  const { colors } = theme;
  
  slide.addText('Differentiation', {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 44, fontFace: 'Comic Sans MS', color: colors.primary, bold: true
  });
  
  // Support
  if (data.differentiation.support) {
    slide.addShape('rect', { x: 0.5, y: 1.8, w: 4.2, h: 5, fill: { color: '#e3f2fd' } });
    slide.addText('Support', { x: 0.7, y: 2, fontSize: 30, fontFace: 'Comic Sans MS', bold: true, color: colors.primary });
    slide.addText(data.differentiation.support, { x: 0.7, y: 2.6, w: 3.8, h: 4, fontSize: 22, fontFace: 'Comic Sans MS' });
  }
  
  // Stretch
  if (data.differentiation.stretch) {
    slide.addShape('rect', { x: 5.3, y: 1.8, w: 4.2, h: 5, fill: { color: '#fff3e0' } });
    slide.addText('Stretch', { x: 5.5, y: 2, fontSize: 30, fontFace: 'Comic Sans MS', bold: true, color: colors.accent });
    slide.addText(data.differentiation.stretch, { x: 5.5, y: 2.6, w: 3.8, h: 4, fontSize: 22, fontFace: 'Comic Sans MS' });
  }
}

/**
 * Render Helper: Resources
 */
function renderResourcesSlide(pptx, data, theme) {
  if (!data.resources || data.resources.length === 0) return;
  
  const slide = pptx.addSlide({ masterName: 'MASTER_STANDARD' });
  const { colors } = theme;
  
  slide.addText('Resources Needed', {
    x: 0.5, y: 0.5, w: 9, h: 0.8,
    fontSize: 44, fontFace: 'Comic Sans MS', color: colors.primary, bold: true
  });
  
  const items = data.resources.map(r => `• ${r}`).join('\n');
  slide.addText(items, {
    x: 1, y: 1.8, w: 8, h: 5,
    fontSize: 28, fontFace: 'Comic Sans MS', color: colors.text, lineSpacing: 32, valign: 'top'
  });
}

module.exports = { generatePowerPoint };
