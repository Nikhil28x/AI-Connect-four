import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createHumanGame, submitMove } from '../api/client'
import Board from '../components/Board'
import AgentCard from '../components/AgentCard'

type GameStatus = 'idle' | 'playing' | 'human_wins' | 'ai_wins' | 'draw'

export default function PlayPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [game, setGame] = useState<any>(null)
  const [board, setBoard] = useState<number[][]>([])
  const [validMoves, setValidMoves] = useState<number[]>([])
  const [status, setStatus] = useState<GameStatus>('idle')
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null)
  const [aiReasoning, setAiReasoning] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const startGame = async () => {
    const res = await createHumanGame(agentId!)
    setGame(res.data)
    setBoard(res.data.board)
    setValidMoves(res.data.valid_moves)
    setStatus('playing')
    setLastMove(null)
    setAiReasoning(null)
  }

  useEffect(() => { startGame() }, [agentId])

  const handleColumnClick = async (col: number) => {
    if (status !== 'playing' || thinking) return
    setThinking(true)
    try {
      const res = await submitMove(game.game_id, col)
      const data = res.data
      setBoard(data.board)
      setValidMoves(data.valid_moves ?? [])
      setAiReasoning(data.ai_reasoning)

      if (data.ai_column !== null) {
        const aiColIdx = data.ai_column
        const newBoard: number[][] = data.board
        let aiRow = -1
        for (let r = 5; r >= 0; r--) {
          if (newBoard[r][aiColIdx] === 2) { aiRow = r; break }
        }
        if (aiRow !== -1) setLastMove({ row: aiRow, col: aiColIdx })
      }

      if (data.status !== 'ongoing') {
        setStatus(data.status as GameStatus)
      }
    } finally {
      setThinking(false)
    }
  }

  const OVERLAY_MSG: Record<string, string> = {
    human_wins: 'You Win! 🎉',
    ai_wins: 'AI Wins!',
    draw: "It's a Draw!",
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-yellow-400">Play vs AI</h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="relative">
          {status !== 'idle' && status !== 'playing' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl z-10 gap-4">
              <div className="text-3xl font-extrabold text-yellow-400">{OVERLAY_MSG[status]}</div>
              <button
                onClick={startGame}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-6 py-2 rounded-lg"
              >
                Play Again
              </button>
            </div>
          )}
          <Board
            board={board}
            lastMove={lastMove}
            validMoves={validMoves}
            humanPlayer={1}
            onColumnClick={handleColumnClick}
            disabled={thinking || status !== 'playing'}
          />
          {thinking && (
            <div className="mt-2 text-center text-blue-400 text-sm animate-pulse">
              AI is thinking…
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          {game && (
            <AgentCard
              name={game.agent_name}
              model="Cerebras AI"
              eloRating={0}
              wins={0}
              losses={0}
              draws={0}
            />
          )}

          <div>
            <div className="flex gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-yellow-400 inline-block" /> You (Yellow)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-red-500 inline-block" /> AI (Red)
              </span>
            </div>
          </div>

          {aiReasoning && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <button
                onClick={() => setShowReasoning((v) => !v)}
                className="text-sm font-semibold text-gray-300 w-full text-left flex justify-between"
              >
                AI Thoughts {showReasoning ? '▲' : '▼'}
              </button>
              {showReasoning && (
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">{aiReasoning}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
