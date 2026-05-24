import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const CAREER_ICONS = {
  default: '🚀',
  business: '💼',
  tech: '💻',
  design: '🎨',
  medicine: '🏥',
  law: '⚖️',
  finance: '📊',
  education: '📚',
  engineering: '⚙️',
  marketing: '📣',
  science: '🔬',
  arts: '🎭',
}

function getIcon(career) {
  const c = career.toLowerCase()
  if (c.includes('business') || c.includes('manager') || c.includes('entrepreneur') || c.includes('consultant')) return CAREER_ICONS.business
  if (c.includes('software') || c.includes('developer') || c.includes('engineer') || c.includes('tech') || c.includes('data')) return CAREER_ICONS.tech
  if (c.includes('design') || c.includes('ux') || c.includes('ui') || c.includes('creative')) return CAREER_ICONS.design
  if (c.includes('doctor') || c.includes('medical') || c.includes('health') || c.includes('nurse') || c.includes('medicine')) return CAREER_ICONS.medicine
  if (c.includes('law') || c.includes('legal') || c.includes('attorney')) return CAREER_ICONS.law
  if (c.includes('finance') || c.includes('account') || c.includes('banking') || c.includes('invest')) return CAREER_ICONS.finance
  if (c.includes('teach') || c.includes('education') || c.includes('academ')) return CAREER_ICONS.education
  if (c.includes('market') || c.includes('brand') || c.includes('advertis')) return CAREER_ICONS.marketing
  if (c.includes('science') || c.includes('research') || c.includes('lab')) return CAREER_ICONS.science
  if (c.includes('art') || c.includes('music') || c.includes('film') || c.includes('writ')) return CAREER_ICONS.arts
  return CAREER_ICONS.default
}

export default function CareerPicker({ result, onSelect, loading }) {
  const [selected, setSelected] = useState(null)
  const careers = result?.top_careers || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1a4e] to-[#24243e] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🎯
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">Choose Your Path</h1>
          <p className="text-slate-300 text-lg">
            Based on your <span className="text-purple-400 font-semibold">{result?.personality_type}</span> personality, 
            pick the career you want to master first
          </p>
          <p className="text-slate-500 text-sm mt-2">You can switch anytime from your Journey page</p>
        </div>

        {/* Career Cards */}
        <div className="space-y-4 mb-8">
          {careers.map((career, i) => (
            <motion.button
              key={career}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
              onClick={() => setSelected(career)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                selected === career
                  ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/25'
                  : 'border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`text-4xl w-14 h-14 rounded-xl flex items-center justify-center ${
                  selected === career ? 'bg-purple-500/30' : 'bg-white/10'
                }`}>
                  {getIcon(career)}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold text-xl">{career}</div>
                  <div className="text-slate-400 text-sm mt-1">
                    {i === 0 ? '⭐ Best match for your personality' : i === 1 ? '✨ Strong alignment' : '🔥 Great alternative'}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected === career ? 'border-purple-500 bg-purple-500' : 'border-white/30'
                }`}>
                  {selected === career && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* CTA Button */}
        <AnimatePresence>
          {selected && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => onSelect(selected)}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xl
                         hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/30
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Building Your Journey...
                </>
              ) : (
                <>
                  🚀 Start Journey as {selected}
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bottom hint */}
        <p className="text-center text-slate-600 text-sm mt-6">
          Your roadmap, schedule & phases will be built specifically for this career
        </p>
      </motion.div>
    </div>
  )
}