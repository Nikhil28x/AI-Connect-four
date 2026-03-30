import { useEffect, useState } from 'react'
import { getLeaderboard } from '../api/client'

const MODEL_NAME: Record<string, string> = {
  'llama3.1-8b': 'Llama 3.1 8B',
  'qwen-3-235b-a22b-instruct-2507': 'Qwen 3 235B',
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    getLeaderboard().then(r => setEntries(r.data)).catch(console.error)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-1">Model scores across all games.</p>
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No games played yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-left">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">ELO</th>
                <th className="px-4 py-3">W</th>
                <th className="px-4 py-3">L</th>
                <th className="px-4 py-3">D</th>
                <th className="px-4 py-3">Win%</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-t border-gray-800 hover:bg-gray-900 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-400">{e.rank}</td>
                  <td className="px-4 py-3 font-semibold text-white">{MODEL_NAME[e.model] ?? e.model}</td>
                  <td className="px-4 py-3 font-bold text-yellow-400">{e.elo_rating}</td>
                  <td className="px-4 py-3 text-green-400">{e.wins}</td>
                  <td className="px-4 py-3 text-red-400">{e.losses}</td>
                  <td className="px-4 py-3 text-gray-400">{e.draws}</td>
                  <td className="px-4 py-3">{e.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
