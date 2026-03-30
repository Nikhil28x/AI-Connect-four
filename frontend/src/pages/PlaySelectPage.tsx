import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgents } from '../api/client'

interface Agent {
  id: string
  name: string
  model: string
  personality: string
  elo_rating: number
  wins: number
  losses: number
  draws: number
}

const MODEL_LABELS: Record<string, string> = {
  'llama3.3-70b': 'Llama 3.3 · 70B',
  'llama3.1-8b': 'Llama 3.1 · 8B',
}

const PERSONALITY_EMOJI: Record<string, string> = {
  aggressive: '⚔️',
  defensive: '🛡️',
  balanced: '⚖️',
  random: '🎲',
  strategic: '♟️',
}

export default function PlaySelectPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getAgents()
      .then(r => setAgents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const winRate = (a: Agent) => {
    const total = a.wins + a.losses + a.draws
    return total === 0 ? '—' : `${Math.round((a.wins / total) * 100)}%`
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Play vs AI</h1>
      <p className="text-gray-400 mb-6 text-sm">Pick an opponent and start a game. You play as 🔴.</p>

      {loading && (
        <div className="text-gray-400 text-sm">Loading agents…</div>
      )}

      {!loading && agents.length === 0 && (
        <div className="text-gray-400 text-sm">No agents found. Make sure agents are seeded.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => navigate(`/play/${agent.id}`)}
            className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 rounded-xl p-5 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">
                {PERSONALITY_EMOJI[agent.personality] ?? '🤖'}
              </span>
              <div>
                <div className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                  {agent.name}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {MODEL_LABELS[agent.model] ?? agent.model}
                </div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-yellow-400 font-bold">{agent.elo_rating}</div>
                <div className="text-xs text-gray-500">ELO</div>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-gray-400">
              <span><span className="text-green-400 font-medium">{agent.wins}W</span></span>
              <span><span className="text-red-400 font-medium">{agent.losses}L</span></span>
              <span><span className="text-gray-300 font-medium">{agent.draws}D</span></span>
              <span className="ml-auto">Win rate: <span className="text-white">{winRate(agent)}</span></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
