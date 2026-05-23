import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const stageLabels = {
  school: '🎒 School Student',
  college: '🎓 College Student',
  jobseeker: '💼 Job Seeker',
  switcher: '🔄 Career Switcher',
  professional: '👩‍💼 Working Professional',
}

const countryCodes = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
]

export default function Profile() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const token = localStorage.getItem('token')

  // Read-only data from registration
  const [userData, setUserData] = useState({
    name: '', email: '', age: '', stage: ''
  })

  // Editable fields
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [profilePic, setProfilePic] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          const u = data.user
          setUserData({
            name: u.name || '',
            email: u.email || '',
            age: u.age || '',
            stage: u.stage || '',
          })
          // Parse phone — split country code if saved
          if (u.phone) {
            const matched = countryCodes.find(c => u.phone.startsWith(c.code))
            if (matched) {
              setCountryCode(matched.code)
              setPhone(u.phone.slice(matched.code.length).trim())
            } else {
              setPhone(u.phone)
            }
          }
          setDob(u.dob ? u.dob.split('T')[0] : '')
          setProfilePic(u.profile_pic || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image too large. Please compress it at squoosh.app and try again.')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => setProfilePic(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const fullPhone = phone ? `${countryCode} ${phone}` : ''
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: fullPhone || null,
          dob: dob || null,
          profile_pic: profilePic || null
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Update failed'); setSaving(false); return }

      // Update localStorage with latest profile_pic
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, profile_pic: profilePic }))

      setSuccess('✅ Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Cannot connect to server.')
    }
    setSaving(false)
  }

  const getInitials = () =>
    userData.name
      ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '?'

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

        {/* Avatar card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30 flex flex-col items-center">
            <div
              onClick={() => fileRef.current.click()}
              className="relative w-24 h-24 rounded-full cursor-pointer group"
            >
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-600"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold border-4 border-purple-600">
                  {getInitials()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-semibold">📷 Change</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <p className="text-gray-500 text-xs mt-3">Tap photo to change · Max 2MB</p>
            <p className="text-white font-bold text-lg mt-1">{userData.name}</p>
            <p className="text-gray-400 text-sm">{userData.email}</p>
          </div>
        </motion.div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm">{success}</div>
        )}

        {/* Read-only registered info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-lg">Account Info</h2>
              <span className="text-xs text-gray-500 bg-[#1A1A2E] px-2 py-1 rounded-lg">🔒 Read only</span>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Full Name</label>
              <div className="w-full bg-[#1A1A2E] border border-purple-900/20 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed">
                {userData.name || '—'}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email</label>
              <div className="w-full bg-[#1A1A2E] border border-purple-900/20 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed">
                {userData.email || '—'}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Age</label>
              <div className="w-full bg-[#1A1A2E] border border-purple-900/20 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed">
                {userData.age || '—'}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Stage</label>
              <div className="w-full bg-[#1A1A2E] border border-purple-900/20 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed">
                {stageLabels[userData.stage] || '—'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Editable fields */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-[#16213E] rounded-2xl p-6 border border-purple-900/30 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-lg">Additional Info</h2>
              <span className="text-xs text-purple-400 bg-purple-600/20 px-2 py-1 rounded-lg">✏️ Editable</span>
            </div>

            {/* Phone with country code */}
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
                >
                  {countryCodes.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="00000 00000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="flex-1 bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full bg-[#1A1A2E] border border-purple-900/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
              />
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