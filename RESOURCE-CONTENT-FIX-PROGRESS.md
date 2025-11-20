# Resource Sheet Content Fix - Progress Log

**Issue ID:** Resource Content Missing  
**Date Started:** November 19, 2024  
**Status:** In Progress - Testing Required

---

## 🔴 Problem Summary

Resource sheets are being generated with **references to content that doesn't exist**.

**Symptoms:**
- Resource sheets say "Read the model text" but no text is provided
- Instructions reference "the template" or "the paragraph" but nothing is there
- Questions ask about content that isn't on the page
- The `contentText` field (which should contain 150-300 words of actual content) is completely missing

**Impact:**
- Resource sheets are completely useless to teachers and students
- Users cannot use the generated materials in their classrooms

---

## 🔍 Root Cause Analysis

### What We Discovered:

1. **AI Service Logs Show Missing Data:**
   ```
   🔍 Checking for contentText in activity: MISSING
   🔍 Checking for contentText in activity: MISSING
   ```

2. **The AI is not generating the `contentText` field** despite:
   - It being included in the structural example
   - Explicit instructions in the prompt
   - Multiple attempts to strengthen the prompt

3. **Why This Happens:**
   - The AI may be running out of tokens before generating full resource content
   - The `contentText` field was positioned after other fields, so it gets truncated
   - The prompt wasn't forceful enough about the requirement

---

## 🛠️ Fixes Implemented

### Fix #1: Reordered JSON Structure Priority
**File:** `services/aiService.js` (lines 241-264)

**What Changed:**
- Moved `contentText` to be the **FIRST field** in the JSON structure
- Added "MANDATORY" label to the example content
- This ensures the AI generates the content BEFORE optional fields

**Before:**
```javascript
items: [{
  title: "Activity 1",
  instructions: "Complete the activities using what you learned",
  contentText: "..." // Last field
}]
```

**After:**
```javascript
items: [{
  contentText: "MANDATORY: [150-300 words]...", // FIRST field
  title: "Activity 1",
  instructions: "Read the text above carefully, then answer questions",
  ...
}]
```

---

### Fix #2: Enhanced System Prompt with Strong Requirements
**File:** `services/aiService.js` (lines 283-318)

**What Changed:**
Added a comprehensive, emoji-highlighted section in the system prompt:

```
🚨 ABSOLUTE REQUIREMENT FOR RESOURCES - READ CAREFULLY:

EVERY resource item MUST START with contentText as the FIRST FIELD.
The contentText field is 150-300 words of ACTUAL CONTENT that appears ON THE RESOURCE SHEET.

⚠️ contentText MUST BE FIRST IN THE JSON STRUCTURE:
{
  contentText: "150-300 words of actual content here...",
  title: "Activity title",
  instructions: "Instructions here",
  ...other fields
}

What goes in contentText by subject:
• ENGLISH: Full model paragraph/poem/story that students read
• HISTORY: Complete historical account/source document with dates
• SCIENCE: Full experiment procedure OR information text
• GEOGRAPHY: Complete case study OR location description
• MATHEMATICS: Worked example with step-by-step solution

🚫 NEVER reference "the model text" without INCLUDING the text!
🚫 NEVER reference "the template" without BEING the template!
✅ The contentText IS what students read - complete and standalone!
```

**Why This Works:**
- Uses visual markers (emojis) to catch AI attention
- Explicit field ordering requirement
- Clear examples for each subject
- Strong negative examples (what NOT to do)

---

### Fix #3: Strengthened User Prompt
**File:** `services/aiService.js` (lines 348-372)

**What Changed:**
Added a second critical warning in the user message with JSON structure example:

```
🚨 CRITICAL - READ THIS CAREFULLY:
For resourceContent.items, the FIRST field in EVERY item MUST be "contentText" containing 150-300 words.

JSON structure MUST be:
{
  resourceContent: {
    items: [
      {
        contentText: "[WRITE 150-300 WORDS HERE]",
        title: "Activity name",
        ...
      }
    ]
  }
}

The contentText is NOT optional. It is NOT "TBD".
WITHOUT contentText, the resource is completely useless and will fail validation.
```

**Why This Works:**
- Reinforces the requirement in the user message (second reminder)
- Shows exact JSON structure expected
- Uses strong language ("completely useless", "fail validation")

---

### Fix #4: Debug Logging to Verify AI Response
**File:** `services/aiService.js` (lines 478-489)

**What Changed:**
Added logging immediately after parsing the AI response:

```javascript
if (slideData.resourceContent && slideData.resourceContent.items) {
  console.log('\n🔍 AI RESPONSE - Resource Content Structure:');
  slideData.resourceContent.items.forEach((item, index) => {
    console.log(`  Item ${index + 1}:`);
    console.log(`    - title: ${item.title || 'MISSING'}`);
    console.log(`    - contentText: ${item.contentText ? `PRESENT (${item.contentText.length} chars)` : '❌ MISSING'}`);
    if (item.contentText) {
      console.log(`    - contentText preview: "${item.contentText.substring(0, 100)}..."`);
    }
  });
}
```

**What This Shows:**
```
🔍 AI RESPONSE - Resource Content Structure:
  Item 1:
    - title: Activity 1: Understanding the Nile
    - contentText: PRESENT (287 chars)
    - contentText preview: "The River Nile was the most important feature of Ancient Egypt..."
```

**Why This Is Critical:**
- Confirms whether the AI is actually generating `contentText`
- Shows the length (should be 150-300 words = ~750-1500 chars)
- Provides a preview to verify quality
- Helps us diagnose if the AI is still ignoring instructions

---

## 📊 Current Status

