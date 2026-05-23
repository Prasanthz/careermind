import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AdminReviews from '../components/AdminReviews'

export default function Admin() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('analytics')
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [attempts, setAttempts] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [newQuestion, setNewQuestion] = useState({
    question_text: '', category: '', option_a: '', option_b: '', display_order: ''
  })

  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [aRes, uRes, tRes, qRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/analytics`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/attempts`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/questions`, { headers }),
      ])
      const [aData, uData, tData, qData] = await Promise.all([
        aRes.json(), uRes.json(), tRes.json(), qRes.json()
      ])
      setAnalytics(aData)
      setUsers(uData.users || [])
      setAttempts(tData.attempts || [])
      setQuestions(qData.questions || [])
    } catch (err) {
      console.error('Failed to load data', err)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('loginExpiry')
    localStorage.removeItem('result')
    navigate('/login', { replace: true })
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user and all their data?')) return
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(users.filter(u => u.id !== id))
    } catch {
      alert('Delete failed')
    }
  }

  const addQuestion = async () => {
    if (!newQuestion.question_text || !newQuestion.category || !newQuestion.option_a || !newQuestion.option_b) {
      alert('Please fill all fields')
      return
    }
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newQuestion)
      })
      setNewQuestion({ question_text: '', category: '', option_a: '', option_b: '', display_order: '' })
      fetchAll()
      alert('Question added successfully!')
    } catch {
      alert('Failed to add question')
    }
  }

  const saveQuestion = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingQuestion)
      })
      setEditingQuestion(null)
      fetchAll()
      alert('Question updated successfully!')
    } catch {
      alert('Failed to update question')
    }
  }

  const deleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAll()
    } catch {
      alert('Failed to delete question')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">⚙️</div>
        <p className="text-purple-400 font-semibold">Loading admin panel...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* Header */}
      <div className="bg-[#16213E] border-b border-purple-900/30 px-4 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <div>
              <span className="text-lg font-bold text-purple-400">CareerMind AI</span>
              <span className="ml-2 text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">Admin</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/result')}
              className="text-sm text-gray-400 border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-purple-500 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'analytics', label: '📊 Analytics' },
            { key: 'users', label: '👥 Users' },
            { key: 'attempts', label: '📝 Attempts' },
            { key: 'questions', label: '❓ Questions' },
            { key: 'reviews', label: '⭐ Reviews' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#16213E] text-gray-400 border border-purple-900/30 hover:border-purple-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-4">

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && analytics && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Users', value: analytics.totalUsers, icon: '👥' },
                { label: 'Total Tests', value: analytics.totalTests, icon: '📝' },
                { label: 'Top Type', value: analytics.popularTypes?.[0]?.type || '—', icon: '🧠' },
                { label: 'Questions', value: questions.length, icon: '❓' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 text-center">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-purple-400">{stat.value}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="font-bold text-lg mb-4">🏆 Top Personality Types</h2>
                <div className="space-y-3">
                  {analytics.popularTypes?.map((t, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-white font-medium">{t.type || 'Unknown'}</span>
                      <span className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm">{t.count} tests</span>
                    </div>
                  ))}
                  {(!analytics.popularTypes || analytics.popularTypes.length === 0) && (
                    <div className="text-gray-500 text-center py-4">No data yet</div>
                  )}
                </div>
              </div>

              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="font-bold text-lg mb-4">📊 Stage Breakdown</h2>
                <div className="space-y-3">
                  {analytics.stageStats?.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-white capitalize">{s.stage || 'Unknown'}</span>
                      <span className="bg-pink-600/30 text-pink-300 px-3 py-1 rounded-full text-sm">{s.count}</span>
                    </div>
                  ))}
                  {(!analytics.stageStats || analytics.stageStats.length === 0) && (
                    <div className="text-gray-500 text-center py-4">No data yet</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#16213E] rounded-2xl border border-purple-900/30 overflow-hidden">
              <div className="p-4 border-b border-purple-900/30 flex justify-between items-center">
                <h2 className="font-bold text-lg">👥 All Users</h2>
                <span className="text-gray-400 text-sm">{users.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-purple-900/30">
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Name</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Email</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Age</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Stage</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Joined</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-purple-900/20 hover:bg-purple-900/10 transition-all">
                        <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{u.age || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm capitalize">{u.stage || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {new Date(u.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-red-400 text-sm border border-red-900/50 px-3 py-1 rounded-lg hover:border-red-500 transition-all"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-center text-gray-500 py-10">No users yet</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TEST ATTEMPTS TAB */}
        {activeTab === 'attempts' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#16213E] rounded-2xl border border-purple-900/30 overflow-hidden">
              <div className="p-4 border-b border-purple-900/30 flex justify-between items-center">
                <h2 className="font-bold text-lg">📝 Test Attempts</h2>
                <span className="text-gray-400 text-sm">{attempts.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-purple-900/30">
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Name</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Email</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Stage</th>
                      <th className="text-left px-4 py-3 text-gray-400 text-sm">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map(a => (
                      <tr key={a.id} className="border-b border-purple-900/20 hover:bg-purple-900/10 transition-all">
                        <td className="px-4 py-3 text-white font-medium">{a.name}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{a.email}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm capitalize">{a.stage || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {new Date(a.taken_at).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attempts.length === 0 && (
                  <div className="text-center text-gray-500 py-10">No attempts yet</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Add new question */}
            <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 mb-4">
              <h2 className="font-bold text-lg mb-4">➕ Add New Question</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Question text"
                  value={newQuestion.question_text}
                  onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Category (e.g. EI)"
                    value={newQuestion.category}
                    onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                    className="bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="number"
                    placeholder="Display order"
                    value={newQuestion.display_order}
                    onChange={e => setNewQuestion({ ...newQuestion, display_order: e.target.value })}
                    className="bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Option A"
                  value={newQuestion.option_a}
                  onChange={e => setNewQuestion({ ...newQuestion, option_a: e.target.value })}
                  className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={newQuestion.option_b}
                  onChange={e => setNewQuestion({ ...newQuestion, option_b: e.target.value })}
                  className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={addQuestion}
                  className="w-full py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-700 transition-all"
                >
                  ➕ Add Question
                </button>
              </div>
            </div>

            {/* Questions list */}
            <div className="bg-[#16213E] rounded-2xl border border-purple-900/30 overflow-hidden">
              <div className="p-4 border-b border-purple-900/30 flex justify-between items-center">
                <h2 className="font-bold text-lg">❓ All Questions</h2>
                <span className="text-gray-400 text-sm">{questions.length} total</span>
              </div>
              <div className="divide-y divide-purple-900/20">
                {questions.map((q, i) => (
                  <div key={q.id} className="p-4">
                    {editingQuestion?.id === q.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingQuestion.question_text}
                          onChange={e => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                          className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingQuestion.category}
                            onChange={e => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                            className="bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                          />
                          <input
                            type="number"
                            value={editingQuestion.display_order}
                            onChange={e => setEditingQuestion({ ...editingQuestion, display_order: e.target.value })}
                            className="bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingQuestion.option_a}
                          onChange={e => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                          className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                        />
                        <input
                          type="text"
                          value={editingQuestion.option_b}
                          onChange={e => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                          className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveQuestion(q.id)}
                            className="flex-1 py-2 bg-green-600 rounded-xl font-semibold hover:bg-green-700 transition-all"
                          >
                            💾 Save
                          </button>
                          <button
                            onClick={() => setEditingQuestion(null)}
                            className="flex-1 py-2 bg-gray-600 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-500 text-xs">#{i + 1}</span>
                              <span className="bg-purple-600/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">{q.category}</span>
                              <span className="text-gray-600 text-xs">order: {q.display_order}</span>
                            </div>
                            <p className="text-white font-medium">{q.question_text}</p>
                            <div className="mt-2 space-y-1">
                              <div className="text-gray-400 text-sm">A: {q.option_a}</div>
                              <div className="text-gray-400 text-sm">B: {q.option_b}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setEditingQuestion(q)}
                              className="text-purple-400 text-sm border border-purple-900/50 px-3 py-1 rounded-lg hover:border-purple-500 transition-all"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => deleteQuestion(q.id)}
                              className="text-red-400 text-sm border border-red-900/50 px-3 py-1 rounded-lg hover:border-red-500 transition-all"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="text-center text-gray-500 py-10">No questions yet</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <AdminReviews token={token} />
          </motion.div>
        )}

      </div>
    </div>
  )
}