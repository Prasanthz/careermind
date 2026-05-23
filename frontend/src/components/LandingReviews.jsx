// Drop this component inside your Landing.jsx where you want reviews to appear
// Import: import LandingReviews from './LandingReviews'  (or paste inline)

import { useState, useEffect } from 'react'

const stageLabels = {
  school: 'School Student',
  college: 'College Student',
  jobseeker: 'Job Seeker',
  switcher: 'Career Switcher',
  professional: 'Working Professional',
}

export default function LandingReviews() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/reviews/featured`)
      .then(r => r.json())
      .then(data => setReviews(data.reviews || []))
      .catch(() => {})
  }, [])

  if (reviews.length === 0) return null

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white">What Our Users Say</h2>
          <p className="text-gray-400 mt-2">Real people, real career transformations</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30 hover:border-purple-500/50 transition-all"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, s) => (
                  <span key={s} className={s < r.rating ? 'text-yellow-400' : 'text-gray-700'}>★</span>
                ))}
              </div>

              {/* Message */}
              <p className="text-gray-300 text-sm leading-relaxed mb-5">"{r.message}"</p>

              {/* User */}
              <div className="flex items-center gap-3">
                {r.profile_pic ? (
                  <img src={r.profile_pic} className="w-10 h-10 rounded-full object-cover border-2 border-purple-600" alt={r.name} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-sm text-white">
                    {r.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div className="text-white font-semibold text-sm">{r.name}</div>
                  <div className="text-gray-500 text-xs">{stageLabels[r.stage] || r.stage}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}