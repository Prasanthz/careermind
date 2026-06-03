const express = require('express')
const router = express.Router()
const db = require('../config/db')
const Groq = require('groq-sdk')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const auth = require('../middleware/authMiddleware')

// ── Smart model selector with fallback ──
async function groqComplete(messages, options = {}) {
  try {
    return await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      ...options,
      messages,
    })
  } catch (err) {
    if (err?.status === 429 || err?.message?.includes('rate') || err?.message?.includes('quota')) {
      console.warn('⚠️ 70B quota hit — falling back to 8B model')
      return await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        ...options,
        messages,
      })
    }
    throw err
  }
}

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
    res.json({ questions: shuffleArray(questions) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// GET latest result
router.get('/latest-result', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT result_json, taken_at FROM test_attempts WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1',
      [req.user.id]
    )
    if (rows.length > 0) {
      res.json({ result: JSON.parse(rows[0].result_json), taken_at: rows[0].taken_at })
    } else {
      res.json({ result: null })
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET quiz meta — last questions updated time
router.get('/meta', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT questions_updated_at FROM quiz_meta WHERE id = 1')
    res.json({ questions_updated_at: rows[0]?.questions_updated_at || null })
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
    questions.forEach((q) => {
      const ans = answers[q.id]
      const chosen = ans === 'A' ? q.option_a : q.option_b
      answersText += `Q. ${q.question_text} → ${chosen}\n`
    })

    const messages = [
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
    ]

    const completion = await groqComplete(messages, { temperature: 0.9, max_tokens: 2000 })

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

// POST /api/quiz/generate-journey
router.post('/generate-journey', async (req, res) => {
  try {
    const {
      personality_type,
      personality_name,
      chosen_career,
      top_traits,
      skills_to_learn,
    } = req.body

    if (!chosen_career) {
      return res.status(400).json({ message: 'chosen_career is required' })
    }

    const messages = [
      {
        role: 'user',
        content: `You are a professional career coach. Generate a deeply personalized learning journey.

Personality Type: ${personality_type} - ${personality_name}
Chosen Career: ${chosen_career}
Their Key Strengths: ${top_traits?.join(', ') || 'analytical, driven'}
Skills to Learn: ${skills_to_learn?.join(', ') || 'core skills'}

STRICT RULES:
1. Generate 3-4 phases with REALISTIC durations for this specific career
   - Simple careers (content creator, marketer): 30-45 days per phase
   - Tech/Engineering: 45-60 days per phase
   - Medicine/Law/Architecture: 60-90 days per phase
2. IMPORTANT: Each phase MUST have tasks = duration_days ÷ 3 (roughly one task every 3 days)
   - 30-day phase → 10 tasks minimum
   - 45-day phase → 15 tasks minimum
   - 60-day phase → 20 tasks minimum
   - 90-day phase → 30 tasks minimum
   - Do NOT generate only 5-10 tasks for a 60-day phase
3. Tasks must be SPECIFIC and ACTIONABLE — include duration in brackets where applicable:
   - Courses: "Watch Python for Beginners on freeCodeCamp (5 hrs)"
   - Books: "Read Clean Code by Robert Martin (320 pages)" or "Read Atomic Habits (3 weeks)"
   - Practice: "Build a CRUD app using Node.js and MySQL"
   - Simple tasks (no duration needed): "Create a GitHub account and push first repo"
4. Mix task types: videos, books, practice projects, networking, portfolio tasks
5. Daily schedule must be specific to ${chosen_career} — no generic placeholders
6. Return ONLY valid JSON — no markdown, no backticks, no explanation

Return this exact JSON structure:
{
  "roadmap": [
    {
      "month": "Month 1-2",
      "goal": "Specific goal for ${chosen_career}",
      "duration_days": 60,
      "tasks": [
        "Task 1 (with duration if applicable)",
        "Task 2",
        "Task 3",
        "Task 4",
        "Task 5",
        "Task 6",
        "Task 7",
        "Task 8",
        "Task 9",
        "Task 10",
        "Task 11",
        "Task 12",
        "Task 13",
        "Task 14",
        "Task 15",
        "Task 16",
        "Task 17",
        "Task 18",
        "Task 19",
        "Task 20"
      ]
    },
    {
      "month": "Month 3-4",
      "goal": "Second phase goal",
      "duration_days": 60,
      "tasks": ["task1","task2","task3","task4","task5","task6","task7","task8","task9","task10","task11","task12","task13","task14","task15","task16","task17","task18","task19","task20"]
    },
    {
      "month": "Month 5-6",
      "goal": "Third phase goal",
      "duration_days": 60,
      "tasks": ["task1","task2","task3","task4","task5","task6","task7","task8","task9","task10","task11","task12","task13","task14","task15","task16","task17","task18","task19","task20"]
    }
  ],
  "daily_schedule": [
    {"time": "6:00 AM", "task": "Specific morning routine for ${chosen_career}", "icon": "🌅"},
    {"time": "7:30 AM", "task": "Specific learning activity", "icon": "📖"},
    {"time": "12:00 PM", "task": "Specific midday practice", "icon": "💡"},
    {"time": "4:00 PM", "task": "Specific afternoon task", "icon": "🎯"},
    {"time": "7:00 PM", "task": "Specific evening practice", "icon": "💻"},
    {"time": "9:30 PM", "task": "Review + plan next day", "icon": "✅"}
  ]
}`
      }
    ]

    const completion = await groqComplete(messages, { temperature: 0.7, max_tokens: 8000 })

    const text = completion.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()

    let data
    try {
      data = JSON.parse(clean)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr)
      return res.status(500).json({ message: 'AI returned invalid JSON', raw: clean })
    }

    if (!data.roadmap || !data.daily_schedule) {
      return res.status(500).json({ message: 'AI response missing required fields' })
    }

    res.json(data)
  } catch (err) {
    console.error('Journey generation error:', err)
    res.status(500).json({ message: 'Failed to generate journey', error: err.message })
  }
})

// GET saved journey
router.get('/journey', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT journey_data FROM journeys WHERE user_id = ?',
      [req.user.id]
    )
    if (rows.length === 0) return res.json({ journey: null })
    res.json({ journey: JSON.parse(rows[0].journey_data) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// POST save journey
router.post('/save-journey', auth, async (req, res) => {
  try {
    const { journey } = req.body
    await db.execute(
      `INSERT INTO journeys (user_id, journey_data)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE journey_data = ?, updated_at = NOW()`,
      [req.user.id, JSON.stringify(journey), JSON.stringify(journey)]
    )
    res.json({ message: 'Journey saved' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router