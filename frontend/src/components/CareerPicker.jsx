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
  const c = (career || '').toLowerCase()
  if (c.includes('business') || c.includes('manager') || c.includes('entrepreneur') || c.includes('consultant') || c.includes('operations')) return CAREER_ICONS.business
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

// Normalize: accepts both string and {title, reason, salary} object
function getCareerTitle(career) {
  if (!career) return ''
  if (typeof career === 'string') return career
  return career.title || career.name || career.career || JSON.stringify(career)
}

export default function CareerPicker({ result, onSelect, loading }) {
  const [selected, setSelected] = useState(null)

  // top_careers can be array of strings OR array of objects
  const rawCareers = result?.top_careers || []

  return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🎯
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Choose Your Career Path</h1>
          <p className="text-gray-400">
            Based on your <span className="text-purple-400 font-semibold">{result?.personality_type}</span> personality — pick the career you want to master
          </p>
          <p className="text-gray-600 text-sm mt-1">You can switch anytime from your Journey page</p>
        </div>

        {/* Career Cards */}
        <div className="space-y-4 mb-8">
          {rawCareers.map((career, i) => {
            const title = getCareerTitle(career)
            const reason = typeof career === 'object' ? career.reason : null
            const salary = typeof career === 'object' ? career.salary : null
            const isSelected = selected === title

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                onClick={() => setSelected(title)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-600/20'
                    : 'border-purple-900/40 bg-[#16213E] hover:border-purple-500/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-3xl w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-purple-500/30' : 'bg-purple-900/30'
                  }`}>
                    {getIcon(title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-lg">{title}</div>
                    {reason && <div className="text-gray-400 text-sm mt-0.5">{reason}</div>}
                    {salary && (
                      <div className="text-green-400 text-xs font-semibold mt-1">💰 {salary}</div>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                  }`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </motion.button>
            )
          })}
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xl
                         hover:scale-105 transition-transform shadow-lg
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Building Your Journey...
                </>
              ) : (
                <>🚀 Start Journey as {selected}</>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <p className="text-center text-gray-600 text-sm mt-6">
          Your roadmap, phases & daily schedule will be built specifically for this career
        </p>
      </motion.div>
    </div>
  )
}