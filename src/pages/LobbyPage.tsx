import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/gameStore'
import api from '../services/api'

export default function LobbyPage() {
    
    const navigate = useNavigate()
    const {
        userId, username, tokens, rank,
    } = useGame()

    useEffect(() => {
        if (!userId) {
            navigate('/login')
        }
    }, [userId])

    
    useEffect(() => {
        if (!username) return

       
    }, [username])

    const handleStart = async () => {
        if (!userId) {
            alert('Not logged in')
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords
                try {
                    await api.post('/matchmaking/join', null, {
                        params: { userId, lat: latitude, lng: longitude }
                    })
                    navigate('/queue')
                } catch (e) {
                    console.error('Failed to join queue:', e)
                    alert('Could not join matchmaking. Please try again.')
                }
            },
            () => {
                alert('Location access is required to find nearby runners.')
            }
        )
    }

    const rankColors: Record<string, string> = {
        TODDLER: '#a78bfa',
        WALKER: '#34d399',
        MILER: '#60a5fa',
        UNDEFEATED: '#fbbf24'
    }

    return (
        <div style={{
            width: '100%',
            minHeight: '100dvh',
            background: '#0f0f0f',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            gap: '24px',
            padding: '24px'
        }}>
            <h1 style={{
                fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                fontWeight: 'bold',
                letterSpacing: '0.1em'
            }}>
                RUNRNK
            </h1>

            {username && (
                <p style={{ color: '#9ca3af', fontSize: 'clamp(0.85rem, 3vw, 1rem)' }}>
                    Welcome back, <strong style={{ color: 'white' }}>{username}</strong>
                </p>
            )}

            {rank && (
                <div style={{
                    padding: '8px 24px',
                    borderRadius: '999px',
                    background: rankColors[rank] ?? '#6b7280',
                    color: '#0f0f0f',
                    fontWeight: 'bold',
                    fontSize: 'clamp(0.75rem, 3vw, 0.9rem)',
                    letterSpacing: '0.15em'
                }}>
                    {rank}
                </div>
            )}

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
            }}>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>TOKENS</p>
                <p style={{
                    fontSize: 'clamp(1.8rem, 8vw, 2.5rem)',
                    fontWeight: 'bold',
                    color: tokens > 0 ? '#fbbf24' : '#ef4444'
                }}>
                    {tokens}
                </p>
            </div>

            {tokens === 0 ? (
                <div style={{
                    textAlign: 'center',
                    color: '#ef4444',
                    fontSize: '0.9rem',
                    maxWidth: '280px'
                }}>
                    <p>You're out of tokens.</p>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>
                        Come back at midnight to play again.
                    </p>
                </div>
            ) : (
                <button
                    onClick={handleStart}
                    style={{
                        marginTop: '16px',
                        padding: 'clamp(12px, 4vw, 16px) clamp(32px, 10vw, 56px)',
                        fontSize: 'clamp(1rem, 4vw, 1.3rem)',
                        fontWeight: 'bold',
                        background: '#fbbf24',
                        color: '#0f0f0f',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        letterSpacing: '0.1em',
                        width: '100%',
                        maxWidth: '320px'
                    }}
                >
                    START
                </button>
            )}
        </div>
    )
}
