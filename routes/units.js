const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { generateUnitPlan, determineKeyStage, determineSubject } = require('../services/aiService');
const { supabase } = require('../config/supabase');

// Generate a Unit Plan
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { topic, numLessons, yearGroup, subject, additionalInfo } = req.body;

    if (!topic || !numLessons) {
      return res.status(400).json({ error: 'Topic and number of lessons are required' });
    }

    const keyStage = determineKeyStage(topic, yearGroup || '');
    const detectedSubject = subject || determineSubject(topic, '');

    const unitPlan = await generateUnitPlan({
      topic,
      keyStage,
      subject: detectedSubject,
      numLessons,
      additionalContext: additionalInfo
    });

    res.json({
      success: true,
      data: unitPlan
    });
  } catch (error) {
    console.error('Unit Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate unit plan' });
  }
});

module.exports = router;
