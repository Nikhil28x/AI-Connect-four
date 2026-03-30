import { useNavigate } from 'react-router-dom'

interface LeaderboardEntry {
  rank: number
  id: string
  name: string
  model: string
  elo_rating: number
  wins: number
  losses: number
  draws: number
  win_rate: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  showChallenge?: boolean
}

export default function Leaderboard({ entries, showChallenge = false }: LeaderboardProps) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-left">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Agent</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">ELO</th>
            <th className="px-4 py-3">W</th>
            <th className="px-4 py-3">L</th>
            <th className="px-4 py-3">D</th>
            <th className="px-4 py-3">Win%</th>
            {showChallenge && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              className="border-t border-gray-800 hover:bg-gray-900 transition-colors"
            >
              <td className="px-4 py-3 font-bold text-gray-400">{e.rank}</td>
              <td className="px-4 py-3 font-semibold text-white">{e.name}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{e.model}</td>
              <td className="px-4 py-3 font-bold text-yellow-400">{e.elo_rating}</td>
              <td className="px-4 py-3 text-green-400">{e.wins}</td>
              <td className="px-4 py-3 text-red-400">{e.losses}</td>
              <td className="px-4 py-3 text-gray-400">{e.draws}</td>
              <td className="px-4 py-3">{e.win_rate}%</td>
              {showChallenge && (
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/play/${e.id}`)}
                    className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-3 py-1 rounded text-xs"
                  >
                    Challenge
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
