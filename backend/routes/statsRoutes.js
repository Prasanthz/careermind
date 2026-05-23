const express = require('express')
const router = express.Router()
const db = require('../config/db')

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) as count FROM users')
    res.json({ tested: rows[0].count })
  } catch (err) {
    res.json({ tested: 0 })
  }
})

module.exports = router