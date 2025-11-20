# 📚 Curriculum-Aligned Resource Sheet Questions

**Date:** November 18, 2024  
**Status:** ✅ **COMPLETE**

---

## Overview

Resource sheets now generate **lesson-specific questions** based on actual PowerPoint content, using curriculum databases and AI to ensure questions are relevant, age-appropriate, and aligned with UK National Curriculum standards.

---

## How It Works

### 1. **Curriculum Databases (Already Built-In)**

We have curriculum standards for all subjects and key stages:

**Location:** `/data/curriculum-standards.js`

**Content:**
- UK National Curriculum objectives for KS1 and KS2
- Subject-specific standards (English, Maths, Science, History, Geography, etc.)
- Age-appropriate learning outcomes

**Example for History KS2:**
```javascript
history: [
  "Understand chronology and use historical terms accurately",
  "Ask and answer questions about the past",
  "Understand how knowledge of the past is constructed from sources",
  "Make comparisons between different periods in history"
]
```

### 2. **Subject Overview Files (Optional Enhancement)**

**Location:** `/subject-overviews/` (you can add these)

For specific topics, you can add detailed overview files:
- `history/ancient-egypt.txt`
- `science/photosynthesis.txt`
- `geography/rivers.txt`

**Benefits:**
- Even more specific, detailed questions
- Topic-specific vocabulary
- Curriculum-aligned content

**The AI will automatically:**
1. Detect the subject (e.g., "History")
2. Find relevant overview files (e.g., "ancient-egypt.txt")
3. Use this information to generate better questions

---

## Question Generation Process

### Step 1: **AI Analyzes Lesson Content**

When you generate a lesson on "Ancient Egypt and the River Nile for Year 3":

1. **Detects:** Subject = History, Key Stage = KS2, Year = 3
2. **Loads:** Relevant curriculum standards
3. **Generates:** PowerPoint with specific content about:
   - Geography of Ancient Egypt
   - Importance of the Nile
   - Daily life along the river
   - Pharaohs and pyramids
   - Egyptian farming methods

### Step 2: **AI Creates Matching Questions**

The AI then generates **three types of questions** based on what's actually in the PowerPoint:

#### **A) Table Questions** (5-6 short answer)
Based directly on slide content:
```
• What is the capital of Ancient Egypt?
• Name two crops that grew along the Nile
• Why was the flooding season important?
• What role did the pharaoh have?
• Describe one way Egyptians used the Nile
```

#### **B) Gap Fill Questions** (3-4 sentences)
Using key facts from the lesson:
```
• The River Nile flows through _____ and provides _____ for farming.
• Ancient Egyptians used _____ to write and built _____ as tombs.
• The _____ season brought nutrient-rich soil to the land.
```

#### **C) Open Questions** (3-4 deeper thinking)
Testing understanding:
```
• Explain why the River Nile was called 'the gift of Egypt'.
• Describe daily life for children in Ancient Egypt.
• How did Ancient Egyptians use the Nile for transportation?
```

### Step 3: **Resource Sheet Uses AI Questions**

The resource sheet service takes these AI-generated questions and formats them into:
- ✅ Practice tables
- ✅ Gap fill exercises  
- ✅ Challenge section

**Everything is curriculum-aligned and lesson-specific!**

---

## What Makes Questions Specific

### ❌ **Before (Generic):**
```
Question: "What did you learn today?"
Gap Fill: "The _____ is _____ because _____."
```

### ✅ **After (Lesson-Specific):**
```
Question: "Why was the flooding season important to Ancient Egyptian farmers?"
Gap Fill: "The Nile flooded every year bringing _____ soil that made the land _____ for crops."
```

**The difference:**
- Questions reference actual content from the PowerPoint
- Use specific vocabulary from the lesson
- Test knowledge of exact facts taught
- Aligned with curriculum standards for that age group

---

## Curriculum Alignment Features

### **Age-Appropriate Language**

**Year 1 (KS1):**
- Simple sentences
- Concrete concepts
- Basic vocabulary
- Picture-based questions

**Year 6 (KS2):**
- Complex sentences
- Abstract thinking
- Advanced vocabulary
- Analysis questions

### **Subject-Specific Standards**

**History Example:**
- Chronological understanding
- Historical sources
- Cause and effect
- Comparing time periods

