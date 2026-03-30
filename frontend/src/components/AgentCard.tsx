interface AgentCardProps {
  name: string
  model: string
  eloRating: number
  wins: number
  losses: number
  draws: number
}

export default function AgentCard({ name, model, eloRating, wins, losses, draws }: AgentCardProps) {
  const total = wins + losses + draws
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-white text-lg">{name}</span>
        <span className="text-yellow-400 font-bold text-xl">{eloRating}</span>
      </div>
      <div className="text-gray-400 text-xs">{model}</div>
      <div className="flex gap-4 text-sm mt-2">
        <span className="text-green-400">{wins}W</span>
        <span className="text-red-400">{losses}L</span>
        <span className="text-gray-400">{draws}D</span>
        <span className="text-gray-300 ml-auto">{winRate}% win rate</span>
      </div>
    </div>
  )
}
