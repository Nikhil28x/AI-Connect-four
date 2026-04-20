import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import TournamentsPage from './pages/TournamentsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import GameViewerPage from './pages/GameViewerPage'
import PlaySelectPage from './pages/PlaySelectPage'
import PlayPage from './pages/PlayPage'

export default function App() {
  const loc = useLocation()
  const nav = (path: string) =>
    `text-sm transition-colors ${loc.pathname === path ? 'text-yellow-400 font-semibold' : 'text-gray-300 hover:text-white'}`

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex gap-6 items-center">
        <span className="text-yellow-400 font-bold text-lg">Connect4 AI</span>
        <Link to="/" className={nav('/')}>Quick Play</Link>
        <Link to="/play" className={nav('/play')}>Play vs AI</Link>
        <Link to="/tournament" className={nav('/tournament')}>Battle</Link>
        <Link to="/leaderboard" className={nav('/leaderboard')}>Leaderboard</Link>
      </nav>
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<PlaySelectPage />} />
          <Route path="/play/:agentId" element={<PlayPage />} />
          <Route path="/tournament" element={<TournamentsPage />} />
          <Route path="/games/:gameId" element={<GameViewerPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
