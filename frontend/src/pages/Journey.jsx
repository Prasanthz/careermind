import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CareerPicker from '../components/CareerPicker'

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysSince(isoDate) {
  if (!isoDate) return 0
  const start = new Date(isoDate)
  const now = new Date()
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Journey() {
  const navigate = useNavigate()

  const [journey, setJourney] = useState(null)          // journeyData from localStorage
  const [completedTasks, setCompletedTasks] = useState({}) // { "phaseIdx-taskIdx": true }
  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [activeTab, setActiveTab] = useState('today')   // 'today' | 'phases' | 'schedule' | 'badges'
  const [showChangePicker, setShowChangePicker] = useState(false)
  const [generatingJourney, setGeneratingJourney] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState(0)
  const [error, setError] = useState(null)

  // ── Load state from localStorage ────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('journeyData')
    if (!stored) { navigate('/result'); return }

    try {
      setJourney(JSON.parse(stored))
    } catch {
      navigate('/result')
    }

    const ct = localStorage.getItem('completedTasks')
    if (ct) setCompletedTasks(JSON.parse(ct))

    setPoints(parseInt(localStorage.getItem('journeyPoints') || '0'))
    setStreak(parseInt(localStorage.getItem('journeyStreak') || '0'))
  }, [navigate])

  // ── Streak logic ─────────────────────────────────────────────────────────
  const updateStreak = useCallback(() => {
    const todayKey = getTodayKey()
    const lastActive = localStorage.getItem('lastActiveDay')

    if (lastActive === todayKey) return // already counted today

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().split('T')[0]

    let newStreak = streak
    if (lastActive === yesterdayKey) {
      newStreak = streak + 1
    } else if (lastActive && lastActive !== todayKey) {
      newStreak = 1 // reset
    } else {
      newStreak = 1
    }

    setStreak(newStreak)
    localStorage.setItem('journeyStreak', String(newStreak))
    localStorage.setItem('lastActiveDay', todayKey)
  }, [streak])

  // ── Toggle task completion ────────────────────────────────────────────────
  const toggleTask = (phaseIdx, taskIdx) => {
    // Phase locking: can only complete tasks in the first unlocked phase
    const unlockedPhase = getUnlockedPhase()
    if (phaseIdx > unlockedPhase) return // locked

    const key = `${phaseIdx}-${taskIdx}`
    const already = completedTasks[key]

    const updated = { ...completedTasks }
    if (already) {
      delete updated[key]
      setPoints((p) => { const v = Math.max(0, p - 10); localStorage.setItem('journeyPoints', v); return v })
    } else {
      updated[key] = true
      const newPts = points + 10
      setPoints(newPts)
      localStorage.setItem('journeyPoints', String(newPts))
      updateStreak()
    }

    setCompletedTasks(updated)
    localStorage.setItem('completedTasks', JSON.stringify(updated))
  }

  // ── Phase progress ────────────────────────────────────────────────────────
  const getPhaseProgress = (phaseIdx) => {
    if (!journey) return 0
    const tasks = journey.roadmap[phaseIdx]?.tasks || []
    if (tasks.length === 0) return 0
    const done = tasks.filter((_, ti) => completedTasks[`${phaseIdx}-${ti}`]).length
    return Math.round((done / tasks.length) * 100)
  }

  // Returns the index of the current unlocked phase (phase locking)
  const getUnlockedPhase = () => {
    if (!journey) return 0
    for (let i = 0; i < journey.roadmap.length; i++) {
      if (getPhaseProgress(i) < 100) return i
    }
    return journey.roadmap.length - 1
  }

  // ── Today's tasks (2 per day, cycling) ───────────────────────────────────
  const getTodayTasks = () => {
    if (!journey) return []
    const unlockedPhase = getUnlockedPhase()
    const phase = journey.roadmap[unlockedPhase]
    if (!phase) return []

    const pendingTasks = phase.tasks
      .map((task, ti) => ({ task, phaseIdx: unlockedPhase, taskIdx: ti }))
      .filter(({ phaseIdx, taskIdx }) => !completedTasks[`${phaseIdx}-${taskIdx}`])

    return pendingTasks.slice(0, 3) // show 3 pending tasks at a time
  }

  // ── Badges ────────────────────────────────────────────────────────────────
  const getBadges = () => {
    const totalDone = Object.keys(completedTasks).length
    const badges = []
    if (totalDone >= 1) badges.push({ icon: '🌱', label: 'First Step', desc: 'Completed your first task' })
    if (totalDone >= 5) badges.push({ icon: '🔥', label: 'On Fire', desc: '5 tasks completed' })
    if (totalDone >= 10) badges.push({ icon: '💎', label: 'Diamond Focus', desc: '10 tasks done' })
    if (streak >= 3) badges.push({ icon: '⚡', label: '3-Day Streak', desc: 'Active 3 days in a row' })
    if (streak >= 7) badges.push({ icon: '🏆', label: 'Weekly Warrior', desc: '7-day streak!' })
    if (points >= 100) badges.push({ icon: '💯', label: 'Century', desc: '100 points earned' })
    if (getPhaseProgress(0) === 100) badges.push({ icon: '🎯', label: 'Phase 1 Complete', desc: 'Finished Phase 1!' })
    return badges
  }

  // ── Change career ─────────────────────────────────────────────────────────
  const handleCareerChange = async (chosenCareer) => {
    setGeneratingJourney(true)
    setError(null)

    try {
      const storedResult = localStorage.getItem('result')
      const result = storedResult ? JSON.parse(storedResult) : {}
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
        throw new Error(err.message || 'Failed')
      }

      const journeyData = await res.json()
      const payload = {
        chosen_career: chosenCareer,
        personality_type: result.personality_type,
        personality_name: result.personality_name,
        roadmap: journeyData.roadmap,
        daily_schedule: journeyData.daily_schedule,
        started_at: new Date().toISOString(),
      }

      localStorage.setItem('journeyData', JSON.stringify(payload))
      localStorage.removeItem('completedTasks')
      localStorage.setItem('journeyPoints', '0')
      localStorage.setItem('journeyStreak', '0')
      localStorage.removeItem('lastActiveDay')

      setJourney(payload)
      setCompletedTasks({})
      setPoints(0)
      setStreak(0)
      setShowChangePicker(false)
      setExpandedPhase(0)
      setActiveTab('today')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingJourney(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!journey) {
    return (
      <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Change career picker overlay ──────────────────────────────────────────
  if (showChangePicker) {
    const storedResult = localStorage.getItem('result')
    const result = storedResult ? JSON.parse(storedResult) : {}
    return (
      <>
        <CareerPicker
          result={result}
          onSelect={handleCareerChange}
          loading={generatingJourney}
        />
        <button
          onClick={() => setShowChangePicker(false)}
          className="fixed top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all"
        >
          ✕ Cancel
        </button>
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
            ⚠️ {error}
          </div>
        )}
      </>
    )
  }

  const unlockedPhase = getUnlockedPhase()
  const todayTasks = getTodayTasks()
  const badges = getBadges()
  const daysActive = daysSince(journey.started_at)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1a4e] to-[#24243e]">

      {/* ── Header ── */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">My Journey</h1>
            <p className="text-purple-300 text-sm">{journey.chosen_career}</p>
          </div>
          <button
            onClick={() => setShowChangePicker(true)}
            className="text-sm text-slate-400 hover:text-white border border-white/20 hover:border-white/40 px-3 py-2 rounded-xl transition-all"
          >
            🔄 Change Career
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '⚡', label: 'Streak', value: `${streak} days` },
            { icon: '💎', label: 'Points', value: points },
            { icon: '📅', label: 'Day', value: `#${daysActive + 1}` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
              <div className="text-2xl">{icon}</div>
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-slate-400 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="max-w-2xl mx-auto px-4 mb-4">
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
          {[
            { key: 'today', label: "Today's Tasks" },
            { key: 'phases', label: 'All Phases' },
            { key: 'schedule', label: 'Schedule' },
            { key: 'badges', label: 'Badges' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === key
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <AnimatePresence mode="wait">

          {/* TODAY'S TASKS */}
          {activeTab === 'today' && (
            <motion.div key="today" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-white/10 rounded-3xl p-5 border border-white/10 mb-4">
                <h2 className="text-white font-bold text-lg mb-1">
                  📋 Today's Focus
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  Phase {unlockedPhase + 1}: {journey.roadmap[unlockedPhase]?.goal}
                </p>

                {todayTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-white font-bold text-lg">Phase {unlockedPhase + 1} Complete!</p>
                    <p className="text-slate-400 text-sm mt-1">
                      {unlockedPhase < journey.roadmap.length - 1
                        ? 'Phase ' + (unlockedPhase + 2) + ' is now unlocked!'
                        : 'You completed the entire journey! 🏆'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayTasks.map(({ task, phaseIdx, taskIdx }) => {
                      const key = `${phaseIdx}-${taskIdx}`
                      const done = !!completedTasks[key]
                      return (
                        <motion.button
                          key={key}
                          onClick={() => toggleTask(phaseIdx, taskIdx)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                            done
                              ? 'border-green-500/50 bg-green-500/10'
                              : 'border-white/10 bg-white/5 hover:border-purple-400/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              done ? 'border-green-500 bg-green-500' : 'border-white/30'
                            }`}>
                              {done && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={`text-sm leading-relaxed ${done ? 'text-green-300 line-through' : 'text-slate-200'}`}>
                              {task}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ALL PHASES */}
          {activeTab === 'phases' && (
            <motion.div key="phases" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              {journey.roadmap.map((phase, phaseIdx) => {
                const progress = getPhaseProgress(phaseIdx)
                const isLocked = phaseIdx > unlockedPhase
                const isExpanded = expandedPhase === phaseIdx && !isLocked

                return (
                  <div
                    key={phaseIdx}
                    className={`rounded-3xl border overflow-hidden transition-all ${
                      isLocked
                        ? 'border-white/5 bg-white/3 opacity-50'
                        : phaseIdx === unlockedPhase
                        ? 'border-purple-500/40 bg-purple-500/10'
                        : 'border-green-500/30 bg-green-500/5'
                    }`}
                  >
                    {/* Phase Header */}
                    <button
                      onClick={() => !isLocked && setExpandedPhase(isExpanded ? -1 : phaseIdx)}
                      className="w-full p-5 text-left"
                      disabled={isLocked}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl ${isLocked ? 'grayscale' : ''}`}>
                          {isLocked ? '🔒' : progress === 100 ? '✅' : '📌'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">Phase {phaseIdx + 1}</span>
                            <span className="text-slate-400 text-xs">— {phase.month}</span>
                            {isLocked && <span className="text-xs text-slate-500">Complete Phase {phaseIdx} first</span>}
                          </div>
                          <p className="text-slate-300 text-sm mt-0.5">{phase.goal}</p>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${progress === 100 ? 'text-green-400' : 'text-purple-300'}`}>
                            {progress}%
                          </div>
                          <div className="text-slate-500 text-xs">{phase.duration_days}d</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {!isLocked && (
                        <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                          />
                        </div>
                      )}
                    </button>

                    {/* Task List (expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/10 overflow-hidden"
                        >
                          <div className="p-4 space-y-2">
                            {phase.tasks.map((task, taskIdx) => {
                              const key = `${phaseIdx}-${taskIdx}`
                              const done = !!completedTasks[key]
                              return (
                                <motion.button
                                  key={taskIdx}
                                  onClick={() => toggleTask(phaseIdx, taskIdx)}
                                  whileTap={{ scale: 0.98 }}
                                  className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all ${
                                    done ? 'bg-green-500/10' : 'bg-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                    done ? 'border-green-500 bg-green-500' : 'border-white/30'
                                  }`}>
                                    {done && <span className="text-white text-[10px]">✓</span>}
                                  </div>
                                  <span className={`text-sm ${done ? 'text-green-300 line-through' : 'text-slate-300'}`}>
                                    {task}
                                  </span>
                                </motion.button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* DAILY SCHEDULE */}
          {activeTab === 'schedule' && (
            <motion.div key="schedule" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-white/10 rounded-3xl p-5 border border-white/10">
                <h2 className="text-white font-bold text-lg mb-1">📅 Daily Schedule</h2>
                <p className="text-slate-400 text-sm mb-5">Tailored for: <span className="text-purple-300">{journey.chosen_career}</span></p>

                <div className="space-y-3">
                  {(journey.daily_schedule || []).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5"
                    >
                      <div className="text-2xl w-10 text-center">{item.icon}</div>
                      <div>
                        <div className="text-purple-300 text-xs font-semibold">{item.time}</div>
                        <div className="text-white text-sm font-medium mt-0.5">{item.task}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* BADGES */}
          {activeTab === 'badges' && (
            <motion.div key="badges" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-white/10 rounded-3xl p-5 border border-white/10">
                <h2 className="text-white font-bold text-lg mb-1">🏅 Your Badges</h2>
                <p className="text-slate-400 text-sm mb-5">{badges.length} earned so far</p>

                {badges.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">🌱</div>
                    <p className="text-slate-400">Complete tasks to earn your first badge!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {badges.map((badge, i) => (
                      <motion.div
                        key={badge.label}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.07, type: 'spring' }}
                        className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-2xl p-4 text-center"
                      >
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <div className="text-white font-bold text-sm">{badge.label}</div>
                        <div className="text-slate-400 text-xs mt-1">{badge.desc}</div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}