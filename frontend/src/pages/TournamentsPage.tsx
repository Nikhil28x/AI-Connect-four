import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAgents, getTournaments, createTournament, startTournament, startBattle } from '../api/client'

const MODEL_LABELS: Record<string, string> = {
  'llama3.3-70b': 'Llama 3.3 · 70B',
  'llama3.1-8b': 'Llama 3.1 · 8B',
}

const PERSONALITY_COLORS: Record<string, string> = {
  AgentAlpha: 'border-yellow-500',
  AgentBeta: 'border-blue-500',
  AgentGamma: 'border-red-500',
  AgentDelta: 'border-green-500',
  AgentEpsilon: 'border-purple-500',
}

const PERSONALITY_EMOJI: Record<string, string> = {
  AgentAlpha: '🧠',
  AgentBeta: '⚖️',
  AgentGamma: '🔥',
  AgentDelta: '🛡️',
  AgentEpsilon: '🎲',
}

export default function TournamentsPage() {
  const [tab, setTab] = useState<'battle' | 'tournament'>('battle')
  const [agents, setAgents] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [selectedA, setSelectedA] = useState<string | null>(null)
  const [selectedB, setSelectedB] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [format, setFormat] = useState('round_robin')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getAgents().then((r) => setAgents(r.data))
    getTournaments().then((r) => setTournaments(r.data))
  }, [])

  const handleAgentClick = (id: string) => {
    if (selectedA === id) { setSelectedA(null); return }
    if (selectedB === id) { setSelectedB(null); return }
    if (!selectedA) { setSelectedA(id); return }
    if (!selectedB) { setSelectedB(id); return }
    setSelectedA(id)
  }

  const handleLaunch = async () => {
    if (!selectedA || !selectedB) return
    setLaunching(true)
    try {
      const res = await startBattle(selectedA, selectedB)
      navigate(`/games/${res.data.game_id}`)
    } finally {
      setLaunching(false)
    }
  }

  const toggleAgent = (id: string) =>
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )

  const handleCreate = async () => {
    if (!name || selectedAgents.length < 2) return
    setCreating(true)
    try {
      const res = await createTournament({ name, format, agent_ids: selectedAgents })
      setTournaments((prev) => [res.data, ...prev])
      setShowModal(false)
      setName('')
      setSelectedAgents([])
    } finally {
      setCreating(false)
    }
  }

  const handleStart = async (id: string) => {
    await startTournament(id)
    getTournaments().then((r) => setTournaments(r.data))
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-700 text-yellow-200',
    running: 'bg-blue-700 text-blue-200',
    complete: 'bg-green-700 text-green-200',
  }

  const agentById = (id: string) => agents.find((a) => a.id === id)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('battle')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'battle' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
        >
          ⚡ Quick Battle
        </button>
        <button
          onClick={() => setTab('tournament')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'tournament' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:text-white'}`}
        >
          🏆 Tournament
        </button>
      </div>

      {tab === 'battle' && (
        <div className="space-y-5">
          <p className="text-gray-400 text-sm">
            Pick <span className="text-yellow-400 font-bold">two Cerebras AI models</span> to battle.
            First click = Player&nbsp;1 (Yellow), second = Player&nbsp;2 (Red).
          </p>
          {agents.length === 0 && (
            <div className="text-gray-500 text-sm bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              Loading agents… (server seeds on first boot — refresh in a moment)
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => {
              const isA = selectedA === agent.id
              const isB = selectedB === agent.id
              const border = PERSONALITY_COLORS[agent.name] ?? 'border-gray-700'
              return (
                <button
                  key={agent.id}
                  onClick={() => handleAgentClick(agent.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all relative ${
                    isA ? 'border-yellow-400 bg-yellow-400/10'
                    : isB ? 'border-red-500 bg-red-500/10'
                    : `${border} bg-gray-900 hover:bg-gray-800`
                  }`}
                >
                  {isA && <span className="absolute top-2 right-2 bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded">P1 🟡</span>}
                  {isB && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">P2 🔴</span>}
                  <div className="text-2xl mb-1">{PERSONALITY_EMOJI[agent.name] ?? '🤖'}</div>
                  <div className="font-bold text-white">{agent.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{MODEL_LABELS[agent.model] ?? agent.model}</div>
                  <div className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
                    {(agent.system_prompt ?? '').split('Strategy:')[1]?.trim() ?? agent.system_prompt}
                  </div>
                  <div className="mt-3 flex gap-3 text-xs">
                    <span className="text-yellow-400 font-bold">{agent.elo_rating} ELO</span>
                    <span className="text-green-400">{agent.wins}W</span>
                    <span className="text-red-400">{agent.losses}L</span>
                  </div>
                </button>
              )
            })}
          </div>

          {(selectedA || selectedB) && (
            <div className="flex items-center justify-center gap-6 bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className={`text-center flex-1 ${selectedA ? '' : 'opacity-30'}`}>
                <div className="text-2xl">{selectedA ? (PERSONALITY_EMOJI[agentById(selectedA)?.name] ?? '🤖') : '?'}</div>
                <div className="font-bold text-yellow-400 text-sm mt-1">{selectedA ? agentById(selectedA)?.name : 'Pick Player 1'}</div>
                <div className="text-xs text-gray-500">{selectedA ? (MODEL_LABELS[agentById(selectedA)?.model] ?? '') : ''}</div>
              </div>
              <div className="text-2xl font-black text-gray-500">VS</div>
              <div className={`text-center flex-1 ${selectedB ? '' : 'opacity-30'}`}>
                <div className="text-2xl">{selectedB ? (PERSONALITY_EMOJI[agentById(selectedB)?.name] ?? '🤖') : '?'}</div>
                <div className="font-bold text-red-400 text-sm mt-1">{selectedB ? agentById(selectedB)?.name : 'Pick Player 2'}</div>
                <div className="text-xs text-gray-500">{selectedB ? (MODEL_LABELS[agentById(selectedB)?.model] ?? '') : ''}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleLaunch}
            disabled={!selectedA || !selectedB || launching}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-extrabold py-3 rounded-xl text-lg transition-colors"
          >
            {launching
              ? 'Launching…'
              : !selectedA || !selectedB
              ? `Select ${!selectedA ? 'Player 1' : 'Player 2'} to continue`
              : `⚡ Fight! ${agentById(selectedA)?.name} vs ${agentById(selectedB)?.name}`}
          </button>
        </div>
      )}

      {tab === 'tournament' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Run a full round-robin tournament across selected agents.</p>
            <button onClick={() => setShowModal(true)} className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-4 py-2 rounded-lg text-sm">
              New Tournament
            </button>
          </div>
          {tournaments.length === 0 && <p className="text-gray-500 text-sm">No tournaments yet.</p>}
          {tournaments.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">{t.name}</div>
                <div className="text-gray-400 text-xs mt-1">{t.format.replace('_', ' ')}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLOR[t.status] ?? ''}`}>{t.status}</span>
                {t.status === 'pending' && (
                  <button onClick={() => handleStart(t.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold">Start</button>
                )}
              </div>
            </div>
          ))}
          {showModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
                <h2 className="text-lg font-bold text-white">New Tournament</h2>
                <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-yellow-400" placeholder="Tournament name" value={name} onChange={(e) => setName(e.target.value)} />
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="round_robin">Round Robin</option>
                  <option value="single_elim">Single Elimination</option>
                </select>
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Select agents (min 2):</div>
                  {agents.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                      <input type="checkbox" checked={selectedAgents.includes(a.id)} onChange={() => toggleAgent(a.id)} className="accent-yellow-400" />
                      <span>{PERSONALITY_EMOJI[a.name] ?? '🤖'} {a.name}</span>
                      <span className="text-gray-500 text-xs ml-auto">{MODEL_LABELS[a.model] ?? a.model} · {a.elo_rating} ELO</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm">Cancel</button>
                  <button onClick={handleCreate} disabled={creating || !name || selectedAgents.length < 2} className="px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 font-bold text-sm disabled:opacity-50">
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
