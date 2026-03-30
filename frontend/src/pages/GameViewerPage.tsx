import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGame } from '../api/client'
import Board from '../components/Board'
import { useWebSocket } from '../hooks/useWebSocket'

export default function GameViewerPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const [game, setGame] = useState<any>(null)
  const [moves, setMoves] = useState<any[]>([])
  const [replayIndex, setReplayIndex] = useState<number | null>(null)

  const fetchGame = () =>
    getGame(gameId!).then((r) => {
      setGame(r.data.game)
      setMoves(r.data.moves)
    })

  useEffect(() => { fetchGame() }, [gameId])
  useWebSocket(`/ws/games/${gameId}`, () => fetchGame())

  const displayMoves = replayIndex !== null ? moves.slice(0, replayIndex + 1) : moves
  const currentBoard = displayMoves.length > 0
    ? displayMoves[displayMoves.length - 1].board_state
    : Array.from({ length: 6 }, () => Array(7).fill(0))

  const lastCol = displayMoves.length > 0 ? displayMoves[displayMoves.length - 1].column : null
  let lastRow = -1
  if (lastCol !== null) {
    for (let r = 5; r >= 0; r--) {
      if (currentBoard[r][lastCol] !== 0) { lastRow = r; break }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-yellow-400">Game Viewer</h1>
        {game && (
          <span className={`px-3 py-1 rounded text-xs font-bold ${
            game.status === 'complete' ? 'bg-green-700 text-green-200' : 'bg-blue-700 text-blue-200'
          }`}>
            {game.status}
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="space-y-3">
          <Board
            board={currentBoard}
            lastMove={lastRow !== -1 && lastCol !== null ? { row: lastRow, col: lastCol } : null}
          />

          {/* Replay controls */}
          {moves.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReplayIndex((v) => Math.max(0, (v ?? moves.length - 1) - 1))}
                disabled={replayIndex === 0}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white px-3 py-1 rounded text-sm"
              >
                ← Prev
              </button>
              <span className="text-gray-400 text-sm">
                Move {replayIndex !== null ? replayIndex + 1 : moves.length} / {moves.length}
              </span>
              <button
                onClick={() => {
                  const next = (replayIndex ?? moves.length - 1) + 1
                  if (next >= moves.length) setReplayIndex(null)
                  else setReplayIndex(next)
                }}
                disabled={replayIndex === null}
                className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white px-3 py-1 rounded text-sm"
              >
                Next →
              </button>
              <button
                onClick={() => setReplayIndex(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm ml-2"
              >
                Live
              </button>
            </div>
          )}
        </div>

        {/* Move history */}
        <div className="flex-1 max-h-[520px] overflow-y-auto space-y-2">
          <h2 className="text-sm font-semibold text-gray-400 sticky top-0 bg-gray-950 pb-1">Move History</h2>
          {moves.map((m, i) => (
            <div
              key={m.move_number}
              onClick={() => setReplayIndex(i)}
              className={`bg-gray-900 border rounded-lg p-3 cursor-pointer transition-colors
                ${replayIndex === i ? 'border-yellow-400' : 'border-gray-800 hover:border-gray-600'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${m.player_label === 'A' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">
                  Move {m.move_number} · {m.player_label === 'A' ? 'Agent A' : m.player_label === 'human' ? 'You' : 'Agent B'} → Col {m.column}
                </span>
              </div>
              {m.reasoning_text && (
                <p className="text-xs text-gray-500 line-clamp-2">{m.reasoning_text}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
