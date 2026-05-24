import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CareerPicker from '../components/CareerPicker'

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function getTasksForDay(tasks, durationDays, dayNumber) {
  if (!tasks || tasks.length === 0) return []
  const daysPerTask = Math.floor(durationDays / tasks.length)
  const taskIdx = Math.min(Math.floor((dayNumber - 1) / Math.max(daysPerTask, 1)), tasks.length - 1)
  return [{ task: tasks[taskIdx], taskIdx }]
}

function getActiveTaskIdx(tasks, durationDays, dayNumber) {
  if (!tasks || tasks.length === 0) return 0
  const daysPerTask = Math.floor(durationDays / tasks.length)
  return Math.min(Math.floor((dayNumber - 1) / Math.max(daysPerTask, 1)), tasks.length - 1)
}

function daysBeforePhase(roadmap, phaseIdx) {
  let total = 0
  for (let i = 0; i < phaseIdx; i++) {
    total += roadmap[i]?.duration_days || 60
  }
  return total
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90]
function nextMilestone(streak) {
  return STREAK_MILESTONES.find(m => m > streak) || 100
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Journey() {
  const navigate = useNavigate()

  const [journey, setJourney] = useState(null)
  const [completedTasks, setCompletedTasks] = useState({})
  const [points, setPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [activeTab, setActiveTab] = useState('today')
  const [showChangePicker, setShowChangePicker] = useState(false)
  // FIX: showInitialPicker — shown when no journeyData exists yet
  const [showInitialPicker, setShowInitialPicker] = useState(false)
  const [loadingJourney, setLoadingJourney] = useState(true)
  const [generatingJourney, setGeneratingJourney] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState(0)
  const [error, setError] = useState(null)
  const [dateTime, setDateTime] = useState(formatDateTime())

  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setDateTime(formatDateTime()), 60000)
    return () => clearInterval(timer)
  }, [])

  // ── Load state ─────────────────────────────────────────────────────────────
  // FIX: instead of navigate('/result') when no journey, show CareerPicker
  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const localKey = user?.id ? `journeyData_${user.id}` : 'journeyData'

    const applyJourney = (parsed) => {
      setJourney(parsed)
      const ct = localStorage.getItem('completedTasks')
      if (ct) setCompletedTasks(JSON.parse(ct))
      setPoints(parseInt(localStorage.getItem('journeyPoints') || '0'))
      setStreak(parseInt(localStorage.getItem('journeyStreak') || '0'))
    }

    // Step 1 — load from localStorage INSTANTLY (no spinner)
    const stored = localStorage.getItem(localKey)
    if (stored) {
      try {
        applyJourney(JSON.parse(stored))
        setLoadingJourney(false)
        // Step 2 — sync with DB in background (silent)
        if (token) {
          fetch(`${import.meta.env.VITE_API_URL}/api/quiz/journey`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(r => r.json())
            .then(data => {
              if (data.journey) {
                localStorage.setItem(localKey, JSON.stringify(data.journey))
              } else {
                // Save localStorage journey to DB silently
                fetch(`${import.meta.env.VITE_API_URL}/api/quiz/save-journey`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ journey: JSON.parse(stored) })
                }).catch(() => {})
              }
            })
            .catch(() => {})
        }
        return
      } catch { }
    }

    // Step 3 — no localStorage, try DB
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/api/quiz/journey`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.journey) {
            localStorage.setItem(localKey, JSON.stringify(data.journey))
            applyJourney(data.journey)
          } else {
            setShowInitialPicker(true)
          }
          setLoadingJourney(false)
        })
        .catch(() => {
          setShowInitialPicker(true)
          setLoadingJourney(false)
        })
    } else {
      setShowInitialPicker(true)
      setLoadingJourney(false)
    }
  }, [])

  // Load reminder from backend
  // FIX: correct route /api/reminder/get (no 's')
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${import.meta.env.VITE_API_URL}/api/reminder/get`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setReminderEnabled(data.enabled || false)
        setReminderTime(data.reminder_time || '08:00')
      })
      .catch(() => {})
  }, [])

  // ── Streak logic ───────────────────────────────────────────────────────────
  const updateStreak = useCallback(() => {
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

  // ── Phase & day calculations ───────────────────────────────────────────────
  const getPhaseProgress = useCallback((phaseIdx) => {
    if (!journey) return 0
    const tasks = journey.roadmap[phaseIdx]?.tasks || []
    if (!tasks.length) return 0
    const done = tasks.filter((_, ti) => completedTasks[`${phaseIdx}-${ti}`]).length
    return Math.round((done / tasks.length) * 100)
  }, [journey, completedTasks])

  const getUnlockedPhase = useCallback(() => {
    if (!journey) return 0
    const daysElapsed = daysSince(journey.started_at)
    let daysCounted = 0
    for (let i = 0; i < journey.roadmap.length; i++) {
      const phaseDays = journey.roadmap[i]?.duration_days || 60
      daysCounted += phaseDays
      if (daysElapsed < daysCounted) return i
    }
    return journey.roadmap.length - 1
  }, [journey])

  const daysElapsed = journey ? daysSince(journey.started_at) : 0
  const currentJourneyDay = daysElapsed + 1

  const getDayInPhase = useCallback((phaseIdx) => {
    if (!journey) return 1
    const daysBefore = daysBeforePhase(journey.roadmap, phaseIdx)
    return Math.max(1, currentJourneyDay - daysBefore)
  }, [journey, currentJourneyDay])

  // ── Today's section ────────────────────────────────────────────────────────
  const getTodaySection = useCallback(() => {
    if (!journey) return null
    const unlockedPhase = getUnlockedPhase()
    const phase = journey.roadmap[unlockedPhase]
    if (!phase) return null
    const duration = phase.duration_days || 60
    const dayInPhase = Math.min(getDayInPhase(unlockedPhase), duration)
    const todayTasks = getTasksForDay(phase.tasks, duration, dayInPhase)
    return { phase, phaseIdx: unlockedPhase, dayInPhase, duration, todayTasks }
  }, [journey, getUnlockedPhase, getDayInPhase])

  // ── Toggle task ────────────────────────────────────────────────────────────
  const toggleTask = (phaseIdx, taskIdx, allowedByDay = true) => {
    if (!allowedByDay) return
    const unlockedPhase = getUnlockedPhase()
    if (phaseIdx > unlockedPhase) return

    const key = `${phaseIdx}-${taskIdx}`
    const already = completedTasks[key]
    const updated = { ...completedTasks }

    if (already) {
      delete updated[key]
      const newPts = Math.max(0, points - 10)
      setPoints(newPts)
      localStorage.setItem('journeyPoints', String(newPts))
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

  // ── Badges ─────────────────────────────────────────────────────────────────
  const getBadges = () => {
    const totalDone = Object.keys(completedTasks).length
    const badges = []
    if (totalDone >= 1)  badges.push({ icon: '🌱', label: 'First Step',      desc: 'Completed your first task' })
    if (totalDone >= 5)  badges.push({ icon: '🔥', label: 'On Fire',         desc: '5 tasks completed' })
    if (totalDone >= 10) badges.push({ icon: '💎', label: 'Diamond Focus',   desc: '10 tasks done' })
    if (streak >= 3)     badges.push({ icon: '⚡', label: '3-Day Streak',    desc: 'Active 3 days in a row' })
    if (streak >= 7)     badges.push({ icon: '🏆', label: 'Weekly Warrior',  desc: '7-day streak!' })
    if (streak >= 30)    badges.push({ icon: '🔱', label: 'Monthly Master',  desc: '30-day streak!' })
    if (points >= 100)   badges.push({ icon: '💯', label: 'Century',         desc: '100 points earned' })
    if (getPhaseProgress(0) === 100) badges.push({ icon: '🎯', label: 'Phase 1 Complete', desc: 'Finished Phase 1!' })
    return badges
  }

  // ── Save reminder ──────────────────────────────────────────────────────────
  // FIX: correct route /api/reminder/set (no 's'), and token from localStorage
  const saveReminder = async () => {
    setReminderSaving(true)
    setReminderMsg('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reminder/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: reminderEnabled, time: reminderTime })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || res.statusText)
      }
      setReminderMsg('✅ Reminder saved!')
    } catch (e) {
      setReminderMsg(`❌ ${e.message || 'Failed to save reminder'}`)
    } finally {
      setReminderSaving(false)
      setTimeout(() => setReminderMsg(''), 3000)
    }
  }

  // ── Career generation (shared by initial + change) ─────────────────────────
  const generateJourney = async (chosenCareer, isChange = false) => {
    setGeneratingJourney(true)
    setError(null)
    try {
      const result = JSON.parse(localStorage.getItem('result') || '{}')
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
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const key = user?.id ? `journeyData_${user.id}` : 'journeyData'
      localStorage.setItem(key, JSON.stringify(payload))
      // Save to backend
      if (token) {
        fetch(`${import.meta.env.VITE_API_URL}/api/quiz/save-journey`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ journey: payload })
        }).catch(() => {})
      }
      localStorage.removeItem('completedTasks')
      localStorage.setItem('journeyPoints', '0')
      localStorage.setItem('journeyStreak', '0')
      localStorage.removeItem('lastActiveDay')
      setJourney(payload)
      setCompletedTasks({})
      setPoints(0)
      setStreak(0)
      setShowChangePicker(false)
      setShowInitialPicker(false)
      setExpandedPhase(0)
      setActiveTab('today')
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingJourney(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingJourney) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  if (!journey && showInitialPicker) {
    const result = JSON.parse(localStorage.getItem('result') || '{}')
    return (
      <>
        <CareerPicker result={result} onSelect={(career) => generateJourney(career, false)} loading={generatingJourney} />
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-50">
            ⚠️ {error}
          </div>
        )}
      </>
    )
  }

  // ── Change career overlay ──────────────────────────────────────────────────
  if (showChangePicker) {
    const result = JSON.parse(localStorage.getItem('result') || '{}')
    return (
      <>
        <CareerPicker result={result} onSelect={(career) => generateJourney(career, true)} loading={generatingJourney} />
        <button
          onClick={() => setShowChangePicker(false)}
          className="fixed top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all"
        >✕ Cancel</button>
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
  const todaySection = getTodaySection()
  const milestone = nextMilestone(streak)
  const streakPct = Math.min((streak / milestone) * 100, 100)
  const totalJourneyDays = journey.roadmap.reduce((sum, p) => sum + (p.duration_days || 60), 0)

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">My Journey</h1>
            <p className="text-purple-300 text-sm">{journey.chosen_career}</p>
          </div>
          <div className="flex items-center gap-2">
          {/* Profile avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-sm border-2 border-purple-500 overflow-hidden"
          >
            {(() => {
              const u = JSON.parse(localStorage.getItem('user') || '{}')
              return u?.profile_pic
                ? <img src={u.profile_pic} alt="profile" className="w-full h-full object-cover" />
                : (u?.name?.[0]?.toUpperCase() || '?')
            })()}
          </button>

          <button
            onClick={() => setShowReminder(!showReminder)}
              className="text-sm text-gray-400 border border-purple-900/50 px-3 py-2 rounded-lg hover:border-purple-500 hover:text-white transition-all"
            >
              🔔 Reminder
            </button>
            <button
              onClick={() => setShowChangePicker(true)}
              className="text-sm text-gray-400 border border-purple-900/50 px-3 py-2 rounded-lg hover:border-purple-500 hover:text-white transition-all"
            >
              🔄 Change
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                localStorage.removeItem('loginExpiry')
                navigate('/login', { replace: true })
              }}
              className="text-sm text-gray-400 border border-purple-900/50 px-3 py-2 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Reminder Panel */}
        <AnimatePresence>
          {showReminder && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-2xl mx-auto mt-3 bg-[#16213E] border border-purple-900/40 rounded-xl p-4 overflow-hidden"
            >
              <p className="text-white font-semibold mb-3">🔔 Daily Reminder</p>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${reminderEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${reminderEnabled ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-gray-300 text-sm">{reminderEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={e => setReminderTime(e.target.value)}
                  disabled={!reminderEnabled}
                  className="bg-[#1A1A2E] border border-purple-900/50 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
                />
                <button
                  onClick={saveReminder}
                  disabled={reminderSaving}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {reminderSaving ? 'Saving...' : 'Save'}
                </button>
                {reminderMsg && <span className="text-sm text-green-400">{reminderMsg}</span>}
              </div>
              <p className="text-gray-600 text-xs mt-2">You'll get a daily email reminder at the set time (IST)</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Date & Time Panel ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-[#16213E] border border-purple-900/30 rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <div className="text-white font-semibold text-sm">{dateTime.date}</div>
              <div className="text-purple-400 text-xs">
                Journey Day {currentJourneyDay} of {totalJourneyDays}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-lg">{dateTime.time}</div>
            <div className="text-gray-500 text-xs">IST</div>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
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

        {/* Streak progress bar */}
        <div className="bg-[#16213E] border border-purple-900/30 rounded-2xl px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-xs font-semibold">🔥 Streak Progress</span>
            <span className="text-purple-400 text-xs">{streak} / {milestone} days to next badge</span>
          </div>
          <div className="h-2.5 bg-purple-900/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${streakPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500"
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-700 text-[10px]">0</span>
            <span className="text-gray-700 text-[10px]">{milestone} days 🏆</span>
          </div>
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="max-w-2xl mx-auto px-4 mb-4">
        <div className="flex gap-1 bg-[#16213E] rounded-2xl p-1 border border-purple-900/30">
          {[
            { key: 'today', label: 'Today' },
            { key: 'phases', label: 'All Phases' },
            { key: 'schedule', label: 'Schedule' },
            { key: 'badges', label: 'Badges' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === key ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
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

          {/* TODAY */}
          {activeTab === 'today' && todaySection && (
            <motion.div key="today" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-white font-bold text-lg">📋 Day {todaySection.dayInPhase} Tasks</h2>
                    <p className="text-gray-400 text-sm">Phase {todaySection.phaseIdx + 1}: {todaySection.phase?.goal}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-400 text-xs font-semibold">
                      Day {todaySection.dayInPhase} of {todaySection.duration}
                    </div>
                    <div className="text-gray-600 text-xs mt-0.5">
                      {todaySection.todayTasks.filter(({ taskIdx }) => completedTasks[`${todaySection.phaseIdx}-${taskIdx}`]).length}
                      /{todaySection.todayTasks.length} done
                    </div>
                  </div>
                </div>

                {todaySection.todayTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-white font-bold">Phase {todaySection.phaseIdx + 1} Complete!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todaySection.todayTasks.map(({ task, taskIdx }) => {
                      const key = `${todaySection.phaseIdx}-${taskIdx}`
                      const done = !!completedTasks[key]
                      return (
                        <motion.button
                          key={key}
                          onClick={() => toggleTask(todaySection.phaseIdx, taskIdx, true)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            done ? 'border-green-500/50 bg-green-900/20' : 'border-purple-900/50 bg-[#1A1A2E] hover:border-purple-500/60'
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

                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-900/40 rounded-xl">
                  <p className="text-purple-400 text-xs text-center">
                    🔒 Tomorrow's tasks unlock at midnight — come back daily to keep your streak!
                  </p>
                </div>
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
                const duration = phase.duration_days || 60
                const dayInPhase = Math.min(getDayInPhase(phaseIdx), duration)
                const activeTaskIdx = getActiveTaskIdx(phase.tasks, duration, dayInPhase)

                return (
                  <div key={phaseIdx} className={`rounded-2xl border overflow-hidden transition-all ${
                    isLocked ? 'border-purple-900/20 bg-[#16213E] opacity-50'
                    : phaseIdx === unlockedPhase ? 'border-purple-600/50 bg-[#16213E]'
                    : 'border-green-900/40 bg-[#16213E]'
                  }`}>
                    <button
                      onClick={() => !isLocked && setExpandedPhase(isExpanded ? -1 : phaseIdx)}
                      className="w-full p-5 text-left"
                      disabled={isLocked}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{isLocked ? '🔒' : progress === 100 ? '✅' : '📌'}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold">Phase {phaseIdx + 1}</span>
                            <span className="text-gray-500 text-xs">— {phase.month}</span>
                            {isLocked && <span className="text-xs text-gray-600">Unlocks after Phase {phaseIdx}</span>}
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">{phase.goal}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold ${progress === 100 ? 'text-green-400' : 'text-purple-400'}`}>{progress}%</div>
                          {!isLocked && <div className="text-gray-600 text-xs">Day {dayInPhase}/{duration}</div>}
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

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-purple-900/30 overflow-hidden"
                        >
                          <div className="p-4 space-y-2">
                            {phase.tasks.map((task, taskIdx) => {
                              const key = `${phaseIdx}-${taskIdx}`
                              const done = !!completedTasks[key]
                              const isActiveToday = taskIdx === activeTaskIdx
                              const isPast = taskIdx < activeTaskIdx
                              const isFuture = taskIdx > activeTaskIdx
                              const canToggle = !isFuture

                              return (
                                <motion.button
                                  key={taskIdx}
                                  onClick={() => canToggle && toggleTask(phaseIdx, taskIdx, canToggle)}
                                  whileTap={canToggle ? { scale: 0.98 } : {}}
                                  className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all ${
                                    isFuture ? 'opacity-40 cursor-not-allowed bg-[#1A1A2E]'
                                    : done ? 'bg-green-900/20'
                                    : isActiveToday ? 'bg-purple-900/30 border border-purple-700/40'
                                    : 'bg-[#1A1A2E] hover:bg-purple-900/20'
                                  }`}
                                >
                                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                    isFuture ? 'border-gray-700' : done ? 'border-green-500 bg-green-500' : 'border-gray-600'
                                  }`}>
                                    {done && !isFuture && <span className="text-white text-[10px]">✓</span>}
                                  </div>
                                  <div className="flex-1">
                                    <span className={`text-sm ${
                                      isFuture ? 'text-gray-700' : done ? 'text-green-400 line-through' : 'text-gray-300'
                                    }`}>{task}</span>
                                    {isActiveToday && !done && (
                                      <span className="ml-2 text-[10px] bg-purple-600/40 text-purple-300 px-1.5 py-0.5 rounded-full">Today</span>
                                    )}
                                    {isFuture && (
                                      <span className="ml-2 text-[10px] text-gray-700">🔒 future</span>
                                    )}
                                  </div>
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

          {/* SCHEDULE */}
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
                  <div className="grid grid-cols-2 gap-3 mb-6">
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

                {[
                  { icon: '🔥', label: 'On Fire', desc: '5 tasks' },
                  { icon: '💎', label: 'Diamond Focus', desc: '10 tasks' },
                  { icon: '🏆', label: 'Weekly Warrior', desc: '7-day streak' },
                  { icon: '🔱', label: 'Monthly Master', desc: '30-day streak' },
                  { icon: '💯', label: 'Century', desc: '100 points' },
                  { icon: '🎯', label: 'Phase 1 Complete', desc: 'Finish Phase 1' },
                ].filter(b => !badges.find(e => e.label === b.label)).length > 0 && (
                  <>
                    <p className="text-gray-600 text-xs font-semibold mb-3">LOCKED BADGES</p>
                    <div className="grid grid-cols-2 gap-3 opacity-30">
                      {[
                        { icon: '🔥', label: 'On Fire', desc: '5 tasks' },
                        { icon: '💎', label: 'Diamond Focus', desc: '10 tasks' },
                        { icon: '🏆', label: 'Weekly Warrior', desc: '7-day streak' },
                        { icon: '🔱', label: 'Monthly Master', desc: '30-day streak' },
                        { icon: '💯', label: 'Century', desc: '100 points' },
                        { icon: '🎯', label: 'Phase 1 Complete', desc: 'Finish Phase 1' },
                      ].filter(b => !badges.find(e => e.label === b.label))
                       .map((badge, i) => (
                        <div key={i} className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-4 text-center">
                          <div className="text-4xl mb-2 grayscale">{badge.icon}</div>
                          <div className="text-gray-600 font-bold text-sm">{badge.label}</div>
                          <div className="text-gray-700 text-xs mt-1">{badge.desc}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}