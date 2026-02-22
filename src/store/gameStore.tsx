import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface GameState {
    userId: number | null
    username: string | null
    tokens: number
    rank: string | null
    matchId: number | null
    opponentUsername: string | null
    opponentPhoto: string | null
    routeGeoJson: string | null
    setUserId: (id: number) => void
    setUsername: (name: string) => void
    setTokens: (t: number) => void
    setRank: (r: string) => void
    setMatchId: (id: number) => void
    setOpponentUsername: (name: string) => void
    setOpponentPhoto: (photo: string) => void
    setRouteGeoJson: (json: string) => void
}

const GameContext = createContext<GameState | null>(null)

export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [userId, setUserId] = useState<number | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [tokens, setTokens] = useState(100)
    const [rank, setRank] = useState<string | null>(null)
    const [matchId, setMatchId] = useState<number | null>(null)
    const [opponentUsername, setOpponentUsername] = useState<string | null>(null)
    const [opponentPhoto, setOpponentPhoto] = useState<string | null>(null)
    const [routeGeoJson, setRouteGeoJson] = useState<string | null>(null)

    return (
        <GameContext.Provider value={{
            userId, username, tokens, rank, matchId,
            opponentUsername, opponentPhoto, routeGeoJson,
            setUserId, setUsername, setTokens, setRank,
            setMatchId, setOpponentUsername, setOpponentPhoto,
            setRouteGeoJson
        }}>
            {children}
        </GameContext.Provider>
    )
}

export const useGame = () => {
    const ctx = useContext(GameContext)
    if (!ctx) throw new Error('useGame must be used inside GameProvider')
    return ctx
}
