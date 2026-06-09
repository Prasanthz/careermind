const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const db = require('../config/db')

// ── Ensure table exists ───────────────────────────────────────────────────────
const createTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS journey_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      completed_tasks JSON DEFAULT NULL,
      task_progress JSON DEFAULT NULL,
      points INT DEFAULT 0,
      streak INT DEFAULT 0,
      last_active_day VARCHAR(20) DEFAULT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
}
createTable().catch(console.error)

// ── GET /api/journey-progress ─────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM journey_progress WHERE user_id = ?',
      [req.user.id]
    )
    if (!rows.length) {
      return res.json({
        completed_tasks: {},
        task_progress: {},
        points: 0,
        streak: 0,
        last_active_day: null
      })
    }
    const row = rows[0]
    res.json({
      completed_tasks: row.completed_tasks || {},
      task_progress: row.task_progress || {},
      points: row.points || 0,
      streak: row.streak || 0,
      last_active_day: row.last_active_day || null
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── POST /api/journey-progress ────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { completed_tasks, task_progress, points, streak, last_active_day } = req.body

    await db.query(`
      INSERT INTO journey_progress (user_id, completed_tasks, task_progress, points, streak, last_active_day)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        completed_tasks = VALUES(completed_tasks),
        task_progress   = VALUES(task_progress),
        points          = VALUES(points),
        streak          = VALUES(streak),
        last_active_day = VALUES(last_active_day),
        updated_at      = CURRENT_TIMESTAMP
    `, [
      req.user.id,
      JSON.stringify(completed_tasks || {}),
      JSON.stringify(task_progress || {}),
      points || 0,
      streak || 0,
      last_active_day || null
    ])

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ── DELETE /api/journey-progress ──────────────────────────────────────────────
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM journey_progress WHERE user_id = ?', [req.user.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router