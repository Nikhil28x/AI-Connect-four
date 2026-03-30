interface BoardProps {
  board: number[][]
  lastMove?: { row: number; col: number } | null
  validMoves?: number[]
  humanPlayer?: number
  onColumnClick?: (col: number) => void
  disabled?: boolean
}

const CELL_COLORS: Record<number, string> = {
  0: 'bg-gray-700',
  1: 'bg-yellow-400',
  2: 'bg-red-500',
}

export default function Board({
  board,
  lastMove,
  validMoves = [],
  humanPlayer,
  onColumnClick,
  disabled = false,
}: BoardProps) {
  return (
    <div className="inline-block bg-blue-800 p-2 rounded-xl shadow-2xl">
      {/* Column click targets */}
      {onColumnClick && (
        <div className="flex mb-1">
          {Array.from({ length: 7 }, (_, col) => (
            <button
              key={col}
              onClick={() => !disabled && validMoves.includes(col) && onColumnClick(col)}
              disabled={disabled || !validMoves.includes(col)}
              className={`w-10 h-6 mx-0.5 rounded text-xs font-bold transition-colors
                ${validMoves.includes(col) && !disabled
                  ? 'bg-blue-600 hover:bg-blue-400 text-white cursor-pointer'
                  : 'bg-blue-900 text-blue-700 cursor-not-allowed'
                }`}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {/* Board grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 2.5rem)' }}>
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isLast = lastMove?.row === rowIdx && lastMove?.col === colIdx
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`w-10 h-10 rounded-full transition-all duration-200
                  ${CELL_COLORS[cell] ?? 'bg-gray-700'}
                  ${isLast ? 'ring-2 ring-white ring-offset-1 ring-offset-blue-800' : ''}
                `}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
