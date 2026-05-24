import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReviewSubmit from '../components/ReviewSubmit'
import CareerPicker from '../components/CareerPicker'

export default function Result() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [showCareerPicker, setShowCareerPicker] = useState(false)
  const [generatingJourney, setGeneratingJourney] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('careerResult')
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

  // ── Career selection → generate journey ───────────────────────────────────
  const handleCareerSelect = async (chosenCareer) => {
    setGeneratingJourney(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/quiz/generate-journey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          personality_type: result.personality_type,
          personality_name: result.personality_name,
          chosen_career: chosenCareer,
          top_traits: result.top_traits,
          skills_to_learn: result.skills_to_learn,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to generate journey')
      }

      const journeyData = await res.json()

      // Save everything to localStorage
      const journeyPayload = {
        chosen_career: chosenCareer,
        personality_type: result.personality_type,
        personality_name: result.personality_name,
        roadmap: journeyData.roadmap,
        daily_schedule: journeyData.daily_schedule,
        started_at: new Date().toISOString(),
      }

      localStorage.setItem('journeyData', JSON.stringify(journeyPayload))
      // Reset progress when new career is chosen
      localStorage.removeItem('completedTasks')
      localStorage.setItem('journeyPoints', '0')
      localStorage.setItem('journeyStreak', '0')

      navigate('/journey')
    } catch (err) {
      setError(err.message)
      setGeneratingJourney(false)
    }
  }

  // ── Show career picker ────────────────────────────────────────────────────
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

  // ── Result page ───────────────────────────────────────────────────────────
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
          <h1 className="text-4xl font-bold text-white mb-1">{result.personality_type}</h1>
          <h2 className="text-2xl text-purple-300 font-semibold mb-3">{result.personality_name}</h2>
          <p className="text-slate-300 text-lg leading-relaxed">{result.description}</p>
        </motion.div>

        {/* Top Careers */}
        {result.top_careers?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">🎯 Your Top Career Matches</h3>
            <div className="space-y-2">
              {result.top_careers.map((career, i) => (
                <div key={career} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="text-purple-400 font-bold">#{i + 1}</span>
                  <span className="text-white font-medium">{career}</span>
                  {i === 0 && <span className="ml-auto text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full">Best Match</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Key Strengths */}
        {result.top_traits?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">⚡ Your Key Strengths</h3>
            <div className="flex flex-wrap gap-2">
              {result.top_traits.map((trait) => (
                <span key={trait} className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-200 rounded-full text-sm font-medium">
                  {trait}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills to Learn */}
        {result.skills_to_learn?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">📚 Skills to Develop</h3>
            <div className="flex flex-wrap gap-2">
              {result.skills_to_learn.map((skill) => (
                <span key={skill} className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 rounded-full text-sm font-medium">
                  {skill}
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