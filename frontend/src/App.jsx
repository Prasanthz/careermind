import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import SampleResult from './pages/SampleResult'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Quiz from './pages/Quiz'
import Result from './pages/Result'
import Journey from './pages/Journey'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

const isLoggedIn = () => {
  const token = localStorage.getItem('token')
  const expiry = localStorage.getItem('loginExpiry')
  if (!token || !expiry) return false
  if (expiry === 'never') return true
  return Date.now() < parseInt(expiry)
}

const hasResult = () => !!localStorage.getItem('result')
const hasGuestResult = () => !!localStorage.getItem('guestResult')

const AuthRoute = ({ children }) => {
  if (isLoggedIn()) {
    if (hasResult() || hasGuestResult()) {
      return <Navigate to="/result" replace />
    }
    return <Navigate to="/quiz" replace />
  }
  return children
}

const QuizRoute = () => {
  if (isLoggedIn()) {
    return <Quiz guestMode={false} />
  }
  return <Quiz guestMode={true} />
}

const ResultRoute = () => {
  if (isLoggedIn()) {
    if (!hasResult()) return <Navigate to="/quiz" replace />
    return <Result />
  }
  if (hasGuestResult()) {
    return <Result />
  }
  return <Navigate to="/" replace />
}

const JourneyRoute = () => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <Journey />
}

const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function StorageGuard() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem('token')
      const expiry = localStorage.getItem('loginExpiry')
      const loggedIn = token && expiry && (expiry === 'never' || Date.now() < parseInt(expiry))
      const protectedPaths = ['/journey', '/profile', '/admin', '/result']
      if (!loggedIn && protectedPaths.includes(location.pathname)) {
        navigate('/login', { replace: true })
      }
    }

    window.addEventListener('storage', check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)

    return () => {
      window.removeEventListener('storage', check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [location.pathname, navigate])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <StorageGuard />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={
          <AuthRoute><Login /></AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute><Register /></AuthRoute>
        } />

        <Route path="/quiz" element={<QuizRoute />} />
        <Route path="/result" element={<ResultRoute />} />
        <Route path="/journey" element={<JourneyRoute />} />

        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute><Admin /></ProtectedRoute>
        } />

        <Route path="/sample-result" element={<SampleResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App