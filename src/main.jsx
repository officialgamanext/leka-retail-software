import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Prevent mouse wheel scrolling from changing number input values globally
document.addEventListener('wheel', (e) => {
  if (document.activeElement && document.activeElement.type === 'number') {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
