const express = require('express')
const router = express.Router()
const db = require('../config/db')

router.get('/', async (req, res) => {
  try {
    const [userRows] = await db.query('SELECT COUNT(*) as count FROM users')
    const [questionRows] = await db.query('SELECT COUNT(*) as count FROM questions')
    res.json({ 
      tested: userRows[0].count,
      questionCount: questionRows[0].count
    })
  } catch (err) {
    res.json({ tested: 0, questionCount: 25 })
  }
})

module.exports = router