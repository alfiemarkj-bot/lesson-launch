# Testing Checklist - Resource Content Fix

## Quick Test Steps

### 1. Generate a New Lesson
- Topic: "Ancient Egypt and the River Nile"
- Key Stage: KS2
- Subject: History
- Duration: 60 minutes
- ✅ **Enable "Additional Resources"** checkbox
- ✅ **Optional: Enable "Generate Images"** for full test

### 2. Watch the Terminal
Look for this output in the server logs:
```
🔍 AI RESPONSE - Resource Content Structure:
  Item 1:
    - title: [something]
    - contentText: PRESENT (XXX chars)  ← Should say PRESENT, not MISSING
    - contentText preview: "The actual content..."
```

### 3. Check the Resource Sheet
Open the downloaded Word document and verify:

**✅ SUCCESS looks like:**
- Has "📖 Read this carefully:" section
- Contains 150-300 words of actual content in a bordered box
- Questions below reference facts from that content
- Everything students need is ON THE PAGE

**❌ FAILURE looks like:**
- Says "Read the model text" but no text is there
- Says "Use the template" but no template exists
- Questions reference content that isn't on the page

---

## What to Report

### If It Works:
> "Working! The resource sheet now has [X] words of actual content about [topic]. Questions reference the content correctly."

### If It Doesn't Work:
> "Still not working. The terminal shows: [paste the AI RESPONSE log]. The resource sheet still says [describe what you see]."

---

## Server Status
✅ Server is running on http://localhost:3000  
✅ Latest code is loaded with all fixes  
✅ Debug logging is active  

**Ready to test!**

