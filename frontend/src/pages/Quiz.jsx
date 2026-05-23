import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Quiz({ guestMode = false }){
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const savedUser = JSON.parse(localStorage.getItem('user') || '{}')
  const [stageSelected, setStageSelected] = useState(!!savedUser.stage)
  const [stage, setStage] = useState(savedUser.stage || '')

  const stages = [
    { value: 'school', label: '🎒 School Student' },
    { value: 'college', label: '🎓 College Student' },
    { value: 'jobseeker', label: '💼 Job Seeker' },
    { value: 'switcher', label: '🔄 Career Switcher' },
    { value: 'professional', label: '👩‍💼 Working Professional' },
  ]

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/quiz/questions`)
      .then(res => res.json())
      .then(data => {
        setQuestions(data.questions)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [current]: answer }
    setAnswers(newAnswers)

    if (current < questions.length - 1) {
      setTimeout(() => setCurrent(current + 1), 400)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ answers, stage })
      })

      const data = await res.json()

      if (guestMode) {
        localStorage.setItem('guestResult', JSON.stringify(data.result))
      } else {
        localStorage.setItem('result', JSON.stringify(data.result))
      }

      navigate('/result', { replace: true })
    } catch (err) {
      alert('Error submitting. Please try again.')
    }
    setSubmitting(false)
  }

  const progress = questions.length > 0
    ? Math.round(((current + 1) / questions.length) * 100)
    : 0

  // Stage Selection Screen
  if (!stageSelected) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <span className="text-5xl">🧠</span>
            <h1 className="text-2xl font-bold text-purple-400 mt-2">CareerMind AI</h1>
            <p className="text-gray-400 mt-1">First, tell us who you are</p>
          </div>

          <div className="bg-[#16213E] rounded-2xl p-8 border border-purple-900/30">
            <h2 className="text-xl font-bold mb-6 text-center">I am a...</h2>
            <div className="space-y-3">
              {stages.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`w-full py-4 px-6 rounded-xl border text-left font-semibold transition-all ${
                    stage === s.value
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-[#1A1A2E] border-purple-900/50 text-gray-300 hover:border-purple-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => stage && setStageSelected(true)}
              disabled={!stage}
              className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-40 disabled:scale-100"
            >
              Continue →
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🧠</div>
          <p className="text-purple-400 font-semibold">Loading questions...</p>
        </div>
      </div>
    )
  }

  const q = questions[current]

  // Quiz Screen
  return (
    <div className="min-h-screen bg-[#1A1A2E] flex flex-col px-4 py-8">

      {/* Header */}
      <div className="max-w-lg mx-auto w-full mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-purple-400 font-semibold text-sm">
            Question {current + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{progress}% done</span>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-red-400 border border-red-400/40 px-3 py-1 rounded-lg hover:bg-red-400/10 transition-all"
            >
              X Exit
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#16213E] rounded-full h-3">
          <motion.div
            className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-[#16213E] rounded-2xl p-8 border border-purple-900/30 mb-6">
              <div className="text-purple-400 text-sm font-medium mb-3">
                {q?.category}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                {q?.question_text}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {[
                { label: q?.option_a, value: 'A' },
                { label: q?.option_b, value: 'B' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className={`w-full py-5 px-6 rounded-xl border text-left font-semibold text-lg transition-all hover:scale-105 ${
                    answers[current] === opt.value
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-[#16213E] border-purple-900/50 text-gray-200 hover:border-purple-500'
                  }`}
                >
                  <span className="text-purple-400 mr-3">{opt.value}.</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => current > 0 && setCurrent(current - 1)}
            disabled={current === 0}
            className="px-6 py-3 border border-purple-900/50 rounded-xl text-gray-400 hover:border-purple-500 hover:text-white transition-all disabled:opacity-30"
          >
            ← Previous
          </button>

          {current === questions.length - 1 && answers[current] ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
            >
              {submitting ? '⏳ Analyzing...' : '🚀 Get My Result!'}
            </button>
          ) : (
            <button
              onClick={() => answers[current] && setCurrent(current + 1)}
              disabled={!answers[current]}
              className="px-6 py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-700 transition-all disabled:opacity-30"
            >
              Next →
            </button>
          )}
        </div>

        {/* Answer count */}
        <p className="text-center text-gray-500 text-sm mt-4">
          {Object.keys(answers).length} of {questions.length} answered
        </p>
      </div>
    </div>
  )
} 
  
