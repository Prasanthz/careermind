import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Journey() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [result, setResult] = useState(null)
  const [completedTasks, setCompletedTasks] = useState({})
  const [streak, setStreak] = useState(0)
  const [points, setPoints] = useState(0)
  const [activePhase, setActivePhase] = useState(0)
  const [todayDone, setTodayDone] = useState(false)
  const [activeTab, setActiveTab] = useState('today')

  // Reminder states
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [reminderSaved, setReminderSaved] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('loginExpiry')
    localStorage.removeItem('result')
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const saved = localStorage.getItem('result')
    if (!saved) { navigate('/result'); return }
    setResult(JSON.parse(saved))

    const savedTasks = localStorage.getItem('completedTasks')
    if (savedTasks) setCompletedTasks(JSON.parse(savedTasks))

    const savedStreak = localStorage.getItem('streak')
    if (savedStreak) setStreak(parseInt(savedStreak))

    const savedPoints = localStorage.getItem('points')
    if (savedPoints) setPoints(parseInt(savedPoints))

    const savedPhase = localStorage.getItem('activePhase')
    if (savedPhase) setActivePhase(parseInt(savedPhase))

    const lastActive = localStorage.getItem('lastActive')
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    if (lastActive === today) {
      setTodayDone(true)
    } else if (lastActive && lastActive !== today && lastActive !== yesterday) {
      localStorage.setItem('streak', '0')
      setStreak(0)
    }
  }, [])

  // Load reminder settings from backend
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${import.meta.env.VITE_API_URL}/api/reminder/get`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setReminderEnabled(data.enabled)
        setReminderTime(data.reminder_time || '08:00')
      })
      .catch(() => {})
  }, [])

  const saveReminder = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/reminder/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: reminderEnabled, time: reminderTime })
    })
    setReminderSaved(true)
    setTimeout(() => setReminderSaved(false), 2000)
  }

  const markTodayActive = () => {
    const today = new Date().toDateString()
    const lastActive = localStorage.getItem('lastActive')
    if (lastActive !== today) {
      const newStreak = streak + 1
      setStreak(newStreak)
      localStorage.setItem('streak', newStreak.toString())
      localStorage.setItem('lastActive', today)
      setTodayDone(true)
    }
  }

  const toggleTask = (phaseIndex, taskIndex) => {
    const key = `${phaseIndex}-${taskIndex}`
    const updated = { ...completedTasks, [key]: !completedTasks[key] }
    setCompletedTasks(updated)
    localStorage.setItem('completedTasks', JSON.stringify(updated))
    localStorage.setItem('activePhase', phaseIndex.toString())

    if (!completedTasks[key]) {
      const newPoints = points + 10
      setPoints(newPoints)
      localStorage.setItem('points', newPoints.toString())
      markTodayActive()
    } else {
      const newPoints = Math.max(0, points - 10)
      setPoints(newPoints)
      localStorage.setItem('points', newPoints.toString())
    }
  }

  const getTotalTasks = () => {
    if (!result?.roadmap) return 0
    return result.roadmap.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)
  }

  const getCompletedCount = () => Object.values(completedTasks).filter(Boolean).length

  const getProgress = () => {
    const total = getTotalTasks()
    if (total === 0) return 0
    return Math.round((getCompletedCount() / total) * 100)
  }

  const getPhaseProgress = (phaseIndex, tasks) => {
    if (!tasks?.length) return 0
    const done = tasks.filter((_, i) => completedTasks[`${phaseIndex}-${i}`]).length
    return Math.round((done / tasks.length) * 100)
  }

  const getTodaySchedule = () => {
    if (!result?.roadmap) return []
    const startDate = localStorage.getItem('journeyStart') || new Date().toDateString()
    if (!localStorage.getItem('journeyStart')) {
      localStorage.setItem('journeyStart', startDate)
    }
    const daysPassed = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
    const dayOfWeek = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const allTasks = []
    result.roadmap.forEach((phase, pi) => {
      phase.tasks?.forEach((task, ti) => {
        allTasks.push({ task, phaseIndex: pi, taskIndex: ti, phase: phase.month })
      })
    })

    const startIdx = (daysPassed * 2) % Math.max(allTasks.length, 1)
    const todayTasks = allTasks.slice(startIdx, startIdx + 2)
    if (todayTasks.length < 2 && allTasks.length > 0) {
      todayTasks.push(...allTasks.slice(0, 2 - todayTasks.length))
    }

    return { todayTasks, daysPassed: daysPassed + 1, dayOfWeek, dateStr }
  }

  const badges = [
    { icon: '🎯', label: 'First Step', desc: 'Complete your first task', earned: getCompletedCount() >= 1 },
    { icon: '⭐', label: 'On a Roll', desc: 'Complete 5 tasks', earned: getCompletedCount() >= 5 },
    { icon: '🔥', label: '7 Day Streak', desc: 'Login 7 days in a row', earned: streak >= 7 },
    { icon: '💪', label: 'Halfway There', desc: 'Reach 50% progress', earned: getProgress() >= 50 },
    { icon: '🚀', label: 'Phase Master', desc: 'Complete a full phase', earned: result?.roadmap?.some((p, i) => getPhaseProgress(i, p.tasks) === 100) },
    { icon: '🏆', label: 'Career Ready', desc: 'Complete all tasks', earned: getProgress() === 100 },
  ]

  const schedule = getTodaySchedule()

  if (!result) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🚀</div>
        <p className="text-purple-400 font-semibold">Loading your journey...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-5">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-purple-400">🚀 My Career Journey</h1>
            <p className="text-gray-400 text-xs mt-0.5">{result.personality_type} — {result.personality_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-orange-400 font-bold text-lg">🔥 {streak}</div>
              <div className="text-gray-500 text-xs">streak</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 font-bold text-lg">⭐ {points}</div>
              <div className="text-gray-500 text-xs">points</div>
            </div>

            {/* Back button */}
            <button
              onClick={() => navigate('/result')}
              className="text-gray-400 text-sm border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-purple-500 transition-all"
            >
              ← Back
            </button>

            {/* Profile avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold text-sm border-2 border-purple-500 overflow-hidden"
            >
              {user?.profile_pic
                ? <img src={user.profile_pic} alt="profile" className="w-full h-full object-cover" />
                : (user?.name?.[0]?.toUpperCase() || '?')}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-purple-400 font-bold">{getProgress()}% — Day {schedule.daysPassed}</span>
        </div>
        <div className="w-full bg-[#16213E] rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full"
            animate={{ width: `${getProgress()}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="flex bg-[#16213E] rounded-xl p-1 border border-purple-900/30">
          {[
            { key: 'today', label: "📅 Today's Plan" },
            { key: 'phases', label: '📋 All Phases' },
            { key: 'badges', label: '🏆 Badges' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">

        {/* TODAY'S PLAN TAB */}
        {activeTab === 'today' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Date + Streak Card */}
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-purple-400 font-bold text-lg">{schedule.dayOfWeek}</div>
                  <div className="text-gray-400 text-sm">{schedule.dateStr}</div>
                  <div className="text-white font-semibold mt-1">Day {schedule.daysPassed} of your journey</div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-bold ${todayDone ? 'bg-green-600/30 text-green-400 border border-green-600/40' : 'bg-orange-600/20 text-orange-400 border border-orange-600/30'}`}>
                  {todayDone ? '✅ Done Today!' : '⏳ Pending'}
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-full ${i < (streak % 7) ? 'bg-orange-500' : 'bg-[#1A1A2E]'}`}
                  />
                ))}
              </div>
              <div className="text-gray-500 text-xs mt-1">{streak} day streak — keep going!</div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mb-4">
              <h2 className="font-bold text-lg mb-1">📌 Today's Tasks</h2>
              <p className="text-gray-400 text-xs mb-4">Complete these to earn points and keep your streak!</p>
              <div className="space-y-3">
                {schedule.todayTasks?.map((item, idx) => {
                  const key = `${item.phaseIndex}-${item.taskIndex}`
                  const done = completedTasks[key]
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleTask(item.phaseIndex, item.taskIndex)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        done
                          ? 'bg-purple-600/20 border-purple-500/50'
                          : 'bg-[#1A1A2E] border-purple-900/20 hover:border-purple-500/50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-purple-600 border-purple-600' : 'border-gray-600'}`}>
                        {done && <span className="text-white text-sm">✓</span>}
                      </div>
                      <div className="flex-1">
                        <div className={`font-medium ${done ? 'line-through text-gray-500' : 'text-white'}`}>{item.task}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{item.phase}</div>
                      </div>
                      {done
                        ? <span className="text-yellow-400 text-sm font-bold">+10 ⭐</span>
                        : <span className="text-gray-600 text-sm">+10 ⭐</span>
                      }
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Daily Schedule */}
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
              <h2 className="font-bold text-lg mb-4">🕐 Suggested Daily Schedule</h2>
              <div className="space-y-3">
                {[
                  { time: '6:00 AM', task: "Morning review — read yesterday's notes", icon: '🌅' },
                  { time: '7:00 AM', task: 'Watch 1 tutorial video (20–30 mins)', icon: '▶️' },
                  { time: '12:00 PM', task: 'Lunch break practice — solve 1 problem', icon: '💡' },
                  { time: '6:00 PM', task: 'Main study session (1–2 hrs)', icon: '📚' },
                  { time: '8:00 PM', task: 'Build / code / practice project', icon: '💻' },
                  { time: '10:00 PM', task: "Review + mark today's tasks done", icon: '✅' },
                ].map((slot, i) => (
                  <div key={i} className="flex items-center gap-4 bg-[#1A1A2E] rounded-xl p-3 border border-purple-900/20">
                    <div className="text-lg">{slot.icon}</div>
                    <div>
                      <div className="text-purple-400 text-xs font-bold">{slot.time}</div>
                      <div className="text-white text-sm">{slot.task}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Reminder */}
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mt-4">
              <h2 className="font-bold text-lg mb-1">🔔 Daily Reminder</h2>
              <p className="text-gray-400 text-xs mb-4">Get an email reminder to keep your streak!</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Enable Reminders</span>
                <button
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`w-12 h-6 rounded-full transition-all relative ${reminderEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all absolute top-0.5 ${reminderEnabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
              {reminderEnabled && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-gray-400 text-sm">Remind me at</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={e => setReminderTime(e.target.value)}
                    className="bg-[#1A1A2E] border border-purple-900/30 text-white px-3 py-2 rounded-lg"
                  />
                </div>
              )}
              <button
                onClick={saveReminder}
                className="w-full py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-700 transition-all"
              >
                {reminderSaved ? '✅ Saved!' : '💾 Save Reminder'}
              </button>
            </div>

          </motion.div>
        )}

        {/* ALL PHASES TAB */}
        {activeTab === 'phases' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-2 flex-wrap mb-4">
              {result.roadmap?.map((phase, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhase(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activePhase === i
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#16213E] text-gray-400 border border-purple-900/30 hover:border-purple-500'
                  }`}
                >
                  Phase {i + 1} {getPhaseProgress(i, phase.tasks) === 100 ? '✅' : `${getPhaseProgress(i, phase.tasks)}%`}
                </button>
              ))}
            </div>

            {result.roadmap?.[activePhase] && (() => {
              const phase = result.roadmap[activePhase]
              const prog = getPhaseProgress(activePhase, phase.tasks)
              return (
                <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h3 className="font-bold text-purple-300">{phase.month}</h3>
                      <p className="text-white font-medium">{phase.goal}</p>
                    </div>
                    <span className="text-purple-400 font-bold text-xl">{prog}%</span>
                  </div>
                  <div className="w-full bg-[#1A1A2E] rounded-full h-2 mb-5">
                    <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${prog}%` }} />
                  </div>
                  <div className="space-y-3">
                    {phase.tasks?.map((task, j) => {
                      const key = `${activePhase}-${j}`
                      const done = completedTasks[key]
                      return (
                        <button
                          key={j}
                          onClick={() => toggleTask(activePhase, j)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                            done
                              ? 'bg-purple-600/20 border-purple-500/50'
                              : 'bg-[#1A1A2E] border-purple-900/20 hover:border-purple-500/50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${done ? 'bg-purple-600 border-purple-600' : 'border-gray-600'}`}>
                            {done && <span className="text-white text-sm">✓</span>}
                          </div>
                          <span className={`font-medium flex-1 ${done ? 'line-through text-gray-500' : 'text-white'}`}>{task}</span>
                          {done
                            ? <span className="text-yellow-400 text-sm font-bold">+10 ⭐</span>
                            : <span className="text-gray-600 text-sm">+10 ⭐</span>
                          }
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
              <h2 className="font-bold text-lg mb-1">🏆 Your Badges</h2>
              <p className="text-gray-400 text-xs mb-5">{badges.filter(b => b.earned).length} of {badges.length} earned</p>
              <div className="grid grid-cols-2 gap-4">
                {badges.map((badge, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-5 text-center border transition-all ${
                      badge.earned
                        ? 'bg-purple-600/20 border-purple-500/50'
                        : 'bg-[#1A1A2E] border-purple-900/20 opacity-40'
                    }`}
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <div className="font-bold text-white text-sm">{badge.label}</div>
                    <div className="text-gray-400 text-xs mt-1">{badge.desc}</div>
                    {badge.earned && <div className="text-purple-400 text-xs font-semibold mt-2">✅ Earned!</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Points summary */}
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mt-4">
              <h2 className="font-bold text-lg mb-4">⭐ Points Summary</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1A1A2E] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{points}</div>
                  <div className="text-gray-400 text-xs mt-1">Total Points</div>
                </div>
                <div className="bg-[#1A1A2E] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">🔥 {streak}</div>
                  <div className="text-gray-400 text-xs mt-1">Day Streak</div>
                </div>
                <div className="bg-[#1A1A2E] rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{getCompletedCount()}</div>
                  <div className="text-gray-400 text-xs mt-1">Tasks Done</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}