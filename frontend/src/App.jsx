import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SampleResult from './pages/SampleResult'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Quiz from './pages/Quiz'
import Result from './pages/Result'
import Journey from './pages/Journey'
import Admin from './pages/Admin'

const isLoggedIn = () => {
  const token = localStorage.getItem('token')
  const expiry = localStorage.getItem('loginExpiry')
  if (!token || !expiry) return false
  if (expiry === 'never') return true
  return Date.now() < parseInt(expiry)
}

const hasResult = () => !!localStorage.getItem('result')
const hasGuestResult = () => !!localStorage.getItem('guestResult')

// Auth Route — skip if already logged in
const AuthRoute = ({ children }) => {
  if (isLoggedIn()) {
    return <Navigate to={hasResult() ? '/result' : '/quiz'} replace />
  }
  return children
}

// Quiz Route
const QuizRoute = () => {
  if (isLoggedIn()) {
    return <Quiz guestMode={false} />
  }
  return <Quiz guestMode={true} />
}

// Result Route
const ResultRoute = () => {
  // Logged in user
  if (isLoggedIn()) {
    if (!hasResult()) return <Navigate to="/quiz" replace />
    return <Result />
  }
  // Guest with result
  if (hasGuestResult()) {
    return <Result />
  }
  // No result at all → go to landing
  return <Navigate to="/" replace />
}

// Journey Route — must be logged in
const JourneyRoute = () => {
  if (!isLoggedIn()) {
    // Guest trying to access journey → go to login
    return <Navigate to="/login" replace />
  }
  return <Journey />
}

// Protected Route
const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />

        {/* Auth */}
        <Route path="/login" element={
          <AuthRoute><Login /></AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute><Register /></AuthRoute>
        } />

        {/* Quiz — guests allowed */}
        <Route path="/quiz" element={<QuizRoute />} />

        {/* Result — guests with result allowed */}
        <Route path="/result" element={<ResultRoute />} />

        {/* Journey — logged in only */}
        <Route path="/journey" element={<JourneyRoute />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute><Admin /></ProtectedRoute>
        } />

        {/* Unknown → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/sample-result" element={<SampleResult />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App