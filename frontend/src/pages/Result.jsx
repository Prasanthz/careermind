import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReviewSubmit from '../components/ReviewSubmit'
import CareerPicker from '../components/CareerPicker'

export default function Result() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [showDownload, setShowDownload] = useState(false)
  const [newQuestionsAvailable, setNewQuestionsAvailable] = useState(false)
  const [showCareerPicker, setShowCareerPicker] = useState(false)
  const [generatingJourney, setGeneratingJourney] = useState(false)
  const [journeyError, setJourneyError] = useState(null)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('loginExpiry')
    localStorage.removeItem('result')
    navigate('/login', { replace: true })
  }

  const isLoggedIn = () => {
    const token = localStorage.getItem('token')
    const expiry = localStorage.getItem('loginExpiry')
    if (!token || !expiry) return false
    if (expiry === 'never') return true
    return Date.now() < parseInt(expiry)
  }

  const downloadPDF = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/result/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, type: 'pdf' })
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.personality_type}-CareerMind-Report.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCard = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/result/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result, type: 'png' })
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.personality_type}-CareerMind-Card.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRetake = async () => {
    localStorage.removeItem('result')
    localStorage.removeItem('guestResult')
    const token = localStorage.getItem('token')
    if (token) {
      await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/clear-result`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
    }
    navigate('/quiz', { replace: true })
  }

  // ── NEW: generate journey for chosen career ───────────────────────────────
  const handleCareerSelect = async (chosenCareer) => {
    setGeneratingJourney(true)
    setJourneyError(null)
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
          top_traits: result.top_traits || [],
          skills_to_learn: result.skills_to_learn || [],
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
      setJourneyError(err.message)
      setGeneratingJourney(false)
    }
  }

  useEffect(() => {
    const saved = isLoggedIn()
      ? localStorage.getItem('result')
      : localStorage.getItem('guestResult')
    if (!saved) {
      navigate('/')
      return
    }
    setResult(JSON.parse(saved))

    const checkNewQuestions = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) return
        const [metaRes, resultRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/quiz/meta`),
          fetch(`${import.meta.env.VITE_API_URL}/api/quiz/latest-result`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])
        const metaData = await metaRes.json()
        const resultData = await resultRes.json()
        if (metaData.questions_updated_at && resultData.taken_at) {
          const takenAt = new Date(resultData.taken_at)
          const updatedAt = new Date(metaData.questions_updated_at)
          if (updatedAt > takenAt) setNewQuestionsAvailable(true)
        }
      } catch (e) {}
    }
    checkNewQuestions()
  }, [])

  // ── Show CareerPicker overlay ─────────────────────────────────────────────
  if (showCareerPicker) {
    return (
      <>
        <CareerPicker
          result={result}
          onSelect={handleCareerSelect}
          loading={generatingJourney}
        />
        <button
          onClick={() => setShowCareerPicker(false)}
          className="fixed top-4 left-4 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all"
        >
          ← Back
        </button>
        {journeyError && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
            ⚠️ {journeyError}
          </div>
        )}
      </>
    )
  }

  if (!result) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.svg" alt="CareerMind AI" className="h-20 w-auto mx-auto mb-6 animate-pulse" />
        <p className="text-purple-400 font-semibold">Loading your result...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <img src="/logo.svg" alt="CareerMind AI" className="h-10 w-auto" />
          <div className="flex items-center gap-2">
            {JSON.parse(localStorage.getItem('user') || '{}').email === 'prasanths1204@gmail.com' && (
              <button
                onClick={() => navigate('/admin')}
                className="text-sm text-gray-400 border border-purple-900/50 px-3 py-2 rounded-lg hover:border-purple-500 transition-all"
              >
                ⚙️ Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 border border-purple-900/50 px-4 py-2 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* Personality Type Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-700/50 rounded-2xl p-8 text-center"
        >
          <div className="text-6xl font-extrabold text-white mb-1">{result.personality_type}</div>
          <div className="text-2xl font-bold text-purple-300 mb-4">{result.personality_name}</div>
          <p className="text-gray-300 leading-relaxed">{result.description}</p>
        </motion.div>

        {/* New Questions Banner */}
        {newQuestionsAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-yellow-400 font-semibold">🆕 New questions added!</p>
              <p className="text-yellow-300/70 text-sm mt-0.5">Retake quiz for a more accurate result</p>
            </div>
            <button
              onClick={handleRetake}
              className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-all whitespace-nowrap text-sm"
            >
              Retake Now
            </button>
          </motion.div>
        )}

        {/* Skill Gap Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">⚡ Skill Gap Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-green-400 text-sm font-semibold mb-2">✅ Skills You Have</h3>
              <div className="space-y-1">
                {result.skills_you_have?.map((s, i) => (
                  <div key={i} className="text-gray-300 text-sm bg-green-900/20 px-3 py-2 rounded-lg">{s}</div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-orange-400 text-sm font-semibold mb-2">📖 Skills to Learn</h3>
              <div className="space-y-1">
                {result.skills_to_learn?.map((s, i) => (
                  <div key={i} className="text-gray-300 text-sm bg-orange-900/20 px-3 py-2 rounded-lg">{s}</div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🗺️ Your Learning Roadmap</h2>
          <div className="space-y-4">
            {result.roadmap?.map((phase, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                  {i < result.roadmap.length - 1 && <div className="w-0.5 bg-purple-900 flex-1 mt-1" />}
                </div>
                <div className="pb-4">
                  <div className="font-semibold text-purple-300">{phase.month}</div>
                  <div className="text-white font-medium">{phase.goal}</div>
                  <ul className="mt-2 space-y-1">
                    {phase.tasks?.map((task, j) => (
                      <li key={j} className="text-gray-400 text-sm">• {task}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Famous People + Work Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🌟 Famous People Like You</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {result.famous_people?.map((p, i) => (
              <span key={i} className="bg-purple-600/20 border border-purple-600/40 text-purple-300 px-4 py-2 rounded-full text-sm">{p}</span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1A1A2E] rounded-xl p-4">
              <div className="text-purple-400 text-sm font-semibold mb-1">👥 Team Style</div>
              <p className="text-gray-300 text-sm">{result.team_style}</p>
            </div>
            <div className="bg-[#1A1A2E] rounded-xl p-4">
              <div className="text-purple-400 text-sm font-semibold mb-1">🏢 Ideal Work Environment</div>
              <p className="text-gray-300 text-sm">{result.ideal_work_environment}</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-3 relative"
        >
          {isLoggedIn() && (
            <button
              onClick={handleRetake}
              className="flex-1 py-4 border border-purple-600 rounded-xl font-semibold hover:bg-purple-600/20 transition-all"
            >
              🔄 Retake Quiz
            </button>
          )}

          <div className="flex-1 relative">
            <button
              onClick={() => setShowDownload(!showDownload)}
              className="w-full py-4 bg-purple-700 rounded-xl font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              📥 Download
              <span className={`transition-transform ${showDownload ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showDownload && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#16213E] border border-purple-700/50 rounded-xl overflow-hidden z-10 shadow-xl">
                <button
                  onClick={() => { downloadPDF(); setShowDownload(false) }}
                  className="w-full py-4 px-6 text-left font-semibold hover:bg-purple-600/30 transition-all"
                >
                  📄 Download PDF Report
                </button>
                <div className="h-px bg-purple-900/50" />
                <button
                  onClick={() => { downloadCard(); setShowDownload(false) }}
                  className="w-full py-4 px-6 text-left font-semibold hover:bg-purple-600/30 transition-all"
                >
                  🖼️ Download Image Card
                </button>
              </div>
            )}
          </div>

          {/* CHANGED: Start Journey now opens CareerPicker instead of going directly to /journey */}
          {isLoggedIn() ? (
            <button
              onClick={() => setShowCareerPicker(true)}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              🚀 Start My Journey
            </button>
          ) : (
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              🔐 Login to Save Result
            </button>
          )}
        </motion.div>

        <ReviewSubmit />

      </div>
    </div>
  )
}