**Science Example:**
- Scientific vocabulary
- Observation skills
- Fair testing
- Recording results

**Geography Example:**
- Location knowledge
- Human/physical features
- Environmental impact
- Map skills

### **No Multiple Choice** (Ofstead Guidance)

All questions are:
- ✅ Short answer
- ✅ Gap fill
- ✅ Open-ended
- ✅ Table completion

**Never:**
- ❌ Multiple choice (A, B, C, D)
- ❌ True/False

---

## Example: Real Lesson Flow

### **User Input:**
```
Topic: "The Water Cycle"
Subject: Science
Year: 4
Duration: 60 minutes
```

### **System Process:**

1. **Loads:** KS2 Science curriculum standards on states of matter and the water cycle
2. **Generates PowerPoint** with slides covering:
   - What is the water cycle?
   - Evaporation explained
   - Condensation process
   - Precipitation types
   - The cycle repeats

3. **Creates Resource Sheet** with specific questions:

**Table Questions:**
```
• What is evaporation?
• Where does condensation happen?
• Name three types of precipitation
• Why does water evaporate from the sea?
• What happens to water when it gets cold?
```

**Gap Fill:**
```
• When water is heated by the _____, it evaporates and becomes _____.
• Water vapour rises and _____ to form _____.
• When clouds get heavy, _____ falls as rain, snow, or _____.
```

**Open Questions:**
```
• Explain the journey of a water droplet through the water cycle.
• Why is the water cycle important for life on Earth?
• What would happen if the sun stopped heating the Earth's water?
```

**All answerable from the PowerPoint lesson!**

---

## SEND Support

When SEND scaffolding is enabled:
- **Fewer questions** (4 instead of 6 in tables)
- **Simpler language** in gap fills
- **Extra help boxes** with sentence starters
- **More space** for answers

But still uses the **same lesson-specific content**!

---

## Future Enhancements

You can make this even better by adding:

### **1. Subject Overview Files**

Create `/subject-overviews/history/ancient-egypt.txt`:
```
Ancient Egypt Timeline:
- 3100 BCE: Upper and Lower Egypt united
- 2686 BCE: Old Kingdom begins (pyramid building)
- 1550 BCE: New Kingdom (Tutankhamun era)

Key Vocabulary:
- Pharaoh: Egyptian king
- Hieroglyphics: Egyptian writing system
- Papyrus: Paper made from reeds
- Sarcophagus: Stone coffin

Common Questions for Year 3:
- What was daily life like for Egyptian children?
- How did Egyptians build the pyramids?
- Why was the Nile so important?
```

The AI will use this to generate even more specific questions!

### **2. Question Banks (Future)**

You could add pre-approved question sets:
```
/question-banks/year3-history-egypt.json
```

This ensures consistency across lessons.

---

## Key Benefits

### For Teachers:
- ✅ **No manual question writing** - AI does it
- ✅ **Curriculum-aligned automatically**
- ✅ **Age-appropriate language**
- ✅ **Matches lesson content exactly**
- ✅ **Saves hours of prep time**

### For Students:
- ✅ **Questions they can actually answer** (from the lesson)
- ✅ **Clear, focused practice**
- ✅ **Appropriate difficulty level**
- ✅ **Reinforces what they just learned**

### For Ofstead:
- ✅ **No multiple choice** (guidance for primary)
- ✅ **Active learning formats**
- ✅ **Curriculum-aligned**
- ✅ **Age-appropriate assessment**

---

## Testing It

**Generate a lesson:**
1. Enter specific topic: "Ancient Egypt and the River Nile"
2. Specify subject: History
3. Specify year: Year 3
4. Check "Additional Resources"
5. Generate

**Check the resource sheet:**
- Questions should reference actual facts from your PowerPoint
- Gap fills should use vocabulary from the slides
- Open questions should test concepts explained in the lesson
- Everything should be answerable using the lesson content

---

## Summary

✅ **Curriculum databases built-in** (UK National Curriculum)  
✅ **AI analyzes PowerPoint content**  
✅ **Generates lesson-specific questions**  
✅ **Age-appropriate for Key Stage**  
✅ **No multiple choice**  
✅ **Interactive formats only**  
✅ **Matches what was taught**

**Every resource sheet is now perfectly aligned with its PowerPoint lesson!** 🎯

