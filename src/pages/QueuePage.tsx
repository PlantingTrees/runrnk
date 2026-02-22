import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/gameStore'
import api from '../services/api'

export default function QueuePage() {
    const navigate = useNavigate()
    const { userId, username, setMatchId, setOpponentUsername } = useGame()
    const queueDurationSeconds = 30
    const [timeLeft, setTimeLeft] = useState(queueDurationSeconds)
    const [expired, setExpired] = useState(false)

    // Countdown timer
    useEffect(() => {
        if (expired) return

        if (timeLeft === 0) {
            setExpired(true)
            return
        }

        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
        return () => clearTimeout(timer)
    }, [timeLeft, expired])

    // Fallback: poll backend for match status so UI still progresses
    // even if a websocket event is missed.
    useEffect(() => {
        if (!userId || !username || expired) return

        let cancelled = false

        const checkStatus = async () => {
            try {
                const res = await api.get('/matchmaking/status', { params: { userId } })
                const data = res.data
                if (cancelled) return

                if (data?.matched && data?.matchId) {
                    setMatchId(data.matchId)
                    if (data.opponentUsername) {
                        setOpponentUsername(data.opponentUsername)
                    }
                    navigate('/photo')
                }
            } catch (e) {
                console.warn('Queue status polling failed', e)
            }
        }

        checkStatus()
        const poll = setInterval(checkStatus, 1200)
        return () => {
            cancelled = true
            clearInterval(poll)
        }
    }, [userId, username, expired, setMatchId, setOpponentUsername, navigate])

    const handleSolo = () => {
        navigate('/race', { state: { solo: true } })
    }

    const circumference = 2 * Math.PI * 45

    return (
        <div style={{
            minHeight: '100vh',
            background: '#0f0f0f',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            gap: '32px'
        }}>
            {!expired ? (
                <>
                    <h2 style={{ color: '#9ca3af', letterSpacing: '0.15em', fontSize: '0.9rem' }}>
                        FINDING NEARBY RUNNERS
                    </h2>

                    {/* Circular countdown */}
                    <svg width="120" height="120">
                        {/* Background circle */}
                        <circle
                            cx="60" cy="60" r="45"
                            fill="none"
                            stroke="#1f1f1f"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="60" cy="60" r="45"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - timeLeft / queueDurationSeconds)}
                            transform="rotate(-90 60 60)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                        <text
                            x="60" y="68"
                            textAnchor="middle"
                            fill="white"
                            fontSize="28"
                            fontWeight="bold"
                        >
                            {timeLeft}
                        </text>
                    </svg>

                    <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                        Searching within 2km...
                    </p>
                </>
            ) : (
                <>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                        No runners nearby
                    </h2>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                        Want to run solo instead?
                    </p>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={handleSolo}
                            style={{
                                padding: '14px 36px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                background: '#fbbf24',
                                color: '#0f0f0f',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            RUN SOLO
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            style={{
                                padding: '14px 36px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                background: 'transparent',
                                color: '#9ca3af',
                                border: '1px solid #374151',
                                borderRadius: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            GO BACK
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
