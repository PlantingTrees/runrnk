import { Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useGame } from './store/gameStore'
import { connectSocket, disconnectSocket } from './services/socket'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import QueuePage from './pages/QueuePage'
import PhotoPage from './pages/PhotoPage'
import RacePage from './pages/RacePage'
import ResultPage from './pages/ResultPage'

export default function App() {
    const navigate = useNavigate()
    const { username, setMatchId, setOpponentUsername, setOpponentPhoto } = useGame()
    const handledMatchIdRef = useRef<number | null>(null)

    useEffect(() => {
        if (!username) return
        handledMatchIdRef.current = null

        connectSocket(
            username,
            (data) => {
                if (handledMatchIdRef.current === data.matchId) {
                    console.log('App: duplicate match event ignored', data.matchId)
                    return
                }
                handledMatchIdRef.current = data.matchId
                console.log('App: match found', data)
                setMatchId(data.matchId)
                setOpponentUsername(data.opponentUsername)
                navigate('/photo')
            },
            (data) => {
                console.log('App: queue expired', data)
                // QueuePage handles its own expiry UI via timer
            },
            (data) => {
                console.log('App: photo received', data)
                setOpponentPhoto(data.photoBase64)
            },
            (data) => {
                console.log('App: race update', data)
            }
        )

        return () => {
            disconnectSocket()
        }
    }, [username])

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<LobbyPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/photo" element={<PhotoPage />} />
            <Route path="/race" element={<RacePage />} />
            <Route path="/result" element={<ResultPage />} />
        </Routes>
    )
}
