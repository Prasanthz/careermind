const express = require('express')
const router = express.Router()
const db = require('../config/db')
const Groq = require('groq-sdk')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const auth = require('../middleware/authMiddleware')

// ── Helper: Fisher-Yates shuffle ──────────────────────────────
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// GET all questions — shuffled every time
router.get('/questions', async (req, res) => {
  try {
    const [questions] = await db.execute(
      'SELECT * FROM questions ORDER BY display_order'
    )
    // Shuffle before sending so every quiz session is different
    res.json({ questions: shuffleArray(questions) })
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

// DELETE clear result for retake
router.delete('/clear-result', auth, async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM test_attempts WHERE user_id = ?',
      [req.user.id]
    )
    res.json({ message: 'Result cleared' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST submit answers → AI analysis
router.post('/submit', async (req, res) => {
  try {
    const { answers, stage } = req.body

    const [questions] = await db.execute(
      'SELECT * FROM questions ORDER BY display_order'
    )

    let answersText = ''
    questions.forEach((q, i) => {
      const ans = answers[i]
      const chosen = ans === 'A' ? q.option_a : q.option_b
      answersText += `Q${i + 1}. ${q.question_text} → ${chosen}\n`
    })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are an MBTI personality expert. Analyze these answers carefully.

IMPORTANT RULES:
- Do NOT always return INTJ
- Analyze answers honestly and return the CORRECT personality type
- Count each dimension separately:
  * Extrovert(A) vs Introvert(B) based on social questions
  * Sensing(A) vs Intuition(B) based on practical vs ideas questions  
  * Thinking(A) vs Feeling(B) based on logic vs emotion questions
  * Judging(A) vs Perceiving(B) based on structure vs flexibility questions
- If mostly B answers → likely INFP, ISFP, ISFJ, INFJ type
- If mostly A answers → likely ENTJ, ESTJ, ENFJ type
- Return ONLY valid JSON, no extra text, no markdown

User Stage: ${stage}
User Location: India. Salaries in LPA format only (e.g. 4 - 8 LPA). No currency symbol.

Answers:
${answersText}

Return this exact JSON structure:
{
  "personality_type": "4 letter MBTI code based on actual answers",
  "personality_name": "The actual name for this type",
  "description": "2-3 sentence description",
  "top_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "improve_traits": ["area1", "area2", "area3"],
  "top_careers": [
    {"title": "Career 1", "reason": "why it fits", "salary": "X - Y LPA"},
    {"title": "Career 2", "reason": "why it fits", "salary": "X - Y LPA"},
    {"title": "Career 3", "reason": "why it fits", "salary": "X - Y LPA"},
    {"title": "Career 4", "reason": "why it fits", "salary": "X - Y LPA"},
    {"title": "Career 5", "reason": "why it fits", "salary": "X - Y LPA"}
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
      temperature: 0.9,
      max_tokens: 2000,
    })

    const text = completion.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

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