import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GameProvider } from './store/gameStore'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <GameProvider>
                <App />
            </GameProvider>
        </BrowserRouter>
    </StrictMode>
)