import { useEffect, useState } from 'react'
import { getAgents, startBattle, getGame } from '../api/client'

const MODEL_NAME: Record<string, string> = {
  'llama3.1-8b': 'Llama 3.1 8B',
  'qwen-3-235b-a22b-instruct-2507': 'Qwen 3 235B',
}

interface Agent { id: string; name: string; model: string }

export default function TournamentPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentA, setAgentA] = useState('')
  const [agentB, setAgentB] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ winner: string | null; moves: number } | null>(null)

  useEffect(() => {
    getAgents().then(r => {
      const list: Agent[] = r.data
      setAgents(list)
      if (list.length >= 2) {
        setAgentA(list[0].id)
        setAgentB(list[1].id)
      }
    }).catch(console.error)
  }, [])

  const agentLabel = (id: string) => {
    const a = agents.find(x => x.id === id)
    return a ? (MODEL_NAME[a.model] ?? a.model) : '—'
  }

  const runBattle = async () => {
    if (!agentA || !agentB) return
    setRunning(true)
    setResult(null)
    try {
      const res = await startBattle(agentA, agentB)
      const gid: string = res.data.game_id
      const poll = async (): Promise<void> => {
        const g = await getGame(gid)
        const game = g.data.game
        if (game.status === 'complete') {
          let winner: string | null = null
          if (!game.is_draw && game.winner_agent_id) {
            winner = agentLabel(game.winner_agent_id)
          }
          setResult({ winner, moves: game.move_count ?? 0 })
          setRunning(false)
        } else {
          setTimeout(poll, 2000)
        }
      }
      await poll()
    } catch {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Tournament</h1>
        <p className="text-gray-400 text-sm mt-1">Pick two models and run a battle.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Model A 🟡</label>
            <select
              value={agentA}
              onChange={e => setAgentA(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-yellow-500"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{MODEL_NAME[a.model] ?? a.model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Model B 🔴</label>
            <select
              value={agentB}
              onChange={e => setAgentB(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-yellow-500"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>{MODEL_NAME[a.model] ?? a.model}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={runBattle}
          disabled={running || !agentA || !agentB}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-gray-900 font-bold py-2 rounded-lg transition-colors"
        >
          {running ? 'Battle running…' : 'Run Battle ⚡'}
        </button>
      </div>

      {running && (
        <p className="text-center text-yellow-400 animate-pulse text-sm">
          {agentLabel(agentA)} vs {agentLabel(agentB)} — playing…
        </p>
      )}

      {result && (
        <div className="bg-gray-800 rounded-xl p-6 text-center space-y-2">
          <div className="text-2xl font-bold text-yellow-400">
            {result.winner ? `${result.winner} Wins!` : "It's a Draw! 🤝"}
          </div>
          <div className="text-sm text-gray-400">{result.moves} moves played</div>
          <button
            onClick={runBattle}
            className="mt-2 text-xs text-gray-400 hover:text-white underline"
          >
            Run again
          </button>
        </div>
      )}
    </div>
  )
}
