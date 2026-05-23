import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReviewSubmit from '../components/ReviewSubmit'

export default function Result() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [showDownload, setShowDownload] = useState(false)

  const handleLogout = () => {
    // Keep guestResult if any, clear everything else
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

  useEffect(() => {
    const saved = isLoggedIn()
      ? localStorage.getItem('result')
      : localStorage.getItem('guestResult')
    if (!saved) {
      navigate('/')
      return
    }
    setResult(JSON.parse(saved))
  }, [])

  if (!result) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🧠</div>
        <p className="text-purple-400 font-semibold">Loading your result...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-lg font-bold text-purple-400">CareerMind AI</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 border border-purple-900/50 px-4 py-2 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-all"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {JSON.parse(localStorage.getItem('user') || '{}').email === 'prasanths1204@gmail.com' && (
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-gray-400 border border-purple-900/50 px-3 py-2 rounded-lg hover:border-purple-500 transition-all"
          >
            ⚙️ Admin
          </button>
        )}
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

        {/* Top Traits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">⭐ Your Strengths</h2>
          <div className="flex flex-wrap gap-2">
            {result.top_traits?.map((trait, i) => (
              <span key={i} className="bg-purple-600/30 border border-purple-600/50 text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
                {trait}
              </span>
            ))}
          </div>
          {result.improve_traits?.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-400 mt-4 mb-2">Areas to Improve</h3>
              <div className="flex flex-wrap gap-2">
                {result.improve_traits.map((trait, i) => (
                  <span key={i} className="bg-orange-600/20 border border-orange-600/40 text-orange-300 px-3 py-1 rounded-full text-sm">
                    {trait}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Top Careers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">💼 Top Career Matches</h2>
          <div className="space-y-3">
            {result.top_careers?.map((career, i) => (
              <div key={i} className="bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-white">{career.title}</span>
                  <span className="text-green-400 text-sm font-medium">{career.salary}</span>
                </div>
                <p className="text-gray-400 text-sm">{career.reason}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Courses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">📚 Recommended Courses</h2>
          <div className="space-y-3">
            {result.courses?.map((course, i) => (
                <a
                key={i}
                href={course.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20 hover:border-purple-500/50 transition-all group"
              >
                <div>
                  <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">{course.name}</div>
                  <div className="text-gray-400 text-sm">{course.platform} • {course.duration}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${course.free ? 'bg-green-600/30 text-green-400' : 'bg-orange-600/30 text-orange-400'}`}>
                  {course.free ? 'FREE' : 'Paid'}
                </span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Skill Gap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🛠️ Skill Gap Analysis</h2>
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
          {/* Retake Quiz — only for logged in */}
          {isLoggedIn() && (
            <button
              onClick={async () => {
                // Clear local result
                localStorage.removeItem('result')
                localStorage.removeItem('guestResult')
                
                // Also clear from database if logged in
                const token = localStorage.getItem('token')
                if (token) {
                  await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/clear-result`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                  })
                }
                
                navigate('/quiz', { replace: true })
              }}
              className="flex-1 py-4 border border-purple-600 rounded-xl font-semibold hover:bg-purple-600/20 transition-all"
            >
              🔄 Retake Quiz
            </button>
          )}

          {/* Download */}
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

          {/* Start Journey or Login to Save & Start Journey */}
          {isLoggedIn() ? (
            <button
              onClick={() => navigate('/journey')}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              🚀 Start My Journey
            </button>
          ) : (
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              🔐 Login to Start Journey
            </button>
          )}

        </motion.div>

      </div>
    </div>
  )
}