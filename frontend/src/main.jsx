import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/**
 * ============================================================================
 * MAIN ENTRY POINT (main.jsx)
 * ============================================================================
 * Purpose:
 * This is the very first file that runs when the website loads in the browser.
 * It grabs the "App" component (which contains all our pages) and injects it 
 * into the blank HTML page (specifically inside the <div id="root"> tag).
 * ============================================================================
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
