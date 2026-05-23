import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', stage: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const stages = [
    { value: 'school', label: '🎒 School Student' },
    { value: 'college', label: '🎓 College Student' },
    { value: 'jobseeker', label: '💼 Job Seeker' },
    { value: 'switcher', label: '🔄 Career Switcher' },
    { value: 'professional', label: '👩‍💼 Working Professional' },
  ]

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    if (!form.name || !form.email || !form.password) {
      setError('Please fill all required fields')
      setLoading(false)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Registration failed')
        setLoading(false)
        return
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('loginExpiry', 'never')  // ADD THIS
        setSuccess('✅ Account created! Redirecting...')
        setTimeout(() => navigate('/quiz', { replace: true }), 1500)
      } else {
        setError(data.message || 'Registration failed')
      }

    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="text-5xl">🧠</span>
          <h1 className="text-2xl font-bold text-purple-400 mt-2">CareerMind AI</h1>
          <p className="text-gray-400 mt-1">Create your free account</p>
        </div>

        <div className="bg-[#16213E] rounded-2xl p-8 border border-purple-900/30">
          <h2 className="text-xl font-bold mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Age</label>
              <input
                type="number"
                placeholder="Your age"
                value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">I am a...</label>
              <select
                value={form.stage}
                onChange={e => setForm({ ...form, stage: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
              >
                <option value="">Select your stage</option>
                {stages.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              {loading ? '⏳ Creating account...' : '✅ Create Account'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <span onClick={() => navigate('/login')} className="text-purple-400 cursor-pointer hover:underline font-semibold">
                Login here
              </span>
            </p>
          </div>

          <div className="mt-4 text-center">
            <span
              onClick={() => navigate('/quiz')}
              className="text-gray-500 text-sm cursor-pointer hover:text-gray-300 transition-all"
            >
              Skip → Take test as guest
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}