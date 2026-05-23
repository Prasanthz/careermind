const express = require('express')
const router = express.Router()
const db = require('../config/db')
const auth = require('../middleware/authMiddleware')

// Get all users
router.get('/users', auth, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, name, email, age, stage, created_at FROM users ORDER BY created_at DESC'
    )
    res.json({ users })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all test attempts
router.get('/attempts', auth, async (req, res) => {
  try {
    const [attempts] = await db.execute(
      `SELECT t.id, u.name, u.email, t.stage, t.taken_at, t.result_json 
       FROM test_attempts t 
       JOIN users u ON t.user_id = u.id 
       ORDER BY t.taken_at DESC`
    )
    res.json({ attempts })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Get analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const [[{ totalUsers }]] = await db.execute(
      'SELECT COUNT(*) as totalUsers FROM users'
    )
    const [[{ totalTests }]] = await db.execute(
      'SELECT COUNT(*) as totalTests FROM test_attempts'
    )
    const [popularTypes] = await db.execute(
      `SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(result_json, '$.personality_type')) as type,
        COUNT(*) as count
       FROM test_attempts
       GROUP BY type
       ORDER BY count DESC
       LIMIT 5`
    )
    const [stageStats] = await db.execute(
      `SELECT stage, COUNT(*) as count 
       FROM test_attempts 
       GROUP BY stage`
    )
    res.json({ totalUsers, totalTests, popularTypes, stageStats })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all questions
router.get('/questions', auth, async (req, res) => {
  try {
    const [questions] = await db.execute(
      'SELECT * FROM questions ORDER BY display_order'
    )
    res.json({ questions })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete user
router.delete('/users/:id', auth, async (req, res) => {
  try {
    await db.execute('DELETE FROM test_attempts WHERE user_id = ?', [req.params.id])
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Add new question
router.post('/questions', auth, async (req, res) => {
  try {
    const { question_text, category, option_a, option_b, display_order } = req.body
    await db.execute(
      'INSERT INTO questions (question_text, category, option_a, option_b, display_order) VALUES (?, ?, ?, ?, ?)',
      [question_text, category, option_a, option_b, display_order]
    )
    await db.execute('UPDATE quiz_meta SET questions_updated_at = NOW() WHERE id = 1')
    res.json({ message: 'Question added successfully!' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Edit question
router.put('/questions/:id', auth, async (req, res) => {
  try {
    const { question_text, category, option_a, option_b, display_order } = req.body
    await db.execute(
      'UPDATE questions SET question_text=?, category=?, option_a=?, option_b=?, display_order=? WHERE id=?',
      [question_text, category, option_a, option_b, display_order, req.params.id]
    )
    await db.execute('UPDATE quiz_meta SET questions_updated_at = NOW() WHERE id = 1')
    res.json({ message: 'Question updated successfully!' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete question
router.delete('/questions/:id', auth, async (req, res) => {
  try {
    await db.execute('DELETE FROM questions WHERE id = ?', [req.params.id])
    await db.execute('UPDATE quiz_meta SET questions_updated_at = NOW() WHERE id = 1')
    res.json({ message: 'Question deleted!' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router