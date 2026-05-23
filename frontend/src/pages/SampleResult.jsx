import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function SampleResult() {
  const navigate = useNavigate()

  const sample = {
    personality_type: "INTJ",
    personality_name: "The Architect",
    description: "Strategic and analytical, INTJs are natural planners who think long-term. They are independent, determined, and highly competent — always seeking to improve systems and processes around them.",
    top_traits: ["Strategic Thinking", "Independent", "Analytical", "Determined", "Innovative"],
    improve_traits: ["Emotional Expression", "Flexibility", "Patience"],
    top_careers: [
      { title: "Software Engineer", reason: "Logical problem-solving and system design perfectly match INTJ strengths.", salary: "8 - 25 LPA" },
      { title: "Data Scientist", reason: "Deep analytical thinking and pattern recognition are core INTJ traits.", salary: "10 - 30 LPA" },
      { title: "Product Manager", reason: "Strategic planning and long-term vision make INTJs excellent product leaders.", salary: "12 - 35 LPA" },
      { title: "AI/ML Engineer", reason: "INTJs thrive in cutting-edge technical fields requiring deep focus.", salary: "15 - 40 LPA" },
      { title: "Business Analyst", reason: "Connecting data to strategy is a natural INTJ superpower.", salary: "6 - 18 LPA" },
    ],
    courses: [
      { name: "Python for Everybody", platform: "Coursera", duration: "2 months", free: true, url: "https://coursera.org" },
      { name: "Machine Learning", platform: "YouTube", duration: "10 hours", free: true, url: "https://youtube.com" },
      { name: "Data Science Bootcamp", platform: "Udemy", duration: "3 months", free: false, url: "https://udemy.com" },
    ],
    skills_you_have: ["Problem Solving", "Critical Thinking", "Logic"],
    skills_to_learn: ["Python", "Machine Learning", "SQL", "Data Visualization"],
    roadmap: [
      { month: "Month 1-2", goal: "Learn Python Basics", tasks: ["Complete Python course", "Build 2 small projects", "Practice daily coding"] },
      { month: "Month 3-4", goal: "Learn ML Concepts", tasks: ["Study ML algorithms", "Work on Kaggle datasets", "Build ML project"] },
      { month: "Month 5-6", goal: "Apply for Jobs", tasks: ["Update resume", "Apply on Naukri & LinkedIn", "Prepare for interviews"] },
    ],
    famous_people: ["Elon Musk", "Isaac Newton", "Mark Zuckerberg"],
    team_style: "Works best independently with clear goals. Prefers structured teams with defined roles.",
    leadership_style: "Leads by strategy and vision. Sets high standards and expects competence from the team.",
    ideal_work_environment: "Quiet, structured, and intellectually stimulating environment with minimal interruptions.",
  }

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="CareerMind AI"
              className="h-9 w-auto"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline' }}
            />
            <span className="text-2xl" style={{ display: 'none' }}>🧠</span>
            <div>
              <span className="text-lg font-bold text-white">CareerMind AI</span>
              <span className="ml-2 text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">Sample Result</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 border border-purple-900/50 px-4 py-2 rounded-lg hover:border-purple-500 hover:text-white transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Sample Banner */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm text-center font-medium">
          🎯 This is a sample result. Take the free test to get your personalized result!
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">

        {/* Personality Type Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-700/50 rounded-2xl p-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-6xl font-extrabold text-white mb-1">{sample.personality_type}</div>
              <div className="text-2xl font-bold text-purple-300 mb-4">{sample.personality_name}</div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center overflow-hidden border-2 border-purple-500/50 shrink-0">
              <img
                src="/logo.svg"
                alt=""
                className="w-10 h-10 object-contain"
                onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span class="text-3xl">🧠</span>' }}
              />
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed">{sample.description}</p>
        </motion.div>

        {/* Top Traits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">💪 Top Strengths</h2>
          <div className="flex flex-wrap gap-2">
            {sample.top_traits.map((trait, i) => (
              <span key={i} className="bg-purple-600/30 border border-purple-600/50 text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
                {trait}
              </span>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-gray-400 mt-4 mb-2">Areas to Improve</h3>
          <div className="flex flex-wrap gap-2">
            {sample.improve_traits.map((trait, i) => (
              <span key={i} className="bg-red-900/20 border border-red-900/30 text-red-300 px-3 py-1 rounded-full text-sm">
                {trait}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Top Careers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🎯 Top Career Matches</h2>
          <div className="space-y-3">
            {sample.top_careers.map((career, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-[#1A1A2E] rounded-xl border border-purple-900/20">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{career.title}</div>
                  <div className="text-gray-400 text-sm mt-0.5">{career.reason}</div>
                </div>
                <span className="text-green-400 text-sm font-bold shrink-0">{career.salary}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Courses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">📚 Recommended Courses</h2>
          <div className="space-y-3">
            {sample.courses.map((course, i) => (
              <a
                key={i}
                href={course.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20 hover:border-purple-500/50 transition-all group"
              >
                <div>
                  <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">{course.name}</div>
                  <div className="text-gray-400 text-sm">{course.platform} · {course.duration}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${course.free ? 'bg-green-600/30 text-green-400' : 'bg-orange-600/30 text-orange-400'}`}>
                  {course.free ? 'FREE' : 'Paid'}
                </span>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Skill Gap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🔍 Skill Gap Analysis</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-green-400 text-xs font-bold uppercase tracking-wider mb-3">✓ Skills You Have</div>
              <div className="space-y-2">
                {sample.skills_you_have.map((s, i) => (
                  <div key={i} className="text-gray-300 text-sm bg-green-900/20 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-green-400">•</span> {s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">→ Skills to Learn</div>
              <div className="space-y-2">
                {sample.skills_to_learn.map((s, i) => (
                  <div key={i} className="text-gray-300 text-sm bg-yellow-900/10 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span className="text-yellow-400">•</span> {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🗺️ Learning Roadmap</h2>
          <div className="space-y-4">
            {sample.roadmap.map((phase, i) => (
              <div key={i} className="relative pl-6 border-l-2 border-purple-700/50">
                <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600" />
                <div className="text-purple-400 text-xs font-bold uppercase tracking-wider">{phase.month}</div>
                <div className="text-white font-semibold mt-0.5">{phase.goal}</div>
                <ul className="mt-2 space-y-1">
                  {phase.tasks.map((task, j) => (
                    <li key={j} className="text-gray-400 text-sm flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5 shrink-0">•</span> {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Famous People + Work Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30"
        >
          <h2 className="text-lg font-bold mb-4">🌟 Famous People With Your Personality</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {sample.famous_people.map((p, i) => (
              <span key={i} className="px-4 py-2 bg-gradient-to-r from-purple-800/40 to-pink-800/30 rounded-xl border border-purple-700/30 text-white text-sm font-medium">
                {p}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20">
              <div className="text-purple-400 text-sm font-semibold mb-1">👥 Team Style</div>
              <p className="text-gray-300 text-sm leading-relaxed">{sample.team_style}</p>
            </div>
            <div className="bg-[#1A1A2E] rounded-xl p-4 border border-purple-900/20">
              <div className="text-purple-400 text-sm font-semibold mb-1">🏢 Ideal Work Environment</div>
              <p className="text-gray-300 text-sm leading-relaxed">{sample.ideal_work_environment}</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-700/50 rounded-2xl p-8 text-center"
        >
          <h2 className="text-2xl font-bold mb-2">Want Your Own Result? 🎯</h2>
          <p className="text-gray-400 mb-6">Take the free 25-question test and get your personalized career roadmap!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/quiz')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
            >
              🚀 Take Free Test Now
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 border border-purple-600 rounded-xl font-bold text-lg hover:bg-purple-600/20 transition-all"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  )
}