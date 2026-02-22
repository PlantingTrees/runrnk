import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/gameStore'
import api from '../services/api'

export default function PhotoPage() {
    const navigate = useNavigate()
    const {
        username, userId, matchId,
        opponentUsername, opponentPhoto 
    } = useGame()

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [photoTaken, setPhotoTaken] = useState(false)
    const [myPhoto, setMyPhoto] = useState<string | null>(null)
    const [waitingForOpponent, setWaitingForOpponent] = useState(false)
    const [bothReady, setBothReady] = useState(false)

    // Start camera
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        }).then(stream => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        }).catch(() => {
            alert('Camera access is required to play.')
        })

        return () => {
            const stream = videoRef.current?.srcObject as MediaStream
            stream?.getTracks().forEach(t => t.stop())
        }
    }, [])

    // Listen for opponent photo via WebSocket
    useEffect(() => {
        if (!username) return

    }, [username])

    // When both photos are in, go to race
    useEffect(() => {
        if (myPhoto && opponentPhoto) {
            setBothReady(true)
            setTimeout(() => navigate('/race'), 2000)
        }
    }, [myPhoto, opponentPhoto])

    const takePhoto = async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas) return
        if (!matchId || !userId) {
            alert('Missing match or user. Please rejoin queue.')
            return
        }

        // Resize capture to keep payload small for HTTP + WebSocket delivery
        const sourceWidth = video.videoWidth || 640
        const sourceHeight = video.videoHeight || 640
        const maxDimension = 480
        const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
        canvas.width = Math.round(sourceWidth * scale)
        canvas.height = Math.round(sourceHeight * scale)
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

        const base64 = canvas.toDataURL('image/jpeg', 0.55)
        setMyPhoto(base64)
        setPhotoTaken(true)
        setWaitingForOpponent(true)

        // Stop camera stream
        const stream = video.srcObject as MediaStream
        stream?.getTracks().forEach(t => t.stop())

        // Send photo to backend in request body (not query string)
        try {
            await api.post(`/match/${matchId}/photo`, {
                fromUserId: userId,
                photoBase64: base64
            })
        } catch (e) {
            console.error('Failed to send photo', e)
            alert('Could not upload photo. Please try again.')
        }
    }

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
            gap: '24px',
            padding: '24px'
        }}>
            {bothReady ? (
                <div style={{ textAlign: 'center', gap: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>
                        Both ready!
                    </h2>
                    <p style={{ color: '#9ca3af' }}>Starting race...</p>
                </div>
            ) : (
                <>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            Verify you're outside
                        </h2>
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px' }}>
                            Take a live photo — no imports allowed
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                        {/* My side */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <p style={{ fontSize: '0.8rem', color: '#9ca3af', letterSpacing: '0.1em' }}>
                                YOU
                            </p>

                            {!photoTaken ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        border: '2px solid #374151'
                                    }}
                                />
                            ) : (
                                <img
                                    src={myPhoto!}
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        border: '2px solid #fbbf24'
                                    }}
                                />
                            )}

                            {!photoTaken && (
                                <button
                                    onClick={takePhoto}
                                    style={{
                                        padding: '10px 24px',
                                        fontWeight: 'bold',
                                        background: '#fbbf24',
                                        color: '#0f0f0f',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    SNAP
                                </button>
                            )}

                            {waitingForOpponent && (
                                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    Waiting for {opponentUsername}...
                                </p>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{
                            width: '1px',
                            height: '180px',
                            background: '#1f2937',
                            marginTop: '28px'
                        }} />

                        {/* Opponent side */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <p style={{ fontSize: '0.8rem', color: '#9ca3af', letterSpacing: '0.1em' }}>
                                {opponentUsername?.toUpperCase() ?? 'OPPONENT'}
                            </p>

                            {opponentPhoto ? (
                                <img
                                    src={opponentPhoto}
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        objectFit: 'cover',
                                        borderRadius: '12px',
                                        border: '2px solid #fbbf24'
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '12px',
                                    border: '2px dashed #374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#4b5563',
                                    fontSize: '0.8rem'
                                }}>
                                    Waiting...
                                </div>
                            )}
                        </div>
                    </div>

                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </>
            )}
        </div>
    )
}
