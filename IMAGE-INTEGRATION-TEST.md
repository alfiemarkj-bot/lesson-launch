# Stock Image Integration - Testing Guide

**Status:** ✅ Fully Connected - Enhanced AI Prompts + Debug Logging  
**Date:** November 18, 2025

---

## 🔍 How It Works (End-to-End)

### 1. User Request
- User fills out lesson form
- Checks "Stock Images" checkbox ✅
- Submits form

### 2. AI Generation (`aiService.js`)
- AI generates lesson with **imageSuggestions** array in EVERY slide
- Example slide structure:
```json
{
  "slideNumber": 1,
  "title": "The Water Cycle",
  "content": "Learning about evaporation...",
  "type": "main",
  "notes": "Teacher notes here",
  "imageSuggestions": [
    "Diagram showing water cycle with evaporation, condensation, and precipitation",
    "Photo of clouds forming over ocean"
  ]
}
```

### 3. Image Extraction (`stockImageService.js`)
- Extracts `imageSuggestions` from all slides
- Extracts `images` from resource items
- **Limits:** 5 images for slides, 2 for resources
- **Now with debug logging!** Shows what was found

### 4. Stock Image Fetching (`stockImageService.js`)
- Searches Unsplash (or uses placeholders if no API key)
- Downloads images to local storage
- Creates **imageMap**: `description → file path`

### 5. PowerPoint Generation (`powerpointService.js`)
- For each slide with `imageSuggestions`:
  - Looks up image path in `imageMap`
  - Adds image to slide if found
  - Max 2 images per slide, 5 total across presentation

### 6. Resource Generation (`resourceSheetService.js`)
- For each resource item with `images` array:
  - Looks up image path in `imageMap`
  - Inserts image into Word document
  - Max 2 images per resource

---

## 🧪 Test It Now!

### Step 1: Generate a Lesson
```
Topic: The Water Cycle
Duration: 60 minutes
Checkboxes: ✅ Stock Images, ✅ Extra Resources
```

### Step 2: Watch the Console Logs
The server will now show detailed logging:

```bash
# Check server logs
tail -f server.log

# You should see:
🖼️ Fetching stock images from free image library...
📋 Extracting image descriptions from slide data...
   Slides in data: 8
   Slide "Introduction" has 2 image suggestions
   ✓ Added: Diagram showing water cycle with evaporation, condensation...
   Slide "Main Teaching" has 3 image suggestions
   ✓ Added: Photo of clouds forming over ocean...
   Resource items: 2
   Resource "Water Cycle Worksheet" has 2 images
   ✓ Added resource image: Map of major rivers and water bodies...
📊 Total image descriptions extracted: 7
   Descriptions: ['Diagram showing water cycle...', 'Photo of clouds...', ...]
Searching stock image: Diagram showing water cycle...
✓ Stock image downloaded: lesson-1-1732345678.jpg
✓ Downloaded 7 stock images
```

### Step 3: Check the PowerPoint
- Open downloaded PowerPoint
- **Expected:** Images appear on slides (up to 2 per slide, 5 total)
- **If using placeholder mode:** You'll see gray placeholder boxes with text
- **If using Unsplash:** You'll see real stock photos

### Step 4: Check the Resources
- Open downloaded Word document
- **Expected:** Images in resource sheets (up to 2 per resource)

---

## 🐛 Troubleshooting

### Issue: "Total image descriptions extracted: 0"

**Cause:** AI didn't include `imageSuggestions` in response

**Fix Applied:** ✅ Enhanced AI prompts:
- System prompt now says "CRITICAL - IMAGE SUGGESTIONS: EVERY slide MUST include..."
- User prompt now says "MANDATORY: EVERY slide MUST include 'imageSuggestions'..."
- Added specific examples of good image descriptions

**Test:** Generate a new lesson and check logs again

---

### Issue: "No images appear in PowerPoint"

**Possible Causes:**
1. ✅ AI not generating imageSuggestions (fixed with enhanced prompts)
2. Image download failed (check network)
3. PowerPoint service not using imageMap (already verified ✅)

**Debug Steps:**
```bash
# Check logs for:
1. "Total image descriptions extracted: X" (should be > 0)
2. "Searching stock image:" (should appear for each image)
3. "✓ Stock image downloaded:" (should appear for each successful download)
4. Any error messages
```

