import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import CareerPicker from '../components/CareerPicker'

// ── Helpers ───────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('token')

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
})

// Assign each task a real calendar date starting from journeyStartDate
function buildDayMap(phases, startDate) {
  const map = {} // dayIndex (0-based) → Date string YYYY-MM-DD
  let dayIndex = 0
  phases.forEach((phase) => {
    phase.tasks.forEach(() => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + dayIndex)
      map[dayIndex] = d.toISOString().split('T')[0]
      dayIndex++
    })
  })
  return map
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id: 'first_step',   label: 'First Step',   icon: '👣', req: 1,   type: 'tasks' },
  { id: 'day_3',        label: '3-Day Streak',  icon: '🔥', req: 3,   type: 'streak' },
  { id: 'halfway',      label: 'Halfway',       icon: '⚡', req: 50,  type: 'points' },
  { id: 'week_warrior', label: 'Week Warrior',  icon: '🗡️', req: 7,   type: 'streak' },
  { id: 'century',      label: 'Century',       icon: '💯', req: 100, type: 'points' },
  { id: 'phase_done',   label: 'Phase Done',    icon: '🏆', req: 1,   type: 'phases' },
]

function computeBadges(completedCount, streak, points, phasesCompleted) {
  return BADGE_DEFS.map((b) => {
    let earned = false
    if (b.type === 'tasks')  earned = completedCount >= b.req
    if (b.type === 'streak') earned = streak >= b.req
    if (b.type === 'points') earned = points >= b.req
    if (b.type === 'phases') earned = phasesCompleted >= b.req
    return { ...b, earned }
  })
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Journey() {
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [journeyData,     setJourneyData]     = useState(null)
  const [checkedTasks,    setCheckedTasks]    = useState({})   // "phaseIdx-taskIdx" → bool
  const [points,          setPoints]          = useState(0)
  const [streak,          setStreak]          = useState(0)
  const [activeTab,       setActiveTab]       = useState('phases')
  const [now,             setNow]             = useState(new Date())
  const [showPicker,      setShowPicker]      = useState(false)  // only true when no journey exists
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime,    setReminderTime]    = useState('08:00')
  const [reminderMsg,     setReminderMsg]     = useState('')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [journeyStartDate, setJourneyStartDate] = useState(null)

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('journeyData')
    if (stored) {
      // Journey exists — skip career picker entirely
      const parsed = JSON.parse(stored)
      setJourneyData(parsed)

      const startDate = localStorage.getItem('journeyStartDate') || todayStr()
      localStorage.setItem('journeyStartDate', startDate)
      setJourneyStartDate(startDate)

      const savedChecked = localStorage.getItem('checkedTasks')
      if (savedChecked) setCheckedTasks(JSON.parse(savedChecked))

      const savedPoints = localStorage.getItem('journeyPoints')
      if (savedPoints) setPoints(parseInt(savedPoints, 10))

      const savedStreak = localStorage.getItem('journeyStreak')
      if (savedStreak) setStreak(parseInt(savedStreak, 10))
    } else {
      // No journey yet — show career picker
      setShowPicker(true)
    }

    // Load reminder preference
    fetchReminderPref()
  }, [])

  // ── Fetch reminder preference ──────────────────────────────────────────────
  async function fetchReminderPref() {
    try {
      const res = await fetch('/api/reminder/get', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setReminderEnabled(data.enabled)
        setReminderTime(data.reminder_time || '08:00')
      }
    } catch {
      // silently ignore — user just won't see saved preference
    }
  }

  // ── Save reminder ──────────────────────────────────────────────────────────
  async function saveReminder() {
    setReminderLoading(true)
    setReminderMsg('')
    try {
      const res = await fetch('/api/reminder/set', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ enabled: reminderEnabled, time: reminderTime }),
      })
      if (res.ok) {
        setReminderMsg('✅ Reminder saved!')
      } else {
        const err = await res.json().catch(() => ({}))
        setReminderMsg(`❌ Failed: ${err.message || res.statusText}`)
      }
    } catch (e) {
      setReminderMsg(`❌ Network error: ${e.message}`)
    } finally {
      setReminderLoading(false)
      setTimeout(() => setReminderMsg(''), 4000)
    }
  }

  // ── Called by CareerPicker when journey is generated ──────────────────────
  const handleJourneyGenerated = useCallback((data) => {
    localStorage.setItem('journeyData', JSON.stringify(data))
    const start = todayStr()
    localStorage.setItem('journeyStartDate', start)
    localStorage.removeItem('checkedTasks')
    localStorage.removeItem('journeyPoints')
    localStorage.removeItem('journeyStreak')
    setJourneyData(data)
    setJourneyStartDate(start)
    setCheckedTasks({})
    setPoints(0)
    setStreak(0)
    setShowPicker(false)
  }, [])

  // ── Change career (reset everything) ──────────────────────────────────────
  function handleChangeCareer() {
    localStorage.removeItem('journeyData')
    localStorage.removeItem('journeyStartDate')
    localStorage.removeItem('checkedTasks')
    localStorage.removeItem('journeyPoints')
    localStorage.removeItem('journeyStreak')
    setJourneyData(null)
    setCheckedTasks({})
    setPoints(0)
    setStreak(0)
    setShowPicker(true)
  }

  // ── Task toggle ────────────────────────────────────────────────────────────
  function toggleTask(key, wasChecked) {
    const newChecked = { ...checkedTasks, [key]: !wasChecked }
    setCheckedTasks(newChecked)
    localStorage.setItem('checkedTasks', JSON.stringify(newChecked))

    const delta = wasChecked ? -10 : 10
    const newPoints = Math.max(0, points + delta)
    setPoints(newPoints)
    localStorage.setItem('journeyPoints', String(newPoints))

    if (!wasChecked) {
      const newStreak = streak + 1
      setStreak(newStreak)
      localStorage.setItem('journeyStreak', String(newStreak))
    } else {
      const newStreak = Math.max(0, streak - 1)
      setStreak(newStreak)
      localStorage.setItem('journeyStreak', String(newStreak))
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const allTasks = journeyData
    ? journeyData.phases.flatMap((ph, pi) =>
        ph.tasks.map((t, ti) => ({ key: `${pi}-${ti}`, task: t, phaseIdx: pi, taskIdx: ti }))
      )
    : []

  const completedCount = Object.values(checkedTasks).filter(Boolean).length
  const badges = computeBadges(completedCount, streak, points, 0)

  // Build day map once journeyData and startDate are available
  const dayMap = journeyData && journeyStartDate
    ? buildDayMap(journeyData.phases, journeyStartDate)
    : {}

  const today = todayStr()

  // Figure out which absolute day index is "today"
  const todayDayIndex = Object.entries(dayMap).find(([, d]) => d === today)?.[0]
  const todayNum = todayDayIndex !== undefined ? parseInt(todayDayIndex, 10) : 0

  // Journey day number (1-based, for display)
  const journeyDayNumber = journeyStartDate
    ? Math.max(1, Math.floor((new Date(today) - new Date(journeyStartDate)) / 86400000) + 1)
    : 1

  // Total days
  const totalDays = allTasks.length

  // ── Day index within tasks (global) ───────────────────────────────────────
  // tasks are grouped by phase; each task = 1 day
  let globalDayIdx = 0
  const phasesWithDays = journeyData
    ? journeyData.phases.map((phase, pi) => ({
        ...phase,
        tasks: phase.tasks.map((task, ti) => {
          const key = `${pi}-${ti}`
          const dayIdx = globalDayIdx++
          const dateStr = (() => {
            if (!journeyStartDate) return ''
            const d = new Date(journeyStartDate)
            d.setDate(d.getDate() + dayIdx)
            return d.toISOString().split('T')[0]
          })()
          const isPast   = dateStr < today
          const isToday  = dateStr === today
          const isFuture = dateStr > today
          return { task, key, dayIdx, dateStr, isPast, isToday, isFuture, phaseIdx: pi, taskIdx: ti }
        }),
      }))
    : []

  // ── Render: Career Picker ──────────────────────────────────────────────────
  if (showPicker) {
    return (
      <CareerPicker onJourneyGenerated={handleJourneyGenerated} />
    )
  }

  if (!journeyData) return null

  // ── Render: Journey ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg,#1a1a2e,#16213e)', padding: '20px 24px', borderBottom: '1px solid #2d2d44', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, background: 'linear-gradient(90deg,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🚀 {journeyData.career} Journey
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Day {journeyDayNumber} of {totalDays} &nbsp;·&nbsp;
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} &nbsp;·&nbsp;
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={handleChangeCareer}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #a855f7', background: 'transparent', color: '#a855f7', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          🔄 Change Career
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 24px', flexWrap: 'wrap' }}>
        {[
          { label: '⭐ Points', value: points },
          { label: '🔥 Streak', value: `${streak} days` },
          { label: '✅ Done', value: `${completedCount}/${totalDays}` },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, minWidth: 100, background: '#1a1a2e', borderRadius: 12, padding: '12px 16px', textAlign: 'center', border: '1px solid #2d2d44' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ background: '#1e1e33', borderRadius: 99, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${totalDays ? (completedCount / totalDays) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#db2777)', transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{Math.round(totalDays ? (completedCount / totalDays) * 100 : 0)}% complete</div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, padding: '0 24px 16px', borderBottom: '1px solid #2d2d44' }}>
        {['phases', 'schedule', 'badges', 'reminder'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize',
              background: activeTab === tab ? 'linear-gradient(135deg,#7c3aed,#db2777)' : '#1a1a2e',
              color: activeTab === tab ? '#fff' : '#9ca3af',
            }}
          >
            {tab === 'phases' ? '📋 Phases' : tab === 'schedule' ? '📅 Schedule' : tab === 'badges' ? '🏅 Badges' : '🔔 Reminder'}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: '20px 24px', maxWidth: 800, margin: '0 auto' }}>

        {/* PHASES TAB */}
        {activeTab === 'phases' && phasesWithDays.map((phase, pi) => {
          const phaseDone = phase.tasks.filter((t) => checkedTasks[t.key]).length
          const phaseTotal = phase.tasks.length
          return (
            <div key={pi} style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#a855f7', margin: '0 0 12px' }}>
                Phase {pi + 1}: {phase.title || phase.name || `Phase ${pi + 1}`}
                <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>
                  {phaseDone}/{phaseTotal} done
                </span>
              </h3>
              {phase.tasks.map(({ task, key, dayIdx, dateStr, isPast, isToday, isFuture, phaseIdx, taskIdx }) => {
                const checked = !!checkedTasks[key]
                const locked  = isFuture
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: taskIdx * 0.03 }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', marginBottom: 8, borderRadius: 10,
                      background: locked ? '#111118' : isToday ? '#1a1030' : '#151525',
                      border: `1px solid ${isToday ? '#7c3aed' : locked ? '#1e1e33' : '#2d2d44'}`,
                      opacity: locked ? 0.5 : 1,
                      cursor: locked ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => !locked && toggleTask(key, checked)}
                  >
                    <span style={{ fontSize: 18, marginTop: 1 }}>
                      {locked ? '🔒' : checked ? '✅' : isToday ? '📍' : isPast ? '⬜' : '⬜'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: checked ? '#6b7280' : '#e2e8f0', textDecoration: checked ? 'line-through' : 'none' }}>
                        Day {dayIdx + 1}: {typeof task === 'string' ? task : task.title || task.task || JSON.stringify(task)}
                      </div>
                      {typeof task === 'object' && task.description && (
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{task.description}</div>
                      )}
                      <div style={{ fontSize: 11, color: isToday ? '#a855f7' : '#4b5563', marginTop: 4 }}>
                        {isToday ? '📅 Today' : isPast ? `📅 ${dateStr}` : `🔒 Unlocks ${dateStr}`}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        })}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#a855f7', marginBottom: 16 }}>📅 Daily Schedule</h3>
            {journeyData.schedule ? (
              Array.isArray(journeyData.schedule)
                ? journeyData.schedule.map((item, i) => (
                    <div key={i} style={{ padding: '12px 16px', marginBottom: 8, borderRadius: 10, background: '#151525', border: '1px solid #2d2d44' }}>
                      <div style={{ fontWeight: 600, color: '#a855f7', fontSize: 14 }}>{item.time || `Block ${i + 1}`}</div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', marginTop: 4 }}>{item.activity || item.task || JSON.stringify(item)}</div>
                    </div>
                  ))
                : <p style={{ color: '#9ca3af', fontSize: 14 }}>{JSON.stringify(journeyData.schedule)}</p>
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>No schedule generated. Try changing your career to regenerate.</p>
            )}
          </div>
        )}

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#a855f7', marginBottom: 16 }}>🏅 Badges</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
              {badges.map((b) => (
                <div
                  key={b.id}
                  style={{
                    textAlign: 'center', padding: '16px 12px', borderRadius: 12,
                    background: b.earned ? '#1a1030' : '#111118',
                    border: `1px solid ${b.earned ? '#7c3aed' : '#2d2d44'}`,
                    opacity: b.earned ? 1 : 0.45,
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ fontSize: 32 }}>{b.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: b.earned ? '#e2e8f0' : '#6b7280', marginTop: 6 }}>{b.label}</div>
                  {!b.earned && (
                    <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>
                      {b.type === 'tasks'  ? `Complete ${b.req} tasks` :
                       b.type === 'streak' ? `${b.req}-day streak` :
                       b.type === 'points' ? `Reach ${b.req} pts` : 'Complete a phase'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REMINDER TAB */}
        {activeTab === 'reminder' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#a855f7', marginBottom: 16 }}>🔔 Daily Reminder</h3>
            <div style={{ background: '#151525', borderRadius: 12, padding: 20, border: '1px solid #2d2d44' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#a855f7' }}
                />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Enable daily reminder email</span>
              </label>

              <label style={{ display: 'block', fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>Reminder time (IST)</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={!reminderEnabled}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: '1px solid #3d3d5c',
                  background: '#0f0f1a', color: '#e2e8f0', fontSize: 14,
                  opacity: reminderEnabled ? 1 : 0.4, cursor: reminderEnabled ? 'auto' : 'not-allowed',
                  marginBottom: 16, width: 140,
                }}
              />

              <button
                onClick={saveReminder}
                disabled={reminderLoading}
                style={{
                  display: 'block', padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, fontSize: 14,
                  opacity: reminderLoading ? 0.6 : 1,
                }}
              >
                {reminderLoading ? 'Saving...' : 'Save Reminder'}
              </button>

              {reminderMsg && (
                <p style={{ marginTop: 12, fontSize: 13, color: reminderMsg.startsWith('✅') ? '#34d399' : '#f87171' }}>
                  {reminderMsg}
                </p>
              )}

              <p style={{ fontSize: 12, color: '#4b5563', marginTop: 16, lineHeight: 1.6 }}>
                We'll send a daily email at your chosen time reminding you to complete your tasks. Make sure your email is verified.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}