import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReviewSubmit from '../components/ReviewSubmit'

export default function Result() {
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [showDownload, setShowDownload] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadType, setDownloadType] = useState(null)

  useEffect(() => {
    // Try logged-in result first, then guest result
    const saved = localStorage.getItem('result') || localStorage.getItem('guestResult')
    if (!saved) {
      navigate('/quiz')
      return
    }
    setResult(JSON.parse(saved))
  }, [])

  const handleDownload = async (type) => {
    setDownloading(true)
    setDownloadType(type)
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const token  = localStorage.getItem('token')
      const res = await fetch(`${apiUrl}/api/result/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ result, type }),
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = type === 'png'
        ? `${result.personality_type}-CareerMind-Card.png`
        : `${result.personality_type}-CareerMind-Report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Download failed. Please try again.')
    }
    setDownloading(false)
    setDownloadType(null)
  }

  const isLoggedIn = () => {
    const token  = localStorage.getItem('token')
    const expiry = localStorage.getItem('loginExpiry')
    if (!token || !expiry) return false
    if (expiry === 'never') return true
    return Date.now() < parseInt(expiry)
  }

  // ── LOADING SCREEN ───────────────────────────────────────
  if (!result) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center">
        {/* Logo spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-purple-900/40 border-t-purple-500 animate-spin" />
          {/* Logo image in center */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.svg"
              alt="CareerMind AI"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // Fallback to emoji if logo.svg not found
                e.target.style.display = 'none'
                e.target.parentNode.innerHTML = '<span class="text-2xl">🧠</span>'
              }}
            />
          </div>
        </div>
        <p className="text-purple-400 font-semibold text-lg">Analyzing your personality...</p>
        <p className="text-gray-500 text-sm mt-1">Crafting your career report</p>
      </div>
    </div>
  )

  const strengths   = result.strengths  || []
  const weaknesses  = result.weaknesses || []
  const careers     = result.careers    || []
  const courses     = result.courses    || []
  const skills_have = result.skills_have|| []
  const skills_need = result.skills_need|| []
  const roadmap     = result.roadmap    || []
  const work_style  = result.work_style || {}
  const famous      = result.famous_people || []

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-b border-purple-900/30 px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="CareerMind AI"
              className="h-9 w-auto"
              onError={(e) => { e.target.style.display='none' }}
            />
            <div>
              <h1 className="text-lg font-bold text-white">CareerMind AI</h1>
              <p className="text-gray-400 text-xs">Your Personality Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 text-sm border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-purple-500 transition-all"
            >
              ← Home
            </button>
            {isLoggedIn() && (
              <button
                onClick={() => navigate('/journey')}
                className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-all font-semibold"
              >
                🚀 Journey
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-5">

        {/* ── PERSONALITY TYPE HERO ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/60 to-pink-900/40 rounded-2xl p-6 border border-purple-700/40"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-5xl font-black text-white tracking-tight">
                {result.personality_type}
              </div>
              <div className="text-xl font-bold text-purple-300 mt-1">
                {result.personality_name}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">MBTI Personality Type</div>
            </div>
            <div className="text-right">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden border-2 border-purple-500/50">
                <img
                  src="/logo.svg"
                  alt=""
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    e.target.style.display='none'
                    e.target.parentNode.innerHTML='<span class="text-3xl">🧠</span>'
                  }}
                />
              </div>
            </div>
          </div>
          {result.description && (
            <p className="text-gray-300 text-sm mt-4 leading-relaxed">
              {result.description}
            </p>
          )}
        </motion.div>

        {/* ── STRENGTHS & WEAKNESSES ─────────────────────── */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-3">💪 Top Strengths</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {strengths.map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-purple-600/25 text-purple-200 rounded-full text-sm font-medium border border-purple-600/30">
                  {s}
                </span>
              ))}
            </div>
            {weaknesses.length > 0 && (
              <>
                <h3 className="font-semibold text-sm text-gray-400 mb-2">Areas to Improve</h3>
                <div className="flex flex-wrap gap-2">
                  {weaknesses.map((w, i) => (
                    <span key={i} className="px-3 py-1.5 bg-red-900/20 text-red-300 rounded-full text-sm border border-red-900/30">
                      {w}
                    </span>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── CAREER MATCHES ─────────────────────────────── */}
        {careers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-4">🎯 Top Career Matches</h2>
            <div className="space-y-3">
              {careers.map((career, i) => {
                const title  = typeof career === 'object' ? career.title  : career
                const salary = typeof career === 'object' ? (career.salary_range || career.salary || '') : ''
                const reason = typeof career === 'object' ? (career.reason || career.description || '') : ''
                return (
                  <div key={i} className="flex items-start gap-4 p-4 bg-[#1A1A2E] rounded-xl border border-purple-900/20">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{title}</div>
                      {reason && <div className="text-gray-400 text-xs mt-0.5">{reason}</div>}
                    </div>
                    {salary && (
                      <div className="text-green-400 text-sm font-bold shrink-0">{salary}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── RECOMMENDED COURSES ────────────────────────── */}
        {courses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-4">📚 Recommended Courses</h2>
            <div className="space-y-3">
              {courses.map((course, i) => {
                const name     = typeof course === 'object' ? course.name     : course
                const platform = typeof course === 'object' ? course.platform : ''
                const duration = typeof course === 'object' ? course.duration : ''
                const cost     = typeof course === 'object' ? (course.cost || course.price || 'Free') : 'Free'
                const url      = typeof course === 'object' ? course.url : ''
                return (
                  <div key={i} className="flex items-start gap-3 p-4 bg-[#1A1A2E] rounded-xl border border-purple-900/20">
                    <div className="w-6 h-6 rounded-full bg-purple-700/50 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                           className="font-medium text-white hover:text-purple-300 transition-colors">
                          {name}
                        </a>
                      ) : (
                        <div className="font-medium text-white">{name}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {platform && <span className="text-gray-400 text-xs">{platform}</span>}
                        {duration && <span className="text-gray-500 text-xs">· {duration}</span>}
                        {cost && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            cost.toLowerCase() === 'free'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-orange-900/20 text-orange-400'
                          }`}>{cost}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── SKILL GAP ANALYSIS ─────────────────────────── */}
        {(skills_have.length > 0 || skills_need.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-4">🔍 Skill Gap Analysis</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-green-400 text-xs font-bold uppercase tracking-wider mb-3">
                  ✓ Skills You Have
                </div>
                <div className="space-y-2">
                  {skills_have.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-green-400">•</span> {s}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
                  → Skills to Learn
                </div>
                <div className="space-y-2">
                  {skills_need.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-yellow-400">•</span> {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── LEARNING ROADMAP ───────────────────────────── */}
        {roadmap.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-4">🗺️ Learning Roadmap</h2>
            <div className="space-y-4">
              {roadmap.map((phase, i) => {
                const month = typeof phase === 'object' ? phase.month : `Phase ${i+1}`
                const goal  = typeof phase === 'object' ? phase.goal  : ''
                const tasks = typeof phase === 'object' ? (phase.tasks || []) : []
                return (
                  <div key={i} className="relative pl-6 border-l-2 border-purple-700/50">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600" />
                    <div className="text-purple-400 text-xs font-bold uppercase tracking-wider">{month}</div>
                    <div className="text-white font-semibold mt-0.5">{goal}</div>
                    {tasks.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {tasks.map((t, j) => (
                          <li key={j} className="text-gray-400 text-sm flex items-start gap-2">
                            <span className="text-purple-500 mt-0.5 shrink-0">•</span> {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── WORK STYLE ─────────────────────────────────── */}
        {Object.keys(work_style).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-4">🏢 Work & Leadership Style</h2>
            <div className="space-y-4">
              {[
                ['Team Style',        work_style.team_style],
                ['Leadership Style',  work_style.leadership_style],
                ['Ideal Environment', work_style.ideal_environment],
              ].filter(([,v]) => v).map(([label, value], i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-32 shrink-0">
                    <span className="text-purple-400 font-semibold text-sm">{label}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── FAMOUS PEOPLE ──────────────────────────────── */}
        {famous.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
          >
            <h2 className="font-bold text-lg mb-4">🌟 Famous People With Your Personality</h2>
            <div className="flex flex-wrap gap-3">
              {famous.map((name, i) => (
                <div key={i} className="px-4 py-2 bg-gradient-to-r from-purple-800/40 to-pink-800/30 rounded-xl border border-purple-700/30 text-white text-sm font-medium">
                  {name}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── ACTION BUTTONS ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30"
        >
          <h2 className="font-bold text-lg mb-1">📥 Download Your Report</h2>
          <p className="text-gray-400 text-xs mb-4">Save your personality report as PDF or share card as PNG</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading}
              className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl font-semibold hover:from-purple-500 hover:to-purple-600 transition-all disabled:opacity-50"
            >
              {downloading && downloadType === 'pdf' ? (
                <><span className="animate-spin">⏳</span> Generating...</>
              ) : (
                <><span>📄</span> Download PDF</>
              )}
            </button>
            <button
              onClick={() => handleDownload('png')}
              disabled={downloading}
              className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-pink-600 to-pink-700 rounded-xl font-semibold hover:from-pink-500 hover:to-pink-600 transition-all disabled:opacity-50"
            >
              {downloading && downloadType === 'png' ? (
                <><span className="animate-spin">⏳</span> Generating...</>
              ) : (
                <><span>🖼️</span> Share Card (PNG)</>
              )}
            </button>
          </div>

          {!isLoggedIn() && (
            <div className="mt-4 p-3 bg-purple-900/20 rounded-xl border border-purple-700/30 text-center">
              <p className="text-gray-400 text-sm">
                <button onClick={() => navigate('/login')} className="text-purple-400 font-semibold hover:underline">
                  Login
                </button>
                {' '}or{' '}
                <button onClick={() => navigate('/register')} className="text-purple-400 font-semibold hover:underline">
                  Register
                </button>
                {' '}to save your result and start your career journey 🚀
              </p>
            </div>
          )}

          {isLoggedIn() && (
            <button
              onClick={() => navigate('/journey')}
              className="w-full mt-3 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
            >
              🚀 Start My Career Journey
            </button>
          )}
        </motion.div>

        {/* ── REVIEW SUBMIT ──────────────────────────────── */}
        <ReviewSubmit />

      </div>
    </div>
  )
}