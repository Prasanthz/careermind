const express = require('express')
const router = express.Router()
const db = require('../config/db')
const Groq = require('groq-sdk')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const auth = require('../middleware/authMiddleware')

// GET all questions
router.get('/questions', async (req, res) => {
  try {
    const [questions] = await db.execute(
      'SELECT * FROM questions ORDER BY display_order'
    )
    res.json({ questions })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// GET latest result
router.get('/latest-result', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT result_json FROM test_attempts WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1',
      [req.user.id]
    )
    if (rows.length > 0) {
      res.json({ result: JSON.parse(rows[0].result_json) })
    } else {
      res.json({ result: null })
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST submit answers → AI analysis
router.post('/submit', async (req, res) => {
  try {
    const { answers, stage } = req.body

    // Get questions to match answers
    const [questions] = await db.execute(
      'SELECT * FROM questions ORDER BY display_order'
    )

    // Build answers text
    let answersText = ''
    questions.forEach((q, i) => {
      const ans = answers[i]
      const chosen = ans === 'A' ? q.option_a : q.option_b
      answersText += `Q${i + 1}. ${q.question_text} → ${chosen}\n`
    })

    // Call Groq AI
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Analyze this personality test and return JSON only (no extra text, no markdown):

User Stage: ${stage}
User Location: India. All salary ranges must be in LPA format only (e.g. 4 - 8 LPA). Do NOT use any currency symbol. Be realistic for Indian job market.
Answers:
${answersText}

Return this exact JSON:
{
  "personality_type": "INTJ",
  "personality_name": "The Architect",
  "description": "2-3 sentence description",
  "top_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "improve_traits": ["area1", "area2", "area3"],
  "top_careers": [
    {"title": "Career 1", "reason": "why it fits", "salary": "4 - 8 LPA"},
    {"title": "Career 2", "reason": "why it fits", "salary": "4 - 8 LPA"},
    {"title": "Career 3", "reason": "why it fits", "salary": "4 - 8 LPA"},
    {"title": "Career 4", "reason": "why it fits", "salary": "4 - 8 LPA"},
    {"title": "Career 5", "reason": "why it fits", "salary": "4 - 8 LPA"}
  ],
  "courses": [
    {"name": "Course name", "platform": "Coursera", "url": "https://coursera.org", "duration": "2 months", "free": true},
    {"name": "Course name", "platform": "YouTube", "url": "https://youtube.com", "duration": "10 hours", "free": true},
    {"name": "Course name", "platform": "Udemy", "url": "https://udemy.com", "duration": "3 months", "free": false}
  ],
  "skills_to_learn": ["skill1", "skill2", "skill3", "skill4"],
  "skills_you_have": ["skill1", "skill2", "skill3"],
  "famous_people": ["Person 1", "Person 2", "Person 3"],
  "team_style": "How this person works in teams",
  "leadership_style": "Their leadership approach",
  "ideal_work_environment": "Best work environment description",
  "roadmap": [
    {"month": "Month 1-2", "goal": "Learn basics", "tasks": ["task1", "task2"]},
    {"month": "Month 3-4", "goal": "Build projects", "tasks": ["task1", "task2"]},
    {"month": "Month 5-6", "goal": "Apply for jobs", "tasks": ["task1", "task2"]}
  ]
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const text = completion.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    // Save to database if user is logged in
    const token = req.headers.authorization?.split(' ')[1]
    if (token) {
      try {
        const jwt = require('jsonwebtoken')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        await db.execute(
          'INSERT INTO test_attempts (user_id, answers_json, stage, result_json) VALUES (?, ?, ?, ?)',
          [decoded.id, JSON.stringify(answers), stage, JSON.stringify(result)]
        )
      } catch (e) {
        // Guest user - don't save
      }
    }

    res.json({ result })

  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'AI analysis failed', error: err.message })
  }
})

module.exports = router