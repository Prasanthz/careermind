import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CareerPicker from '../components/CareerPicker'

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysSince(isoDate) {
  if (!isoDate) return 0
  const start = new Date(isoDate)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now - start) / (1000 * 60 * 60 * 24))
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

function formatDateTime() {
  const now = new Date()
  const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return { date, time }
}

// Tasks per day
const TASKS_PER_DAY = 3

// Given a flat task list, return which tasks belong to dayNumber (1-based)
function getTasksForDay(tasks, dayNumber) {
  const start = (dayNumber - 1) * TASKS_PER_DAY
  const end = start + TASKS_PER_DAY
  return tasks.slice(start, end).map((task, i) => ({ task, taskIdx: start + i }))
}

// Total days needed to complete a phase
function totalDaysForPhase(tasks) {
  return Math.ceil(tasks.length / TASKS_PER_DAY)
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Journey() {
  const navigate = useNavigate()

  const [journey, setJourney] = useState(null)
  const [completedTasks, setCompletedTasks] = useState({})
  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [activeTab, setActiveTab] = useState('today')
  const [showChangePicker, setShowChangePicker] = useState(false)
  const [generatingJourney, setGeneratingJourney] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState(0)
  const [error, setError] = useState(null)
  const [dateTime, setDateTime] = useState(formatDateTime())

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setDateTime(formatDateTime()), 60000)
    return () => clearInterval(timer)
  }, [])

  // ── Load state ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('journeyData')
    if (!stored) { navigate('/result'); return }
    try { setJourney(JSON.parse(stored)) } catch { navigate('/result') }

    const ct = localStorage.getItem('completedTasks')
    if (ct) setCompletedTasks(JSON.parse(ct))

    setPoints(parseInt(localStorage.getItem('journeyPoints') || '0'))
    setStreak(parseInt(localStorage.getItem('journeyStreak') || '0'))
  }, [navigate])

  // ── Streak logic ──────────────────────────────────────────────────────────
  const updateStreak = useCallback((adding) => {
    if (!adding) return // only update streak when adding a task, not removing
    const todayKey = getTodayKey()
    const lastActive = localStorage.getItem('lastActiveDay')
    if (lastActive === todayKey) return

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().split('T')[0]

    let newStreak = 1
    if (lastActive === yesterdayKey) newStreak = streak + 1

    setStreak(newStreak)
    localStorage.setItem('journeyStreak', String(newStreak))
    localStorage.setItem('lastActiveDay', todayKey)
  }, [streak])

  // ── Phase / day calculations ──────────────────────────────────────────────
  const getPhaseProgress = (phaseIdx) => {
    if (!journey) return 0
    const tasks = journey.roadmap[phaseIdx]?.tasks || []
    if (!tasks.length) return 0
    const done = tasks.filter((_, ti) => completedTasks[`${phaseIdx}-${ti}`]).length
    return Math.round((done / tasks.length) * 100)
  }

  const getUnlockedPhase = () => {
    if (!journey) return 0
    for (let i = 0; i < journey.roadmap.length; i++) {
      if (getPhaseProgress(i) < 100) return i
    }
    return journey.roadmap.length - 1
  }

  // Days elapsed since journey start (0-based → Day 1 = day 0)
  const daysElapsed = journey ? daysSince(journey.started_at) : 0
  const currentDayNumber = daysElapsed + 1 // Day 1, Day 2, ...

  // For the current phase, which day within that phase are we on?
  const getPhaseDay = (phaseIdx) => {
    if (!journey) return 1
    // Count how many days were spent in previous phases
    let daysSpentBefore = 0
    for (let i = 0; i < phaseIdx; i++) {
      daysSpentBefore += totalDaysForPhase(journey.roadmap[i]?.tasks || [])
    }
    return Math.max(1, currentDayNumber - daysSpentBefore)
  }

  // ── Today's tasks (locked to current day) ────────────────────────────────
  const getTodaySection = () => {
    if (!journey) return { phase: null, phaseIdx: 0, dayInPhase: 1, tasks: [], isLocked: false }
    const unlockedPhase = getUnlockedPhase()
    const phase = journey.roadmap[unlockedPhase]
    if (!phase) return { phase: null, phaseIdx: 0, dayInPhase: 1, tasks: [], isLocked: false }

    const dayInPhase = getPhaseDay(unlockedPhase)
    const totalDays = totalDaysForPhase(phase.tasks)
    // Clamp to last day if we've gone beyond
    const effectiveDay = Math.min(dayInPhase, totalDays)
    const todayTasks = getTasksForDay(phase.tasks, effectiveDay)

    return { phase, phaseIdx: unlockedPhase, dayInPhase: effectiveDay, totalDays, tasks: todayTasks }
  }

  // ── Toggle task ───────────────────────────────────────────────────────────
  const toggleTask = (phaseIdx, taskIdx, isToday = false) => {
    const unlockedPhase = getUnlockedPhase()
    if (phaseIdx > unlockedPhase) return // phase locked

    // Day locking: in Today tab, all good. In Phases tab, check if task's day <= current day
    if (!isToday) {
      const phase = journey.roadmap[phaseIdx]
      const dayInPhase = getPhaseDay(phaseIdx)
      const taskDay = Math.floor(taskIdx / TASKS_PER_DAY) + 1
      if (taskDay > dayInPhase) return // future day — locked
    }

    const key = `${phaseIdx}-${taskIdx}`
    const already = completedTasks[key]
    const updated = { ...completedTasks }

    if (already) {
      // Unselect → decrease points, badges auto-update via state
      delete updated[key]
      const newPts = Math.max(0, points - 10)
      setPoints(newPts)
      localStorage.setItem('journeyPoints', String(newPts))
    } else {
      updated[key] = true
      const newPts = points + 10
      setPoints(newPts)
      localStorage.setItem('journeyPoints', String(newPts))
      updateStreak(true)
    }

    setCompletedTasks(updated)
    localStorage.setItem('completedTasks', JSON.stringify(updated))
  }

  // ── Badges (reactive — recalculated from current state) ───────────────────
  const getBadges = () => {
    const totalDone = Object.keys(completedTasks).length
    const badges = []
    if (totalDone >= 1)  badges.push({ icon: '🌱', label: 'First Step',      desc: 'Completed your first task' })
    if (totalDone >= 5)  badges.push({ icon: '🔥', label: 'On Fire',         desc: '5 tasks completed' })
    if (totalDone >= 10) badges.push({ icon: '💎', label: 'Diamond Focus',   desc: '10 tasks done' })
    if (streak >= 3)     badges.push({ icon: '⚡', label: '3-Day Streak',    desc: 'Active 3 days in a row' })
    if (streak >= 7)     badges.push({ icon: '🏆', label: 'Weekly Warrior',  desc: '7-day streak!' })
    if (points >= 100)   badges.push({ icon: '💯', label: 'Century',         desc: '100 points earned' })
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
          top_traits: result.top_traits,
          skills_to_learn: result.skills_to_learn,
        }),
      })

      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed') }

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
  if (!journey) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  // ── Change career overlay ─────────────────────────────────────────────────
  if (showChangePicker) {
    const result = JSON.parse(localStorage.getItem('result') || '{}')
    return (
      <>
        <CareerPicker result={result} onSelect={handleCareerChange} loading={generatingJourney} />
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
  const badges = getBadges()
  const { phase, phaseIdx: todayPhaseIdx, dayInPhase, totalDays, tasks: todayTasks } = getTodaySection()

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">My Journey</h1>
            <p className="text-purple-300 text-sm">{journey.chosen_career}</p>
          </div>
          <button
            onClick={() => setShowChangePicker(true)}
            className="text-sm text-gray-400 border border-purple-900/50 px-3 py-2 rounded-lg hover:border-purple-500 hover:text-white transition-all"
          >
            🔄 Change Career
          </button>
        </div>
      </div>

      {/* ── Date & Time Panel ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-[#16213E] border border-purple-900/30 rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <div className="text-white font-semibold text-sm">{dateTime.date}</div>
              <div className="text-purple-400 text-xs">Day #{currentDayNumber} of your journey</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-lg">{dateTime.time}</div>
            <div className="text-gray-500 text-xs">Local time</div>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '⚡', label: 'Streak', value: `${streak}d` },
            { icon: '💎', label: 'Points', value: points },
            { icon: '🏅', label: 'Badges', value: badges.length },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-[#16213E] rounded-2xl p-3 text-center border border-purple-900/30">
              <div className="text-2xl">{icon}</div>
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-gray-500 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="max-w-2xl mx-auto px-4 mb-4">
        <div className="flex gap-1 bg-[#16213E] rounded-2xl p-1 border border-purple-900/30">
          {[
            { key: 'today', label: "Today" },
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
                  : 'text-gray-400 hover:text-white'
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
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mb-4">

                {/* Day header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">📋 Day {dayInPhase} Tasks</h2>
                    <p className="text-gray-400 text-sm">Phase {todayPhaseIdx + 1}: {phase?.goal}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 text-xs font-semibold">Day {dayInPhase} / {totalDays}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {todayTasks.filter(({ taskIdx }) => completedTasks[`${todayPhaseIdx}-${taskIdx}`]).length}/{todayTasks.length} done
                    </div>
                  </div>
                </div>

                {todayTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-white font-bold text-lg">Phase {todayPhaseIdx + 1} Complete!</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {todayPhaseIdx < journey.roadmap.length - 1
                        ? 'Phase ' + (todayPhaseIdx + 2) + ' unlocked tomorrow!'
                        : 'You completed the entire journey! 🏆'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayTasks.map(({ task, taskIdx }) => {
                      const key = `${todayPhaseIdx}-${taskIdx}`
                      const done = !!completedTasks[key]
                      return (
                        <motion.button
                          key={key}
                          onClick={() => toggleTask(todayPhaseIdx, taskIdx, true)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            done
                              ? 'border-green-500/50 bg-green-900/20'
                              : 'border-purple-900/50 bg-[#1A1A2E] hover:border-purple-500/60'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              done ? 'border-green-500 bg-green-500' : 'border-gray-600'
                            }`}>
                              {done && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={`text-sm leading-relaxed ${done ? 'text-green-400 line-through' : 'text-gray-200'}`}>
                              {task}
                            </span>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                {/* Next day preview hint */}
                {dayInPhase < totalDays && (
                  <div className="mt-4 p-3 bg-purple-900/20 border border-purple-900/40 rounded-xl">
                    <p className="text-purple-400 text-xs text-center">
                      🔒 Day {dayInPhase + 1} tasks unlock tomorrow
                    </p>
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
                const dayInThisPhase = getPhaseDay(phaseIdx)
                const totalDaysPhase = totalDaysForPhase(phase.tasks)

                return (
                  <div
                    key={phaseIdx}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      isLocked
                        ? 'border-purple-900/20 bg-[#16213E] opacity-50'
                        : phaseIdx === unlockedPhase
                        ? 'border-purple-600/50 bg-[#16213E]'
                        : 'border-green-900/40 bg-[#16213E]'
                    }`}
                  >
                    <button
                      onClick={() => !isLocked && setExpandedPhase(isExpanded ? -1 : phaseIdx)}
                      className="w-full p-5 text-left"
                      disabled={isLocked}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {isLocked ? '🔒' : progress === 100 ? '✅' : '📌'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold">Phase {phaseIdx + 1}</span>
                            <span className="text-gray-500 text-xs">— {phase.month}</span>
                            {isLocked && <span className="text-xs text-gray-600">Complete Phase {phaseIdx} first</span>}
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">{phase.goal}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold ${progress === 100 ? 'text-green-400' : 'text-purple-400'}`}>
                            {progress}%
                          </div>
                          {!isLocked && (
                            <div className="text-gray-600 text-xs">Day {Math.min(dayInThisPhase, totalDaysPhase)}/{totalDaysPhase}</div>
                          )}
                        </div>
                      </div>

                      {!isLocked && (
                        <div className="mt-3 h-2 bg-purple-900/30 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-purple-600 to-pink-600'}`}
                          />
                        </div>
                      )}
                    </button>

                    {/* Expanded task list grouped by day */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-purple-900/30 overflow-hidden"
                        >
                          <div className="p-4 space-y-4">
                            {Array.from({ length: totalDaysForPhase(phase.tasks) }).map((_, dayIdx) => {
                              const dayNum = dayIdx + 1
                              const dayTasks = getTasksForDay(phase.tasks, dayNum)
                              const isPastDay = dayNum <= dayInThisPhase
                              const isToday = dayNum === dayInThisPhase
                              const isFutureDay = dayNum > dayInThisPhase

                              return (
                                <div key={dayIdx}>
                                  {/* Day label */}
                                  <div className={`flex items-center gap-2 mb-2 text-xs font-bold ${
                                    isToday ? 'text-purple-400' : isPastDay ? 'text-green-400' : 'text-gray-600'
                                  }`}>
                                    {isToday ? '📍' : isPastDay ? '✅' : '🔒'} Day {dayNum}
                                    {isToday && <span className="bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">Today</span>}
                                    {isFutureDay && <span className="text-gray-700">— unlocks in {dayNum - dayInThisPhase} day(s)</span>}
                                  </div>

                                  {dayTasks.map(({ task, taskIdx }) => {
                                    const key = `${phaseIdx}-${taskIdx}`
                                    const done = !!completedTasks[key]
                                    const locked = isFutureDay

                                    return (
                                      <motion.button
                                        key={taskIdx}
                                        onClick={() => !locked && toggleTask(phaseIdx, taskIdx, false)}
                                        whileTap={!locked ? { scale: 0.98 } : {}}
                                        className={`w-full text-left p-3 rounded-xl flex items-start gap-3 mb-2 transition-all ${
                                          locked
                                            ? 'opacity-40 cursor-not-allowed bg-[#1A1A2E]'
                                            : done
                                            ? 'bg-green-900/20'
                                            : 'bg-[#1A1A2E] hover:bg-purple-900/20'
                                        }`}
                                      >
                                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                          locked ? 'border-gray-700' : done ? 'border-green-500 bg-green-500' : 'border-gray-600'
                                        }`}>
                                          {done && !locked && <span className="text-white text-[10px]">✓</span>}
                                          {locked && <span className="text-gray-700 text-[10px]">🔒</span>}
                                        </div>
                                        <span className={`text-sm ${
                                          locked ? 'text-gray-700' : done ? 'text-green-400 line-through' : 'text-gray-300'
                                        }`}>
                                          {task}
                                        </span>
                                      </motion.button>
                                    )
                                  })}
                                </div>
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
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="text-white font-bold text-lg mb-1">📅 Daily Schedule</h2>
                <p className="text-gray-400 text-sm mb-5">Tailored for: <span className="text-purple-400">{journey.chosen_career}</span></p>
                <div className="space-y-3">
                  {(journey.daily_schedule || []).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-4 p-4 bg-[#1A1A2E] rounded-xl border border-purple-900/20"
                    >
                      <div className="text-2xl w-10 text-center">{item.icon}</div>
                      <div>
                        <div className="text-purple-400 text-xs font-semibold">{item.time}</div>
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
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="text-white font-bold text-lg mb-1">🏅 Your Badges</h2>
                <p className="text-gray-400 text-sm mb-5">{badges.length} earned so far</p>

                {badges.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">🌱</div>
                    <p className="text-gray-500">Complete tasks to earn your first badge!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {badges.map((badge, i) => (
                      <motion.div
                        key={badge.label}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.07, type: 'spring' }}
                        className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-700/40 rounded-2xl p-4 text-center"
                      >
                        <div className="text-4xl mb-2">{badge.icon}</div>
                        <div className="text-white font-bold text-sm">{badge.label}</div>
                        <div className="text-gray-500 text-xs mt-1">{badge.desc}</div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Locked badges preview */}
                <div className="mt-6">
                  <p className="text-gray-600 text-xs font-semibold mb-3">LOCKED BADGES</p>
                  <div className="grid grid-cols-2 gap-3 opacity-30">
                    {[
                      { icon: '🔥', label: 'On Fire', desc: '5 tasks' },
                      { icon: '💎', label: 'Diamond Focus', desc: '10 tasks' },
                      { icon: '🏆', label: 'Weekly Warrior', desc: '7-day streak' },
                      { icon: '💯', label: 'Century', desc: '100 points' },
                    ].filter(b => !badges.find(earned => earned.label === b.label))
                     .map((badge, i) => (
                      <div key={i} className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-4 text-center">
                        <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                        <div className="text-gray-600 font-bold text-sm">{badge.label}</div>
                        <div className="text-gray-700 text-xs mt-1">{badge.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}