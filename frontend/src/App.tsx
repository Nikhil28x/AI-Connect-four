import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import TournamentPage from './pages/TournamentPage'
import LeaderboardPage from './pages/LeaderboardPage'

export default function App() {
  const loc = useLocation()
  const nav = (path: string) =>
    `text-sm transition-colors ${loc.pathname === path ? 'text-yellow-400 font-semibold' : 'text-gray-300 hover:text-white'}`

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex gap-6 items-center">
        <span className="text-yellow-400 font-bold text-lg">Connect4 AI</span>
        <Link to="/" className={nav('/')}>Quick Play</Link>
        <Link to="/tournament" className={nav('/tournament')}>Tournament</Link>
        <Link to="/leaderboard" className={nav('/leaderboard')}>Leaderboard</Link>
      </nav>
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tournament" element={<TournamentPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
