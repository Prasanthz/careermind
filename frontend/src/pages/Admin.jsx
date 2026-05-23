import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

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
        fetch('${import.meta.env.VITE_API_URL}/api/admin/analytics', { headers }),
        fetch('${import.meta.env.VITE_API_URL}/api/admin/users', { headers }),
        fetch('${import.meta.env.VITE_API_URL}/api/admin/attempts', { headers }),
        fetch('${import.meta.env.VITE_API_URL}/api/admin/questions', { headers }),
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
      await fetch('${import.meta.env.VITE_API_URL}/api/admin/questions', {
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
              ← App
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

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex bg-[#16213E] rounded-xl p-1 border border-purple-900/30 overflow-x-auto">
          {[
            { key: 'analytics', label: '📊 Analytics' },
            { key: 'users', label: '👥 Users' },
            { key: 'attempts', label: '📝 Test Attempts' },
            { key: 'questions', label: '❓ Questions' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
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

      <div className="max-w-6xl mx-auto px-4 mt-4">

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && analytics && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Users', value: analytics.totalUsers, icon: '👥', color: 'text-purple-400' },
                { label: 'Total Tests', value: analytics.totalTests, icon: '📝', color: 'text-pink-400' },
                { label: 'Personality Types', value: analytics.popularTypes?.length || 0, icon: '🧠', color: 'text-blue-400' },
                { label: 'User Stages', value: analytics.stageStats?.length || 0, icon: '🎯', color: 'text-green-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30 text-center">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</div>
                  <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="font-bold text-lg mb-4">🧠 Popular Personality Types</h2>
                {analytics.popularTypes?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.popularTypes.map((t, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-purple-400 font-bold w-12">{t.type}</span>
                        <div className="flex-1 bg-[#1A1A2E] rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full"
                            style={{ width: `${(t.count / analytics.totalTests) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm">{t.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>

              <div className="bg-[#16213E] rounded-2xl p-5 border border-purple-900/30">
                <h2 className="font-bold text-lg mb-4">🎯 Users by Stage</h2>
                {analytics.stageStats?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.stageStats.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#1A1A2E] rounded-xl px-4 py-3">
                        <span className="text-white font-medium capitalize">{s.stage || 'Guest'}</span>
                        <span className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded-full text-sm font-bold">
                          {s.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-[#16213E] rounded-2xl border border-purple-900/30 overflow-hidden">
              <div className="p-4 border-b border-purple-900/30">
                <h2 className="font-bold text-lg">👥 All Users ({users.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1A1A2E] text-gray-400 text-sm">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Age</th>
                      <th className="px-4 py-3 text-left">Stage</th>
                      <th className="px-4 py-3 text-left">Joined</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} className="border-t border-purple-900/20 hover:bg-purple-900/10 transition-all">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold">{user.name}</td>
                        <td className="px-4 py-3 text-gray-400">{user.email}</td>
                        <td className="px-4 py-3 text-gray-400">{user.age || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded-full text-xs capitalize">
                            {user.stage || 'guest'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {new Date(user.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-400 hover:text-red-300 text-sm border border-red-900/50 px-3 py-1 rounded-lg hover:border-red-500/50 transition-all"
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
              <div className="p-4 border-b border-purple-900/30">
                <h2 className="font-bold text-lg">📝 All Test Attempts ({attempts.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1A1A2E] text-gray-400 text-sm">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Stage</th>
                      <th className="px-4 py-3 text-left">Personality</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a, i) => {
                      let personality = '-'
                      try {
                        const r = JSON.parse(a.result_json)
                        personality = `${r.personality_type} — ${r.personality_name}`
                      } catch {}
                      return (
                        <tr key={a.id} className="border-t border-purple-900/20 hover:bg-purple-900/10 transition-all">
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 font-semibold">{a.name}</td>
                          <td className="px-4 py-3 text-gray-400">{a.email}</td>
                          <td className="px-4 py-3">
                            <span className="bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded-full text-xs capitalize">
                              {a.stage || 'guest'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-purple-300 font-medium">{personality}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {new Date(a.taken_at).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      )
                    })}
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

            {/* Add New Question */}
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
                <select
                  value={newQuestion.category}
                  onChange={e => setNewQuestion({ ...newQuestion, category: e.target.value })}
                  className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Category</option>
                  <option value="Extrovert/Introvert">Extrovert/Introvert</option>
                  <option value="Thinking/Feeling">Thinking/Feeling</option>
                  <option value="Sensing/Intuition">Sensing/Intuition</option>
                  <option value="Judging/Perceiving">Judging/Perceiving</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <input
                  type="number"
                  placeholder="Display order (e.g. 26)"
                  value={newQuestion.display_order}
                  onChange={e => setNewQuestion({ ...newQuestion, display_order: e.target.value })}
                  className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={addQuestion}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  ➕ Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="bg-[#16213E] rounded-2xl border border-purple-900/30 overflow-hidden">
              <div className="p-4 border-b border-purple-900/30">
                <h2 className="font-bold text-lg">❓ Quiz Questions ({questions.length})</h2>
              </div>
              <div className="space-y-0">
                {questions.map((q, i) => (
                  <div key={q.id} className="border-t border-purple-900/20 p-4 hover:bg-purple-900/10 transition-all">
                    {editingQuestion?.id === q.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingQuestion.question_text}
                          onChange={e => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                          className="w-full bg-[#1A1A2E] border border-purple-500 rounded-xl px-4 py-2 text-white focus:outline-none"
                        />
                        <select
                          value={editingQuestion.category}
                          onChange={e => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                          className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="Extrovert/Introvert">Extrovert/Introvert</option>
                          <option value="Thinking/Feeling">Thinking/Feeling</option>
                          <option value="Sensing/Intuition">Sensing/Intuition</option>
                          <option value="Judging/Perceiving">Judging/Perceiving</option>
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingQuestion.option_a}
                            onChange={e => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                            className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-2 text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editingQuestion.option_b}
                            onChange={e => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                            className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-2 text-white focus:outline-none"
                          />
                        </div>
                        <input
                          type="number"
                          value={editingQuestion.display_order}
                          onChange={e => setEditingQuestion({ ...editingQuestion, display_order: e.target.value })}
                          className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-2 text-white focus:outline-none"
                          placeholder="Display order"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => saveQuestion(q.id)}
                            className="flex-1 py-2 bg-green-600 rounded-xl font-bold hover:bg-green-700 transition-all"
                          >
                            ✅ Save
                          </button>
                          <button
                            onClick={() => setEditingQuestion(null)}
                            className="flex-1 py-2 border border-purple-900/50 rounded-xl font-bold hover:border-purple-500 transition-all"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex gap-3">
                        <span className="text-purple-400 font-bold text-sm w-6 shrink-0">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{q.question_text}</p>
                          <div className="flex gap-4 mt-2">
                            <span className="text-green-400 text-sm">A: {q.option_a}</span>
                            <span className="text-orange-400 text-sm">B: {q.option_b}</span>
                          </div>
                          <span className="text-gray-500 text-xs mt-1 block">{q.category}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="text-blue-400 text-sm border border-blue-900/50 px-3 py-1 rounded-lg hover:border-blue-500 transition-all"
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

      </div>
    </div>
  )
}