import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { SettingsProvider } from '@/context/SettingsContext'
import { SpotifyAuthProvider } from '@/context/SpotifyAuthContext'
import { HueAuthProvider } from '@/context/HueAuthContext'
import './index.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <SpotifyAuthProvider>
        <HueAuthProvider>
          <RouterProvider router={router} />
        </HueAuthProvider>
      </SpotifyAuthProvider>
    </SettingsProvider>
  </StrictMode>,
)
