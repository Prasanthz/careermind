const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../config/db')

exports.register = async (req, res) => {
  try {
    const { name, email, password, age, stage, guestResult } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password required' })
    }

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, age, stage) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, age || null, stage || null]
    )

    const newUserId = result.insertId

    // ── Save guest result if they took the test before registering ──
    if (guestResult) {
      try {
        const parsed = typeof guestResult === 'string' ? JSON.parse(guestResult) : guestResult
        await db.execute(
          'INSERT INTO test_attempts (user_id, answers_json, stage, result_json) VALUES (?, ?, ?, ?)',
          [newUserId, JSON.stringify([]), parsed.stage || stage || '', JSON.stringify(parsed)]
        )
      } catch (e) {
        // Don't fail registration if saving result fails
        console.error('Failed to save guest result on register:', e.message)
      }
    }

    const token = jwt.sign(
      { id: newUserId, email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: newUserId, name, email, age, stage }
    })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }

    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email])
    if (users.length === 0) {
      return res.status(400).json({ message: 'No account found with this email' })
    }

    const user = users[0]
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(400).json({ message: 'Wrong password' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, age: user.age, stage: user.stage }
    })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}