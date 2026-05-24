import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReviewSubmit from '../components/ReviewSubmit'
import CareerPicker from '../components/CareerPicker'

// safely convert any value to a renderable string
const safe = (val) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map(safe).join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// safely get an array field
const safeArr = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

export default function Result() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [showCareerPicker, setShowCareerPicker] = useState(false)
  const [generatingJourney, setGeneratingJourney] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('result')
    if (!stored) {
      navigate('/quiz')
      return
    }
    try {
      setResult(JSON.parse(stored))
    } catch {
      navigate('/quiz')
    }
  }, [navigate])

  const handleCareerSelect = async (chosenCareer) => {
    setGeneratingJourney(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/generate-journey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          personality_type: result.personality_type,
          personality_name: result.personality_name,
          chosen_career: chosenCareer,
          top_traits: safeArr(result.top_traits),
          skills_to_learn: safeArr(result.skills_to_learn),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to generate journey')
      }

      const journeyData = await res.json()

      const journeyPayload = {
        chosen_career: chosenCareer,
        personality_type: result.personality_type,
        personality_name: result.personality_name,
        roadmap: journeyData.roadmap,
        daily_schedule: journeyData.daily_schedule,
        started_at: new Date().toISOString(),
      }

      localStorage.setItem('journeyData', JSON.stringify(journeyPayload))
      localStorage.removeItem('completedTasks')
      localStorage.setItem('journeyPoints', '0')
      localStorage.setItem('journeyStreak', '0')

      navigate('/journey')
    } catch (err) {
      setError(err.message)
      setGeneratingJourney(false)
    }
  }

  if (showCareerPicker) {
    return (
      <>
        <CareerPicker
          result={result}
          onSelect={handleCareerSelect}
          loading={generatingJourney}
        />
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
            ⚠️ {error}
          </div>
        )}
      </>
    )
  }

  if (!result) return null

  const topCareers = safeArr(result.top_careers)
  const topTraits  = safeArr(result.top_traits)
  const skills     = safeArr(result.skills_to_learn)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1a4e] to-[#24243e] p-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Personality Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10 text-center"
        >
          <div className="text-6xl mb-3">🧠</div>
          <h1 className="text-4xl font-bold text-white mb-1">{safe(result.personality_type)}</h1>
          <h2 className="text-2xl text-purple-300 font-semibold mb-3">{safe(result.personality_name)}</h2>
          <p className="text-slate-300 text-lg leading-relaxed">{safe(result.description)}</p>
        </motion.div>

        {/* Top Careers */}
        {topCareers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">🎯 Your Top Career Matches</h3>
            <div className="space-y-2">
              {topCareers.map((career, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="text-purple-400 font-bold">#{i + 1}</span>
                  <span className="text-white font-medium">{safe(career)}</span>
                  {i === 0 && (
                    <span className="ml-auto text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full">
                      Best Match
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Key Strengths */}
        {topTraits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">⚡ Your Key Strengths</h3>
            <div className="flex flex-wrap gap-2">
              {topTraits.map((trait, i) => (
                <span key={i} className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-200 rounded-full text-sm font-medium">
                  {safe(trait)}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills to Learn */}
        {skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">📚 Skills to Develop</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span key={i} className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 rounded-full text-sm font-medium">
                  {safe(skill)}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Start Journey CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 backdrop-blur-md rounded-3xl p-8 border border-purple-500/30 text-center"
        >
          <div className="text-4xl mb-3">🚀</div>
          <h3 className="text-2xl font-bold text-white mb-2">Ready to Start Your Journey?</h3>
          <p className="text-slate-300 mb-6">
            Pick a career path and get a personalised roadmap, phase-by-phase plan, and daily schedule built just for you.
          </p>
          <button
            onClick={() => setShowCareerPicker(true)}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xl rounded-2xl
                       hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/30
                       hover:scale-105 active:scale-95"
          >
            🎯 Choose My Career Path
          </button>
        </motion.div>

        {/* Review Section */}
        <ReviewSubmit />
      </div>
    </div>
  )
}