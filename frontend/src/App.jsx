import { useEffect, useState } from 'react'
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

const getLoginState = () => {
  const token = localStorage.getItem('token')
  const expiry = localStorage.getItem('loginExpiry')
  if (!token || !expiry) return false
  if (expiry === 'never') return true
  return Date.now() < parseInt(expiry)
}

const hasResult = () => !!localStorage.getItem('result')
const hasGuestResult = () => !!localStorage.getItem('guestResult')

const AuthRoute = ({ children, loggedIn }) => {
  if (loggedIn) {
    if (hasResult() || hasGuestResult()) return <Navigate to="/result" replace />
    return <Navigate to="/quiz" replace />
  }
  return children
}

const QuizRoute = ({ loggedIn }) => {
  return <Quiz guestMode={!loggedIn} />
}

const ResultRoute = ({ loggedIn }) => {
  if (loggedIn) {
    if (!hasResult()) return <Navigate to="/quiz" replace />
    return <Result />
  }
  if (hasGuestResult()) return <Result />
  return <Navigate to="/" replace />
}

const JourneyRoute = ({ loggedIn }) => {
  if (!loggedIn) return <Navigate to="/login" replace />
  return <Journey />
}

const ProtectedRoute = ({ children, loggedIn }) => {
  if (!loggedIn) return <Navigate to="/login" replace />
  return children
}

function StorageGuard({ loggedIn, setLoggedIn }) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const check = () => {
      const currentState = getLoginState()
      if (currentState !== loggedIn) {
        setLoggedIn(currentState)
      }
      if (!currentState) {
        const protectedPaths = ['/journey', '/profile', '/admin', '/result']
        if (protectedPaths.includes(location.pathname)) {
          navigate('/login', { replace: true })
        }
      }
    }

    window.addEventListener('storage', check)
    window.addEventListener('focus', check)
    window.addEventListener('pageshow', check)
    document.addEventListener('visibilitychange', check)

    return () => {
      window.removeEventListener('storage', check)
      window.removeEventListener('focus', check)
      window.removeEventListener('pageshow', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [location.pathname, navigate, loggedIn, setLoggedIn])

  return null
}

function App() {
  const [loggedIn, setLoggedIn] = useState(getLoginState)

  return (
    <BrowserRouter>
      <StorageGuard loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={
          <AuthRoute loggedIn={loggedIn}><Login onLogin={() => setLoggedIn(true)} /></AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute loggedIn={loggedIn}><Register /></AuthRoute>
        } />

        <Route path="/quiz" element={<QuizRoute loggedIn={loggedIn} />} />
        <Route path="/result" element={<ResultRoute loggedIn={loggedIn} />} />
        <Route path="/journey" element={<JourneyRoute loggedIn={loggedIn} />} />

        <Route path="/profile" element={
          <ProtectedRoute loggedIn={loggedIn}><Profile /></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute loggedIn={loggedIn}><Admin /></ProtectedRoute>
        } />

        <Route path="/sample-result" element={<SampleResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App