---

### Issue: Images are placeholders, not real photos

**Cause:** No Unsplash API key configured

**Solution (Optional):**
1. Sign up free at https://unsplash.com/developers
2. Create new app
3. Copy Access Key
4. Add to `.env`:
```bash
UNSPLASH_ACCESS_KEY=your-access-key-here
```
5. Restart server

**Note:** Placeholder mode is perfectly fine for testing! Images will still appear in PowerPoint with descriptive text.

---

## 📊 What Changed (Debug Logging Added)

### Before:
```
🖼️ Fetching stock images from free image library...
✓ Downloaded 0 stock images
```
(No idea why 0 images!)

### After:
```
🖼️ Fetching stock images from free image library...
📋 Extracting image descriptions from slide data...
   Slides in data: 8
   Slide "Introduction" has no imageSuggestions    ← AHA! AI forgot to add them
   Slide "Main Teaching" has no imageSuggestions
   ...
📊 Total image descriptions extracted: 0
```

Now we can **see exactly** where the problem is!

---

## ✅ Verification Checklist

Test and check off:

### AI Generation
- [ ] Generate lesson with "Stock Images" checked
- [ ] Check server logs show "Slides in data: X" (X > 0)
- [ ] Check each slide shows "has X image suggestions" (not "has no imageSuggestions")
- [ ] Check "Total image descriptions extracted" > 0

### Image Downloading
- [ ] Check logs show "Searching stock image:" for each description
- [ ] Check logs show "✓ Stock image downloaded:" for each image
- [ ] Check no error messages during download

### PowerPoint Integration
- [ ] Open PowerPoint file
- [ ] Verify images appear on slides
- [ ] Count images (should be up to 5 total, 2 per slide max)
- [ ] Check images are relevant to slide content

### Resource Integration  
- [ ] Open Word document (if resources were requested)
- [ ] Verify images appear in resource sheets
- [ ] Count images (should be up to 2 total)
- [ ] Check images are relevant to resource content

---

## 🎯 Expected Results

**Good Output:**
```
📋 Extracting image descriptions from slide data...
   Slides in data: 8
   Slide "Introduction to Water Cycle" has 2 image suggestions
   ✓ Added: Diagram showing water cycle with evaporation, condensat...
   ✓ Added: Photo of clouds forming over ocean...
   Slide "Evaporation Process" has 2 image suggestions
   ✓ Added: Close-up photo of water droplets evaporating from leaf...
   ✓ Added: Diagram of heat causing water molecules to rise...
   Slide "Condensation" has 2 image suggestions
   ✓ Added: Image of water vapor condensing on cold glass surface...
   [... continuing for other slides ...]
   Resource items: 2
   Resource "Water Cycle Worksheet" has 2 images
   ✓ Added resource image: Map of major rivers and water bodies...
   ✓ Added resource image: Cross-section diagram of water table...
📊 Total image descriptions extracted: 7
```

Then:
```
Searching stock image: Diagram showing water cycle...
✓ Stock image downloaded: lesson-1-1732345678.jpg
Searching stock image: Photo of clouds forming over ocean...
✓ Stock image downloaded: lesson-2-1732345679.jpg
[... continuing ...]
✓ Downloaded 7 stock images
```

**Result:** PowerPoint has 5 images (hit the limit), resources have 2 images!

---

## 💡 Key Points

1. **AI must include imageSuggestions** - Enhanced prompts now enforce this
2. **Debug logging helps** - You can now see exactly where things break
3. **Limits are enforced** - Max 5 for slides, 2 for resources
4. **Stock images are contextual** - Descriptions are used to search for relevant photos
5. **Unsplash is optional** - Works with placeholders if no API key

---

## 🚀 Next Steps

1. **Test Now:** Generate a lesson and watch the logs
2. **Check Output:** Verify images appear in PowerPoint and resources
3. **Report Back:** Let me know what the logs show!

If you see "has no imageSuggestions" for every slide, the AI is still not including them. The enhanced prompts should fix this, but we can make them even stronger if needed.

If you see "Total image descriptions extracted: 5+" but no images appear in PowerPoint, then it's an integration issue and we'll debug the PowerPoint service.

---

**Ready to test!** 🎨

