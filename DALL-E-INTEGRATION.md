# DALL-E Image Integration

## Overview
Added AI-powered image generation using DALL-E 3 to automatically create educational images for PowerPoint slides and resource sheets.

## What's New

### 1. User Interface
- **New Checkbox**: "Generate AI images for slides and resources (adds ~30 seconds, uses DALL-E)"
- Users can opt-in to AI image generation
- If unchecked, placeholders are used instead (existing behavior)

### 2. Image Generation
- Uses OpenAI's DALL-E 3 API
- Generates 1024x1024 educational-style images
- Prompts are optimized for child-friendly, classroom-appropriate content
- ~$0.04 per image (standard quality)

### 3. Image Placement & Limits

#### PowerPoint Slides
- **Maximum: 3 images total** across entire presentation
- Up to 2 images per slide (when available)
- Positioned side-by-side at 4.0" x 3.0" each
- Still shows image suggestions in notes for reference

#### Word Documents (Resources)
- **Maximum: 1 image total** across all resource items
- Images inserted at specified positions (top/middle/bottom)
- 400 x 300 pixel size
- Falls back to placeholders if image generation fails

## Cost & Time Estimation

With the optimized limits:
- PowerPoint: Max 3 images
- Resources: Max 1 image
- **Total: ~4 images × $0.04 = ~$0.16 per lesson**
- **Time: ~20-25 seconds for image generation** (vs ~35-50 for 7 images)

Note: Duplicate descriptions are only generated once, further reducing costs.

## Implementation Details

### Files Modified
1. `index.html` - Added checkbox and form data collection
2. `services/imageGenerationService.js` - **NEW** - DALL-E integration
3. `services/powerpointService.js` - Insert actual images when available
4. `services/resourceSheetService.js` - Insert actual images when available
5. `server.js` - Orchestrates image generation workflow

### Workflow
1. User submits form with "Generate AI images" checked
2. AI generates slide content with image descriptions
3. **Image generation step**: DALL-E creates actual images
4. Images are temporarily saved to disk
5. PowerPoint and Word documents are generated with embedded images
6. Temporary image files are cleaned up

### Error Handling
- If image generation fails, system continues with placeholders
- Individual image failures don't stop the process
- All errors are logged for debugging

### Rate Limiting
- 500ms delay between image generation calls
- Sequential processing to avoid API rate limits

## Testing

### Test Scenarios

1. **Without Images** (default)
   - Uncheck "Generate AI images"
   - Should see placeholders: `[IMAGE: description]`
   - Fast generation (~15-20 seconds)

2. **With Images**
   - Check "Generate AI images"
   - Should see actual AI-generated images embedded
   - Longer generation (~45-60 seconds depending on image count)

3. **Partial Failure**
   - System should continue if some images fail
   - Mix of real images and placeholders

### How to Test

1. Start the server: `npm start`
2. Create a lesson (e.g., "Year 3 Ancient Egypt")
3. Check "I need additional resources"
4. Check "Generate AI images"
5. Submit and wait (~1 minute)
6. Download PowerPoint and Resources
7. Verify images are embedded

## Environment Requirements

- OpenAI API key with DALL-E 3 access
- Sufficient API credits
- Internet connection for API calls

## Future Enhancements

Potential improvements:
- Image style preferences (realistic, cartoon, diagram)
- Image size options
- Batch image generation for better efficiency
- Image caching to avoid regenerating same content
- User can upload their own images as alternatives