### ✅ Completed:
- [x] Identified root cause (AI not generating `contentText`)
- [x] Reordered JSON structure to prioritize `contentText`
- [x] Enhanced system prompt with strong requirements
- [x] Strengthened user prompt with explicit warnings
- [x] Added debug logging to track AI responses
- [x] Server restarted with updated code

### ⏳ Pending:
- [ ] User to generate a new lesson with resources
- [ ] Verify debug logs show `contentText: PRESENT`
- [ ] Check resource sheet has actual content
- [ ] Confirm questions reference the provided content
- [ ] Test across multiple subjects (English, History, Science, Math)

---

## 🧪 Testing Instructions

### To Test the Fix:

1. **Generate a new lesson** with these settings:
   - Any topic (e.g., "Ancient Egypt and the River Nile")
   - Key Stage: KS2
   - Subject: History
   - ✅ Enable "Additional Resources"
   - Duration: 60 minutes

2. **Check the server terminal** for this output:
   ```
   🔍 AI RESPONSE - Resource Content Structure:
     Item 1:
       - title: [Activity Title]
       - contentText: PRESENT (XXX chars)
       - contentText preview: "The actual content text..."
   ```

3. **Open the generated resource sheet** and verify:
   - ✅ There's a "📖 Read this carefully:" section
   - ✅ It contains 150-300 words of actual content
   - ✅ The questions below reference facts from that content
   - ✅ No references to "the model text" or "the template" without the actual content

---

## 🎯 Expected Outcome

### If Fix Is Successful:

**Resource Sheet Should Look Like:**

```
📖 Read this carefully:

[BORDERED BOX WITH HIGHLIGHTED BACKGROUND]
The River Nile was the most important feature of Ancient Egypt. 
It flowed from south to north, bringing water to the desert. 
Every year, the Nile flooded, depositing rich, black soil on 
the riverbanks. This made the land fertile for growing crops 
like wheat and barley. Ancient Egyptians built their villages 
along the Nile and used boats to travel and transport goods. 
Without the Nile, Ancient Egypt could not have existed.
[END BOX]

📝 Answer these questions:
┌─────────────────────────────────────────────┐
│ 1. What direction did the Nile flow?       │
│                                             │
│ 2. What happened every year when Nile flood?│
│                                             │
└─────────────────────────────────────────────┘

✏️ Fill in the blanks:
• The River Nile flows from _____ to _____.
• The flooding deposited _____ soil on the riverbanks.

💭 Challenge Questions:
• Explain why the Nile was called "the gift of Egypt".
• Describe how Ancient Egyptians used the Nile.
```

**Key Success Criteria:**
- ✅ Actual content is present (150-300 words)
- ✅ Questions reference facts from the content
- ✅ Students can answer questions using only what's on the page
- ✅ No references to external materials

---

## 🔄 Next Steps

### If Fix Works:
1. Test with multiple subjects (English, Science, Math, Geography)
2. Verify content quality across different topics
3. Check SEND scaffolding also includes `contentText`
4. Document successful fix
5. Close this issue

### If Fix Doesn't Work:
1. **Analyze the debug logs** to see what AI actually returned
2. **Possible escalations:**
   - Increase `max_tokens` from 8000 to 12000 (give AI more space)
   - Split resource generation into separate AI call
   - Use a dedicated prompt just for generating `contentText`
   - Add validation that rejects responses without `contentText`
3. **Alternative approach:**
   - Generate resources in a second pass after slides are done
   - Use slide content to populate resource `contentText`

---

## 📝 Files Modified

### Core Changes:
- **`services/aiService.js`** - Enhanced AI prompts and added debug logging
  - Lines 241-264: Reordered JSON structure
  - Lines 283-318: Enhanced system prompt
  - Lines 348-372: Strengthened user prompt
  - Lines 478-489: Debug logging

### Supporting Files:
- **`services/resourceSheetService.js`** - Already has rendering logic for `contentText`
  - Lines 1131-1180: Renders `contentText` in bordered box
  - Lines 1186-1220: Generates questions based on content

### Related Documentation:
- **`CONTENT-MATERIALS-FIX.md`** - Previous attempt to fix issue
- **`CURRICULUM-ALIGNED-QUESTIONS.md`** - Question generation system
- **`VISUAL-FORMATS-COMPLETE.md`** - Subject-specific formats

---

## 💡 Technical Notes

### Why contentText Was Missing:

1. **Token Limitations:**
   - AI has 8000 max output tokens
   - Generating 6-10 slides + resources is a lot
   - If `contentText` is at the end, it gets truncated

2. **Prompt Clarity:**
   - Previous prompts said it was "important" but not "mandatory"
   - No visual emphasis (emojis, structure)
   - Positioned as one of many fields, not the critical one

3. **Field Order:**
   - AI generates fields in order
   - If `contentText` is last, and tokens run out, it's omitted
   - Moving it to first position ensures it gets generated

### AI Behavior Insights:

- **AI follows structure first, instructions second**
- **Visual markers (emojis, warnings) improve compliance**
- **Repetition in system + user prompts is necessary**
- **Field order in JSON example matters for token-limited responses**
- **Negative examples ("DON'T do X") as effective as positive ones**

---

## 🎓 Lessons Learned

1. **Put critical fields FIRST in JSON structure** - They won't get truncated
2. **Use strong visual markers** - 🚨, ⚠️, ✅, 🚫 catch AI attention
3. **Repeat requirements** - System prompt + user prompt both need it
4. **Add debug logging** - Essential for diagnosing AI behavior
5. **Test incrementally** - Generate lesson → check logs → verify output

---

**Last Updated:** November 19, 2024, 4:30 PM  
**Status:** Ready for testing  
**Next Action:** User generates new lesson and reports results

