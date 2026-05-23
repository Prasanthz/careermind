import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import LandingReviews from '../components/LandingReviews'

export default function Landing() {
  const navigate = useNavigate()
  const [testedCount, setTestedCount] = useState(null)
  const [questionCount, setQuestionCount] = useState(25)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/stats`)
      .then(r => r.json())
      .then(data => {
        setTestedCount(data.tested ?? null)
        setQuestionCount(data.questionCount || 25)
      })
      .catch(() => {})
  }, [])

  // ✅ Check if user is logged in
  const isLoggedIn = () => {
    const token = localStorage.getItem('token')
    const expiry = localStorage.getItem('loginExpiry')
    if (!token || !expiry) return false
    if (expiry === 'never') return true
    return Date.now() < parseInt(expiry)
  }

  // ✅ Smart navigation: logged in → result, logged out → login
  const handleTakeTest = () => {
    if (isLoggedIn()) {
      // If they already have a result, go there; otherwise go to quiz
      if (localStorage.getItem('result')) {
        navigate('/result')
      } else {
        navigate('/quiz')
      }
    } else {
      navigate('/login')
    }
  }

  // ✅ Sample quiz: always goes directly to quiz (guest mode), no login needed
  const handleSampleQuiz = () => {
    navigate('/quiz')
  }

  const features = [
    { icon: '🧠', title: 'AI-Powered Analysis', desc: 'Advanced AI analyzes your personality with scientific accuracy' },
    { icon: '🎯', title: 'Career Matching', desc: 'Get matched with careers that perfectly fit your personality type' },
    { icon: '📚', title: 'Learning Roadmap', desc: 'Personalized step-by-step roadmap with courses and resources' },
    { icon: '🔥', title: 'Daily Streaks', desc: 'Stay motivated with daily goals, streaks, and achievement badges' },
    { icon: '📊', title: 'Progress Tracking', desc: 'Track your journey through phases with visual progress bars' },
    { icon: '🔔', title: 'Daily Reminders', desc: 'Get email reminders to keep your learning streak alive' },
  ]

  const userTypes = [
    { icon: '🎒', type: 'School Student', desc: 'Plan your future early' },
    { icon: '🎓', type: 'College Student', desc: 'Choose the right specialization' },
    { icon: '💼', type: 'Job Seeker', desc: 'Find your ideal career' },
    { icon: '🔄', type: 'Career Switcher', desc: 'Pivot with confidence' },
    { icon: '💼', type: 'Professional', desc: 'Accelerate your career growth' },
    { icon: '🌍', type: 'Anyone', desc: 'Discover your true potential' },
  ]

  const steps = [
    { num: '01', title: 'Take the Quiz', desc: `Answer ${questionCount} simple personality questions` },
    { num: '02', title: 'AI Analyzes', desc: 'Our AI deeply analyzes your answers' },
    { num: '03', title: 'Get Results', desc: 'Receive your personality type and career matches' },
    { num: '04', title: 'Start Journey', desc: 'Follow your personalized learning roadmap' },
  ]

  const loggedIn = isLoggedIn()

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#1A1A2E]/90 backdrop-blur-md border-b border-purple-900/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <img src="/logo.svg" alt="CareerMind AI" className="h-10 w-auto" />
          <div className="flex gap-3">
            {loggedIn ? (
              // ✅ Logged in: show Go to Result button
              <button
                onClick={() => navigate(localStorage.getItem('result') ? '/result' : '/quiz')}
                className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all font-semibold"
              >
                My Result →
              </button>
            ) : (
              // ✅ Logged out: show Login + Take Free Test
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-purple-400 border border-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-all"
                >
                  Login
                </button>
                <button
                  onClick={handleTakeTest}
                  className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all font-semibold"
                >
                  Take Free Test
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-block bg-purple-600/20 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-purple-600/30">
            🚀 AI-Powered Career Guidance
          </span>
          <div className="flex justify-center mb-8">
            <img src="/logo.svg" alt="CareerMind AI" className="h-20 w-auto" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Discover Who You Are.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Find Where You Belong.
            </span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Take a {questionCount}-question personality test and let our AI match you with the perfect career path, courses, and roadmap — completely free.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* ✅ Main CTA: logged in → result/quiz, logged out → login */}
            <button
              onClick={handleTakeTest}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg shadow-purple-900/50"
            >
              {loggedIn ? '🎯 Go to My Result' : '🎯 Take Free Test Now'}
            </button>
            {/* ✅ Sample quiz: always goes to quiz directly, no login */}
            <button
              onClick={handleSampleQuiz}
              className="w-full sm:w-auto px-8 py-4 border border-purple-600 rounded-xl text-lg font-semibold hover:bg-purple-600/20 transition-all"
            >
              Try Sample Quiz →
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-14">
            {[
              { num: testedCount !== null ? testedCount.toLocaleString() : '...', label: 'People Tested' },
              { num: '16', label: 'Personality Types' },
              { num: '48+', label: 'Career Paths' },
              { num: '100%', label: 'Free Forever' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-extrabold text-purple-400">{stat.num}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Who is it for */}
      <section className="py-20 px-4 bg-[#16213E]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Built For <span className="text-purple-400">Everyone</span></h2>
          <p className="text-gray-400 text-center mb-12">From school students to working professionals</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {userTypes.map((u, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-[#1A1A2E] p-6 rounded-xl border border-purple-900/30 hover:border-purple-500/50 transition-all hover:scale-105 cursor-pointer"
              >
                <div className="text-3xl mb-3">{u.icon}</div>
                <div className="font-semibold text-white mb-1">{u.type}</div>
                <div className="text-gray-400 text-sm">{u.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It <span className="text-purple-400">Works</span></h2>
          <p className="text-gray-400 text-center mb-12">Get your results in under 5 minutes</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="w-16 h-16 bg-purple-600/20 border border-purple-600/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-400 font-bold text-xl">{step.num}</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-purple-900/50" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-[#16213E]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Everything You <span className="text-purple-400">Need</span></h2>
          <p className="text-gray-400 text-center mb-12">One platform for complete career guidance</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-[#1A1A2E] p-6 rounded-xl border border-purple-900/30 hover:border-purple-500/50 transition-all"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LandingReviews />

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-700/50 rounded-2xl p-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Find Your <span className="text-purple-400">Perfect Career?</span>
            </h2>
            <p className="text-gray-400 mb-8">Join thousands of people who discovered their true calling</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* ✅ CTA section also respects login state */}
              <button
                onClick={handleTakeTest}
                className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg"
              >
                {loggedIn ? '🎯 Go to My Result' : '🚀 Start Free Test Now'}
              </button>
              {loggedIn ? (
                <button
                  onClick={() => navigate('/journey')}
                  className="px-10 py-4 border border-purple-600 rounded-xl text-lg font-semibold hover:bg-purple-600/20 transition-all"
                >
                  🗺️ My Journey
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="px-10 py-4 border border-purple-600 rounded-xl text-lg font-semibold hover:bg-purple-600/20 transition-all"
                >
                  🔐 Login to My Account
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-purple-900/30 text-center">
        <div className="flex justify-center mb-4">
          <img src="/logo.svg" alt="CareerMind AI" className="h-8 w-auto opacity-70" />
        </div>
        <p className="text-gray-500 text-sm">© 2025 CareerMind AI. Built with ❤️ for career seekers everywhere.</p>
      </footer>

    </div>
  )
}