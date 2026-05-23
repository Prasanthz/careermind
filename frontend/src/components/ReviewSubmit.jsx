import { useState, useEffect } from 'react'

const stageLabels = {
  school: 'School Student',
  college: 'College Student',
  jobseeker: 'Job Seeker',
  switcher: 'Career Switcher',
  professional: 'Working Professional',
}

export default function ReviewSubmit() {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [existing, setExisting] = useState(null)
  const [open, setOpen] = useState(false)

  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) return
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.review) {
          setExisting(data.review)
          setRating(data.review.rating)
          setMessage(data.review.message)
        }
      })
      .catch(() => {})
  }, [])

  if (!token) return null // guests don't see this

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a star rating'); return }
    if (message.trim().length < 10) { setError('Please write at least 10 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, message })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); setLoading(false); return }
      setSuccess(data.message)
      setExisting({ rating, message })
      setOpen(false)
    } catch {
      setError('Cannot connect to server.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">⭐ Share Your Experience</h2>
          <p className="text-gray-400 text-xs mt-0.5">
            {existing ? 'You already submitted a review — edit it below' : 'Help others discover CareerMind AI!'}
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="px-4 py-2 bg-purple-600 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all"
        >
          {open ? 'Close' : existing ? '✏️ Edit' : '✍️ Write Review'}
        </button>
      </div>

      {success && !open && (
        <div className="mt-3 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-xl text-sm">
          {success}
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-4">
          {/* Star rating */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Your Rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="text-3xl transition-transform hover:scale-110"
                >
                  {star <= (hovered || rating) ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Your Review</p>
            <textarea
              rows={3}
              placeholder="Share how CareerMind AI helped your career journey..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all resize-none"
            />
            <p className="text-gray-600 text-xs mt-1">{message.length} characters (min 10)</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-xl text-sm">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            {loading ? '⏳ Submitting...' : existing ? '💾 Update Review' : '🚀 Submit Review'}
          </button>
        </div>
      )}
    </div>
  )
}