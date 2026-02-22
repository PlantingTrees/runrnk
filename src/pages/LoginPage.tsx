import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/gameStore'
import api from '../services/api'

export default function LoginPage() {
    const navigate = useNavigate()
    const { setUserId, setUsername, setTokens, setRank } = useGame()

    const [mode, setMode] = useState<'login' | 'register'>('login')
    const [username, setUsernameInput] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const toErrorMessage = (e: any): string => {
        const data = e?.response?.data

        if (typeof data === 'string') {
            return data
        }

        if (data && typeof data === 'object') {
            if (typeof data.message === 'string' && data.message.trim()) {
                return data.message
            }
            if (typeof data.error === 'string' && data.error.trim()) {
                return data.status ? `${data.status} ${data.error}` : data.error
            }
        }

        if (typeof e?.message === 'string' && e.message.trim()) {
            return e.message
        }

        return 'Something went wrong'
    }

    const handleSubmit = async () => {
        if (!username.trim()) {
            setError('Please enter a username')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const endpoint = mode === 'login' ? '/users/login' : '/users/register'
            const payload = mode === 'login'
                ? { username }
                : { username, timezone }

            const res = await api.post(endpoint, payload)
            const data = res.data

            setUserId(data.id)
            setUsername(data.username)
            setTokens(data.tokens)
            setRank(data.rank)

            navigate('/')
        } catch (e:any) {
            setError(toErrorMessage(e))
        } finally {
            setLoading(false)
        }
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
            padding: '24px',
            gap: '32px'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{
                    fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                    fontWeight: 'bold',
                    letterSpacing: '0.1em',
                    marginBottom: '8px'
                }}>
                    RUNRNK
                </h1>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    Run. Compete. Rank up.
                </p>
            </div>

            {/* Mode toggle */}
            <div style={{
                display: 'flex',
                background: '#1a1a1a',
                borderRadius: '12px',
                padding: '4px',
                width: '100%',
                maxWidth: '320px'
            }}>
                {(['login', 'register'] as const).map(m => (
                    <button
                        key={m}
                        onClick={() => { setMode(m); setError(null) }}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            background: mode === m ? '#fbbf24' : 'transparent',
                            color: mode === m ? '#0f0f0f' : '#6b7280',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.05em'
                        }}
                    >
                        {m.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div style={{
                width: '100%',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsernameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '1rem',
                        background: '#1a1a1a',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        color: 'white',
                        outline: 'none'
                    }}
                />

                {error && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
                        {error}
                    </p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        background: loading ? '#92400e' : '#fbbf24',
                        color: '#0f0f0f',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.1em',
                        transition: 'background 0.2s ease'
                    }}
                >
                    {loading ? '...' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
                </button>
            </div>
        </div>
    )
}
