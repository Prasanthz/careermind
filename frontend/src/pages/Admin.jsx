import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Admin() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('analytics')
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [userPersonalities, setUserPersonalities] = useState({})
  const [questions, setQuestions] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingQ, setEditingQ] = useState(null)
  const [newQ, setNewQ] = useState({ question_text: '', category: '', option_a: '', option_b: '', display_order: '' })
  const [showAddQ, setShowAddQ] = useState(false)
  const [msg, setMsg] = useState('')

  const token = localStorage.getItem('token')
  const authHeaders = { Authorization: `Bearer ${token}` }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [aRes, uRes, qRes, rRes, attRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/analytics`, { headers: authHeaders }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, { headers: authHeaders }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/questions`, { headers: authHeaders }),
        fetch(`${import.meta.env.VITE_API_URL}/api/reviews/all`, { headers: authHeaders }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/attempts`, { headers: authHeaders }),
      ])
      const [a, u, q, r, att] = await Promise.all([
        aRes.json(), uRes.json(), qRes.json(), rRes.json(), attRes.json()
      ])
      setAnalytics(a)
      setUsers(u.users || [])
      setQuestions(q.questions || [])
      setReviews(r.reviews || [])

      // Build userId → latest personality map
      const personalityMap = {}
      const attempts = att.attempts || []
      attempts.forEach(attempt => {
        try {
          const parsed = typeof attempt.result_json === 'string'
            ? JSON.parse(attempt.result_json)
            : attempt.result_json
          // attempts are ORDER BY taken_at DESC, so first one is latest
          const userEmail = attempt.email
          if (!personalityMap[userEmail]) {
            personalityMap[userEmail] = {
              type: parsed.personality_type,
              name: parsed.personality_name
            }
          }
        } catch (e) {}
      })
      setUserPersonalities(personalityMap)

    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchAll()
  }, [])

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user and all their data?')) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders })
    setUsers(users.filter(u => u.id !== id))
    showMsg('✅ User deleted')
  }

  const saveQuestion = async () => {
    const url = editingQ
      ? `${import.meta.env.VITE_API_URL}/api/admin/questions/${editingQ.id}`
      : `${import.meta.env.VITE_API_URL}/api/admin/questions`
    const method = editingQ ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(editingQ || newQ)
    })
    showMsg(editingQ ? '✅ Question updated' : '✅ Question added')
    setEditingQ(null)
    setShowAddQ(false)
    setNewQ({ question_text: '', category: '', option_a: '', option_b: '', display_order: '' })
    fetchAll()
  }

  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return
    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/questions/${id}`, { method: 'DELETE', headers: authHeaders })
    showMsg('✅ Question deleted')
    fetchAll()
  }

  const featureReview = async (id, featured) => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/reviews/${id}/feature`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured })
    })
    showMsg(featured ? '✅ Review featured on landing page!' : '✅ Review removed from landing page')
    fetchAll()
  }

  const stageLabels = {
    school: 'School Student',
    college: 'College Student',
    jobseeker: 'Job Seeker',
    switcher: 'Career Switcher',
    professional: 'Working Professional',
  }

  const personalityColors = {
    INTJ: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    INTP: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    ENTJ: 'bg-red-500/20 text-red-400 border-red-500/30',
    ENTP: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    INFJ: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    INFP: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    ENFJ: 'bg-green-500/20 text-green-400 border-green-500/30',
    ENFP: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ISTJ: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ISFJ: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    ESTJ: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    ESFJ: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    ISTP: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ISFP: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    ESTP: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    ESFP: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  }

  const tabs = [
    { key: 'analytics', label: '📊 Analytics' },
    { key: 'users', label: '👥 Users' },
    { key: 'questions', label: '❓ Questions' },
    { key: 'reviews', label: '⭐ Reviews' },
  ]

  const featuredCount = reviews.filter(r => r.featured).length

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-5">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-purple-400">🛡️ Admin Dashboard</h1>
            <p className="text-gray-400 text-xs mt-0.5">CareerMind AI — Management Panel</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 text-sm border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-purple-500 transition-all"
          >
            ← Home
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className="fixed top-4 right-4 z-50 bg-purple-600 text-white px-5 py-3 rounded-xl shadow-lg font-semibold">
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex bg-[#16213E] rounded-xl p-1 border border-purple-900/30">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center mt-20">
          <div className="text-purple-400 text-lg animate-pulse">Loading...</div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Total Users', val: analytics?.totalUsers || 0, icon: '👥' },
                  { label: 'Total Tests', val: analytics?.totalTests || 0, icon: '🧠' },
                  { label: 'Questions', val: questions.length, icon: '❓' },
                  { label: 'Reviews', val: reviews.length, icon: '⭐' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 text-center">
                    <div className="text-3xl mb-1">{stat.icon}</div>
                    <div className="text-2xl font-extrabold text-purple-400">{stat.val}</div>
                    <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {analytics?.popularTypes?.length > 0 && (
                <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                  <h2 className="font-bold text-lg mb-4">🏆 Top Personality Types</h2>
                  <div className="space-y-3">
                    {analytics.popularTypes.map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-purple-400 font-bold w-16">{t.type}</span>
                        <div className="flex-1 bg-[#1A1A2E] rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (t.count / (analytics.totalTests || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm w-8">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* USERS */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="font-bold text-lg mb-4">👥 All Users ({users.length})</h2>
                <div className="space-y-3">
                  {users.map(u => {
                    const personality = userPersonalities[u.email]
                    const colorClass = personality
                      ? (personalityColors[personality.type] || 'bg-purple-500/20 text-purple-400 border-purple-500/30')
                      : null
                    return (
                      <div key={u.id} className="bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20 flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-white">{u.name}</div>
                            {personality ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colorClass}`}>
                                {personality.type}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600 px-2 py-0.5 rounded-full border border-gray-700">
                                No test yet
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-xs mt-0.5">{u.email}</div>
                          <div className="text-gray-500 text-xs mt-0.5">
                            {stageLabels[u.stage] || u.stage} · Age {u.age}
                            {personality && (
                              <span className="text-gray-500"> · {personality.name}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/20 transition-all shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* QUESTIONS */}
          {activeTab === 'questions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">❓ Questions ({questions.length})</h2>
                  <button
                    onClick={() => setShowAddQ(!showAddQ)}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    + Add Question
                  </button>
                </div>

                {showAddQ && (
                  <div className="bg-[#1A1A2E] rounded-xl p-4 border border-purple-500/30 mb-4 space-y-3">
                    <h3 className="font-semibold text-purple-400">New Question</h3>
                    {['question_text', 'category', 'option_a', 'option_b', 'display_order'].map(field => (
                      <input
                        key={field}
                        placeholder={field.replace(/_/g, ' ')}
                        value={newQ[field]}
                        onChange={e => setNewQ(n => ({ ...n, [field]: e.target.value }))}
                        className="w-full bg-[#16213E] border border-purple-900/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                    ))}
                    <div className="flex gap-2">
                      <button onClick={saveQuestion} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold flex-1">Save</button>
                      <button onClick={() => setShowAddQ(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm flex-1">Cancel</button>
                    </div>
                  </div>
                )}

                {editingQ && (
                  <div className="bg-[#1A1A2E] rounded-xl p-4 border border-yellow-500/30 mb-4 space-y-3">
                    <h3 className="font-semibold text-yellow-400">Edit Question #{editingQ.id}</h3>
                    {['question_text', 'category', 'option_a', 'option_b', 'display_order'].map(field => (
                      <input
                        key={field}
                        placeholder={field.replace(/_/g, ' ')}
                        value={editingQ[field] || ''}
                        onChange={e => setEditingQ(q => ({ ...q, [field]: e.target.value }))}
                        className="w-full bg-[#16213E] border border-yellow-900/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                      />
                    ))}
                    <div className="flex gap-2">
                      <button onClick={saveQuestion} className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg text-sm font-semibold flex-1">Update</button>
                      <button onClick={() => setEditingQ(null)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm flex-1">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">{i + 1}. {q.question_text}</div>
                          <div className="text-gray-500 text-xs mt-1">Category: {q.category} · Order: {q.display_order}</div>
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className="text-green-400">A: {q.option_a}</span>
                            <span className="text-blue-400">B: {q.option_b}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setEditingQ({ ...q })} className="text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-lg text-xs hover:bg-yellow-500/20 transition-all">Edit</button>
                          <button onClick={() => deleteQuestion(q.id)} className="text-red-400 border border-red-500/30 px-2 py-1 rounded-lg text-xs hover:bg-red-500/20 transition-all">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* REVIEWS */}
          {activeTab === 'reviews' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="font-bold text-lg mb-1">⭐ User Reviews</h2>
                <p className="text-gray-400 text-xs mb-5">
                  Feature up to 4 reviews to show on the landing page. Featured: {featuredCount}/4
                </p>

                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div
                        key={r.id}
                        className={`rounded-xl p-4 border transition-all ${
                          r.featured
                            ? 'bg-purple-600/20 border-purple-500/50'
                            : 'bg-[#1A1A2E] border-purple-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex gap-0.5 mb-2">
                              {[...Array(5)].map((_, s) => (
                                <span key={s} className={s < r.rating ? 'text-yellow-400' : 'text-gray-700'}>★</span>
                              ))}
                              {r.featured && (
                                <span className="ml-2 text-purple-400 text-xs font-bold">✨ Featured #{r.featured_order}</span>
                              )}
                            </div>
                            <p className="text-gray-300 text-sm mb-3">"{r.message}"</p>
                            <div className="flex items-center gap-2">
                              {r.profile_pic ? (
                                <img src={r.profile_pic} className="w-8 h-8 rounded-full object-cover border border-purple-600" alt={r.name} />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold">
                                  {r.name?.[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div>
                                <div className="text-white text-sm font-semibold">{r.name}</div>
                                <div className="text-gray-500 text-xs">{stageLabels[r.stage] || r.stage}</div>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {r.featured ? (
                              <button
                                onClick={() => featureReview(r.id, false)}
                                className="text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/20 transition-all whitespace-nowrap"
                              >
                                ✕ Unfeature
                              </button>
                            ) : featuredCount < 4 ? (
                              <button
                                onClick={() => featureReview(r.id, true)}
                                className="text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-purple-500/20 transition-all whitespace-nowrap"
                              >
                                ✨ Feature
                              </button>
                            ) : (
                              <span className="text-gray-600 text-xs">Max 4</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      )}
    </div>
  )
}