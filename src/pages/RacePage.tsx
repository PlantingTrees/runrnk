import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import { useGame } from '../store/gameStore'
import api from '../services/api'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const SHAPES = ['dog', 'star', 'heart', 'arrow', 'lightning bolt', 'cat']

export default function RacePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const isSolo = location.state?.solo ?? false

    const {
        userId, matchId,
        opponentUsername, setRouteGeoJson
    } = useGame()

    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const mapReady = useRef(false)
    const playerMarker = useRef<mapboxgl.Marker | null>(null)
    const startTime = useRef<number | null>(null)
    const watchId = useRef<number | null>(null)

    const [shape, setShape] = useState<string | null>(null)
    const [routeLoaded, setRouteLoaded] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [finished, setFinished] = useState(false)
    const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
    const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set())
    const [generateError, setGenerateError] = useState<string | null>(null)

    // Elapsed timer
    useEffect(() => {
        if (!routeLoaded || finished) return
        startTime.current = Date.now()
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime.current!) / 1000))
        }, 1000)
        return () => clearInterval(interval)
    }, [routeLoaded, finished])

    // Init map
    useEffect(() => {
        if (!mapContainer.current) return

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            zoom: 16,
            center: [0, 0]
        })

        map.current.on('load', () => {
            //might remove if it doesnt work

            mapReady.current = true
        })

        return () => {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
            map.current?.remove()
        }
    }, [])

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const extractErrorMessage = (data: any, fallback: string) => {
        if (typeof data === 'string' && data.trim()) return data
        if (data && typeof data === 'object') {
            if (typeof data.message === 'string' && data.message.trim()) return data.message
            if (typeof data.error === 'string' && data.error.trim()) return data.error
        }
        return fallback
    }

    const normalizeGeoJson = (data: any): string | null => {
        const text = typeof data === 'string' ? data : JSON.stringify(data)
        try {
            const parsed = JSON.parse(text)
            if (parsed?.type === 'LineString' && Array.isArray(parsed.coordinates)) {
                return text
            }
            return null
        } catch {
            return null
        }
    }

    const waitForMatchRoute = async (id: number, attempts = 35) => {
        for (let i = 0; i < attempts; i++) {
            const res = await api.get(`/route/${id}`, { validateStatus: () => true })
            const route = normalizeGeoJson(res.data)
            if (res.status === 200 && route) {
                return route
            }
            if (res.status === 404) {
                throw new Error('Match not found')
            }
            await sleep(1000)
        }
        throw new Error('Route not ready yet. Please try again.')
    }

    const handleShapeSelect = async (selectedShape: string) => {
        setShape(selectedShape)
        setGenerateError(null)

        try {
            const pos = await new Promise<GeolocationPosition>((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, {
                    enableHighAccuracy: true,
                    timeout: 10000
                })
            )

            const { latitude, longitude } = pos.coords
            let geoJson: string

            if (matchId) {
                const startRes = await api.post(`/match/${matchId}/start`, null, {
                    validateStatus: () => true
                })

                if (startRes.status >= 400) {
                    // If start request failed, route might still already exist from the other player.
                    const existingRoute = await waitForMatchRoute(matchId, 5).catch(() => null)
                    if (!existingRoute) {
                        throw new Error(
                            extractErrorMessage(startRes.data, `Failed to start match (${startRes.status})`)
                        )
                    }
                    geoJson = existingRoute
                } else {
                    geoJson = await waitForMatchRoute(matchId)
                }
            } else {
                const res = await api.post('/route/generate', null, {
                    params: { lat: latitude, lng: longitude, shape: selectedShape },
                    validateStatus: () => true
                })

                if (res.status >= 400) {
                    throw new Error(extractErrorMessage(res.data, `Route generation failed (${res.status})`))
                }

                const parsed = normalizeGeoJson(res.data)
                if (!parsed) {
                    throw new Error('Route response was not valid GeoJSON')
                }
                geoJson = parsed
            }

            setRouteGeoJson(geoJson)

            // Wait for map to be ready
            await waitForMap()
            drawRoute(geoJson)
            startGPSTracking(JSON.parse(geoJson).coordinates)

        } catch (e: any) {
            console.error('Route generation failed', e)
            setGenerateError(e?.message || 'Failed to generate route. Tap to try again.')
            setShape(null)
        }
    }

    const waitForMap = (): Promise<void> => {
        return new Promise((resolve) => {
            if (mapReady.current) {
                resolve()
                return
            }
            const check = setInterval(() => {
                if (mapReady.current) {
                    clearInterval(check)
                    resolve()
                }
            }, 100)
        })
    }

    const drawRoute = (geoJson: string) => {
        const parsed = JSON.parse(geoJson)
        const coords: [number, number][] = parsed.coordinates
        setRouteCoords(coords)

        map.current?.setCenter([coords[0][0], coords[0][1]])

        // Route source
        if (map.current?.getSource('route')) {
            (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
                type: 'Feature', geometry: parsed, properties: {}
            })
        } else {
            map.current?.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: parsed, properties: {} }
            })
            map.current?.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#fbbf24', 'line-width': 4, 'line-opacity': 0.8 }
            })
        }

        // Progress source
        if (map.current?.getSource('progress')) {
            (map.current.getSource('progress') as mapboxgl.GeoJSONSource).setData({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [] },
                properties: {}
            })
        } else {
            map.current?.addSource('progress', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [] },
                    properties: {}
                }
            })
            map.current?.addLayer({
                id: 'progress-line',
                type: 'line',
                source: 'progress',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#34d399', 'line-width': 4 }
            })
        }

        new mapboxgl.Marker({ color: '#fbbf24' })
            .setLngLat(coords[0])
            .addTo(map.current!)

        setRouteLoaded(true)
    }

    const startGPSTracking = (coords: [number, number][]) => {
        watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords
                const userLngLat: [number, number] = [longitude, latitude]

                if (!playerMarker.current) {
                    playerMarker.current = new mapboxgl.Marker({ color: '#60a5fa' })
                        .setLngLat(userLngLat)
                        .addTo(map.current!)
                } else {
                    playerMarker.current.setLngLat(userLngLat)
                }

                map.current?.easeTo({ center: userLngLat })
                checkProgress(userLngLat, coords)
            },
            (err) => console.error('GPS error', err),
            { enableHighAccuracy: true, maximumAge: 1000 }
        )
    }

    const checkProgress = (userPos: [number, number], coords: [number, number][]) => {
        const THRESHOLD_METERS = 20

        setVisitedIndices(prev => {
            const updated = new Set(prev)

            coords.forEach((coord, i) => {
                if (updated.has(i)) return
                if (getDistanceMeters(userPos, coord) < THRESHOLD_METERS) {
                    updated.add(i)
                }
            })

            const visitedCoords = [...updated].sort((a, b) => a - b).map(i => coords[i])
            const progressSource = map.current?.getSource('progress') as mapboxgl.GeoJSONSource
            progressSource?.setData({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: visitedCoords },
                properties: {}
            })

            if (updated.size === coords.length && !finished) {
                handleFinish()
            }

            return updated
        })
    }

    const handleFinish = async () => {
        setFinished(true)
        if (watchId.current) navigator.geolocation.clearWatch(watchId.current)

        const completionMs = Date.now() - startTime.current!

        if (matchId) {
            await api.post(`/match/${matchId}/complete`, null, {
                params: { userId, completionMs }
            })
        }

        navigate('/result', { state: { won: true, completionMs, isSolo } })
    }

    const getDistanceMeters = (a: [number, number], b: [number, number]): number => {
        const R = 6371000
        const lat1 = a[1] * Math.PI / 180
        const lat2 = b[1] * Math.PI / 180
        const dLat = (b[1] - a[1]) * Math.PI / 180
        const dLng = (b[0] - a[0]) * Math.PI / 180
        const x =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100dvh' }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* HUD — only show when race is active */}
            {routeLoaded && (
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.75)',
                    color: 'white',
                    padding: '10px 24px',
                    borderRadius: '999px',
                    fontFamily: 'sans-serif',
                    display: 'flex',
                    gap: '24px',
                    alignItems: 'center',
                    backdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap'
                }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {formatTime(elapsed)}
                    </span>
                    {!isSolo && (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                            vs <strong style={{ color: '#ef4444' }}>{opponentUsername}</strong>
                        </span>
                    )}
                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                        {visitedIndices.size}/{routeCoords.length} pts
                    </span>
                </div>
            )}

            {/* Legend */}
            {routeLoaded && (
                <div style={{
                    position: 'absolute',
                    bottom: '32px',
                    left: '16px',
                    background: 'rgba(0,0,0,0.75)',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontFamily: 'sans-serif',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '4px', background: '#fbbf24', borderRadius: '2px' }} />
                        <span>Route</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '4px', background: '#34d399', borderRadius: '2px' }} />
                        <span>Progress</span>
                    </div>
                    {!isSolo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }} />
                            <span>{opponentUsername}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', background: '#60a5fa', borderRadius: '50%' }} />
                        <span>You</span>
                    </div>
                </div>
            )}

            {/* Overlay — shape picker or generating spinner */}
            {!routeLoaded && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.92)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'sans-serif',
                    gap: '24px',
                    padding: '24px'
                }}>
                    {!shape ? (
                        <>
                            <h2 style={{
                                fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
                                fontWeight: 'bold',
                                textAlign: 'center'
                            }}>
                                Choose your art
                            </h2>
                            <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center' }}>
                                You'll run this shape with your GPS
                            </p>

                            {generateError && (
                                <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>
                                    {generateError}
                                </p>
                            )}

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                width: '100%',
                                maxWidth: '320px'
                            }}>
                                {SHAPES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleShapeSelect(s)}
                                        style={{
                                            padding: '18px 12px',
                                            background: '#1a1a1a',
                                            border: '1px solid #374151',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#fbbf24')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#374151')}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
                                Generating your <strong style={{ color: 'white' }}>{shape}</strong> route...
                            </p>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                border: '3px solid #374151',
                                borderTop: '3px solid #fbbf24',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
