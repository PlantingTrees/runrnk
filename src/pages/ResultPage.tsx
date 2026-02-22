import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGame } from '../store/gameStore'

export default function ResultPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { rank, tokens, opponentUsername } = useGame()

    const won: boolean = location.state?.won ?? false
    const isSolo: boolean = location.state?.isSolo ?? false
    const completionMs: number = location.state?.completionMs ?? 0

    const [show, setShow] = useState(false)

    useEffect(() => {
        // Animate in
        setTimeout(() => setShow(true), 100)
    }, [])

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
        const s = (totalSeconds % 60).toString().padStart(2, '0')
        const msDisplay = Math.floor((ms % 1000) / 10).toString().padStart(2, '0')
        return `${m}:${s}.${msDisplay}`
    }

    const rankColors: Record<string, string> = {
        TODDLER: '#a78bfa',
        WALKER: '#34d399',
        MILER: '#60a5fa',
        UNDEFEATED: '#fbbf24'
    }

    const tokenChange = () => {
        if (isSolo) return won ? '+100' : '-100'
        return won ? '+150' : '-100'
    }

    const tokenColor = won ? '#34d399' : '#ef4444'

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
            gap: '28px',
            padding: '24px',
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.4s ease'
        }}>
            {/* Result header */}
            <div style={{ textAlign: 'center' }}>
                <p style={{
                    fontSize: '0.85rem',
                    letterSpacing: '0.2em',
                    color: '#6b7280',
                    marginBottom: '8px'
                }}>
                    {isSolo ? 'SOLO RUN' : `VS ${opponentUsername?.toUpperCase()}`}
                </p>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: won ? '#fbbf24' : '#ef4444',
                    letterSpacing: '0.05em'
                }}>
                    {won ? 'WINNER' : 'DEFEATED'}
                </h1>
            </div>

            {/* Time */}
            <div style={{
                textAlign: 'center',
                background: '#1a1a1a',
                padding: '20px 40px',
                borderRadius: '16px',
                border: '1px solid #1f2937'
            }}>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '6px' }}>
                    COMPLETION TIME
                </p>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(completionMs)}
                </p>
            </div>

            {/* Token and rank change */}
            <div style={{
                display: 'flex',
                gap: '16px'
            }}>
                {/* Tokens */}
                <div style={{
                    textAlign: 'center',
                    background: '#1a1a1a',
                    padding: '16px 28px',
                    borderRadius: '16px',
                    border: '1px solid #1f2937'
                }}>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '6px' }}>
                        TOKENS
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: tokenColor }}>
                        {tokenChange()}
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                        Balance: {tokens}
                    </p>
                </div>

                {/* Rank */}
                <div style={{
                    textAlign: 'center',
                    background: '#1a1a1a',
                    padding: '16px 28px',
                    borderRadius: '16px',
                    border: '1px solid #1f2937'
                }}>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', letterSpacing: '0.15em', marginBottom: '6px' }}>
                        RANK
                    </p>
                    <p style={{
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: rank ? rankColors[rank] : 'white'
                    }}>
                        {rank ?? 'TODDLER'}
                    </p>
                </div>
            </div>

            {/* Solo specific — beat yesterday message */}
            {isSolo && won && (
                <p style={{
                    color: '#34d399',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    You beat your best time from yesterday!
                </p>
            )}

            {isSolo && !won && (
                <p style={{
                    color: '#9ca3af',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    Didn't beat yesterday's best. Try again tomorrow.
                </p>
            )}

            {/* Out of tokens warning */}
            {tokens === 0 && (
                <p style={{
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    maxWidth: '260px'
                }}>
                    You're out of tokens. Come back at midnight to play again.
                </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '14px 36px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        background: '#fbbf24',
                        color: '#0f0f0f',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        letterSpacing: '0.05em'
                    }}
                >
                    HOME
                </button>
            </div>
        </div>
    )
}