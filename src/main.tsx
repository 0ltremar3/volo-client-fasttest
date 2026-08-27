import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/playfair-display/latin-500.css'
import '@fontsource/playfair-display/latin-600.css'

import { App } from '@/App'
import { applyStoredTheme } from '@/lib/theme'
import '@/styles/globals.css'

applyStoredTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
