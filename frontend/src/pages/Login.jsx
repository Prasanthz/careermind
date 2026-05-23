import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('loginExpiry', 'never')

        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        if (isMobile) {
          localStorage.setItem('loginExpiry', 'never')
        } else {
          const expiry = Date.now() + 24 * 60 * 60 * 1000
          localStorage.setItem('loginExpiry', expiry.toString())
        }

        setSuccess('✅ Login successful! Redirecting...')

        setTimeout(async () => {
          try {
            const guestResult = localStorage.getItem('guestResult')

            const resultRes = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/latest-result`, {
              headers: { Authorization: `Bearer ${data.token}` }
            })
            const resultData = await resultRes.json()

            if (resultData.result) {
              localStorage.setItem('result', JSON.stringify(resultData.result))
              localStorage.removeItem('guestResult')
              navigate('/result', { replace: true })
            } else if (guestResult) {
              localStorage.setItem('result', guestResult)
              localStorage.removeItem('guestResult')
              navigate('/result', { replace: true })
            } else {
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors"
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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