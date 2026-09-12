import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Options } from './Options.jsx'
import '../index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Options />
  </StrictMode>,
)
