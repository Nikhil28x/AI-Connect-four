import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

export const getAgents = () => api.get('/agents')
export const createAgent = (data: object) => api.post('/agents', data)
export const getLeaderboard = () => api.get('/leaderboard')
export const getTournaments = () => api.get('/tournaments')
export const getTournament = (id: string) => api.get(`/tournaments/${id}`)
export const createTournament = (data: object) => api.post('/tournaments', data)
export const startTournament = (id: string) => api.post(`/tournaments/${id}/start`)
export const getGame = (id: string) => api.get(`/games/${id}`)
export const createHumanGame = (agentId: string) => api.post('/games/human', { agent_id: agentId })
export const submitMove = (gameId: string, column: number) =>
  api.post(`/games/${gameId}/move`, { column })

export const startBattle = (agentAId: string, agentBId: string) =>
  api.post('/games/battle', { agent_a_id: agentAId, agent_b_id: agentBId })

