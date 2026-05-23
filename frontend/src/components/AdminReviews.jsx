import { useState, useEffect } from 'react'

const stageLabels = {
  school: '🎒 School Student',
  college: '🎓 College Student',
  jobseeker: '💼 Job Seeker',
  switcher: '🔄 Career Switcher',
  professional: '👩‍💼 Working Professional',
}

export default function AdminReviews({ token }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const fetchReviews = () => {
    setLoading(true)
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews/all`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setReviews(data.reviews || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchReviews() }, [])

  const toggleFeature = async (id, current) => {
    setMsg('')
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews/${id}/feature`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ featured: !current })
    })
    const data = await res.json()
    if (!res.ok) { setMsg('❌ ' + data.message); return }
    setMsg('✅ ' + data.message)
    fetchReviews()
    setTimeout(() => setMsg(''), 3000)
  }

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchReviews()
  }

  const featuredCount = reviews.filter(r => r.featured).length

  if (loading) return <div className="text-center text-gray-400 py-10">Loading reviews...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-xl">⭐ User Reviews</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {featuredCount}/4 featured on landing page
          </p>
        </div>
        <div className="flex gap-2">
          <span className="bg-purple-600/20 text-purple-400 border border-purple-600/30 px-3 py-1 rounded-lg text-sm">
            {reviews.length} total
          </span>
          <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-3 py-1 rounded-lg text-sm">
            ⭐ {featuredCount} featured
          </span>
        </div>
      </div>

      {msg && (
        <div className="mb-4 bg-purple-600/20 border border-purple-600/30 text-purple-300 px-4 py-3 rounded-xl text-sm">
          {msg}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="text-center text-gray-500 py-10">No reviews yet</div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className={`rounded-2xl p-5 border transition-all ${
                r.featured
                  ? 'bg-purple-600/10 border-purple-500/50'
                  : 'bg-[#1A1A2E] border-purple-900/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {r.profile_pic ? (
                    <img src={r.profile_pic} className="w-10 h-10 rounded-full object-cover border-2 border-purple-600" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-sm">
                      {r.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white">{r.name}</div>
                    <div className="text-gray-500 text-xs">{stageLabels[r.stage] || r.stage}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {'⭐'.repeat(r.rating)}
                </div>
              </div>

              <p className="text-gray-300 text-sm mt-3 leading-relaxed">"{r.message}"</p>

              <div className="flex items-center justify-between mt-4">
                <span className="text-gray-600 text-xs">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFeature(r.id, r.featured)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      r.featured
                        ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-600/40 hover:bg-red-600/20 hover:text-red-400 hover:border-red-600/40'
                        : 'bg-purple-600/20 text-purple-400 border border-purple-600/30 hover:bg-purple-600/40'
                    }`}
                  >
                    {r.featured ? '★ Unfeature' : '☆ Feature'}
                  </button>
                  <button
                    onClick={() => deleteReview(r.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/40 transition-all"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>

              {r.featured && (
                <div className="mt-2 text-xs text-yellow-400 font-semibold">
                  ✨ Featured on landing page (slot {r.featured_order})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}