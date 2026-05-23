import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Login failed')
        setLoading(false)
        return
      }

      if (data.token) {
        // Save token and user
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('loginExpiry', 'never')  // ADD THIS

        // Mobile = never expire, PC = 24 hrs
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        if (isMobile) {
          localStorage.setItem('loginExpiry', 'never')
        } else {
          const expiry = Date.now() + 24 * 60 * 60 * 1000
          localStorage.setItem('loginExpiry', expiry.toString())
        }

        setSuccess('✅ Login successful! Redirecting...')

        // Check if already has result
        setTimeout(async () => {
          try {
            // Check if guest had already taken quiz
            const guestResult = localStorage.getItem('guestResult')

            const resultRes = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/latest-result`, {
              headers: { Authorization: `Bearer ${data.token}` }
            })
            const resultData = await resultRes.json()

            if (resultData.result) {
              // Has result in DB → use it
              localStorage.setItem('result', JSON.stringify(resultData.result))
              localStorage.removeItem('guestResult')
              navigate('/result', { replace: true })
            } else if (guestResult) {
              // Had guest result → save it as logged in result
              localStorage.setItem('result', guestResult)
              localStorage.removeItem('guestResult')
              navigate('/result', { replace: true })
            } else {
              // No result anywhere → go to quiz
              navigate('/quiz', { replace: true })
            }
          } catch {
            navigate('/quiz', { replace: true })
          }
        }, 1500)

      } else {
        setError(data.message || 'Login failed')
      }

    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">🧠</span>
          <h1 className="text-2xl font-bold text-purple-400 mt-2">CareerMind AI</h1>
          <p className="text-gray-400 mt-1">Welcome back!</p>
        </div>

        {/* Card */}
        <div className="bg-[#16213E] rounded-2xl p-8 border border-purple-900/30">
          <h2 className="text-xl font-bold mb-6">Login to your account</h2>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {success}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-1 block">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="text-gray-400 text-sm mb-1 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Login Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Logging in...' : '🚀 Login'}
          </button>

          {/* Links */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <span
                onClick={() => navigate('/register')}
                className="text-purple-400 cursor-pointer hover:underline font-semibold"
              >
                Register here
              </span>
            </p>
            <span
              onClick={() => navigate('/quiz')}
              className="text-gray-500 text-sm cursor-pointer hover:text-gray-300 transition-all block"
            >
              Skip login → Take test as guest
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}