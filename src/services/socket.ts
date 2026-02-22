import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const wsBaseUrl = (
    import.meta.env.VITE_WS_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
).replace(/\/+$/, '')

let client: Client | null = null
let isConnected = false

export const connectSocket = (
    username: string,
    onMatchFound: (data: any) => void,
    onQueueExpired: (data: any) => void,
    onPhoto: (data: any) => void,
    onRaceUpdate: (data: any) => void
) => {
    // Don't create duplicate connections
    if (client && isConnected) {
        console.log('Socket already connected, reusing')
        return
    }

    if (client) {
        client.deactivate()
        client = null
    }

    client = new Client({
        webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws?username=${encodeURIComponent(username)}`),
        reconnectDelay: 2000,
        onConnect: () => {
            isConnected = true
            console.log('WebSocket connected for', username)

            client?.subscribe('/user/queue/match-found', (msg) => {
                console.log('Match found!', msg.body)
                onMatchFound(JSON.parse(msg.body))
            })
            client?.subscribe(`/topic/user/${username}/queue/match-found`, (msg) => {
                console.log('Match found (topic fallback)!', msg.body)
                onMatchFound(JSON.parse(msg.body))
            })
            client?.subscribe('/user/queue/queue-expired', (msg) => {
                console.log('Queue expired', msg.body)
                onQueueExpired(JSON.parse(msg.body))
            })
            client?.subscribe(`/topic/user/${username}/queue/queue-expired`, (msg) => {
                console.log('Queue expired (topic fallback)', msg.body)
                onQueueExpired(JSON.parse(msg.body))
            })
            client?.subscribe('/user/queue/photo', (msg) => {
                console.log('Photo received', msg.body)
                onPhoto(JSON.parse(msg.body))
            })
            client?.subscribe(`/topic/user/${username}/queue/photo`, (msg) => {
                console.log('Photo received (topic fallback)', msg.body)
                onPhoto(JSON.parse(msg.body))
            })
            client?.subscribe('/user/queue/race-update', (msg) => {
                console.log('Race update', msg.body)
                onRaceUpdate(JSON.parse(msg.body))
            })
            client?.subscribe(`/topic/user/${username}/queue/race-update`, (msg) => {
                console.log('Race update (topic fallback)', msg.body)
                onRaceUpdate(JSON.parse(msg.body))
            })
        },
        onDisconnect: () => {
            isConnected = false
            console.log('WebSocket disconnected')
        },
        onStompError: (frame) => {
            isConnected = false
            console.error('STOMP error', frame)
        }
    })

    client.activate()
}

export const disconnectSocket = () => {
    client?.deactivate()
    client = null
    isConnected = false
}
