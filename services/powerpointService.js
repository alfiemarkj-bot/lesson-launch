const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs').promises;
const { getThemeForSubject, VISUAL_ICONS } = require('../data/subject-themes');

console.log('✨ ENHANCED PowerPoint Service Loaded - COMIC SANS EDITION');

/**
 * Layout Definitions
 */
const Layouts = {
  /**
   * Standard layout: Title top, content below (full width)
   */
  standard: (pptx, slide, theme, options) => {
    const { colors } = theme;
    const slideObj = pptx.addSlide();
    slideObj.background = { color: colors.background };

    // Header
    renderHeader(slideObj, slide, theme, options.index);

    // Content
    if (slide.content) {
      renderContentText(slideObj, slide.content, {
        x: 0.7, y: 1.8, w: 8.6, h: 4.5,
        fontSize: 28, color: colors.text, fontFace: 'Comic Sans MS'
      }, theme);
    }

    // Notes box (if space permits)
    renderFooterBox(slideObj, slide, theme);
    
    return slideObj;
  },

  /**
   * Image Right layout: Content left, Images right
   */
  imageRight: (pptx, slide, theme, options) => {
    const { colors } = theme;
    const slideObj = pptx.addSlide();
    slideObj.background = { color: colors.background };

    // Header
    renderHeader(slideObj, slide, theme, options.index);

    // Content (Left Column)
    if (slide.content) {
      renderContentText(slideObj, slide.content, {
        x: 0.5, y: 1.8, w: 4.5, h: 4.5,
        fontSize: 24, color: colors.text, fontFace: 'Comic Sans MS'
      }, theme);
    }

    // Images (Right Column)
    if (options.images && options.images.length > 0) {
      const imgY = 1.8;
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

    renderFooterBox(slideObj, slide, theme);
    return slideObj;
  }
};

/**
 * Helper: Render Header with Icon and Progress Dots
 */
function renderHeader(slideObj, slide, theme, index) {
  const { colors } = theme;
  const typeConfig = getTypeConfig(slide.type, colors);

  // Background bar
  slideObj.addShape('rect', {
    x: 0, y: 0, w: '100%', h: 0.8,
    fill: { color: typeConfig.color },
    line: { color: 'transparent' }
  });

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
  slideObj.addText(slide.title || `Slide ${index + 1}`, {
    x: 0.5, y: 1.0, w: 9, h: 0.6,
    fontSize: 40, fontFace: 'Comic Sans MS', bold: true, color: colors.text, valign: 'top'
  });

  // Underline
  slideObj.addShape('rect', {
    x: 0.5, y: 1.6, w: 2, h: 0.05,
    fill: { color: typeConfig.color },
    line: { color: 'transparent' }
  });
}

/**
 * Helper: Render Content Text (Bullets or Paragraphs)
 */
function renderContentText(slideObj, content, layout, theme) {
  const { colors } = theme;
  const lines = content.split('\n').filter(l => l.trim());
  const isList = lines.some(l => l.trim().startsWith('-') || l.trim().startsWith('•'));

  if (isList) {
    // Bullet list
    const bullets = lines.map(l => l.replace(/^[-•]\s*/, '').trim()).filter(l => l);
    let y = layout.y;
    bullets.forEach(bullet => {
      slideObj.addShape('ellipse', {
        x: layout.x, y: y + 0.15, w: 0.1, h: 0.1,
        fill: { color: colors.primary }
      });
      slideObj.addText(bullet, {
        x: layout.x + 0.25, y: y, w: layout.w - 0.25, h: 0.5,
        fontSize: layout.fontSize, color: layout.color, fontFace: layout.fontFace || 'Comic Sans MS', valign: 'top'
      });
      y += 0.6;
    });
  } else {
    // Paragraphs
    slideObj.addText(content, {
      x: layout.x, y: layout.y, w: layout.w, h: layout.h,
      fontSize: layout.fontSize, color: layout.color, fontFace: layout.fontFace || 'Comic Sans MS', valign: 'top',
      lineSpacing: 24
    });
  }
}

/**
 * Helper: Render Footer Box (Notes/Prompts)
 */
function renderFooterBox(slideObj, slide, theme) {
  const { colors } = theme;
  if (slide.notes) {
    slideObj.addShape('rect', {
      x: 0, y: 6.8, w: '100%', h: 0.7,
      fill: { color: colors.gray, transparency: 80 }
    });
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
        // 1. Check selectedImages first (from editor)
        if (slide.selectedImages && Array.isArray(slide.selectedImages) && slide.selectedImages.length > 0) {
           // Add selected images (can be URLs or local paths)
           slide.selectedImages.forEach(img => {
             if (img) slideImages.push(img);
           });
        }
        
        // 2. Fallback to suggestions if no user selection and no images added yet
        if (slideImages.length === 0 && slide.imageSuggestions) {
          slide.imageSuggestions.forEach(desc => {
            if (imageMap.has(desc)) {
              slideImages.push(imageMap.get(desc));
            }
          });
        }
      } else if (slide.selectedImages && Array.isArray(slide.selectedImages) && slide.selectedImages.length > 0) {
        // Even if imageMap is null, we might have direct URLs in selectedImages
        slide.selectedImages.forEach(img => {
           if (img) slideImages.push(img);
        });
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
  const slide = pptx.addSlide();
  const { colors } = theme;
  
  slide.background = { color: colors.primary };
  
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
  
  const slide = pptx.addSlide();
  const { colors } = theme;
  
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
  const slide = pptx.addSlide();
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
  
  const slide = pptx.addSlide();
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