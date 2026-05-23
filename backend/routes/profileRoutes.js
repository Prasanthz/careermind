const express = require('express')
const router = express.Router()
const db = require('../config/db')
const auth = require('../middleware/authMiddleware')

// GET profile
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, age, stage, phone, dob, profile_pic FROM users WHERE id = ?',
      [req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' })
    res.json({ user: rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// PUT update profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, phone, dob, age, stage, profile_pic } = req.body

    await db.execute(
      `UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        dob = COALESCE(?, dob),
        age = COALESCE(?, age),
        stage = COALESCE(?, stage),
        profile_pic = COALESCE(?, profile_pic)
       WHERE id = ?`,
      [name || null, phone || null, dob || null, age || null, stage || null, profile_pic || null, req.user.id]
    )

    const [rows] = await db.execute(
      'SELECT id, name, email, age, stage, phone, dob, profile_pic FROM users WHERE id = ?',
      [req.user.id]
    )

    res.json({ message: 'Profile updated!', user: rows[0] })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router