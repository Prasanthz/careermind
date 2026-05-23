import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const stages = [
  { value: 'school', label: '🎒 School Student' },
  { value: 'college', label: '🎓 College Student' },
  { value: 'jobseeker', label: '💼 Job Seeker' },
  { value: 'switcher', label: '🔄 Career Switcher' },
  { value: 'professional', label: '👩‍💼 Working Professional' },
]

export default function Profile() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name: '', email: '', age: '', stage: '', phone: '', dob: '', profile_pic: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setForm({
            name: data.user.name || '',
            email: data.user.email || '',
            age: data.user.age || '',
            stage: data.user.stage || '',
            phone: data.user.phone || '',
            dob: data.user.dob ? data.user.dob.split('T')[0] : '',
            profile_pic: data.user.profile_pic || ''
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, profile_pic: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Update failed'); setSaving(false); return }
      // Update localStorage user too
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, name: form.name }))
      setSuccess('✅ Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Cannot connect to server.')
    }
    setSaving(false)
  }

  const getInitials = () => form.name ? form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  if (loading) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">👤</div>
        <p className="text-purple-400 font-semibold">Loading profile...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-white pb-20">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-purple-900/30 px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-purple-400">👤 My Profile</h1>
            <p className="text-gray-400 text-xs mt-0.5">Manage your account details</p>
          </div>
          <button
            onClick={() => navigate('/journey')}
            className="text-gray-400 text-sm border border-purple-900/50 px-3 py-1.5 rounded-lg hover:border-purple-500 transition-all"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-4">

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30 flex flex-col items-center">
            <div
              onClick={() => fileRef.current.click()}
              className="relative w-24 h-24 rounded-full cursor-pointer group"
            >
              {form.profile_pic ? (
                <img
                  src={form.profile_pic}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-600"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold border-4 border-purple-600">
                  {getInitials()}
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-semibold">Change</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <p className="text-gray-500 text-xs mt-3">Tap photo to change · Max 2MB</p>
            <p className="text-white font-bold text-lg mt-1">{form.name}</p>
            <p className="text-gray-400 text-sm">{form.email}</p>
          </div>
        </motion.div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm">{success}</div>
        )}

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30 space-y-4">
            <h2 className="font-bold text-lg">Personal Details</h2>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full bg-[#1A1A2E] border border-purple-900/30 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
              />
              <p className="text-gray-600 text-xs mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 00000 00000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Age</label>
              <input
                type="number"
                placeholder="Your age"
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">I am a...</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
              >
                <option value="">Select your stage</option>
                {stages.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              {saving ? '⏳ Saving...' : '💾 Save Profile'}
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  )
}