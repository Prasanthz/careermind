const express = require('express')
const router = express.Router()
const { register, login } = require('../controllers/authController')
const auth = require('../middleware/authMiddleware')
const db = require('../config/db')

router.post('/register', register)
router.post('/login', login)

router.patch('/update-stage', auth, async (req, res) => {
  try {
    const { stage } = req.body
    await db.execute(
      'UPDATE users SET stage = ? WHERE id = ?',
      [stage, req.user.id]
    )
    res.json({ message: 'Stage updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router