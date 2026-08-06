import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import MyJournal from './pages/MyJournal'
import LogTrade from './pages/LogTrade'
import TradeDetail from './pages/TradeDetail'
import Rules from './pages/Rules'
import MyStats from './pages/MyStats'
import UserStats from './pages/UserStats'
import Feed from './pages/Feed'
import Scoreboard from './pages/Scoreboard'
import MentorAdmin from './pages/MentorAdmin'
import SetPassword from './pages/SetPassword'
import Settings from './pages/Settings'

// An invite or password-recovery link lands back here with #access_token=...
// &type=invite in the hash (Supabase's default, detected automatically by
// the client). Intercept it before normal routing so a brand new account
// always sets a password before it can do anything else — otherwise they're
// signed in from the invite click but have no password to ever log back in with.
const hasAuthHash = /type=(invite|recovery)/.test(window.location.hash)

export default function App() {
  if (hasAuthHash) {
    return (
      <BrowserRouter>
        <AuthProvider>
          <SetPassword />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MyJournal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades/new"
            element={
              <ProtectedRoute>
                <LogTrade />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades/:id"
            element={
              <ProtectedRoute>
                <TradeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rules"
            element={
              <ProtectedRoute>
                <Rules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <MyStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <UserStats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scoreboard"
            element={
              <ProtectedRoute>
                <Scoreboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute mentorOnly>
                <MentorAdmin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
