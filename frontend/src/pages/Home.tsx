import { useEffect, useState } from 'react'
import { getAgents, createHumanGame, submitMove } from '../api/client'
import Board from '../components/Board'

const MODEL_NAME: Record<string, string> = {
  'llama3.1-8b': 'Llama 3.1 8B',
  'qwen-3-235b-a22b-instruct-2507': 'Qwen 3 235B',
}

interface Agent { id: string; name: string; model: string }
type GameStatus = 'selecting' | 'playing' | 'human_wins' | 'ai_wins' | 'draw'

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [game, setGame] = useState<any>(null)
  const [board, setBoard] = useState<number[][]>([])
  const [validMoves, setValidMoves] = useState<number[]>([])
  const [status, setStatus] = useState<GameStatus>('selecting')
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null)
  const [thinking, setThinking] = useState(false)

  useEffect(() => {
    getAgents().then(r => setAgents(r.data)).catch(console.error)
  }, [])

  const startGame = async (agent: Agent) => {
    setSelectedAgent(agent)
    setThinking(true)
    try {
      const res = await createHumanGame(agent.id)
      setGame(res.data)
      setBoard(res.data.board)
      setValidMoves(res.data.valid_moves)
      setStatus('playing')
      // Show AI's opening move highlight
      if (res.data.ai_column != null) {
        const col = res.data.ai_column
        const b: number[][] = res.data.board
        let row = -1
        for (let r = 5; r >= 0; r--) {
          if (b[r][col] !== 0) { row = r; break }
        }
        if (row !== -1) setLastMove({ row, col })
      } else {
        setLastMove(null)
      }
    } finally {
      setThinking(false)
    }
  }

  const handleColumnClick = async (col: number) => {
    if (status !== 'playing' || thinking || !game) return
    setThinking(true)
    try {
      const res = await submitMove(game.game_id, col)
      const data = res.data
      setBoard(data.board)
      setValidMoves(data.valid_moves ?? [])
      if (data.ai_column !== null) {
        let aiRow = -1
        for (let r = 5; r >= 0; r--) {
          if (data.board[r][data.ai_column] === 1) { aiRow = r; break }
        }
        if (aiRow !== -1) setLastMove({ row: aiRow, col: data.ai_column })
      }
      if (data.status !== 'ongoing') setStatus(data.status as GameStatus)
    } finally {
      setThinking(false)
    }
  }

  const reset = () => {
    setStatus('selecting')
    setGame(null)
    setBoard([])
    setSelectedAgent(null)
    setLastMove(null)
  }

  const RESULT: Record<string, string> = {
    human_wins: 'You Win! 🎉',
    ai_wins: 'AI Wins! 🤖',
    draw: "Draw! 🤝",
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Quick Play</h1>
        <p className="text-gray-400 text-sm mt-1">Pick a model to play against. AI goes first (🟡). You are 🔴.</p>
      </div>

      {status === 'selecting' && (
        <div className="grid grid-cols-2 gap-4">
          {agents.length === 0 && (
            <p className="text-gray-500 text-sm col-span-2">Loading models…</p>
          )}
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => startGame(agent)}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 rounded-xl p-6 text-left transition-all"
            >
              <div className="text-lg font-bold text-white">{MODEL_NAME[agent.model] ?? agent.model}</div>
              <div className="text-xs text-gray-500 mt-1 font-mono">{agent.model}</div>
            </button>
          ))}
        </div>
      )}

      {status !== 'selecting' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              vs <span className="text-white font-semibold">{MODEL_NAME[selectedAgent?.model ?? ''] ?? selectedAgent?.model}</span>
            </span>
            <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300 underline">
              Change model
            </button>
          </div>

          <div className="relative inline-block">
            {['human_wins', 'ai_wins', 'draw'].includes(status) && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl z-10 gap-4">
                <div className="text-3xl font-extrabold text-yellow-400">{RESULT[status]}</div>
                <button
                  onClick={() => startGame(selectedAgent!)}
                  className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-2 rounded-lg"
                >
                  Play Again
                </button>
                <button onClick={reset} className="text-sm text-gray-300 hover:text-white underline">
                  Change model
                </button>
              </div>
            )}
            <Board
              board={board}
              lastMove={lastMove}
              validMoves={validMoves}
              onColumnClick={handleColumnClick}
              disabled={thinking || status !== 'playing'}
            />
          </div>

          {thinking && status === 'playing' && (
            <p className="text-sm text-yellow-400 animate-pulse">AI is thinking…</p>
          )}
        </div>
      )}
    </div>
  )
}
