const express = require('express')
const router = express.Router()
const db = require('../config/db')
const auth = require('../middleware/authMiddleware')

// POST — user submits a review (must be logged in)
router.post('/', auth, async (req, res) => {
  try {
    const { rating, message } = req.body
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Review must be at least 10 characters' })
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }

    // Check if user already submitted a review
    const [existing] = await db.execute(
      'SELECT id FROM reviews WHERE user_id = ?', [req.user.id]
    )
    if (existing.length > 0) {
      // Update existing review
      await db.execute(
        'UPDATE reviews SET rating = ?, message = ?, featured = 0 WHERE user_id = ?',
        [rating, message.trim(), req.user.id]
      )
      return res.json({ message: 'Review updated!' })
    }

    await db.execute(
      'INSERT INTO reviews (user_id, rating, message) VALUES (?, ?, ?)',
      [req.user.id, rating, message.trim()]
    )
    res.json({ message: 'Review submitted! Thank you 🎉' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// GET — user's own review
router.get('/my', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT rating, message FROM reviews WHERE user_id = ?', [req.user.id]
    )
    res.json({ review: rows[0] || null })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET — public featured reviews for landing page (no auth needed)
router.get('/featured', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.id, r.rating, r.message, r.created_at, u.name,
              u.stage, u.profile_pic
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.featured = 1
       ORDER BY r.featured_order ASC
       LIMIT 4`
    )
    res.json({ reviews: rows })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET — admin: all reviews
router.get('/all', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.id, r.rating, r.message, r.featured, r.featured_order, r.created_at,
              u.name, u.stage, u.profile_pic
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    )
    res.json({ reviews: rows })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT — admin: toggle featured (max 4)
router.put('/:id/feature', auth, async (req, res) => {
  try {
    const { featured } = req.body
    const reviewId = req.params.id

    if (featured) {
      // Check how many are already featured
      const [[{ count }]] = await db.execute(
        'SELECT COUNT(*) as count FROM reviews WHERE featured = 1'
      )
      if (count >= 4) {
        return res.status(400).json({ message: 'Maximum 4 reviews can be featured. Unfeature one first.' })
      }
      // Set featured_order as next slot
      const [[{ maxOrder }]] = await db.execute(
        'SELECT COALESCE(MAX(featured_order), 0) as maxOrder FROM reviews WHERE featured = 1'
      )
      await db.execute(
        'UPDATE reviews SET featured = 1, featured_order = ? WHERE id = ?',
        [maxOrder + 1, reviewId]
      )
    } else {
      await db.execute(
        'UPDATE reviews SET featured = 0, featured_order = NULL WHERE id = ?',
        [reviewId]
      )
    }

    res.json({ message: featured ? 'Review featured!' : 'Review unfeatured!' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

// DELETE — admin: delete a review
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.execute('DELETE FROM reviews WHERE id = ?', [req.params.id])
    res.json({ message: 'Review deleted!' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router