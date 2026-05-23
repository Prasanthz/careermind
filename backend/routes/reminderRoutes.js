const express = require('express')
const router = express.Router()
const db = require('../config/db')
const auth = require('../middleware/authMiddleware')
const nodemailer = require('nodemailer')
const cron = require('node-cron')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Save reminder preference
router.post('/set', auth, async (req, res) => {
  const { enabled, time } = req.body
  try {
    await db.execute(
      `INSERT INTO reminders (user_id, enabled, reminder_time)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE enabled = ?, reminder_time = ?`,
      [req.user.id, enabled, time, enabled, time]
    )
    res.json({ message: 'Reminder saved' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to save reminder' })
  }
})

// Get reminder preference
router.get('/get', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT enabled, reminder_time FROM reminders WHERE user_id = ?',
      [req.user.id]
    )
    res.json(rows[0] || { enabled: false, reminder_time: '08:00' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to get reminder' })
  }
})

// Test email — remove after testing
router.get('/test-email', auth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT email, name FROM users WHERE id = ?', [req.user.id])
    const user = rows[0]
    await transporter.sendMail({
      from: `"CareerMind AI" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: '🚀 Test - CareerMind Daily Reminder',
      html: `<p>Hi ${user.name}! This is a test reminder from CareerMind AI. 🎯</p>`
    })
    res.json({ message: `Test email sent to ${user.email}` })
  } catch (err) {
    res.status(500).json({ message: 'Email failed', error: err.message })
  }
})

// Cron job — runs every minute, checks who needs reminder
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const [users] = await db.execute(
      `SELECT r.user_id, r.reminder_time, u.email, u.name
       FROM reminders r
       JOIN users u ON u.id = r.user_id
       WHERE r.enabled = true AND r.reminder_time = ?`,
      [currentTime]
    )

    for (const user of users) {
      await transporter.sendMail({
        from: `"CareerMind AI" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '🚀 Time for your daily career learning!',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#1A1A2E;color:white;padding:30px;border-radius:16px">
            <h2 style="color:#a855f7">🧠 CareerMind AI</h2>
            <p>Hi <strong>${user.name}</strong>! 👋</p>
            <p>It's your daily learning time. Keep your streak alive and stay on track with your career journey!</p>
            <a href="https://careermind-eight.vercel.app/journey"
               style="display:inline-block;margin-top:16px;padding:12px 24px;background:linear-gradient(to right,#7c3aed,#db2777);color:white;border-radius:10px;text-decoration:none;font-weight:bold">
              🚀 Continue My Journey
            </a>
            <p style="color:#6b7280;font-size:12px;margin-top:24px">
              To turn off reminders, go to your Journey page settings.
            </p>
          </div>
        `
      })
      console.log(`✅ Reminder sent to ${user.email}`)
    }
  } catch (err) {
    console.error('Cron error:', err.message)
  }
})

module.exports = router